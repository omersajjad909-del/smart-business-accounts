import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { aiConfigured, askAI } from "@/lib/ai/adminAI";
import { brandContext } from "@/lib/ai/productBrief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const db = prisma as any;
const DAY = 86400_000;
const HOUR = 3600_000;

/**
 * Demo Watchdog — who reached the door and did not come in.
 *
 * Three separate leaks, none of which shows up anywhere else in the console:
 *
 *   1. A demo was booked and nobody turned up, or turned up and left in four
 *      minutes.
 *   2. Somebody opened a demo sandbox and did something real in it — raised an
 *      invoice, built a chart of accounts — and then never signed up. That is
 *      the warmest lead this product produces and today it evaporates silently.
 *   3. Somebody started signing up, got the OTP email, and never entered the
 *      code. PendingSignup rows expire and are swept; nobody ever sees them.
 *
 * The page ranks them by how far they got, because how far someone got is the
 * best available proxy for how interested they were.
 */

type DemoLead = {
  id: string;
  kind: "booking" | "sandbox" | "abandoned-signup";
  name: string;
  email: string | null;
  company: string | null;
  businessType: string | null;
  createdAt: string;
  /** What stage they reached, in plain words. */
  stage: string;
  /** How far in they got, 0-100. Drives the ordering. */
  depth: number;
  /** Concrete things they did, for the follow-up to refer to. */
  activity: string[];
  /** Whether they later became a real customer. */
  converted: boolean;
};

/** Minutes a demo session lasted, or null when it never started. */
function sessionMinutes(startedAt: Date | null, endedAt: Date | null): number | null {
  if (!startedAt) return null;
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  return Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 60000));
}

async function loadLeads(days: number): Promise<DemoLead[]> {
  const since = new Date(Date.now() - days * DAY);

  const [bookings, sandboxes, pending, signedUpUsers] = await Promise.all([
    db.demoBooking.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }).catch(() => []),
    db.company.findMany({
      where: { isDemo: true, createdAt: { gte: since } },
      select: { id: true, name: true, businessType: true, createdAt: true, demoExpiresAt: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }).catch(() => []),
    db.pendingSignup.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }).catch(() => []),
    // Used to mark a lead as converted. Emails are compared lower-cased because
    // signup and demo booking do not normalise them the same way.
    db.user.findMany({
      where: { createdAt: { gte: since } },
      select: { email: true },
      take: 1000,
    }).catch(() => []),
  ]);

  const converted = new Set<string>(
    signedUpUsers.map((u: any) => String(u.email || "").toLowerCase()).filter(Boolean),
  );

  // What each demo sandbox actually contains. One grouped query rather than one
  // per sandbox — the page loads a hundred of them on a busy month.
  const sandboxIds: string[] = sandboxes.map((s: any) => s.id);
  const scope = { companyId: { in: sandboxIds } };
  const [inv, vou, acc, items] = sandboxIds.length
    ? await Promise.all([
        db.salesInvoice.groupBy({ by: ["companyId"], where: scope, _count: { _all: true } }).catch(() => []),
        db.voucher.groupBy({ by: ["companyId"], where: scope, _count: { _all: true } }).catch(() => []),
        db.account.groupBy({ by: ["companyId"], where: scope, _count: { _all: true } }).catch(() => []),
        db.itemNew.groupBy({ by: ["companyId"], where: scope, _count: { _all: true } }).catch(() => []),
      ])
    : [[], [], [], []];

  const count = (rows: any[], id: string) =>
    rows.find((r: any) => r.companyId === id)?._count?._all ?? 0;

  const leads: DemoLead[] = [];

  for (const b of bookings) {
    const mins = sessionMinutes(b.startedAt, b.endedAt);
    const activity: string[] = [];
    let stage: string;
    let depth: number;

    if (!b.startedAt) {
      const past = new Date(b.slotStart).getTime() < Date.now();
      stage = past ? "Booked, never showed up" : "Booked, slot still ahead";
      depth = past ? 25 : 35;
    } else if (mins !== null && mins < 3) {
      stage = `Opened the demo, left after ${mins} minute${mins === 1 ? "" : "s"}`;
      depth = 40;
      activity.push(`Session lasted ${mins} minute${mins === 1 ? "" : "s"}`);
    } else {
      stage = `Ran the demo for ${mins} minutes`;
      depth = mins !== null && mins >= 10 ? 75 : 60;
      activity.push(`Session lasted ${mins} minutes`);
    }

    leads.push({
      id: b.id,
      kind: "booking",
      name: b.name,
      email: b.email || null,
      company: b.company || null,
      businessType: b.businessType || null,
      createdAt: new Date(b.createdAt).toISOString(),
      stage,
      depth,
      activity,
      converted: converted.has(String(b.email || "").toLowerCase()),
    });
  }

  for (const s of sandboxes) {
    const invoices = count(inv, s.id);
    const vouchers = count(vou, s.id);
    const accounts = count(acc, s.id);
    const stock = count(items, s.id);

    const activity: string[] = [];
    if (invoices) activity.push(`Raised ${invoices} invoice${invoices === 1 ? "" : "s"}`);
    if (vouchers) activity.push(`Posted ${vouchers} voucher${vouchers === 1 ? "" : "s"}`);
    if (accounts) activity.push(`Created ${accounts} ledger account${accounts === 1 ? "" : "s"}`);
    if (stock) activity.push(`Added ${stock} stock item${stock === 1 ? "" : "s"}`);

    // The sandbox arrives seeded with a golden dataset, so a visitor who only
    // looked around has counts too. Depth is driven by whether they wrote
    // anything themselves, which is what the invoice and voucher counts tell us.
    const wrote = invoices + vouchers;
    leads.push({
      id: s.id,
      kind: "sandbox",
      name: s.name,
      email: null,
      company: s.name,
      businessType: s.businessType || null,
      createdAt: new Date(s.createdAt).toISOString(),
      stage: wrote > 0
        ? `Used the sandbox properly — ${wrote} document${wrote === 1 ? "" : "s"} created`
        : "Opened a sandbox, only looked around",
      depth: wrote >= 5 ? 85 : wrote > 0 ? 65 : 30,
      activity,
      converted: false,
    });
  }

  for (const p of pending) {
    const ageHours = Math.floor((Date.now() - new Date(p.createdAt).getTime()) / HOUR);
    // Inside the first hour they may simply still be reading the email. Only
    // count it as abandoned once the code has had time to be used.
    if (ageHours < 1) continue;
    const email = String(p.email || "").toLowerCase();
    if (converted.has(email)) continue;

    let name: string | null = null;
    let company: string | null = null;
    try {
      const payload = JSON.parse(p.payload || "{}");
      name = payload.name || payload.fullName || null;
      company = payload.companyName || payload.company || null;
    } catch {
      // The payload shape has changed over time; a row we cannot read is still
      // a lead, it just has less to say.
    }

    leads.push({
      id: p.id,
      kind: "abandoned-signup",
      name: name || email,
      email: p.email,
      company,
      businessType: null,
      createdAt: new Date(p.createdAt).toISOString(),
      stage: p.attempts > 0
        ? `Entered the wrong code ${p.attempts} time${p.attempts === 1 ? "" : "s"}, gave up`
        : "Got the verification code, never entered it",
      // Somebody who typed a wrong code was genuinely trying. That is a warmer
      // lead than someone who never opened the email, and quite possibly a bug
      // on our side rather than a lost sale.
      depth: p.attempts > 0 ? 80 : 55,
      activity: [`Signup started ${ageHours}h ago`],
      converted: false,
    });
  }

  return leads.sort((a, b) => b.depth - a.depth);
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const days = Math.min(180, Math.max(7, Number(req.nextUrl.searchParams.get("days")) || 30));
    const leads = await loadLeads(days);
    const open = leads.filter((l) => !l.converted);

    return NextResponse.json({
      aiConfigured: aiConfigured(),
      days,
      leads,
      summary: {
        total: leads.length,
        converted: leads.filter((l) => l.converted).length,
        bookings: leads.filter((l) => l.kind === "booking").length,
        sandboxes: leads.filter((l) => l.kind === "sandbox").length,
        abandoned: leads.filter((l) => l.kind === "abandoned-signup").length,
        // The headline number: people who did real work in the product and are
        // not customers.
        hotOpen: open.filter((l) => l.depth >= 65).length,
      },
    });
  } catch (err) {
    console.error("[demo-watchdog] GET failed:", err);
    return NextResponse.json({ error: "Could not load demo activity" }, { status: 500 });
  }
}

