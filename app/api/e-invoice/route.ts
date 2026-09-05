import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";
import { getCompanyAdminControlSettings } from "@/lib/companyAdminControl";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.CREATE_SALES_INVOICE, companyId);
    if (!allowed) return NextResponse.json({ error: "No Access" }, { status: 403 });

    const branchId = await resolveBranchId(req, companyId);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // NOT_FILED | FILED | FAILED

    const invoices = await prisma.salesInvoice.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
        ...(status ? { fbrStatus: status } : {}),
      },
      select: {
        id: true,
        invoiceNo: true,
        date: true,
        total: true,
        fbrStatus: true,
        fbrInvoiceNo: true,
        fbrIrn: true,
        fbrFiledAt: true,
        customer: { select: { id: true, name: true, ntn: true, strn: true, city: true, address: true } },
      },
      orderBy: { date: "desc" },
      take: 500,
    });

    const settings = await getCompanyAdminControlSettings(companyId);

    return NextResponse.json({
      invoices,
      fbrConfigured: Boolean(settings.fbrSettings.enabled && settings.fbrSettings.bearerToken),
      environment: settings.fbrSettings.environment,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
