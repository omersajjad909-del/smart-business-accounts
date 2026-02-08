import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";
const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

// GET - List all JVs
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

    const where: any = { type: "JV", companyId };
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

   type VoucherWithEntries = Prisma.VoucherGetPayload<{
  include: {
    entries: {
      include: {
        account: true;
      };
    };
  };
}>;



   const formatted = vouchers.map((v: VoucherWithEntries) => {
  const totalDebit = v.entries.reduce(
    (sum, e) => sum + (e.amount > 0 ? e.amount : 0),
    0
  );

  const totalCredit = v.entries.reduce(
    (sum, e) => sum + (e.amount < 0 ? Math.abs(e.amount) : 0),
    0
  );

  return {
    ...v,
    totalDebit,
    totalCredit,
  };
});



    return NextResponse.json(formatted);
  } catch (e: any) {
    console.error("JV GET Error:", e);
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
      console.error("❌ JV JSON PARSE ERROR:", parseError);
      return NextResponse.json(
        { error: "Invalid request body", details: parseError.message },
        { status: 400 }
      );
    }

    const { entries, date, narration } = requestBody;

    if (!date) {
      return NextResponse.json(
        { error: "Date required" },
        { status: 400 }
      );
    }

    if (!entries || !Array.isArray(entries) || entries.length < 2) {
      return NextResponse.json(
        { error: "At least 2 entries required (Debit & Credit)" },
        { status: 400 }
      );
    }

    // Validate entries
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      const amount = Number(entry.amount);
      if (!entry.accountId || isNaN(amount) || amount === 0) {
        return NextResponse.json(
          { error: "All entries must have valid account and non-zero amount" },
          { status: 400 }
        );
      }

      if (amount > 0) {
        totalDebit += amount;
      } else {
        totalCredit += Math.abs(amount);
      }
    }

    // Double entry validation
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { error: `Debit (${totalDebit}) and Credit (${totalCredit}) must be equal` },
        { status: 400 }
      );
    }

    // Generate voucher number
    const count = await prisma.voucher.count({ where: { type: "JV", companyId } });
    const voucherNo = `JV-${count + 1}`;

    // Create voucher with entries in transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {

      const voucher = await tx.voucher.create({
        data: {
          voucherNo,
          type: "JV",
          date: new Date(date),
          narration: narration || "Journal Entry",
          companyId,
          entries: {
            create: entries.map((entry: any) => ({
              accountId: entry.accountId,
              amount: Number(entry.amount), // +ve = Debit, -ve = Credit
              companyId,
            })),
          },
        },
        include: {
          entries: {
            include: {
              account: true,
            },
          },
        },
      });

      return voucher;
    });

    return NextResponse.json({
      id: result.id,
      voucherNo: result.voucherNo,
      type: result.type,
      date: result.date.toISOString().split('T')[0],
      narration: result.narration,
      entries: result.entries,
      totalDebit,
      totalCredit,
    });
  } catch (e: any) {
    console.error("❌ JV ERROR:", e);
    return NextResponse.json(
      { error: e.message || "JV failed", details: e.code || "Unknown error" },
      { status: 500 }
    );
  }
}

// PUT - Update JV
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
    const { id, entries, date, narration } = body;

    if (!id) {
      return NextResponse.json({ error: "Voucher ID required" }, { status: 400 });
    }

    if (!entries || !Array.isArray(entries) || entries.length < 2) {
      return NextResponse.json({ error: "At least 2 entries required" }, { status: 400 });
    }

    // Validate entries
    let totalDebit = 0;
    let totalCredit = 0;
    for (const entry of entries) {
      const amount = Number(entry.amount);
      if (!entry.accountId || isNaN(amount) || amount === 0) {
        return NextResponse.json({ error: "All entries must have valid account and non-zero amount" }, { status: 400 });
      }
      if (amount > 0) {
        totalDebit += amount;
      } else {
        totalCredit += Math.abs(amount);
      }
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ error: `Debit (${totalDebit}) and Credit (${totalCredit}) must be equal` }, { status: 400 });
    }

    const existing = await prisma.voucher.findUnique({
      where: { id, companyId },
      include: { entries: true },
    });

    if (!existing || existing.type !== "JV") {
      return NextResponse.json({ error: "JV not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {


      await tx.voucherEntry.deleteMany({ where: { voucherId: id, companyId } });

      const voucher = await tx.voucher.update({
        where: { id, companyId },
        data: {
          date: new Date(date),
          narration: narration || "Journal Entry",
          entries: {
            create: entries.map((entry: any) => ({
              accountId: entry.accountId,
              amount: Number(entry.amount),
              companyId,
            })),
          },
        },
        include: {
          entries: {
            include: { account: true },
          },
        },
      });

      return voucher;
    });

    return NextResponse.json({
      id: result.id,
      voucherNo: result.voucherNo,
      date: result.date.toISOString().split("T")[0],
      narration: result.narration,
      entries: result.entries,
      totalDebit,
      totalCredit,
    });
  } catch (e: any) {
    console.error("JV PUT Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE - Delete JV
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

    if (!existing || existing.type !== "JV") {
      return NextResponse.json({ error: "JV not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {

      await tx.voucherEntry.deleteMany({ where: { voucherId: id, companyId } });
      await tx.voucher.delete({ where: { id, companyId } });
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("JV DELETE Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

