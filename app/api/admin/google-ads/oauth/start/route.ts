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

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/adwords",
    access_type: "offline", // required to get a refresh_token back
    prompt: "consent", // required to get a refresh_token on every authorization, not just the first
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
