"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { maintenanceAccent, mapMaintenancePart } from "../_shared";

const statusOptions = ["available", "low_stock", "reserved", "issued"];

export default function MaintenancePartsPage() {
  return (
    <BusinessRecordWorkspace
      title="Parts and Stock"
      subtitle="Manage spare parts, reorder thresholds, and field issue tracking."
      accent={maintenanceAccent}
      category="maintenance_part"
      emptyState="No maintenance stock yet. Add parts to track field consumption and reorders."
      fields={[
        { key: "part", label: "Part Name", required: true, placeholder: "Compressor relay" },
        { key: "job", label: "Linked Job", placeholder: "JOB-2031" },
        { key: "supplier", label: "Supplier", placeholder: "Metro Industrial" },
        { key: "quantity", label: "Quantity", type: "number", placeholder: "14" },
        { key: "reorderLevel", label: "Reorder Level", type: "number", placeholder: "5" },
        { key: "cost", label: "Unit Cost", type: "number", placeholder: "3200" },
        { key: "status", label: "Status", type: "select", options: statusOptions },
      ]}
      defaultValues={{ status: "available" }}
      columns={[
        { key: "part", label: "Part" },
        { key: "job", label: "Job" },
        { key: "supplier", label: "Supplier" },
        { key: "quantity", label: "Qty" },
        { key: "reorderLevel", label: "Reorder" },
        { key: "cost", label: "Cost", render: (row) => `Rs. ${Number(row.cost || 0).toLocaleString()}` },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapMaintenancePart}
      buildCreatePayload={(form) => ({
        title: form.part,
        status: form.status || "available",
        amount: Number(form.cost || 0),
        data: {
          job: form.job,
          supplier: form.supplier,
          quantity: Number(form.quantity || 0),
          reorderLevel: Number(form.reorderLevel || 0),
        },
      })}
      summarize={(rows) => [
        { label: "Parts", value: rows.length, color: "#34d399" },
        { label: "Low Stock", value: rows.filter((row) => row.status === "low_stock" || Number(row.quantity || 0) <= Number(row.reorderLevel || 0)).length, color: "#f59e0b" },
        { label: "Reserved", value: rows.filter((row) => row.status === "reserved").length, color: "#60a5fa" },
        { label: "Stock Value", value: `Rs. ${rows.reduce((sum, row) => sum + Number(row.cost || 0) * Number(row.quantity || 0), 0).toLocaleString()}`, color: "#22c55e" },
      ]}
    />
  );
}
