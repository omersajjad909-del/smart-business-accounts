"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapMediaClient, mediaAccent } from "../_shared";

const statusOptions = ["active", "paused", "at_risk"];

export default function MediaClientsPage() {
  return (
    <BusinessRecordWorkspace
      title="Agency Clients"
      subtitle="Keep retainers, account ownership, and commercial health visible across client accounts."
      accent={mediaAccent}
      category="media_client"
      emptyState="No agency clients yet. Add the first retained account."
      fields={[
        { key: "client", label: "Client", placeholder: "Orbit Foods", required: true },
        { key: "industry", label: "Industry", placeholder: "FMCG / Retail / Real estate", required: true },
        { key: "manager", label: "Account Manager", placeholder: "Hiba Khan", required: true },
        { key: "retainer", label: "Monthly Retainer", type: "number", placeholder: "150000", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "active" }}
      columns={[
        { key: "client", label: "Client" },
        { key: "industry", label: "Industry" },
        { key: "manager", label: "Manager" },
        { key: "retainer", label: "Retainer" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapMediaClient}
      buildCreatePayload={(form) => ({
        title: form.client,
        status: form.status,
        amount: Number(form.retainer || 0),
        data: {
          industry: form.industry,
          manager: form.manager,
        },
      })}
      summarize={(rows) => {
        const retainer = rows.reduce((sum, row) => sum + Number(row.retainer || 0), 0);
        return [
          { label: "Clients", value: rows.length, color: "#a78bfa" },
          { label: "Active", value: rows.filter((row) => String(row.status) === "active").length, color: "#34d399" },
          { label: "At Risk", value: rows.filter((row) => String(row.status) === "at_risk").length, color: "#f87171" },
          { label: "Retainers", value: retainer.toLocaleString(), color: "#fbbf24" },
        ];
      }}
    />
  );
}
