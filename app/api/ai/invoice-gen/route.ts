import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ORG     = process.env.OPENAI_ORG;
const OPENAI_PROJECT = process.env.OPENAI_PROJECT;
const GROQ_API_KEY   = process.env.GROQ_API_KEY;
const GROQ_MODEL     = "llama-3.3-70b-versatile";
const HAS_AI_KEY     = Boolean(GROQ_API_KEY || OPENAI_API_KEY);

export async function POST(req: NextRequest) {
  try {
    if (!HAS_AI_KEY) {
      return NextResponse.json({ error: "No AI provider configured (GROQ_API_KEY or OPENAI_API_KEY)" }, { status: 500 });
    }

    const companyId = req.headers.get("x-company-id");
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json() as { prompt?: string };
    const prompt = (body.prompt || "").trim();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Fetch company info + existing customers for context
    const [company, customers, lastInvoice] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId }, select: { name: true, baseCurrency: true } }),
      prisma.account.findMany({
        where: { companyId, partyType: "CUSTOMER", deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
        take: 100,
      }),
      prisma.salesInvoice.findFirst({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        select: { invoiceNo: true },
      }),
    ]);

    const currency = company?.baseCurrency || "PKR";
    const customerList = customers.map(c => c.name).join(", ") || "none yet";

    // Generate next invoice number suggestion
    let nextInvoiceNo = "INV-001";
    if (lastInvoice?.invoiceNo) {
      const match = lastInvoice.invoiceNo.match(/(\d+)$/);
      if (match) {
        const nextNum = String(Number(match[1]) + 1).padStart(match[1].length, "0");
        nextInvoiceNo = lastInvoice.invoiceNo.replace(/\d+$/, nextNum);
      }
    }

    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;

    const systemPrompt = `You are an invoice generation assistant for ${company?.name || "a business"} using FinovaOS accounting software in Pakistan.

Default currency: ${currency}
Today's date: ${todayStr}
Suggested next invoice number: ${nextInvoiceNo}
Known customers in the system: ${customerList}

Extract invoice details from the user's natural language input and return ONLY valid JSON:
{
  "customerName": "exact customer name (match to known customers if possible, otherwise use what user said)",
  "customerId": "customer id if matched, else null",
  "invoiceNo": "${nextInvoiceNo}",
  "date": "${todayStr}",
  "dueDate": "DD-MM-YYYY (30 days from today by default unless user specifies)",
  "items": [
    {
      "description": "item or service description",
      "qty": number,
      "unitPrice": number,
      "taxRate": number (0 if no tax, 17 if GST mentioned in Pakistan context),
      "amount": number (qty * unitPrice before tax)
    }
  ],
  "subtotal": number,
  "taxTotal": number,
  "total": number,
  "notes": "payment terms or any notes the user mentioned, or null",
  "confidence": number 0-100
}

Rules:
- If user says "+ GST" or "with tax" in Pakistan context, taxRate = 17
- If user says "exclusive of tax" or "ex-tax", apply 17% GST on top
- If user says "inclusive of tax" or "inc GST", back-calculate: subtotal = total / 1.17
- qty defaults to 1 if not specified
- Infer description from context ("consulting fee", "product sale", etc.)
- Match customer name to the known customer list if similar (case-insensitive, partial match ok)`;

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user"   as const, content: prompt },
    ];

    let raw = "{}";

    // ── Groq (primary — free, fast, supports JSON mode) ───────────────────────
    if (GROQ_API_KEY) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: chatMessages,
            max_tokens: 800,
            temperature: 0.1,
            response_format: { type: "json_object" },
          }),
        });
        if (res.ok) {
          const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
          raw = json.choices?.[0]?.message?.content || "{}";
        } else {
          console.warn("Groq invoice-gen failed, falling back to OpenAI:", res.status);
        }
      } catch (err) {
        console.warn("Groq invoice-gen error, falling back:", err);
      }
    }

    // ── OpenAI (fallback) ─────────────────────────────────────────────────────
    if ((raw === "{}" || !raw) && OPENAI_API_KEY) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      };
      if (OPENAI_PROJECT) headers["OpenAI-Project"] = OPENAI_PROJECT;
      if (OPENAI_ORG)     headers["OpenAI-Organization"] = OPENAI_ORG;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: chatMessages,
          max_tokens: 800,
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const err = await response.text().catch(() => `OpenAI error ${response.status}`);
        return NextResponse.json({ error: err }, { status: 502 });
      }

      const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      raw = json.choices?.[0]?.message?.content || "{}";
    }
    let draft: Record<string, unknown>;
    try {
      draft = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Could not parse AI response", raw }, { status: 502 });
    }

    // If customer name matched, resolve the ID
    if (draft.customerName && !draft.customerId) {
      const nameLower = String(draft.customerName).toLowerCase();
      const matched = customers.find(c => c.name.toLowerCase().includes(nameLower) || nameLower.includes(c.name.toLowerCase()));
      if (matched) {
        draft.customerId = matched.id;
        draft.customerName = matched.name;
      }
    }

    return NextResponse.json({ draft, generatedAt: new Date().toISOString() });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
