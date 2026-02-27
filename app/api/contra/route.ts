import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { logActivity } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.VIEW_ACCOUNTING, companyId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const vouchers = await prisma.voucher.findMany({
      where: {
        type: "CONTRA",
        companyId,
      },
      include: {
        entries: {
          include: {
            account: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    const formatted = vouchers.map((v) => {
      const fromEntry = v.entries.find((e) => e.amount < 0);
      const toEntry = v.entries.find((e) => e.amount > 0);

      return {
        id: v.id,
        contraNumber: v.voucherNo,
        date: v.date.toISOString().split("T")[0],
        amount: toEntry ? toEntry.amount : 0,
        narration: v.narration,
        fromAccount: fromEntry ? fromEntry.account : null,
        toAccount: toEntry ? toEntry.account : null,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error fetching contra entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch contra entries" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const userRole = req.headers.get("x-user-role");
    const userId = req.headers.get("x-user-id");

    const body = await req.json();
    const { date, fromAccountId, toAccountId, amount, narration } = body;

    if (!date || !fromAccountId || !toAccountId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json(
        { error: "Source and destination accounts cannot be the same" },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Generate voucher number
    const count = await prisma.voucher.count({
      where: { type: "CONTRA", companyId },
    });
    const voucherNo = `CNT-${String(count + 1).padStart(4, "0")}`;

    // Find linked bank accounts
    const fromBankAccount = await prisma.bankAccount.findFirst({
      where: { accountId: fromAccountId, companyId },
    });

    const toBankAccount = await prisma.bankAccount.findFirst({
      where: { accountId: toAccountId, companyId },
    });

    // Execute transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Voucher
      const voucher = await tx.voucher.create({
        data: {
          companyId,
          type: "CONTRA",
          voucherNo,
          date: new Date(date),
          narration: narration || "Contra Entry",
          entries: {
            create: [
              {
                companyId,
                accountId: fromAccountId, // Credit (Giving)
                amount: -numAmount,
              },
              {
                companyId,
                accountId: toAccountId, // Debit (Receiving)
                amount: numAmount,
              },
            ],
          },
        },
      });

      // 2. Update From Account (if Bank)
      if (fromBankAccount) {
        await tx.bankAccount.update({
          where: { id: fromBankAccount.id },
          data: { balance: { decrement: numAmount } },
        });

        await tx.bankStatement.create({
          data: {
            bankAccountId: fromBankAccount.id,
            statementNo: `STMT-${Date.now()}-1`,
            date: new Date(date),
            amount: -numAmount,
            description: narration || `Transfer to ${toBankAccount?.accountName || "Cash/Account"}`,
            referenceNo: voucherNo,
            isReconciled: false,
          },
        });
      }

      // 3. Update To Account (if Bank)
      if (toBankAccount) {
        await tx.bankAccount.update({
          where: { id: toBankAccount.id },
          data: { balance: { increment: numAmount } },
        });

        await tx.bankStatement.create({
          data: {
            bankAccountId: toBankAccount.id,
            statementNo: `STMT-${Date.now()}-2`,
            date: new Date(date),
            amount: numAmount,
            description: narration || `Received from ${fromBankAccount?.accountName || "Cash/Account"}`,
            referenceNo: voucherNo,
            isReconciled: false,
          },
        });
      }

      return voucher;
    });

    await logActivity(prisma, {
      companyId,
      userId,
      action: "CREATE_CONTRA",
      details: `Created Contra ${voucherNo} for ${numAmount}`,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error creating contra entry:", error);
    return NextResponse.json(
      { error: "Failed to create contra entry", details: error.message },
      { status: 500 }
    );
  }
}
