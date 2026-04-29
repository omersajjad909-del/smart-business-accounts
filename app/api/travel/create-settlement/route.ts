import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditFromReq } from "@/lib/auditLogger";
import { resolveCompanyId } from "@/lib/tenant";
import { buildTravelSource, ensurePartyAccount } from "@/lib/travelAccounting";

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = (await req.json()) as { recordId?: string };
    const recordId = String(body.recordId || "").trim();
    if (!recordId) return NextResponse.json({ error: "recordId is required" }, { status: 400 });

    const { record, source } = await buildTravelSource(companyId, recordId);
    const existingData = (record.data || {}) as Record<string, unknown>;
    if (existingData.settlementId && existingData.settlementRef) {
      return NextResponse.json({
        success: true,
        settlementId: String(existingData.settlementId),
        settlementRef: String(existingData.settlementRef),
        reused: true,
      });
    }
    if (!source.supplierName) {
      return NextResponse.json({ error: "Supplier or airline name is required before settlement" }, { status: 400 });
    }
    if (source.costAmount <= 0) {
      return NextResponse.json({ error: "Supplier cost must be greater than zero before settlement" }, { status: 400 });
    }

    const supplier = await ensurePartyAccount({
      companyId,
      name: source.supplierName,
      partyType: "SUPPLIER",
      openDate: source.issueDate,
    });

    const settlementRef = `SET-${record.title}`;
    const settlement = await prisma.businessRecord.create({
      data: {
        companyId,
        branchId: record.branchId || null,
        category: "travel_settlement",
        title: settlementRef,
        status: "pending",
        refId: record.id,
        amount: source.costAmount,
        date: source.dueDate || source.issueDate,
        data: {
          sourceCategory: source.category,
          sourceTitle: source.title,
          sourceRecordId: record.id,
          supplierId: supplier.id,
          supplierName: supplier.name,
          customerName: source.customerName,
          invoiceNo: String(existingData.invoiceNo || ""),
          route: String(source.data.route || ""),
          country: String(source.data.country || ""),
          remarks: source.notes,
        },
      },
    });

    await prisma.businessRecord.update({
      where: { id: record.id },
      data: {
        data: {
          ...existingData,
          supplierId: supplier.id,
          supplierName: supplier.name,
          settlementId: settlement.id,
          settlementRef,
          settlementCreatedAt: new Date().toISOString(),
        },
      },
    });

    await logAuditFromReq(req, {
      companyId,
      entity: "TravelSettlement",
      entityId: settlement.id,
      action: "CREATE",
      afterValues: settlement,
      description: `Created travel settlement ${settlementRef}`,
    });

    return NextResponse.json({
      success: true,
      settlementId: settlement.id,
      settlementRef,
      supplierName: supplier.name,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create settlement" },
      { status: 500 },
    );
  }
}
