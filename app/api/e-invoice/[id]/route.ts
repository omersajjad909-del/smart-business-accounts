import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { resolveCompanyId } from "@/lib/tenant";
import { fileSalesInvoiceWithFbr } from "@/lib/fbrEInvoice";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_SALES_INVOICE, companyId);
    if (!allowed) return NextResponse.json({ error: "No Access" }, { status: 403 });

    const inv = await prisma.salesInvoice.findFirst({
      where: { id, companyId },
      include: { customer: true, items: { include: { item: true } } },
    });
    if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(inv);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** Files one invoice with FBR's digital invoicing gateway. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_SALES_INVOICE, companyId);
    if (!allowed) return NextResponse.json({ error: "No Access" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const result = await fileSalesInvoiceWithFbr(companyId, id, {
      saleType: typeof body?.saleType === "string" ? body.saleType : undefined,
      sroScheduleNo: typeof body?.sroScheduleNo === "string" ? body.sroScheduleNo : undefined,
      scenarioId: typeof body?.scenarioId === "string" ? body.scenarioId : undefined,
      userId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error, invoice: result.invoice }, { status: result.httpStatus });
    }
    return NextResponse.json({ invoice: result.invoice });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
