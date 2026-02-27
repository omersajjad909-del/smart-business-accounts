import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signJwt } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { companyName, name, email, password } = await req.json();
    if (!companyName || !name || !email || !password) {
      return NextResponse.json({ error: "companyName, name, email, password required" }, { status: 400 });
    }

    const emailNormalized = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: emailNormalized } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const company = await prisma.company.create({
      data: {
        name: companyName,
        isActive: true,
      },
    });

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: emailNormalized,
        password: hash,
        role: "ADMIN",
        defaultCompanyId: company.id,
      },
    });

    await prisma.userCompany.create({
      data: { userId: user.id, companyId: company.id, isDefault: true },
    });

    const token = signJwt({
      userId: user.id,
      role: "ADMIN",
      companyId: company.id,
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        companyId: company.id,
        ip: req.headers.get("x-forwarded-for"),
        userAgent: req.headers.get("user-agent") || null,
      },
    });

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: "ADMIN",
      companyId: company.id,
      companies: [{ id: company.id, name: company.name, isDefault: true }],
    };

    const res = NextResponse.json({ user: safeUser });
    res.cookies.set("sb_auth", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Signup failed" }, { status: 500 });
  }
}
