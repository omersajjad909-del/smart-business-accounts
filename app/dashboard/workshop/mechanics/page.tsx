"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapWorkshopMechanic, workshopAccent } from "../_shared";

const statusOptions = ["active", "busy", "off_shift"];

export default function WorkshopMechanicsPage() {
  return (
    <BusinessRecordWorkspace
      title="Mechanics"
      subtitle="Manage bay assignments, specialties, and workshop staffing readiness."
      accent={workshopAccent}
      category="workshop_mechanic"
      emptyState="No mechanics yet. Add the first mechanic profile."
      fields={[
        { key: "mechanic", label: "Mechanic", placeholder: "Sajid Khan", required: true },
        { key: "specialty", label: "Specialty", placeholder: "Engine / Electrical / AC", required: true },
        { key: "phone", label: "Phone", placeholder: "+92 300 1112233", required: true },
        { key: "bay", label: "Bay", placeholder: "Bay 3", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "active" }}
      columns={[
        { key: "mechanic", label: "Mechanic" },
        { key: "specialty", label: "Specialty" },
        { key: "phone", label: "Phone" },
        { key: "bay", label: "Bay" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapWorkshopMechanic}
      buildCreatePayload={(form) => ({
        title: form.mechanic,
        status: form.status,
        data: {
          specialty: form.specialty,
          phone: form.phone,
          bay: form.bay,
        },
      })}
      summarize={(rows) => [
        { label: "Mechanics", value: rows.length, color: workshopAccent },
        { label: "Active", value: rows.filter((row) => String(row.status) === "active").length, color: "#34d399" },
        { label: "Busy", value: rows.filter((row) => String(row.status) === "busy").length, color: "#60a5fa" },
        { label: "Off Shift", value: rows.filter((row) => String(row.status) === "off_shift").length, color: "#94a3b8" },
      ]}
    />
  );
}
