import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signJwt, verifyJwt } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token") || "";
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
    const payload = verifyJwt(token);
    if (!payload) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
    const email = String(payload.email || "").toLowerCase();
    const exp = Number(payload.exp || 0);
    if (!email) return NextResponse.json({ error: "Malformed link" }, { status: 400 });
    if (exp && Date.now() > exp) return NextResponse.json({ error: "Link expired" }, { status: 400 });

    let user = await prisma.user.findUnique({ where: { email } });
    let companyId = user?.defaultCompanyId || "";
    if (!user) {
      const hash = await bcrypt.hash(cryptoRandom(), 10);
      const company = await prisma.company.create({
        data: { name: "My Company", code: null, isActive: true },
      } as any);
      companyId = company.id;
      user = await prisma.user.create({
        data: {
          name: email.split("@")[0],
          email,
          password: hash,
          role: "ACCOUNTANT",
          active: true,
          defaultCompanyId: companyId,
          companies: { create: { companyId, isDefault: true } },
        },
      } as any);
    } else {
      if (!companyId) {
        const company = await prisma.company.create({
          data: { name: "My Company", code: null, isActive: true },
        } as any);
        companyId = company.id;
        await prisma.user.update({
          where: { id: user.id },
          data: { defaultCompanyId: companyId, companies: { create: { companyId, isDefault: true } } },
        } as any);
      }
    }

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        companyId,
        token: signJwt({ userId: user.id, companyId, role: user.role }),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        ip: (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || req.headers.get("x-real-ip") || "",
        userAgent: req.headers.get("user-agent") ?? "",
      },
    });
    const base = process.env.NEXT_PUBLIC_APP_URL || "";
    const res = NextResponse.redirect(`${base}/dashboard`);
    res.cookies.set("sb_auth", session.token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
