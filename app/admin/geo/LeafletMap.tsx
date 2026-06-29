"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

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

interface Props {
  pins: GeoPin[];
  color: string;
}

export default function LeafletMap({ pins, color }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const layerRef     = useRef<L.LayerGroup | null>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [25, 20],
      zoom: 2,
      zoomControl: true,
      attributionControl: false,
      minZoom: 1,
      maxZoom: 14,
    });

    // Dark CartoDB tiles — no API key needed
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    L.control.attribution({ prefix: "© CartoDB © OSM" }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    mapRef.current  = map;
    layerRef.current = layer;

    return () => {
      map.remove();
      mapRef.current  = null;
      layerRef.current = null;
    };
  }, []);

  // Re-draw pins whenever they change
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();

    const now = Date.now();

    pins.forEach((pin) => {
      const exact = pin.precision === "exact";
      const isLive =
        pin.type === "visitor" &&
        !!pin.visitedAt &&
        now - new Date(pin.visitedAt).getTime() < 30 * 60 * 1000;

      const fillColor = exact ? color : "rgba(255,255,255,0.6)";
      const radius    = exact ? 8 : 5;

      const circle = L.circleMarker([pin.lat, pin.lon], {
        radius,
        fillColor,
        color:       "#0f172a",
        weight:      2,
        opacity:     1,
        fillOpacity: isLive ? 0.95 : 0.82,
      });

      const locationLine = [pin.city, pin.country].filter(Boolean).join(", ") || `${pin.lat.toFixed(2)}, ${pin.lon.toFixed(2)}`;
      const popupHtml = `
        <div style="font-family:'Outfit',sans-serif;min-width:180px;color:#e2e8f0">
          <div style="font-size:13px;font-weight:700;margin-bottom:4px">${pin.label}</div>
          ${pin.subtitle ? `<div style="font-size:11px;color:#94a3b8;margin-bottom:4px">${pin.subtitle}</div>` : ""}
          <div style="font-size:11px;color:#64748b">${locationLine}</div>
          ${pin.page ? `<div style="font-size:11px;color:#64748b;margin-top:3px">Page: ${pin.page}</div>` : ""}
          <div style="margin-top:6px;display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;
            background:${exact ? "rgba(34,197,94,.2)" : "rgba(255,255,255,.1)"};
            color:${exact ? "#4ade80" : "#94a3b8"}">
            ${exact ? "Exact Pin" : "Country Fallback"}
          </div>
          ${isLive ? `<div style="margin-top:4px;display:inline-block;margin-left:4px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:rgba(245,158,11,.2);color:#fbbf24">● Live</div>` : ""}
        </div>
      `;

      circle.bindPopup(popupHtml, {
        className: "finova-geo-popup",
        maxWidth:  260,
      });

      layer.addLayer(circle);
    });

    // Fit bounds if we have pins
    if (pins.length > 0) {
      const latLngs = pins.map(p => L.latLng(p.lat, p.lon));
      try {
        mapRef.current?.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 6 });
      } catch { /* ignore invalid bounds */ }
    }
  }, [pins, color]);

  return (
    <>
      <style>{`
        .finova-geo-popup .leaflet-popup-content-wrapper {
          background: #0f172a;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,.6);
          padding: 0;
        }
        .finova-geo-popup .leaflet-popup-content { margin: 12px 14px; }
        .finova-geo-popup .leaflet-popup-tip { background: #0f172a; }
        .leaflet-container { background: #060d1e; }
      `}</style>
      <div ref={containerRef} style={{ width: "100%", height: "520px", borderRadius: 20, overflow: "hidden" }} />
    </>
  );
}
