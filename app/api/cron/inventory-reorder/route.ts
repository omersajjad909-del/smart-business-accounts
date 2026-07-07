import { NextRequest, NextResponse } from "next/server";
import { checkAndTriggerReorders } from "@/lib/inventoryReorder";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel cron: daily at 06:00 UTC
// Replaces: /api/inventory/reorder?action=process
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Process reorders for all active companies
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

    return NextResponse.json({ ok: true, companiesProcessed: companies.length, totalTriggered });
  } catch (err: any) {
    console.error("[cron] inventory-reorder error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
