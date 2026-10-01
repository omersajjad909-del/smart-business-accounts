/**
 * GET /api/admin/google-ads/oauth/start
 *
 * Redirects the admin to Google's consent screen for the `adwords` scope.
 * Google sends them back to /oauth/callback with a one-time code, which is
 * exchanged there for a refresh token — the thing that makes the connection
 * permanent so /admin/google-ads can sync without anyone re-authorizing.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { signJwt } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// NEXT_PUBLIC_BASE_URL points at the marketing site (www.finovaos.app), whose
// middleware 404s every /admin and /api/admin path on purpose — the admin
// panel only resolves on its own hostname. Google's registered redirect URI
// has to match that hostname exactly, so this uses it explicitly rather than
// the general base URL.
const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || "https://pvc.finovaos.app";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_ADS_CLIENT_ID is not set. Add it to the environment first." },
      { status: 500 },
    );
  }

  const redirectUri = `${ADMIN_BASE}/api/admin/google-ads/oauth/callback`;

  // The callback is always reached via a cross-site redirect FROM
  // accounts.google.com, so the SameSite:"strict" sb_admin cookie (by design,
  // see lib/auth.ts) never arrives there — requireAdmin on the callback would
  // always see "logged out" even for a real admin. The OAuth "state" param is
  // the standard way around that: a short-lived, server-signed token that
  // proves this request was initiated by an authenticated admin, verified
  // without needing any cookie on the way back.
  const state = signJwt({ email: admin.email, purpose: "google_ads_oauth" }, { ttlMs: 10 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/adwords",
    access_type: "offline", // required to get a refresh_token back
    prompt: "consent", // required to get a refresh_token on every authorization, not just the first
    state,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
