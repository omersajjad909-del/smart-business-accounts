"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchJson, repairAccent, type RepairControlCenter } from "../_shared";

const emptyState: RepairControlCenter = {
  summary: { jobs: 0, activeJobs: 0, readyJobs: 0, technicians: 0, activeTechnicians: 0, partsCost: 0, warrantyClaims: 0, warrantyExposure: 0 },
  jobs: [],
  technicians: [],
  parts: [],
  warranties: [],
};

export default function RepairAnalyticsPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/repair/control-center", emptyState).then(setData);
  }, []);

  const jobMix = useMemo(() => {
    const bucket = new Map<string, number>();
    data.jobs.forEach((row) => bucket.set(row.status, (bucket.get(row.status) || 0) + 1));
    return [...bucket.entries()];
  }, [data.jobs]);

  return (
    <div style={{ padding: "28px 32px", color: "#e2e8f0", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "white" }}>Repair Analytics</h1>
        <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,.45)" }}>Job ageing, technician productivity, parts cost pressure, and warranty-return visibility.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Active Jobs", value: data.summary.activeJobs, color: "#60a5fa" },
          { label: "Ready Jobs", value: data.summary.readyJobs, color: "#34d399" },
          { label: "Parts Cost", value: data.summary.partsCost.toLocaleString(), color: "#f59e0b" },
          { label: "Warranty Exposure", value: data.summary.warrantyExposure.toLocaleString(), color: repairAccent },
        ].map((card) => (
          <div key={card.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <section style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Job Status Mix</div>
          <div style={{ display: "grid", gap: 10 }}>
            {jobMix.map(([status, count]) => (
              <div key={status} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{status}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#bae6fd" }}>{count}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Technician Desk</div>
          <div style={{ display: "grid", gap: 10 }}>
            {data.technicians.slice(0, 6).map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{item.technician}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#60a5fa" }}>{item.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Warranty Claims</div>
          <div style={{ display: "grid", gap: 10 }}>
            {data.warranties.slice(0, 6).map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{item.claim}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: repairAccent }}>{item.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
