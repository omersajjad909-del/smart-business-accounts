/**
 * GET  /api/admin/google-ads — snapshots recorded so far, newest first.
 * POST /api/admin/google-ads — record a new snapshot.
 *
 * There is no live Google Ads API connection yet (that needs a developer
 * token + OAuth app set up in Google Cloud, which is a separate task). Until
 * then, an admin reads the numbers off ads.google.com and records them here
 * so /admin/google-ads has real history instead of nothing.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const snapshots = await prisma.googleAdsSnapshot.findMany({
    orderBy: { recordedAt: "desc" },
    take: 100,
  });

  const latest = snapshots[0] ?? null;

  return NextResponse.json({ latest, snapshots });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    campaignName,
    dateRangeFrom,
    dateRangeTo,
    impressions,
    clicks,
    costPkr,
    conversions,
    ctr,
    note,
  } = body;

  if (
    typeof campaignName !== "string" ||
    !dateRangeFrom ||
    !dateRangeTo ||
    typeof impressions !== "number" ||
    typeof clicks !== "number" ||
    typeof costPkr !== "number" ||
    typeof conversions !== "number" ||
    typeof ctr !== "number"
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const snapshot = await prisma.googleAdsSnapshot.create({
    data: {
      campaignName,
      dateRangeFrom: new Date(dateRangeFrom),
      dateRangeTo: new Date(dateRangeTo),
      impressions,
      clicks,
      costPkr,
      conversions,
      ctr,
      note: typeof note === "string" ? note : null,
    },
  });

  return NextResponse.json({ snapshot });
}
