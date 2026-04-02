"use client";

import { useEffect, useRef } from "react";
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
  const startTime = useRef<number>(0);

  useEffect(() => {
    // Don't track admin pages or dashboard pages if you want to exclude them
    // if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) return;

    startTime.current = Date.now();
    const sessionId = generateSessionId();
    const referrer = document.referrer || "";

    // Fire and forget — never block UI
    // Make sure /api/track/visit exists or create it if needed
    fetch("/api/track/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: pathname, referrer, sessionId }),
    }).catch(() => {}); // silent fail

  }, [pathname]);

  // Nothing renders — invisible tracker
  return null;
}
