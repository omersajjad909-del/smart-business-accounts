import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { resolveCompanyId } from "@/lib/tenant";
import {
  excludeSensitiveActions,
  isSensitiveLogAction,
  redactLogs,
} from "@/lib/logRedaction";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");

  const companyId = await resolveCompanyId(req);
  const allowed = await apiHasPermission(
    userId,
    userRole,
    PERMISSIONS.VIEW_LOGS,
    companyId
  );

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || undefined;
  const actorId = searchParams.get("userId") || undefined;
  const q = searchParams.get("q") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const format = searchParams.get("format") || "json";

  const where: any = { companyId };
  if (actorId) where.userId = actorId;
  if (q) where.details = { contains: q, mode: "insensitive" };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  // Rows holding live auth secrets are never returned or searchable, whatever
  // `action`/`q` asked for.
  where.action = action
    ? (isSensitiveLogAction(action) ? "__never__" : action)
    : excludeSensitiveActions();

  const logs = redactLogs(
    await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5000,
      // `include: { user: true }` used to ship the whole User row to anyone with
      // VIEW_LOGS — bcrypt password hash and twoFactorSecret included.
      select: {
        id: true,
        action: true,
        details: true,
        userId: true,
        companyId: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
  );

  if (format === "csv") {
    const header = ["id", "action", "details", "userName", "userEmail", "createdAt"].join(",");
    const rows = logs.map((l) => [
      l.id,
      JSON.stringify(l.action || ""),
      JSON.stringify(l.details || ""),
      JSON.stringify(l.user?.name || ""),
      JSON.stringify(l.user?.email || ""),
      l.createdAt.toISOString(),
    ].join(","));
    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=activity-logs.csv",
      },
    });
  }

  return NextResponse.json(logs);
}

