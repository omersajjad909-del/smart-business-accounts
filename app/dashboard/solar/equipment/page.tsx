"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapSolarEquipment, solarAccent } from "../_shared";

const statusOptions = ["in_stock", "allocated", "ordered"];

export default function SolarEquipmentPage() {
  return (
    <BusinessRecordWorkspace
      title="Equipment Stock"
      subtitle="Control panels, batteries, and inverters with reorder visibility across warehouses."
      accent={solarAccent}
      category="solar_equipment"
      emptyState="No equipment stock records yet. Add your first stocked item."
      fields={[
        { key: "item", label: "Item", placeholder: "540W Mono Panel", required: true },
        { key: "sku", label: "SKU", placeholder: "PAN-540-MONO", required: true },
        { key: "quantity", label: "Quantity", type: "number", placeholder: "120", required: true },
        { key: "reorderLevel", label: "Reorder Level", type: "number", placeholder: "20", required: true },
        { key: "warehouse", label: "Warehouse", placeholder: "Main energy warehouse", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "in_stock" }}
      columns={[
        { key: "item", label: "Item" },
        { key: "sku", label: "SKU" },
        { key: "quantity", label: "Qty" },
        { key: "reorderLevel", label: "Reorder" },
        { key: "warehouse", label: "Warehouse" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapSolarEquipment}
      buildCreatePayload={(form) => ({
        title: form.item,
        status: form.status,
        data: {
          sku: form.sku,
          quantity: Number(form.quantity || 0),
          reorderLevel: Number(form.reorderLevel || 0),
          warehouse: form.warehouse,
        },
      })}
      summarize={(rows) => {
        const quantity = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
        const lowStock = rows.filter((row) => Number(row.quantity || 0) <= Number(row.reorderLevel || 0)).length;
        const allocated = rows.filter((row) => String(row.status) === "allocated").length;
        return [
          { label: "Items", value: rows.length, color: "#fbbf24" },
          { label: "Units on Hand", value: quantity.toLocaleString(), color: "#60a5fa" },
          { label: "Allocated", value: allocated, color: "#34d399" },
          { label: "Low Stock", value: lowStock, color: "#f87171" },
        ];
      }}
    />
  );
}
