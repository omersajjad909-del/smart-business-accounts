import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getCompanyId(req: NextRequest) {
  return req.headers.get("x-company-id");
}

// GET /api/bulk-payments — list all batches for company
export async function GET(req: NextRequest) {
  const companyId = getCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batches = await (prisma as any).bulkPaymentBatch.findMany({
    where: { companyId },
    include: { rows: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ batches });
}

// POST /api/bulk-payments — create new batch
export async function POST(req: NextRequest) {
  const companyId = getCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name } = body;
  if (!name) return NextResponse.json({ error: "Batch name required" }, { status: 400 });

  const batch = await (prisma as any).bulkPaymentBatch.create({
    data: { companyId, name, status: "DRAFT" },
    include: { rows: true },
  });

  return NextResponse.json({ batch });
}
