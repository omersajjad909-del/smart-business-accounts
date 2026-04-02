"use client";

import { useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  distributionBg,
  distributionBorder,
  distributionFont,
  mapDistributionRoutes,
} from "../_shared";

export default function DistributionAnalyticsPage() {
  const routeRecords = useBusinessRecords("distribution_route");
  const deliveryRecords = useBusinessRecords("delivery");
  const vanSalesRecords = useBusinessRecords("van_sale");
  const stockRecords = useBusinessRecords("van_stock");
  const collectionRecords = useBusinessRecords("distribution_collection");

  const routes = useMemo(() => mapDistributionRoutes(routeRecords.records), [routeRecords.records]);

  const routeMetrics = useMemo(() => {
    return routes.map((route) => {
      const deliveries = deliveryRecords.records.filter((record) => String(record.data?.routeId || "") === route.id);
      const vanSales = vanSalesRecords.records.filter((record) => String(record.data?.routeId || "") === route.id);
      const stockLoads = stockRecords.records.filter((record) => String(record.data?.routeId || "") === route.id);
      const collections = collectionRecords.records.filter((record) => String(record.data?.routeId || "") === route.id);

      const revenue = vanSales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);
      const collected = collections.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      const loadedQty = stockLoads.reduce((sum, load) => sum + Number(load.data?.loadQty || 0), 0);
      const soldQty = stockLoads.reduce((sum, load) => sum + Number(load.data?.soldQty || 0), 0);
      const failed = deliveries.filter((record) => record.status === "failed").length;

      return {
        id: route.id,
        route: route.name,
        area: route.area,
        driver: route.driver,
        deliveries: deliveries.length,
        delivered: deliveries.filter((record) => record.status === "delivered").length,
        revenue,
        collected,
        loadedQty,
        soldQty,
        failed,
        recoveryRate: revenue > 0 ? Math.round((collected / revenue) * 100) : 0,
      };
    });
  }, [collectionRecords.records, deliveryRecords.records, routes, stockRecords.records, vanSalesRecords.records]);

  const cards = [
    { label: "Routes", value: routes.length, color: "#f97316" },
    { label: "Deliveries", value: deliveryRecords.records.length, color: "#38bdf8" },
    { label: "Van Revenue", value: `Rs. ${vanSalesRecords.records.reduce((sum, sale) => sum + Number(sale.amount || 0), 0).toLocaleString()}`, color: "#34d399" },
    { label: "Collections", value: `Rs. ${collectionRecords.records.reduce((sum, row) => sum + Number(row.amount || 0), 0).toLocaleString()}`, color: "#a78bfa" },
    { label: "Failed Deliveries", value: deliveryRecords.records.filter((row) => row.status === "failed").length, color: "#ef4444" },
    { label: "Recovery Rate", value: `${routeMetrics.length ? Math.round(routeMetrics.reduce((sum, item) => sum + item.recoveryRate, 0) / routeMetrics.length) : 0}%`, color: "#f59e0b" },
  ];

  return (
    <div style={{ padding: "28px 32px", fontFamily: distributionFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Distribution Analytics</h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>
          Monitor route productivity, delivery completion, stock movement, and recovery performance.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {cards.map((card) => (
          <div key={card.label} style={{ background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Route", "Area", "Driver", "Deliveries", "Delivered", "Failed", "Loaded Qty", "Sold Qty", "Recovery", "Revenue", "Collected"].map((header) => (
                <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${distributionBorder}`, fontWeight: 600 }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {routeMetrics.map((metric) => (
              <tr key={metric.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{metric.route}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{metric.area || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{metric.driver || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#38bdf8", fontWeight: 700 }}>{metric.deliveries}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 700 }}>{metric.delivered}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#ef4444", fontWeight: 700 }}>{metric.failed}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#f59e0b", fontWeight: 700 }}>{metric.loadedQty}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#a78bfa", fontWeight: 700 }}>{metric.soldQty}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: metric.recoveryRate >= 80 ? "#22c55e" : "#f59e0b", fontWeight: 700 }}>{metric.recoveryRate}%</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 700 }}>Rs. {metric.revenue.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#38bdf8", fontWeight: 700 }}>Rs. {metric.collected.toLocaleString()}</td>
              </tr>
            ))}
            {routeMetrics.length === 0 && (
              <tr>
                <td colSpan={11} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>
                  No route analytics available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
