import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { logActivity } from "@/lib/audit";

const CATEGORY_TYPE_MAP: Record<string, string> = {
  CUSTOMER: "ASSET",
  SUPPLIER: "LIABILITY",
  BANKS: "ASSET",
  CASH: "ASSET",
  "FIXED ASSETS": "ASSET",
  "ACCUMULATED DEPRECIATION": "CONTRA_ASSET",
  EXPENSE: "EXPENSE",
  INCOME: "INCOME",
  EQUITY: "EQUITY",
  LIABILITIES: "LIABILITY",
  STOCK: "ASSET",
  GENERAL: "ASSET",
  CONTRA: "CONTRA_ASSET",
};

export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role")?.toUpperCase();
  const { searchParams } = new URL(req.url);
  const prefix = searchParams.get("prefix");
  const format = searchParams.get("format") || "json";

  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  if (prefix) {
    const lastAccount = await prisma.account.findFirst({
      where: { code: { startsWith: prefix }, companyId, deletedAt: null },
      orderBy: { code: "desc" },
    });

    let nextNumber = 1;
    if (lastAccount) {
      const match = lastAccount.code.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }

    const nextCode = `${prefix}-${String(nextNumber).padStart(3, "0")}`;
    return NextResponse.json({ nextCode });
  }

  const accounts = await prisma.account.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { name: "asc" },
  });

  if (format === "csv") {
    const header = [
      "code",
      "name",
      "partyType",
      "type",
      "city",
      "phone",
      "openDebit",
      "openCredit",
      "openDate",
      "creditDays",
      "creditLimit",
    ].join(",");
    const rows = accounts.map((a) => [
      JSON.stringify(a.code || ""),
      JSON.stringify(a.name || ""),
      JSON.stringify(a.partyType || ""),
      JSON.stringify(a.type || ""),
      JSON.stringify(a.city || ""),
      JSON.stringify(a.phone || ""),
      a.openDebit ?? "",
      a.openCredit ?? "",
      a.openDate ? new Date(a.openDate).toISOString().slice(0, 10) : "",
      a.creditDays ?? "",
      a.creditLimit ?? "",
    ].join(","));
    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=chart-of-accounts.csv",
      },
    });
  }

  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  try {
    const rawRole = req.headers.get("x-user-role");
    const role = rawRole?.toUpperCase();
    const userId = req.headers.get("x-user-id");

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Only ADMIN can create accounts" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json();

    if (body && body.cleanupStandard === true) {
      const removableCodes = ["BANK002", "AP001", "EXP001", "TAX001"];
      const result = await prisma.account.updateMany({
        where: {
          code: { in: removableCodes },
          companyId,
          voucherEntries: { none: {} },
          salesInvoices: { none: {} },
        },
        data: {
          deletedAt: new Date(),
          deletedBy: userId || null,
        },
      });
      await logActivity(prisma, {
        companyId,
        userId,
        action: "ACCOUNTS_CLEANUP",
        details: `Soft-deleted ${result.count} accounts`,
      });
      return NextResponse.json({ cleaned: result.count });
    }

    if (!body.code || !body.name) {
      return NextResponse.json({ error: "Code and name required" }, { status: 400 });
    }

    const fixedType = CATEGORY_TYPE_MAP[body.partyType] || "ASSET";

    const account = await prisma.account.create({
      data: {
        companyId,
        code: body.code,
        name: body.name,
        type: fixedType,
        partyType: body.partyType || "GENERAL",
        city: body.city || null,
        phone: body.phone || null,
        openDate: body.openDate ? new Date(body.openDate) : new Date(),
        openDebit: Number(body.openDebit || 0),
        openCredit: Number(body.openCredit || 0),
        creditDays: Number(body.creditDays || 0),
        creditLimit: Number(body.creditLimit || 0),
      },
    });

    if (body.partyType === "BANKS") {
      const nameParts = account.name.split(" - ");
      await prisma.bankAccount.create({
        data: {
          companyId,
          accountNo: nameParts[1] || account.code,
          bankName: nameParts[0] || account.name,
          accountName: account.name,
          accountId: account.id,
          balance: Number(body.openDebit || body.openCredit || 0),
        },
      });
    }

    await logActivity(prisma, {
      companyId,
      userId,
      action: "ACCOUNT_CREATED",
      details: `Created account ${account.code} - ${account.name}`,
    });

    return NextResponse.json(account);
  } catch (e) {
    console.error("ACCOUNT CREATE ERROR:", e);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role")?.toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const userId = req.headers.get("x-user-id");

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const fixedType = CATEGORY_TYPE_MAP[updateData.partyType] || undefined;

    const formattedData = {
      ...updateData,
      type: fixedType,
      openDate: updateData.openDate ? new Date(updateData.openDate) : undefined,
      openDebit: updateData.openDebit !== undefined ? Number(updateData.openDebit) : undefined,
      openCredit: updateData.openCredit !== undefined ? Number(updateData.openCredit) : undefined,
      creditDays: updateData.creditDays !== undefined ? Number(updateData.creditDays) : undefined,
      creditLimit: updateData.creditLimit !== undefined ? Number(updateData.creditLimit) : undefined,
    };

    const updated = await prisma.account.updateMany({
      where: { id: id, companyId },
      data: formattedData,
    });

    if (!updated.count) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    const updatedAccount = await prisma.account.findUnique({ where: { id } });

    await logActivity(prisma, {
      companyId,
      userId,
      action: "ACCOUNT_UPDATED",
      details: `Updated account ${id}`,
    });

    return NextResponse.json(updatedAccount);
  } catch (_e) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role")?.toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const userId = req.headers.get("x-user-id");

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.account.updateMany({
      where: { id: id, companyId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId || null,
      },
    });

    await logActivity(prisma, {
      companyId,
      userId,
      action: "ACCOUNT_DELETED",
      details: `Soft-deleted account ${id}`,
    });

    return NextResponse.json({ message: "Deleted" });
  } catch (_e) {
    return NextResponse.json({ error: "Cannot delete. Account in use." }, { status: 500 });
  }
}
