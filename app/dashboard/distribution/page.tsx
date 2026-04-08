"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DistributionControlCenter, distributionBg, distributionBorder, distributionFont, fetchJson } from "./_shared";

const emptyState: DistributionControlCenter = {
  summary: { routes: 0, activeRoutes: 0, deliveries: 0, delivered: 0, failed: 0, vanRevenue: 0, collections: 0, loadedQty: 0, soldQty: 0, recoveryRate: 0 },
  routes: [],
  routeMetrics: [],
};

export default function DistributionOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/distribution/control-center", emptyState).then(setData);
  }, []);

  const { summary, routeMetrics } = data;

  return (
    <div style={{ padding: "28px 32px", fontFamily: distributionFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Distribution Command Center</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", margin: 0 }}>Routes, deliveries, van sales, and collections in one view.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { href: "/dashboard/distribution/routes", label: "Routes" },
            { href: "/dashboard/distribution/delivery", label: "Delivery" },
            { href: "/dashboard/distribution/stock-on-van", label: "Stock on Van" },
            { href: "/dashboard/distribution/collections", label: "Collections" },
            { href: "/dashboard/distribution/analytics", label: "Analytics" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${distributionBorder}`, background: distributionBg, color: "#fdba74", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Active Routes", value: summary.activeRoutes, color: "#f97316" },
          { label: "Delivered", value: summary.delivered, color: "#34d399" },
          { label: "Failed", value: summary.failed, color: "#ef4444" },
          { label: "Van Revenue", value: `Rs. ${summary.vanRevenue.toLocaleString()}`, color: "#38bdf8" },
          { label: "Recovery", value: `${summary.recoveryRate}%`, color: "#a78bfa" },
        ].map((card) => (
          <div key={card.label} style={{ background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Route", "Area", "Driver", "Deliveries", "Delivered", "Failed", "Revenue", "Collected", "Recovery"].map((header) => (
                <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${distributionBorder}`, fontWeight: 600 }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {routeMetrics.slice(0, 8).map((metric) => (
              <tr key={metric.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{metric.route}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{metric.area || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{metric.driver || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#38bdf8", fontWeight: 700 }}>{metric.deliveries}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 700 }}>{metric.delivered}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#ef4444", fontWeight: 700 }}>{metric.failed}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 700 }}>Rs. {metric.revenue.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#38bdf8", fontWeight: 700 }}>Rs. {metric.collected.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: metric.recoveryRate >= 80 ? "#22c55e" : "#f59e0b", fontWeight: 700 }}>{metric.recoveryRate}%</td>
              </tr>
            ))}
            {routeMetrics.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No route metrics available yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
