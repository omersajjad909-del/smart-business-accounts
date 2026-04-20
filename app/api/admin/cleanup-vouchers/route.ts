import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();
if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

// Deletes PI/SI vouchers whose source invoice no longer exists (orphaned accounting entries)
export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    // Find all PI vouchers for this company
    const piVouchers = await prisma.voucher.findMany({
      where: { type: "PI", companyId, deletedAt: null },
      select: { id: true, voucherNo: true },
    });

    // Find all SI vouchers for this company
    const siVouchers = await prisma.voucher.findMany({
      where: { type: "SI", companyId, deletedAt: null },
      select: { id: true, voucherNo: true },
    });

    // Find valid (non-deleted) purchase invoice numbers
    const validPI = await prisma.purchaseInvoice.findMany({
      where: { companyId, deletedAt: null },
      select: { invoiceNo: true },
    });
    const validPISet = new Set(validPI.map((i) => i.invoiceNo));

    // Find valid sales invoice numbers (hard-deleted, so any remaining = valid)
    const validSI = await prisma.salesInvoice.findMany({
      where: { companyId },
      select: { invoiceNo: true },
    });
    const validSISet = new Set(validSI.map((i) => i.invoiceNo));

    // Collect orphan voucher IDs
    const orphanIds: string[] = [];
    for (const v of piVouchers) {
      if (!validPISet.has(v.voucherNo)) orphanIds.push(v.id);
    }
    for (const v of siVouchers) {
      if (!validSISet.has(v.voucherNo)) orphanIds.push(v.id);
    }

    if (orphanIds.length === 0) {
      return NextResponse.json({ deleted: 0, message: "No orphaned vouchers found" });
    }

    // Delete entries then vouchers
    await prisma.$transaction(async (tx) => {
      await tx.voucherEntry.deleteMany({ where: { voucherId: { in: orphanIds } } });
      await tx.voucher.deleteMany({ where: { id: { in: orphanIds } } });
    });

    return NextResponse.json({ deleted: orphanIds.length, message: `Cleaned ${orphanIds.length} orphaned voucher(s)` });
  } catch (e: any) {
    console.error("Cleanup error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
