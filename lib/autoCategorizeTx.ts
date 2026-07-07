/**
 * FinovaOS — Transaction Auto-Categorization (AI)
 * Classifies bank/expense transactions into standard accounting categories
 * using OpenAI with rule-based fallback and per-company learned rules.
 */

import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransactionForCategorization {
  id: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
  date: string;
  currentCategory?: string;
  vendor?: string;
}

export interface CategorizationResult {
  id: string;
  category: string;
  subcategory?: string;
  confidence: number; // 0–100
  fbrCode?: string; // FBR NTN category code
  suggestion: string;
}

// ─── Standard Categories & FBR Codes ─────────────────────────────────────────

/**
 * STANDARD CATEGORIES:
 *
 * Revenue:
 *   Sales Revenue (1001), Service Revenue (1002), Interest Income (1003), Other Income (1004)
 *
 * COGS:
 *   Purchase of Goods (2001), Direct Labor (2002), Manufacturing Cost (2003)
 *
 * Operating Expenses:
 *   Salaries (3001), Rent (3002), Utilities (3003), Marketing (3004),
 *   Office Supplies (3005), Travel (3006), Repairs (3007),
 *   Insurance (3008), Depreciation (3009)
 *
 * Financial:
 *   Bank Charges (4001), Loan Payment (4002), Tax Payment (4003), Investment (4004)
 *
 * Other:
 *   Miscellaneous (9001)
 */

const FBR_CODE_MAP: Record<string, string> = {
  "Sales Revenue": "1001",
  "Service Revenue": "1002",
  "Interest Income": "1003",
  "Other Income": "1004",
  "Purchase of Goods": "2001",
  "Direct Labor": "2002",
  "Manufacturing Cost": "2003",
  Salaries: "3001",
  Rent: "3002",
  Utilities: "3003",
  Marketing: "3004",
  "Office Supplies": "3005",
  Travel: "3006",
  Repairs: "3007",
  Insurance: "3008",
  Depreciation: "3009",
  "Bank Charges": "4001",
  "Loan Payment": "4002",
  "Tax Payment": "4003",
  Investment: "4004",
  Miscellaneous: "9001",
};

const VALID_CATEGORIES = Object.keys(FBR_CODE_MAP);

const CATEGORIZATION_SYSTEM_PROMPT = `You are a professional accounting assistant specializing in Pakistani SME bookkeeping.
Your task is to classify financial transactions into standard accounting categories.

VALID CATEGORIES (you MUST use one of these exactly):
Revenue: Sales Revenue, Service Revenue, Interest Income, Other Income
COGS: Purchase of Goods, Direct Labor, Manufacturing Cost
Operating Expenses: Salaries, Rent, Utilities, Marketing, Office Supplies, Travel, Repairs, Insurance, Depreciation
Financial: Bank Charges, Loan Payment, Tax Payment, Investment
Other: Miscellaneous

SUBCATEGORY EXAMPLES: Monthly Rent, Electricity Bill, Internet Bill, Staff Salary, Raw Material Purchase, Fuel Expense, etc.

Return a valid JSON array. Each element must have:
{
  "id": "<transaction id>",
  "category": "<one of the valid categories above>",
  "subcategory": "<optional specific subcategory>",
  "confidence": <integer 0-100>,
  "suggestion": "<one sentence explanation>"
}

Rules:
- Credits (income) → Revenue or Financial/Investment categories
- Debits (expenses) → COGS, Operating Expenses, Financial categories
- If truly uncertain, use "Miscellaneous" with low confidence
- Salary/wages payments → Salaries
- FBR/tax payments → Tax Payment
- Bank fees/service charges → Bank Charges`;

// ─── OpenAI Client ────────────────────────────────────────────────────────────

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ─── Single Transaction Categorization ───────────────────────────────────────

