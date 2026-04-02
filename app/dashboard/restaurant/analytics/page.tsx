"use client";

import { useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapKitchenOrderRecords,
  mapRecipeRecords,
  mapRestaurantOrderRecords,
  mapRestaurantReservationRecords,
  mapRestaurantTableRecords,
  restaurantBg,
  restaurantBorder,
  restaurantFont,
  restaurantMuted,
} from "../_shared";

export default function RestaurantAnalyticsPage() {
  const orderStore = useBusinessRecords("restaurant_order");
  const tableStore = useBusinessRecords("restaurant_table");
  const kitchenStore = useBusinessRecords("kitchen_order");
  const recipeStore = useBusinessRecords("recipe");
  const reservationStore = useBusinessRecords("restaurant_reservation");

  const orders = useMemo(() => mapRestaurantOrderRecords(orderStore.records), [orderStore.records]);
  const tables = useMemo(() => mapRestaurantTableRecords(tableStore.records), [tableStore.records]);
  const kitchenOrders = useMemo(() => mapKitchenOrderRecords(kitchenStore.records), [kitchenStore.records]);
  const recipes = useMemo(() => mapRecipeRecords(recipeStore.records), [recipeStore.records]);
  const reservations = useMemo(() => mapRestaurantReservationRecords(reservationStore.records), [reservationStore.records]);

  const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
  const averageTicket = orders.length ? Math.round(totalSales / orders.length) : 0;
  const occupiedRate = tables.length ? Math.round((tables.filter((table) => table.status === "occupied").length / tables.length) * 100) : 0;
  const readyOrders = kitchenOrders.filter((order) => order.status === "ready").length;
  const lowMarginRecipes = recipes.filter((recipe) => recipe.margin < 30).length;
  const cancellationRate = reservations.length ? Math.round((reservations.filter((row) => row.status === "cancelled").length / reservations.length) * 100) : 0;

  return (
    <div style={{ padding: "28px 32px", color: "#fff", fontFamily: restaurantFont, minHeight: "100vh" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Restaurant Analytics</h1>
        <p style={{ fontSize: 13, color: restaurantMuted, margin: 0 }}>
          Floor utilization, kitchen load, recipe margin, and reservation conversion.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Sales Value", value: `Rs. ${totalSales.toLocaleString()}`, color: "#34d399" },
          { label: "Average Ticket", value: `Rs. ${averageTicket.toLocaleString()}`, color: "#fca5a5" },
          { label: "Occupied Rate", value: `${occupiedRate}%`, color: "#38bdf8" },
          { label: "Ready Orders", value: readyOrders, color: "#f59e0b" },
          { label: "Low Margin Recipes", value: lowMarginRecipes, color: lowMarginRecipes ? "#ef4444" : "#22c55e" },
          { label: "Reservation Cancellations", value: `${cancellationRate}%`, color: cancellationRate > 20 ? "#ef4444" : "#94a3b8" },
        ].map((card) => (
          <div key={card.label} style={{ background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: restaurantMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${restaurantBorder}`, fontSize: 15, fontWeight: 800 }}>Service Mode Mix</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Mode", "Orders", "Revenue"].map((header) => (
                  <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: restaurantMuted, borderBottom: `1px solid ${restaurantBorder}` }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {["dine_in", "takeaway", "delivery"].map((mode) => {
                const rows = orders.filter((order) => order.serviceMode === mode);
                return (
                  <tr key={mode}>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", textTransform: "capitalize", fontWeight: 700 }}>{mode.replace("_", " ")}</td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{rows.length}</td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 700 }}>Rs. {rows.reduce((sum, order) => sum + order.total, 0).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Executive Watchlist</div>
          <div style={{ fontSize: 13, lineHeight: 1.8, color: restaurantMuted }}>
            Open Kitchen Queue: <span style={{ color: kitchenOrders.filter((order) => order.status === "pending" || order.status === "preparing").length > 5 ? "#ef4444" : "#f59e0b" }}>{kitchenOrders.filter((order) => order.status === "pending" || order.status === "preparing").length}</span>
            <br />
            Available Tables: <span style={{ color: "#38bdf8" }}>{tables.filter((table) => table.status === "available").length}</span>
            <br />
            Closed Orders: <span style={{ color: "#34d399" }}>{orders.filter((order) => order.status === "closed").length}</span>
            <br />
            Reservation Load: <span style={{ color: reservations.filter((row) => row.status === "booked" || row.status === "confirmed").length > 4 ? "#f59e0b" : "#22c55e" }}>{reservations.filter((row) => row.status === "booked" || row.status === "confirmed").length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
