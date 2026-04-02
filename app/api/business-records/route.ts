import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getCompanyAdminControlSettings } from "@/lib/companyAdminControl";
import { logAuditFromReq } from "@/lib/auditLogger";
import { resolveCompanyId } from "@/lib/tenant";
import {
  getBusinessRecordAuditEntity,
  getBusinessRecordMeta,
  sanitizeBusinessRecordInput,
} from "@/lib/businessRecordHardening";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();
if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

async function resolveBusinessRecordScope(req: NextRequest, companyId: string) {
  const headerBranchId = req.headers.get("x-branch-id");
  const userId = req.headers.get("x-user-id");

  let assignedBranchIds: string[] | null = null;

  if (userId) {
    try {
      const settings = await getCompanyAdminControlSettings(companyId);
      const assigned = settings.branchAssignments[userId];
      if (Array.isArray(assigned) && assigned.length > 0) {
        assignedBranchIds = assigned;
      }
    } catch {}
  }

  const selectedBranchId =
    headerBranchId && headerBranchId !== "all"
      ? assignedBranchIds?.includes(headerBranchId)
        ? headerBranchId
        : assignedBranchIds?.[0] || headerBranchId
      : null;

  return { assignedBranchIds, selectedBranchId };
}

// GET /api/business-records?category=patient&status=active&refId=xxx
export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const category    = searchParams.get("category");
  const subCategory = searchParams.get("subCategory");
  const status      = searchParams.get("status");
  const refId       = searchParams.get("refId");
  const search      = searchParams.get("search");
  const limit       = parseInt(searchParams.get("limit") || "200");
  const { assignedBranchIds, selectedBranchId } = await resolveBusinessRecordScope(req, companyId);

  const where: Record<string, unknown> = { companyId };
  if (category)    where.category    = category;
  if (subCategory) where.subCategory = subCategory;
  if (status)      where.status      = status;
  if (refId)       where.refId       = refId;
  if (search)      where.title       = { contains: search, mode: "insensitive" };
  if (selectedBranchId) {
    where.branchId = selectedBranchId;
  } else if (assignedBranchIds?.length) {
    where.OR = [{ branchId: { in: assignedBranchIds } }, { branchId: null }];
  }

  const records = await prisma.businessRecord.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(records);
}

// POST /api/business-records  — create a new record
export async function POST(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const body = await req.json();
  const sanitized = sanitizeBusinessRecordInput(body as Record<string, unknown>);
  const { assignedBranchIds, selectedBranchId } = await resolveBusinessRecordScope(req, companyId);
  const { category, subCategory, title, status, refId, data, amount, date } = sanitized;
  let branchId = sanitized.branchId || selectedBranchId || null;

  if (!category || !title) {
    return NextResponse.json({ error: "category and title are required" }, { status: 400 });
  }

  if (assignedBranchIds?.length && branchId && !assignedBranchIds.includes(branchId)) {
    return NextResponse.json({ error: "Branch access denied" }, { status: 403 });
  }

  if (!branchId && assignedBranchIds?.length === 1) {
    branchId = assignedBranchIds[0];
  }

  const record = await prisma.businessRecord.create({
    data: {
      companyId,
      branchId: branchId || null,
      category,
      subCategory: subCategory || null,
      title,
      status: status || "active",
      refId: refId || null,
      data: data || {},
      amount: amount ?? null,
      date: date ? new Date(date) : null,
    },
  });

  const meta = getBusinessRecordMeta(category);
  await logAuditFromReq(req, {
    companyId,
    entity: getBusinessRecordAuditEntity(category),
    entityId: record.id,
    action: "CREATE",
    afterValues: record,
    description: `Created ${meta.label}`,
  });

  return NextResponse.json(record, { status: 201 });
}

// PUT /api/business-records  — update a record
export async function PUT(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const body = await req.json();
  const { id: rawId, ...updates } = body as Record<string, unknown>;
  const id = String(rawId || "").trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { assignedBranchIds } = await resolveBusinessRecordScope(req, companyId);

  // Ensure record belongs to this company
  const existing = await prisma.businessRecord.findFirst({ where: { id, companyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (assignedBranchIds?.length && existing.branchId && !assignedBranchIds.includes(existing.branchId)) {
    return NextResponse.json({ error: "Branch access denied" }, { status: 403 });
  }

  const nextBranchId =
    updates.branchId !== undefined
      ? String(updates.branchId || "").trim() || null
      : existing.branchId;

  if (assignedBranchIds?.length && nextBranchId && !assignedBranchIds.includes(nextBranchId)) {
    return NextResponse.json({ error: "Branch access denied" }, { status: 403 });
  }

  const record = await prisma.businessRecord.update({
    where: { id },
    data: {
      ...(updates.title !== undefined && { title: String(updates.title || "").trim().slice(0, 160) }),
      ...(updates.status !== undefined && { status: String(updates.status || "").trim().toLowerCase().slice(0, 40) }),
      ...(updates.subCategory !== undefined && { subCategory: String(updates.subCategory || "").trim().slice(0, 80) || null }),
      ...(updates.refId !== undefined && { refId: String(updates.refId || "").trim().slice(0, 120) || null }),
      ...(updates.data !== undefined && {
        data:
          updates.data && typeof updates.data === "object" && !Array.isArray(updates.data)
            ? JSON.parse(JSON.stringify(updates.data))
            : {},
      }),
      ...(updates.amount !== undefined && { amount: updates.amount !== null && updates.amount !== "" ? Number(updates.amount) : null }),
      ...(updates.date !== undefined && { date: updates.date ? new Date(String(updates.date)) : null }),
      ...(updates.branchId !== undefined && { branchId: nextBranchId }),
    },
  });

  const meta = getBusinessRecordMeta(existing.category);
  await logAuditFromReq(req, {
    companyId,
    entity: getBusinessRecordAuditEntity(existing.category),
    entityId: record.id,
    action: "UPDATE",
    beforeValues: existing,
    afterValues: record,
    description: `Updated ${meta.label}`,
  });

  return NextResponse.json(record);
}

// DELETE /api/business-records?id=xxx
export async function DELETE(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const id = String(new URL(req.url).searchParams.get("id") || "").trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { assignedBranchIds } = await resolveBusinessRecordScope(req, companyId);

  const existing = await prisma.businessRecord.findFirst({ where: { id, companyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (assignedBranchIds?.length && existing.branchId && !assignedBranchIds.includes(existing.branchId)) {
    return NextResponse.json({ error: "Branch access denied" }, { status: 403 });
  }

  await prisma.businessRecord.delete({ where: { id } });
  const meta = getBusinessRecordMeta(existing.category);
  await logAuditFromReq(req, {
    companyId,
    entity: getBusinessRecordAuditEntity(existing.category),
    entityId: existing.id,
    action: "DELETE",
    beforeValues: existing,
    description: `Deleted ${meta.label}`,
  });
  return NextResponse.json({ success: true });
}
