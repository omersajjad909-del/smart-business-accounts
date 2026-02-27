import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";


const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

// GET - List all CRVs
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_CRV, companyId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: any = { type: "CRV", companyId };
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

    // Format vouchers
    const formatted = vouchers.map((v: any) => {
      const receiptEntry = v.entries.find((e: any) => e.amount > 0);
      const customerEntry = v.entries.find((e: any) => e.amount < 0);
      return {
        id: v.id,
        voucherNo: v.voucherNo,
        date: v.date.toISOString().split("T")[0],
        narration: v.narration,
        accountName: customerEntry?.account?.name || "N/A",
        accountId: customerEntry?.accountId || "",
        amount: Math.abs(customerEntry?.amount || 0),
        paymentMode: receiptEntry?.account?.name?.toLowerCase().includes("cash") ? "CASH" : "BANK",
        paymentAccountId: receiptEntry?.accountId || "",
      };
    });

    return NextResponse.json(formatted);
  } catch (e: any) {
    console.error("CRV GET Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const companyId = await resolveCompanyId(req as NextRequest);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const userId = (req as any).headers.get("x-user-id");
    const userRole = (req as any).headers.get("x-user-role");
    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_CRV, companyId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError: any) {
      console.error("❌ CRV JSON PARSE ERROR:", parseError);
      return NextResponse.json(
        { error: "Invalid request body", details: parseError.message },
        { status: 400 }
      );
    }

    const { accountId, bankAccountId, paymentMode, amount, date, narration } = requestBody;

    // Debug logging
    console.log("🔥 CRV REQUEST:", { accountId, bankAccountId, paymentMode, amount, date, narration });

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
        { error: "Bank account required for bank receipt" },
        { status: 400 }
      );
    }

    const customer = await prisma.account.findUnique({
      where: { id: accountId, companyId },
    });

    // CRV = Cash Receipt Voucher = CUSTOMER سے روپے وصول
    // تو یہاں CUSTOMER ہی چاہیے
    if (!customer || (customer.partyType && customer.partyType !== "CUSTOMER")) {
      return NextResponse.json(
        { error: "CRV sirf Customer ke liye hota hai" },
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

    const count = await prisma.voucher.count({ where: { type: "CRV", companyId } });
    const voucherNo = `CRV-${count + 1}`;
    const receiptAmount = Math.abs(amountNum); // Use already validated amountNum

    console.log("🔥 CREATING CRV:", { voucherNo, receiptAmount, customerId: customer.id, paymentAccountId: paymentAccount.id });

    // Create voucher and update bank balance in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // CRV = Cash Receipt Voucher (روپے وصول)
      // Customer سے روپے آ رہے ہیں
      // 
      // Ledger میں:
      // - Customer: CREDIT (-) کیونکہ وہ ہمیں ادا کر رہے ہیں
      // - Bank/Cash: DEBIT (+) کیونکہ روپے ہم میں آ رہے ہیں

      const voucher = await tx.voucher.create({
        data: {
          voucherNo,
          type: "CRV",
          date: new Date(date),
          narration: narration || `${paymentMode === "BANK" ? "Bank" : "Cash"} received`,
          companyId,
          entries: {
            create: [
              { accountId: customer.id, amount: -receiptAmount, companyId },      // Customer CREDIT (-)
              { accountId: paymentAccount.id, amount: receiptAmount, companyId }, // Bank/Cash DEBIT (+)
            ],
          },
        },
      });

      console.log("🔥 CRV CREATED:", { voucherId: voucher.id, voucherNo, entries: voucher.entries });

      // If bank receipt, update bank balance and create statement
      if (paymentMode === "BANK" && bankAccountRecord) {
        // Update bank balance (increase)
        await tx.bankAccount.update({
          where: { id: bankAccountRecord.id },
          data: {
            balance: { increment: receiptAmount },
          },
        });

        // Create bank statement
        await tx.bankStatement.create({
          data: {
            bankAccountId: bankAccountRecord.id,
            statementNo: `STMT-${Date.now()}`,
            date: new Date(date),
            amount: receiptAmount, // Positive for receipt
            description: narration || `Receipt from ${customer.name}`,
            referenceNo: voucherNo,
            isReconciled: false,
            companyId,
          },
        });
      }

      return voucher;
    });

    // 2. واؤچر کی تفصیلات اور اکاؤنٹ (فون/نام) کو شامل کرنا
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
      console.error("❌ CRV: Voucher not found after creation:", result.id);
      return NextResponse.json(
        { error: "Voucher created but could not be retrieved" },
        { status: 500 }
      );
    }

    // 3. فرنٹ اینڈ کے لیے ڈیٹا تیار کرنا
    const responseData = {
      id: fullVoucher.id,
      voucherNo: fullVoucher.voucherNo,
      type: fullVoucher.type,
      date: fullVoucher.date.toISOString().split('T')[0], // Format date
      narration: fullVoucher.narration,
      entries: fullVoucher.entries,
      accountName: customer.name,
      phone: customer.phone,
      amount: receiptAmount, // Use parsed amount
      paymentMode: paymentMode || "CASH",
    };

    console.log("🔥 CRV RESPONSE:", {
      voucherId: responseData.id,
      voucherNo: responseData.voucherNo,
      amount: responseData.amount,
      entries: responseData.entries?.length,
      hasEntries: !!responseData.entries
    });

    return NextResponse.json(responseData);

  } catch (e: any) {
    console.error("❌ CRV ERROR:", e);
    console.error("❌ CRV ERROR DETAILS:", {
      message: e.message,
      stack: e.stack,
      code: e.code,
    });
    return NextResponse.json(
      { error: e.message || "CRV failed", details: e.code || "Unknown error" },
      { status: 500 }
    );
  }
}

