"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";

const accent = "#22c55e";
const statusOptions = ["calculated", "invoiced", "received"];

const mapRoyalty = (record: {
  id: string;
  title: string;
  status: string;
  amount?: number | null;
  date?: string | null;
  data: Record<string, unknown>;
}) => ({
  id: record.id,
  outlet: record.title,
  month: String(record.data?.month || ""),
  rate: Number(record.data?.rate || 0),
  dueDate: String(record.date || "").slice(0, 10),
  amount: Number(record.amount || 0),
  status: record.status || "calculated",
});

export default function FranchiseRoyaltyPage() {
  return (
    <BusinessRecordWorkspace
      title="Royalty"
      subtitle="Calculate, invoice, and collect franchise royalties across the network."
      accent={accent}
      category="franchise_royalty"
      emptyState="No royalty records yet. Add the first outlet royalty cycle."
      fields={[
        { key: "outlet", label: "Outlet", placeholder: "Downtown Branch", required: true },
        { key: "month", label: "Month", placeholder: "2026-04", required: true },
        { key: "rate", label: "Royalty Rate %", type: "number", placeholder: "6", required: true },
        { key: "amount", label: "Royalty Amount", type: "number", placeholder: "45000", required: true },
        { key: "dueDate", label: "Due Date", type: "date", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "calculated" }}
      columns={[
        { key: "outlet", label: "Outlet" },
        { key: "month", label: "Month" },
        { key: "rate", label: "Rate %" },
        { key: "dueDate", label: "Due Date" },
        { key: "amount", label: "Amount" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapRoyalty}
      buildCreatePayload={(form) => ({
        title: form.outlet,
        status: form.status,
        amount: Number(form.amount || 0),
        date: form.dueDate,
        data: {
          month: form.month,
          rate: Number(form.rate || 0),
        },
      })}
      summarize={(rows) => {
        const value = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        return [
          { label: "Cycles", value: rows.length, color: accent },
          { label: "Invoiced", value: rows.filter((row) => String(row.status) === "invoiced").length, color: "#60a5fa" },
          { label: "Received", value: rows.filter((row) => String(row.status) === "received").length, color: "#34d399" },
          { label: "Royalty Value", value: value.toLocaleString(), color: "#fbbf24" },
        ];
      }}
    />
  );
}