const HOOK_SYSTEM = `
${brandContext()}

You write the follow-up to someone who tried FinovaOS and did not sign up.

The whole message hangs on one specific thing they did. "You created three
invoices and a chart of accounts in the demo" is the message. "We noticed you
were interested in our platform" is not a message.

Rules:
- Two to four sentences. It is from the founder, sent by hand.
- Refer to exactly what they did, using the activity given to you. If the
  activity list is empty, say plainly that you saw they had a look, and ask one
  question instead of pretending to know more.
- One question at the end that is easy to answer. Offer WhatsApp or a call.
- Someone who abandoned a signup after typing the wrong code may have hit a
  problem, not lost interest. Ask whether the code arrived, and offer to set the
  account up manually.
- No discount, no free trial, no urgency, no deadline.
- Pakistani or Gulf names or businesses: Roman Urdu mixed with English is fine
  and usually better. Otherwise plain English.

Return exactly:

SUBJECT: <one line, lower-case, sounds like a person typed it>
BODY:
<the message>
`;

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  if (!aiConfigured()) {
    return NextResponse.json({ error: "No AI provider configured" }, { status: 503 });
  }

  try {
    const { id, days = 30 } = (await req.json().catch(() => ({}))) as { id?: string; days?: number };
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const leads = await loadLeads(Math.min(180, Math.max(7, Number(days) || 30)));
    const lead = leads.find((l) => l.id === id);
    if (!lead) return NextResponse.json({ error: "That lead is no longer in the window" }, { status: 404 });

    const hook = await askAI(
      HOOK_SYSTEM,
      [
        `Name: ${lead.name}`,
        `Business: ${lead.company || "unknown"}`,
        `Business type: ${lead.businessType || "unknown"}`,
        `Route in: ${lead.kind}`,
        `How far they got: ${lead.stage}`,
        `What they did:`,
        ...(lead.activity.length ? lead.activity.map((a) => `- ${a}`) : ["- nothing recorded"]),
      ].join("\n"),
      700,
    );

    return NextResponse.json({ id, hook });
  } catch (err) {
    console.error("[demo-watchdog] POST failed:", err);
    return NextResponse.json({ error: "Could not draft a follow-up" }, { status: 500 });
  }
}
