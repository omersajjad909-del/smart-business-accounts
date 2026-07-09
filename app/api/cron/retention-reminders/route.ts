import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

// Cron: daily at 06:00 UTC. Fire-and-forget so response returns immediately
// (under cron-job.org's 30s timeout) while reminder emails are sent in the
// background up to maxDuration.
//
// Purpose: enforce the Privacy Policy commitment (see
// app/(marketing)/legal/privacy/page.tsx) that we notify users 14 days and 3
// days before permanent deletion of a cancelled account's business data.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
      const now = new Date();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.finovaos.app";

      // Pending-deletion states: subscription is cancelled and a purge date is
      // scheduled. Aligns with app/api/admin/cron/data-cleanup/route.ts.
      const companies = await prisma.company.findMany({
        where: {
          subscriptionStatus: { in: ["CANCELED", "CANCELLED", "DELETION_PENDING"] },
          dataRetentionUntil: { not: null },
        },
        select: {
          id: true,
          name: true,
          dataRetentionUntil: true,
          retentionReminder14SentAt: true,
          retentionReminder3SentAt: true,
          defaultUsers: { select: { email: true, name: true } },
        },
      });

      let sent14 = 0;
      let sent3 = 0;
      let skipped = 0;

      for (const co of companies) {
        if (!co.dataRetentionUntil) continue;

        const daysUntilDeletion = Math.round(
          (co.dataRetentionUntil.getTime() - now.getTime()) / 86_400_000,
        );

        const recipients = (co.defaultUsers || []).filter(u => !!u.email);
        if (recipients.length === 0) {
          skipped++;
          continue;
        }

        const deletionDateStr = co.dataRetentionUntil.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });

        // ── 14-day advance reminder ────────────────────────────────────────
        if (
          daysUntilDeletion >= 13 &&
          daysUntilDeletion <= 15 &&
          !co.retentionReminder14SentAt
        ) {
          for (const user of recipients) {
            await sendEmail({
              to: user.email,
              subject: `Action needed: your FinovaOS data will be permanently deleted in ${daysUntilDeletion} days`,
              html: reminder14Html({
                userName: user.name || "there",
                companyName: co.name,
                deletionDateStr,
                daysUntilDeletion,
                appUrl,
              }),
            }).catch(err => console.error("[cron] retention-reminders 14d send error:", err));
          }
          await prisma.company.update({
            where: { id: co.id },
            data: { retentionReminder14SentAt: now },
          }).catch(err => console.error("[cron] retention-reminders 14d mark error:", err));
          sent14++;
          continue;
        }

        // ── 3-day final warning ────────────────────────────────────────────
        if (
          daysUntilDeletion >= 2 &&
          daysUntilDeletion <= 4 &&
          !co.retentionReminder3SentAt
        ) {
          for (const user of recipients) {
            await sendEmail({
              to: user.email,
              subject: `Final notice: FinovaOS data for ${co.name} deletes in ${daysUntilDeletion} days`,
              html: reminder3Html({
                userName: user.name || "there",
                companyName: co.name,
                deletionDateStr,
                daysUntilDeletion,
                appUrl,
              }),
            }).catch(err => console.error("[cron] retention-reminders 3d send error:", err));
          }
          await prisma.company.update({
            where: { id: co.id },
            data: { retentionReminder3SentAt: now },
          }).catch(err => console.error("[cron] retention-reminders 3d mark error:", err));
          sent3++;
          continue;
        }
      }

      console.log(
        `[cron] retention-reminders complete: scanned=${companies.length} sent14=${sent14} sent3=${sent3} skippedNoRecipient=${skipped}`,
      );
    } catch (err: any) {
      console.error("[cron] retention-reminders error:", err);
    }
  });

  return NextResponse.json({ ok: true, started: true });
}

// ─── Email templates (inline HTML) ──────────────────────────────────────────

