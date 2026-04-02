import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.MANAGE_USERS, companyId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Latest session per user in this company
    const sessions = await prisma.session.findMany({
      where: { companyId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      distinct: ["userId"],
    } as any);

    const rows = sessions.map((s) => ({
      userId: s.userId,
      name: (s as any).user?.name || "",
      email: (s as any).user?.email || "",
      role: (s as any).user?.role || "",
      lastLogin: s.createdAt,
      ip: (s as any).ip || "",
      userAgent: (s as any).userAgent || "",
    }));

    return NextResponse.json({ sessions: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
