"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapRentalMaintenance, rentalsAccent } from "../_shared";

const statusOptions = ["scheduled", "in_progress", "done"];

export default function RentalsMaintenancePage() {
  return (
    <BusinessRecordWorkspace
      title="Maintenance"
      subtitle="Schedule and track maintenance for rental equipment."
      accent={rentalsAccent}
      category="rental_maintenance"
      emptyState="No maintenance jobs yet. Add the first service task."
      fields={[
        { key: "job", label: "Job", placeholder: "Quarterly engine service", required: true },
        { key: "asset", label: "Asset", placeholder: "Generator set A-12", required: true },
        { key: "technician", label: "Technician", placeholder: "Usman", required: true },
        { key: "cost", label: "Cost", type: "number", placeholder: "8000", required: true },
        { key: "dueDate", label: "Due Date", type: "date", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "scheduled" }}
      columns={[
        { key: "job", label: "Job" },
        { key: "asset", label: "Asset" },
        { key: "technician", label: "Technician" },
        { key: "dueDate", label: "Due" },
        { key: "cost", label: "Cost" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapRentalMaintenance}
      buildCreatePayload={(form) => ({
        title: form.job,
        status: form.status,
        amount: Number(form.cost || 0),
        date: form.dueDate,
        data: {
          asset: form.asset,
          technician: form.technician,
        },
      })}
      summarize={(rows) => [
        { label: "Maintenance", value: rows.length, color: rentalsAccent },
        { label: "Scheduled", value: rows.filter((row) => String(row.status) === "scheduled").length, color: "#60a5fa" },
        { label: "In Progress", value: rows.filter((row) => String(row.status) === "in_progress").length, color: "#fbbf24" },
        { label: "Done", value: rows.filter((row) => String(row.status) === "done").length, color: "#34d399" },
      ]}
    />
  );
}
