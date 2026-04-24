"use client";

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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [nowTs] = useState(() => Date.now());
  const width = 960;
  const height = 560;

  const projectedPins = useMemo(
    () =>
      pins.map((pin) => {
        const x = ((pin.lon + 180) / 360) * width;
        const y = ((90 - pin.lat) / 180) * height;
        const isLiveVisitor =
          pin.type === "visitor" &&
          !!pin.visitedAt &&
          nowTs > 0 &&
          nowTs - new Date(pin.visitedAt).getTime() < 30 * 60 * 1000;

        return {
          ...pin,
          x,
          y,
          isLiveVisitor,
        };
      }),
    [nowTs, pins],
  );

  const activePin = activeIndex !== null ? projectedPins[activeIndex] : projectedPins[0] || null;

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#0d1428]">
      <style>{`
        @keyframes finovaGeoPulse {
          0% { transform: scale(1); opacity: .95; }
          50% { transform: scale(1.18); opacity: .55; }
          100% { transform: scale(1); opacity: .95; }
        }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,.18),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(56,189,248,.14),transparent_22%),linear-gradient(180deg,rgba(9,14,28,.96),rgba(12,18,34,.98))]" />

      <svg viewBox={`0 0 ${width} ${height}`} className="relative z-10 block w-full h-[520px]">
        <defs>
          <linearGradient id="geoGlow" x1="0" x2="1">
            <stop offset="0%" stopColor="rgba(99,102,241,.16)" />
            <stop offset="100%" stopColor="rgba(56,189,248,.08)" />
          </linearGradient>
        </defs>

        {Array.from({ length: 7 }).map((_, index) => {
          const y = 60 + index * 70;
          return <line key={`h-${index}`} x1="0" y1={y} x2={width} y2={y} stroke="rgba(255,255,255,.06)" strokeWidth="1" />;
        })}
        {Array.from({ length: 11 }).map((_, index) => {
          const x = 40 + index * 88;
          return <line key={`v-${index}`} x1={x} y1="0" x2={x} y2={height} stroke="rgba(255,255,255,.05)" strokeWidth="1" />;
        })}

        <path d="M92 164c42-26 92-30 124-16 29 12 46 34 71 44 38 15 82-13 120-10 41 4 61 33 101 48 40 15 95 8 130 28 29 18 43 50 41 81-3 39-34 75-82 94-48 19-120 17-173 7-72-14-120-52-171-63-51-11-96 4-139-14-51-21-90-80-76-124 12-35 32-53 54-75z" fill="rgba(148,163,184,.16)" stroke="rgba(255,255,255,.07)" />
        <path d="M542 146c38-34 88-44 130-34 44 10 68 42 98 58 36 20 80 20 116 41 38 22 66 63 62 103-4 45-47 85-103 96-68 13-143-15-194-29-54-15-88-12-123-36-35-23-60-73-48-118 9-35 28-55 62-81z" fill="rgba(148,163,184,.14)" stroke="rgba(255,255,255,.07)" />
        <path d="M738 370c27-11 60-10 83 1 24 11 35 31 31 50-5 23-31 43-63 49-33 6-72-3-92-21-19-17-17-45 5-62 8-7 21-13 36-17z" fill="rgba(148,163,184,.13)" stroke="rgba(255,255,255,.06)" />

        {projectedPins.map((pin, index) => {
          const exact = pin.precision === "exact";
          const active = index === activeIndex || (activeIndex === null && index === 0);
          const dotColor = exact ? color : "rgba(255,255,255,.66)";
          const radius = exact ? 6.5 : 4.5;

          return (
            <g key={`${pin.type}-${pin.label}-${index}`} onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)} style={{ cursor: "pointer" }}>
              <circle cx={pin.x} cy={pin.y} r={exact ? 14 : 10} fill={exact ? `${color}22` : "rgba(255,255,255,.08)"} className={pin.isLiveVisitor ? "animate-[finovaGeoPulse_1.6s_ease-in-out_infinite]" : ""} />
              <circle cx={pin.x} cy={pin.y} r={radius} fill={dotColor} stroke="rgba(15,23,42,.95)" strokeWidth="2" />
              {active ? <circle cx={pin.x} cy={pin.y} r={exact ? 20 : 15} fill="none" stroke={dotColor} strokeOpacity=".45" /> : null}
            </g>
          );
        })}
      </svg>

      <div className="absolute left-4 top-4 z-20 rounded-2xl border border-white/10 bg-[#0d1428]/88 px-4 py-3 backdrop-blur">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/38">Live Geo Map</div>
        <div className="mt-2 flex gap-4 text-[11px] text-white/56">
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> Exact Pin</span>
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-white/60" /> Country Fallback</span>
        </div>
      </div>

      {activePin ? (
        <div className="absolute bottom-4 left-4 right-4 z-20 rounded-2xl border border-white/10 bg-[#10192f]/92 px-4 py-4 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-white">{activePin.label}</div>
              {activePin.subtitle ? <div className="mt-1 text-xs text-white/50">{activePin.subtitle}</div> : null}
              <div className="mt-2 text-xs text-white/36">
                {activePin.city || activePin.country || "Unknown location"} · {activePin.lat.toFixed(4)}, {activePin.lon.toFixed(4)}
              </div>
            </div>
            <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${activePin.precision === "exact" ? "bg-cyan-400/15 text-cyan-300" : "bg-white/10 text-white/45"}`}>
              {activePin.precision === "exact" ? "Exact Pin" : "Country Fallback"}
            </div>
          </div>
        </div>
      ) : null}
    </div>
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
