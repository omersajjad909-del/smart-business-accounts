"use client";

import { useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  constructionBg,
  constructionBorder,
  constructionFont,
  constructionMuted,
  mapConstructionMaterials,
  mapConstructionProjects,
  mapConstructionSites,
  mapSubcontractors,
} from "../_shared";

export default function ConstructionAnalyticsPage() {
  const projectStore = useBusinessRecords("construction_project");
  const siteStore = useBusinessRecords("construction_site");
  const materialStore = useBusinessRecords("construction_material");
  const subcontractorStore = useBusinessRecords("subcontractor");

  const projects = useMemo(() => mapConstructionProjects(projectStore.records), [projectStore.records]);
  const sites = useMemo(() => mapConstructionSites(siteStore.records), [siteStore.records]);
  const materials = useMemo(() => mapConstructionMaterials(materialStore.records), [materialStore.records]);
  const subcontractors = useMemo(() => mapSubcontractors(subcontractorStore.records), [subcontractorStore.records]);

  const siteHeadcount = sites.map((site) => ({
    name: site.name,
    workers: site.workers,
  })).sort((a, b) => b.workers - a.workers);

  const projectCommercials = projects.map((project) => ({
    name: project.name,
    budget: project.budget,
    spent: project.spent,
    variance: project.budget - project.spent,
  })).sort((a, b) => b.spent - a.spent);

  const materialSpendBySite = materials.reduce<Record<string, number>>((acc, row) => {
    const key = row.site || "Unassigned";
    acc[key] = (acc[key] || 0) + row.quantity * row.unitCost;
    return acc;
  }, {});

  const subcontractByProject = subcontractors.reduce<Record<string, number>>((acc, row) => {
    const key = row.project || "Unassigned";
    acc[key] = (acc[key] || 0) + (row.contractValue - row.paid);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: constructionFont }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Construction Analytics</h1>
        <p style={{ margin: 0, fontSize: 13, color: constructionMuted }}>Project burn, site staffing, material consumption, and subcontractor exposure.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Project Commercials</div>
          <div style={{ display: "grid", gap: 10 }}>
            {projectCommercials.slice(0, 8).map((row) => (
              <div key={row.name} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{row.name}</span>
                  <span style={{ fontSize: 12, color: row.variance >= 0 ? "#34d399" : "#f87171" }}>Variance: Rs. {row.variance.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 12, color: constructionMuted }}>Budget Rs. {row.budget.toLocaleString()} · Spent Rs. {row.spent.toLocaleString()}</div>
              </div>
            ))}
            {projectCommercials.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No project data yet.</div>}
          </div>
        </div>

        <div style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Site Workforce</div>
          <div style={{ display: "grid", gap: 10 }}>
            {siteHeadcount.slice(0, 8).map((row) => (
              <div key={row.name} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{row.name}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#c084fc" }}>{row.workers}</span>
              </div>
            ))}
            {siteHeadcount.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No site staffing data yet.</div>}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Material Spend by Site</div>
          <div style={{ display: "grid", gap: 10 }}>
            {Object.entries(materialSpendBySite).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([site, amount]) => (
              <div key={site} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{site}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#60a5fa" }}>Rs. {amount.toLocaleString()}</span>
              </div>
            ))}
            {Object.keys(materialSpendBySite).length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No material issue data yet.</div>}
          </div>
        </div>

        <div style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Subcontractor Exposure by Project</div>
          <div style={{ display: "grid", gap: 10 }}>
            {Object.entries(subcontractByProject).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([project, amount]) => (
              <div key={project} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{project}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#f59e0b" }}>Rs. {amount.toLocaleString()}</span>
              </div>
            ))}
            {Object.keys(subcontractByProject).length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No subcontractor exposure yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
