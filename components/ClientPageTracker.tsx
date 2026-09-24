"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { COOKIE_CONSENT_EVENT, readCookieConsent } from "@/lib/cookieConsent";

export default function ClientPageTracker({ userId, companyId }: { userId: string; companyId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !pathname.startsWith("/dashboard/") && pathname !== "/dashboard") return;
    if (!userId || !companyId) return;

    let sent = false;
    const send = () => {
      if (sent || !readCookieConsent()?.analytics) return;
      sent = true;
      fetch("/api/track/client-page", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId, "x-company-id": companyId },
        credentials: "include",
        keepalive: true,
        body: JSON.stringify({ page: pathname }),
      }).catch(() => {});
    };

    send();
    window.addEventListener(COOKIE_CONSENT_EVENT, send as EventListener);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, send as EventListener);
  }, [pathname, userId, companyId]);

  return null;
}
