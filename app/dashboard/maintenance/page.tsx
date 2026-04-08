"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MaintenanceControlCenter, fetchJson, maintenanceBg, maintenanceBorder, maintenanceFont, maintenanceMuted } from "./_shared";

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

export default function MaintenanceOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/maintenance/control-center", emptyState).then(setData);
  }, []);

  const { summary, contracts, jobs, parts } = data;

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: maintenanceFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: "#34d399", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Maintenance Services</div>
          <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 900 }}>AMC contracts, service visits, and field execution desk</h1>
          <p style={{ margin: 0, fontSize: 14, color: maintenanceMuted, maxWidth: 760 }}>
            Contract obligations, preventive schedules, active service jobs, and parts support ko ek operational command center me monitor karein.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { href: "/dashboard/maintenance/contracts", label: "AMC Contracts" },
            { href: "/dashboard/maintenance/schedule", label: "Service Schedule" },
            { href: "/dashboard/maintenance/jobs", label: "Field Jobs" },
            { href: "/dashboard/maintenance/parts", label: "Parts and Stock" },
            { href: "/dashboard/maintenance/analytics", label: "Analytics" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${maintenanceBorder}`, background: maintenanceBg, color: "#86efac", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Contracts", value: summary.activeContracts, color: "#34d399" },
          { label: "Due Visits", value: summary.scheduledVisits, color: "#f59e0b" },
          { label: "Open Jobs", value: summary.openJobs, color: "#60a5fa" },
          { label: "Low Stock", value: summary.lowStockParts, color: "#f87171" },
          { label: "Contract Value", value: `Rs. ${summary.contractValue.toLocaleString()}`, color: "#22c55e" },
        ].map((card) => (
          <div key={card.label} style={{ background: maintenanceBg, border: `1px solid ${maintenanceBorder}`, borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: maintenanceMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 18 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(34,197,94,.14), rgba(16,185,129,.08))", border: `1px solid ${maintenanceBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#bbf7d0", fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>Service Flow</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
            {[
              { title: "AMC Scope", body: "Client contract, covered assets, and annual visit commitments define service load." },
              { title: "Schedule Board", body: "Preventive visits and due inspections are planned against teams and sites." },
              { title: "Field Execution", body: "Open jobs capture technician assignment, priority, and issue handling." },
              { title: "Parts Support", body: "Issued parts and low stock alerts keep service continuity under control." },
            ].map((step, index) => (
              <div key={step.title} style={{ background: "rgba(8,12,30,.36)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, background: "rgba(134,239,172,.16)", color: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, marginBottom: 12 }}>{index + 1}</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,.62)" }}>{step.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ background: maintenanceBg, border: `1px solid ${maintenanceBorder}`, borderRadius: 20, padding: 22 }}>
            <div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Renewal Watchlist</div>
            <div style={{ display: "grid", gap: 10 }}>
              {contracts.length === 0 ? (
                <div style={{ color: maintenanceMuted, fontSize: 13 }}>Add AMC contracts to populate the renewal watchlist.</div>
              ) : contracts.slice(0, 4).map((contract) => (
                <div key={contract.id} style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{contract.contract}</div>
                  <div style={{ fontSize: 12, color: maintenanceMuted }}>{contract.client} - {contract.asset}</div>
                  <div style={{ fontSize: 12, color: "#bbf7d0", marginTop: 6 }}>{contract.renewalDate || "No renewal date"} - Rs. {contract.value.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: maintenanceBg, border: `1px solid ${maintenanceBorder}`, borderRadius: 20, padding: 22 }}>
            <div style={{ fontSize: 13, color: "#facc15", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Ops Reading</div>
            <div style={{ display: "grid", gap: 12 }}>
              {[
                { label: "Scheduled visits", value: `${summary.scheduledVisits} upcoming`, tone: "#60a5fa" },
                { label: "Completed jobs", value: `${jobs.filter((row) => row.status === "Completed").length} closed`, tone: "#22c55e" },
                { label: "Urgent jobs", value: `${summary.urgentJobs} urgent`, tone: "#f87171" },
                { label: "Reserved parts", value: `${parts.filter((row) => row.status === "reserved").length} reserved`, tone: "#a78bfa" },
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
    </div>
  );
}
