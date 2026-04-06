"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapWorkshopJob, workshopAccent } from "../_shared";

const statusOptions = ["open", "in_progress", "ready"];

export default function WorkshopJobsPage() {
  return (
    <BusinessRecordWorkspace
      title="Job Cards"
      subtitle="Track service intake, vehicle diagnosis, and promised delivery dates."
      accent={workshopAccent}
      category="workshop_job"
      emptyState="No workshop jobs yet. Create the first job card."
      fields={[
        { key: "job", label: "Job Card", placeholder: "JOB-24041", required: true },
        { key: "customer", label: "Customer", placeholder: "Ali Motors", required: true },
        { key: "vehicle", label: "Vehicle", placeholder: "Civic 2022 / LEA-987", required: true },
        { key: "promisedDate", label: "Promised Date", type: "date", required: true },
        { key: "amount", label: "Estimated Value", type: "number", placeholder: "35000", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "open" }}
      columns={[
        { key: "job", label: "Job" },
        { key: "customer", label: "Customer" },
        { key: "vehicle", label: "Vehicle" },
        { key: "promisedDate", label: "Promised" },
        { key: "amount", label: "Value" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapWorkshopJob}
      buildCreatePayload={(form) => ({
        title: form.job,
        status: form.status,
        amount: Number(form.amount || 0),
        date: form.promisedDate,
        data: {
          customer: form.customer,
          vehicle: form.vehicle,
        },
      })}
      summarize={(rows) => [
        { label: "Jobs", value: rows.length, color: workshopAccent },
        { label: "Open", value: rows.filter((row) => String(row.status) === "open").length, color: "#fbbf24" },
        { label: "In Progress", value: rows.filter((row) => String(row.status) === "in_progress").length, color: "#60a5fa" },
        { label: "Ready", value: rows.filter((row) => String(row.status) === "ready").length, color: "#34d399" },
      ]}
    />
  );
}
