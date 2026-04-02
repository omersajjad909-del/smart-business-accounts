import { NextRequest, NextResponse } from "next/server";

import { signJwt, verifyJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getLatestVerificationLog,
  getOtpHash,
  isUserVerified,
  safeJson,
} from "@/lib/verification";

export async function POST(req: NextRequest) {
  try {
    const verifyToken = req.cookies.get("sb_verify")?.value || "";
    const verify = verifyToken ? verifyJwt(verifyToken) : null;
    const userId = String(verify?.userId || "");
    const companyId = String(verify?.companyId || "");
    const nextPath = String(verify?.next || "/dashboard");
    const roleFromVerify = verify?.role ? String(verify.role).toUpperCase() : null;
    const channel = String(verify?.channel || "email");
    const exp = Number(verify?.exp || 0);

    if (!userId || !companyId || !exp || Date.now() > exp) {
      const res = NextResponse.json(
        { error: "Verification session expired" },
        { status: 401 },
      );
      res.cookies.set("sb_verify", "", { path: "/", maxAge: 0 });
      return res;
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || "").trim();
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    if (!(await isUserVerified(userId))) {
      const last = await getLatestVerificationLog(companyId, userId);
      const details = safeJson(last?.details || null);
      const hash = details?.h ? String(details.h) : "";
      const otpExp = details?.exp ? Number(details.exp) : 0;

      if (!hash || !otpExp || Date.now() > otpExp) {
        return NextResponse.json({ error: "Code expired" }, { status: 400 });
      }
      if (getOtpHash(code) !== hash) {
        return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
      }

      await prisma.activityLog.create({
        data: {
          companyId,
          userId,
          action: "ACCOUNT_VERIFIED",
          details: JSON.stringify({
            at: Date.now(),
            channel,
          }),
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        defaultCompanyId: true,
        active: true,
      },
    });
    if (!user || !user.active) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const companies = await prisma.userCompany.findMany({
      where: { userId },
      include: { company: true },
    });
    const resolvedCompanyId =
      user.defaultCompanyId ||
      companies.find((membership) => membership.isDefault)?.companyId ||
      companies[0]?.companyId ||
      companyId;

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: (roleFromVerify || user.role || "VIEWER").toUpperCase(),
      companyId: resolvedCompanyId,
      companies: companies.map((membership) => ({
        id: membership.companyId,
        name: membership.company?.name,
        code: membership.company?.code,
        isDefault: membership.isDefault,
      })),
    };

    const token = signJwt({
      userId: safeUser.id,
      role: safeUser.role,
      companyId: resolvedCompanyId,
    });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    try {
      await prisma.session.create({
        data: {
          userId: safeUser.id,
          token,
          expiresAt,
          companyId: resolvedCompanyId || "",
          ip: req.headers.get("x-forwarded-for"),
          userAgent: req.headers.get("user-agent") || null,
        },
      });
    } catch {}

    const res = NextResponse.json({ ok: true, user: safeUser, next: nextPath });
    res.cookies.set("sb_auth", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    res.cookies.set("sb_verify", "", { path: "/", maxAge: 0 });
    return res;
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
