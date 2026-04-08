"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RestaurantControlCenter, fetchJson, restaurantBg, restaurantBorder, restaurantFont, restaurantMuted } from "./_shared";

const emptyState: RestaurantControlCenter = {
  summary: { menuItems: 0, activeTables: 0, occupiedTables: 0, kitchenOrders: 0, readyOrders: 0, openOrders: 0, salesValue: 0, avgRecipeMargin: 0, reservations: 0, cancellationRate: 0 },
  menu: [],
  tables: [],
  kitchenOrders: [],
  recipes: [],
  orders: [],
  reservations: [],
};

export default function RestaurantOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/restaurant/control-center", emptyState).then(setData);
  }, []);

  return (
    <div style={{ padding: "28px 32px", color: "#fff", fontFamily: restaurantFont, minHeight: "100vh" }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Restaurant Command Center</h1>
        <p style={{ fontSize: 13, color: restaurantMuted, margin: 0 }}>
          Menu, tables, kitchen, reservations, and service flow in one workspace.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          { label: "Menu", href: "/dashboard/restaurant/menu" },
          { label: "Tables", href: "/dashboard/restaurant/tables" },
          { label: "Kitchen", href: "/dashboard/restaurant/kitchen" },
          { label: "Orders", href: "/dashboard/restaurant/orders" },
          { label: "Analytics", href: "/dashboard/restaurant/analytics" },
        ].map((item) => (
          <Link key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${restaurantBorder}`, background: restaurantBg, color: "#fca5a5", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
            {item.label}
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Menu Items", value: data.summary.menuItems, color: "#f87171" },
          { label: "Active Tables", value: data.summary.activeTables, color: "#38bdf8" },
          { label: "Open Kitchen Orders", value: data.summary.kitchenOrders, color: "#f59e0b" },
          { label: "Avg Recipe Margin", value: `${data.summary.avgRecipeMargin}%`, color: "#34d399" },
        ].map((card) => (
          <div key={card.label} style={{ background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: restaurantMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Service Reading</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { label: "Open orders", value: data.summary.openOrders, color: "#38bdf8" },
              { label: "Ready kitchen orders", value: data.summary.readyOrders, color: "#34d399" },
              { label: "Reservations", value: data.summary.reservations, color: "#a78bfa" },
              { label: "Sales value", value: `Rs. ${data.summary.salesValue.toLocaleString()}`, color: "#f59e0b" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ color: restaurantMuted }}>{row.label}</span>
                <span style={{ color: row.color, fontWeight: 800 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Reservation Watchlist</div>
          <div style={{ display: "grid", gap: 10 }}>
            {data.reservations.slice(0, 5).map((reservation) => (
              <div key={reservation.id} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{reservation.guestName}</div>
                <div style={{ fontSize: 12, color: restaurantMuted }}>{reservation.tableRef || "Walk-in"} | {reservation.guests} guests</div>
              </div>
            ))}
            {data.reservations.length === 0 && <div style={{ color: restaurantMuted, fontSize: 13 }}>No reservations yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
