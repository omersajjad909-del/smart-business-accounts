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
    companies: number;
    exactCompanies: number;
    branches: number;
    exactBranches: number;
    visitors: number;
    exactVisitors: number;
  };
};

// Leaflet must be client-only (no SSR)
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: 520, borderRadius: 20, background: "#060d1e", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.3)", fontSize: 13 }}>
      Loading map…
    </div>
  ),
});

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">{label}</div>
      <div className="mt-2 text-3xl font-extrabold text-white">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-white/45">{sub}</div>
    </div>
  );
}

export default function GeoAnalyticsPage() {
  const [data, setData]   = useState<GeoResponse | null>(null);
  const [tab, setTab]     = useState<"companies" | "branches" | "visitors">("companies");
  const [query, setQuery] = useState("");

  useEffect(() => {
    void fetch("/api/admin/geo/map", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((json) => setData(json))
      .catch(() =>
        setData({ companies: [], branches: [], visitors: [], stats: { companies: 0, exactCompanies: 0, branches: 0, exactBranches: 0, visitors: 0, exactVisitors: 0 } })
      );
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
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [currentPins, query]);

  const currentColor = tab === "companies" ? "#6366f1" : tab === "branches" ? "#22c55e" : "#38bdf8";

  return (
    <div className="min-h-screen bg-[#070b1a] px-4 py-6 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight">Geo Analytics</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/50">
            Live world map showing company locations, branches, and visitor activity. Exact coordinates used when available, country-level fallback otherwise.
          </p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-3">
          <StatCard label="Companies"  value={data?.stats.companies  || 0} sub={`${data?.stats.exactCompanies  || 0} exact pins`} />
          <StatCard label="Branches"   value={data?.stats.branches   || 0} sub={`${data?.stats.exactBranches   || 0} exact pins`} />
          <StatCard label="Visitors"   value={data?.stats.visitors   || 0} sub={`${data?.stats.exactVisitors   || 0} precise visitor pins`} />
        </div>

        {/* Tab filter */}
        <div className="mb-4 flex flex-wrap gap-2">
          {([
            { key: "companies", label: "Companies" },
            { key: "branches",  label: "Branches"  },
            { key: "visitors",  label: "Visitors"  },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                tab === key
                  ? "border-indigo-400 bg-indigo-500/20 text-white"
                  : "border-white/10 bg-white/5 text-white/55 hover:border-white/20"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "visitors" ? "Search by country, city, page, or device" : "Search by label, country, city, or address"}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28"
          />
        </div>

        {/* Map + list */}
        <div className="grid gap-6 xl:grid-cols-[1.45fr_.55fr]">

          {/* Map */}
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#060d1e] p-2">
            <LeafletMap pins={filteredPins} color={currentColor} />
          </div>

          {/* Pin list */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 overflow-y-auto max-h-[560px]">
            <div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-white/35">
              {tab === "companies" ? "Top Companies" : tab === "branches" ? "Branch Pins" : "Recent Visitors"}
            </div>
            <div className="space-y-3">
              {filteredPins.slice(0, 15).map((pin, i) => (
                <div key={`${pin.type}-${pin.label}-${i}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{pin.label}</div>
                      {pin.subtitle && <div className="mt-1 text-xs text-white/45">{pin.subtitle}</div>}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] flex-shrink-0 ${pin.precision === "exact" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/45"}`}>
                      {pin.precision}
                    </span>
                  </div>
                  {(pin.address || pin.city) && (
                    <div className="mt-2 text-xs text-white/45">{pin.address || pin.city}{pin.country ? `, ${pin.country}` : ""}</div>
                  )}
                  <div className="mt-1 text-[11px] text-white/28">{pin.lat.toFixed(4)}, {pin.lon.toFixed(4)}</div>
                </div>
              ))}
              {!filteredPins.length && (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/35">
                  No pins for this filter yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
