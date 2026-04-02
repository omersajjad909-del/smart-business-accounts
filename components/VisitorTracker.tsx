"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function generateSessionId(): string {
  const key = "fv_sid";
  if (typeof window === "undefined") return "";

  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(key, sid);
  }

  return sid;
}

export default function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
      return;
    }

    const payload = JSON.stringify({
      page: pathname,
      referrer: document.referrer || "",
      sessionId: generateSessionId(),
    });

    // Beacon prevents long-running background tracking from keeping the tab loading.
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/track/visit", blob);
      return;
    }

    fetch("/api/track/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
