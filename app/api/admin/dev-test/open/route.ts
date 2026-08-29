import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { getAppUrl } from "@/lib/domains";

/**
 * GET /api/admin/dev-test/open
 * ──────────────────────────────────────────────────────────────────────────────
 * Re-opens the dashboard for an already-running dev-test session.
 *
 * The console lives on its own hostname (pvc.finovaos.app), so the `sb_auth`
 * cookie the launch route sets is host-only and never reaches the app domain.
 * The "Open Dashboard" button on the active-session banner used to link straight
 * at `${getAppUrl()}/dashboard`, which arrived there with no session at all and
 * bounced the admin to /login — the launch button worked only because it hands
 * the token across through /api/auth/impersonate-handoff.
 *
 * This does the same hand-off for a session that is already open: read the test
 * token out of the cookie, and redirect through the app domain's handoff so it
 * is re-issued as a cookie for that origin. The token never touches JavaScript,
 * so the cookie stays httpOnly on both sides.
 */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const admin = await requireSuperAdmin(req, { page: "dev-test" });
  if (admin instanceof NextResponse) return admin;

  const token = getTokenFromRequest(req);
  const payload = token ? verifyJwt(token) : null;

  // Either nothing was ever launched, or the 8h session has aged out. Send the
  // admin back to the launcher rather than to a login form they cannot use.
  if (!token || payload?.isTestMode !== true) {
    const back = new URL("/admin/dev-test", req.nextUrl.origin);
    back.searchParams.set("error", "no_test_session");
    return NextResponse.redirect(back);
  }

  const res = NextResponse.redirect(
    `${getAppUrl()}/api/auth/impersonate-handoff?token=${encodeURIComponent(token)}`,
  );
  // The URL carries a session token; keep it out of every cache in between.
  res.headers.set("Cache-Control", "no-store");
  return res;
}
