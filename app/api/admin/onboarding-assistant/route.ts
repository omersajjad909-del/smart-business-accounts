import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { aiConfigured, askJson } from "@/lib/ai/adminAI";
import { brandContext } from "@/lib/ai/productBrief";
import { loadCompanySignals, signalLine } from "@/lib/ai/signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Onboarding Assistant — a setup plan for a new company, in their own trade.
 *
 * The thing that stalls a new signup is the empty chart of accounts. A PVC
 * trader is asked to build a ledger from nothing on their first evening, and
 * most of them close the tab. This generates the chart their business actually
 * needs, in the exact CSV shape /api/accounts/import already accepts, plus the
 * five things to do in order.
 *
 * It generates; it does not write. Nothing here touches a customer company. The
 * output is a CSV the founder can check line by line and hand over, or import on
 * their behalf if asked to — because a chart of accounts is the foundation
 * every later number rests on, and a model that quietly invented three wrong
 * ledgers would corrupt a customer's books rather than help them.
 *
 * Codes and types follow the conventions already in the product: the five-digit
 * ranges from lib/demoSeed.ts and the partyType vocabulary from
 * CATEGORY_TYPE_MAP in lib/importEngine.ts. A generated account that does not
 * match those is rejected below rather than shown.
 */

/** Types the balance sheet knows how to classify. Anything else is dropped. */
const VALID_TYPES = new Set(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE", "CONTRA_ASSET"]);

/** partyType vocabulary, copied from CATEGORY_TYPE_MAP. */
const VALID_PARTY_TYPES = new Set([
  "CUSTOMER", "SUPPLIER", "BANKS", "CASH", "FIXED ASSETS", "ACCUMULATED DEPRECIATION",
  "EXPENSE", "INCOME", "EQUITY", "LIABILITIES", "STOCK", "GENERAL", "CONTRA",
]);

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const signals = await loadCompanySignals();

    // Who needs onboarding help: anyone whose setup is unfinished, and anyone
    // young enough that the first weeks are still in play.
    const candidates = signals
      .filter((s) => !s.setupDone || s.ageDays <= 45)
      .map((s) => ({
        companyId: s.companyId,
        name: s.name,
        businessType: s.businessType,
        country: s.country,
        plan: s.billedPlan || s.plan,
        ageDays: s.ageDays,
        setupDone: s.setupDone,
        userCount: s.userCount,
        accountCount: s.accountCount,
        itemCount: s.itemCount,
        invoicesLast30: s.invoicesLast30,
        daysSinceLogin: s.daysSinceLogin,
        // The number that says whether they are stuck: a company with a handful
        // of accounts after two weeks has not started, whatever the flag says.
        stuck: s.accountCount < 8 && s.ageDays >= 5,
      }))
      .sort((a, b) => Number(b.stuck) - Number(a.stuck) || a.ageDays - b.ageDays);

    return NextResponse.json({
      aiConfigured: aiConfigured(),
      candidates,
      summary: {
        total: candidates.length,
        stuck: candidates.filter((c) => c.stuck).length,
        setupIncomplete: candidates.filter((c) => !c.setupDone).length,
      },
    });
  } catch (err) {
    console.error("[onboarding-assistant] GET failed:", err);
    return NextResponse.json({ error: "Could not load new companies" }, { status: 500 });
  }
}

type Plan = {
  businessSummary: string;
  chartOfAccounts: Array<{ code: string; name: string; type: string; partyType: string; note?: string }>;
  checklist: Array<{ step: string; why: string; where: string }>;
  watchOutFor: string[];
  welcomeMessage: string;
};

