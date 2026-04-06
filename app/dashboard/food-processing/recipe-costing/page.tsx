"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { foodProcessingAccent, mapFoodRecipe } from "../_shared";

const statusOptions = ["draft", "approved", "live"];

export default function FoodProcessingRecipeCostingPage() {
  return (
    <BusinessRecordWorkspace
      title="Recipe Costing"
      subtitle="Capture recipe yield, unit cost, and SKU readiness before production."
      accent={foodProcessingAccent}
      category="food_recipe"
      emptyState="No recipes yet. Add the first product formula."
      fields={[
        { key: "recipe", label: "Recipe", placeholder: "Spicy ketchup 500ml", required: true },
        { key: "sku", label: "SKU", placeholder: "KETCH-500-SP", required: true },
        { key: "batchYield", label: "Batch Yield", type: "number", placeholder: "850", required: true },
        { key: "unitCost", label: "Unit Cost", type: "number", placeholder: "145", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "draft" }}
      columns={[
        { key: "recipe", label: "Recipe" },
        { key: "sku", label: "SKU" },
        { key: "batchYield", label: "Batch Yield" },
        { key: "unitCost", label: "Unit Cost" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapFoodRecipe}
      buildCreatePayload={(form) => ({
        title: form.recipe,
        status: form.status,
        amount: Number(form.unitCost || 0),
        data: {
          sku: form.sku,
          batchYield: Number(form.batchYield || 0),
        },
      })}
      summarize={(rows) => [
        { label: "Recipes", value: rows.length, color: "#f97316" },
        { label: "Approved", value: rows.filter((row) => String(row.status) === "approved").length, color: "#34d399" },
        { label: "Live", value: rows.filter((row) => String(row.status) === "live").length, color: "#60a5fa" },
        { label: "Avg Unit Cost", value: rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.unitCost || 0), 0) / rows.length).toLocaleString() : "0", color: "#fbbf24" },
      ]}
    />
  );
}
