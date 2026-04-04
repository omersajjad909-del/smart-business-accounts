"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getOrCreateVisitorSessionId } from "@/lib/visitorSession";

const APP_TRACKED_PREFIXES = [
  "/auth",
  "/onboarding",
  "/billing",
  "/website-login",
  "/website-signup",
  "/login",
  "/login-email",
  "/sso",
];

export default function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      !pathname ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/api") ||
      !APP_TRACKED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    ) {
      return;
    }

    const payload = JSON.stringify({
      page: pathname,
      referrer: document.referrer || "",
      sessionId: getOrCreateVisitorSessionId(),
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
