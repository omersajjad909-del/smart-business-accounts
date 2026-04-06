"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapPrintStock, printingAccent } from "../_shared";

const statusOptions = ["available", "low_stock", "ordered"];

export default function PrintStockPage() {
  return (
    <BusinessRecordWorkspace
      title="Paper & Ink Stock"
      subtitle="Track consumables, reorder points, and suppliers for production continuity."
      accent={printingAccent}
      category="print_stock"
      emptyState="No print stock items yet. Add paper, plates, or ink inventory."
      fields={[
        { key: "item", label: "Item", placeholder: "128gsm art card", required: true },
        { key: "category", label: "Category", placeholder: "Paper / Ink / Plate", required: true },
        { key: "quantity", label: "Quantity", type: "number", placeholder: "240", required: true },
        { key: "reorderLevel", label: "Reorder Level", type: "number", placeholder: "40", required: true },
        { key: "supplier", label: "Supplier", placeholder: "Karachi Paper Mart", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "available" }}
      columns={[
        { key: "item", label: "Item" },
        { key: "category", label: "Category" },
        { key: "quantity", label: "Qty" },
        { key: "reorderLevel", label: "Reorder" },
        { key: "supplier", label: "Supplier" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapPrintStock}
      buildCreatePayload={(form) => ({
        title: form.item,
        status: form.status,
        data: {
          category: form.category,
          quantity: Number(form.quantity || 0),
          reorderLevel: Number(form.reorderLevel || 0),
          supplier: form.supplier,
        },
      })}
      summarize={(rows) => {
        const quantity = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
        const lowStock = rows.filter((row) => Number(row.quantity || 0) <= Number(row.reorderLevel || 0)).length;
        return [
          { label: "Stock Lines", value: rows.length, color: "#60a5fa" },
          { label: "Units on Hand", value: quantity.toLocaleString(), color: "#34d399" },
          { label: "Low Stock", value: lowStock, color: "#f87171" },
          { label: "Suppliers", value: new Set(rows.map((row) => String(row.supplier || ""))).size, color: "#fbbf24" },
        ];
      }}
    />
  );
}
