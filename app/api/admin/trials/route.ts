import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { loadTrialActivity } from "@/lib/trialMetrics";
import { TRIAL_GRACE_DAYS, trialDaysLeft, trialState } from "@/lib/trial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Free trials at a glance: who is in one, how long is left, and whether they
 * have done anything real yet. "Converted" is a company that started a trial and
 * is now ACTIVE — it paid. "Activated" is one that recorded an invoice or a
 * payment, which is the number that predicts whether it will.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const companies = await prisma.company.findMany({
      where: { trialEndsAt: { not: null }, isDemo: false, isInternalTest: false },
      orderBy: { trialStartedAt: "desc" },
      take: 500,
      select: {
        id: true, name: true, country: true, subscriptionStatus: true, plan: true,
        trialStartedAt: true, trialEndsAt: true, trialSource: true, trialPhone: true,
        defaultUsers: { select: { email: true }, take: 1 },
      },
    });

    const ids = companies.map((c) => c.id);
    const [activity, requestLogs] = await Promise.all([
      loadTrialActivity(ids),
      prisma.activityLog.findMany({
        where: { action: { in: ["SETUP_REQUEST", "SETUP_DONE"] } },
        orderBy: { createdAt: "desc" },
        take: 500,
        select: { companyId: true, action: true, details: true, createdAt: true },
      }),
    ]);

    // The newest row per company decides whether its request is still open.
    const latest = new Map<string, (typeof requestLogs)[number]>();
    for (const l of requestLogs) if (l.companyId && !latest.has(l.companyId)) latest.set(l.companyId, l);
    const nameOf = new Map(companies.map((c) => [c.id, c.name]));
    const openRequests = [...latest.values()]
      .filter((l) => l.action === "SETUP_REQUEST")
      .map((l) => {
        let note = "";
        try { note = JSON.parse(l.details || "{}").note || ""; } catch {}
        return { companyId: l.companyId, name: nameOf.get(l.companyId || "") || l.companyId, note, at: l.createdAt };
      });

    const rows = companies.map((c) => {
      const a = activity.get(c.id);
      const state = trialState(c.subscriptionStatus, c.trialEndsAt);
      const status = String(c.subscriptionStatus || "").toUpperCase();
      return {
        companyId: c.id,
        name: c.name,
        email: c.defaultUsers[0]?.email || null,
        country: c.country,
        status,
        stage: state === "none" ? (status === "ACTIVE" ? "converted" : "ended") : state,
        daysLeft: trialDaysLeft(c.trialEndsAt),
        trialEndsAt: c.trialEndsAt,
        trialStartedAt: c.trialStartedAt,
        source: c.trialSource,
        phone: c.trialPhone,
        invoices: a?.invoices ?? 0,
        receipts: a?.receipts ?? 0,
        activated: !!a?.activated,
      };
    });

    const count = (f: (r: (typeof rows)[number]) => boolean) => rows.filter(f).length;
    const total = rows.length;
    const converted = count((r) => r.stage === "converted");
    const activated = count((r) => r.activated);

    return NextResponse.json({
      graceDays: TRIAL_GRACE_DAYS,
      summary: {
        total,
        active: count((r) => r.stage === "active"),
        grace: count((r) => r.stage === "grace"),
        activated,
        converted,
        activationRate: total ? Math.round((activated / total) * 100) : 0,
        conversionRate: total ? Math.round((converted / total) * 100) : 0,
      },
      rows,
      openRequests,
    });
  } catch (e) {
    console.error("[admin/trials] failed:", e);
    return NextResponse.json({ error: "Could not load trials" }, { status: 500 });
  }
}

/** POST { companyId, action: "setup_done" } — close a customer's setup request. */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const { companyId, action } = await req.json().catch(() => ({}));
  if (!companyId || action !== "setup_done") {
    return NextResponse.json({ error: "companyId and action=setup_done required" }, { status: 400 });
  }
  await prisma.activityLog.create({
    data: { companyId, userId: admin.id, action: "SETUP_DONE", details: JSON.stringify({ by: admin.id }) },
  });
  return NextResponse.json({ ok: true });
}
