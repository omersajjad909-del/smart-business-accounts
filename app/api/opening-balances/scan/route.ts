import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aiUrl } from "@/lib/aiGateway";
import { resolveCompanyId } from "@/lib/tenant";
import { consumeTrialQuota } from "@/lib/trialLimits";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// A photographed khata page rarely has more than a few dozen lines; the account
// list is what makes the model's matching possible, so it is capped to keep the
// prompt bounded on companies with a very large chart.
const MAX_ACCOUNTS_IN_PROMPT = 600;

interface ScannedRow {
  rawName: string;
  nameRoman?: string | null;
  narration?: string | null;
  debit: number;
  credit: number;
  accountId?: string | null;
  confidence?: number;
}

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

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? Math.abs(v) : 0;
  const n = parseFloat(String(v ?? "").replace(/[,\s]/g, "").replace(/[()]/g, ""));
  return Number.isFinite(n) ? Math.abs(n) : 0;
};

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role")?.toUpperCase();
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Only ADMIN can import opening balances" }, { status: 403 });
  }
  if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
    return NextResponse.json({ error: "No vision AI key configured (GEMINI_API_KEY or OPENAI_API_KEY)" }, { status: 500 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  try {
    // Paid per image, same as receipt scanning.
    const quota = await consumeTrialQuota(companyId, "AI");
    if (!quota.ok) return NextResponse.json({ error: quota.message }, { status: 402 });

    const form = await req.formData();
    const file = form.get("image") as File | null;
    if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const accounts = await prisma.account.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
      take: MAX_ACCOUNTS_IN_PROMPT,
    });
    const accountList = accounts.map(a => `${a.id}|${a.code}|${a.name}`).join("\n");

    const prompt = `You read a photographed page from a handwritten or printed ledger / khata register kept by a Pakistani business. Each line is a party or account with a balance. The text may be in Urdu script (Nastaliq), Roman Urdu, English, or a mix.

Return ONLY JSON of this shape:
{
  "rows": [
    {
      "rawName": "the name exactly as written on the page, in its ORIGINAL script (keep Urdu as Urdu)",
      "nameRoman": "the same name in Roman/English letters, or null if already Roman",
      "narration": "any remark written beside the line, in its original script, or null",
      "debit": number,
      "credit": number,
      "accountId": "id of the matching account from the list below, or null",
      "confidence": number 0-100
    }
  ],
  "notes": "anything the user should check, or null"
}

Rules:
- One row per line of the page. Skip headings, page totals and blank lines.
- Amounts: read Urdu/Eastern digits (۰۱۲۳۴۵۶۷۸۹) as normal numbers. Remove commas. Never guess an unreadable amount: use 0 and say so in notes.
- Debit vs credit: a column headed Dr / Debit / لینا / وصول / بنام means debit (the party owes the business). Cr / Credit / دینا / جمع / بنام means credit (the business owes the party). If the page has a single balance column with no marker, put the amount in debit and mention it in notes.
- accountId: choose only when the page name and an account clearly refer to the same party, even across scripts or spellings (e.g. "علی ٹریڈرز" and "Ali Traders"). Otherwise null. Never invent an id.

Accounts (id|code|name):
${accountList || "(no accounts yet)"}`;

    let raw = "{}";
    if (GEMINI_API_KEY) {
      try { raw = await geminiVision(base64, mimeType, prompt); }
      catch (e) { console.warn("Ledger scan: Gemini failed, trying OpenAI", e); raw = "{}"; }
    }
    if ((raw === "{}" || !raw) && OPENAI_API_KEY) raw = await openAiVision(base64, mimeType, prompt);

    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    let parsed: { rows?: any[]; notes?: string | null };
    try { parsed = JSON.parse(raw); }
    catch { return NextResponse.json({ error: "Could not read the page. Try a clearer, well-lit photo." }, { status: 422 }); }

    const validIds = new Set(accounts.map(a => a.id));
    const rows: ScannedRow[] = (Array.isArray(parsed.rows) ? parsed.rows : [])
      .map((r: any) => ({
        rawName: String(r?.rawName ?? "").trim(),
        nameRoman: r?.nameRoman ? String(r.nameRoman).trim() : null,
        narration: r?.narration ? String(r.narration).trim() : null,
        debit: toNumber(r?.debit),
        credit: toNumber(r?.credit),
        // The model can return an id that is not in the list; drop it rather
        // than let an unverified id reach the import.
        accountId: r?.accountId && validIds.has(String(r.accountId)) ? String(r.accountId) : null,
        confidence: typeof r?.confidence === "number" ? r.confidence : undefined,
      }))
      .filter((r: ScannedRow) => r.rawName && (r.debit || r.credit));

    return NextResponse.json({ rows, notes: parsed.notes ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Scan failed" }, { status: 500 });
  }
}
