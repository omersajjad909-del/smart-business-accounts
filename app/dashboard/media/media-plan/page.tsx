"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapMediaPlan, mediaAccent } from "../_shared";

const statusOptions = ["draft", "approved", "live"];

export default function MediaPlanPage() {
  return (
    <BusinessRecordWorkspace
      title="Media Planning"
      subtitle="Plan placements, start dates, and expected spend before campaign launch."
      accent={mediaAccent}
      category="media_plan"
      emptyState="No media plans yet. Build the first placement plan."
      fields={[
        { key: "plan", label: "Plan", placeholder: "Q2 launch media plan", required: true },
        { key: "campaign", label: "Campaign", placeholder: "Summer launch burst", required: true },
        { key: "channel", label: "Channel", placeholder: "Meta / TV / Print / Radio", required: true },
        { key: "spend", label: "Planned Spend", type: "number", placeholder: "220000", required: true },
        { key: "startDate", label: "Start Date", type: "date", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "draft" }}
      columns={[
        { key: "plan", label: "Plan" },
        { key: "campaign", label: "Campaign" },
        { key: "channel", label: "Channel" },
        { key: "startDate", label: "Start" },
        { key: "spend", label: "Spend" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapMediaPlan}
      buildCreatePayload={(form) => ({
        title: form.plan,
        status: form.status,
        amount: Number(form.spend || 0),
        date: form.startDate,
        data: {
          campaign: form.campaign,
          channel: form.channel,
        },
      })}
      summarize={(rows) => {
        const spend = rows.reduce((sum, row) => sum + Number(row.spend || 0), 0);
        return [
          { label: "Plans", value: rows.length, color: "#a78bfa" },
          { label: "Approved", value: rows.filter((row) => String(row.status) === "approved").length, color: "#60a5fa" },
          { label: "Live", value: rows.filter((row) => String(row.status) === "live").length, color: "#34d399" },
          { label: "Planned Spend", value: spend.toLocaleString(), color: "#fbbf24" },
        ];
      }}
    />
  );
}
