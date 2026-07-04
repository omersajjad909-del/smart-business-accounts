import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signJwt } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Normalized error — never reveal whether email exists or not
const INVALID_CREDS = { message: "Invalid credentials" };

export async function POST(req: NextRequest) {
  try {
    // ── Rate limiting: max 10 attempts per IP per 15 minutes ────────────────
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";
    const rl = rateLimit(`admin_login:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { message: "Too many login attempts. Try again in 15 minutes." },
        { status: 429, headers: { "Retry-After": "900" } }
      );
    }

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
      if (!match) return NextResponse.json(INVALID_CREDS, { status: 401 });

      const token = await signJwt({ id: superAdmin.id, email: superAdmin.email, role: "ADMIN", name: superAdmin.name });
      const response = NextResponse.json({
        success: true,
        user: { id: superAdmin.id, name: superAdmin.name, email: superAdmin.email, role: "ADMIN", isSuperAdmin: true, allowedPages: null },
      });
      response.cookies.set("sb_auth", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
      return response;
    }

    // ── 2. Try Team Member (AdminUser table) ─────────────────────────────────
    const teamMember = await (prisma as any).adminUser?.findUnique({ where: { email } });
    if (teamMember) {
      if (!teamMember.active)
        return NextResponse.json({ message: "Account is disabled. Contact super admin." }, { status: 403 });

      const match = await bcrypt.compare(password, teamMember.passwordHash);
      if (!match) return NextResponse.json(INVALID_CREDS, { status: 401 });

      await (prisma as any).adminUser.update({ where: { id: teamMember.id }, data: { lastLoginAt: new Date() } });

      const token = await signJwt({ id: teamMember.id, email: teamMember.email, role: "ADMIN", name: teamMember.name });

      let allowedPages: string[] = [];
      try { allowedPages = JSON.parse(teamMember.allowedPages || "[]"); } catch {}

      const response = NextResponse.json({
        success: true,
        user: { id: teamMember.id, name: teamMember.name, email: teamMember.email, role: "ADMIN", isSuperAdmin: teamMember.isSuperAdmin, team: teamMember.team, allowedPages },
      });
      response.cookies.set("sb_auth", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
      return response;
    }

    // Always return same error regardless of whether email exists (prevent user enumeration)
    return NextResponse.json(INVALID_CREDS, { status: 401 });
  } catch (e: any) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
