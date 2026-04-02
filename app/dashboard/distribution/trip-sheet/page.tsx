"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  distributionBg,
  distributionBorder,
  distributionFont,
  mapDistributionRoutes,
  todayIso,
} from "../_shared";

export default function DistributionTripSheetPage() {
  const routeRecords = useBusinessRecords("distribution_route");
  const deliveryRecords = useBusinessRecords("delivery");
  const stockRecords = useBusinessRecords("van_stock");
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayIso());

  const routes = useMemo(() => mapDistributionRoutes(routeRecords.records).filter((route) => route.status === "active"), [routeRecords.records]);
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) || null;

  const deliveries = useMemo(() => deliveryRecords.records.filter((record) => {
    const routeMatch = !selectedRouteId || String(record.data?.routeId || "") === selectedRouteId;
    const dateMatch = !selectedDate || (record.date?.split("T")[0] || "") === selectedDate;
    return routeMatch && dateMatch;
  }).map((record) => ({
    customer: record.title,
    address: String(record.data?.address || ""),
    invoiceRef: String(record.data?.invoiceRef || ""),
    items: String(record.data?.items || ""),
    status: record.status || "pending",
  })), [deliveryRecords.records, selectedDate, selectedRouteId]);

  const stockLoads = useMemo(() => stockRecords.records.filter((record) => {
    const routeMatch = !selectedRouteId || String(record.data?.routeId || "") === selectedRouteId;
    const dateMatch = !selectedDate || (record.date?.split("T")[0] || "") === selectedDate;
    return routeMatch && dateMatch;
  }).map((record) => ({
    itemName: String(record.data?.itemName || record.title || ""),
    loadQty: Number(record.data?.loadQty || 0),
    soldQty: Number(record.data?.soldQty || 0),
    returnedQty: Number(record.data?.returnedQty || 0),
  })), [selectedDate, selectedRouteId, stockRecords.records]);

  return (
    <div style={{ padding: "28px 32px", fontFamily: distributionFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Trip Sheet</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>
            Generate a printable route sheet with dispatch list and stock summary.
          </p>
        </div>
        <button onClick={() => window.print()} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#6366f1", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          Print Trip Sheet
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Route</label>
          <select value={selectedRouteId} onChange={(event) => setSelectedRouteId(event.target.value)} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }}>
            <option value="">All routes</option>
            {routes.map((route) => <option key={route.id} value={route.id}>{route.name} - {route.area}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Date</label>
          <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }} />
        </div>
      </div>

      <div style={{ background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>{selectedRoute?.name || "All Distribution Routes"}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>
              {selectedRoute ? `${selectedRoute.area} · Driver: ${selectedRoute.driver || "-"} · Vehicle: ${selectedRoute.vehicle || "-"}` : "Combined dispatch summary"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>Trip Date</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedDate}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Delivery Manifest</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Customer", "Invoice", "Items", "Status"].map((header) => (
                    <th key={header} style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${distributionBorder}` }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery, index) => (
                  <tr key={`${delivery.customer}-${index}`}>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{delivery.customer}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{delivery.invoiceRef || "-"}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{delivery.items || "-"}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{delivery.status}</td>
                  </tr>
                ))}
                {deliveries.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No deliveries for this selection.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Load Sheet</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Item", "Loaded", "Sold", "Returned"].map((header) => (
                    <th key={header} style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${distributionBorder}` }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stockLoads.map((load, index) => (
                  <tr key={`${load.itemName}-${index}`}>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{load.itemName}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{load.loadQty}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{load.soldQty}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{load.returnedQty}</td>
                  </tr>
                ))}
                {stockLoads.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No load sheet data for this selection.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
