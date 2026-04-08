"use client";

import { useEffect, useState } from "react";
import { MaintenanceControlCenter, fetchJson, maintenanceBg, maintenanceBorder, maintenanceFont, maintenanceMuted } from "../_shared";

const emptyState: MaintenanceControlCenter = {
  summary: {
    contracts: 0,
    activeContracts: 0,
    renewalDue: 0,
    schedules: 0,
    scheduledVisits: 0,
    completedVisits: 0,
    jobs: 0,
    openJobs: 0,
    urgentJobs: 0,
    parts: 0,
    lowStockParts: 0,
    contractValue: 0,
  },
  contracts: [],
  schedules: [],
  jobs: [],
  parts: [],
};

export default function MaintenanceAnalyticsPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/maintenance/control-center", emptyState).then(setData);
  }, []);

  const { summary, contracts, schedules, jobs, parts } = data;
  const completionRate = jobs.length ? Math.round((jobs.filter((row) => row.status === "Completed").length / jobs.length) * 100) : 0;
  const scheduleAdherence = schedules.length ? Math.round((summary.completedVisits / schedules.length) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: maintenanceFont }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 12, color: "#86efac", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Maintenance Analytics</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px" }}>Contract health, schedule discipline, and field performance</h1>
        <p style={{ margin: 0, fontSize: 14, color: maintenanceMuted, maxWidth: 760 }}>
          AMC value, visit adherence, job completion, and parts dependency ko operational analytics view me read karein.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Contract Value", value: `Rs. ${summary.contractValue.toLocaleString()}`, color: "#34d399" },
          { label: "Job Completion", value: `${completionRate}%`, color: "#60a5fa" },
          { label: "Schedule Adherence", value: `${scheduleAdherence}%`, color: "#22c55e" },
          { label: "Low Stock Parts", value: summary.lowStockParts, color: "#f87171" },
        ].map((card) => (
          <div key={card.label} style={{ background: maintenanceBg, border: `1px solid ${maintenanceBorder}`, borderRadius: 18, padding: "20px 22px" }}>
            <div style={{ fontSize: 12, color: maintenanceMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: maintenanceBg, border: `1px solid ${maintenanceBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#bbf7d0", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Contract Mix</div>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              { label: "Active contracts", value: `${summary.activeContracts} active`, tone: "#34d399" },
              { label: "Renewal due", value: `${summary.renewalDue} at risk`, tone: "#f59e0b" },
              { label: "Paused contracts", value: `${contracts.filter((row) => row.status === "paused").length} paused`, tone: "#94a3b8" },
              { label: "Average contract size", value: `Rs. ${Math.round(summary.contractValue / Math.max(contracts.length, 1)).toLocaleString()}`, tone: "#60a5fa" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 16px" }}>
                <span style={{ fontSize: 13, color: maintenanceMuted }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: row.tone }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: maintenanceBg, border: `1px solid ${maintenanceBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#facc15", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Field Ops Reading</div>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              { label: "Open jobs", value: `${summary.openJobs} open`, tone: "#60a5fa" },
              { label: "Urgent backlog", value: `${summary.urgentJobs} urgent`, tone: "#f87171" },
              { label: "Completed visits", value: `${summary.completedVisits} done`, tone: "#22c55e" },
              { label: "Reserved stock", value: `${parts.filter((row) => row.status === "reserved").length} reserved`, tone: "#a78bfa" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 16px" }}>
                <span style={{ fontSize: 13, color: maintenanceMuted }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: row.tone }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
