import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { resolveCompanyId } from "@/lib/tenant";
import { getCompanyAdminControlSettings } from "@/lib/companyAdminControl";
import { buildFbrPayload, buildFbrQrPayload, submitToFbr, type FbrInvoiceLine } from "@/lib/fbrEInvoice";
import { logAuditFromReq } from "@/lib/auditLogger";

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

    const settings = await getCompanyAdminControlSettings(companyId);
    if (!settings.fbrSettings.enabled || !settings.fbrSettings.bearerToken) {
      return NextResponse.json(
        { error: "FBR integration is not configured yet. Add your NTN and gateway token in E-Invoice settings first." },
        { status: 400 }
      );
    }

    const inv = await prisma.salesInvoice.findFirst({
      where: { id, companyId },
      include: { customer: true, items: { include: { item: true } } },
    });
    if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (inv.fbrStatus === "FILED") {
      return NextResponse.json({ error: "This invoice is already filed with FBR." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const scenarioId = typeof body?.scenarioId === "string" ? body.scenarioId : inv.fbrScenarioId || undefined;

    const lines: FbrInvoiceLine[] = inv.items.map((line) => {
      const gross = line.qty * line.rate;
      const taxAmount = gross * (line.taxPercent / 100);
      return {
        productDescription: line.item?.name || "Item",
        hsCode: "",
        rateLabel: `${line.taxPercent || 0}%`,
        uoM: line.item?.unit || "PCS",
        quantity: line.qty,
        totalValue: gross,
        valueExcludingTax: gross,
        salesTax: taxAmount,
      };
    });

    const payload = buildFbrPayload(settings.fbrSettings, {
      invoiceDate: new Date(inv.date).toISOString().slice(0, 10),
      invoiceRefNo: inv.invoiceNo,
      buyerNtn: inv.customer?.ntn || undefined,
      buyerBusinessName: inv.customer?.name || "Walk-in Customer",
      buyerProvince: inv.customer?.city || undefined,
      buyerAddress: inv.customer?.address || undefined,
      scenarioId,
      items: lines,
    });

    const result = await submitToFbr(settings.fbrSettings, payload);

    if (!result.ok) {
      const updated = await prisma.salesInvoice.update({
        where: { id: inv.id },
        data: { fbrStatus: "FAILED", fbrResponse: result.raw as any, fbrScenarioId: scenarioId || null },
      });
      await logAuditFromReq(req, { companyId, action: "UPDATE", entity: "SalesInvoice", entityId: inv.id, description: `FBR e-invoice filing failed: ${result.error}` });
      return NextResponse.json({ error: result.error, invoice: updated }, { status: 502 });
    }

    const qrPayload = buildFbrQrPayload({
      sellerNtn: settings.fbrSettings.sellerNtn,
      invoiceNo: inv.invoiceNo,
      fbrInvoiceNo: result.fbrInvoiceNo,
      date: new Date(inv.date).toISOString().slice(0, 10),
      total: inv.total,
    });

    const updated = await prisma.salesInvoice.update({
      where: { id: inv.id },
      data: {
        fbrStatus: "FILED",
        fbrInvoiceNo: result.fbrInvoiceNo,
        fbrIrn: result.irn,
        fbrQrPayload: qrPayload,
        fbrFiledAt: new Date(),
        fbrResponse: result.raw as any,
        fbrScenarioId: scenarioId || null,
      },
    });

    await logAuditFromReq(req, { companyId, action: "UPDATE", entity: "SalesInvoice", entityId: inv.id, description: `Filed with FBR — invoice no. ${result.fbrInvoiceNo}` });

    return NextResponse.json({ invoice: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
