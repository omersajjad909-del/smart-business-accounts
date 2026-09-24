import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

const SAFE_PAGE = /^\/dashboard(?:\/[a-zA-Z0-9_./-]*)?$/;

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    const claims = token ? verifyJwt(token) : null;
    const userId = String(claims?.userId || "");
    const requestedUserId = req.headers.get("x-user-id") || "";
    const companyId = req.headers.get("x-company-id") || "";
    if (!userId || !companyId || requestedUserId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedPage = String(body?.page || "").split("?")[0];
    if (!SAFE_PAGE.test(requestedPage) || requestedPage.includes("..")) {
      return NextResponse.json({ error: "Invalid page" }, { status: 400 });
    }

    const [user, membership] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { active: true } }),
      prisma.userCompany.findUnique({ where: { userId_companyId: { userId, companyId } }, select: { id: true } }),
    ]);
    if (!user?.active || !membership) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Aggregate-friendly action field; only the normalized page path is kept.
    const page = requestedPage.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "/[id]").replace(/\/\d+(?=\/|$)/g, "/[id]");
    await prisma.activityLog.create({
      data: { companyId, userId, action: `CLIENT_PAGE_VIEW:${page}` },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not record page view" }, { status: 500 });
  }
}
