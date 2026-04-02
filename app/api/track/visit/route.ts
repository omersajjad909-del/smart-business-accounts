// FILE: app/api/track/visit/route.ts
// Called from every public page — tracks visitor IP, location, device, page
// Uses ip-api.com (free, no key needed, 45 req/min)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ip-api.com free tier — 45 requests/minute, no API key needed
async function geoFromIP(ip: string): Promise<{
  country: string; countryName: string; city: string;
  region: string; lat: number; lon: number; flag: string;
} | null> {
  // Skip local IPs
  if (!ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return { country:"US", countryName:"Local / Development", city:"Localhost", region:"Local", lat:0, lon:0, flag:"🌐" };
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,regionName,lat,lon`, {
      next: { revalidate: 3600 }, // cache 1 hour per IP
    });
    if (!res.ok) return null;
    const d = await res.json();
    if (d.status !== "success") return null;
    // Generate flag emoji from country code
    const flag = d.countryCode
      ? String.fromCodePoint(...d.countryCode.toUpperCase().split("").map((c: string) => 0x1F1E6 + c.charCodeAt(0) - 65))
      : "🌐";
    return { country:d.countryCode, countryName:d.country, city:d.city, region:d.regionName, lat:d.lat, lon:d.lon, flag };
  } catch { return null; }
}

function detectDevice(ua: string): "mobile" | "desktop" | "tablet" {
  if (!ua) return "desktop";
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

function detectBrowser(ua: string): string {
  if (!ua) return "Unknown";
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  return "Other";
}

export async function POST(req: NextRequest) {
  try {
    const { page, referrer, sessionId } = await req.json();

    // Get real IP — check headers in order
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip") || // Cloudflare
      "unknown";

    const ua     = req.headers.get("user-agent") || "";
    const device  = detectDevice(ua);
    const browser = detectBrowser(ua);

    // Geo lookup (with cache)
    const geo = await geoFromIP(ip);

    const visitData = {
      ip:          ip.slice(0, 45), // truncate for privacy
      country:     geo?.country     || "XX",
      countryName: geo?.countryName || "Unknown",
      city:        geo?.city        || "Unknown",
      region:      geo?.region      || "",
      lat:         geo?.lat         || 0,
      lon:         geo?.lon         || 0,
      flag:        geo?.flag        || "🌐",
      device,
      browser,
      page:        page || "/",
      referrer:    referrer || "",
      sessionId:   sessionId || "",
      visitedAt:   new Date(),
    };

    // Store in SiteVisit model if exists, otherwise ActivityLog
    try {
      await (prisma as any).siteVisit.create({ data: visitData });
    } catch {
      // Fallback: ActivityLog
      await prisma.activityLog.create({
        data: {
          action:  "SITE_VISIT",
          details: JSON.stringify(visitData),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // Never crash — silently fail for tracking
    return NextResponse.json({ ok: false });
  }
}