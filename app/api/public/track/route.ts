import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸",
  GB: "🇬🇧",
  DE: "🇩🇪",
  FR: "🇫🇷",
  IN: "🇮🇳",
  PK: "🇵🇰",
  CN: "🇨🇳",
  JP: "🇯🇵",
  AU: "🇦🇺",
  CA: "🇨🇦",
  BR: "🇧🇷",
  RU: "🇷🇺",
  SA: "🇸🇦",
  AE: "🇦🇪",
  NG: "🇳🇬",
  ZA: "🇿🇦",
  EG: "🇪🇬",
  TR: "🇹🇷",
  ID: "🇮🇩",
  MY: "🇲🇾",
  SG: "🇸🇬",
  BD: "🇧🇩",
  PH: "🇵🇭",
  KE: "🇰🇪",
  NL: "🇳🇱",
  SE: "🇸🇪",
  NO: "🇳🇴",
  IT: "🇮🇹",
  ES: "🇪🇸",
  PL: "🇵🇱",
  MX: "🇲🇽",
  AR: "🇦🇷",
};

function getDevice(ua: string): string {
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod/i.test(ua)) return "mobile";
  return "desktop";
}

function getBrowser(ua: string): string {
  if (/edg/i.test(ua)) return "Edge";
  if (/chrome/i.test(ua)) return "Chrome";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  if (/opera|opr/i.test(ua)) return "Opera";
  return "Other";
}

function getOs(ua: string): string {
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad/i.test(ua)) return "iOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}

function geoFromHeaders(req: NextRequest) {
  const country =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-appengine-country") ||
    null;
  const city =
    req.headers.get("x-vercel-ip-city") ||
    req.headers.get("x-appengine-city") ||
    null;
  const countryRegion =
    req.headers.get("x-vercel-ip-country-region") ||
    req.headers.get("x-appengine-region") ||
    null;

  const normalizedCountry = country ? String(country).toUpperCase() : null;

  return {
    country: normalizedCountry,
    countryName: normalizedCountry,
    city,
    countryRegion,
    flag: normalizedCountry ? COUNTRY_FLAGS[normalizedCountry] || "🌐" : null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      sessionId,
      page,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      duration,
      _update,
    } = body;

    if (!sessionId || !page) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const db = prisma as any;

    if (_update) {
      const latestVisit = await db.siteVisit.findFirst({
        where: { sessionId, page },
        orderBy: { visitedAt: "desc" },
        select: { id: true, duration: true },
      });

      if (latestVisit) {
        await db.siteVisit.update({
          where: { id: latestVisit.id },
          data: { duration: typeof duration === "number" ? duration : latestVisit.duration ?? null },
        });
      }

      return NextResponse.json({ ok: true });
    }

    const ua = req.headers.get("user-agent") || "";
    const rawIp =
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip") ||
      null;

    const geo = geoFromHeaders(req);

    await db.siteVisit.create({
      data: {
        sessionId,
        page,
        referrer: referrer || null,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        country: geo.country,
        countryName: geo.countryName,
        city: geo.city,
        flag: geo.flag,
        device: getDevice(ua),
        browser: getBrowser(ua),
        os: getOs(ua),
        ip: rawIp,
        duration: typeof duration === "number" ? duration : null,
        visitedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[public-track]", e.message);
    return NextResponse.json({ ok: false });
  }
}