export async function categorizeSingleTransaction(
  tx: TransactionForCategorization,
): Promise<CategorizationResult> {
  // Try rule-based first for speed and zero cost
  const ruled = await applyCategorizationRules(tx);
  if (ruled && ruled.confidence >= 85) {
    return ruled;
  }

  try {
    const openai = getOpenAIClient();
    const userContent = JSON.stringify([
      {
        id: tx.id,
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        date: tx.date,
        vendor: tx.vendor || null,
      },
    ]);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CATEGORIZATION_SYSTEM_PROMPT },
        { role: "user", content: `Categorize this transaction:\n${userContent}` },
      ],
      max_tokens: 300,
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content?.trim() || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("OpenAI returned invalid JSON");
    }

    // Handle both array and object-wrapped responses
    const items: any[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.results)
        ? parsed.results
        : [parsed];

    const item = items[0];
    if (!item?.category) throw new Error("No category in response");

    const category = VALID_CATEGORIES.includes(item.category)
      ? item.category
      : "Miscellaneous";

    return {
      id: tx.id,
      category,
      subcategory: item.subcategory || undefined,
      confidence: Math.max(0, Math.min(100, Number(item.confidence) || 60)),
      fbrCode: FBR_CODE_MAP[category],
      suggestion: item.suggestion || `Classified as ${category}`,
    };
  } catch (error) {
    console.error("categorizeSingleTransaction AI error:", error);
    // Fall back to rule-based or Miscellaneous
    return (
      ruled || {
        id: tx.id,
        category: "Miscellaneous",
        confidence: 30,
        fbrCode: FBR_CODE_MAP["Miscellaneous"],
        suggestion: "Could not determine category automatically. Please review.",
      }
    );
  }
}

// ─── Batch Categorization ─────────────────────────────────────────────────────

export async function categorizeBatch(
  transactions: TransactionForCategorization[],
  companyId?: string,
): Promise<CategorizationResult[]> {
  if (!transactions.length) return [];

  // First pass: try rule-based for all — apply to those with high confidence
  const ruled = await Promise.all(transactions.map(applyCategorizationRules));
  const results: CategorizationResult[] = [];
  const needsAI: TransactionForCategorization[] = [];

  for (let i = 0; i < transactions.length; i++) {
    const r = ruled[i];
    if (r && r.confidence >= 85) {
      results.push(r);
    } else {
      needsAI.push(transactions[i]);
    }
  }

  if (!needsAI.length) return results;

  // Load company-specific learned rules if companyId provided
  let learnedRules: Array<{ description: string; category: string }> = [];
  if (companyId) {
    try {
      const logs = await prisma.activityLog.findMany({
        where: { companyId, action: "CATEGORY_RULE" },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      for (const log of logs) {
        try {
          const data = JSON.parse(log.details || "{}");
          if (Array.isArray(data.examples)) {
            learnedRules = [...learnedRules, ...data.examples];
          }
        } catch {
          // ignore malformed entries
        }
      }
    } catch (error) {
      console.error("Failed to load learned rules:", error);
    }
  }

  // Batch into chunks of 20 for OpenAI efficiency
  const BATCH_SIZE = 20;
  const chunks: TransactionForCategorization[][] = [];
  for (let i = 0; i < needsAI.length; i += BATCH_SIZE) {
    chunks.push(needsAI.slice(i, i + BATCH_SIZE));
  }

  const aiResults: CategorizationResult[] = [];

  for (const chunk of chunks) {
    try {
      const openai = getOpenAIClient();

      const learnedContext =
        learnedRules.length > 0
          ? `\n\nCOMPANY-SPECIFIC RULES (apply these first):\n${learnedRules
              .slice(0, 20)
              .map((r) => `"${r.description}" → ${r.category}`)
              .join("\n")}`
          : "";

      const userContent = JSON.stringify(
        chunk.map((tx) => ({
          id: tx.id,
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
          date: tx.date,
          vendor: tx.vendor || null,
        })),
      );

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: CATEGORIZATION_SYSTEM_PROMPT + learnedContext,
          },
          {
            role: "user",
            content: `Categorize these ${chunk.length} transactions and return a JSON array:\n${userContent}`,
          },
        ],
        max_tokens: Math.min(4000, chunk.length * 150 + 200),
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0]?.message?.content?.trim() || "{}";
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error("OpenAI batch returned invalid JSON");
      }

      const items: any[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.results)
          ? parsed.results
          : Array.isArray(parsed?.transactions)
            ? parsed.transactions
            : [];

      for (const tx of chunk) {
        const item = items.find((i: any) => i?.id === tx.id);
        if (item?.category) {
          const category = VALID_CATEGORIES.includes(item.category)
            ? item.category
            : "Miscellaneous";
          aiResults.push({
            id: tx.id,
            category,
            subcategory: item.subcategory || undefined,
            confidence: Math.max(0, Math.min(100, Number(item.confidence) || 60)),
            fbrCode: FBR_CODE_MAP[category],
            suggestion: item.suggestion || `Classified as ${category}`,
          });
        } else {
          // Fallback for items AI didn't return
          const fallback = await applyCategorizationRules(tx);
          aiResults.push(
            fallback || {
              id: tx.id,
              category: "Miscellaneous",
              confidence: 25,
              fbrCode: FBR_CODE_MAP["Miscellaneous"],
              suggestion: "Could not determine category. Manual review required.",
            },
          );
        }
      }
    } catch (error) {
      console.error("categorizeBatch chunk error:", error);
      // Fallback all in this chunk
      for (const tx of chunk) {
        const fallback = await applyCategorizationRules(tx);
        aiResults.push(
          fallback || {
            id: tx.id,
            category: "Miscellaneous",
            confidence: 20,
            fbrCode: FBR_CODE_MAP["Miscellaneous"],
            suggestion: "AI categorization failed. Manual review required.",
          },
        );
      }
    }
  }

  // Merge rule-based + AI results, preserving original order
  const allById: Record<string, CategorizationResult> = {};
  for (const r of [...results, ...aiResults]) {
    allById[r.id] = r;
  }

  return transactions.map(
    (tx) =>
      allById[tx.id] || {
        id: tx.id,
        category: "Miscellaneous",
        confidence: 10,
        fbrCode: FBR_CODE_MAP["Miscellaneous"],
        suggestion: "Unable to categorize.",
      },
  );
}

