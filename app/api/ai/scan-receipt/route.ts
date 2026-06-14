import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ORG    = process.env.OPENAI_ORG;
const OPENAI_PROJECT = process.env.OPENAI_PROJECT;

export async function POST(req: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Convert to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    };
    if (OPENAI_PROJECT) headers["OpenAI-Project"] = OPENAI_PROJECT;
    if (OPENAI_ORG)     headers["OpenAI-Organization"] = OPENAI_ORG;

    const prompt = `You are a receipt/invoice OCR assistant for a Pakistani accounting system.

Extract ALL of the following from this receipt or invoice image. Return ONLY valid JSON, no explanation:

{
  "vendor": "vendor/supplier name or null",
  "date": "DD-MM-YYYY format or null",
  "invoiceNo": "invoice or receipt number or null",
  "subtotal": number or null,
  "taxAmount": number or null,
  "taxRate": number or null (e.g. 17 for 17% GST),
  "total": number (required — the grand total amount),
  "currency": "PKR or USD or AED etc",
  "items": [
    { "description": "item name", "qty": number or null, "unitPrice": number or null, "amount": number }
  ],
  "category": one of: "Office Supplies" | "Travel & Transport" | "Utilities" | "Rent" | "Food & Entertainment" | "Medical" | "Equipment & Machinery" | "Repairs & Maintenance" | "Professional Services" | "Advertising & Marketing" | "Fuel" | "Salary & Wages" | "Insurance" | "Banking & Finance" | "Inventory / Stock Purchase" | "Miscellaneous",
  "confidence": number between 0 and 100 (how confident you are in the extraction),
  "notes": "any important notes about this document or null"
}

Rules:
- For Pakistani receipts: currency is PKR unless otherwise shown
- GST in Pakistan is 17% or 18% — detect if present
- If an amount is in words AND numbers, use the numeric figure
- If any field is not visible or unclear, use null (never guess)
- category should be your best judgment based on vendor name and items`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 1200,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => `OpenAI error ${response.status}`);
      return NextResponse.json({ error: err }, { status: 502 });
    }

    const json = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const raw = json.choices?.[0]?.message?.content || "{}";
    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Could not parse AI response", raw }, { status: 502 });
    }

    return NextResponse.json({ extracted, scannedAt: new Date().toISOString() });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
