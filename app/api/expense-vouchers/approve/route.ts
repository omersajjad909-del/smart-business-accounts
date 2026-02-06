import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

// Approve or reject expense voucher
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.CREATE_ACCOUNTS,
      companyId
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { voucherId, action, remarks } = body; // action: APPROVE | REJECT

    if (!voucherId || !action) {
      return NextResponse.json(
        { error: "Voucher ID and action required" },
        { status: 400 }
      );
    }

    const voucher = await prisma.expenseVoucher.findFirst({
      where: { id: voucherId, companyId },
    });

    if (!voucher) {
      return NextResponse.json(
        { error: "Voucher not found" },
        { status: 404 }
      );
    }

    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    // Update voucher status
    const updated = await prisma.expenseVoucher.update({
      where: { id: voucherId },
      data: {
        approvalStatus: newStatus,
      },
    });

    // If approved, create accounting entries
    if (action === "APPROVE") {
      // Create voucher entry
      await prisma.voucher.create({
        data: {
          voucherNo: voucher.voucherNo,
          type: "EXPENSE",
          date: voucher.date,
          narration: voucher.description || "Expense Voucher",
          companyId,
          entries: {
            create: [
              {
                accountId: voucher.expenseAccountId,
                amount: voucher.totalAmount,
                companyId,
              },
              {
                accountId: voucher.paymentAccountId,
                amount: -voucher.totalAmount,
                companyId,
              },
            ],
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      voucher: updated,
    });
  } catch (e: Any) {
    console.error("Expense Approval Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

