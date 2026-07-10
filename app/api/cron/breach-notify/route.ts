import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Cron: runs hourly. Enforces the "notify within 72 hours" commitment made
// in /legal/privacy and /legal/dpa. Any SecurityIncident in DETECTED status
// whose deadlineAt is within 24h gets notified NOW so we never miss the 72h SLA.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    await processIncidents();
  });

  return NextResponse.json({ ok: true, started: true });
}

async function processIncidents() {
  const now = new Date();
  const soonThreshold = new Date(now.getTime() + 24 * 3600 * 1000); // notify at 48h if not sooner

  const dueIncidents = await prisma.securityIncident.findMany({
    where: {
      status: { in: ["DETECTED", "NOTIFYING"] },
      deadlineAt: { lte: soonThreshold },
    },
    orderBy: { deadlineAt: "asc" },
  });

  if (dueIncidents.length === 0) {
    console.log("[cron] breach-notify: nothing due");
    return;
  }

  for (const incident of dueIncidents) {
    try {
      await prisma.securityIncident.update({
        where: { id: incident.id },
        data: { status: "NOTIFYING" },
      });

      const recipients = await gatherRecipients();
      if (recipients.length === 0) {
        console.warn(`[cron] breach-notify ${incident.id}: no recipients found`);
        continue;
      }

      const html = renderIncidentEmail(incident);
      const subject = `[FinovaOS Security Notice] ${incident.title}`;

      // Batch send — one at a time, don't blow past provider rate limits
      let sent = 0;
      let lastError: string | null = null;
      for (const to of recipients) {
        const res = await sendEmail({ to, subject, html });
        if (res.success) sent++;
        else lastError = res.error || "Unknown send error";
      }

      await prisma.securityIncident.update({
        where: { id: incident.id },
        data: {
          status: "NOTIFIED",
          notifiedAt: new Date(),
          notificationCount: sent,
          lastNotifyError: sent === recipients.length ? null : lastError,
        },
      });

      console.log(`[cron] breach-notify ${incident.id}: notified ${sent}/${recipients.length}`);
    } catch (err: any) {
      console.error(`[cron] breach-notify ${incident.id} failed:`, err);
      await prisma.securityIncident.update({
        where: { id: incident.id },
        data: { lastNotifyError: String(err?.message || err).slice(0, 500) },
      }).catch(() => {});
    }
  }
}

async function gatherRecipients(): Promise<string[]> {
  const emails = new Set<string>();

  // 1. Every active user with a verified email
  const users = await prisma.user.findMany({
    where: { email: { not: "" } },
    select: { email: true },
  });
  for (const u of users) if (u.email) emails.add(u.email.toLowerCase());

  // 2. Status page subscribers who confirmed
  const subs = await prisma.statusSubscriber.findMany({
    where: { confirmed: true },
    select: { email: true },
  });
  for (const s of subs) if (s.email) emails.add(s.email.toLowerCase());

  return Array.from(emails);
}

function renderIncidentEmail(incident: {
  id: string;
  severity: string;
  category: string;
  title: string;
  summary: string;
  affectedScope: string | null;
  detectedAt: Date;
}): string {
  const detected = incident.detectedAt.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const scope = incident.affectedScope || "Under investigation";
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;color:#0f172a;">
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#b91c1c;letter-spacing:.06em;text-transform:uppercase;">Security Incident Notification</div>
        <div style="font-size:11px;color:#7f1d1d;margin-top:4px;">Severity ${incident.severity} · ${incident.category.replace(/_/g, " ")}</div>
      </div>
      <h2 style="margin:0 0 12px;font-size:20px;">${escapeHtml(incident.title)}</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.7;">${escapeHtml(incident.summary)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:18px 0;">
        <tr style="background:#e2e8f0;"><td style="padding:8px 12px;font-weight:700;">Detected at</td><td style="padding:8px 12px;">${detected}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:700;">Affected scope</td><td style="padding:8px 12px;">${escapeHtml(scope)}</td></tr>
        <tr style="background:#e2e8f0;"><td style="padding:8px 12px;font-weight:700;">Reference ID</td><td style="padding:8px 12px;font-family:monospace;">${incident.id}</td></tr>
      </table>
      <p style="font-size:13px;color:#475569;line-height:1.7;">
        In line with our Privacy Policy and Data Processing Agreement, FinovaOS notifies affected users within 72 hours of discovering a personal-data incident.
        We will send a follow-up once the incident is resolved. If you have questions, reply to this email or write to
        <a href="mailto:security@finovaos.app" style="color:#4f46e5;">security@finovaos.app</a>.
      </p>
      <p style="font-size:11px;color:#94a3b8;margin-top:24px;">FinovaOS · Automated security notification</p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
