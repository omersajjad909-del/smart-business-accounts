"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { eventsAccent, mapEventBudget } from "../_shared";

const statusOptions = ["planned", "approved", "spent"];

export default function EventBudgetPage() {
  return (
    <BusinessRecordWorkspace
      title="Event Budget"
      subtitle="Control planned spend, owners, and budget approvals for each live event."
      accent={eventsAccent}
      category="event_budget"
      emptyState="No event budgets yet. Add a budget line for the next event."
      fields={[
        { key: "event", label: "Event", placeholder: "Corporate launch night", required: true },
        { key: "category", label: "Category", placeholder: "Decor / Venue / Sound", required: true },
        { key: "owner", label: "Owner", placeholder: "Areeba Khan", required: true },
        { key: "dueDate", label: "Due Date", type: "date", required: true },
        { key: "amount", label: "Budget Amount", type: "number", placeholder: "125000", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "planned" }}
      columns={[
        { key: "event", label: "Event" },
        { key: "category", label: "Category" },
        { key: "owner", label: "Owner" },
        { key: "dueDate", label: "Due Date" },
        { key: "amount", label: "Amount" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapEventBudget}
      buildCreatePayload={(form) => ({
        title: form.event,
        status: form.status,
        amount: Number(form.amount || 0),
        date: form.dueDate,
        data: {
          category: form.category,
          owner: form.owner,
        },
      })}
      summarize={(rows) => {
        const totalBudget = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        return [
          { label: "Budget Lines", value: rows.length, color: "#fb7185" },
          { label: "Approved", value: rows.filter((row) => String(row.status) === "approved").length, color: "#34d399" },
          { label: "Spent", value: rows.filter((row) => String(row.status) === "spent").length, color: "#60a5fa" },
          { label: "Planned Value", value: totalBudget.toLocaleString(), color: "#fbbf24" },
        ];
      }}
    />
  );
}
