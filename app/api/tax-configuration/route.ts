import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get('isActive');

    const filter: any = {};
    if (isActive !== null) filter.isActive = isActive === 'true';

    const taxes = await prisma.taxConfiguration.findMany({
      where: filter,
      include: {
        taxAccounts: { include: { account: true } },
        invoiceTaxes: true,
      },
    });

    return NextResponse.json(taxes);
  } catch (error) {
    console.error('Error fetching tax configurations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax configurations' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taxType, taxCode, taxRate, description } = body;

    const tax = await prisma.taxConfiguration.create({
      data: {
        taxType,
        taxCode,
        taxRate,
        description,
        isActive: true,
      },
      include: {
        taxAccounts: { include: { account: true } },
      },
    });

    return NextResponse.json(tax, { status: 201 });
  } catch (error) {
    console.error('Error creating tax configuration:', error);
    return NextResponse.json(
      { error: 'Failed to create tax configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!role || (role !== "ADMIN" && role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    const tax = await prisma.taxConfiguration.update({
      where: { id },
      data: updateData,
      include: {
        taxAccounts: { include: { account: true } },
      },
    });

    return NextResponse.json(tax);
  } catch (error) {
    console.error('Error updating tax configuration:', error);
    return NextResponse.json(
      { error: 'Failed to update tax configuration' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!role || (role !== "ADMIN" && role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID required' },
        { status: 400 }
      );
    }

    await prisma.taxConfiguration.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tax configuration:', error);
    return NextResponse.json(
      { error: 'Failed to delete tax configuration' },
      { status: 500 }
    );
  }
}