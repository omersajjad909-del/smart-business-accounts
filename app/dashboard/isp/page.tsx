"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IspControlCenter, fetchJson, ispBg, ispBorder, ispFont, ispMuted } from "./_shared";

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

export default function IspOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/isp/control-center", emptyState).then(setData);
  }, []);

  const { summary, bills, tickets, connections } = data;

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: ispFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>ISP / Cable Network</div>
          <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 900 }}>Connections, billing, and service reliability command center</h1>
          <p style={{ margin: 0, fontSize: 14, color: ispMuted, maxWidth: 760 }}>
            Packages, customer connections, recurring billing, aur support pressure ko ek operational feed me monitor karein.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { href: "/dashboard/isp/packages", label: "Packages" },
            { href: "/dashboard/isp/connections", label: "Connections" },
            { href: "/dashboard/isp/billing", label: "Monthly Bills" },
            { href: "/dashboard/isp/support", label: "Support Tickets" },
            { href: "/dashboard/isp/analytics", label: "Analytics" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${ispBorder}`, background: ispBg, color: "#93c5fd", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Active Packages", value: summary.activePackages, color: "#60a5fa" },
          { label: "Active Connections", value: summary.activeConnections, color: "#34d399" },
          { label: "Suspended", value: summary.suspendedConnections, color: "#f97316" },
          { label: "Open Tickets", value: summary.openTickets, color: "#c084fc" },
          { label: "Collected", value: `Rs. ${summary.paidRevenue.toLocaleString()}`, color: "#22c55e" },
        ].map((card) => (
          <div key={card.label} style={{ background: ispBg, border: `1px solid ${ispBorder}`, borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: ispMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 18 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(59,130,246,.14), rgba(14,165,233,.08))", border: `1px solid ${ispBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#bfdbfe", fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>Service Flow</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
            {[
              { title: "Package Setup", body: "Bandwidth plans, quotas, and monthly rates define karein." },
              { title: "Connection Desk", body: "Customer address, package assignment, and activation pipeline control karein." },
              { title: "Recurring Billing", body: "Cycle-wise bills, collections, and overdue recovery monitor karein." },
              { title: "Support Response", body: "Complaints, outages, and assigned tickets ko SLA-style handle karein." },
            ].map((step, index) => (
              <div key={step.title} style={{ background: "rgba(8,12,30,.36)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, background: "rgba(147,197,253,.16)", color: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, marginBottom: 12 }}>{index + 1}</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,.62)" }}>{step.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ background: ispBg, border: `1px solid ${ispBorder}`, borderRadius: 20, padding: 22 }}>
            <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Collection Watchlist</div>
            <div style={{ display: "grid", gap: 10 }}>
              {bills.length === 0 ? (
                <div style={{ color: ispMuted, fontSize: 13 }}>Monthly billing records add karne ke baad collection watchlist show hogi.</div>
              ) : bills.slice(0, 4).map((bill) => (
                <div key={bill.id} style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{bill.customer}</div>
                  <div style={{ fontSize: 12, color: ispMuted }}>{bill.invoiceNo} | {bill.cycle || "Current cycle"}</div>
                  <div style={{ fontSize: 12, color: bill.status === "overdue" ? "#fca5a5" : "#93c5fd", marginTop: 6 }}>
                    Rs. {bill.amount.toLocaleString()} | {bill.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: ispBg, border: `1px solid ${ispBorder}`, borderRadius: 20, padding: 22 }}>
            <div style={{ fontSize: 13, color: "#facc15", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Ops Reading</div>
            <div style={{ display: "grid", gap: 12 }}>
              {[
                { label: "Connected base", value: `${summary.connections} total`, tone: "#60a5fa" },
                { label: "Overdue bills", value: `${summary.overdueBills} accounts`, tone: "#f87171" },
                { label: "Assigned tickets", value: `${tickets.filter((item) => item.status === "assigned").length} active`, tone: "#c084fc" },
                { label: "Pending installs", value: `${connections.filter((item) => item.status === "pending").length} waiting`, tone: "#34d399" },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 16px" }}>
                  <span style={{ fontSize: 13, color: ispMuted }}>{row.label}</span>
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
