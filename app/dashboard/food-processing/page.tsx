"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson, foodProcessingAccent, type FoodProcessingControlCenter } from "./_shared";
import { useResponsive } from "@/hooks/useResponsive";

const emptyState: FoodProcessingControlCenter = {
  summary: { recipes: 0, liveRecipes: 0, approvedRecipes: 0, avgUnitCost: 0, totalYield: 0 },
  recipes: [],
};

export default function FoodProcessingOverviewPage() {
  const { isMobile } = useResponsive();
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/food-processing/control-center", emptyState).then(setData);
  }, []);

  const { summary, recipes } = data;

  return (
    <div style={{ padding: isMobile ? "17px 16px" : "28px 32px", color: "var(--tx-e2e8f0, #e2e8f0)", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "var(--ink-solid, white)" }}>Food Processing Command Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(var(--ink),var(--ta-45, .45))" }}>Recipe-led production readiness, unit cost, and batch yield visibility from live records.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Recipe Costing", href: "/dashboard/food-processing/recipe-costing" },
            { label: "BOM", href: "/dashboard/manufacturing/bom" },
            { label: "Production Orders", href: "/dashboard/manufacturing/production-orders" },
            { label: "Analytics", href: "/dashboard/food-processing/analytics" },
          ].map((item) => (
            <Link prefetch={false} key={item.href} href={item.href} style={{ padding: isMobile ? "8px 8px" : "10px 14px", borderRadius: 10, border: "1px solid rgba(var(--ink),.08)", background: "rgba(var(--ink),.03)", color: "var(--tx-fdba74, #fdba74)", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Recipes", value: summary.recipes, color: foodProcessingAccent },
          { label: "Live Recipes", value: summary.liveRecipes, color: "var(--tx-34d399, #34d399)" },
          { label: "Approved", value: summary.approvedRecipes, color: "var(--tx-60a5fa, #60a5fa)" },
          { label: "Avg Unit Cost", value: summary.avgUnitCost.toLocaleString(), color: "var(--tx-fbbf24, #fbbf24)" },
          { label: "Total Yield", value: summary.totalYield.toLocaleString(), color: "var(--tx-f97316, #f97316)" },
        ].map((card) => (
          <div key={card.label} style={{ background: "rgba(var(--ink),.03)", border: "1px solid rgba(var(--ink),.07)", borderRadius: 16, padding: isMobile ? "11px 10px" : "18px 20px" }}>
            <div style={{ fontSize: 11, color: "rgba(var(--ink),var(--ta-45, .45))", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(var(--ink),.03)", border: "1px solid rgba(var(--ink),.07)", borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-solid, white)", marginBottom: 14 }}>Recipe Watchlist</div>
        <div style={{ display: "grid", gap: 10 }}>
          {recipes.slice(0, 8).map((item) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: isMobile ? "8px 8px" : "10px 12px", borderRadius: 12, background: "rgba(var(--ink),.03)", border: "1px solid rgba(var(--ink),.05)" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{item.recipe}</div>
                <div style={{ fontSize: 12, color: "rgba(var(--ink),var(--ta-45, .45))" }}>{item.sku || "-"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{item.unitCost.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: "rgba(var(--ink),var(--ta-45, .45))" }}>{item.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
