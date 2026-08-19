import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import {
  excludeSensitiveActions,
  isSensitiveLogAction,
  redactLogs,
} from "@/lib/logRedaction";
import { getCompanyNoMap } from "@/lib/companyRefServer";

/**
 * Two callers share this route:
 *   • the platform console (scope:"admin") — may read across companies;
 *   • the tenant dashboard, which reads LOGIN_BLOCKED_SHIFT rows for its own
 *     company on the shift-control and users screens.
 *
 * It previously accepted the `x-user-role: ADMIN` header alone and applied no
 * company filter unless one was passed, so any company owner could read every
 * other tenant's activity log.
 */
export async function GET(req: NextRequest) {
  try {
    const payload = verifyJwt(getTokenFromRequest(req) || "");
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isPlatformAdmin = payload.scope === "admin";
    const sessionCompanyId = String(payload.companyId || payload.defaultCompanyId || "");
    const isTenantAdmin = String(payload.role || "").toUpperCase() === "ADMIN" && !!sessionCompanyId;

    if (!isPlatformAdmin && !isTenantAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || undefined;
    const requestedCompanyId = searchParams.get("companyId") || undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const q = searchParams.get("q") || "";

    const where: any = {};

    // A tenant caller is pinned to its own company, whatever it asked for.
    if (isPlatformAdmin) {
      if (requestedCompanyId) where.companyId = requestedCompanyId;
    } else {
      where.companyId = sessionCompanyId;
    }

    if (from || to) {
      where.createdAt = {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      };
    }

    // Rows carrying live reset tokens / OTP hashes are never returned to anyone.
    where.action = action
      ? (isSensitiveLogAction(action) ? "__never__" : action)
      : excludeSensitiveActions();

    const logs = redactLogs(
      await prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          action: true,
          details: true,
          userId: true,
          companyId: true,
          createdAt: true,
        },
      }),
    );

    // companyNo rides along so the table can show "#100004" instead of the UUID,
    // and is attached before the search filter so admins can search by it.
    const companyNos = await getCompanyNoMap(logs.map((l) => l.companyId));
    const withCompanyNo = logs.map((l) => ({
      ...l,
      companyNo: l.companyId ? companyNos.get(l.companyId) ?? null : null,
    }));

    const needle = q.toLowerCase();
    const filtered = needle
      ? withCompanyNo.filter((l) => JSON.stringify(l).toLowerCase().includes(needle))
      : withCompanyNo;

    return NextResponse.json({ rows: filtered });
  } catch (e: unknown) {
    console.error("ADMIN LOGS ERROR:", e);
    return NextResponse.json({ error: "Failed to load logs" }, { status: 500 });
  }
}
