import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENAI_API_KEY  = process.env.OPENAI_API_KEY;
const OPENAI_ORG      = process.env.OPENAI_ORG;
const OPENAI_PROJECT  = process.env.OPENAI_PROJECT;
const GEMINI_API_KEY  = process.env.GEMINI_API_KEY;
const HAS_VISION_KEY  = Boolean(GEMINI_API_KEY || OPENAI_API_KEY);

// Gemini Vision — extract JSON from receipt/invoice image
async function geminiVisionExtract(base64: string, mimeType: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1200 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini Vision error ${res.status}: ${await res.text().catch(() => "")}`);
  const json = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

export async function POST(req: NextRequest) {
  try {
    if (!HAS_VISION_KEY) {
      return NextResponse.json({ error: "No vision AI key configured (GEMINI_API_KEY or OPENAI_API_KEY)" }, { status: 500 });
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

    // ── Gemini Vision (primary — free tier, multimodal) ───────────────────────
    let raw = "{}";
    if (GEMINI_API_KEY) {
      try {
        raw = await geminiVisionExtract(base64, mimeType, prompt);
        // Gemini sometimes wraps JSON in ```json ... ``` — strip it
        raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      } catch (geminiErr) {
        console.warn("Gemini Vision failed, falling back to OpenAI:", geminiErr);
        raw = "{}";
      }
    }

    // ── OpenAI Vision (fallback) ───────────────────────────────────────────────
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
          model: "gpt-4o",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" } },
            ],
          }],
          max_tokens: 1200,
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
