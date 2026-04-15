"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson, repairAccent, type RepairControlCenter } from "./_shared";

const emptyState: RepairControlCenter = {
  summary: { jobs: 0, activeJobs: 0, readyJobs: 0, technicians: 0, activeTechnicians: 0, partsCost: 0, warrantyClaims: 0, warrantyExposure: 0 },
  jobs: [],
  technicians: [],
  parts: [],
  warranties: [],
};

export default function RepairOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/repair/control-center", emptyState).then(setData);
  }, []);

  const { summary, jobs, technicians, warranties } = data;

  return (
    <div style={{ padding: "28px 32px", color: "#e2e8f0", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "white" }}>Repair Command Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.45)" }}>Repair queue, technician capacity, parts handling, and warranty returns from live service records.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Repair Jobs", href: "/dashboard/repair/jobs" },
            { label: "Spare Parts", href: "/dashboard/repair/parts" },
            { label: "Technicians", href: "/dashboard/repair/technicians" },
            { label: "Warranty", href: "/dashboard/repair/warranty" },
            { label: "Analytics", href: "/dashboard/repair/analytics" },
          ].map((item) => (
            <Link prefetch={false} key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "#bae6fd", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Jobs", value: summary.jobs, color: repairAccent },
          { label: "Active Jobs", value: summary.activeJobs, color: "#60a5fa" },
          { label: "Ready Jobs", value: summary.readyJobs, color: "#34d399" },
          { label: "Active Technicians", value: summary.activeTechnicians, color: "#fbbf24" },
          { label: "Parts Cost", value: summary.partsCost.toLocaleString(), color: "#f97316" },
        ].map((card) => (
          <div key={card.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Repair Watchlist</div>
          <div style={{ display: "grid", gap: 10 }}>
            {jobs.slice(0, 6).map((item) => (
              <div key={item.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{item.job}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginTop: 4 }}>{item.customer || "-"} | {item.device || "-"}</div>
                <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 6 }}>Due {item.dueDate || "-"} | {item.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 12 }}>Technician Desk</div>
            <div style={{ display: "grid", gap: 10 }}>
              {technicians.slice(0, 5).map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.technician}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.specialty || "-"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.workload || "-"}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 12 }}>Warranty Watch</div>
            <div style={{ display: "grid", gap: 10 }}>
              {warranties.slice(0, 5).map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.claim}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>{item.device || "-"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.amount.toLocaleString()}</div>
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
