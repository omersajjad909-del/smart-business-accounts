import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { aiConfigured, askAI } from "@/lib/ai/adminAI";
import { factsToPrompt, loadBusinessFacts } from "@/lib/ai/businessFacts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Revenue Analyst — plain-language questions about the numbers.
 *
 * The facts come from lib/ai/businessFacts.ts, computed in readable code, and
 * the model only reads them. It writes no SQL and touches no customer ledger.
 * The consequence, stated on the page as well as here: a question the fact
 * sheet does not cover gets "that is not in the data I have" rather than an
 * answer. That is the intended behaviour, not a limitation to work around.
 *
 * The whole fact sheet goes into every request rather than being cached in a
 * session. It is a few kilobytes, and a cached fact sheet would keep answering
 * from this morning's numbers after a payment came in this afternoon.
 */

const ANALYST_SYSTEM = `
You are the finance analyst for FinovaOS. You are given a fact sheet computed
from the live database and a question from the founder.

How to answer:
- Answer the question first, in one or two sentences, with the number in it.
- Then show the working: which figures from the fact sheet you used and how.
  The founder should be able to check you against the table.
- If the fact sheet does not contain what is needed, say exactly that and name
  what would have to be measured. Never estimate, never extrapolate, never fill
  a gap with an industry benchmark.
- Read the caveats section and apply it. If revenue is split across currencies
  or the customer base is tiny, say so in the answer rather than quoting a
  percentage as though it were stable.
- With a customer base this small, prefer counts to percentages. "Two of four
  customers" beats "50%" and is harder to misread.
- No preamble. No "Great question". No closing summary of what you just said.
- Four to ten sentences unless the question genuinely needs a list.
`;

/** Questions worth asking, shown on an empty page. */
const SUGGESTIONS = [
  "What is MRR right now and what changed it this month?",
  "Which month was the best for new signups, and did those signups stick?",
  "How much revenue has been refunded, and who refunded it?",
  "Are Pakistani customers worth more or less than international ones?",
  "How long do customers stay before they cancel?",
  "What would happen to MRR if the largest customer left?",
];

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const months = Math.min(24, Math.max(3, Number(req.nextUrl.searchParams.get("months")) || 12));
    const facts = await loadBusinessFacts(months);
    return NextResponse.json({ aiConfigured: aiConfigured(), facts, suggestions: SUGGESTIONS });
  } catch (err) {
    console.error("[revenue-analyst] GET failed:", err);
    return NextResponse.json({ error: "Could not assemble the fact sheet" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  if (!aiConfigured()) {
    return NextResponse.json({ error: "No AI provider configured" }, { status: 503 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      question?: string;
      months?: number;
      history?: Array<{ q: string; a: string }>;
    };

    const question = String(body.question || "").trim();
    if (!question) return NextResponse.json({ error: "Ask a question first" }, { status: 400 });
    if (question.length > 600) {
      return NextResponse.json({ error: "That question is too long — keep it under 600 characters" }, { status: 400 });
    }

    const months = Math.min(24, Math.max(3, Number(body.months) || 12));
    const facts = await loadBusinessFacts(months);

    // Only the last two exchanges are carried. Enough for "and what about
    // last year?" to make sense, short enough that a long session does not
    // slowly push the fact sheet out of the context window.
    const priorTurns = (body.history || []).slice(-2)
      .map((h) => `Earlier question: ${h.q}\nYour earlier answer: ${h.a}`)
      .join("\n\n");

    const answer = await askAI(
      ANALYST_SYSTEM,
      [
        "FACT SHEET",
        "==========",
        factsToPrompt(facts),
        "",
        priorTurns ? `CONVERSATION SO FAR\n===================\n${priorTurns}\n` : "",
        "QUESTION",
        "========",
        question,
      ].join("\n"),
      1400,
    );

    return NextResponse.json({ question, answer, generatedAt: facts.generatedAt });
  } catch (err) {
    console.error("[revenue-analyst] POST failed:", err);
    return NextResponse.json({ error: "The question could not be answered" }, { status: 500 });
  }
}
