"use client";

import { BusinessVerticalShell } from "../_components/BusinessVerticalShell";

export default function FoodProcessingOverviewPage() {
  return (
    <BusinessVerticalShell
      title="Food Processing Overview"
      subtitle="Recipe-led production, raw ingredients, batch execution, and packaged-goods readiness."
      mode="overview"
      accent="#f97316"
      links={[
        { label: "Recipe Costing", href: "/dashboard/food-processing/recipe-costing" },
        { label: "BOM", href: "/dashboard/manufacturing/bom" },
        { label: "Production Orders", href: "/dashboard/manufacturing/production-orders" },
        { label: "Raw Materials", href: "/dashboard/manufacturing/raw-materials" },
        { label: "Analytics", href: "/dashboard/food-processing/analytics" },
      ]}
      highlights={[
        { title: "Recipe Desk", description: "Convert food formulas into traceable production-ready costing and batch plans." },
        { title: "Ingredient Control", description: "Track raw ingredients, packaging items, and consumption-sensitive materials." },
        { title: "Batch Production", description: "Run production orders with quantity, BOM, and process discipline." },
        { title: "Packaged Output", description: "Protect finished-goods flow from costing to release and sell-through." },
      ]}
      workflow={[
        "Recipe and BOM define each production batch before execution begins.",
        "Raw ingredients and packaging are controlled against the planned order.",
        "Production converts formula into finished packaged goods with discipline.",
        "Management reviews cost, readiness, and output quality before release.",
      ]}
    />
  );
}
