import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditFromReq } from "@/lib/auditLogger";
import { resolveBranchIdOrDefault, resolveCompanyId } from "@/lib/tenant";
import {
  buildTravelSource,
  ensurePartyAccount,
  ensureRevenueAccount,
  ensureServiceItem,
  getNextSalesInvoiceNo,
} from "@/lib/travelAccounting";

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
    const branchId = await resolveBranchIdOrDefault(req, companyId);

    const body = (await req.json()) as { recordId?: string };
    const recordId = String(body.recordId || "").trim();
    if (!recordId) return NextResponse.json({ error: "recordId is required" }, { status: 400 });

    const { record, source } = await buildTravelSource(companyId, recordId);
    const existingData = (record.data || {}) as Record<string, unknown>;
    if (existingData.invoiceId && existingData.invoiceNo) {
      return NextResponse.json({
        success: true,
        invoiceId: String(existingData.invoiceId),
        invoiceNo: String(existingData.invoiceNo),
        reused: true,
      });
    }
    if (!source.customerName) {
      return NextResponse.json({ error: "Passenger or applicant name is required before invoicing" }, { status: 400 });
    }
    if (source.amount <= 0) {
      return NextResponse.json({ error: "Ticket or visa amount must be greater than zero" }, { status: 400 });
    }

    const [customer, item, revenueAccount, invoiceNo] = await Promise.all([
      ensurePartyAccount({ companyId, name: source.customerName, partyType: "CUSTOMER", openDate: source.issueDate }),
      ensureServiceItem(companyId, source.serviceItemName, source.amount),
      ensureRevenueAccount(companyId, source.revenueAccount),
      getNextSalesInvoiceNo(companyId),
    ]);

    const invoice = await prisma.salesInvoice.create({
      data: {
        companyId,
        branchId,
        invoiceNo,
        customerId: customer.id,
        date: source.issueDate,
        dueDate: source.dueDate,
        total: source.amount,
        notes: source.notes,
        reference: source.reference,
        paymentTerms: source.dueDate ? "Credit" : "Cash",
        location: "TRAVEL",
        approvalStatus: "PENDING",
        items: {
          create: [
            {
              itemId: item.id,
              qty: 1,
              rate: source.amount,
              amount: source.amount,
            },
          ],
        },
      },
      include: {
        customer: { select: { id: true, name: true } },
        items: { include: { item: true } },
      },
    });

    await prisma.voucher.create({
      data: {
        companyId,
        branchId,
        voucherNo: invoice.invoiceNo,
        type: "SI",
        date: source.issueDate,
        narration: `${source.invoiceLabel} - ${source.reference}`,
        entries: {
          create: [
            { companyId, accountId: customer.id, amount: source.amount },
            { companyId, accountId: revenueAccount.id, amount: -source.amount },
          ],
        },
      },
    });

    await prisma.businessRecord.update({
      where: { id: record.id },
      data: {
        data: {
          ...existingData,
          customerId: customer.id,
          customerName: customer.name,
          invoiceId: invoice.id,
          invoiceNo: invoice.invoiceNo,
          invoicedAt: new Date().toISOString(),
        },
      },
    });

    await logAuditFromReq(req, {
      companyId,
      entity: "TravelInvoice",
      entityId: invoice.id,
      action: "CREATE",
      afterValues: invoice,
      description: `Created ${source.category === "travel_ticket" ? "travel ticket" : "visa"} invoice ${invoice.invoiceNo}`,
    });

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      customerName: customer.name,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create invoice" },
      { status: 500 },
    );
  }
}
