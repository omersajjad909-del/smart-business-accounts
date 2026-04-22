import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";

function getCompanyId(req: NextRequest) {
  return req.headers.get("x-company-id");
}

async function requireBulkPaymentsAccess(req: NextRequest, companyId: string) {
  const allowed = await apiHasPermission(
    req.headers.get("x-user-id"),
    req.headers.get("x-user-role"),
    PERMISSIONS.BULK_PAYMENTS,
    companyId
  );

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

// GET /api/bulk-payments — list all batches for company
export async function GET(req: NextRequest) {
  const companyId = getCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requireBulkPaymentsAccess(req, companyId);
  if (denied) return denied;

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
  const denied = await requireBulkPaymentsAccess(req, companyId);
  if (denied) return denied;

  const body = await req.json();
  const { name } = body;
  if (!name) return NextResponse.json({ error: "Batch name required" }, { status: 400 });

  const batch = await (prisma as any).bulkPaymentBatch.create({
    data: { companyId, name, status: "DRAFT" },
    include: { rows: true },
  });

  return NextResponse.json({ batch });
}
