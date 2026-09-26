"use client";

import { useEffect, useMemo, useState } from "react";
import { AutomotiveControlCenter, autoBg, autoBorder, autoFont, autoMuted, fetchJson } from "../_shared";
import { useResponsive } from "@/hooks/useResponsive";

const emptyState: AutomotiveControlCenter = {
  summary: {
    vehicles: 0,
    availableVehicles: 0,
    reservedVehicles: 0,
    soldVehicles: 0,
    inventoryValue: 0,
    soldValue: 0,
    openDeals: 0,
    wonDeals: 0,
    lostDeals: 0,
    completedDrives: 0,
    scheduledDrives: 0,
    conversionRate: 0,
  },
  vehicles: [],
  testDrives: [],
  deals: [],
};

export default function AutomotiveAnalyticsPage() {
  const { isMobile } = useResponsive();
  const [data, setData] = useState<AutomotiveControlCenter>(emptyState);

  useEffect(() => {
    fetchJson("/api/automotive/control-center", emptyState).then(setData);
  }, []);

  const availableByType = useMemo(
    () =>
      Array.from(new Set(data.vehicles.map((item) => item.type))).map((type) => ({
        type,
        count: data.vehicles.filter((item) => item.type === type && item.status !== "Sold").length,
      })),
    [data.vehicles]
  );

  const dealsByStatus = useMemo(
    () =>
      Array.from(new Set(data.deals.map((item) => item.status))).map((status) => ({
        status,
        count: data.deals.filter((item) => item.status === status).length,
      })),
    [data.deals]
  );

  return (
    <div style={{ padding: isMobile ? "15px 14px" : "28px 32px", minHeight: "100vh", color: "var(--ink-solid, #fff)", fontFamily: autoFont }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 900 }}>Showroom Analytics</h1>
        <p style={{ margin: 0, fontSize: 14, color: autoMuted }}>Inventory composition, drive completion, and deal pipeline performance from the live automotive feed.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Sold Value", value: `$${data.summary.soldValue.toLocaleString()}`, color: "var(--tx-34d399, #34d399)" },
          { label: "Scheduled Drives", value: data.summary.scheduledDrives, color: "var(--tx-60a5fa, #60a5fa)" },
          { label: "Won Deals", value: data.summary.wonDeals, color: "var(--tx-22c55e, #22c55e)" },
          { label: "Lost Deals", value: data.summary.lostDeals, color: "var(--tx-ef4444, #ef4444)" },
        ].map((card) => (
          <div key={card.label} style={{ background: autoBg, border: `1px solid ${autoBorder}`, borderRadius: 16, padding: isMobile ? "12px 10px" : "18px 20px" }}>
            <div style={{ fontSize: 12, color: autoMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: autoBg, border: `1px solid ${autoBorder}`, borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Available Stock Mix</div>
          <div style={{ display: "grid", gap: 10 }}>
            {availableByType.map((row) => (
              <div key={row.type} style={{ display: "flex", justifyContent: "space-between", borderRadius: 12, border: "1px solid rgba(var(--ink),.06)", background: "rgba(var(--ink),.03)", padding: "10px 12px" }}>
                <span style={{ fontSize: 13, color: autoMuted }}>{row.type}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--tx-93c5fd, #93c5fd)" }}>{row.count}</span>
              </div>
            ))}
            {!availableByType.length ? <div style={{ color: autoMuted, fontSize: 13 }}>No vehicle stock yet.</div> : null}
          </div>
        </div>

        <div style={{ background: autoBg, border: `1px solid ${autoBorder}`, borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Deal Pipeline</div>
          <div style={{ display: "grid", gap: 10 }}>
            {dealsByStatus.map((row) => (
              <div key={row.status} style={{ display: "flex", justifyContent: "space-between", borderRadius: 12, border: "1px solid rgba(var(--ink),.06)", background: "rgba(var(--ink),.03)", padding: "10px 12px" }}>
                <span style={{ fontSize: 13, color: autoMuted }}>{row.status}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--tx-c084fc, #c084fc)" }}>{row.count}</span>
              </div>
            ))}
            {!dealsByStatus.length ? <div style={{ color: autoMuted, fontSize: 13 }}>No deal pipeline yet.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
