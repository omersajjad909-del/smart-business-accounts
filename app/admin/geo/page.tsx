"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type GeoPin = {
  type: "company" | "branch" | "visitor";
  label: string;
  subtitle?: string | null;
  country?: string | null;
  lat: number;
  lon: number;
  precision: "exact" | "country";
  address?: string | null;
  city?: string | null;
  page?: string | null;
  device?: string | null;
  plan?: string | null;
  isActive?: boolean;
  visitedAt?: string | null;
};

type GeoResponse = {
  companies: GeoPin[];
  branches: GeoPin[];
  visitors: GeoPin[];
  stats: {
    companies: number;
    exactCompanies: number;
    branches: number;
    exactBranches: number;
    visitors: number;
    exactVisitors: number;
  };
};

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">{label}</div>
      <div className="mt-2 text-3xl font-extrabold text-white">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-white/45">{sub}</div>
    </div>
  );
}

function MapCanvas({ pins, color }: { pins: GeoPin[]; color: string }) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    if (!document.querySelector('link[data-maplibre-admin="true"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/maplibre-gl@3.5.2/dist/maplibre-gl.css";
      link.setAttribute("data-maplibre-admin", "true");
      document.head.appendChild(link);
    }

    function boot() {
      const maplibregl = (window as any).maplibregl;
      if (!mapDivRef.current || !maplibregl) return;
      const map = new maplibregl.Map({
        container: mapDivRef.current,
        style: "https://demotiles.maplibre.org/style.json",
        center: [18, 22],
        zoom: 1.45,
      });
      map.addControl(new maplibregl.NavigationControl(), "top-right");
      mapRef.current = map;
    }

    if ((window as any).maplibregl) {
      boot();
    } else {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/maplibre-gl@3.5.2/dist/maplibre-gl.js";
      script.async = true;
      script.onload = boot;
      document.body.appendChild(script);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = (window as any).maplibregl;
    if (!map || !maplibregl) return;

    const markers: any[] = [];
    for (const pin of pins) {
      const el = document.createElement("div");
      const isExact = pin.precision === "exact";
      const isLiveVisitor = pin.type === "visitor" && !!pin.visitedAt && Date.now() - new Date(pin.visitedAt).getTime() < 30 * 60 * 1000;
      el.style.width = isExact ? "18px" : "12px";
      el.style.height = isExact ? "18px" : "12px";
      el.style.borderRadius = "9999px";
      el.style.background = isExact ? color : "rgba(255,255,255,.58)";
      el.style.border = isExact ? "2px solid rgba(255,255,255,.92)" : "1px solid rgba(255,255,255,.35)";
      el.style.boxShadow = isExact ? `0 0 0 8px ${color}26` : "0 0 0 5px rgba(255,255,255,.08)";
      if (isLiveVisitor) {
        el.style.animation = "finovaGeoPulse 1.6s ease infinite";
      }

      const popupHtml = `
        <div style="min-width:210px;font-family:system-ui,sans-serif">
          <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:4px;">${pin.label}</div>
          ${pin.subtitle ? `<div style="font-size:12px;color:#475569;margin-bottom:4px;">${pin.subtitle}</div>` : ""}
          ${pin.address ? `<div style="font-size:12px;color:#334155;margin-bottom:2px;">${pin.address}</div>` : ""}
          ${pin.city ? `<div style="font-size:12px;color:#475569;margin-bottom:2px;">City: ${pin.city}</div>` : ""}
          <div style="font-size:12px;color:${isExact ? "#2563eb" : "#64748b"};font-weight:700;">
            ${isExact ? "Exact pin" : "Country fallback"}
          </div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([pin.lon, pin.lat])
        .setPopup(new maplibregl.Popup({ offset: 14 }).setHTML(popupHtml))
        .addTo(map);
      markers.push(marker);
    }

    if (pins.length) {
      const bounds = new maplibregl.LngLatBounds();
      pins.forEach((pin) => bounds.extend([pin.lon, pin.lat]));
      map.fitBounds(bounds, { padding: 48, maxZoom: 4.2, duration: 600 });
    }

    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [pins, color]);

  return (
    <>
      <style>{`
        @keyframes finovaGeoPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(56,189,248,.55); }
          70% { transform: scale(1.14); box-shadow: 0 0 0 14px rgba(56,189,248,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(56,189,248,0); }
        }
      `}</style>
      <div ref={mapDivRef} className="w-full rounded-2xl" style={{ minHeight: 360 }} />
    </>
  );
}

export default function GeoAnalyticsPage() {
  const [data, setData] = useState<GeoResponse | null>(null);
  const [tab, setTab] = useState<"companies" | "branches" | "visitors">("companies");
  const [query, setQuery] = useState("");

  useEffect(() => {
    void fetch("/api/admin/geo/map", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((json) => setData(json))
      .catch(() => setData({ companies: [], branches: [], visitors: [], stats: { companies: 0, exactCompanies: 0, branches: 0, exactBranches: 0, visitors: 0, exactVisitors: 0 } }));
  }, []);

  const currentPins = useMemo(() => {
    if (!data) return [];
    if (tab === "companies") return data.companies;
    if (tab === "branches") return data.branches;
    return data.visitors;
  }, [data, tab]);

  const filteredPins = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return currentPins;
    return currentPins.filter((pin) =>
      [pin.label, pin.subtitle, pin.country, pin.address, pin.city, pin.page, pin.device]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [currentPins, query]);

  const currentColor = tab === "companies" ? "#6366f1" : tab === "branches" ? "#22c55e" : "#38bdf8";

  return (
    <div className="min-h-screen bg-[#070b1a] px-4 py-6 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight">Geo Analytics</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/50">
            Precise world map for companies, branch pins, and visitor activity. Exact browser/company coordinates are used when available, with privacy-safe country fallback when they are not.
          </p>
        </div>

        <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-3">
          <StatCard label="Companies" value={data?.stats.companies || 0} sub={`${data?.stats.exactCompanies || 0} exact pins`} />
          <StatCard label="Branches" value={data?.stats.branches || 0} sub={`${data?.stats.exactBranches || 0} exact pins`} />
          <StatCard label="Visitors" value={data?.stats.visitors || 0} sub={`${data?.stats.exactVisitors || 0} precise visitor pins`} />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: "companies", label: "Companies" },
            { key: "branches", label: "Branches" },
            { key: "visitors", label: "Visitors" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key as typeof tab)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                tab === item.key
                  ? "border-indigo-400 bg-indigo-500/20 text-white"
                  : "border-white/10 bg-white/5 text-white/55 hover:border-white/20"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mb-6">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tab === "visitors" ? "Search by country, city, page, or device" : "Search by label, country, city, or address"}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_.55fr]">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-2">
            <MapCanvas pins={filteredPins} color={currentColor} />
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-white/35">
              {tab === "companies" ? "Top Companies" : tab === "branches" ? "Branch Pins" : "Recent Visitors"}
            </div>
            <div className="space-y-3">
              {filteredPins.slice(0, 12).map((pin, index) => (
                <div key={`${pin.type}-${pin.label}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{pin.label}</div>
                      {pin.subtitle && <div className="mt-1 text-xs text-white/45">{pin.subtitle}</div>}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${pin.precision === "exact" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/45"}`}>
                      {pin.precision}
                    </span>
                  </div>
                  {(pin.address || pin.city) && (
                    <div className="mt-2 text-xs text-white/45">{pin.address || pin.city}</div>
                  )}
                  <div className="mt-2 text-[11px] text-white/30">
                    {pin.lat.toFixed(4)}, {pin.lon.toFixed(4)}
                  </div>
                </div>
              ))}
              {!filteredPins.length && (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/35">
                  No geo pins available yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
