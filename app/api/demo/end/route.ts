import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function cleanupDemoCompany(companyId: string) {
  const tables = [
    "BusinessRecord",
    "SalesInvoiceItem",
    "SalesInvoice",
    "PurchaseInvoiceItem",
    "PurchaseInvoice",
    "PurchaseOrderItem",
    "PurchaseOrder",
    "InventoryTxn",
    "VoucherEntry",
    "Voucher",
    "PaymentReceipt",
    "ExpenseItem",
    "ExpenseVoucher",
    "QuotationItem",
    "Quotation",
    "DeliveryChallanItem",
    "DeliveryChallan",
    "GoodsReceiptNoteItem",
    "GoodsReceiptNote",
    "SaleReturnItem",
    "SaleReturn",
    "OutwardItem",
    "Outward",
    "BankStatement",
    "BankReconciliation",
    "BankAccount",
    "InvoiceTax",
    "TaxConfiguration",
    "Interaction",
    "Contact",
    "Attendance",
    "Payroll",
    "AdvanceSalary",
    "Employee",
    "ItemNew",
    "Account",
    "LedgerEntry",
    "Notification",
    "ActivityLog",
    "Session",
    "UserCompany",
    "Company",
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "${table}" WHERE "companyId" = $1`,
        companyId
      );
    } catch {
      // ignore per-table failures (table may not have companyId column or may not exist)
    }
  }
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "Company" WHERE id = $1`, companyId);
  } catch {}
}

async function endBooking(bookingId: string) {
  const booking = await (prisma as any).demoBooking.findUnique({
    where: { id: bookingId },
  });
  if (!booking) return { ok: false, reason: "not-found" };
  if (booking.cleanedUp) return { ok: true, alreadyCleaned: true };

  if (booking.demoCompanyId) {
    await cleanupDemoCompany(booking.demoCompanyId);
  }

  await (prisma as any).demoBooking.update({
    where: { id: bookingId },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
      cleanedUp: true,
    },
  });
  return { ok: true };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const bookingId = String(body?.bookingId || "").trim();

    if (!bookingId) {
      const cookie = req.cookies.get("finova_demo")?.value;
      if (cookie) {
        try {
          const parsed = JSON.parse(cookie);
          if (parsed?.bookingId) {
            const result = await endBooking(parsed.bookingId);
            const res = NextResponse.json(result);
            res.cookies.delete("sb_auth");
            res.cookies.delete("finova_demo");
            return res;
          }
        } catch {}
      }
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    const result = await endBooking(bookingId);
    const res = NextResponse.json(result);
    res.cookies.delete("sb_auth");
    res.cookies.delete("finova_demo");
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "End failed" }, { status: 500 });
  }
}
