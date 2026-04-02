import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
// Admin-only (website scope)

export async function GET(req: NextRequest) {
  try {
    const roleHeader = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (roleHeader !== "ADMIN") {
      const token = getTokenFromRequest(req as any);
      const payload = token ? verifyJwt(token) : null;
      const role = String(payload?.role || "").toUpperCase();
      if (role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    const sessions = await prisma.session.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
    const latestByUser = new Map<string, any>();
    for (const s of sessions) {
      if (!latestByUser.has(s.userId)) latestByUser.set(s.userId, s);
    }
    const rows = Array.from(latestByUser.values()).map((s: any) => ({
      userId: s.userId,
      name: s.user?.name || "",
      email: s.user?.email || "",
      role: String(s.user?.role || "").toUpperCase(),
      lastLogin: s.createdAt,
      ip: s.ip || "",
      userAgent: s.userAgent || "",
      companyId: s.companyId || null,
    }));
    return NextResponse.json({ sessions: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
