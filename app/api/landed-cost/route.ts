import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

const CATEGORY = "landed_cost";

// GET /api/landed-cost?status=PENDING&invoiceRef=PI-001
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const status     = searchParams.get("status");
    const invoiceRef = searchParams.get("invoiceRef");

    const where: Record<string, unknown> = { companyId, category: CATEGORY };
    if (status) where.status = status;

    const records = await prisma.businessRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const entries = records
      .filter(r => !invoiceRef || (r.data as Record<string, unknown>)?.invoiceRef === invoiceRef)
      .map(r => {
        const d = r.data as Record<string, unknown>;
        return {
          id:          r.id,
          ref:         r.title,
          invoiceRef:  (d.invoiceRef  as string) || null,
          freight:     Number(d.freight)  || 0,
          customs:     Number(d.customs)  || 0,
          handling:    Number(d.handling) || 0,
          other:       Number(d.other)    || 0,
          total:       r.amount           || 0,
          allocatedTo: (d.allocatedTo as string) || null,
          status:      r.status           || "PENDING",
          date:        r.date             || r.createdAt,
        };
      });

    // Summary totals
    const summary = {
      totalEntries:    entries.length,
      pending:         entries.filter(e => e.status === "PENDING").length,
      allocated:       entries.filter(e => e.status === "ALLOCATED").length,
      totalLandedCost: entries.reduce((s, e) => s + e.total, 0),
    };

    return NextResponse.json({ entries, summary });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/landed-cost — create a new landed cost entry
export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json();
    const { ref, invoiceRef, freight, customs, handling, other } = body;
    if (!ref?.trim()) return NextResponse.json({ error: "ref is required" }, { status: 400 });

    const total = (Number(freight) || 0) + (Number(customs) || 0) +
                  (Number(handling) || 0) + (Number(other) || 0);
    if (total <= 0) return NextResponse.json({ error: "At least one cost component must be > 0" }, { status: 400 });

    const record = await prisma.businessRecord.create({
      data: {
        companyId,
        category:    CATEGORY,
        title:       ref.trim(),
        status:      "PENDING",
        amount:      total,
        data: {
          invoiceRef:  invoiceRef?.trim() || null,
          freight:     Number(freight)  || 0,
          customs:     Number(customs)  || 0,
          handling:    Number(handling) || 0,
          other:       Number(other)    || 0,
          allocatedTo: null,
        },
      },
    });

    return NextResponse.json({ success: true, entry: record }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/landed-cost — update status or allocatedTo
// Body: { id, status?, allocatedTo? }
export async function PATCH(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { id, status, allocatedTo } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await prisma.businessRecord.findFirst({
      where: { id, companyId, category: CATEGORY },
    });
    if (!existing) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    const currentData = (existing.data as Record<string, unknown>) || {};
    const record = await prisma.businessRecord.update({
      where: { id },
      data: {
        ...(status      && { status }),
        data: {
          ...currentData,
          ...(allocatedTo !== undefined && { allocatedTo }),
        },
      },
    });

    return NextResponse.json({ success: true, entry: record });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/landed-cost?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await prisma.businessRecord.findFirst({
      where: { id, companyId, category: CATEGORY },
    });
    if (!existing) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    await prisma.businessRecord.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