// PUT - Update CRV
export async function PUT(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_CRV, companyId);
    if (!allowed) {
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

    if (!existing || existing.type !== "CRV") {
      return NextResponse.json({ error: "CRV not found" }, { status: 404 });
    }

    const customer = await prisma.account.findUnique({ where: { id: accountId, companyId } });
    if (!customer || customer.partyType !== "CUSTOMER") {
      return NextResponse.json({ error: "Customer not found" }, { status: 400 });
    }

    // Find payment account
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

    const receiptAmount = Math.abs(amountNum);
    const oldAmount = Math.abs(existing.entries.find((e: any) => e.amount < 0)?.amount || 0);

    const result = await prisma.$transaction(async (tx: any) => {
      await tx.voucherEntry.deleteMany({ where: { voucherId: id, companyId } });

      const voucher = await tx.voucher.update({
        where: { id, companyId },
        data: {
          date: new Date(date),
          narration: narration || `${paymentMode === "BANK" ? "Bank" : "Cash"} received`,
          entries: {
            create: [
              { accountId: customer.id, amount: -receiptAmount, companyId },
              { accountId: paymentAccount.id, amount: receiptAmount, companyId },
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
        const balanceDiff = receiptAmount - oldAmount;
        await tx.bankAccount.update({
          where: { id: bankAccountRecord.id },
          data: { balance: { increment: balanceDiff } },
        });
      }

      return voucher;
    });

    return NextResponse.json({
      id: result.id,
      voucherNo: result.voucherNo,
      date: result.date.toISOString().split("T")[0],
      narration: result.narration,
      accountName: customer.name,
      amount: receiptAmount,
      paymentMode: paymentMode || "CASH",
    });
  } catch (e: any) {
    console.error("CRV PUT Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE - Delete CRV
export async function DELETE(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_CRV, companyId);
    if (!allowed) {
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

    if (!existing || existing.type !== "CRV") {
      return NextResponse.json({ error: "CRV not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.voucherEntry.deleteMany({ where: { voucherId: id, companyId } });
      await tx.voucher.delete({ where: { id, companyId } });
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("CRV DELETE Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
