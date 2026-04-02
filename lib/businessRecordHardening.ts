type BusinessRecordMeta = {
  label: string;
  business: "retail" | "distribution" | "trading" | "manufacturing" | "service" | "generic";
};

const CATEGORY_META: Record<string, BusinessRecordMeta> = {
  catalog_product: { label: "Catalog Product", business: "retail" },
  loyalty_member: { label: "Loyalty Member", business: "retail" },
  pos_sale: { label: "POS Sale", business: "retail" },

  distribution_route: { label: "Distribution Route", business: "distribution" },
  delivery: { label: "Distribution Delivery", business: "distribution" },
  van_sale: { label: "Van Sale", business: "distribution" },
  van_stock: { label: "Van Stock", business: "distribution" },
  distribution_collection: { label: "Distribution Collection", business: "distribution" },

  bom: { label: "Bill of Materials", business: "manufacturing" },
  production_order: { label: "Production Order", business: "manufacturing" },
  work_order: { label: "Work Order", business: "manufacturing" },
  raw_material: { label: "Raw Material", business: "manufacturing" },
  finished_good_batch: { label: "Finished Good Batch", business: "manufacturing" },
  quality_check: { label: "Quality Check", business: "manufacturing" },

  service_catalog: { label: "Service Catalog Item", business: "service" },
  service_project: { label: "Service Project", business: "service" },
  service_delivery: { label: "Service Delivery", business: "service" },
  service_timesheet: { label: "Service Timesheet", business: "service" },
};

export type SanitizedBusinessRecordInput = {
  category: string;
  title: string;
  subCategory?: string | null;
  status?: string;
  refId?: string | null;
  data: Prisma.InputJsonValue;
  amount?: number | null;
  date?: string | null;
  branchId?: string | null;
};

function sanitizeString(value: unknown, maxLength: number) {
  const stringValue = String(value ?? "").trim();
  return stringValue.slice(0, maxLength);
}

function sanitizeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function sanitizeData(value: unknown): Prisma.InputJsonValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return {};
  }
}

export function getBusinessRecordMeta(category: string): BusinessRecordMeta {
  return CATEGORY_META[category] || {
    label: category.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
    business: "generic",
  };
}

export function getBusinessRecordAuditEntity(category: string) {
  return `BUSINESS_RECORD:${category}`;
}

export function sanitizeBusinessRecordInput(input: Record<string, unknown>): SanitizedBusinessRecordInput {
  return {
    category: sanitizeString(input.category, 80).toLowerCase(),
    title: sanitizeString(input.title, 160),
    subCategory: sanitizeString(input.subCategory, 80) || null,
    status: sanitizeString(input.status || "active", 40).toLowerCase() || "active",
    refId: sanitizeString(input.refId, 120) || null,
    data: sanitizeData(input.data),
    amount: sanitizeNumber(input.amount),
    date: sanitizeDate(input.date),
    branchId: sanitizeString(input.branchId, 120) || null,
  };
}
import type { Prisma } from "@prisma/client";
