"use client";

import { useEffect, useState } from "react";
import { ManufacturingControlCenter, fetchJson } from "../_shared";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

const emptyState: ManufacturingControlCenter = {
  summary: { bomCount: 0, plannedProduction: 0, runningProduction: 0, completedProduction: 0, openWorkOrders: 0, blockedProduction: 0, lowMaterials: 0, materialValue: 0, finishedQuantity: 0, passedChecks: 0, rejectedChecks: 0 },
  boms: [],
  production: [],
  workOrders: [],
  materials: [],
  finishedGoods: [],
  qualityChecks: [],
};

export default function ManufacturingAnalyticsPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/manufacturing/control-center", emptyState).then(setData);
  }, []);

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Manufacturing Analytics</h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", margin: 0 }}>Production throughput, material risk, and quality performance.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Planned", value: data.summary.plannedProduction, color: "#f59e0b" },
          { label: "Running", value: data.summary.runningProduction, color: "#60a5fa" },
          { label: "Completed", value: data.summary.completedProduction, color: "#34d399" },
          { label: "Blocked", value: data.summary.blockedProduction, color: "#ef4444" },
        ].map((card) => (
          <div key={card.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Material Risk</div>
          <div style={{ display: "grid", gap: 10 }}>
            {data.materials.filter((item) => item.isLow).slice(0, 6).map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span>{item.name}</span>
                <span style={{ color: "#ef4444", fontWeight: 800 }}>{item.currentStock}/{item.minStock}</span>
              </div>
            ))}
            {data.materials.filter((item) => item.isLow).length === 0 && <div style={{ color: "rgba(255,255,255,.45)", fontSize: 13 }}>No low materials.</div>}
          </div>
        </div>

        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Quality Reading</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { label: "Passed checks", value: data.summary.passedChecks, color: "#34d399" },
              { label: "Rejected checks", value: data.summary.rejectedChecks, color: "#ef4444" },
              { label: "Finished quantity", value: data.summary.finishedQuantity, color: "#a78bfa" },
              { label: "Material value", value: `Rs. ${data.summary.materialValue.toLocaleString()}`, color: "#60a5fa" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ color: "rgba(255,255,255,.45)" }}>{row.label}</span>
                <span style={{ color: row.color, fontWeight: 800 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
