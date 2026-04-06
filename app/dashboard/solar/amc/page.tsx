"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapSolarAmc, solarAccent } from "../_shared";

const statusOptions = ["scheduled", "in_progress", "completed"];

export default function SolarAmcPage() {
  return (
    <BusinessRecordWorkspace
      title="AMC Schedule"
      subtitle="Keep maintenance contracts, technicians, and service visit dates on track."
      accent={solarAccent}
      category="solar_amc"
      emptyState="No AMC contracts yet. Create your first maintenance schedule."
      fields={[
        { key: "contract", label: "Contract", placeholder: "AMC-2026-014", required: true },
        { key: "customer", label: "Customer", placeholder: "Blue Harbor Mall", required: true },
        { key: "technician", label: "Technician", placeholder: "Ahsan Malik", required: true },
        { key: "nextVisit", label: "Next Visit", type: "date", required: true },
        { key: "value", label: "Contract Value", type: "number", placeholder: "250000", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "scheduled" }}
      columns={[
        { key: "contract", label: "Contract" },
        { key: "customer", label: "Customer" },
        { key: "technician", label: "Technician" },
        { key: "nextVisit", label: "Next Visit" },
        { key: "value", label: "Value" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapSolarAmc}
      buildCreatePayload={(form) => ({
        title: form.contract,
        status: form.status,
        amount: Number(form.value || 0),
        date: form.nextVisit,
        data: {
          customer: form.customer,
          technician: form.technician,
        },
      })}
      summarize={(rows) => {
        const contractValue = rows.reduce((sum, row) => sum + Number(row.value || 0), 0);
        const dueSoon = rows.filter((row) => String(row.status) === "scheduled").length;
        const completed = rows.filter((row) => String(row.status) === "completed").length;
        return [
          { label: "Contracts", value: rows.length, color: "#fbbf24" },
          { label: "Scheduled", value: dueSoon, color: "#60a5fa" },
          { label: "Completed", value: completed, color: "#34d399" },
          { label: "Contract Value", value: contractValue.toLocaleString(), color: "#f59e0b" },
        ];
      }}
    />
  );
}