const PLAN_SYSTEM = `
${brandContext()}

You prepare the first-week setup for a new FinovaOS company.

CHART OF ACCOUNTS
Build the chart this specific trade needs. Follow these conventions exactly:
- code: four digits as a string. 1xxx assets, 2xxx liabilities, 3xxx equity,
  4xxx income, 5xxx expenses. Start each block at x001 and go up.
- type: exactly one of ASSET, LIABILITY, EQUITY, INCOME, EXPENSE, CONTRA_ASSET.
- partyType: exactly one of CUSTOMER, SUPPLIER, BANKS, CASH, FIXED ASSETS,
  ACCUMULATED DEPRECIATION, EXPENSE, INCOME, EQUITY, LIABILITIES, STOCK,
  GENERAL, CONTRA.
- Between 14 and 26 accounts. Every business needs cash, bank, receivables,
  payables, stock, capital, sales, purchases and the usual expenses. On top of
  that, add the ledgers this particular trade genuinely uses and nothing else.
  A PVC pipe trader needs freight inward and cutting/wastage; a restaurant needs
  raw food and gas; a school needs fee income and teacher salaries. Do not pad.
- note: half a sentence, only where the account is not self-explanatory.

CHECKLIST
Five to eight steps, in the order they must happen, each with:
  step  what to do
  why   one sentence on what breaks if they skip it
  where which part of FinovaOS — a screen name if you are confident of it,
        otherwise the area ("the inventory section"). Never invent a menu path.

WATCH OUT FOR
Two to four things that commonly go wrong for this kind of business in their
first month with an accounting system.

WELCOME MESSAGE
Four to six sentences from the founder to this customer, naming the one thing
they should do first. Pakistani customers: Roman Urdu mixed with English.

Return one JSON object with keys: businessSummary, chartOfAccounts, checklist,
watchOutFor, welcomeMessage.
`;

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  if (!aiConfigured()) {
    return NextResponse.json({ error: "No AI provider configured" }, { status: 503 });
  }

  try {
    const { companyId, notes } = (await req.json().catch(() => ({}))) as {
      companyId?: string; notes?: string;
    };
    if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

    const [signal] = await loadCompanySignals([companyId]);
    if (!signal) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const plan = await askJson<Plan>(
      PLAN_SYSTEM,
      [
        `Company: ${signal.name}`,
        `Business type as recorded: ${signal.businessType}`,
        `Country: ${signal.country || "unknown"}`,
        `Plan: ${signal.billedPlan || signal.plan}`,
        `Age: ${signal.ageDays} days`,
        `Current state: ${signal.accountCount} accounts, ${signal.itemCount} items, ${signal.invoicesLast30} invoices last month`,
        ``,
        `Full usage record:`,
        signalLine(signal),
        notes ? `\nWhat the founder knows about this customer that the data does not say:\n${String(notes).slice(0, 800)}` : "",
      ].join("\n"),
      3200,
    );

    if (!plan || !Array.isArray(plan.chartOfAccounts)) {
      return NextResponse.json({ error: "The model did not return a usable plan. Try again." }, { status: 502 });
    }

    // Reject anything that would not survive the real importer. A row with a
    // type the balance sheet does not recognise imports fine and then goes
    // missing from every report, which is the worst of both outcomes.
    const rejected: string[] = [];
    const seenCodes = new Set<string>();
    const accounts = plan.chartOfAccounts.filter((a) => {
      const code = String(a?.code || "").trim();
      const type = String(a?.type || "").trim().toUpperCase();
      const partyType = String(a?.partyType || "").trim().toUpperCase();
      if (!code || !a?.name) { rejected.push(`${code || "?"} — missing code or name`); return false; }
      if (!/^\d{3,6}$/.test(code)) { rejected.push(`${code} — code is not numeric`); return false; }
      if (seenCodes.has(code)) { rejected.push(`${code} — duplicate code`); return false; }
      if (!VALID_TYPES.has(type)) { rejected.push(`${code} — unknown type "${a.type}"`); return false; }
      if (partyType && !VALID_PARTY_TYPES.has(partyType)) {
        rejected.push(`${code} — unknown partyType "${a.partyType}"`);
        return false;
      }
      seenCodes.add(code);
      return true;
    }).map((a) => ({
      ...a,
      code: String(a.code).trim(),
      type: String(a.type).trim().toUpperCase(),
      partyType: String(a.partyType || "GENERAL").trim().toUpperCase(),
    })).sort((a, b) => a.code.localeCompare(b.code));

    // Exactly the header /api/accounts/import reads.
    const csv = [
      "code,name,type,partyType",
      ...accounts.map((a) => [a.code, a.name, a.type, a.partyType].map(csvCell).join(",")),
    ].join("\n");

    return NextResponse.json({
      companyId,
      name: signal.name,
      plan: { ...plan, chartOfAccounts: accounts },
      csv,
      rejected,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[onboarding-assistant] POST failed:", err);
    return NextResponse.json({ error: "Could not build a setup plan" }, { status: 500 });
  }
}

/** Quote a CSV cell only when it needs it, the way a spreadsheet expects. */
function csvCell(value: string): string {
  const v = String(value ?? "");
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