// ─── Rule-Based Fallback ──────────────────────────────────────────────────────

export async function applyCategorizationRules(
  tx: TransactionForCategorization,
): Promise<CategorizationResult | null> {
  const desc = (tx.description + " " + (tx.vendor || "")).toLowerCase();

  type Rule = { patterns: string[]; category: string; subcategory?: string; confidence: number };

  const RULES: Rule[] = [
    // Revenue (credits)
    {
      patterns: ["sales", "sale receipt", "customer payment", "invoice payment"],
      category: "Sales Revenue",
      subcategory: "Customer Sales",
      confidence: 88,
    },
    {
      patterns: ["service fee", "consulting fee", "service charge", "professional fee"],
      category: "Service Revenue",
      subcategory: "Service Income",
      confidence: 88,
    },
    {
      patterns: ["interest earned", "profit on savings", "bank profit", "markup earned"],
      category: "Interest Income",
      subcategory: "Bank Interest",
      confidence: 90,
    },

    // COGS
    {
      patterns: ["purchase", "supplier payment", "raw material", "goods purchased", "stock purchase", "inventory purchase"],
      category: "Purchase of Goods",
      subcategory: "Raw Material Purchase",
      confidence: 85,
    },
    {
      patterns: ["direct labor", "labor cost", "factory wages", "production wages"],
      category: "Direct Labor",
      subcategory: "Factory Labor",
      confidence: 87,
    },
    {
      patterns: ["manufacturing", "production cost", "fabrication"],
      category: "Manufacturing Cost",
      subcategory: "Production",
      confidence: 82,
    },

    // Operating Expenses
    {
      patterns: ["salary", "salaries", "wages", "payroll", "staff payment", "employee payment"],
      category: "Salaries",
      subcategory: "Staff Salaries",
      confidence: 95,
    },
    {
      patterns: ["rent", "lease payment", "rental"],
      category: "Rent",
      subcategory: "Office/Shop Rent",
      confidence: 95,
    },
    {
      patterns: ["electricity", "electric bill", "wapda", "k-electric", "gas bill", "ssgc", "sngpl", "water bill", "utility", "utilities", "ptcl", "internet bill", "internet charges"],
      category: "Utilities",
      subcategory: "Utility Bills",
      confidence: 92,
    },
    {
      patterns: ["marketing", "advertising", "advertisement", "google ads", "facebook ads", "social media", "promotion", "campaign"],
      category: "Marketing",
      subcategory: "Advertising",
      confidence: 88,
    },
    {
      patterns: ["office supplies", "stationery", "printing", "photocopy", "office expense"],
      category: "Office Supplies",
      subcategory: "Office Supplies",
      confidence: 85,
    },
    {
      patterns: ["travel", "transport", "fuel", "petrol", "diesel", "vehicle", "air ticket", "hotel", "accommodation", "cab", "uber", "careem"],
      category: "Travel",
      subcategory: "Travel & Transport",
      confidence: 85,
    },
    {
      patterns: ["repair", "maintenance", "servicing", "fix", "spare parts"],
      category: "Repairs",
      subcategory: "Maintenance",
      confidence: 85,
    },
    {
      patterns: ["insurance", "takaful", "premium payment"],
      category: "Insurance",
      subcategory: "Insurance Premium",
      confidence: 92,
    },
    {
      patterns: ["depreciation", "amortization"],
      category: "Depreciation",
      subcategory: "Asset Depreciation",
      confidence: 95,
    },

    // Financial
    {
      patterns: ["bank charge", "bank fee", "service fee", "commission charge", "transaction fee", "cheque return", "swift charge"],
      category: "Bank Charges",
      subcategory: "Bank Service Charges",
      confidence: 90,
    },
    {
      patterns: ["loan repayment", "emi", "loan installment", "principal payment", "bank loan"],
      category: "Loan Payment",
      subcategory: "Loan Repayment",
      confidence: 88,
    },
    {
      patterns: ["tax payment", "income tax", "fbr", "sales tax", "gst", "withholding tax", "wht", "advance tax", "property tax"],
      category: "Tax Payment",
      subcategory: "Tax",
      confidence: 93,
    },
    {
      patterns: ["investment", "mutual fund", "shares", "stock purchase", "treasury bill", "t-bill", "sukuk"],
      category: "Investment",
      subcategory: "Financial Investment",
      confidence: 85,
    },
  ];

  for (const rule of RULES) {
    const matched = rule.patterns.some((pattern) => desc.includes(pattern));
    if (matched) {
      // Credit transactions should not match expense categories and vice versa
      const isRevenueCategory = ["Sales Revenue", "Service Revenue", "Interest Income", "Other Income"].includes(
        rule.category,
      );
      if (tx.type === "credit" && !isRevenueCategory && !["Investment"].includes(rule.category)) {
        continue;
      }
      if (tx.type === "debit" && isRevenueCategory) {
        continue;
      }

      return {
        id: tx.id,
        category: rule.category,
        subcategory: rule.subcategory,
        confidence: rule.confidence,
        fbrCode: FBR_CODE_MAP[rule.category],
        suggestion: `Matched rule: description contains "${rule.patterns.find((p) => desc.includes(p))}"`,
      };
    }
  }

  return null;
}

// ─── Learn Category Rules ─────────────────────────────────────────────────────

export async function learnCategoryRules(
  companyId: string,
  examples: Array<{ description: string; category: string }>,
): Promise<void> {
  if (!companyId || !examples.length) return;

  // Validate categories
  const valid = examples.filter((e) => VALID_CATEGORIES.includes(e.category));
  if (!valid.length) return;

  try {
    await prisma.activityLog.create({
      data: {
        companyId,
        action: "CATEGORY_RULE",
        details: JSON.stringify({
          examples: valid,
          learnedAt: new Date().toISOString(),
          count: valid.length,
        }),
      },
    });
  } catch (error) {
    console.error("learnCategoryRules error:", error);
    throw error;
  }
}
