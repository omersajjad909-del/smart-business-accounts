"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const foodProcessingAccent = "#f97316";

export type FoodProcessingControlCenter = {
  summary: {
    recipes: number;
    liveRecipes: number;
    approvedRecipes: number;
    avgUnitCost: number;
    totalYield: number;
  };
  recipes: ReturnType<typeof mapFoodRecipe>[];
};

export async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

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
