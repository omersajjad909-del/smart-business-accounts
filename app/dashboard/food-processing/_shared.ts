"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const foodProcessingAccent = "#f97316";

export function mapFoodRecipe(record: BusinessRecord) {
  return {
    id: record.id,
    recipe: record.title,
    sku: String(record.data?.sku || ""),
    batchYield: Number(record.data?.batchYield || 0),
    unitCost: Number(record.amount || 0),
    status: record.status || "draft",
  };
}
