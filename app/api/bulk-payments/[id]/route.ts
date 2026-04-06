import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getCompanyId(req: NextRequest) {
  return req.headers.get("x-company-id");
}

// POST /api/bulk-payments/[id] — add a row to a batch
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const companyId = getCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batch = await (prisma as any).bulkPaymentBatch.findFirst({
    where: { id, companyId },
  });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  const body = await req.json();
  const { partyName, partyType, amount, reference, method, note } = body;
  if (!partyName || !amount) return NextResponse.json({ error: "Party name and amount required" }, { status: 400 });

  const row = await (prisma as any).bulkPaymentRow.create({
    data: {
      batchId: id,
      partyName,
      partyType: partyType || "other",
      amount: parseFloat(amount),
      reference: reference || null,
      method: method || "bank",
      note: note || null,
      status: "PENDING",
    },
  });

  return NextResponse.json({ row });
}

// PATCH /api/bulk-payments/[id] — process selected rows or update batch status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const companyId = getCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batch = await (prisma as any).bulkPaymentBatch.findFirst({
    where: { id, companyId },
  });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  const body = await req.json();
  const { rowIds, batchStatus } = body;

  if (rowIds && Array.isArray(rowIds) && rowIds.length > 0) {
    await (prisma as any).bulkPaymentRow.updateMany({
      where: { id: { in: rowIds }, batchId: id },
      data: { status: "PROCESSED" },
    });
  }

  if (batchStatus) {
    await (prisma as any).bulkPaymentBatch.update({
      where: { id },
      data: { status: batchStatus },
    });
  }

  const updated = await (prisma as any).bulkPaymentBatch.findFirst({
    where: { id },
    include: { rows: true },
  });

  return NextResponse.json({ batch: updated });
}

// DELETE /api/bulk-payments/[id] — delete a batch
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const companyId = getCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await (prisma as any).bulkPaymentBatch.deleteMany({
    where: { id, companyId },
  });

  return NextResponse.json({ ok: true });
}
