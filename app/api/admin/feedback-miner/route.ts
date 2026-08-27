import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { aiConfigured, askJson, clip } from "@/lib/ai/adminAI";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const db = prisma as any;

/**
 * Feedback Miner — reads everything customers have said and groups it into the
 * handful of things they are actually asking for.
 *
 * The sources are already visible one row at a time in /admin/feedback and
 * /admin/tickets. Reading them one row at a time is exactly the problem: the
 * fourth person to ask for the same thing looks identical to the first, so the
 * signal that should drive the roadmap never surfaces.
 *
 * Two design choices worth stating:
 *
 * Evidence is quoted, not summarised. Every theme carries the ids and the exact
 * sentences it was built from, so a roadmap decision can be traced back to the
 * customers who asked for it. A theme the model cannot support with quotes is a
 * theme it invented.
 *
 * Nothing here is stored. A mined roadmap that is three weeks old is worse than
 * no roadmap, because it looks current. The run is explicit and the result lives
 * for as long as the tab is open.
 */

type SourceRow = {
  id: string;
  kind: string;
  text: string;
  createdAt: string;
  rating?: number | null;
  module?: string | null;
};

const DAY = 86400_000;

/** Everything a customer has written, across every table that stores such a thing. */
async function loadCorpus(days: number): Promise<SourceRow[]> {
  const since = new Date(Date.now() - days * DAY);

  const [feedback, tickets, chats, testimonials, leads] = await Promise.all([
    db.feedback.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }).catch(() => []),
    db.supportTicket.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }).catch(() => []),
    db.chatMessage.findMany({
      where: { createdAt: { gte: since }, sender: "customer" },
      orderBy: { createdAt: "desc" },
      take: 300,
    }).catch(() => []),
    db.testimonial.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }).catch(() => []),
    db.lead.findMany({
      where: { createdAt: { gte: since }, message: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 150,
    }).catch(() => []),
  ]);

  const rows: SourceRow[] = [];

  for (const f of feedback) {
    rows.push({
      id: f.id, kind: `feedback:${f.type}`,
      text: `${f.subject}\n${f.message || ""}`.trim(),
      createdAt: new Date(f.createdAt).toISOString(),
      rating: f.rating ?? null, module: f.module ?? null,
    });
  }
  for (const t of tickets) {
    rows.push({
      id: t.id, kind: "ticket",
      text: `${t.subject}\n${t.message || ""}`.trim(),
      createdAt: new Date(t.createdAt).toISOString(),
    });
  }
  for (const m of chats) {
    // One-word chat turns ("ok", "thanks") are most of a transcript and carry
    // nothing. Filtering them here rather than in the prompt keeps the context
    // budget for sentences that say something.
    const text = String(m.text || "").trim();
    if (text.length < 25) continue;
    rows.push({ id: m.id, kind: "chat", text, createdAt: new Date(m.createdAt).toISOString() });
  }
  for (const t of testimonials) {
    rows.push({
      id: t.id, kind: "testimonial", text: t.message || "",
      createdAt: new Date(t.createdAt).toISOString(), rating: t.rating ?? null,
    });
  }
  for (const l of leads) {
    const text = String(l.message || "").trim();
    if (text.length < 25) continue;
    rows.push({ id: l.id, kind: "lead-enquiry", text, createdAt: new Date(l.createdAt).toISOString() });
  }

  return rows.filter((r) => r.text.length > 10);
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const days = Math.min(365, Math.max(7, Number(req.nextUrl.searchParams.get("days")) || 90));
    const corpus = await loadCorpus(days);

    const byKind: Record<string, number> = {};
    for (const r of corpus) {
      const head = r.kind.split(":")[0];
      byKind[head] = (byKind[head] || 0) + 1;
    }

    const ratings = corpus.map((r) => r.rating).filter((r): r is number => typeof r === "number" && r > 0);

    return NextResponse.json({
      aiConfigured: aiConfigured(),
      days,
      corpusSize: corpus.length,
      byKind,
      averageRating: ratings.length
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : null,
      ratingCount: ratings.length,
    });
  } catch (err) {
    console.error("[feedback-miner] GET failed:", err);
    return NextResponse.json({ error: "Could not read the feedback corpus" }, { status: 500 });
  }
}

type Theme = {
  theme: string;
  kind: "feature-request" | "bug" | "confusion" | "praise" | "pricing" | "other";
  mentions: number;
  impact: number;
  effortGuess: "small" | "medium" | "large" | "unknown";
  whatTheyWant: string;
  recommendation: string;
  evidence: Array<{ id: string; quote: string }>;
};

const MINE_SYSTEM = `
You group raw customer messages into themes for a product roadmap.

Rules:
- A theme needs at least two separate messages saying substantially the same
  thing, EXCEPT where a single message describes data loss, an incorrect
  financial figure, or a customer being unable to work — those stand alone.
- Never merge two different requests to make a bigger number. Two people asking
  for different reports are two themes, not one "better reporting" theme.
- Every theme must carry real evidence: the id of each message and a short
  verbatim quote from it. Never write a quote that is not in the source text.
- impact is 0-100 and means: how much would fixing this change the business.
  Weigh a paying customer being blocked far above a nice-to-have.
- effortGuess is your honest guess at build size, or "unknown" if you cannot
  tell from the message. Do not pretend to know.
- recommendation is one sentence, and "do nothing" is a valid recommendation.
- If the messages do not contain enough to build themes from, return an empty
  array. Do not manufacture a roadmap out of four support questions.

Return a JSON array of theme objects with keys:
theme, kind, mentions, impact, effortGuess, whatTheyWant, recommendation,
evidence (array of {id, quote}).
Sort by impact, highest first. Return at most 12 themes.
`;

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  if (!aiConfigured()) {
    return NextResponse.json({ error: "No AI provider configured" }, { status: 503 });
  }

  try {
    const { days = 90 } = (await req.json().catch(() => ({}))) as { days?: number };
    const window = Math.min(365, Math.max(7, Number(days) || 90));
    const corpus = await loadCorpus(window);

    if (corpus.length < 3) {
      return NextResponse.json({
        themes: [],
        corpusSize: corpus.length,
        note: "Not enough customer messages to find a pattern in. This needs a handful of real messages before it can say anything useful.",
      });
    }

    // A hard cap on what goes into one request. 180 messages is comfortably
    // inside the context window and is far more than this product currently
    // produces in a quarter; beyond that the oldest are dropped, which is the
    // right end to drop from.
    const batch = corpus.slice(0, 180);
    const payload = batch
      .map((r) => `[${r.id}] (${r.kind}${r.rating ? `, ${r.rating}★` : ""}) ${clip(r.text, 600)}`)
      .join("\n\n");

    const themes = await askJson<Theme[]>(MINE_SYSTEM, payload, 3000);

    if (!Array.isArray(themes)) {
      return NextResponse.json({ error: "The model did not return a usable result. Try again." }, { status: 502 });
    }

    // Drop evidence pointing at ids that were not in the batch. That is the one
    // failure mode that would make this page lie convincingly.
    const known = new Set(batch.map((r) => r.id));
    const cleaned = themes.map((t) => ({
      ...t,
      evidence: (t.evidence || []).filter((e) => e && known.has(e.id)),
    })).filter((t) => t.theme);

    return NextResponse.json({
      themes: cleaned,
      corpusSize: corpus.length,
      analysedCount: batch.length,
      days: window,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[feedback-miner] POST failed:", err);
    return NextResponse.json({ error: "The analysis could not be completed" }, { status: 500 });
  }
}
