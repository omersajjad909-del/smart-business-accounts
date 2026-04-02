"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapKitchenOrderRecords,
  mapRecipeRecords,
  mapRestaurantMenuRecords,
  mapRestaurantOrderRecords,
  mapRestaurantReservationRecords,
  mapRestaurantTableRecords,
  restaurantBg,
  restaurantBorder,
  restaurantFont,
  restaurantMuted,
} from "./_shared";

export default function RestaurantOverviewPage() {
  const menuStore = useBusinessRecords("menu_item");
  const tableStore = useBusinessRecords("restaurant_table");
  const kitchenStore = useBusinessRecords("kitchen_order");
  const recipeStore = useBusinessRecords("recipe");
  const orderStore = useBusinessRecords("restaurant_order");
  const reservationStore = useBusinessRecords("restaurant_reservation");

  const menu = useMemo(() => mapRestaurantMenuRecords(menuStore.records), [menuStore.records]);
  const tables = useMemo(() => mapRestaurantTableRecords(tableStore.records), [tableStore.records]);
  const kitchenOrders = useMemo(() => mapKitchenOrderRecords(kitchenStore.records), [kitchenStore.records]);
  const recipes = useMemo(() => mapRecipeRecords(recipeStore.records), [recipeStore.records]);
  const orders = useMemo(() => mapRestaurantOrderRecords(orderStore.records), [orderStore.records]);
  const reservations = useMemo(() => mapRestaurantReservationRecords(reservationStore.records), [reservationStore.records]);

  const activeTables = tables.filter((table) => table.status === "occupied" || table.status === "reserved").length;
  const openKitchenOrders = kitchenOrders.filter((order) => order.status !== "served").length;
  const activeOrders = orders.filter((order) => order.status !== "closed").length;
  const averageRecipeMargin = recipes.length ? Math.round(recipes.reduce((sum, item) => sum + item.margin, 0) / recipes.length) : 0;

  return (
    <div style={{ padding: "28px 32px", color: "#fff", fontFamily: restaurantFont, minHeight: "100vh" }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Restaurant Command Center</h1>
        <p style={{ fontSize: 13, color: restaurantMuted, margin: 0 }}>
          Menu, tables, kitchen, reservations, and service flow in one workspace.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Menu Items", value: menu.length, color: "#f87171" },
          { label: "Active Tables", value: activeTables, color: "#38bdf8" },
          { label: "Open Kitchen Orders", value: openKitchenOrders, color: "#f59e0b" },
          { label: "Avg Recipe Margin", value: `${averageRecipeMargin}%`, color: "#34d399" },
        ].map((card) => (
          <div key={card.label} style={{ background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: restaurantMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: restaurantMuted, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Quick Access</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { href: "/dashboard/restaurant/orders", label: "Order Board" },
            { href: "/dashboard/restaurant/reservations", label: "Reservations" },
            { href: "/dashboard/restaurant/tables", label: "Table Floor" },
            { href: "/dashboard/restaurant/kitchen", label: "Kitchen" },
            { href: "/dashboard/restaurant/menu", label: "Menu" },
            { href: "/dashboard/restaurant/analytics", label: "Analytics" },
          ].map((link) => (
            <Link key={link.href} href={link.href} style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.22)", color: "#fca5a5", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 14 }}>
        <div style={{ background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${restaurantBorder}`, fontSize: 15, fontWeight: 800 }}>Service Snapshot</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Metric", "Value", "Watch"].map((header) => (
                  <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: restaurantMuted, borderBottom: `1px solid ${restaurantBorder}` }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { metric: "Open Orders", value: activeOrders, watch: activeOrders > 8 ? "High floor pressure" : "Normal" },
                { metric: "Reserved Tables", value: tables.filter((table) => table.status === "reserved").length, watch: reservations.length > 4 ? "Heavy booking day" : "Balanced" },
                { metric: "Occupied Tables", value: tables.filter((table) => table.status === "occupied").length, watch: activeTables === tables.length && tables.length > 0 ? "Full floor" : "Capacity available" },
                { metric: "Upcoming Reservations", value: reservations.filter((row) => row.status !== "cancelled").length, watch: reservations.length > 6 ? "Front desk load" : "Manageable" },
              ].map((row) => (
                <tr key={row.metric}>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.metric}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#fca5a5", fontWeight: 700 }}>{row.value}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: restaurantMuted }}>{row.watch}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Kitchen Alerts</div>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: restaurantMuted }}>
              Pending Orders: <span style={{ color: kitchenOrders.filter((order) => order.status === "pending").length ? "#f59e0b" : "#22c55e" }}>{kitchenOrders.filter((order) => order.status === "pending").length}</span>
              <br />
              Preparing: <span style={{ color: "#38bdf8" }}>{kitchenOrders.filter((order) => order.status === "preparing").length}</span>
              <br />
              Ready To Serve: <span style={{ color: kitchenOrders.filter((order) => order.status === "ready").length ? "#34d399" : "#94a3b8" }}>{kitchenOrders.filter((order) => order.status === "ready").length}</span>
            </div>
          </div>

          <div style={{ background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Cost Control</div>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: restaurantMuted }}>
              Recipe Records: <span style={{ color: "#fca5a5" }}>{recipes.length}</span>
              <br />
              Low Margin Recipes: <span style={{ color: recipes.filter((item) => item.margin < 30).length ? "#f59e0b" : "#22c55e" }}>{recipes.filter((item) => item.margin < 30).length}</span>
              <br />
              Unavailable Menu Items: <span style={{ color: menu.filter((item) => !item.available).length ? "#ef4444" : "#22c55e" }}>{menu.filter((item) => !item.available).length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
