"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getOrCreateVisitorSessionId } from "@/lib/visitorSession";
import { COOKIE_CONSENT_EVENT, readCookieConsent } from "@/lib/cookieConsent";

// Pages to skip — internal / authenticated areas
const SKIP_PREFIXES = [
  "/admin",
  "/dashboard",
  "/api",
];

export default function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;

    const sendVisit = () => {
      const consent = readCookieConsent();
      if (!consent?.analytics) return;

      const payload = JSON.stringify({
        page: pathname,
        referrer: document.referrer || "",
        sessionId: getOrCreateVisitorSessionId(),
      });

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
    };

    sendVisit();

    const handleConsent = () => sendVisit();
    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsent as EventListener);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsent as EventListener);
  }, [pathname]);

  return null;
}
