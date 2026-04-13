// FILE: app/api/admin/visitors/route.ts
// Returns aggregated visitor data for admin panel
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { getCountryCenter } from "@/lib/geoMapData";

function isAdmin(req: NextRequest) {
  const role = String(req.headers.get("x-user-role") || "").toUpperCase();
  if (role === "ADMIN") return true;
  try { const p = verifyJwt(getTokenFromRequest(req as any)!); return String(p?.role||"").toUpperCase()==="ADMIN"; } catch { return false; }
}

function getRangeDate(range: string): Date {
  const now = new Date();
  if (range === "24h") return new Date(now.getTime() - 24 * 3600 * 1000);
  if (range === "7d")  return new Date(now.getTime() - 7  * 86400 * 1000);
  if (range === "30d") return new Date(now.getTime() - 30 * 86400 * 1000);
  if (range === "live") return new Date(now.getTime() - 30 * 60 * 1000); // last 30 min
  return new Date(now.getTime() - 7 * 86400 * 1000);
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const range = req.nextUrl.searchParams.get("range") || "7d";
  const since = getRangeDate(range);

  try {
    let visits: any[] = [];

    // Try SiteVisit model first
    try {
      visits = await (prisma as any).siteVisit.findMany({
        where: { visitedAt: { gte: since } },
        select: { country:true, countryName:true, city:true, flag:true, device:true, browser:true, page:true, sessionId:true, visitedAt:true, lat:true, lon:true },
        orderBy: { visitedAt: "desc" },
        take: 5000,
      });
    } catch {
      // Fallback: ActivityLog SITE_VISIT entries
      const logs = await prisma.activityLog.findMany({
        where: { action: "SITE_VISIT", createdAt: { gte: since } },
        select: { details: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5000,
      });
      visits = logs.map(l => {
        try { return { ...JSON.parse(l.details||"{}"), visitedAt: l.createdAt }; }
        catch { return null; }
      }).filter(Boolean);
    }

    // If live — return raw visits for map dots
    if (range === "live") {
      const live = visits.slice(0, 50).map(v => ({
        country: v.country, countryName: v.countryName, city: v.city,
        flag: v.flag, device: v.device, page: v.page,
        duration: "Active",
        lat: v.lat ?? null,
        lon: v.lon ?? null,
      }));
      return NextResponse.json({ live, rows: [], stats: {} });
    }

    // Aggregate by country
    const byCountry = new Map<string, {
      country:string; countryName:string; flag:string; topCity:string;
      visitors:number; uniqueVisitors:Set<string>; cities:Map<string,number>;
    }>();

    const deviceCount = { mobile:0, desktop:0, tablet:0 };
    const pageCount   = new Map<string, number>();
    const uniqueSessions = new Set<string>();

    for (const v of visits) {
      const code = v.country || "XX";
      if (!byCountry.has(code)) {
        byCountry.set(code, { country:code, countryName:v.countryName||code, flag:v.flag||"🌐", topCity:v.city||"", visitors:0, uniqueVisitors:new Set(), cities:new Map() });
      }
      const entry = byCountry.get(code)!;
      entry.visitors++;
      if (v.sessionId) { entry.uniqueVisitors.add(v.sessionId); uniqueSessions.add(v.sessionId); }

      // City count
      if (v.city) entry.cities.set(v.city, (entry.cities.get(v.city)||0)+1);

      // Device
      if (v.device in deviceCount) deviceCount[v.device as keyof typeof deviceCount]++;

      // Page
      if (v.page) pageCount.set(v.page, (pageCount.get(v.page)||0)+1);
    }

    // Convert to rows
    const rows = Array.from(byCountry.values()).map(e => {
      // Find top city
      let topCity = e.topCity;
      let maxCityCount = 0;
      e.cities.forEach((count, city) => { if (count > maxCityCount) { maxCityCount = count; topCity = city; } });

      return {
        country:       e.country,
        countryName:   e.countryName,
        flag:          e.flag,
        topCity,
        visitors:      e.visitors,
        uniqueVisitors:e.uniqueVisitors.size,
      };
    }).sort((a, b) => b.visitors - a.visitors);

    // Top pages
    const topPages = Array.from(pageCount.entries())
      .sort((a,b) => b[1]-a[1])
      .slice(0, 8)
      .map(([page, visits]) => ({ page, visits }));

    // Device breakdown %
    const totalDevices = deviceCount.mobile + deviceCount.desktop + deviceCount.tablet || 1;
    const deviceBreakdown = {
      mobile:  Math.round((deviceCount.mobile  / totalDevices) * 100),
      desktop: Math.round((deviceCount.desktop / totalDevices) * 100),
      tablet:  Math.round((deviceCount.tablet  / totalDevices) * 100),
    };

    const stats = {
      totalVisits:    visits.length,
      uniqueVisitors: uniqueSessions.size,
      countries:      byCountry.size,
      cities:         new Set(visits.map((v:any)=>v.city).filter(Boolean)).size,
      precisePins:    visits.filter((v:any)=>typeof v.lat === "number" && typeof v.lon === "number").length,
      deviceBreakdown,
      topPages,
    };

    const exactPins = visits
      .filter((v:any) => typeof v.lat === "number" && Number.isFinite(v.lat) && typeof v.lon === "number" && Number.isFinite(v.lon))
      .slice(0, 500)
      .map((v:any) => ({
        lat: v.lat,
        lon: v.lon,
        country: v.country,
        countryName: v.countryName,
        city: v.city,
        page: v.page,
        device: v.device,
        flag: v.flag,
        precision: "exact",
      }));

    const fallbackPins = rows
      .filter((row) => !exactPins.some((pin) => pin.country === row.country))
      .map((row) => {
        const center = getCountryCenter(row.country);
        if (!center) return null;
        return {
          lat: center.lat,
          lon: center.lon,
          country: row.country,
          countryName: row.countryName,
          city: row.topCity,
          page: "",
          device: "",
          flag: row.flag,
          precision: "country",
          visitors: row.visitors,
          uniqueVisitors: row.uniqueVisitors,
        };
      })
      .filter(Boolean);

    // Live — last 30 min visits for map
    const liveVisits = visits.filter((v:any) => {
      const t = new Date(v.visitedAt).getTime();
      return Date.now() - t < 30 * 60 * 1000;
    }).slice(0, 30).map((v:any) => ({
      country:v.country, countryName:v.countryName, city:v.city,
      flag:v.flag, device:v.device, page:v.page,
    }));

    return NextResponse.json({ rows, stats, live: liveVisits, mapPins: [...exactPins, ...fallbackPins] });
  } catch (e: any) {
    console.error("[visitors]", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
