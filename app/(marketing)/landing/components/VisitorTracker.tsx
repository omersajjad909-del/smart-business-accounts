"use client";
// Silent visitor tracker — fires on every marketing page view
// Stores anonymous sessionId in localStorage, never collects PII unless user submits a form.

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function getOrCreateSessionId(): string {
  try {
    const key = "fnv_sid";
    let sid = localStorage.getItem(key);
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem(key, sid);
    }
    return sid;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2);
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

    const sessionId   = getOrCreateSessionId();
    const referrer    = document.referrer || undefined;
    const params      = searchParams?.toString() ? Object.fromEntries(new URLSearchParams(searchParams.toString())) : {};

    // Fire track on page enter
    fetch("/api/public/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        page:        pathname,
        referrer:    referrer || null,
        utmSource:   params.utm_source   || null,
        utmMedium:   params.utm_medium   || null,
        utmCampaign: params.utm_campaign || null,
      }),
      keepalive: true,
    }).catch(() => {});

    // On page leave — send duration
    return () => {
      const duration = Math.round((Date.now() - enterTime.current) / 1000);
      if (duration < 1) return;
      navigator.sendBeacon(
        "/api/public/track",
        JSON.stringify({ sessionId, page: pathname, duration, _update: true })
      );
    };
  }, [pathname, searchParams]);

  return null;
}
