import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/payment-followup — overdue sales invoices (no payment receipt, older than N days)
export async function GET(req: NextRequest) {
  const companyId = req.headers.get("x-company-id");
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const overdueDays = parseInt(url.searchParams.get("days") || "0"); // 0 = show all unpaid

  // Date threshold: invoices older than overdueDays are "overdue"
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - overdueDays);

  // Get all sales invoices for the company that are not deleted
  const invoices = await prisma.salesInvoice.findMany({
    where: {
      companyId,
      deletedAt: null,
      date: { lte: thresholdDate },
    },
    include: {
      customer: { select: { id: true, name: true } },
    },
    orderBy: { date: "asc" },
  });

  // Get existing follow-up logs for these invoices
  const invoiceIds = invoices.map((inv) => inv.id);
  const logs = await (prisma as any).paymentFollowUpLog.findMany({
    where: { companyId, invoiceId: { in: invoiceIds } },
  });

  const logMap: Record<string, { status: string; note: string | null; updatedAt: Date }> = {};
  for (const log of logs) {
    logMap[log.invoiceId] = { status: log.status, note: log.note, updatedAt: log.updatedAt };
  }

  const today = new Date();
  const result = invoices
    .filter((inv) => {
      const status = logMap[inv.id]?.status ?? "PENDING";
      return status !== "PAID"; // exclude already-paid ones
    })
    .map((inv) => {
      const invDate = new Date(inv.date);
      const daysOverdue = Math.floor((today.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));
      const log = logMap[inv.id];
      return {
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        customer: inv.customer?.name ?? "Unknown",
        customerId: inv.customerId,
        amount: inv.total,
        dueDate: invDate.toISOString().split("T")[0],
        daysOverdue,
        lastFollowup: log?.updatedAt ? log.updatedAt.toISOString().split("T")[0] : null,
        status: (log?.status ?? "PENDING") as "PENDING" | "CONTACTED" | "PROMISED" | "PAID",
        note: log?.note ?? null,
      };
    });

  return NextResponse.json({ invoices: result });
}
