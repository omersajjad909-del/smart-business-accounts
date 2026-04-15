"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ManufacturingControlCenter, fetchJson } from "./_shared";

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

export default function ManufacturingOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/manufacturing/control-center", emptyState).then(setData);
  }, []);

  const { summary, production } = data;

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Manufacturing Command Center</h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", margin: 0 }}>
          Raw material planning, production control, work orders, finished goods, and quality monitoring aik jagah.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          { href: "/dashboard/manufacturing/bom", label: "BOM" },
          { href: "/dashboard/manufacturing/production-orders", label: "Production Orders" },
          { href: "/dashboard/manufacturing/work-orders", label: "Work Orders" },
          { href: "/dashboard/manufacturing/raw-materials", label: "Raw Materials" },
          { href: "/dashboard/manufacturing/analytics", label: "Analytics" },
        ].map((item) => (
          <Link prefetch={false} key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${border}`, background: bg, color: "#93c5fd", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
            {item.label}
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "BOM", value: summary.bomCount, color: "#60a5fa" },
          { label: "Running", value: summary.runningProduction, color: "#34d399" },
          { label: "Blocked", value: summary.blockedProduction, color: "#ef4444" },
          { label: "Low Materials", value: summary.lowMaterials, color: "#f59e0b" },
          { label: "Finished Qty", value: summary.finishedQuantity, color: "#a78bfa" },
        ].map((card) => (
          <div key={card.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Production Queue</div>
          <div style={{ display: "grid", gap: 10 }}>
            {production.slice(0, 5).map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{item.product}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.orderId} | {item.completed}/{item.quantity}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: item.status === "completed" ? "#34d399" : item.status === "in_progress" ? "#60a5fa" : "#f59e0b" }}>{item.status}</div>
              </div>
            ))}
            {production.length === 0 && <div style={{ color: "rgba(255,255,255,.45)", fontSize: 13 }}>No production orders yet.</div>}
          </div>
        </div>

        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Operations Reading</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { label: "Material value", value: `Rs. ${summary.materialValue.toLocaleString()}`, color: "#60a5fa" },
              { label: "Open work orders", value: summary.openWorkOrders, color: "#f59e0b" },
              { label: "Passed checks", value: summary.passedChecks, color: "#34d399" },
              { label: "Rejected checks", value: summary.rejectedChecks, color: "#ef4444" },
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
