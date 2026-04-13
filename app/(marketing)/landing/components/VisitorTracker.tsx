"use client";
// Silent visitor tracker — fires on every marketing page view
// Stores anonymous sessionId in localStorage, never collects PII unless user submits a form.

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getOrCreateVisitorSessionId } from "@/lib/visitorSession";

async function getPreciseGeoIfGranted(): Promise<{ lat: number; lon: number } | null> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) return null;
  try {
    if (!("permissions" in navigator) || typeof (navigator as any).permissions?.query !== "function") {
      return null;
    }
    const status = await (navigator as any).permissions.query({ name: "geolocation" });
    if (status?.state !== "granted") return null;
    return await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          lat: Number(position.coords.latitude),
          lon: Number(position.coords.longitude),
        }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
      );
    });
  } catch {
    return null;
  }
}

export default function VisitorTracker() {
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const enterTime   = useRef<number>(Date.now());

  useEffect(() => {
    enterTime.current = Date.now();

    // Don't track admin/dashboard/auth pages
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/api")) return;

    const sessionId = getOrCreateVisitorSessionId();
    const referrer = document.referrer || undefined;
    const params = searchParams?.toString() ? Object.fromEntries(new URLSearchParams(searchParams.toString())) : {};

    void (async () => {
      const preciseGeo = await getPreciseGeoIfGranted();
      fetch("/api/public/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          page: pathname,
          referrer: referrer || null,
          utmSource: params.utm_source || null,
          utmMedium: params.utm_medium || null,
          utmCampaign: params.utm_campaign || null,
          lat: preciseGeo?.lat ?? null,
          lon: preciseGeo?.lon ?? null,
          geoPrecision: preciseGeo ? "exact" : "approximate",
        }),
        keepalive: true,
      }).catch(() => {});
    })();

    // On page leave — send duration
    return () => {
      const duration = Math.round((Date.now() - enterTime.current) / 1000);
      if (duration < 1) return;
      const payload = new Blob(
        [JSON.stringify({ sessionId, page: pathname, duration, _update: true })],
        { type: "application/json" },
      );
      navigator.sendBeacon("/api/public/track", payload);
    };
  }, [pathname, searchParams]);

  return null;
}
