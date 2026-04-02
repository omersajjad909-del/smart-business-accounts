"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Row = { country: string; companies: number; activeUsers30d: number };

const COUNTRY_CENTER: Record<string, { lat: number; lon: number }> = {
  // Common markets + broad coverage
  PK: { lat: 30.3753, lon: 69.3451 },
  IN: { lat: 20.5937, lon: 78.9629 },
  BD: { lat: 23.685, lon: 90.3563 },
  AE: { lat: 23.4241, lon: 53.8478 },
  SA: { lat: 23.8859, lon: 45.0792 },
  QA: { lat: 25.3548, lon: 51.1839 },
  KW: { lat: 29.3759, lon: 47.9774 },
  OM: { lat: 21.4735, lon: 55.9754 },
  US: { lat: 37.0902, lon: -95.7129 },
  CA: { lat: 56.1304, lon: -106.3468 },
  GB: { lat: 55.3781, lon: -3.4360 },
  DE: { lat: 51.1657, lon: 10.4515 },
  FR: { lat: 46.2276, lon: 2.2137 },
  IT: { lat: 41.8719, lon: 12.5674 },
  ES: { lat: 40.4637, lon: -3.7492 },
  TR: { lat: 38.9637, lon: 35.2433 },
  CN: { lat: 35.8617, lon: 104.1954 },
  JP: { lat: 36.2048, lon: 138.2529 },
  AU: { lat: -25.2744, lon: 133.7751 },
  NZ: { lat: -40.9006, lon: 174.8860 },
  ZA: { lat: -30.5595, lon: 22.9375 },
  EG: { lat: 26.8206, lon: 30.8025 },
  NG: { lat: 9.0820, lon: 8.6753 },
};

function project(lat: number, lon: number, width: number, height: number) {
  // Equirectangular projection
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}

export default function GeoAnalyticsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/geo/countries", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          setRows(j.rows || []);
        } else setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load MapLibre GL from CDN and render markers
  useEffect(() => {
    if (!mapDivRef.current) return;
    if (mapReady) return;
    // inject CSS
    if (!document.querySelector('link[data-maplibre]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/maplibre-gl@3.5.2/dist/maplibre-gl.css";
      link.setAttribute("data-maplibre", "true");
      document.head.appendChild(link);
    }
    function start() {
      const maplibregl = (window as any).maplibregl;
      if (!maplibregl || !mapDivRef.current) return;
      const map = new maplibregl.Map({
        container: mapDivRef.current,
        style: "https://demotiles.maplibre.org/style.json",
        center: [60, 25],
        zoom: 1.2,
      });
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
      map.on("load", () => {
        setMapReady(true);
        if (!rows) return;
        const maxVal = Math.max(...rows.map(r => r.activeUsers30d || r.companies || 0), 1);
        for (const r of rows) {
          const cc = COUNTRY_CENTER[r.country];
          if (!cc) continue;
          const val = (r.activeUsers30d || r.companies || 0);
          const size = Math.max(8, (val / maxVal) * 32);
          const el = document.createElement("div");
          el.style.width = `${size}px`;
          el.style.height = `${size}px`;
          el.style.borderRadius = "9999px";
          el.style.background = "rgba(59,130,246,0.9)";
          el.style.boxShadow = "0 0 0 4px rgba(59,130,246,0.25)";
          el.title = `${r.country} • ${val} activity`;
          new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([cc.lon, cc.lat])
            .addTo(map);
        }
      });
    }
    if ((window as any).maplibregl) {
      start();
    } else {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/maplibre-gl@3.5.2/dist/maplibre-gl.js";
      script.async = true;
      script.onload = start;
      script.onerror = () => setMapReady(false);
      document.body.appendChild(script);
    }
  }, [rows, mapReady]);

  const maxVal = useMemo(() => {
    if (!rows || rows.length === 0) return 1;
    return Math.max(...rows.map(r => r.activeUsers30d || r.companies || 0), 1);
  }, [rows]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-extrabold">Geo Analytics</h1>
        <p className="mt-2 text-slate-600">World map with country‑level activity (dots scaled by activity).</p>

        <div className="mt-6 grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-indigo-100 rounded-2xl shadow p-0 overflow-hidden">
            <div ref={mapDivRef} className="w-full" style={{ aspectRatio: "16/9" }} />
          </div>
          <div className="bg-white border border-indigo-100 rounded-2xl shadow p-4 overflow-auto">
            <div className="text-sm font-semibold mb-2">Top Countries</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="text-left py-2">Country</th>
                  <th className="text-right py-2">Companies</th>
                  <th className="text-right py-2">Active Users (30d)</th>
                </tr>
              </thead>
              <tbody>
                {!rows ? (
                  <tr><td colSpan={3} className="py-6 text-slate-500">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={3} className="py-6 text-slate-500">No data</td></tr>
                ) : (
                  rows
                    .slice()
                    .sort((a, b) => (b.activeUsers30d || b.companies) - (a.activeUsers30d || a.companies))
                    .map(r => (
                      <tr key={r.country} className="border-t">
                        <td className="py-2">{r.country}</td>
                        <td className="py-2 text-right">{r.companies}</td>
                        <td className="py-2 text-right">{r.activeUsers30d}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
