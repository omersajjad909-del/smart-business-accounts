import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const userRole = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sessions = await prisma.session.findMany({
      include: {
        user: { select: { name: true, email: true, role: true } },
        company: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      distinct: ["userId"],
      take: 500,
    } as any);

    const rows = (sessions as any[]).map((s) => ({
      userId: s.userId,
      name: s.user?.name || "",
      email: s.user?.email || "",
      role: s.user?.role || "",
      companyId: s.companyId || "",
      companyName: s.company?.name || "",
      lastLogin: s.createdAt,
      ip: s.ip || "",
      userAgent: s.userAgent || "",
    }));

    return NextResponse.json({ sessions: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
