import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { aiConfigured, askAI } from "@/lib/ai/adminAI";
import { loadCompanySignals, signalLine, type CompanySignal } from "@/lib/ai/signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Churn Radar — which paying customers are going quiet, and what to say to them.
 *
 * Split deliberately in two:
 *
 *   GET  scores every customer with the rules below. No model call, so the list
 *        is instant and free and shows the same numbers every time it loads.
 *   POST drafts a retention message for one customer. That is the only part
 *        that needs judgement, so that is the only part that costs a request.
 *
 * The scoring is a plain rule set rather than a model on purpose. A churn score
 * is a number the founder will act on repeatedly; it has to be reproducible and
 * it has to be explainable line by line, and a model gives neither. What the
 * model is good at — writing the message that fits this particular customer —
 * is what it is asked for.
 */

type Reason = { text: string; weight: number };

type ScoredCompany = CompanySignal & {
  risk: number;
  band: "critical" | "watch" | "healthy";
  reasons: string[];
};

/**
 * Weights are the deliberate part. They encode that a customer who has stopped
 * logging in is a worse sign than a customer whose invoice count dipped — the
 * dip could be a slow month in their business, the silence could not.
 */
function scoreChurn(s: CompanySignal): { risk: number; reasons: string[] } {
  const reasons: Reason[] = [];

  if (s.daysSinceLogin === null) {
    // A signup that never once logged in is not churning, it never landed. Only
    // count it after a few days, or every fresh signup tops the list on day one.
    if (s.ageDays >= 3) reasons.push({ text: `Never logged in (${s.ageDays} days since signup)`, weight: 40 });
  } else if (s.daysSinceLogin >= 30) {
    reasons.push({ text: `No login for ${s.daysSinceLogin} days`, weight: 40 });
  } else if (s.daysSinceLogin >= 21) {
    reasons.push({ text: `No login for ${s.daysSinceLogin} days`, weight: 30 });
  } else if (s.daysSinceLogin >= 14) {
    reasons.push({ text: `No login for ${s.daysSinceLogin} days`, weight: 20 });
  } else if (s.daysSinceLogin >= 7) {
    reasons.push({ text: `Quiet for ${s.daysSinceLogin} days`, weight: 10 });
  }

  if (s.invoicesPrev30 > 0 && s.invoicesLast30 === 0) {
    reasons.push({ text: `Invoicing stopped — ${s.invoicesPrev30} last month, none this month`, weight: 30 });
  } else if (s.invoiceTrendPct !== null && s.invoiceTrendPct <= -60) {
    reasons.push({ text: `Invoices down ${Math.abs(s.invoiceTrendPct)}% month on month`, weight: 25 });
  } else if (s.invoiceTrendPct !== null && s.invoiceTrendPct <= -30) {
    reasons.push({ text: `Invoices down ${Math.abs(s.invoiceTrendPct)}%`, weight: 14 });
  }

  if (s.failedPayments > 0) {
    reasons.push({ text: `${s.failedPayments} failed payment${s.failedPayments > 1 ? "s" : ""} on file`, weight: 22 });
  }

  const billing = (s.billingStatus || s.subscriptionStatus || "").toUpperCase();
  if (billing === "PAST_DUE") reasons.push({ text: "Subscription past due", weight: 25 });
  if (billing === "SUSPENDED") reasons.push({ text: "Subscription suspended", weight: 30 });
  if (billing === "CANCELLED") reasons.push({ text: "Subscription already cancelled", weight: 35 });

  if (!s.setupDone && s.ageDays >= 7) {
    reasons.push({ text: `Setup never finished (${s.ageDays} days in)`, weight: 18 });
  }

  if (s.loginsLast30 === 0 && s.daysSinceLogin !== null && s.ageDays >= 14) {
    reasons.push({ text: "Zero logins in the last 30 days", weight: 15 });
  }

  // A customer paying for seats nobody uses is a renewal conversation waiting
  // to happen, even while all the other numbers look fine.
  if (s.userCount >= 3 && s.loginsLast30 <= 1 && s.ageDays >= 30) {
    reasons.push({ text: `${s.userCount} seats, ${s.loginsLast30} login(s) in 30 days`, weight: 12 });
  }

  const risk = Math.min(100, reasons.reduce((sum, r) => sum + r.weight, 0));
  reasons.sort((a, b) => b.weight - a.weight);
  return { risk, reasons: reasons.map((r) => r.text) };
}

function band(risk: number): ScoredCompany["band"] {
  if (risk >= 70) return "critical";
  if (risk >= 35) return "watch";
  return "healthy";
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const signals = await loadCompanySignals();
    const scored: ScoredCompany[] = signals
      .map((s) => {
        const { risk, reasons } = scoreChurn(s);
        return { ...s, risk, band: band(risk), reasons };
      })
      .sort((a, b) => b.risk - a.risk);

    const atRisk = scored.filter((c) => c.band !== "healthy");
    const mrrAtRisk = atRisk.reduce((sum, c) => sum + (c.pricePerMonth || 0), 0);

    return NextResponse.json({
      aiConfigured: aiConfigured(),
      generatedAt: new Date().toISOString(),
      companies: scored,
      summary: {
        total: scored.length,
        critical: scored.filter((c) => c.band === "critical").length,
        watch: scored.filter((c) => c.band === "watch").length,
        healthy: scored.filter((c) => c.band === "healthy").length,
        mrrAtRisk: Math.round(mrrAtRisk),
      },
    });
  } catch (err) {
    console.error("[churn-radar] GET failed:", err);
    return NextResponse.json({ error: "Could not load customer signals" }, { status: 500 });
  }
}

const DRAFT_SYSTEM = `
You write a short retention message from the founder of FinovaOS to one customer
who has gone quiet.

What makes these work:
- Two to four sentences. It is a personal note, not a campaign email.
- Open with the specific thing you noticed, in their terms ("you have not raised
  an invoice since..."), never with "we noticed your engagement has declined".
- Ask one question they can answer in one line. Offer to get on a call or
  WhatsApp. Do not offer a discount, a free month, or a trial extension.
- No subject-line cliches, no "Just checking in!", no exclamation marks.
- If the customer is in Pakistan, write in Roman Urdu mixed with English, the
  way traders there actually message. Otherwise write in plain English.

Return exactly this shape, nothing else:

SUBJECT: <one line>
BODY:
<the message>

WHY: <one sentence to the founder on what this customer most likely needs>
`;

/** Draft a retention note for one customer. */
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

    const { risk, reasons } = scoreChurn(signal);

    const draft = await askAI(
      DRAFT_SYSTEM,
      [
        `Customer usage record:`,
        signalLine(signal),
        ``,
        `Churn score: ${risk}/100`,
        `Why the score is what it is:`,
        ...reasons.map((r) => `- ${r}`),
      ].join("\n"),
      700,
    );

    return NextResponse.json({ companyId, name: signal.name, risk, reasons, draft });
  } catch (err) {
    console.error("[churn-radar] POST failed:", err);
    return NextResponse.json({ error: "Could not draft a message" }, { status: 500 });
  }
}
