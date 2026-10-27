import { NextRequest, NextResponse } from "next/server";
import { aiUrl } from "@/lib/aiGateway";
import { resolveCompanyId } from "@/lib/tenant";
import { consumeTrialQuota } from "@/lib/trialLimits";
import { canScanPurchaseInvoice } from "@/lib/purchaseInvoiceScan";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Lists arrive from the page, which already holds them. Capped so a very large
// inventory cannot turn one scan into an oversized prompt.
const MAX_ITEMS_IN_PROMPT = 800;
const MAX_SUPPLIERS_IN_PROMPT = 400;

type Named = { id: string; name: string; code?: string };

async function geminiVision(base64: string, mimeType: string, prompt: string): Promise<string> {
  const res = await fetch(
    aiUrl(
      "google-ai-studio",
      `v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8000, responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini Vision error ${res.status}`);
  const json = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

async function openAiVision(base64: string, mimeType: string, prompt: string): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` };
  if (process.env.OPENAI_PROJECT) headers["OpenAI-Project"] = process.env.OPENAI_PROJECT;
  if (process.env.OPENAI_ORG) headers["OpenAI-Organization"] = process.env.OPENAI_ORG;
  const res = await fetch(aiUrl("openai", "chat/completions", "https://api.openai.com/v1/chat/completions"), {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" } },
      ] }],
      max_tokens: 4000,
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI Vision error ${res.status}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content || "{}";
}

const num = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? "").replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function readList(raw: FormDataEntryValue | null, cap: number): Named[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x: any) => x && typeof x.id === "string" && typeof x.name === "string")
      .slice(0, cap)
      .map((x: any) => ({ id: x.id, name: x.name, code: typeof x.code === "string" ? x.code : undefined }));
  } catch { return []; }
}

export async function POST(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
  if (!canScanPurchaseInvoice(companyId)) {
    return NextResponse.json({ error: "Invoice scanning is not enabled for this company" }, { status: 403 });
  }
  if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
    return NextResponse.json({ error: "No vision AI key configured (GEMINI_API_KEY or OPENAI_API_KEY)" }, { status: 500 });
  }

  try {
    const quota = await consumeTrialQuota(companyId, "AI");
    if (!quota.ok) return NextResponse.json({ error: quota.message }, { status: 402 });

    const form = await req.formData();
    const file = form.get("image") as File | null;
    if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const suppliers = readList(form.get("suppliers"), MAX_SUPPLIERS_IN_PROMPT);
    const items = readList(form.get("items"), MAX_ITEMS_IN_PROMPT);

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const prompt = `You read a photographed invoice / bill that a SUPPLIER sent to a Pakistani business. The text may be Urdu script, Roman Urdu or English. Return ONLY JSON:
{
  "supplierName": "the seller named on the invoice, in its original script",
  "supplierId": "id from the supplier list below that is clearly the same business, or null",
  "invoiceNo": "the supplier's invoice number or null",
  "date": "YYYY-MM-DD or null",
  "lines": [
    {
      "text": "the line description exactly as written",
      "itemId": "id from the item list below that is clearly the same product, or null",
      "qty": number,
      "rate": number,
      "discountPercent": number,
      "taxPercent": number
    }
  ],
  "freight": number,
  "notes": "anything the user should double-check, or null"
}

Rules:
- supplierId / itemId: pick only when the invoice name and a list entry clearly mean the same thing, even across scripts or spellings ("علی ٹریڈرز" = "Ali Traders"). Otherwise null. Never invent an id.
- rate is the price per ONE unit, before tax. If only a line total and qty are given, divide. If a column is not on the invoice use 0.
- Read Urdu/Eastern digits as normal numbers. Remove commas. Do not guess an unreadable number: use 0 and say so in notes.
- One entry per product line. Skip headings, subtotals, grand total and bank details.
- Freight / carriage / delivery charges go in "freight", not in lines.

Suppliers (id|name):
${suppliers.map(s => `${s.id}|${s.name}`).join("\n") || "(none)"}

Items (id|code|name):
${items.map(i => `${i.id}|${i.code || ""}|${i.name}`).join("\n") || "(none)"}`;

    let raw = "{}";
    if (GEMINI_API_KEY) {
      try { raw = await geminiVision(base64, mimeType, prompt); }
      catch (e) { console.warn("Purchase scan: Gemini failed, trying OpenAI", e); raw = "{}"; }
    }
    if ((raw === "{}" || !raw) && OPENAI_API_KEY) raw = await openAiVision(base64, mimeType, prompt);

    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    let parsed: any;
    try { parsed = JSON.parse(raw); }
    catch { return NextResponse.json({ error: "Could not read the invoice. Try a clearer, well-lit photo." }, { status: 422 }); }

    // An id the model returns that is not in the lists the page sent is dropped,
    // so nothing unverified reaches the form.
    const supplierIds = new Set(suppliers.map(s => s.id));
    const itemIds = new Set(items.map(i => i.id));
    const lines = (Array.isArray(parsed.lines) ? parsed.lines : [])
      .map((l: any) => ({
        text: String(l?.text ?? "").trim(),
        itemId: l?.itemId && itemIds.has(String(l.itemId)) ? String(l.itemId) : null,
        qty: Math.abs(num(l?.qty)),
        rate: Math.abs(num(l?.rate)),
        discountPercent: Math.abs(num(l?.discountPercent)),
        taxPercent: Math.abs(num(l?.taxPercent)),
      }))
      .filter((l: any) => l.text && l.qty > 0);

    return NextResponse.json({
      supplierName: parsed.supplierName ? String(parsed.supplierName).trim() : null,
      supplierId: parsed.supplierId && supplierIds.has(String(parsed.supplierId)) ? String(parsed.supplierId) : null,
      invoiceNo: parsed.invoiceNo ? String(parsed.invoiceNo).trim() : null,
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(parsed.date || "")) ? String(parsed.date) : null,
      lines,
      freight: Math.abs(num(parsed.freight)),
      notes: parsed.notes ? String(parsed.notes) : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Scan failed" }, { status: 500 });
  }
}
