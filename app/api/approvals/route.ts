import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

const prisma =
  (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role")?.toUpperCase();
  const userId = req.headers.get("x-user-id");

  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const [sales, purchases, payments, expenses] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: { companyId, approvalStatus: "PENDING" },
      select: { id: true, invoiceNo: true, total: true, date: true },
      orderBy: { date: "desc" },
    }),
    prisma.purchaseInvoice.findMany({
      where: { companyId, approvalStatus: "PENDING" },
      select: { id: true, invoiceNo: true, total: true, date: true },
      orderBy: { date: "desc" },
    }),
    prisma.paymentReceipt.findMany({
      where: { companyId, approvalStatus: "PENDING" },
      select: { id: true, receiptNo: true, amount: true, date: true },
      orderBy: { date: "desc" },
    }),
    prisma.expenseVoucher.findMany({
      where: { companyId, approvalStatus: "PENDING" },
      select: { id: true, voucherNo: true, totalAmount: true, date: true },
      orderBy: { date: "desc" },
    }),
  ]);

  return NextResponse.json({
    sales: sales.map((s) => ({ type: "SALES_INVOICE", ...s })),
    purchases: purchases.map((p) => ({ type: "PURCHASE_INVOICE", ...p })),
    payments: payments.map((p) => ({ type: "PAYMENT_RECEIPT", ...p })),
    expenses: expenses.map((e) => ({ type: "EXPENSE_VOUCHER", ...e })),
    userId,
  });
}

export async function PATCH(req: NextRequest) {
  const role = req.headers.get("x-user-role")?.toUpperCase();
  const userId = req.headers.get("x-user-id");

  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId || !userId) {
    return NextResponse.json({ error: "Company or user required" }, { status: 400 });
  }

  const body = (await req.json()) as {
    type: "SALES_INVOICE" | "PURCHASE_INVOICE" | "PAYMENT_RECEIPT" | "EXPENSE_VOUCHER";
    id: string;
    status: "APPROVED" | "REJECTED";
    remarks?: string;
  };

  const now = new Date();

  if (body.type === "SALES_INVOICE") {
    await prisma.salesInvoice.update({
      where: { id: body.id },
      data: {
        approvalStatus: body.status,
        approvedBy: userId,
        approvedAt: now,
        approvalRemarks: body.remarks || null,
      },
    });
  }

  if (body.type === "PURCHASE_INVOICE") {
    await prisma.purchaseInvoice.update({
      where: { id: body.id },
      data: {
        approvalStatus: body.status,
        approvedBy: userId,
        approvedAt: now,
        approvalRemarks: body.remarks || null,
      },
    });
  }

  if (body.type === "PAYMENT_RECEIPT") {
    await prisma.paymentReceipt.update({
      where: { id: body.id },
      data: {
        approvalStatus: body.status,
        approvedBy: userId,
        approvedAt: now,
        approvalRemarks: body.remarks || null,
      },
    });
  }

  if (body.type === "EXPENSE_VOUCHER") {
    await prisma.expenseVoucher.update({
      where: { id: body.id },
      data: {
        approvalStatus: body.status,
      },
    });
    await prisma.expenseApproval.create({
      data: {
        expenseVoucherId: body.id,
        approverId: userId,
        approvalStatus: body.status,
        remarks: body.remarks || null,
      },
    });
  }

  return NextResponse.json({ success: true });
}
