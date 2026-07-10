import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEVERITIES = ["P1", "P2", "P3", "P4"] as const;
const CATEGORIES = ["DATA_BREACH", "UNAUTHORIZED_ACCESS", "SYSTEM_OUTAGE", "OTHER"] as const;
const STATUSES = ["DETECTED", "NOTIFYING", "NOTIFIED", "RESOLVED"] as const;

export async function GET(req: NextRequest) {
  const admin = requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const severity = url.searchParams.get("severity");

  const where: Record<string, unknown> = {};
  if (status && STATUSES.includes(status as (typeof STATUSES)[number])) where.status = status;
  if (severity && SEVERITIES.includes(severity as (typeof SEVERITIES)[number])) where.severity = severity;

  const [incidents, counts] = await Promise.all([
    prisma.securityIncident.findMany({
      where,
      orderBy: { detectedAt: "desc" },
      take: 200,
    }),
    prisma.securityIncident.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const summary: Record<string, number> = { DETECTED: 0, NOTIFYING: 0, NOTIFIED: 0, RESOLVED: 0 };
  for (const c of counts) summary[c.status] = c._count._all;

  return NextResponse.json({ incidents, summary });
}

export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const { severity, category, title, summary, affectedScope, detectedAt } = body || {};

  if (!SEVERITIES.includes(severity)) {
    return NextResponse.json({ error: "Invalid severity. Use P1|P2|P3|P4." }, { status: 400 });
  }
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  if (!title || typeof title !== "string" || title.length < 3) {
    return NextResponse.json({ error: "Title is required (min 3 chars)." }, { status: 400 });
  }
  if (!summary || typeof summary !== "string" || summary.length < 10) {
    return NextResponse.json({ error: "Summary is required (min 10 chars)." }, { status: 400 });
  }

  const detected = detectedAt ? new Date(detectedAt) : new Date();
  if (isNaN(detected.getTime())) {
    return NextResponse.json({ error: "Invalid detectedAt." }, { status: 400 });
  }
  const deadline = new Date(detected.getTime() + 72 * 3600 * 1000);

  const incident = await prisma.securityIncident.create({
    data: {
      severity,
      category,
      title: title.trim(),
      summary: summary.trim(),
      affectedScope: typeof affectedScope === "string" ? affectedScope.trim() : null,
      detectedAt: detected,
      deadlineAt: deadline,
      status: "DETECTED",
      createdBy: admin.id,
    },
  });

  logAdminAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "SECURITY_INCIDENT_CREATED",
    targetType: "SecurityIncident",
    targetId: incident.id,
    targetLabel: incident.title,
    details: { severity, category },
  });

  return NextResponse.json({ incident }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const admin = requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const { id, status, resolution, summary, affectedScope } = body || {};

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const existing = await prisma.securityIncident.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if (status && STATUSES.includes(status)) {
    patch.status = status;
    if (status === "RESOLVED" && !existing.resolvedAt) patch.resolvedAt = new Date();
  }
  if (typeof resolution === "string") patch.resolution = resolution.trim();
  if (typeof summary === "string" && summary.length >= 10) patch.summary = summary.trim();
  if (typeof affectedScope === "string") patch.affectedScope = affectedScope.trim();

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await prisma.securityIncident.update({ where: { id }, data: patch });

  logAdminAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "SECURITY_INCIDENT_UPDATED",
    targetType: "SecurityIncident",
    targetId: id,
    targetLabel: existing.title,
    details: patch as Record<string, unknown>,
  });

  return NextResponse.json({ incident: updated });
}
