import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signJwt } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Normalized error — never reveal whether email exists or not
const INVALID_CREDS = { message: "Invalid credentials" };

/** Admin-panel sessions are short-lived; the blast radius of a stolen one is total. */
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Decide whether a `User` row is a *platform* super admin rather than just the
 * ADMIN (owner) of some tenant company.
 *
 * Preferred: an explicit `SUPER_ADMIN_EMAILS` allowlist (comma-separated).
 * Fallback, so nobody is locked out of an existing deployment before that env
 * var is set: the account must not belong to any company. Real platform admins
 * are standalone rows; every tenant owner has at least one UserCompany link.
 *
 * Set SUPER_ADMIN_EMAILS in production and this fallback stops being used.
 */
async function isPlatformSuperAdmin(userId: string, email: string): Promise<boolean> {
  const allowlist = (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length > 0) return allowlist.includes(email.toLowerCase());

  const membership = await prisma.userCompany.count({ where: { userId } });
  return membership === 0;
}

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

    // ── 1. Try Super Admin (User table) ──────────────────────────────────────
    // `User.role === "ADMIN"` only means "owner of a company" — it is the
    // tenant-admin role. On its own it let every customer's company owner sign
    // into the platform admin panel with their normal password. A User row now
    // only counts as a platform super admin when it is explicitly allowlisted.
    const superAdmin = await prisma.user.findUnique({ where: { email } });
    if (superAdmin && superAdmin.role === "ADMIN" && (await isPlatformSuperAdmin(superAdmin.id, email))) {
      const match = await bcrypt.compare(password, superAdmin.password);
      if (!match) return NextResponse.json(INVALID_CREDS, { status: 401 });
      if (!superAdmin.active) {
        return NextResponse.json({ message: "Account is disabled." }, { status: 403 });
      }

      const token = await signJwt(
        {
          id: superAdmin.id,
          email: superAdmin.email,
          role: "ADMIN",
          name: superAdmin.name,
          scope: "admin",
          isSuperAdmin: true,
        },
        { ttlMs: ADMIN_SESSION_TTL_MS },
      );
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

      const token = await signJwt(
        {
          id: teamMember.id,
          email: teamMember.email,
          role: "ADMIN",
          name: teamMember.name,
          scope: "admin",
          isSuperAdmin: Boolean(teamMember.isSuperAdmin),
        },
        { ttlMs: ADMIN_SESSION_TTL_MS },
      );

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
