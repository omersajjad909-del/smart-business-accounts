import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COUNTRY_FLAGS: Record<string, string> = {
  US:"🇺🇸",GB:"🇬🇧",DE:"🇩🇪",FR:"🇫🇷",IN:"🇮🇳",PK:"🇵🇰",CN:"🇨🇳",JP:"🇯🇵",
  AU:"🇦🇺",CA:"🇨🇦",BR:"🇧🇷",RU:"🇷🇺",SA:"🇸🇦",AE:"🇦🇪",NG:"🇳🇬",ZA:"🇿🇦",
  EG:"🇪🇬",TR:"🇹🇷",ID:"🇮🇩",MY:"🇲🇾",SG:"🇸🇬",BD:"🇧🇩",PH:"🇵🇭",KE:"🇰🇪",
  NL:"🇳🇱",SE:"🇸🇪",NO:"🇳🇴",IT:"🇮🇹",ES:"🇪🇸",PL:"🇵🇱",MX:"🇲🇽",AR:"🇦🇷",
};

function getDevice(ua: string): string {
  if (/mobile|android|iphone|ipod/i.test(ua)) return "mobile";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  return "desktop";
}

function getBrowser(ua: string): string {
  if (/edg/i.test(ua))     return "Edge";
  if (/chrome/i.test(ua))  return "Chrome";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua))  return "Safari";
  if (/opera/i.test(ua))   return "Opera";
  return "Other";
}

function getOs(ua: string): string {
  if (/windows/i.test(ua))   return "Windows";
  if (/mac os/i.test(ua))    return "macOS";
  if (/android/i.test(ua))   return "Android";
  if (/iphone|ipad/i.test(ua)) return "iOS";
  if (/linux/i.test(ua))     return "Linux";
  return "Other";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, page, referrer, utmSource, utmMedium, utmCampaign, duration } = body;

    if (!sessionId || !page) return NextResponse.json({ ok: false }, { status: 400 });

    const ua     = req.headers.get("user-agent") || "";
    const rawIp  = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || null;
    const device  = getDevice(ua);
    const browser = getBrowser(ua);
    const os      = getOs(ua);

    let country: string | null = null;
    let countryName: string | null = null;
    let city: string | null = null;
    let flag: string | null = null;
    let lat: number | null = null;
    let lon: number | null = null;

    // Geo lookup (best-effort, 2s timeout)
    if (rawIp && rawIp !== "127.0.0.1" && rawIp !== "::1" && !rawIp.startsWith("192.")) {
      try {
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), 2000);
        const geo = await fetch(`https://ipapi.co/${rawIp}/json/`, { signal: ac.signal });
        clearTimeout(t);
        if (geo.ok) {
          const g = await geo.json();
          country     = String(g.country_code || g.country || "").toUpperCase() || null;
          countryName = g.country_name || country;
          city        = g.city || null;
          lat         = g.latitude  || null;
          lon         = g.longitude || null;
          flag        = country ? (COUNTRY_FLAGS[country] || "🌐") : null;
        }
      } catch {}
    }

    const db = prisma as any;
    await db.siteVisit.create({
      data: {
        id:          crypto.randomUUID(),
        sessionId,
        page,
        referrer:    referrer || null,
        utmSource:   utmSource || null,
        utmMedium:   utmMedium || null,
        utmCampaign: utmCampaign || null,
        country, countryName, city, flag,
        device, browser, os,
        ip:          rawIp,
        lat, lon,
        duration:    typeof duration === "number" ? duration : null,
        visitedAt:   new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // Silently fail — never break the visitor's browsing
    console.error("[track]", e.message);
    return NextResponse.json({ ok: false });
  }
}
