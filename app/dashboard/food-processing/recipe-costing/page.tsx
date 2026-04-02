"use client";

import { BusinessVerticalShell } from "../../_components/BusinessVerticalShell";

export default function FoodProcessingRecipeCostingPage() {
  return (
    <BusinessVerticalShell
      title="Recipe Costing"
      subtitle="Ingredient, packaging, and batch-yield costing for packaged-food operations."
      mode="overview"
      accent="#f97316"
      links={[
        { label: "Overview", href: "/dashboard/food-processing" },
        { label: "BOM", href: "/dashboard/manufacturing/bom" },
        { label: "Production Orders", href: "/dashboard/manufacturing/production-orders" },
        { label: "Analytics", href: "/dashboard/food-processing/analytics" },
      ]}
      highlights={[
        { title: "Ingredient Costing", description: "Track formula cost against current raw-material assumptions." },
        { title: "Packaging Impact", description: "Include packaging material in final unit economics before release." },
        { title: "Yield Planning", description: "Estimate expected output and understand loss-sensitive batches." },
        { title: "Margin Readiness", description: "Prepare production-ready cost lines before commercial pricing." },
      ]}
      workflow={[
        "Ingredients and packaging values are assembled into a production recipe.",
        "Expected yield translates formula cost into practical unit economics.",
        "Commercial teams price finished goods with better margin awareness.",
        "Production then runs from an approved and understood cost baseline.",
      ]}
    />
  );
}
