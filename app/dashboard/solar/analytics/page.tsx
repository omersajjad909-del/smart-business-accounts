"use client";

import { useEffect, useState } from "react";
import { fetchJson, solarAccent, type SolarControlCenter } from "../_shared";

const emptyState: SolarControlCenter = {
  summary: { projects: 0, liveProjects: 0, commissionedProjects: 0, equipmentItems: 0, lowStockEquipment: 0, amcContracts: 0, pendingVisits: 0, pipelineBudget: 0 },
  projects: [],
  equipment: [],
  amc: [],
};

export default function SolarAnalyticsPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/solar/control-center", emptyState).then(setData);
  }, []);

  return (
    <div style={{ padding: "28px 32px", color: "#e2e8f0", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "white" }}>Solar Analytics</h1>
        <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,.45)" }}>Project load, equipment exposure, AMC backlog, and service continuity.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Projects", value: data.summary.projects, color: solarAccent },
          { label: "Installing", value: data.summary.liveProjects, color: "#60a5fa" },
          { label: "Low Stock", value: data.summary.lowStockEquipment, color: "#f97316" },
          { label: "Pending Visits", value: data.summary.pendingVisits, color: "#34d399" },
        ].map((card) => (
          <div key={card.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <section style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Project Snapshot</div>
          <div style={{ display: "grid", gap: 10 }}>
            {data.projects.slice(0, 8).map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{item.project}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#fde68a" }}>{item.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>AMC Snapshot</div>
          <div style={{ display: "grid", gap: 10 }}>
            {data.amc.slice(0, 8).map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{item.contract}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#34d399" }}>{item.status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
