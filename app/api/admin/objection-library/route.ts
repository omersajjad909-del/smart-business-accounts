import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { aiConfigured, askAI, askJson, clip } from "@/lib/ai/adminAI";
import { brandContext, checkForbiddenClaims } from "@/lib/ai/productBrief";
import { deleteAiAsset, listAiAssets, saveAiAsset } from "@/lib/ai/aiStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const db = prisma as any;
const DAY = 86400_000;

/**
 * Objection Library — what people say no to, and the best answer found so far.
 *
 * The point is accumulation. The same six objections come up in every sales
 * conversation, and each one gets answered slightly worse than the last time
 * because the good answer was improvised on a call in March and never written
 * down. This stores the answer, so the fourth time somebody says "we already
 * have an accountant" the reply is the best one, not the newest one.
 *
 * Three modes:
 *   mine   reads chat transcripts, enquiry messages and complaints, and pulls
 *          out the objections that were actually raised, with quotes. Nothing
 *          is saved — the operator picks what is real.
 *   answer drafts or improves the answer to one objection.
 *   brief  given a prospect, produces the pre-call sheet: which objections this
 *          particular buyer is likely to raise, and the stored answer to each.
 *
 * Every generated answer is run past checkForbiddenClaims before it is returned.
 * A sales answer is the single most likely place for a model to reach for a free
 * trial that does not exist, and the one place that promise would be made
 * directly to a buyer.
 */

type Objection = {
  objection: string;
  category: string;
  answer: string;
  /** Where it was heard, when it came from real messages. */
  evidence: Array<{ id: string; quote: string }>;
  /** Claims the checker flagged in the stored answer, if any. */
  flags: string[];
  updatedAt: string;
};

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const stored = await listAiAssets<Objection>("objection", 200);
    const categories = [...new Set(stored.map((s) => s.data?.category).filter(Boolean))] as string[];
    return NextResponse.json({
      aiConfigured: aiConfigured(),
      objections: stored.map((s) => ({ id: s.id, key: s.key, title: s.title, createdAt: s.createdAt, data: s.data })),
      categories,
    });
  } catch (err) {
    console.error("[objection-library] GET failed:", err);
    return NextResponse.json({ error: "Could not load the library" }, { status: 500 });
  }
}

/** Everything a prospect has said to us, for mining. */
async function loadSalesConversations(days: number) {
  const since = new Date(Date.now() - days * DAY);

  const [chats, leads, feedback, waitlist] = await Promise.all([
    db.chatMessage.findMany({
      where: { createdAt: { gte: since }, sender: "customer" },
      orderBy: { createdAt: "desc" },
      take: 400,
    }).catch(() => []),
    db.lead.findMany({
      where: { createdAt: { gte: since }, message: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }).catch(() => []),
    db.feedback.findMany({
      where: { createdAt: { gte: since }, type: { in: ["complaint", "suggestion", "general"] } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }).catch(() => []),
    db.businessWaitlist.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }).catch(() => []),
  ]);

  const rows: Array<{ id: string; kind: string; text: string }> = [];
  for (const c of chats) {
    const t = String(c.text || "").trim();
    if (t.length >= 25) rows.push({ id: c.id, kind: "chat", text: t });
  }
  for (const l of leads) {
    const t = String(l.message || "").trim();
    if (t.length >= 20) rows.push({ id: l.id, kind: `enquiry (${l.status})`, text: t });
  }
  for (const f of feedback) {
    rows.push({ id: f.id, kind: `feedback:${f.type}`, text: `${f.subject}\n${f.message || ""}`.trim() });
  }
  // The waitlist carries no free text — just an email and a business type. That
  // is still an objection, and a common one: somebody wanted FinovaOS and their
  // trade was not supported. Phrasing it as the sentence they would have said
  // lets it be mined alongside everything else.
  for (const w of waitlist) {
    rows.push({
      id: w.id,
      kind: "waitlist",
      text: `Joined the waitlist because FinovaOS does not yet support their business type: ${w.businessType}.`,
    });
  }
  return rows;
}

const MINE_SYSTEM = `
You read messages from prospects and customers and pull out the SALES
OBJECTIONS in them — the reasons someone gives for not buying, not switching,
or hesitating.

An objection is a reason not to proceed: price, an existing system, trust, the
effort of moving data, a missing feature, a doubt about support, a worry about
their data. A support question is not an objection. A feature request is not an
objection unless it is given as the reason for not buying.

For each distinct objection return:
  objection  how a buyer would phrase it, one sentence, in their voice
  category   one of: price, switching-cost, existing-solution, trust,
             missing-feature, timing, authority, data-security, support, other
  count      how many separate messages raised it
  evidence   array of { id, quote } — the id given to you and a verbatim quote

Rules:
- Never invent a quote. If you cannot quote it, do not report it.
- Do not report the same objection twice under different wording.
- If the messages contain no real objections, return an empty array. Sales
  conversations that went well contain none, and that is worth knowing.

Return a JSON array.
`;

const ANSWER_SYSTEM = `
${brandContext()}

You write the answer to one sales objection, for the founder of FinovaOS to use
on a call or in a WhatsApp message.

What a good answer does:
- Agrees with the true part of the objection first. Someone who says "switching
  is a lot of work" is right, and pretending otherwise loses the room.
- Answers with a specific fact about FinovaOS, not a reassurance. "The import
  wizard reads your Tally export and shows you every row before it writes
  anything" beats "migration is easy".
- Ends by handing control back — a question, or an offer to show them.
- Is four to seven sentences. It is spoken, not written.
- Never offers a discount, a free trial, or a free month. Never invents a
  feature, an integration, a customer, or a statistic.
- Where the honest answer is "we do not do that yet", say so and say what
  happens instead. An objection you cannot answer is worth knowing about.

Return exactly:

ANSWER:
<the answer>

AVOID: <one sentence — what NOT to say to this objection and why>
`;

