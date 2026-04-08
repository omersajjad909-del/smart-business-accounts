"use client";

import { useEffect, useState } from "react";
import { RestaurantControlCenter, fetchJson, restaurantBg, restaurantBorder, restaurantFont, restaurantMuted } from "../_shared";

const emptyState: RestaurantControlCenter = {
  summary: { menuItems: 0, activeTables: 0, occupiedTables: 0, kitchenOrders: 0, readyOrders: 0, openOrders: 0, salesValue: 0, avgRecipeMargin: 0, reservations: 0, cancellationRate: 0 },
  menu: [],
  tables: [],
  kitchenOrders: [],
  recipes: [],
  orders: [],
  reservations: [],
};

export default function RestaurantAnalyticsPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/restaurant/control-center", emptyState).then(setData);
  }, []);

  const averageTicket = data.orders.length ? Math.round(data.summary.salesValue / data.orders.length) : 0;
  const lowMarginRecipes = data.recipes.filter((recipe) => recipe.margin < 30).length;

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
          { label: "Sales Value", value: `Rs. ${data.summary.salesValue.toLocaleString()}`, color: "#34d399" },
          { label: "Average Ticket", value: `Rs. ${averageTicket.toLocaleString()}`, color: "#fca5a5" },
          { label: "Occupied Rate", value: `${data.tables.length ? Math.round((data.summary.occupiedTables / data.tables.length) * 100) : 0}%`, color: "#38bdf8" },
          { label: "Ready Orders", value: data.summary.readyOrders, color: "#f59e0b" },
          { label: "Low Margin Recipes", value: lowMarginRecipes, color: lowMarginRecipes ? "#ef4444" : "#22c55e" },
          { label: "Reservation Cancellations", value: `${data.summary.cancellationRate}%`, color: data.summary.cancellationRate > 20 ? "#ef4444" : "#94a3b8" },
        ].map((card) => (
          <div key={card.label} style={{ background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: restaurantMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
