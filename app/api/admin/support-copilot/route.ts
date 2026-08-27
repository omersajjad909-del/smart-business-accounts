import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { aiConfigured, askAI, askJson, clip } from "@/lib/ai/adminAI";
import { brandContext } from "@/lib/ai/productBrief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const db = prisma as any;

/**
 * Support Copilot — one queue for everything a customer is waiting on, with a
 * category, an urgency and a drafted reply attached.
 *
 * The reason this page exists is that support arrives in three places that do
 * not know about each other: /admin/tickets, the live chat inbox at /admin/chat,
 * and the complaint and bug rows in /admin/feedback. Whichever one is open is
 * the one that gets answered, and the other two quietly age. This reads all
 * three into a single list ordered by how long someone has been waiting.
 *
 * Triage is one model call for the whole queue rather than one per item — the
 * classification is cheap and comparative ("which of these is most urgent" is a
 * better question than twenty separate "how urgent is this"). Reply drafting is
 * per item, because that is where the cost is worth paying.
 */

type Source = "ticket" | "chat" | "feedback";

type InboxItem = {
  id: string;
  source: Source;
  subject: string;
  message: string;
  from: string;
  companyName: string | null;
  status: string;
  priority: string | null;
  createdAt: string;
  /** Whole hours the customer has been waiting. */
  waitingHours: number;
  /** Only set on chats: how many messages have gone back and forth. */
  messageCount?: number;
};

const HOUR = 3600_000;

function hoursSince(d: Date | string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / HOUR));
}

/** Everything currently unanswered, newest wait first. */
async function loadInbox(): Promise<InboxItem[]> {
  const [tickets, chats, feedback] = await Promise.all([
    db.supportTicket.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { createdAt: "asc" },
      take: 100,
    }).catch(() => []),
    db.chatConversation.findMany({
      where: { status: { in: ["waiting", "agent"] } },
      orderBy: { updatedAt: "asc" },
      take: 60,
      include: { messages: { orderBy: { createdAt: "asc" }, take: 30 } },
    }).catch(() => []),
    db.feedback.findMany({
      where: { type: { in: ["complaint", "bug"] }, status: { in: ["open", "in_review"] } },
      orderBy: { createdAt: "asc" },
      take: 60,
    }).catch(() => []),
  ]);

  // Company names are looked up once for the whole batch. Doing it per row was
  // one query per open ticket on a page whose entire point is to be fast.
  const companyIds = [
    ...tickets.map((t: any) => t.companyId),
    ...chats.map((c: any) => c.companyId),
    ...feedback.map((f: any) => f.companyId),
  ].filter(Boolean);

  const companies = companyIds.length
    ? await db.company.findMany({
        where: { id: { in: [...new Set(companyIds)] } },
        select: { id: true, name: true },
      }).catch(() => [])
    : [];
  const nameOf = new Map<string, string>(companies.map((c: any) => [c.id, c.name]));

  const items: InboxItem[] = [];

  for (const t of tickets) {
    items.push({
      id: t.id,
      source: "ticket",
      subject: t.subject,
      message: t.message || "",
      from: t.userId ? `User ${String(t.userId).slice(0, 8)}` : "Unknown",
      companyName: t.companyId ? nameOf.get(t.companyId) ?? null : null,
      status: t.status,
      priority: t.priority ?? null,
      createdAt: new Date(t.createdAt).toISOString(),
      waitingHours: hoursSince(t.createdAt),
    });
  }

  for (const c of chats) {
    const msgs: any[] = c.messages || [];
    // The last thing the customer said is what needs answering. A conversation
    // whose last message is ours is waiting on them, not on us.
    const lastCustomer = [...msgs].reverse().find((m) => m.sender === "customer");
    if (!lastCustomer) continue;
    const transcript = msgs
      .slice(-10)
      .map((m) => `${m.sender}: ${m.text}`)
      .join("\n");
    items.push({
      id: c.id,
      source: "chat",
      subject: `Live chat — ${c.customerName || "visitor"}`,
      message: transcript,
      from: c.customerEmail || c.customerName || "visitor",
      companyName: c.companyId ? nameOf.get(c.companyId) ?? null : null,
      status: c.status,
      priority: null,
      createdAt: new Date(lastCustomer.createdAt).toISOString(),
      waitingHours: hoursSince(lastCustomer.createdAt),
      messageCount: msgs.length,
    });
  }

  for (const f of feedback) {
    items.push({
      id: f.id,
      source: "feedback",
      subject: f.subject,
      message: f.message || "",
      from: f.email || f.name || "anonymous",
      companyName: f.companyId ? nameOf.get(f.companyId) ?? null : null,
      status: f.status,
      priority: f.priority ?? null,
      createdAt: new Date(f.createdAt).toISOString(),
      waitingHours: hoursSince(f.createdAt),
    });
  }

  return items.sort((a, b) => b.waitingHours - a.waitingHours);
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const items = await loadInbox();
    return NextResponse.json({
      aiConfigured: aiConfigured(),
      generatedAt: new Date().toISOString(),
      items,
      summary: {
        total: items.length,
        tickets: items.filter((i) => i.source === "ticket").length,
        chats: items.filter((i) => i.source === "chat").length,
        feedback: items.filter((i) => i.source === "feedback").length,
        oldestHours: items[0]?.waitingHours ?? 0,
        over24h: items.filter((i) => i.waitingHours >= 24).length,
      },
    });
  } catch (err) {
    console.error("[support-copilot] GET failed:", err);
    return NextResponse.json({ error: "Could not load the support queue" }, { status: 500 });
  }
}

