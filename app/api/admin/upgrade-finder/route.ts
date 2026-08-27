import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { aiConfigured, askAI } from "@/lib/ai/adminAI";
import { loadCompanySignals, signalLine, type CompanySignal } from "@/lib/ai/signals";
import { getMaxUsersForPlan, normalizePlanCode } from "@/lib/planLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Upgrade Finder — customers whose usage has outgrown what they pay for.
 *
 * The mirror of Churn Radar and built the same way: deterministic scoring in
 * GET, a model only when you ask it for the pitch. Seat and branch limits come
 * from lib/planLimits so this page cannot drift away from what the app actually
 * enforces at signup.
 *
 * One rule that matters more than the scoring: a customer who is quiet is never
 * an upgrade candidate, however much data they have. Pitching a bigger plan to
 * someone who has not logged in for three weeks is how a renewal turns into a
 * cancellation, so `isEngaged` gates the whole list.
 */

/**
 * Branches per plan. These are not in lib/planLimits because nothing in the app
 * enforces them yet — they are the numbers the pricing page sells, so they are
 * the numbers a pitch has to be built on.
 */
const BRANCH_LIMIT: Record<string, number | null> = {
  STARTER: 1,
  PRO: 3,
  ENTERPRISE: 10,
  CUSTOM: null,
};

const NEXT_PLAN: Record<string, string | null> = {
  STARTER: "PROFESSIONAL",
  PRO: "ENTERPRISE",
  ENTERPRISE: null,
  CUSTOM: null,
};

type Candidate = CompanySignal & {
  currentPlan: string;
  suggestedPlan: string | null;
  fit: number;
  hardBlock: boolean;
  reasons: string[];
};

/** Is this customer using the product enough for an upgrade ask to land? */
function isEngaged(s: CompanySignal): boolean {
  if (s.daysSinceLogin === null || s.daysSinceLogin > 14) return false;
  if (s.loginsLast30 < 2) return false;
  return s.invoicesLast30 > 0 || s.vouchersLast30 > 0;
}

