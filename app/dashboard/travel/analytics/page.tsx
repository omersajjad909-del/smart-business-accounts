"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const ff = "'Outfit','Inter',sans-serif";
const panelBg = "rgba(255,255,255,.03)";
const panelBorder = "rgba(255,255,255,.07)";
const ACCENT = "#38bdf8";

type AnalyticsData = {
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalMargin: number;
    tickets: number;
    visas: number;
    hotels: number;
    tours: number;
    passports: number;
    pendingInvoices: number;
    pendingSettlements: number;
    supplierExposure: number;
  };
  byModule: { module: string; count: number; revenue: number; cost: number; color: string }[];
  recentActivity: { id: string; ref: string; type: string; customer: string; amount: number; status: string; color: string }[];
  topSuppliers: { name: string; exposure: number; count: number }[];
  statusBreakdown: { module: string; statuses: { status: string; count: number; color: string }[] }[];
};

const empty: AnalyticsData = {
  summary: { totalRevenue: 0, totalCost: 0, totalMargin: 0, tickets: 0, visas: 0, hotels: 0, tours: 0, passports: 0, pendingInvoices: 0, pendingSettlements: 0, supplierExposure: 0 },
  byModule: [],
  recentActivity: [],
  topSuppliers: [],
  statusBreakdown: [],
};

export default function TravelAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/travel/analytics", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { summary, byModule, recentActivity, topSuppliers, statusBreakdown } = data;
  const marginPct = summary.totalRevenue > 0 ? Math.round((summary.totalMargin / summary.totalRevenue) * 100) : 0;

  const moduleLinks = [
    { label: "Airline Tickets", href: "/dashboard/travel/tickets", color: ACCENT },
    { label: "Visa Cases", href: "/dashboard/travel/visas", color: "#a78bfa" },
    { label: "Hotel Packages", href: "/dashboard/travel/hotel-packages", color: "#a78bfa" },
    { label: "Group Tours", href: "/dashboard/travel/tours", color: "#f97316" },
    { label: "Settlements", href: "/dashboard/travel/settlements", color: "#f87171" },
    { label: "Passports", href: "/dashboard/travel/passports", color: "#34d399" },
  ];

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "#fff" }}>📊 Travel Analytics</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.45)" }}>Complete business performance — revenue, margin, pipeline, and supplier exposure.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {moduleLinks.map(l => (
            <Link key={l.href} prefetch={false} href={l.href} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${panelBorder}`, background: panelBg, color: l.color, textDecoration: "none", fontSize: 11, fontWeight: 700 }}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.4)" }}>Loading analytics...</div>}

      {!loading && (
        <>
          {/* KPI Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Total Revenue", value: `Rs. ${summary.totalRevenue.toLocaleString()}`, color: "#34d399" },
              { label: "Total Cost", value: `Rs. ${summary.totalCost.toLocaleString()}`, color: "#f87171" },
              { label: "Gross Margin", value: `Rs. ${summary.totalMargin.toLocaleString()}`, color: "#60a5fa" },
              { label: "Margin %", value: `${marginPct}%`, color: marginPct >= 15 ? "#34d399" : "#fbbf24" },
              { label: "Supplier Exposure", value: `Rs. ${summary.supplierExposure.toLocaleString()}`, color: "#f97316" },
              { label: "Pending Invoices", value: summary.pendingInvoices, color: "#fbbf24" },
              { label: "Pending Settlements", value: summary.pendingSettlements, color: "#f87171" },
            ].map(k => (
              <div key={k.label} style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 14, padding: "16px 20px" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

            {/* Revenue by Module */}
            <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, padding: 22 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 18 }}>Revenue by Module</div>
              {byModule.length === 0 ? (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)", padding: "20px 0" }}>No data yet.</div>
              ) : byModule.map(m => {
                const pct = summary.totalRevenue > 0 ? Math.round((m.revenue / summary.totalRevenue) * 100) : 0;
                return (
                  <div key={m.module} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: m.color, fontWeight: 600 }}>{m.module}</span>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,.6)" }}>Rs. {m.revenue.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,.06)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: m.color, borderRadius: 4, transition: "width .5s" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 4 }}>{m.count} records | Margin: Rs. {(m.revenue - m.cost).toLocaleString()}</div>
                  </div>
                );
              })}
            </div>

            {/* Top Suppliers */}
            <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, padding: 22 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 18 }}>Supplier Exposure</div>
              {topSuppliers.length === 0 ? (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)", padding: "20px 0" }}>No settlements yet.</div>
              ) : topSuppliers.map((s, i) => (
                <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < topSuppliers.length - 1 ? `1px solid ${panelBorder}` : "none" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 2 }}>{s.count} settlement{s.count !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#f87171" }}>Rs. {s.exposure.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

            {/* Status Breakdown */}
            <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, padding: 22 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 18 }}>Pipeline Status</div>
              {statusBreakdown.map(mod => (
                <div key={mod.module} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>{mod.module}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {mod.statuses.map(s => (
                      <div key={s.status} style={{ background: `${s.color}18`, border: `1px solid ${s.color}44`, borderRadius: 20, padding: "4px 12px", fontSize: 12, color: s.color, fontWeight: 700 }}>
                        {s.status}: {s.count}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {statusBreakdown.length === 0 && <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)" }}>No records yet.</div>}
            </div>

            {/* Recent Activity */}
            <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, padding: 22 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 18 }}>Recent Activity</div>
              {recentActivity.length === 0 ? (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)" }}>No recent activity.</div>
              ) : recentActivity.map(a => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${panelBorder}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{a.ref}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 2 }}>{a.type} | {a.customer}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>Rs. {a.amount.toLocaleString()}</div>
                    <div style={{ fontSize: 10, background: `${a.color}18`, color: a.color, borderRadius: 10, padding: "2px 8px", marginTop: 3, fontWeight: 700 }}>{a.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
