"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

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
    companies: number; exactCompanies: number;
    branches: number;  exactBranches: number;
    visitors: number;  exactVisitors: number;
  };
};

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: 480, borderRadius: 16, background: "#060d1e", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.3)", fontSize: 13 }}>
      Loading map…
    </div>
  ),
});

type Tab = "companies" | "branches" | "visitors";

const TAB_CONFIG: { key: Tab; label: string; color: string; accent: string }[] = [
  { key: "companies", label: "Companies", color: "#6366f1", accent: "rgba(99,102,241,.18)" },
  { key: "branches",  label: "Branches",  color: "#22c55e", accent: "rgba(34,197,94,.15)"  },
  { key: "visitors",  label: "Visitors",  color: "#38bdf8", accent: "rgba(56,189,248,.15)" },
];

export default function GeoAnalyticsPage() {
  const [data, setData]   = useState<GeoResponse | null>(null);
  const [tab, setTab]     = useState<Tab>("visitors");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/geo/map", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(j => setData(j))
      .catch(() => setData({ companies: [], branches: [], visitors: [], stats: { companies: 0, exactCompanies: 0, branches: 0, exactBranches: 0, visitors: 0, exactVisitors: 0 } }))
      .finally(() => setLoading(false));
  }, []);

  const currentPins = useMemo(() => {
    if (!data) return [];
    return data[tab];
  }, [data, tab]);

  const filteredPins = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return currentPins;
    return currentPins.filter(pin =>
      [pin.label, pin.subtitle, pin.country, pin.address, pin.city, pin.page, pin.device]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(q))
    );
  }, [currentPins, query]);

  const tabConf = TAB_CONFIG.find(t => t.key === tab)!;

  const statCards = [
    { label: "Companies", value: data?.stats.companies ?? 0, sub: `${data?.stats.exactCompanies ?? 0} exact pins`,   color: "#6366f1" },
    { label: "Branches",  value: data?.stats.branches  ?? 0, sub: `${data?.stats.exactBranches  ?? 0} exact pins`,   color: "#22c55e" },
    { label: "Visitors",  value: data?.stats.visitors  ?? 0, sub: `${data?.stats.exactVisitors  ?? 0} precise pins`, color: "#38bdf8" },
  ];

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 80px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Geo Analytics</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
          Live world map — company locations, branches, and visitor activity.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".1em", marginBottom: 8 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{loading ? "—" : s.value.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tab buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {TAB_CONFIG.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              border: tab === t.key ? `1px solid ${t.color}` : "1px solid rgba(255,255,255,.1)",
              background: tab === t.key ? t.accent : "rgba(255,255,255,.04)",
              color: tab === t.key ? "white" : "rgba(255,255,255,.45)",
              transition: "all .2s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 18 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={tab === "visitors" ? "Search by country, city, page, or device…" : "Search by name, country, city…"}
          style={{
            width: "100%",
            background: "rgba(255,255,255,.04)",
            border: "1.5px solid rgba(255,255,255,.1)",
            borderRadius: 12,
            padding: "10px 16px",
            color: "white",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Map + list */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.6fr", gap: 16 }}>
        {/* Map */}
        <div style={{ background: "#060d1e", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, overflow: "hidden", padding: 6 }}>
          <LeafletMap pins={filteredPins} color={tabConf.color} />
        </div>

        {/* Pin list */}
        <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: "18px 16px", overflowY: "auto", maxHeight: 540 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".1em", marginBottom: 14 }}>
            {tab === "companies" ? "TOP COMPANIES" : tab === "branches" ? "BRANCH PINS" : "RECENT VISITORS"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredPins.slice(0, 20).map((pin, i) => (
              <div key={`${pin.type}-${pin.label}-${i}`} style={{
                background: "rgba(255,255,255,.03)",
                border: "1px solid rgba(255,255,255,.07)",
                borderRadius: 12,
                padding: "12px 14px",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{pin.label}</div>
                  <span style={{
                    padding: "2px 8px", borderRadius: 20, fontSize: 9, fontWeight: 800, letterSpacing: ".08em", flexShrink: 0,
                    background: pin.precision === "exact" ? "rgba(34,197,94,.15)" : "rgba(255,255,255,.08)",
                    color: pin.precision === "exact" ? "#4ade80" : "rgba(255,255,255,.4)",
                  }}>
                    {pin.precision.toUpperCase()}
                  </span>
                </div>
                {pin.subtitle && <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 4 }}>{pin.subtitle}</div>}
                {(pin.address || pin.city) && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>
                    {[pin.city, pin.address, pin.country].filter(Boolean).join(", ")}
                  </div>
                )}
                {pin.country && !pin.city && !pin.address && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{pin.country}</div>
                )}
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.2)", marginTop: 4, fontFamily: "monospace" }}>
                  {pin.lat.toFixed(4)}, {pin.lon.toFixed(4)}
                </div>
              </div>
            ))}
            {filteredPins.length === 0 && (
              <div style={{ padding: "30px 0", textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: 13 }}>
                No pins for this filter.
              </div>
            )}
            {filteredPins.length > 20 && (
              <div style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,.3)", padding: "8px 0" }}>
                +{filteredPins.length - 20} more not shown
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
