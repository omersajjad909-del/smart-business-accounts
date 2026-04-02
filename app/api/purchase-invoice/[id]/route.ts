import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();
if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId   = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_PURCHASE_INVOICE, companyId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const invoice = await prisma.purchaseInvoice.findFirst({
      where: { id, companyId },
      include: {
        supplier: true,
        items: { include: { item: true } },
      },
    });

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    return NextResponse.json(invoice);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId   = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_PURCHASE_INVOICE, companyId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { status, notes } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};
    if (status !== undefined) data.status = status;
    if (notes  !== undefined) data.notes  = notes;

    const updated = await prisma.purchaseInvoice.update({
      where: { id, companyId },
      data,
    });

    return NextResponse.json(updated);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId   = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_PURCHASE_INVOICE, companyId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.purchaseInvoice.update({
      where: { id, companyId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
