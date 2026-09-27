/**
 * GET /api/admin/google-ads/oauth/callback
 *
 * Google redirects here with a one-time `code` after the admin approves
 * access on the consent screen. Exchange it for a refresh token and store
 * that — it's what /admin/google-ads's sync route uses from now on, so this
 * only needs to run once (or again if the token is ever revoked).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// See the matching comment in oauth/start/route.ts — the admin panel only
// resolves on its own hostname, not the marketing site's.
const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || "https://pvc.finovaos.app";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(`${ADMIN_BASE}/admin/google-ads?oauth_error=${encodeURIComponent(errorParam)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${ADMIN_BASE}/admin/google-ads?oauth_error=missing_code`);
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${ADMIN_BASE}/admin/google-ads?oauth_error=missing_client_credentials`);
  }

  const redirectUri = `${ADMIN_BASE}/api/admin/google-ads/oauth/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenJson = await tokenRes.json().catch(() => null);

  if (!tokenRes.ok || !tokenJson?.refresh_token) {
    // No refresh_token usually means the account already approved this app
    // before (Google only issues one on first consent). Revoke access at
    // myaccount.google.com/permissions and try again to force a new one.
    return NextResponse.redirect(
      `${ADMIN_BASE}/admin/google-ads?oauth_error=${encodeURIComponent(tokenJson?.error_description || "token_exchange_failed")}`,
    );
  }

  await prisma.googleAdsAuth.create({
    data: {
      refreshToken: tokenJson.refresh_token,
      connectedBy: admin.email,
    },
  });

  return NextResponse.redirect(`${ADMIN_BASE}/admin/google-ads?oauth_connected=1`);
}
