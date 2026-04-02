"use client";

import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { autoBg, autoBorder, autoFont, autoMuted, mapShowroomDeals, mapShowroomTestDrives, mapShowroomVehicles } from "../_shared";

export default function AutomotiveAnalyticsPage() {
  const vehicles = mapShowroomVehicles(useBusinessRecords("auto_vehicle").records);
  const testDrives = mapShowroomTestDrives(useBusinessRecords("showroom_test_drive").records);
  const deals = mapShowroomDeals(useBusinessRecords("showroom_deal").records);

  const soldValue = vehicles.filter((item) => item.status === "Sold").reduce((sum, item) => sum + item.price, 0);
  const availableByType = Array.from(new Set(vehicles.map((item) => item.type))).map((type) => ({
    type,
    count: vehicles.filter((item) => item.type === type && item.status !== "Sold").length,
  }));
  const dealsByStatus = Array.from(new Set(deals.map((item) => item.status))).map((status) => ({
    status,
    count: deals.filter((item) => item.status === status).length,
  }));

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: autoFont }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 900 }}>Showroom Analytics</h1>
        <p style={{ margin: 0, fontSize: 14, color: autoMuted }}>Inventory composition, drive completion, aur deal pipeline ki high-level picture.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Sold Value", value: `$${soldValue.toLocaleString()}`, color: "#34d399" },
          { label: "Scheduled Drives", value: testDrives.filter((item) => item.status === "scheduled").length, color: "#60a5fa" },
          { label: "Won Deals", value: deals.filter((item) => item.status === "won").length, color: "#22c55e" },
          { label: "Lost Deals", value: deals.filter((item) => item.status === "lost").length, color: "#ef4444" },
        ].map((card) => (
          <div key={card.label} style={{ background: autoBg, border: `1px solid ${autoBorder}`, borderRadius: 16, padding: "18px 20px" }}>
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
              <div key={row.type} style={{ display: "flex", justifyContent: "space-between", borderRadius: 12, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.03)", padding: "10px 12px" }}>
                <span style={{ fontSize: 13, color: autoMuted }}>{row.type}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#93c5fd" }}>{row.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: autoBg, border: `1px solid ${autoBorder}`, borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Deal Pipeline</div>
          <div style={{ display: "grid", gap: 10 }}>
            {dealsByStatus.map((row) => (
              <div key={row.status} style={{ display: "flex", justifyContent: "space-between", borderRadius: 12, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.03)", padding: "10px 12px" }}>
                <span style={{ fontSize: 13, color: autoMuted }}>{row.status}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#c084fc" }}>{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
