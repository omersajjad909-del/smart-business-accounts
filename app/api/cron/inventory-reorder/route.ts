import { NextRequest, NextResponse, after } from "next/server";
import { checkAndTriggerReorders } from "@/lib/inventoryReorder";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

// Cron: daily at 06:00 UTC. Uses fire-and-forget so the HTTP response returns
// immediately (well under cron-job.org's 30s timeout) while the actual work
// continues in the background up to maxDuration.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
      const companies = await prisma.company.findMany({
        where: { isActive: true, subscriptionStatus: "ACTIVE" },
        select: { id: true },
      });

      let totalTriggered = 0;
      for (const co of companies) {
        try {
          const result = await checkAndTriggerReorders(co.id);
          totalTriggered += result?.triggered?.length ?? 0;
        } catch {
          // continue other companies on individual failure
        }
      }
      console.log(`[cron] inventory-reorder complete: ${companies.length} companies, ${totalTriggered} triggered`);
    } catch (err: any) {
      console.error("[cron] inventory-reorder error:", err);
    }
  });

  return NextResponse.json({ ok: true, started: true });
}
