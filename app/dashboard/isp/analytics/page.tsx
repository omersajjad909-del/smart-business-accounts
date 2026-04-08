"use client";

import { useEffect, useState } from "react";
import { IspControlCenter, fetchJson, ispBg, ispBorder, ispFont, ispMuted } from "../_shared";

const emptyState: IspControlCenter = {
  summary: {
    packages: 0,
    activePackages: 0,
    connections: 0,
    activeConnections: 0,
    suspendedConnections: 0,
    bills: 0,
    overdueBills: 0,
    paidRevenue: 0,
    tickets: 0,
    openTickets: 0,
  },
  packages: [],
  connections: [],
  bills: [],
  tickets: [],
};

export default function IspAnalyticsPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/isp/control-center", emptyState).then(setData);
  }, []);

  const packageMix = data.packages.reduce<Record<string, number>>((acc, item) => {
    const key = item.speed || "Unspecified";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const billingByStatus = ["generated", "paid", "overdue", "waived"].map((status) => ({
    status,
    count: data.bills.filter((item) => item.status === status).length,
  }));

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: ispFont }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "#93c5fd", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>ISP Analytics</div>
        <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 900 }}>Portfolio, billing, and support pressure</h1>
        <p style={{ margin: 0, fontSize: 14, color: ispMuted, maxWidth: 760 }}>
          Package spread, collection status, and support backlog ko ek analytics board me dekhein.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Packages", value: data.summary.packages, color: "#60a5fa" },
          { label: "Active Base", value: data.summary.activeConnections, color: "#34d399" },
          { label: "Open Support", value: data.summary.openTickets, color: "#c084fc" },
          { label: "Paid Revenue", value: `Rs. ${data.summary.paidRevenue.toLocaleString()}`, color: "#22c55e" },
        ].map((card) => (
          <div key={card.label} style={{ background: ispBg, border: `1px solid ${ispBorder}`, borderRadius: 18, padding: "20px 22px" }}>
            <div style={{ fontSize: 12, color: ispMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: ispBg, border: `1px solid ${ispBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Package Mix</div>
          <div style={{ display: "grid", gap: 12 }}>
            {Object.entries(packageMix).sort((a, b) => b[1] - a[1]).map(([speed, count]) => (
              <div key={speed} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 16px" }}>
                <span style={{ fontSize: 13 }}>{speed}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#93c5fd" }}>{count}</span>
              </div>
            ))}
            {Object.keys(packageMix).length === 0 && <div style={{ color: ispMuted, fontSize: 13 }}>No package analytics yet.</div>}
          </div>
        </div>

        <div style={{ background: ispBg, border: `1px solid ${ispBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#f87171", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Billing & Support</div>
          <div style={{ display: "grid", gap: 12 }}>
            {billingByStatus.map((row) => (
              <div key={row.status} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 16px" }}>
                <span style={{ fontSize: 13, color: ispMuted }}>{row.status}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: row.status === "paid" ? "#34d399" : row.status === "overdue" ? "#f87171" : "#c084fc" }}>{row.count}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 16px" }}>
              <span style={{ fontSize: 13, color: ispMuted }}>Resolved tickets</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#34d399" }}>{data.tickets.filter((item) => item.status === "resolved" || item.status === "closed").length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
