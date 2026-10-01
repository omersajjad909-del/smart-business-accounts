/**
 * POST /api/admin/google-ads/sync
 *
 * Pulls real campaign metrics straight from the Google Ads API using the
 * refresh token stored by the OAuth flow at /api/admin/google-ads/oauth/start,
 * and records them as a new GoogleAdsSnapshot (same shape a manual entry
 * produces) so /admin/google-ads's "latest" numbers and history reflect the
 * account without anyone copying numbers off ads.google.com by hand.
 *
 * GOOGLE_ADS_DEVELOPER_TOKEN is optional and normally unset: Google sunset
 * developer tokens on 9 Sept 2026 (developers.google.com/google-ads/api/docs/
 * get-started/dev-token) — access is granted per Google Cloud project through
 * Cloud Console's "Access levels" page instead (console.cloud.google.com/
 * google/ads-apis/overview), which is where the Ads UI's old API Center form
 * now redirects. The header is only sent if the env var happens to be set.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Google Ads API versions sunset roughly every few quarters — bump this if
// Google starts rejecting requests with an UNSUPPORTED_VERSION error (or a
// blanket 404, which means the version segment itself no longer exists).
const ADS_API_VERSION = "v25";

async function getAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET is not set");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.access_token) {
    throw new Error(json?.error_description || "Failed to refresh the Google access token — the connection may have been revoked. Reconnect from /admin/google-ads.");
  }
  return json.access_token as string;
}

function adsHeaders(accessToken: string, developerToken?: string): Record<string, string> {
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
  if (developerToken) headers["developer-token"] = developerToken;
  return headers;
}

async function listAccessibleCustomers(accessToken: string, developerToken?: string): Promise<string[]> {
  const res = await fetch(
    `https://googleads.googleapis.com/${ADS_API_VERSION}/customers:listAccessibleCustomers`,
    { headers: adsHeaders(accessToken, developerToken) },
  );
  const text = await res.text();
  const json = (() => { try { return JSON.parse(text); } catch { return null; } })();
  if (!res.ok) {
    console.error("[google-ads/sync] listAccessibleCustomers failed", res.status, text.slice(0, 2000));
    throw new Error(json?.error?.message || `Could not list accessible Google Ads accounts (HTTP ${res.status}): ${text.slice(0, 300) || "empty response"}`);
  }
  const resourceNames: string[] = json?.resourceNames || [];
  return resourceNames.map((rn) => rn.split("/")[1]).filter(Boolean);
}

type CampaignRow = {
  campaign?: { name?: string };
  metrics?: { impressions?: string; clicks?: string; costMicros?: string; conversions?: number };
};

async function fetchCampaignMetrics(
  accessToken: string,
  developerToken: string | undefined,
  customerId: string,
): Promise<CampaignRow[]> {
  const query = `
    SELECT campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
  `;
  const res = await fetch(
    `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/${customerId}/googleAds:search`,
    {
      method: "POST",
      headers: { ...adsHeaders(accessToken, developerToken), "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    },
  );
  const text = await res.text();
  const json = (() => { try { return JSON.parse(text); } catch { return null; } })();
  if (!res.ok) {
    console.error("[google-ads/sync] fetchCampaignMetrics failed", res.status, text.slice(0, 2000));
    throw new Error(json?.error?.message || `Google Ads query failed for customer ${customerId} (HTTP ${res.status}): ${text.slice(0, 300) || "empty response"}`);
  }
  return (json?.results || []) as CampaignRow[];
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || undefined;

  const auth = await prisma.googleAdsAuth.findFirst({ orderBy: { createdAt: "desc" } });
  if (!auth) {
    return NextResponse.json({ error: "not_connected" }, { status: 400 });
  }

  try {
    const accessToken = await getAccessToken(auth.refreshToken);
    const customerIds = await listAccessibleCustomers(accessToken, developerToken);
    if (customerIds.length === 0) {
      return NextResponse.json(
        { error: "No Google Ads accounts are accessible to the account that connected. Reconnect with the account that manages the FinovaOS campaign." },
        { status: 400 },
      );
    }

    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID || customerIds[0];
    const rows = await fetchCampaignMetrics(accessToken, developerToken, customerId);

    let impressions = 0;
    let clicks = 0;
    let costMicros = 0;
    let conversions = 0;
    const names = new Set<string>();
    for (const r of rows) {
      impressions += Number(r.metrics?.impressions || 0);
      clicks += Number(r.metrics?.clicks || 0);
      costMicros += Number(r.metrics?.costMicros || 0);
      conversions += Number(r.metrics?.conversions || 0);
      if (r.campaign?.name) names.add(r.campaign.name);
    }
    const campaignName =
      names.size === 1 ? [...names][0] : names.size > 1 ? `All campaigns (${names.size})` : "No active campaigns";
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    const dateRangeTo = new Date();
    const dateRangeFrom = new Date(dateRangeTo);
    dateRangeFrom.setDate(dateRangeFrom.getDate() - 30);

    const snapshot = await prisma.googleAdsSnapshot.create({
      data: {
        campaignName,
        dateRangeFrom,
        dateRangeTo,
        impressions,
        clicks,
        costPkr: costMicros / 1_000_000,
        conversions,
        ctr: Math.round(ctr * 100) / 100,
        note: "Auto-synced from Google Ads API",
      },
    });

    return NextResponse.json({ snapshot });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
