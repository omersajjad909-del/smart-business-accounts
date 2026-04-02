import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type GeoInfo = {
  country: string;
  countryName: string;
  city: string;
  region: string;
  lat: number;
  lon: number;
  flag: string;
};

function countryCodeToFlag(countryCode: string) {
  if (!countryCode || countryCode.length !== 2) return "GL";

  try {
    return String.fromCodePoint(
      ...countryCode
        .toUpperCase()
        .split("")
        .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
    );
  } catch {
    return "GL";
  }
}

function geoFromHeaders(req: NextRequest): GeoInfo {
  const country =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    "US";
  const city =
    req.headers.get("x-vercel-ip-city") ||
    req.headers.get("x-appengine-city") ||
    "Unknown";
  const region =
    req.headers.get("x-vercel-ip-country-region") ||
    req.headers.get("x-appengine-region") ||
    "";

  return {
    country,
    countryName: country,
    city,
    region,
    lat: 0,
    lon: 0,
    flag: countryCodeToFlag(country),
  };
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

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    const ua = req.headers.get("user-agent") || "";
    const device = detectDevice(ua);
    const browser = detectBrowser(ua);

    const isLocalIp =
      !ip ||
      ip === "::1" ||
      ip === "unknown" ||
      ip.startsWith("127.") ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.");

    const geo = isLocalIp
      ? {
          country: "US",
          countryName: "Local / Development",
          city: "Localhost",
          region: "Local",
          lat: 0,
          lon: 0,
          flag: "GL",
        }
      : geoFromHeaders(req);

    const visitData = {
      ip: ip.slice(0, 45),
      country: geo.country || "XX",
      countryName: geo.countryName || "Unknown",
      city: geo.city || "Unknown",
      region: geo.region || "",
      lat: geo.lat || 0,
      lon: geo.lon || 0,
      flag: geo.flag || "GL",
      device,
      browser,
      page: page || "/",
      referrer: referrer || "",
      sessionId: sessionId || "",
      visitedAt: new Date(),
    };

    try {
      await (prisma as any).siteVisit.create({ data: visitData });
    } catch {
      await prisma.activityLog.create({
        data: {
          action: "SITE_VISIT",
          details: JSON.stringify(visitData),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
