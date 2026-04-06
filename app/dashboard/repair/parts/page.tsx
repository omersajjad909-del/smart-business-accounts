"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapRepairPart, repairAccent } from "../_shared";

const statusOptions = ["available", "issued", "ordered"];

export default function RepairPartsPage() {
  return (
    <BusinessRecordWorkspace
      title="Spare Parts"
      subtitle="Manage replacement parts, supplier visibility, and repair cost allocation."
      accent={repairAccent}
      category="repair_part"
      emptyState="No spare parts yet. Add the first part line."
      fields={[
        { key: "part", label: "Part", placeholder: "LCD panel", required: true },
        { key: "job", label: "Job Card", placeholder: "RP-24018", required: true },
        { key: "quantity", label: "Quantity", type: "number", placeholder: "1", required: true },
        { key: "supplier", label: "Supplier", placeholder: "Tech Parts Hub", required: true },
        { key: "cost", label: "Cost", type: "number", placeholder: "6500", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "available" }}
      columns={[
        { key: "part", label: "Part" },
        { key: "job", label: "Job" },
        { key: "quantity", label: "Qty" },
        { key: "supplier", label: "Supplier" },
        { key: "cost", label: "Cost" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapRepairPart}
      buildCreatePayload={(form) => ({
        title: form.part,
        status: form.status,
        amount: Number(form.cost || 0),
        data: {
          job: form.job,
          quantity: Number(form.quantity || 0),
          supplier: form.supplier,
        },
      })}
      summarize={(rows) => {
        const cost = rows.reduce((sum, row) => sum + Number(row.cost || 0), 0);
        return [
          { label: "Part Lines", value: rows.length, color: repairAccent },
          { label: "Available", value: rows.filter((row) => String(row.status) === "available").length, color: "#34d399" },
          { label: "Issued", value: rows.filter((row) => String(row.status) === "issued").length, color: "#60a5fa" },
          { label: "Parts Cost", value: cost.toLocaleString(), color: "#fbbf24" },
        ];
      }}
    />
  );
}
