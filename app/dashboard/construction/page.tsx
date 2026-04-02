"use client";

import Link from "next/link";
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
} from "./_shared";

export default function ConstructionOverviewPage() {
  const projectStore = useBusinessRecords("construction_project");
  const siteStore = useBusinessRecords("construction_site");
  const materialStore = useBusinessRecords("construction_material");
  const subcontractorStore = useBusinessRecords("subcontractor");

  const projects = useMemo(() => mapConstructionProjects(projectStore.records), [projectStore.records]);
  const sites = useMemo(() => mapConstructionSites(siteStore.records), [siteStore.records]);
  const materials = useMemo(() => mapConstructionMaterials(materialStore.records), [materialStore.records]);
  const subcontractors = useMemo(() => mapSubcontractors(subcontractorStore.records), [subcontractorStore.records]);

  const activeProjects = projects.filter((row) => row.status === "active");
  const materialValue = materials.reduce((sum, row) => sum + row.quantity * row.unitCost, 0);
  const contractExposure = subcontractors.reduce((sum, row) => sum + (row.contractValue - row.paid), 0);
  const laborOnSites = sites.reduce((sum, row) => sum + row.workers, 0);

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: constructionFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800 }}>Construction Command Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: constructionMuted }}>Projects, sites, materials, and subcontractor exposure in one view.</p>
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
          { label: "Projects", value: projects.length, color: "#fb923c" },
          { label: "Active Sites", value: sites.filter((row) => row.status === "active").length, color: "#34d399" },
          { label: "Material Value", value: `Rs. ${materialValue.toLocaleString()}`, color: "#60a5fa" },
          { label: "Open Contracts", value: `Rs. ${contractExposure.toLocaleString()}`, color: "#f59e0b" },
        ].map((card) => (
          <div key={card.label} style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: constructionMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 18 }}>
        <div style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${constructionBorder}`, fontSize: 15, fontWeight: 800 }}>Project Watchlist</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {activeProjects.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No active projects yet.</div>}
            {activeProjects.slice(0, 6).map((project) => (
              <div key={project.id} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{project.name}</div>
                    <div style={{ fontSize: 12, color: constructionMuted, marginTop: 4 }}>{project.client} · {project.site || project.location}</div>
                  </div>
                  <div style={{ fontSize: 13, color: "#fdba74", fontWeight: 700 }}>{project.progress}%</div>
                </div>
                <div style={{ marginTop: 10, height: 7, borderRadius: 999, background: "rgba(255,255,255,.08)" }}>
                  <div style={{ width: `${Math.min(project.progress, 100)}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#f97316,#fb923c)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Execution Snapshot</div>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { label: "On-site workforce", value: laborOnSites, color: "#c084fc" },
                { label: "Maintenance sites", value: sites.filter((row) => row.status === "maintenance").length, color: "#f59e0b" },
                { label: "Material lines", value: materials.length, color: "#93c5fd" },
                { label: "Subcontractors", value: subcontractors.filter((row) => row.status === "active").length, color: "#34d399" },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                  <span style={{ fontSize: 13, color: constructionMuted }}>{row.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: constructionBg, border: `1px solid ${constructionBorder}`, borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Commercial Snapshot</div>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13, color: constructionMuted }}>Project budget</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#818cf8" }}>Rs. {projects.reduce((sum, row) => sum + row.budget, 0).toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13, color: constructionMuted }}>Spent to date</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#f87171" }}>Rs. {projects.reduce((sum, row) => sum + row.spent, 0).toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13, color: constructionMuted }}>Paid to subcontractors</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#34d399" }}>Rs. {subcontractors.reduce((sum, row) => sum + row.paid, 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
