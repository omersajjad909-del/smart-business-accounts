"use client";

import { useEffect, useState } from "react";
import { ConstructionControlCenter, constructionBg, constructionBorder, constructionFont, constructionMuted, fetchJson } from "../_shared";

const emptyState: ConstructionControlCenter = {
  summary: { projects: 0, activeProjects: 0, sites: 0, activeSites: 0, materialValue: 0, lowStockMaterials: 0, subcontractors: 0, contractExposure: 0, boqItems: 0, certifiedBilling: 0, expenses: 0, contractorPayments: 0 },
  projects: [],
  sites: [],
  materials: [],
  subcontractors: [],
  boq: [],
  billing: [],
  expenses: [],
  payments: [],
};

export default function ConstructionAnalyticsPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/construction/control-center", emptyState).then(setData);
  }, []);

  const materialSpendBySite = data.materials.reduce<Record<string, number>>((acc, row) => {
    const key = row.site || "Unassigned";
    acc[key] = (acc[key] || 0) + row.quantity * row.unitCost;
    return acc;
  }, {});

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: constructionFont }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Construction Analytics</h1>
        <p style={{ margin: 0, fontSize: 13, color: constructionMuted }}>Project burn, site staffing, material consumption, and subcontractor exposure.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Projects", value: data.summary.projects, color: "#fb923c" },
          { label: "Low Materials", value: data.summary.lowStockMaterials, color: "#ef4444" },
          { label: "Exposure", value: `Rs. ${data.summary.contractExposure.toLocaleString()}`, color: "#f59e0b" },
          { label: "Billing", value: `Rs. ${data.summary.certifiedBilling.toLocaleString()}`, color: "#34d399" },
        ].map((card) => (
          <div key={card.label} style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: constructionMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Site Headcount</div>
          <div style={{ display: "grid", gap: 10 }}>
            {data.sites.map((site) => (
              <div key={site.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span>{site.name}</span>
                <span style={{ color: "#60a5fa", fontWeight: 800 }}>{site.workers}</span>
              </div>
            ))}
            {data.sites.length === 0 && <div style={{ color: constructionMuted, fontSize: 13 }}>No site data yet.</div>}
          </div>
        </div>

        <div style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Material Spend by Site</div>
          <div style={{ display: "grid", gap: 10 }}>
            {Object.entries(materialSpendBySite).sort((a, b) => b[1] - a[1]).map(([site, amount]) => (
              <div key={site} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span>{site}</span>
                <span style={{ color: "#34d399", fontWeight: 800 }}>Rs. {amount.toLocaleString()}</span>
              </div>
            ))}
            {Object.keys(materialSpendBySite).length === 0 && <div style={{ color: constructionMuted, fontSize: 13 }}>No material spend yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
