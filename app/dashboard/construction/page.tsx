"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConstructionControlCenter, constructionBg, constructionBorder, constructionFont, constructionMuted, fetchJson } from "./_shared";

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

export default function ConstructionOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/construction/control-center", emptyState).then(setData);
  }, []);

  const { summary, projects, subcontractors } = data;

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: constructionFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800 }}>Construction Command Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: constructionMuted }}>Projects, sites, materials, billing, and subcontractor exposure in one view.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Projects", href: "/dashboard/construction/projects" },
            { label: "Sites", href: "/dashboard/construction/sites" },
            { label: "Materials", href: "/dashboard/construction/materials" },
            { label: "Subcontractors", href: "/dashboard/construction/subcontractors" },
            { label: "Analytics", href: "/dashboard/construction/analytics" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${constructionBorder}`, background: constructionBg, color: "#fdba74", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Active Projects", value: summary.activeProjects, color: "#fb923c" },
          { label: "Active Sites", value: summary.activeSites, color: "#34d399" },
          { label: "Material Value", value: `Rs. ${summary.materialValue.toLocaleString()}`, color: "#60a5fa" },
          { label: "Open Contracts", value: `Rs. ${summary.contractExposure.toLocaleString()}`, color: "#f59e0b" },
        ].map((card) => (
          <div key={card.label} style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: constructionMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Project Portfolio</div>
          <div style={{ display: "grid", gap: 10 }}>
            {projects.slice(0, 5).map((project) => (
              <div key={project.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{project.name}</div>
                  <div style={{ fontSize: 12, color: constructionMuted }}>{project.client || "No client"} | {project.progress}% progress</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: project.status === "active" ? "#34d399" : "#94a3b8" }}>{project.status}</div>
              </div>
            ))}
            {projects.length === 0 && <div style={{ color: constructionMuted, fontSize: 13 }}>No projects yet.</div>}
          </div>
        </div>

        <div style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Commercial Snapshot</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { label: "BOQ items", value: summary.boqItems, color: "#f59e0b" },
              { label: "Certified billing", value: `Rs. ${summary.certifiedBilling.toLocaleString()}`, color: "#34d399" },
              { label: "Expenses booked", value: `Rs. ${summary.expenses.toLocaleString()}`, color: "#60a5fa" },
              { label: "Contractor payouts", value: `Rs. ${summary.contractorPayments.toLocaleString()}`, color: "#a78bfa" },
              { label: "Live subcontractors", value: subcontractors.filter((row) => row.status === "active").length, color: "#fb923c" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13, color: constructionMuted }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
