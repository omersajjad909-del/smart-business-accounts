import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@/lib/auth";

/**
 * GET /api/auth/impersonate-handoff?token=<jwt>
 * ──────────────────────────────────────────────────────────────────────────────
 * Cross-domain login handoff for admin impersonation ("Open as Owner").
 *
 * The admin panel lives on a different registrable domain than the app
 * (admin.finovaos.app vs usefinova.app), so the sb_auth cookie set by
 * /api/admin/companies/impersonate is host-only and never reaches the app —
 * which landed the admin on a "Session expired." screen.
 *
 * This endpoint runs ON the app domain: it validates the short-lived
 * impersonation JWT minted by the admin panel and re-issues it as a cookie
 * for this origin, then redirects into the dashboard.
 *
 * The token is already short-lived (1h), signed, and its issuance is recorded
 * in AdminActionLog by the route that minted it.
 */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const loginUrl = new URL("/login", req.nextUrl.origin);

  if (!token) {
    loginUrl.searchParams.set("error", "missing_token");
    return NextResponse.redirect(loginUrl);
  }

  const decoded = verifyJwt(token) as
    | { impersonatedBy?: string; isTestMode?: boolean; exp?: number }
    | null;

  // Only accept tokens actually minted for one of the two admin hand-offs —
  // impersonation, or a dev-test session. A normal user token must not be
  // usable to bootstrap a session through this endpoint.
  if (!decoded || !(decoded.impersonatedBy || decoded.isTestMode === true)) {
    loginUrl.searchParams.set("error", "invalid_token");
    return NextResponse.redirect(loginUrl);
  }

  // Land on the dashboard without the token left in the URL/history.
  const response = NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  response.cookies.set("sb_auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // match the token's own 1h lifetime
  });
  return response;
}
