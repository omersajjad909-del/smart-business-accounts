"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapWorkshopPart, workshopAccent } from "../_shared";

const statusOptions = ["issued", "ordered", "returned"];

export default function WorkshopPartsPage() {
  return (
    <BusinessRecordWorkspace
      title="Parts Used"
      subtitle="Track parts consumption, supplier linkage, and job-level parts cost."
      accent={workshopAccent}
      category="workshop_part"
      emptyState="No workshop part issues yet. Add the first issued part."
      fields={[
        { key: "part", label: "Part", placeholder: "Oil filter", required: true },
        { key: "job", label: "Job Card", placeholder: "JOB-24041", required: true },
        { key: "quantity", label: "Quantity", type: "number", placeholder: "2", required: true },
        { key: "supplier", label: "Supplier", placeholder: "Pak Parts Center", required: true },
        { key: "cost", label: "Cost", type: "number", placeholder: "4200", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "issued" }}
      columns={[
        { key: "part", label: "Part" },
        { key: "job", label: "Job" },
        { key: "quantity", label: "Qty" },
        { key: "supplier", label: "Supplier" },
        { key: "cost", label: "Cost" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapWorkshopPart}
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
          { label: "Parts Lines", value: rows.length, color: workshopAccent },
          { label: "Issued", value: rows.filter((row) => String(row.status) === "issued").length, color: "#34d399" },
          { label: "Ordered", value: rows.filter((row) => String(row.status) === "ordered").length, color: "#60a5fa" },
          { label: "Parts Cost", value: cost.toLocaleString(), color: "#fbbf24" },
        ];
      }}
    />
  );
}
