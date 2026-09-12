import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { fileSalesInvoiceWithFbr } from "@/lib/fbrEInvoice";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron: retries every SalesInvoice stuck at PENDING_SYNC — a filing that
 * failed because the FBR gateway itself was unreachable or erroring, not
 * because FBR rejected the payload.
 *
 * Once a day (see vercel.json). Hourly is the frequency this wants, but a
 * Hobby account may only run daily crons and Vercel rejects the whole
 * deployment rather than quietly slowing a shorter schedule down — the same
 * constraint app/api/cron/demo-cleanup already documents. An hourly schedule
 * here blocked every deployment for three hours before this was found. Put it
 * back on an hourly schedule if this account moves to Pro.
 *
 * fileSalesInvoiceWithFbr gives up and marks an invoice FAILED once it has
 * been retried FBR_MAX_RETRIES times, so this never retries forever.
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
      const pending = await prisma.salesInvoice.findMany({
        where: { fbrStatus: "PENDING_SYNC", deletedAt: null },
        select: { id: true, companyId: true },
        orderBy: { fbrLastRetryAt: "asc" },
        take: 200,
      });

      let filed = 0;
      let stillPending = 0;
      let gaveUp = 0;

      for (const inv of pending) {
        const result = await fileSalesInvoiceWithFbr(inv.companyId, inv.id, {});
        if (result.ok) {
          filed++;
        } else if (result.invoice?.fbrStatus === "FAILED") {
          gaveUp++;
        } else {
          stillPending++;
        }
      }

      console.log(`[cron] fbr-retry: ${pending.length} due, ${filed} filed, ${stillPending} still pending, ${gaveUp} gave up`);
    } catch (err: any) {
      console.error("[cron] fbr-retry error:", err);
    }
  });

  return NextResponse.json({ ok: true, started: true });
}
