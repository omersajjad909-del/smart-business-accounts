"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapRepairJob, repairAccent } from "../_shared";

const statusOptions = ["diagnosis", "repairing", "ready"];

export default function RepairJobsPage() {
  return (
    <BusinessRecordWorkspace
      title="Repair Job Cards"
      subtitle="Manage device intake, diagnosis, and promised completion for repair jobs."
      accent={repairAccent}
      category="repair_job"
      emptyState="No repair jobs yet. Create the first repair ticket."
      fields={[
        { key: "job", label: "Job Card", placeholder: "RP-24018", required: true },
        { key: "customer", label: "Customer", placeholder: "Adeel Tech", required: true },
        { key: "device", label: "Device", placeholder: "iPhone 14 / Dell Latitude", required: true },
        { key: "dueDate", label: "Due Date", type: "date", required: true },
        { key: "amount", label: "Estimated Value", type: "number", placeholder: "12000", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "diagnosis" }}
      columns={[
        { key: "job", label: "Job" },
        { key: "customer", label: "Customer" },
        { key: "device", label: "Device" },
        { key: "dueDate", label: "Due" },
        { key: "amount", label: "Value" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapRepairJob}
      buildCreatePayload={(form) => ({
        title: form.job,
        status: form.status,
        amount: Number(form.amount || 0),
        date: form.dueDate,
        data: {
          customer: form.customer,
          device: form.device,
        },
      })}
      summarize={(rows) => [
        { label: "Jobs", value: rows.length, color: repairAccent },
        { label: "Diagnosis", value: rows.filter((row) => String(row.status) === "diagnosis").length, color: "#fbbf24" },
        { label: "Repairing", value: rows.filter((row) => String(row.status) === "repairing").length, color: "#60a5fa" },
        { label: "Ready", value: rows.filter((row) => String(row.status) === "ready").length, color: "#34d399" },
      ]}
    />
  );
}
