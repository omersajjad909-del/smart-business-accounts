"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapUtilityMeter, utilityAccent } from "../_shared";

const statusOptions = ["captured", "verified", "estimated"];

export default function UtilityMetersPage() {
  return (
    <BusinessRecordWorkspace
      title="Meter Readings"
      subtitle="Capture usage, verify field input, and keep billing inputs ready for the next cycle."
      accent={utilityAccent}
      category="utility_meter"
      emptyState="No meter readings yet. Record the first reading cycle."
      fields={[
        { key: "meter", label: "Meter No", placeholder: "MTR-190084", required: true },
        { key: "account", label: "Account No", placeholder: "UT-000124", required: true },
        { key: "readingDate", label: "Reading Date", type: "date", required: true },
        { key: "units", label: "Units", type: "number", placeholder: "845", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "captured" }}
      columns={[
        { key: "meter", label: "Meter" },
        { key: "account", label: "Account" },
        { key: "readingDate", label: "Reading Date" },
        { key: "units", label: "Units" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapUtilityMeter}
      buildCreatePayload={(form) => ({
        title: form.meter,
        status: form.status,
        date: form.readingDate,
        data: {
          account: form.account,
          units: Number(form.units || 0),
        },
      })}
      summarize={(rows) => {
        const units = rows.reduce((sum, row) => sum + Number(row.units || 0), 0);
        return [
          { label: "Readings", value: rows.length, color: "#38bdf8" },
          { label: "Verified", value: rows.filter((row) => String(row.status) === "verified").length, color: "#34d399" },
          { label: "Estimated", value: rows.filter((row) => String(row.status) === "estimated").length, color: "#fbbf24" },
          { label: "Units Logged", value: units.toLocaleString(), color: "#a78bfa" },
        ];
      }}
    />
  );
}
