"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getOrCreateVisitorSessionId } from "@/lib/visitorSession";

// Pages to skip — internal / authenticated areas
const SKIP_PREFIXES = [
  "/admin",
  "/dashboard",
  "/api",
];

export default function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      !pathname ||
      SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))
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
