import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 30;

// Rule-based GL category patterns — no OpenAI needed, instant response
const GL_PATTERNS: Array<{ keywords: string[]; category: string; accountTypes: string[]; confidence: number }> = [
  { keywords: ["rent", "lease", "office rent", "shop rent", "warehouse rent"], category: "Rent Expense", accountTypes: ["EXPENSE", "RENT"], confidence: 95 },
  { keywords: ["salary", "salaries", "wages", "payroll", "staff pay"], category: "Salary & Wages", accountTypes: ["EXPENSE", "SALARY"], confidence: 95 },
  { keywords: ["electricity", "sui gas", "gas bill", "k-electric", "kesc", "utility", "water", "nepra"], category: "Utilities", accountTypes: ["EXPENSE", "UTILITIES"], confidence: 92 },
  { keywords: ["fuel", "petrol", "diesel", "cng", "petroleum"], category: "Fuel & Transport", accountTypes: ["EXPENSE", "TRANSPORT"], confidence: 92 },
  { keywords: ["mobile", "phone", "telephone", "internet", "broadband", "wifi", "ptcl", "telenor", "zong", "ufone", "jazz"], category: "Communication", accountTypes: ["EXPENSE", "COMMUNICATION"], confidence: 90 },
  { keywords: ["stationery", "office supplies", "printer", "toner", "paper", "pen", "notebook"], category: "Office Supplies", accountTypes: ["EXPENSE", "OFFICE"], confidence: 90 },
  { keywords: ["repair", "maintenance", "fix", "service", "overhaul", "parts", "spare"], category: "Repairs & Maintenance", accountTypes: ["EXPENSE", "MAINTENANCE"], confidence: 88 },
  { keywords: ["travel", "ticket", "flight", "hotel stay", "accommodation", "transport", "cab", "uber", "careem", "conveyance"], category: "Travel & Conveyance", accountTypes: ["EXPENSE", "TRAVEL"], confidence: 88 },
  { keywords: ["food", "meal", "lunch", "dinner", "restaurant", "canteen", "refreshment", "tea"], category: "Food & Entertainment", accountTypes: ["EXPENSE", "ENTERTAINMENT"], confidence: 85 },
  { keywords: ["insurance", "premium", "policy", "cover"], category: "Insurance", accountTypes: ["EXPENSE", "INSURANCE"], confidence: 90 },
  { keywords: ["bank", "bank charges", "service charge", "processing fee", "banking fee"], category: "Bank Charges", accountTypes: ["EXPENSE", "BANK_CHARGES"], confidence: 92 },
  { keywords: ["advertising", "marketing", "ad", "promotion", "campaign", "social media", "seo", "google ads", "meta"], category: "Advertising & Marketing", accountTypes: ["EXPENSE", "MARKETING"], confidence: 90 },
  { keywords: ["professional", "consultant", "accountant", "lawyer", "legal", "audit", "ca firm"], category: "Professional Fees", accountTypes: ["EXPENSE", "PROFESSIONAL"], confidence: 90 },
  { keywords: ["purchase", "stock", "inventory", "goods", "merchandise", "raw material", "material"], category: "Purchases / Inventory", accountTypes: ["EXPENSE", "PURCHASE", "COGS"], confidence: 85 },
  { keywords: ["freight", "shipping", "courier", "delivery charges", "cargo", "clearing", "customs"], category: "Freight & Customs", accountTypes: ["EXPENSE", "FREIGHT"], confidence: 88 },
  { keywords: ["depreciation", "amortization"], category: "Depreciation", accountTypes: ["EXPENSE", "DEPRECIATION"], confidence: 95 },
  { keywords: ["interest", "markup", "finance charge", "borrowing cost"], category: "Finance Costs / Interest", accountTypes: ["EXPENSE", "FINANCE"], confidence: 92 },
  { keywords: ["tax", "gst", "withholding", "income tax", "advance tax", "srb", "fbr"], category: "Taxes & Duties", accountTypes: ["LIABILITY", "TAX"], confidence: 90 },
  { keywords: ["cash", "petty cash", "cash in hand"], category: "Cash in Hand", accountTypes: ["ASSET", "CASH"], confidence: 88 },
  { keywords: ["sales", "revenue", "income", "turnover"], category: "Sales Revenue", accountTypes: ["REVENUE", "SALES"], confidence: 90 },
  { keywords: ["loan", "borrowing", "financing", "liab"], category: "Loans / Borrowing", accountTypes: ["LIABILITY", "LOAN"], confidence: 88 },
  { keywords: ["asset", "equipment", "machine", "machinery", "computer", "vehicle", "furniture"], category: "Fixed Assets", accountTypes: ["ASSET", "FIXED_ASSET"], confidence: 85 },
  { keywords: ["commission", "incentive", "bonus", "reward"], category: "Commission & Incentives", accountTypes: ["EXPENSE", "COMMISSION"], confidence: 88 },
  { keywords: ["cleaning", "housekeeping", "janitorial", "sanitation"], category: "Cleaning & Sanitation", accountTypes: ["EXPENSE", "OFFICE"], confidence: 85 },
  { keywords: ["training", "seminar", "course", "workshop", "development"], category: "Staff Training", accountTypes: ["EXPENSE", "TRAINING"], confidence: 85 },
];

export async function POST(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json() as { description?: string; amount?: number; vendor?: string };
    const description = (body.description || "").toLowerCase().trim();
    const vendor = (body.vendor || "").toLowerCase().trim();
    const searchText = `${description} ${vendor}`;

    if (!searchText.trim()) return NextResponse.json({ error: "Description required" }, { status: 400 });

    // Match against patterns
    const matches: Array<{ category: string; accountTypes: string[]; confidence: number; matchedKeyword: string }> = [];
    for (const pattern of GL_PATTERNS) {
      for (const kw of pattern.keywords) {
        if (searchText.includes(kw)) {
          matches.push({ category: pattern.category, accountTypes: pattern.accountTypes, confidence: pattern.confidence, matchedKeyword: kw });
          break;
        }
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    // Look up actual GL accounts in the company's chart of accounts
    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: matches.length > 0 ? matches.slice(0, 3).flatMap(m => m.accountTypes.map(t => ({ name: { contains: m.category.split(" ")[0], mode: "insensitive" as const } }))) : [{ name: { contains: description.split(" ")[0], mode: "insensitive" } }],
      },
      select: { id: true, name: true, code: true, type: true },
      take: 10,
    });

    // Also do a simple name search
    const nameMatched = await prisma.account.findMany({
      where: {
        companyId, deletedAt: null,
        name: { contains: description.split(" ").filter(w => w.length > 3)[0] || description, mode: "insensitive" },
      },
      select: { id: true, name: true, code: true, type: true },
      take: 5,
    });

    const allAccounts = [...accounts, ...nameMatched].filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i);

    const suggestions = matches.slice(0, 3).map((m, i) => ({
      rank: i + 1,
      category: m.category,
      confidence: m.confidence,
      matchedKeyword: m.matchedKeyword,
      matchedAccounts: allAccounts.filter(a => m.accountTypes.some(t => a.type?.toUpperCase().includes(t) || a.name.toLowerCase().includes(m.category.split(" ")[0].toLowerCase()))).slice(0, 3),
    }));

    // If no pattern matched, return top accounts by name similarity
    const fallback = matches.length === 0 ? allAccounts.slice(0, 5) : [];

    return NextResponse.json({
      description: body.description,
      vendor: body.vendor,
      suggestions,
      fallbackAccounts: fallback,
      topSuggestion: suggestions[0] || null,
      generatedAt: new Date().toISOString(),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
