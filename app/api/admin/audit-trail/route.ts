import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { getCompanyNoMap, resolveCompanyId } from "@/lib/companyRefServer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const { searchParams } = req.nextUrl;
    const page      = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit     = Math.min(100, parseInt(searchParams.get("limit") || "50"));
    const action    = searchParams.get("action") || null;
    const adminEmail = searchParams.get("adminEmail") || null;
    // Accepts a companyNo ("100004") as well as a UUID, since companyNo is now
    // the only company identifier the admin UI shows.
    const companyRefParam = searchParams.get("companyId") || null;
    const companyId = companyRefParam ? await resolveCompanyId(companyRefParam) : null;

    const where: any = {};
    if (action)     where.action     = { contains: action, mode: "insensitive" };
    if (adminEmail) where.adminEmail = { contains: adminEmail, mode: "insensitive" };
    if (companyId)  where.companyId  = companyId;

    const [logs, total] = await Promise.all([
      (prisma as any).adminActionLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      (prisma as any).adminActionLog.count({ where }),
    ]);

    const companyNos = await getCompanyNoMap(logs.map((l: any) => l.companyId));

    return NextResponse.json({
      logs: logs.map((l: any) => ({
        ...l,
        companyNo: l.companyId ? companyNos.get(l.companyId) ?? null : null,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (e: any) {
    // Table may not exist yet (migration not run)
    if (e.code === "P2021" || e.message?.includes("does not exist")) {
      return NextResponse.json({ logs: [], total: 0, page: 1, pages: 0, pending_migration: true });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
