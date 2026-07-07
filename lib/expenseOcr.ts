import OpenAI from "openai";

export interface ExtractedReceipt {
  vendor?: string;
  amount?: number;
  currency?: string;
  date?: string;
  category?: string;
  items?: Array<{ name: string; amount: number }>;
  tax?: number;
  total?: number;
  confidence: "high" | "medium" | "low";
  rawText?: string;
}

const VALID_CATEGORIES = [
  "food",
  "transport",
  "utilities",
  "office",
  "marketing",
  "salary",
  "rent",
  "equipment",
  "other",
] as const;

type ReceiptCategory = (typeof VALID_CATEGORIES)[number];

function isValidCategory(value: unknown): value is ReceiptCategory {
  return typeof value === "string" && (VALID_CATEGORIES as readonly string[]).includes(value);
}

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

/**
 * Extract expense receipt data from a base64-encoded image using OpenAI Vision (GPT-4o).
 */
export async function extractReceiptData(
  imageBase64: string,
  mimeType = "image/jpeg",
): Promise<ExtractedReceipt> {
  const openai = getOpenAI();

  const prompt = `You are an OCR engine specialised in expense receipts. Examine this receipt image and extract all relevant data.

Return ONLY a valid JSON object with these exact keys (omit any key whose value cannot be determined):
{
  "vendor": "string — business/store name",
  "amount": number — primary charge or subtotal,
  "currency": "3-letter ISO code e.g. USD, PKR, EUR",
  "date": "YYYY-MM-DD",
  "category": "one of: food | transport | utilities | office | marketing | salary | rent | equipment | other",
  "items": [{"name": "string", "amount": number}, ...],
  "tax": number — tax amount if shown,
  "total": number — grand total including tax,
  "confidence": "high | medium | low — your confidence in the extraction"
}

Do NOT include markdown fences or any extra text — return only the JSON.`;

  const imageUrl = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:${mimeType};base64,${imageBase64}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
        ],
      },
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? "";

  // Strip any accidental markdown fences
  const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Return a low-confidence result with the raw text preserved
    return { confidence: "low", rawText: raw };
  }

  const result: ExtractedReceipt = {
    confidence: (["high", "medium", "low"].includes(parsed.confidence as string)
      ? parsed.confidence
      : "low") as ExtractedReceipt["confidence"],
    rawText: raw,
  };

  if (typeof parsed.vendor === "string" && parsed.vendor.trim()) {
    result.vendor = parsed.vendor.trim();
  }
  if (typeof parsed.amount === "number" && isFinite(parsed.amount)) {
    result.amount = parsed.amount;
  }
  if (typeof parsed.currency === "string" && parsed.currency.trim()) {
    result.currency = parsed.currency.trim().toUpperCase();
  }
  if (typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
    result.date = parsed.date;
  }
  if (isValidCategory(parsed.category)) {
    result.category = parsed.category;
  } else {
    result.category = "other";
  }
  if (Array.isArray(parsed.items)) {
    result.items = (parsed.items as unknown[])
      .filter(
        (i): i is { name: string; amount: number } =>
          typeof (i as any)?.name === "string" && typeof (i as any)?.amount === "number",
      )
      .map((i) => ({ name: i.name.trim(), amount: i.amount }));
  }
  if (typeof parsed.tax === "number" && isFinite(parsed.tax)) {
    result.tax = parsed.tax;
  }
  if (typeof parsed.total === "number" && isFinite(parsed.total)) {
    result.total = parsed.total;
  }

  return result;
}

/**
 * Map an ExtractedReceipt to an ExpenseVoucher-compatible shape for display / pre-fill.
 * Note: fields like expenseAccountId and paymentAccountId must be chosen by the user.
 */
export function buildExpenseFromReceipt(
  receipt: ExtractedReceipt,
  companyId: string,
  userId: string,
): Record<string, unknown> {
  const amount = receipt.total ?? receipt.amount ?? 0;
  const today = new Date().toISOString().slice(0, 10);

  return {
    companyId,
    userId,
    vendor: receipt.vendor ?? "Unknown Vendor",
    amount,
    currency: receipt.currency ?? "USD",
    category: receipt.category ?? "other",
    date: receipt.date ?? today,
    items: receipt.items ?? [],
    tax: receipt.tax ?? 0,
    total: amount,
    notes: "OCR extracted from receipt",
    confidence: receipt.confidence,
    // ExpenseVoucher compatible fields
    description: [
      receipt.vendor ? `Vendor: ${receipt.vendor}` : null,
      receipt.category ? `Category: ${receipt.category}` : null,
      "OCR extracted from receipt",
    ]
      .filter(Boolean)
      .join(" | "),
    totalAmount: amount,
    approvalStatus: "DRAFT",
    createdAt: new Date().toISOString(),
  };
}
