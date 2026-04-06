"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapMediaCampaign, mediaAccent } from "../_shared";

const statusOptions = ["planning", "active", "completed"];

export default function MediaCampaignsPage() {
  return (
    <BusinessRecordWorkspace
      title="Campaigns"
      subtitle="Track campaign delivery, channel mix, and budget visibility across client work."
      accent={mediaAccent}
      category="media_campaign"
      emptyState="No campaigns yet. Create the first campaign brief."
      fields={[
        { key: "campaign", label: "Campaign", placeholder: "Summer launch burst", required: true },
        { key: "client", label: "Client", placeholder: "Northwind Beverages", required: true },
        { key: "channel", label: "Channel", placeholder: "Digital / TV / Outdoor", required: true },
        { key: "budget", label: "Budget", type: "number", placeholder: "350000", required: true },
        { key: "dueDate", label: "Due Date", type: "date", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "planning" }}
      columns={[
        { key: "campaign", label: "Campaign" },
        { key: "client", label: "Client" },
        { key: "channel", label: "Channel" },
        { key: "dueDate", label: "Due Date" },
        { key: "budget", label: "Budget" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapMediaCampaign}
      buildCreatePayload={(form) => ({
        title: form.campaign,
        status: form.status,
        amount: Number(form.budget || 0),
        date: form.dueDate,
        data: {
          client: form.client,
          channel: form.channel,
        },
      })}
      summarize={(rows) => {
        const budget = rows.reduce((sum, row) => sum + Number(row.budget || 0), 0);
        return [
          { label: "Campaigns", value: rows.length, color: "#a78bfa" },
          { label: "Active", value: rows.filter((row) => String(row.status) === "active").length, color: "#60a5fa" },
          { label: "Completed", value: rows.filter((row) => String(row.status) === "completed").length, color: "#34d399" },
          { label: "Budget", value: budget.toLocaleString(), color: "#fbbf24" },
        ];
      }}
    />
  );
}
