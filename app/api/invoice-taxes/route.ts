import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const invoiceType = searchParams.get('invoiceType');
    const invoiceId = searchParams.get('invoiceId');

    const filter: Any = { taxConfiguration: { companyId } };
    if (invoiceType) filter.invoiceType = invoiceType;
    if (invoiceId) filter.invoiceId = invoiceId;

    const taxes = await prisma.invoiceTax.findMany({
      where: filter,
      include: {
        taxConfiguration: true,
      },
    });

    return NextResponse.json(taxes);
  } catch (error) {
    console.error('Error fetching invoice taxes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice taxes' },
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

    const body = await req.json();
    const {
      invoiceType,
      invoiceId,
      taxConfigurationId,
      subtotal,
      taxAmount,
      totalAmount,
    } = body;

    const taxConfig = await prisma.taxConfiguration.findFirst({
      where: { id: taxConfigurationId, companyId },
      select: { id: true },
    });
    if (!taxConfig) {
      return NextResponse.json({ error: "Tax configuration not found" }, { status: 404 });
    }

    const tax = await prisma.invoiceTax.create({
      data: {
        invoiceType,
        invoiceId,
        taxConfigurationId,
        subtotal,
        taxAmount,
        totalAmount,
      },
      include: {
        taxConfiguration: true,
      },
    });

    return NextResponse.json(tax, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice tax:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice tax' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    const existing = await prisma.invoiceTax.findFirst({
      where: { id, taxConfiguration: { companyId } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Invoice tax not found" }, { status: 404 });
    }

    if (updateData.taxConfigurationId) {
      const taxConfig = await prisma.taxConfiguration.findFirst({
        where: { id: updateData.taxConfigurationId, companyId },
        select: { id: true },
      });
      if (!taxConfig) {
        return NextResponse.json({ error: "Tax configuration not found" }, { status: 404 });
      }
    }

    const tax = await prisma.invoiceTax.update({
      where: { id },
      data: updateData,
      include: {
        taxConfiguration: true,
      },
    });

    return NextResponse.json(tax);
  } catch (error) {
    console.error('Error updating invoice tax:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice tax' },
      { status: 500 }
    );
  }
}

