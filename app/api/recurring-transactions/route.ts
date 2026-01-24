import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.VIEW_ACCOUNTS
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");

    const where: any = {};
    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const transactions = await prisma.recurringTransaction.findMany({
      where,
      include: { account: true },
      orderBy: { nextDate: "asc" },
    });

    return NextResponse.json(transactions);
  } catch (e: any) {
    console.error("Recurring Transactions GET Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.CREATE_ACCOUNTS
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      accountId,
      type,
      frequency,
      amount,
      description,
      narration,
      nextDate,
      metadata,
    } = body;

    if (!accountId || !type || !frequency || !amount || !nextDate) {
      return NextResponse.json(
        { error: "Required fields missing" },
        { status: 400 }
      );
    }

    const transaction = await prisma.recurringTransaction.create({
      data: {
        accountId,
        type,
        frequency,
        amount: parseFloat(amount),
        description,
        narration: narration || null,
        nextDate: new Date(nextDate),
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      include: { account: true },
    });

    return NextResponse.json(transaction);
  } catch (e: any) {
    console.error("Recurring Transactions POST Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.CREATE_ACCOUNTS
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    if (updateData.nextDate) {
      updateData.nextDate = new Date(updateData.nextDate);
    }
    if (updateData.metadata && typeof updateData.metadata === "object") {
      updateData.metadata = JSON.stringify(updateData.metadata);
    }

    const transaction = await prisma.recurringTransaction.update({
      where: { id },
      data: updateData,
      include: { account: true },
    });

    return NextResponse.json(transaction);
  } catch (e: any) {
    console.error("Recurring Transactions PUT Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.CREATE_ACCOUNTS
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await prisma.recurringTransaction.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Recurring Transactions DELETE Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
