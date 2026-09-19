/**
 * GET /api/travel/airports?q=lah — the airport picker's search.
 *
 * Server-side because the dataset is 310KB and the box shows seven rows. See
 * the header of lib/travel/airports.ts.
 */

import { NextRequest, NextResponse } from "next/server";

import { searchAirports, AIRPORT_COUNT } from "@/lib/travel/airports";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const limit = Math.min(20, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 8));

  return NextResponse.json(
    { airports: searchAirports(q, limit), total: AIRPORT_COUNT },
    {
      // The world's airports do not change between one keystroke and the next.
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
    },
  );
}