const BRIEF_SYSTEM = `
${brandContext()}

You prepare a founder for one sales conversation.

You are given a description of the prospect and the objection library — the
objections heard before and the answers already worked out.

Return a JSON object:
  likelyObjections  array of { objection, why, answer } — at most five, ordered
                    by how likely this particular prospect is to raise them.
                    Where the library already has an answer, use it, adapted to
                    this prospect. Where it does not, write one.
  openWith          two or three sentences to open the conversation with, based
                    on what this prospect appears to care about.
  askThem           three questions worth asking them, that would change what
                    you offer.
  walkAwayIf        one sentence: the signal that this is not a fit, so the
                    founder stops rather than discounts.

Never invent a fact about the prospect that was not given to you.
`;

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const body = (await req.json().catch(() => ({}))) as {
    mode?: string;
    days?: number;
    objection?: string;
    category?: string;
    answer?: string;
    evidence?: Array<{ id: string; quote: string }>;
    prospect?: string;
  };

  // Saving needs no model, so it stays available when nothing is configured —
  // an objection written by hand is the most valuable kind.
  if (body.mode === "save") {
    const objection = String(body.objection || "").trim();
    const answer = String(body.answer || "").trim();
    if (!objection) return NextResponse.json({ error: "The objection text is required" }, { status: 400 });

    const flags = answer ? checkForbiddenClaims(answer) : [];
    const key = objection.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);

    const saved = await saveAiAsset<Objection>({
      kind: "objection",
      key,
      title: objection.slice(0, 200),
      data: {
        objection,
        category: String(body.category || "other"),
        answer,
        evidence: Array.isArray(body.evidence) ? body.evidence.slice(0, 8) : [],
        flags,
        updatedAt: new Date().toISOString(),
      },
      admin: { id: admin.id, email: admin.email },
    });
    return NextResponse.json({ id: saved.id, flags });
  }

  if (!aiConfigured()) {
    return NextResponse.json({ error: "No AI provider configured" }, { status: 503 });
  }

  try {
    if (body.mode === "mine") {
      const days = Math.min(365, Math.max(7, Number(body.days) || 180));
      const rows = await loadSalesConversations(days);
      if (rows.length < 3) {
        return NextResponse.json({
          found: [],
          scanned: rows.length,
          note: "Not enough prospect messages to mine. Objections mostly arrive on calls and WhatsApp — add those by hand.",
        });
      }

      const payload = rows.slice(0, 160)
        .map((r) => `[${r.id}] (${r.kind}) ${clip(r.text, 500)}`)
        .join("\n\n");

      const found = await askJson<Array<{
        objection: string; category: string; count: number;
        evidence: Array<{ id: string; quote: string }>;
      }>>(MINE_SYSTEM, payload, 2600);

      if (!Array.isArray(found)) {
        return NextResponse.json({ error: "The model did not return a usable result. Try again." }, { status: 502 });
      }

      const known = new Set(rows.map((r) => r.id));
      return NextResponse.json({
        found: found.map((f) => ({ ...f, evidence: (f.evidence || []).filter((e) => e && known.has(e.id)) })),
        scanned: Math.min(rows.length, 160),
        total: rows.length,
      });
    }

    if (body.mode === "answer") {
      const objection = String(body.objection || "").trim();
      if (!objection) return NextResponse.json({ error: "The objection text is required" }, { status: 400 });

      const existing = String(body.answer || "").trim();
      const drafted = await askAI(
        ANSWER_SYSTEM,
        [
          `Objection: ${objection}`,
          body.category ? `Category: ${body.category}` : "",
          existing ? `\nThe current answer, which you are improving:\n${existing}` : "",
        ].filter(Boolean).join("\n"),
        800,
      );

      return NextResponse.json({ answer: drafted, flags: checkForbiddenClaims(drafted) });
    }

    if (body.mode === "brief") {
      const prospect = String(body.prospect || "").trim();
      if (!prospect) return NextResponse.json({ error: "Describe the prospect first" }, { status: 400 });

      const library = await listAiAssets<Objection>("objection", 100);
      const libraryText = library.length
        ? library.map((o) => `- ${o.data?.objection}\n  category: ${o.data?.category}\n  answer: ${clip(o.data?.answer || "(none yet)", 700)}`).join("\n\n")
        : "(the library is empty)";

      const brief = await askJson<{
        likelyObjections: Array<{ objection: string; why: string; answer: string }>;
        openWith: string;
        askThem: string[];
        walkAwayIf: string;
      }>(
        BRIEF_SYSTEM,
        [`PROSPECT\n========\n${clip(prospect, 2000)}`, ``, `OBJECTION LIBRARY\n=================\n${libraryText}`].join("\n"),
        2400,
      );

      if (!brief) {
        return NextResponse.json({ error: "The brief could not be produced. Try again." }, { status: 502 });
      }

      const flags = [
        ...checkForbiddenClaims(brief.openWith || ""),
        ...(brief.likelyObjections || []).flatMap((o) => checkForbiddenClaims(o.answer || "")),
      ];

      return NextResponse.json({ brief, flags: [...new Set(flags)] });
    }

    return NextResponse.json({ error: "mode must be mine, answer, save or brief" }, { status: 400 });
  } catch (err) {
    console.error("[objection-library] POST failed:", err);
    return NextResponse.json({ error: "The request could not be completed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  return NextResponse.json({ removed: await deleteAiAsset(id) });
}
