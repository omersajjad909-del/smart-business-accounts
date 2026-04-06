"use client";

import { useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { foodProcessingAccent, mapFoodRecipe } from "../_shared";

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,.03)",
  border: "1px solid rgba(255,255,255,.07)",
  borderRadius: 16,
  padding: "18px 20px",
};

export default function FoodProcessingAnalyticsPage() {
  const recipeStore = useBusinessRecords("food_recipe");
  const recipes = useMemo(() => recipeStore.records.map(mapFoodRecipe), [recipeStore.records]);

  const stats = useMemo(() => {
    const totalCost = recipes.reduce((sum, item) => sum + Number(item.unitCost || 0), 0);
    const totalYield = recipes.reduce((sum, item) => sum + Number(item.batchYield || 0), 0);
    return {
      recipes: recipes.length,
      live: recipes.filter((item) => String(item.status) === "live").length,
      avgCost: recipes.length ? Math.round(totalCost / recipes.length) : 0,
      totalYield,
    };
  }, [recipes]);

  return (
    <div style={{ padding: "28px 32px", color: "#e2e8f0", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "white" }}>Food Processing Analytics</h1>
        <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,.45)" }}>
          Review recipe readiness, cost pressure, and production-facing yield visibility.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Recipes</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: foodProcessingAccent }}>{stats.recipes}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Live Recipes</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#34d399" }}>{stats.live}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Avg Unit Cost</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fbbf24" }}>{stats.avgCost.toLocaleString()}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Total Yield</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#60a5fa" }}>{stats.totalYield.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ ...cardStyle, overflowX: "auto" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Recipe Summary</div>
        {recipeStore.loading ? (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>Loading recipes...</div>
        ) : recipes.length ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Recipe", "SKU", "Batch Yield", "Unit Cost", "Status"].map((head) => (
                  <th key={head} style={{ textAlign: "left", padding: "0 0 10px", borderBottom: "1px solid rgba(255,255,255,.07)", fontSize: 11, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recipes.map((item) => (
                <tr key={item.id}>
                  <td style={{ padding: "14px 12px 14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{item.recipe}</td>
                  <td style={{ padding: "14px 12px 14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{item.sku || "-"}</td>
                  <td style={{ padding: "14px 12px 14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{Number(item.batchYield || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 12px 14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{Number(item.unitCost || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{String(item.status || "-")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>No recipes available yet.</div>
        )}
      </div>
    </div>
  );
}
