"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapRentalItem, rentalsAccent } from "../_shared";

const statusOptions = ["available", "reserved", "maintenance"];

export default function RentalsItemsPage() {
  return (
    <BusinessRecordWorkspace
      title="Rental Items"
      subtitle="Manage rentable assets, availability status, and warehouse readiness."
      accent={rentalsAccent}
      category="rental_item"
      emptyState="No rental items yet. Add the first rentable asset."
      fields={[
        { key: "item", label: "Item", placeholder: "Honda Civic / Sound System", required: true },
        { key: "sku", label: "SKU", placeholder: "RNT-00014", required: true },
        { key: "category", label: "Category", placeholder: "Vehicle / Event gear", required: true },
        { key: "quantity", label: "Quantity", type: "number", placeholder: "4", required: true },
        { key: "warehouse", label: "Warehouse", placeholder: "Main Yard", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "available" }}
      columns={[
        { key: "item", label: "Item" },
        { key: "sku", label: "SKU" },
        { key: "category", label: "Category" },
        { key: "quantity", label: "Qty" },
        { key: "warehouse", label: "Warehouse" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapRentalItem}
      buildCreatePayload={(form) => ({
        title: form.item,
        status: form.status,
        data: {
          sku: form.sku,
          category: form.category,
          quantity: Number(form.quantity || 0),
          warehouse: form.warehouse,
        },
      })}
      summarize={(rows) => [
        { label: "Items", value: rows.length, color: rentalsAccent },
        { label: "Available", value: rows.filter((row) => String(row.status) === "available").length, color: "#34d399" },
        { label: "Reserved", value: rows.filter((row) => String(row.status) === "reserved").length, color: "#fbbf24" },
        { label: "Maintenance", value: rows.filter((row) => String(row.status) === "maintenance").length, color: "#f97316" },
      ]}
    />
  );
}
