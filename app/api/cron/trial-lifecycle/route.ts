import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getLaunchDiscount } from "@/lib/launchDiscount";
import { loadTrialActivity } from "@/lib/trialMetrics";
import { TRIAL_GRACE_DAYS } from "@/lib/trial";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAY = 86_400_000;

// Cron: daily. Fire-and-forget, like the other crons, so the scheduler gets its
// answer at once while the emails go out in the background.
//
// Two jobs:
//   1. Reminders around the end of a trial — 4 days left, 2 days left, the day it
//      ends, and the last day of the read-only grace.
//   2. Closing trials whose grace has run out (TRIALING -> INACTIVE).
//
// The guards already refuse writes the moment trialEndsAt passes, whatever the
// status says, so a late or missed run costs nothing but a late email. Each
// reminder is written to ActivityLog when it is sent, and that row is what
// stops a second run from sending it again.

type Milestone = "d4" | "d2" | "ends" | "final";

function dueMilestones(msLeft: number): Milestone[] {
  const due: Milestone[] = [];
  const overdue = -msLeft;
  if (msLeft > 0 && msLeft <= 4 * DAY) due.push("d4");
  if (msLeft > 0 && msLeft <= 2 * DAY) due.push("d2");
  if (overdue >= 0) due.push("ends");
  if (overdue >= (TRIAL_GRACE_DAYS - 1) * DAY) due.push("final");
  return due;
}

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
      const result = await runTrialLifecycle();
      console.log("[cron] trial-lifecycle complete:", result);
    } catch (err) {
      console.error("[cron] trial-lifecycle error:", err);
    }
  });

  return NextResponse.json({ ok: true, started: true });
}

export async function runTrialLifecycle() {
  const now = Date.now();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.finovaos.app";

  const companies = await prisma.company.findMany({
    where: { subscriptionStatus: "TRIALING", trialEndsAt: { not: null }, isDemo: false },
    select: {
      id: true,
      name: true,
      trialEndsAt: true,
      defaultUsers: { select: { email: true, name: true } },
    },
  });
  if (companies.length === 0) return { checked: 0, sent: 0, closed: 0 };

  const ids = companies.map((c) => c.id);
  const [activity, sentLogs, launch] = await Promise.all([
    loadTrialActivity(ids),
    prisma.activityLog.findMany({
      where: { companyId: { in: ids }, action: "TRIAL_REMINDER" },
      select: { companyId: true, details: true },
    }),
    getLaunchDiscount().catch(() => null),
  ]);

  const sentKeys = new Set<string>();
  for (const l of sentLogs) {
    try {
      sentKeys.add(`${l.companyId}:${JSON.parse(l.details || "{}").milestone}`);
    } catch { /* an unreadable row just means that reminder may repeat */ }
  }

  const offer =
    launch && launch.type === "percent"
      ? `${launch.value}% off your first ${launch.durationMonths ?? 3} months`
      : null;

  let sent = 0;
  let closed = 0;

  for (const co of companies) {
    const end = co.trialEndsAt!.getTime();
    const msLeft = end - now;

    // Grace over: close the trial. Data stays; only access ends.
    if (-msLeft > TRIAL_GRACE_DAYS * DAY) {
      await prisma.company
        .update({ where: { id: co.id }, data: { subscriptionStatus: "INACTIVE" } })
        .catch((e) => console.error("[cron] trial-lifecycle close error:", e));
      await prisma.activityLog
        .create({ data: { companyId: co.id, action: "TRIAL_CLOSED", details: JSON.stringify({ trialEndsAt: co.trialEndsAt }) } })
        .catch(() => {});
      closed++;
      continue;
    }

    // Only the latest due reminder is sent, so a company that missed a few
    // days does not get three emails at once.
    const due = dueMilestones(msLeft);
    const latest = due[due.length - 1];
    if (!latest || sentKeys.has(`${co.id}:${latest}`)) continue;

    const recipients = (co.defaultUsers || []).filter((u) => !!u.email);
    if (recipients.length === 0) continue;

    const a = activity.get(co.id);
    for (const user of recipients) {
      await sendEmail({
        to: user.email,
        companyId: co.id,
        subject: subjectFor(latest, co.name),
        html: reminderHtml({
          milestone: latest,
          userName: user.name || "there",
          companyName: co.name,
          invoices: a?.invoices ?? 0,
          receipts: a?.receipts ?? 0,
          offer,
          billingUrl: `${appUrl}/dashboard/billing`,
        }),
      }).catch((e) => console.error("[cron] trial-lifecycle send error:", e));
    }

    for (const m of due) {
      await prisma.activityLog
        .create({ data: { companyId: co.id, action: "TRIAL_REMINDER", details: JSON.stringify({ milestone: m }) } })
        .catch(() => {});
    }
    sent++;
  }

  return { checked: companies.length, sent, closed };
}

function subjectFor(m: Milestone, company: string): string {
  switch (m) {
    case "d4": return `Your FinovaOS trial ends in 4 days — ${company}`;
    case "d2": return `2 days left in your FinovaOS trial — ${company}`;
    case "ends": return `Your FinovaOS trial has ended — your data is safe`;
    case "final": return `Last day of read-only access — choose a plan to keep ${company} running`;
  }
}

function reminderHtml(p: {
  milestone: Milestone;
  userName: string;
  companyName: string;
  invoices: number;
  receipts: number;
  offer: string | null;
  billingUrl: string;
}): string {
  const done = p.invoices + p.receipts > 0
    ? `So far you have recorded <strong>${p.invoices}</strong> invoice${p.invoices === 1 ? "" : "s"} and <strong>${p.receipts}</strong> payment${p.receipts === 1 ? "" : "s"} in FinovaOS.`
    : `You have not recorded an invoice yet. Your first one takes about two minutes, and your trial days are still yours to use.`;

  const lead = {
    d4: `Your free trial ends in 4 days. Your business data will stay available.`,
    d2: `Your free trial ends in 2 days.`,
    ends: `Your free trial has ended. Your data is safe, and you can still view and export it for ${TRIAL_GRACE_DAYS} days. New records are paused until you choose a plan.`,
    final: `Today is the last day of read-only access. Choose a plan to keep working without losing a day.`,
  }[p.milestone];

  const offerLine = p.offer
    ? `<p style="margin:0 0 16px;font-size:14px;color:#374151;">Launch offer: <strong>${p.offer}</strong>, applied automatically at checkout on monthly plans.</p>`
    : "";

  return `<!doctype html><html><body style="margin:0;background:#f6f4f0;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px;">
<tr><td>
<p style="margin:0 0 16px;font-size:15px;color:#111827;">Hi ${escapeHtml(p.userName)},</p>
<p style="margin:0 0 16px;font-size:15px;color:#111827;line-height:1.6;">${lead}</p>
<p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">${done}</p>
${offerLine}
<p style="margin:24px 0;"><a href="${p.billingUrl}" style="background:#c2410c;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:700;display:inline-block;">Choose a plan</a></p>
<p style="margin:0;font-size:12px;color:#6b7280;">${escapeHtml(p.companyName)} · FinovaOS. Reply to this email if you want help getting set up.</p>
</td></tr></table></td></tr></table></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
