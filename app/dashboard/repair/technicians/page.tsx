"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapRepairTechnician, repairAccent } from "../_shared";

const statusOptions = ["active", "busy", "off"];

export default function RepairTechniciansPage() {
  return (
    <BusinessRecordWorkspace
      title="Technicians"
      subtitle="Track repair technicians, specialties, and workload balance."
      accent={repairAccent}
      category="repair_technician"
      emptyState="No technicians yet. Add the first repair technician."
      fields={[
        { key: "technician", label: "Technician", placeholder: "Rizwan Ali", required: true },
        { key: "specialty", label: "Specialty", placeholder: "Mobile / Laptop / Board repair", required: true },
        { key: "phone", label: "Phone", placeholder: "+92 300 4455667", required: true },
        { key: "workload", label: "Workload", placeholder: "5 open jobs", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "active" }}
      columns={[
        { key: "technician", label: "Technician" },
        { key: "specialty", label: "Specialty" },
        { key: "phone", label: "Phone" },
        { key: "workload", label: "Workload" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapRepairTechnician}
      buildCreatePayload={(form) => ({
        title: form.technician,
        status: form.status,
        data: {
          specialty: form.specialty,
          phone: form.phone,
          workload: form.workload,
        },
      })}
      summarize={(rows) => [
        { label: "Technicians", value: rows.length, color: repairAccent },
        { label: "Active", value: rows.filter((row) => String(row.status) === "active").length, color: "#34d399" },
        { label: "Busy", value: rows.filter((row) => String(row.status) === "busy").length, color: "#60a5fa" },
        { label: "Off", value: rows.filter((row) => String(row.status) === "off").length, color: "#94a3b8" },
      ]}
    />
  );
}
