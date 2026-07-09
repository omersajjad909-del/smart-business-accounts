import { NextRequest, NextResponse, after } from "next/server";
import { checkUpcomingDeadlines } from "@/lib/fbrReport";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

// Cron: every Monday at 09:00 UTC. Fire-and-forget: response returns immediately
// while deadline emails are sent in background.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
      const deadlines = await checkUpcomingDeadlines();
      if (!deadlines?.length) {
        console.log("[cron] tax-fbr: no upcoming deadlines this week");
        return;
      }

      const companies = await prisma.company.findMany({
        where: { isActive: true, country: { in: ["Pakistan", "PK"] }, subscriptionStatus: "ACTIVE" },
        include: { defaultUsers: { select: { email: true, name: true } } },
      });

      let notified = 0;
      for (const co of companies) {
        for (const user of co.defaultUsers) {
          if (!user.email) continue;
          await sendEmail({
            to: user.email,
            subject: `FBR Filing Deadline Reminder — ${co.name}`,
            html: `
              <p>Dear ${user.name},</p>
              <p>This is a weekly reminder about upcoming FBR filing deadlines for <strong>${co.name}</strong>.</p>
              <ul>${deadlines.map((d: any) => `<li><strong>${d.name}</strong> — Due: ${d.dueDate}</li>`).join("")}</ul>
              <p>Please ensure your tax filings are submitted on time to avoid penalties.</p>
              <p>View your tax reports in the <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tax">FinovaOS Tax module</a>.</p>
            `,
          }).catch(() => {});
          notified++;
        }
      }
      console.log(`[cron] tax-fbr complete: ${notified} notifications sent`);
    } catch (err: any) {
      console.error("[cron] tax-fbr error:", err);
    }
  });

  return NextResponse.json({ ok: true, started: true });
}
