"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson, solarAccent, type SolarControlCenter } from "./_shared";

const emptyState: SolarControlCenter = {
  summary: { projects: 0, liveProjects: 0, commissionedProjects: 0, equipmentItems: 0, lowStockEquipment: 0, amcContracts: 0, pendingVisits: 0, pipelineBudget: 0 },
  projects: [],
  equipment: [],
  amc: [],
};

export default function SolarOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/solar/control-center", emptyState).then(setData);
  }, []);

  const { summary, projects, equipment, amc } = data;

  return (
    <div style={{ padding: "28px 32px", color: "#e2e8f0", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "white" }}>Solar Command Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.45)" }}>Project delivery, equipment readiness, and AMC continuity from live solar operations records.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Projects", href: "/dashboard/solar/projects" },
            { label: "Equipment Stock", href: "/dashboard/solar/equipment" },
            { label: "AMC Schedule", href: "/dashboard/solar/amc" },
            { label: "Analytics", href: "/dashboard/solar/analytics" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "#fde68a", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Projects", value: summary.projects, color: solarAccent },
          { label: "Installing", value: summary.liveProjects, color: "#60a5fa" },
          { label: "Commissioned", value: summary.commissionedProjects, color: "#34d399" },
          { label: "Low Stock", value: summary.lowStockEquipment, color: "#f97316" },
          { label: "Pipeline Budget", value: summary.pipelineBudget.toLocaleString(), color: "#fbbf24" },
        ].map((card) => (
          <div key={card.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Project Watchlist</div>
          <div style={{ display: "grid", gap: 10 }}>
            {projects.slice(0, 6).map((item) => (
              <div key={item.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{item.project}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginTop: 4 }}>{item.customer || "-"} | {item.site || "-"}</div>
                <div style={{ fontSize: 12, color: "#fde68a", marginTop: 6 }}>{item.deadline || "-"} | {item.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 12 }}>Equipment Desk</div>
            <div style={{ display: "grid", gap: 10 }}>
              {equipment.slice(0, 5).map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.item}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.sku || "-"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.quantity.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 12 }}>AMC Desk</div>
            <div style={{ display: "grid", gap: 10 }}>
              {amc.slice(0, 5).map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.contract}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.customer || "-"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.nextVisit || "-"}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
