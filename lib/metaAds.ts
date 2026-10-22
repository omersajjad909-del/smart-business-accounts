/**
 * Read-only Meta Marketing API client for the admin "Ads" dashboard.
 * Uses a long-lived User Access Token (ads_read scope) — see .env for
 * META_ADS_ACCESS_TOKEN / META_ADS_ACCOUNT_ID and how to regenerate it
 * (Graph API Explorer → Access Token Debugger → "Extend Access Token").
 */

const GRAPH_VERSION = "v26.0";

export function metaAdsConfigured(): boolean {
  return Boolean(process.env.META_ADS_ACCESS_TOKEN && process.env.META_ADS_ACCOUNT_ID);
}

async function graphGet(path: string, params: Record<string, string>) {
  const token = process.env.META_ADS_ACCESS_TOKEN;
  if (!token) throw new Error("META_ADS_ACCESS_TOKEN not set");

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Graph API error ${res.status}`);
  return json;
}

export type AdInsight = {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
};

function parseInsights(row: any): AdInsight {
  return {
    spend: Number(row?.spend || 0),
    impressions: Number(row?.impressions || 0),
    reach: Number(row?.reach || 0),
    clicks: Number(row?.clicks || 0),
    ctr: Number(row?.ctr || 0),
    cpc: Number(row?.cpc || 0),
  };
}

export type AdSummary = { id: string; name: string; status: string; insights: AdInsight | null };
export type AdSetSummary = { id: string; name: string; status: string; dailyBudget: number | null; insights: AdInsight | null; ads: AdSummary[] };
export type CampaignSummary = { id: string; name: string; status: string; objective: string; insights: AdInsight | null; adSets: AdSetSummary[] };

/**
 * Full account overview: every campaign, its ad sets and ads, each with
 * last-30-days insights. A few sequential calls (campaigns, then per-level
 * insights) rather than one deeply nested request — the Graph API's nested
 * edge+insights combo is unreliable across campaign/adset/ad levels at once.
 */
export async function getAccountOverview(datePreset = "last_30d") {
  const accountId = process.env.META_ADS_ACCOUNT_ID!;

  const campaignsRes = await graphGet(`${accountId}/campaigns`, {
    fields: "name,status,objective,insights.date_preset(" + datePreset + "){spend,impressions,reach,clicks,ctr,cpc}",
    limit: "50",
  });

  const campaigns: CampaignSummary[] = [];
  for (const c of campaignsRes.data || []) {
    const adSetsRes = await graphGet(`${c.id}/adsets`, {
      fields: "name,status,daily_budget,insights.date_preset(" + datePreset + "){spend,impressions,reach,clicks,ctr,cpc}",
      limit: "50",
    });

    const adSets: AdSetSummary[] = [];
    for (const as of adSetsRes.data || []) {
      const adsRes = await graphGet(`${as.id}/ads`, {
        fields: "name,status,insights.date_preset(" + datePreset + "){spend,impressions,reach,clicks,ctr,cpc}",
        limit: "50",
      });

      const ads: AdSummary[] = (adsRes.data || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        insights: a.insights?.data?.[0] ? parseInsights(a.insights.data[0]) : null,
      }));

      adSets.push({
        id: as.id,
        name: as.name,
        status: as.status,
        dailyBudget: as.daily_budget ? Number(as.daily_budget) / 100 : null,
        insights: as.insights?.data?.[0] ? parseInsights(as.insights.data[0]) : null,
        ads,
      });
    }

    campaigns.push({
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      insights: c.insights?.data?.[0] ? parseInsights(c.insights.data[0]) : null,
      adSets,
    });
  }

  return { accountId, campaigns };
}
