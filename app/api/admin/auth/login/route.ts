import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signJwt } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    let body;
    try { body = JSON.parse(await req.text()); }
    catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }

    const email    = (body.email    || "").toString().toLowerCase().trim();
    const password = (body.password || "").toString();
    if (!email || !password)
      return NextResponse.json({ message: "Email and password required" }, { status: 400 });

    // ── 1. Try Super Admin (User table with role=ADMIN) ──────────────────────
    const superAdmin = await prisma.user.findUnique({ where: { email } });
    if (superAdmin && superAdmin.role === "ADMIN") {
      const match = await bcrypt.compare(password, superAdmin.password);
      if (!match) return NextResponse.json({ message: "Invalid password" }, { status: 401 });

      const token = await signJwt({ id: superAdmin.id, email: superAdmin.email, role: "ADMIN", name: superAdmin.name });
      const response = NextResponse.json({
        success: true,
        user: { id: superAdmin.id, name: superAdmin.name, email: superAdmin.email, role: "ADMIN", isSuperAdmin: true, allowedPages: null },
      });
      response.cookies.set("sb_auth", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 86400 });
      return response;
    }

    // ── 2. Try Team Member (AdminUser table) ─────────────────────────────────
    const teamMember = await (prisma as any).adminUser?.findUnique({ where: { email } });
    if (teamMember) {
      if (!teamMember.active)
        return NextResponse.json({ message: "Account is disabled. Contact super admin." }, { status: 403 });

      const match = await bcrypt.compare(password, teamMember.passwordHash);
      if (!match) return NextResponse.json({ message: "Invalid password" }, { status: 401 });

      await (prisma as any).adminUser.update({ where: { id: teamMember.id }, data: { lastLoginAt: new Date() } });

      const token = await signJwt({ id: teamMember.id, email: teamMember.email, role: "ADMIN", name: teamMember.name });

      let allowedPages: string[] = [];
      try { allowedPages = JSON.parse(teamMember.allowedPages || "[]"); } catch {}

      const response = NextResponse.json({
        success: true,
        user: { id: teamMember.id, name: teamMember.name, email: teamMember.email, role: "ADMIN", isSuperAdmin: teamMember.isSuperAdmin, team: teamMember.team, allowedPages },
      });
      response.cookies.set("sb_auth", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 86400 });
      return response;
    }

    return NextResponse.json({ message: "Invalid admin credentials" }, { status: 401 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
