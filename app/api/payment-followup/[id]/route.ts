import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/payment-followup/[id] — update status/note for an invoice
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const companyId = req.headers.get("x-company-id");
  const userId = req.headers.get("x-user-id");
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { status, note } = body;

  // Upsert: create or update the follow-up log for this invoice
  const log = await (prisma as any).paymentFollowUpLog.upsert({
    where: {
      companyId_invoiceId: {
        companyId,
        invoiceId: params.id,
      },
    },
    update: {
      ...(status && { status }),
      ...(note !== undefined && { note }),
      updatedBy: userId ?? null,
      updatedAt: new Date(),
    },
    create: {
      companyId,
      invoiceId: params.id,
      status: status || "PENDING",
      note: note || null,
      updatedBy: userId ?? null,
    },
  });

  return NextResponse.json({ log });
}
