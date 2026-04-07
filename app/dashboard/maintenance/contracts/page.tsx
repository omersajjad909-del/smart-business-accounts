"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { maintenanceAccent, mapMaintenanceContract } from "../_shared";

const statusOptions = ["active", "renewal_due", "paused", "expired"];

export default function MaintenanceContractsPage() {
  return (
    <BusinessRecordWorkspace
      title="AMC Contracts"
      subtitle="Track client maintenance agreements, visit obligations, and renewal dates."
      accent={maintenanceAccent}
      category="maintenance_contract"
      emptyState="No maintenance contracts yet. Add the first AMC agreement to start tracking renewals."
      fields={[
        { key: "contract", label: "Contract Name", required: true, placeholder: "Corporate AMC - Tower A" },
        { key: "client", label: "Client", required: true, placeholder: "Blue Heights" },
        { key: "asset", label: "Covered Asset", placeholder: "HVAC, lifts, generators" },
        { key: "visitsPerYear", label: "Visits / Year", type: "number", placeholder: "12" },
        { key: "value", label: "Annual Value", type: "number", placeholder: "250000" },
        { key: "renewalDate", label: "Renewal Date", type: "date" },
        { key: "status", label: "Status", type: "select", options: statusOptions },
      ]}
      defaultValues={{ status: "active" }}
      columns={[
        { key: "contract", label: "Contract" },
        { key: "client", label: "Client" },
        { key: "asset", label: "Asset" },
        { key: "visitsPerYear", label: "Visits / Year" },
        { key: "value", label: "Annual Value", render: (row) => `Rs. ${Number(row.value || 0).toLocaleString()}` },
        { key: "renewalDate", label: "Renewal" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapMaintenanceContract}
      buildCreatePayload={(form) => ({
        title: form.contract,
        status: form.status || "active",
        amount: Number(form.value || 0),
        date: form.renewalDate || undefined,
        data: {
          client: form.client,
          asset: form.asset,
          visitsPerYear: Number(form.visitsPerYear || 0),
        },
      })}
      summarize={(rows) => [
        { label: "Contracts", value: rows.length, color: "#34d399" },
        { label: "Active", value: rows.filter((row) => row.status === "active").length, color: "#22c55e" },
        { label: "Renewal Due", value: rows.filter((row) => row.status === "renewal_due").length, color: "#f59e0b" },
        { label: "Annual Value", value: `Rs. ${rows.reduce((sum, row) => sum + Number(row.value || 0), 0).toLocaleString()}`, color: "#60a5fa" },
      ]}
    />
  );
}
