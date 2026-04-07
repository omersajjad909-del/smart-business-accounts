"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { maintenanceAccent, mapMaintenanceSchedule } from "../_shared";

const statusOptions = ["scheduled", "due_today", "completed", "missed"];

export default function MaintenanceSchedulePage() {
  return (
    <BusinessRecordWorkspace
      title="Service Schedule"
      subtitle="Plan preventive visits, teams, and due service windows."
      accent={maintenanceAccent}
      category="maintenance_schedule"
      emptyState="No scheduled visits yet. Add planned maintenance visits to build the calendar."
      fields={[
        { key: "visit", label: "Visit Title", required: true, placeholder: "Quarterly HVAC inspection" },
        { key: "client", label: "Client", required: true, placeholder: "Blue Heights" },
        { key: "site", label: "Site", placeholder: "Tower A - Block C" },
        { key: "team", label: "Assigned Team", placeholder: "Field Team 1" },
        { key: "visitType", label: "Visit Type", type: "select", options: ["Preventive", "Corrective", "Emergency", "Inspection"] },
        { key: "scheduledDate", label: "Scheduled Date", type: "date" },
        { key: "status", label: "Status", type: "select", options: statusOptions },
      ]}
      defaultValues={{ status: "scheduled", visitType: "Preventive" }}
      columns={[
        { key: "visit", label: "Visit" },
        { key: "client", label: "Client" },
        { key: "site", label: "Site" },
        { key: "team", label: "Team" },
        { key: "visitType", label: "Type" },
        { key: "scheduledDate", label: "Scheduled" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapMaintenanceSchedule}
      buildCreatePayload={(form) => ({
        title: form.visit,
        status: form.status || "scheduled",
        date: form.scheduledDate || undefined,
        data: {
          client: form.client,
          site: form.site,
          team: form.team,
          visitType: form.visitType,
        },
      })}
      summarize={(rows) => [
        { label: "Visits", value: rows.length, color: "#34d399" },
        { label: "Due Today", value: rows.filter((row) => row.status === "due_today").length, color: "#f59e0b" },
        { label: "Completed", value: rows.filter((row) => row.status === "completed").length, color: "#22c55e" },
        { label: "Missed", value: rows.filter((row) => row.status === "missed").length, color: "#f87171" },
      ]}
    />
  );
}
