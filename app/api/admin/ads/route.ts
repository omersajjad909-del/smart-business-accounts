import { NextRequest, NextResponse } from "next/server";
import { getAccountOverview, metaAdsConfigured } from "@/lib/metaAds";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAdmin(req: NextRequest) {
  return req.headers.get("x-admin-auth") === process.env.ADMIN_SECRET ||
    req.headers.get("x-user-role") === "ADMIN";
}

export async function GET(req: NextRequest) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (!metaAdsConfigured()) {
      return NextResponse.json({ error: "Meta Ads not configured (META_ADS_ACCESS_TOKEN / META_ADS_ACCOUNT_ID missing)" }, { status: 400 });
    }

    const datePreset = req.nextUrl.searchParams.get("range") || "last_30d";
    const overview = await getAccountOverview(datePreset);
    return NextResponse.json(overview);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
