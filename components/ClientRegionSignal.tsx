"use client";

import { useEffect } from "react";

/**
 * Publishes the device's time zone as a cookie so the server can tell that a
 * visitor is in Pakistan even when IP geolocation says otherwise.
 *
 * Vercel's edge resolves a large part of Pakistani ISP address space to the
 * transit carrier's country — measured live from Karachi it reported `SG` —
 * which quoted real Pakistani customers the full USD price. The existing
 * accept-language fallback only catches the few whose browser is set to
 * `ur`/`en-PK`; most run `en-US`. Their clock, however, is on Asia/Karachi.
 *
 * Written once per load and read by lib/geoCountry.ts. See that file for why a
 * client-supplied signal is acceptable here.
 */
export default function ClientRegionSignal() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz) return;
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      // Lax so it still arrives on top-level navigations back from a payment
      // provider. Refreshed on every load, so a traveller's zone follows them.
      document.cookie = `fx_tz=${encodeURIComponent(tz)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`;
    } catch {
      // Intl is unavailable on some very old browsers — the IP and locale
      // signals still apply.
    }
  }, []);

  return null;
}
