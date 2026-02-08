import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

// Bulk payment processing
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
    const { payments, date, narration } = body;

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json(
        { error: "Payments array required" },
        { status: 400 }
      );
    }

    const results = [];

    for (const payment of payments) {
      try {
        const { accountId, bankAccountId, paymentMode: _paymentMode, amount } = payment;

        if (!accountId || !amount || !date) {
          results.push({
            accountId,
            status: "error",
            error: "Missing required fields",
          });
          continue;
        }

        // Generate voucher number
        const count = await prisma.voucher.count({ where: { type: "CPV", companyId } });
        const voucherNo = `CPV-${count + 1}`;

        const account = await prisma.account.findFirst({
          where: { id: accountId, companyId },
          select: { id: true },
        });
        if (!account) {
          results.push({
            accountId,
            status: "error",
            error: "Account not found",
          });
          continue;
        }

        if (bankAccountId) {
          const bankAccount = await prisma.bankAccount.findFirst({
            where: { id: bankAccountId, companyId },
            select: { id: true },
          });
          if (!bankAccount) {
            results.push({
              accountId,
              status: "error",
              error: "Bank account not found",
            });
            continue;
          }
        }

        // Create voucher
        const voucher = await prisma.voucher.create({
          data: {
            voucherNo,
            type: "CPV",
            date: new Date(date),
            narration: narration || `Bulk payment - ${payment.accountId}`,
            companyId,
            entries: {
              create: [
                {
                  accountId,
                  amount: -parseFloat(amount),
                  companyId,
                },
                {
                  accountId: bankAccountId || accountId,
                  amount: parseFloat(amount),
                  companyId,
                },
              ],
            },
          },
        });

        results.push({
          accountId,
          voucherNo,
          status: "success",
          voucherId: voucher.id,
        });
      } catch (error: any) {
        results.push({
          accountId: payment.accountId,
          status: "error",
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (e: any) {
    console.error("Bulk Payments Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
