"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { readCookieConsent } from "@/lib/cookieConsent";
import { getOrCreateVisitorSessionId } from "@/lib/visitorSession";

const SKIP_PREFIXES = ["/dashboard", "/admin", "/api"];

export default function GeoPrecisionPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pathname || SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      setVisible(false);
      return;
    }

    const consent = readCookieConsent();
    if (!consent?.analytics) {
      setVisible(false);
      return;
    }

    // If user dismissed before, don't show again
    try {
      const dismissed = localStorage.getItem("geo_prompt_dismissed");
      if (dismissed) { setVisible(false); return; }
    } catch { /* ignore */ }

    let mounted = true;
    void (async () => {
      try {
        if (typeof window === "undefined" || !("geolocation" in navigator) || !("permissions" in navigator)) {
          if (mounted) setVisible(false);
          return;
        }
        const status = await (navigator as any).permissions.query({ name: "geolocation" });
        if (!mounted) return;
        setVisible(status?.state !== "granted");
      } catch {
        if (mounted) setVisible(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  async function enablePreciseLocation() {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await fetch("/api/public/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: getOrCreateVisitorSessionId(),
              page: pathname,
              referrer: document.referrer || null,
              lat: Number(position.coords.latitude),
              lon: Number(position.coords.longitude),
              geoPrecision: "exact",
            }),
            keepalive: true,
          });
          try { localStorage.setItem("geo_prompt_dismissed","1"); } catch{}
          setVisible(false);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 }
    );
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 114,
        zIndex: 9997,
        width: 320,
        borderRadius: 18,
        border: "1px solid rgba(56,189,248,.22)",
        background: "rgba(8,13,29,.94)",
        boxShadow: "0 20px 56px rgba(0,0,0,.42)",
        backdropFilter: "blur(16px)",
        padding: 16,
        color: "white",
        fontFamily: "'Outfit','Inter',sans-serif",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "#7dd3fc" }}>
        Precise Geo
      </div>
      <div style={{ marginTop: 8, fontSize: 17, fontWeight: 800 }}>
        Improve location accuracy
      </div>
      <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,.66)" }}>
        Allow location once to place exact visitor pins on the admin geo map. If you skip, FinovaOS will still use privacy-safe country fallback.
      </div>
      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={enablePreciseLocation}
          disabled={loading}
          style={{
            flex: 1,
            border: "none",
            borderRadius: 12,
            padding: "10px 14px",
            background: "linear-gradient(135deg,#0ea5e9,#2563eb)",
            color: "white",
            fontWeight: 800,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Requesting..." : "Enable Exact Pin"}
        </button>
        <button
          type="button"
          onClick={() => { try { localStorage.setItem("geo_prompt_dismissed","1"); } catch{} setVisible(false); }}
          style={{
            borderRadius: 12,
            padding: "10px 14px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,.12)",
            color: "rgba(255,255,255,.72)",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}
