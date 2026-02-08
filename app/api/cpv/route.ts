import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

// GET - List all CPVs
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: any = { type: "CPV", companyId };
    if (from && to) {
      where.date = {
        gte: new Date(from + "T00:00:00"),
        lte: new Date(to + "T23:59:59"),
      };
    }

    const vouchers = await prisma.voucher.findMany({
      where,
      include: {
        entries: {
          include: {
            account: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Format vouchers with account names
    const formatted = vouchers.map((v: any) => {
      const paymentEntry = v.entries.find((e: any) => e.amount < 0);
      const accountEntry = v.entries.find((e: any) => e.amount > 0);
      return {
        id: v.id,
        voucherNo: v.voucherNo,
        date: v.date.toISOString().split("T")[0],
        narration: v.narration,
        accountName: accountEntry?.account?.name || "N/A",
        accountId: accountEntry?.accountId || "",
        amount: Math.abs(accountEntry?.amount || 0),
        paymentMode: paymentEntry?.account?.name?.toLowerCase().includes("cash") ? "CASH" : "BANK",
        paymentAccountId: paymentEntry?.accountId || "",
      };
    });

    return NextResponse.json(formatted);
  } catch (e: any) {
    console.error("CPV GET Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const companyId = await resolveCompanyId(req as NextRequest);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError: any) {
      console.error("❌ CPV JSON PARSE ERROR:", parseError);
      return NextResponse.json(
        { error: "Invalid request body", details: parseError.message },
        { status: 400 }
      );
    }

    const { accountId, bankAccountId, paymentMode, amount, date, narration } = requestBody;

    // Debug logging
    console.log("🔥 CPV REQUEST:", { accountId, bankAccountId, paymentMode, amount, date, narration });

    // Validate amount properly
    const amountNum = Number(amount);
    console.log("🔥 AMOUNT PARSED:", { original: amount, parsed: amountNum, isValid: !isNaN(amountNum) && amountNum > 0 });

    if (!accountId || !date) {
      return NextResponse.json(
        { error: "Account & date required" },
        { status: 400 }
      );
    }

    if (!amount || amount === "" || isNaN(amountNum) || amountNum <= 0) {
      console.error("❌ INVALID AMOUNT:", { amount, amountNum, isNaN: isNaN(amountNum) });
      return NextResponse.json(
        { error: `Valid amount required (must be greater than 0). Received: ${amount}` },
        { status: 400 }
      );
    }

    if (paymentMode === "BANK" && !bankAccountId) {
      return NextResponse.json(
        { error: "Bank account required for bank payment" },
        { status: 400 }
      );
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId, companyId },
    });

    if (!account || account.partyType === "CUSTOMER") {
      return NextResponse.json(
        { error: "CPV sirf Supplier / Bank / Expense ke liye hota hai" },
        { status: 400 }
      );
    }

    // Find payment account (Cash or Bank)
    let paymentAccount;
    let bankAccountRecord = null;
    if (paymentMode === "BANK") {
      // First find BankAccount record (bankAccountId is BankAccount table ID)
      bankAccountRecord = await prisma.bankAccount.findUnique({
        where: { id: bankAccountId, companyId },
        include: { account: true },
      });

      if (!bankAccountRecord) {
        // If not found in BankAccount, try to find in Account table
        const accountFromTable = await prisma.account.findUnique({
          where: { id: bankAccountId, companyId },
        });

        if (!accountFromTable || accountFromTable.partyType !== "BANKS") {
          return NextResponse.json(
            { error: "Bank account not found" },
            { status: 400 }
          );
        }

        // Create BankAccount entry from Account
        const nameParts = accountFromTable.name.split(" - ");
        const bankName = nameParts[0] || accountFromTable.name;
        const accountNo = nameParts[1] || accountFromTable.code;

        bankAccountRecord = await prisma.bankAccount.create({
          data: {
            accountNo: accountNo,
            bankName: bankName,
            accountName: accountFromTable.name,
            accountId: accountFromTable.id,
            balance: accountFromTable.openDebit || 0,
            companyId,
          },
          include: { account: true },
        });
      }

      // Get payment account from BankAccount's linked account
      paymentAccount = bankAccountRecord.account;
      if (!paymentAccount) {
        return NextResponse.json(
          { error: "Bank account linked account not found" },
          { status: 400 }
        );
      }
    } else {
      paymentAccount = await prisma.account.findFirst({
        where: { name: { equals: "Cash in hand", mode: "insensitive" }, companyId },
      });

      if (!paymentAccount) {
        return NextResponse.json(
          { error: "Cash account not found" },
          { status: 400 }
        );
      }
    }

    const count = await prisma.voucher.count({ where: { type: "CPV", companyId } });
    const voucherNo = `CPV-${count + 1}`;
    const paymentAmount = Math.abs(amountNum); // Use already validated amountNum

    console.log("🔥 CREATING CPV:", { voucherNo, paymentAmount, accountId: account.id, paymentAccountId: paymentAccount.id });

    // Create voucher and update bank balance in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // CPV = Cash Payment Voucher (روپے ادا کرنا)
      // Supplier/Expense کو روپے دے رہے ہیں
      //
      // Ledger میں:
      // - Supplier/Expense: DEBIT (+) کیونکہ ہمیں ادا کرنا ہے
      // - Bank/Cash: CREDIT (-) کیونکہ روپے ہم سے نکل رہے ہیں
      
      const voucher = await tx.voucher.create({
        data: {
          voucherNo,
          type: "CPV",
          date: new Date(date),
          narration: narration || `${paymentMode === "BANK" ? "Bank" : "Cash"} payment`,
          companyId,
          entries: {
            create: [
              { accountId: account.id, amount: paymentAmount, companyId },        // Supplier/Expense DEBIT (+)
              { accountId: paymentAccount.id, amount: -paymentAmount, companyId }, // Bank/Cash CREDIT (-)
            ],
          },
        },
      });

      console.log("🔥 CPV CREATED:", { voucherId: voucher.id, voucherNo, entries: voucher.entries });

      // If bank payment, update bank balance and create statement
      if (paymentMode === "BANK" && bankAccountRecord) {
        // Update bank balance (decrease)
        await tx.bankAccount.update({
          where: { id: bankAccountRecord.id },
          data: {
            balance: { decrement: paymentAmount },
          },
        });

        // Create bank statement
        await tx.bankStatement.create({
          data: {
            bankAccountId: bankAccountRecord.id,
            statementNo: `STMT-${Date.now()}`,
            date: new Date(date),
            amount: -paymentAmount, // Negative for payment
            description: narration || `Payment to ${account.name}`,
            referenceNo: voucherNo,
            isReconciled: false,
            companyId,
          },
        });
      }

      return voucher;
    });

    // Fetch complete voucher with entries
    const fullVoucher = await prisma.voucher.findUnique({
      where: { id: result.id, companyId },
      include: {
        entries: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!fullVoucher) {
      console.error("❌ CPV: Voucher not found after creation:", result.id);
      return NextResponse.json(
        { error: "Voucher created but could not be retrieved" },
        { status: 500 }
      );
    }

    // 🔥 یہ حصہ واٹس ایپ کے لیے ڈیٹا تیار کرتا ہے
    const responseData = {
      id: fullVoucher.id,
      voucherNo: fullVoucher.voucherNo,
      type: fullVoucher.type,
      date: fullVoucher.date.toISOString().split('T')[0], // Format date
      narration: fullVoucher.narration,
      entries: fullVoucher.entries,
      accountName: account.name,
      phone: account.phone,
      amount: paymentAmount, // Use parsed amount
      paymentMode: paymentMode || "CASH",
    };

    console.log("🔥 CPV RESPONSE:", { 
      voucherId: responseData.id, 
      voucherNo: responseData.voucherNo,
      amount: responseData.amount, 
      entries: responseData.entries?.length,
      hasEntries: !!responseData.entries 
    });

    return NextResponse.json(responseData);
  } catch (e: any) {
    console.error("❌ CPV ERROR:", e);
    console.error("❌ CPV ERROR DETAILS:", {
      message: e.message,
      stack: e.stack,
      code: e.code,
    });
    return NextResponse.json(
      { error: e.message || "CPV failed", details: e.code || "Unknown error" },
      { status: 500 }
    );
  }
}

// PUT - Update CPV
export async function PUT(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, accountId, bankAccountId, paymentMode, amount, date, narration } = body;

    if (!id) {
      return NextResponse.json({ error: "Voucher ID required" }, { status: 400 });
    }

    const amountNum = Number(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "Valid amount required" }, { status: 400 });
    }

    const existing = await prisma.voucher.findUnique({
      where: { id, companyId },
      include: { entries: true },
    });

    if (!existing || existing.type !== "CPV") {
      return NextResponse.json({ error: "CPV not found" }, { status: 404 });
    }

    const account = await prisma.account.findUnique({ where: { id: accountId, companyId } });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 400 });
    }

    let paymentAccount;
    let bankAccountRecord = null;
    if (paymentMode === "BANK" && bankAccountId) {
      bankAccountRecord = await prisma.bankAccount.findUnique({
        where: { id: bankAccountId, companyId },
        include: { account: true },
      });
      if (!bankAccountRecord) {
        const accountFromTable = await prisma.account.findUnique({
          where: { id: bankAccountId, companyId },
        });
        if (accountFromTable && accountFromTable.partyType === "BANKS") {
          const nameParts = accountFromTable.name.split(" - ");
          bankAccountRecord = await prisma.bankAccount.create({
            data: {
              accountNo: nameParts[1] || accountFromTable.code,
              bankName: nameParts[0] || accountFromTable.name,
              accountName: accountFromTable.name,
              accountId: accountFromTable.id,
              balance: accountFromTable.openDebit || 0,
              companyId,
            },
            include: { account: true },
          });
        }
      }
      paymentAccount = bankAccountRecord?.account;
    } else {
      paymentAccount = await prisma.account.findFirst({
        where: { name: { equals: "Cash in hand", mode: "insensitive" }, companyId },
      });
    }

    if (!paymentAccount) {
      return NextResponse.json({ error: "Payment account not found" }, { status: 400 });
    }

    const paymentAmount = Math.abs(amountNum);
    const oldAmount = Math.abs(existing.entries.find((e: any) => e.amount > 0)?.amount || 0);

    const result = await prisma.$transaction(async (tx: any) => {
      await tx.voucherEntry.deleteMany({ where: { voucherId: id, companyId } });

      const voucher = await tx.voucher.update({
        where: { id, companyId },
        data: {
          date: new Date(date),
          narration: narration || `${paymentMode === "BANK" ? "Bank" : "Cash"} payment`,
          entries: {
            create: [
              { accountId: account.id, amount: paymentAmount, companyId },
              { accountId: paymentAccount.id, amount: -paymentAmount, companyId },
            ],
          },
        },
        include: {
          entries: {
            include: { account: true },
          },
        },
      });

      if (paymentMode === "BANK" && bankAccountRecord) {
        const balanceDiff = paymentAmount - oldAmount;
        await tx.bankAccount.update({
          where: { id: bankAccountRecord.id },
          data: { balance: { decrement: balanceDiff } },
        });
      }

      return voucher;
    });

    return NextResponse.json({
      id: result.id,
      voucherNo: result.voucherNo,
      date: result.date.toISOString().split("T")[0],
      narration: result.narration,
      accountName: account.name,
      amount: paymentAmount,
      paymentMode: paymentMode || "CASH",
    });
  } catch (e: any) {
    console.error("CPV PUT Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE - Delete CPV
export async function DELETE(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Voucher ID required" }, { status: 400 });
    }

    const existing = await prisma.voucher.findUnique({
      where: { id, companyId },
      include: { entries: true },
    });

    if (!existing || existing.type !== "CPV") {
      return NextResponse.json({ error: "CPV not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx: any) => {
      // Revert bank balance if applicable
      const creditEntry = existing.entries.find((e: any) => e.amount < 0);
      if (creditEntry) {
        const bankAccount = await tx.bankAccount.findFirst({
          where: { accountId: creditEntry.accountId, companyId },
        });

        if (bankAccount) {
          await tx.bankAccount.update({
            where: { id: bankAccount.id },
            data: { balance: { increment: Math.abs(creditEntry.amount) } },
          });

          await tx.bankStatement.deleteMany({
            where: { referenceNo: existing.voucherNo, companyId },
          });
        }
      }

      await tx.voucherEntry.deleteMany({ where: { voucherId: id, companyId } });
      await tx.voucher.delete({ where: { id, companyId } });
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("CPV DELETE Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
