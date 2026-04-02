"use client";

import { BusinessVerticalShell } from "../../_components/BusinessVerticalShell";

export default function FoodProcessingAnalyticsPage() {
  return (
    <BusinessVerticalShell
      title="Food Processing Analytics"
      subtitle="Recipe economics, ingredient pressure, production flow, and packaged-output visibility."
      mode="analytics"
      accent="#f97316"
      links={[
        { label: "Overview", href: "/dashboard/food-processing" },
        { label: "Recipe Costing", href: "/dashboard/food-processing/recipe-costing" },
        { label: "BOM", href: "/dashboard/manufacturing/bom" },
        { label: "Production Orders", href: "/dashboard/manufacturing/production-orders" },
        { label: "Raw Materials", href: "/dashboard/manufacturing/raw-materials" },
      ]}
      highlights={[
        { title: "Recipe Margin", description: "Watch how ingredient and packaging changes affect product economics." },
        { title: "Input Pressure", description: "See where ingredient-heavy lines are driving production cost pressure." },
        { title: "Batch Flow", description: "Review open production and bottlenecks around execution cadence." },
        { title: "Output Readiness", description: "Track whether finished food products are ready for release on time." },
      ]}
      workflow={[
        "Cost reading starts from recipe and ingredient sensitivity.",
        "Production flow is checked against open orders and material readiness.",
        "High-pressure items are surfaced before they damage packaged-goods margin.",
        "Management uses the view to balance costing, supply, and production pace.",
      ]}
    />
  );
}