/* ── triage ──────────────────────────────────────────────────────────────── */

type Triage = {
  id: string;
  category: string;
  urgency: "low" | "normal" | "high" | "urgent";
  summary: string;
  action: string;
};

const TRIAGE_SYSTEM = `
You triage a support queue for FinovaOS.

For every item you are given, return one object with:
  id       the id exactly as given
  category one of: bug, how-to, billing, data-import, feature-request,
           account-access, performance, sales-question, spam, unclear
  urgency  one of: low, normal, high, urgent
  summary  at most 12 words, what they actually need
  action   at most 12 words, the single next step for the operator

Urgency means business impact, not tone. A customer who cannot log in or whose
data looks wrong is urgent however politely they asked. A feature request is
low however angrily it was written. Something already waiting more than 48
hours moves up one level.

Return a JSON array of these objects, one per input item, and nothing else.
`;

async function triageQueue(items: InboxItem[]): Promise<Triage[]> {
  const batch = items.slice(0, 25);
  if (!batch.length) return [];

  const payload = batch
    .map((i) => [
      `--- id: ${i.id}`,
      `source: ${i.source}`,
      `waiting: ${i.waitingHours}h`,
      `subject: ${i.subject}`,
      `message: ${clip(i.message, 900)}`,
    ].join("\n"))
    .join("\n\n");

  const result = await askJson<Triage[]>(TRIAGE_SYSTEM, payload, 2200);
  if (!Array.isArray(result)) return [];

  // The model is asked for the ids it was given; anything else is a
  // hallucinated row and would attach a category to the wrong customer.
  const valid = new Set(batch.map((i) => i.id));
  return result.filter((r) => r && valid.has(r.id));
}

const REPLY_SYSTEM = `
${brandContext()}

You draft the reply one FinovaOS customer is waiting for. The founder will read
it, edit it, and send it — you are writing his first draft, not talking to the
customer yourself.

How to write it:
- Answer the question in the first sentence. No "Thank you for reaching out".
- If the answer is a series of steps in the app, give the steps and the screen
  names. If you do not know the exact screen, say which part of the app it is in
  rather than inventing a menu path.
- If it is a bug, say what you will do and by when in general terms, and ask for
  the one detail that would let you reproduce it.
- If you genuinely cannot answer from what you were given, say exactly what you
  would need to know. Do not guess an answer to a technical question.
- Match the language the customer wrote in, including Roman Urdu.
- Four to eight sentences. No signature block, no subject line.

After the reply, on its own line, add:
CONFIDENCE: high | medium | low — and half a sentence on what you were unsure of.
`;

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  if (!aiConfigured()) {
    return NextResponse.json({ error: "No AI provider configured" }, { status: 503 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { mode?: string; id?: string };

    if (body.mode === "triage") {
      const items = await loadInbox();
      const triage = await triageQueue(items);
      return NextResponse.json({ triage, triagedCount: triage.length, queueSize: items.length });
    }

    if (body.mode === "reply") {
      if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
      const items = await loadInbox();
      const item = items.find((i) => i.id === body.id);
      if (!item) return NextResponse.json({ error: "That item is no longer in the queue" }, { status: 404 });

      const reply = await askAI(
        REPLY_SYSTEM,
        [
          `Source: ${item.source}`,
          `From: ${item.from}${item.companyName ? ` at ${item.companyName}` : ""}`,
          `Waiting: ${item.waitingHours} hours`,
          `Subject: ${item.subject}`,
          ``,
          item.source === "chat" ? "Conversation so far:" : "Message:",
          clip(item.message, 3000),
        ].join("\n"),
        900,
      );

      return NextResponse.json({ id: item.id, reply });
    }

    return NextResponse.json({ error: "mode must be 'triage' or 'reply'" }, { status: 400 });
  } catch (err) {
    console.error("[support-copilot] POST failed:", err);
    return NextResponse.json({ error: "The request could not be completed" }, { status: 500 });
  }
}