function reminder14Html(opts: {
  userName: string;
  companyName: string;
  deletionDateStr: string;
  daysUntilDeletion: number;
  appUrl: string;
}): string {
  const { userName, companyName, deletionDateStr, daysUntilDeletion, appUrl } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1e293b;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;padding:36px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 40px rgba(15,23,42,.10);">
  <tr>
    <td style="background:#0f172a;padding:26px 36px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="vertical-align:middle;"><div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">FinovaOS</div></td>
          <td align="right" style="vertical-align:middle;"><span style="background:#f59e0b;color:#ffffff;padding:5px 14px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Data Retention</span></td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:36px 36px 28px;">
      <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;">Your business data will be deleted in ${daysUntilDeletion} days</p>
      <p style="margin:0 0 18px;font-size:15px;color:#64748b;">Hi ${userName},</p>
      <p style="margin:0 0 14px;font-size:14px;color:#475569;line-height:1.7;">
        This is a scheduled reminder that all business data for <strong>${companyName}</strong> is scheduled for
        permanent deletion on <strong style="color:#0f172a;">${deletionDateStr}</strong>, in line with our
        90-day post-cancellation retention window.
      </p>
      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7;">
        As committed in our <a href="https://finovaos.app/legal/privacy" style="color:#6366f1;font-weight:600;">Privacy Policy</a>,
        we are notifying you 14 days ahead of the deletion so you have time to act.
      </p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 18px;margin:20px 0;">
        <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:6px;">You have three options:</div>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:#78350f;line-height:1.8;">
          <li><strong>Export your data</strong> — download a full backup while you still can.</li>
          <li><strong>Reactivate your subscription</strong> — cancel the deletion and keep everything.</li>
          <li><strong>Do nothing</strong> — your data will be permanently and irreversibly deleted on ${deletionDateStr}.</li>
        </ul>
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 12px;">
        <tr>
          <td align="center" style="padding:0 6px;">
            <a href="${appUrl}/dashboard/backup" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:10px;font-size:14px;font-weight:700;">Export My Data</a>
          </td>
          <td align="center" style="padding:0 6px;">
            <a href="${appUrl}/dashboard/billing" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:10px;font-size:14px;font-weight:700;">Reactivate Subscription</a>
          </td>
        </tr>
      </table>
      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.7;">
        To cancel the scheduled deletion, email
        <a href="mailto:legal@finovaos.app" style="color:#6366f1;font-weight:600;">legal@finovaos.app</a>
        before ${deletionDateStr}. You will receive one final reminder 3 days before deletion.
      </p>
    </td>
  </tr>
  <tr>
    <td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0;text-align:center;">
      <div style="font-size:11px;color:#94a3b8;line-height:1.6;">Sent via <strong style="color:#6366f1;">FinovaOS</strong> &nbsp;·&nbsp; finovaos.app</div>
    </td>
  </tr>
</table>
</td></tr></table></body></html>`;
}

function reminder3Html(opts: {
  userName: string;
  companyName: string;
  deletionDateStr: string;
  daysUntilDeletion: number;
  appUrl: string;
}): string {
  const { userName, companyName, deletionDateStr, daysUntilDeletion, appUrl } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1e293b;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;padding:36px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 40px rgba(15,23,42,.10);">
  <tr>
    <td style="background:#7f1d1d;padding:26px 36px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="vertical-align:middle;"><div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">FinovaOS</div></td>
          <td align="right" style="vertical-align:middle;"><span style="background:#ffffff;color:#7f1d1d;padding:5px 14px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Final Warning</span></td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:36px 36px 28px;">
      <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#7f1d1d;">Final notice: data deletes in ${daysUntilDeletion} days</p>
      <p style="margin:0 0 18px;font-size:15px;color:#64748b;">Hi ${userName},</p>
      <p style="margin:0 0 14px;font-size:14px;color:#475569;line-height:1.7;">
        This is your <strong>final reminder</strong> that all business data for
        <strong>${companyName}</strong> will be <strong style="color:#b91c1c;">permanently and irreversibly deleted on ${deletionDateStr}</strong>.
      </p>
      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7;">
        As committed in our <a href="https://finovaos.app/legal/privacy" style="color:#6366f1;font-weight:600;">Privacy Policy</a>,
        we promised to give you 3 days' notice before deletion. This is that notice.
      </p>
      <div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:10px;padding:16px 18px;margin:20px 0;">
        <div style="font-size:13px;font-weight:800;color:#7f1d1d;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Action required now</div>
        <div style="font-size:13px;color:#991b1b;line-height:1.7;">
          After ${deletionDateStr}, your invoices, ledger, inventory, payroll, contacts and all other
          business records cannot be recovered by anyone — including our support team.
        </div>
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 12px;">
        <tr>
          <td align="center" style="padding:0 6px;">
            <a href="${appUrl}/dashboard/backup" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:14px;font-weight:800;">Export Now</a>
          </td>
          <td align="center" style="padding:0 6px;">
            <a href="${appUrl}/dashboard/billing" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:14px;font-weight:800;">Reactivate</a>
          </td>
        </tr>
      </table>
      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.7;">
        To stop the deletion, email
        <a href="mailto:legal@finovaos.app" style="color:#6366f1;font-weight:600;">legal@finovaos.app</a>
        immediately — well before ${deletionDateStr}. Requests received after that date cannot be honoured.
      </p>
    </td>
  </tr>
  <tr>
    <td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0;text-align:center;">
      <div style="font-size:11px;color:#94a3b8;line-height:1.6;">Sent via <strong style="color:#6366f1;">FinovaOS</strong> &nbsp;·&nbsp; finovaos.app</div>
    </td>
  </tr>
</table>
</td></tr></table></body></html>`;
}