function scoreUpgrade(s: CompanySignal): { fit: number; reasons: string[]; hardBlock: boolean } {
  const plan = normalizePlanCode(s.billedPlan || s.plan);
  const seatLimit = getMaxUsersForPlan(plan);
  const branchLimit = BRANCH_LIMIT[plan] ?? null;

  const reasons: string[] = [];
  let fit = 0;
  // A "hard block" is usage that the plan does not permit at all, as opposed to
  // usage that merely suggests the customer would get value from more. The two
  // deserve different conversations, so they are tracked separately.
  let hardBlock = false;

  if (seatLimit !== null && s.userCount >= seatLimit) {
    hardBlock = true;
    fit += 40;
    reasons.push(`${s.userCount} users on a ${seatLimit}-seat plan — at the ceiling`);
  } else if (seatLimit !== null && s.userCount === seatLimit - 1) {
    fit += 18;
    reasons.push(`${s.userCount} of ${seatLimit} seats used — one away from the ceiling`);
  }

  if (branchLimit !== null && s.branchCount > branchLimit) {
    hardBlock = true;
    fit += 35;
    reasons.push(`${s.branchCount} branches on a ${branchLimit}-branch plan`);
  } else if (branchLimit !== null && s.branchCount === branchLimit && branchLimit > 0) {
    fit += 12;
    reasons.push(`${s.branchCount} branch${branchLimit === 1 ? "" : "es"} — at the plan limit`);
  }

  // Volume signals. These are the ones that say "this customer would use the
  // reports and the reconciliation", which is what the higher plans actually
  // contain — not more of the same thing.
  if (s.invoicesLast30 >= 60) {
    fit += 25;
    reasons.push(`${s.invoicesLast30} invoices last month — heavy transactional use`);
  } else if (s.invoicesLast30 >= 25) {
    fit += 14;
    reasons.push(`${s.invoicesLast30} invoices last month`);
  }

  if (plan === "STARTER" && s.employeeCount >= 3) {
    fit += 20;
    reasons.push(`${s.employeeCount} employees on record but no HR/Payroll on Starter`);
  }

  if (plan === "STARTER" && s.accountCount >= 80) {
    fit += 12;
    reasons.push(`${s.accountCount} ledger accounts — a chart this size wants P&L and balance sheet`);
  }

  if (s.itemCount >= 300) {
    fit += 10;
    reasons.push(`${s.itemCount} stock items — inventory reporting territory`);
  }

  if (s.invoiceTrendPct !== null && s.invoiceTrendPct >= 40) {
    fit += 12;
    reasons.push(`Invoicing up ${s.invoiceTrendPct}% month on month — they are growing`);
  }

  // Longevity is not a reason to upgrade on its own, but it is what makes the
  // ask reasonable rather than pushy, so it nudges rather than drives.
  if (s.ageDays >= 90) {
    fit += 8;
    reasons.push(`${Math.floor(s.ageDays / 30)} months on the platform`);
  }

  return { fit: Math.min(100, fit), reasons, hardBlock };
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const signals = await loadCompanySignals();

    const candidates: Candidate[] = signals
      .filter((s) => {
        const plan = normalizePlanCode(s.billedPlan || s.plan);
        return NEXT_PLAN[plan] !== null && NEXT_PLAN[plan] !== undefined;
      })
      .map((s) => {
        const plan = normalizePlanCode(s.billedPlan || s.plan);
        const { fit, reasons, hardBlock } = scoreUpgrade(s);
        return {
          ...s,
          currentPlan: plan,
          suggestedPlan: NEXT_PLAN[plan] ?? null,
          fit,
          hardBlock,
          reasons,
        };
      })
      .filter((c) => c.fit > 0 && isEngaged(c))
      .sort((a, b) => b.fit - a.fit);

    const parked = signals.filter((s) => {
      const plan = normalizePlanCode(s.billedPlan || s.plan);
      if (!NEXT_PLAN[plan]) return false;
      return scoreUpgrade(s).fit > 0 && !isEngaged(s);
    }).map((s) => ({ companyId: s.companyId, name: s.name, daysSinceLogin: s.daysSinceLogin }));

    return NextResponse.json({
      aiConfigured: aiConfigured(),
      generatedAt: new Date().toISOString(),
      candidates,
      /** Would qualify on usage but are too quiet to pitch. Shown, not ranked. */
      parked,
      summary: {
        candidates: candidates.length,
        hardBlocked: candidates.filter((c) => c.hardBlock).length,
        parked: parked.length,
      },
    });
  } catch (err) {
    console.error("[upgrade-finder] GET failed:", err);
    return NextResponse.json({ error: "Could not load upgrade candidates" }, { status: 500 });
  }
}

const PITCH_SYSTEM = `
You write the upgrade conversation for one FinovaOS customer.

Ground rules:
- Lead with the constraint they are actually hitting, in their own terms
  ("you have three people sharing two logins"), never with the plan name.
- Name only the one or two features on the higher plan that solve that exact
  constraint. Do not list the plan contents.
- No discount, no free month, no urgency, no deadline. If the upgrade is not
  obviously worth it to them, say so instead of manufacturing a reason.
- Pakistani customers: Roman Urdu mixed with English. Everyone else: plain
  English.

Return exactly this shape and nothing else:

ANGLE: <one sentence — the single reason this customer would say yes>
RISK: <one sentence — the most likely reason they say no>
MESSAGE:
<three to five sentences you could send today>
`;

/** Draft the pitch for one candidate. */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  if (!aiConfigured()) {
    return NextResponse.json({ error: "No AI provider configured" }, { status: 503 });
  }

  try {
    const { companyId } = (await req.json().catch(() => ({}))) as { companyId?: string };
    if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

    const [signal] = await loadCompanySignals([companyId]);
    if (!signal) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const plan = normalizePlanCode(signal.billedPlan || signal.plan);
    const { fit, reasons } = scoreUpgrade(signal);

    const pitch = await askAI(
      PITCH_SYSTEM,
      [
        `Customer: ${signal.name}`,
        `Current plan: ${plan} at $${signal.pricePerMonth}/mo`,
        `Suggested plan: ${NEXT_PLAN[plan] || "none"}`,
        ``,
        `Usage record:`,
        signalLine(signal),
        ``,
        `Fit score: ${fit}/100. What drove it:`,
        ...reasons.map((r) => `- ${r}`),
      ].join("\n"),
      800,
    );

    return NextResponse.json({ companyId, name: signal.name, fit, reasons, pitch });
  } catch (err) {
    console.error("[upgrade-finder] POST failed:", err);
    return NextResponse.json({ error: "Could not draft a pitch" }, { status: 500 });
  }
}
