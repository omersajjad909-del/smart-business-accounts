"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapUtilityBilling, utilityAccent } from "../_shared";

const statusOptions = ["open", "paid", "overdue"];

export default function UtilityBillingPage() {
  return (
    <BusinessRecordWorkspace
      title="Utility Billing"
      subtitle="Control billing cycles, dues, and recovery status across customer accounts."
      accent={utilityAccent}
      category="utility_billing"
      emptyState="No utility bills yet. Generate the first billing record."
      fields={[
        { key: "invoice", label: "Invoice", placeholder: "UB-2026-0008", required: true },
        { key: "account", label: "Account No", placeholder: "UT-000124", required: true },
        { key: "billingMonth", label: "Billing Month", placeholder: "2026-04", required: true },
        { key: "amount", label: "Amount", type: "number", placeholder: "12500", required: true },
        { key: "dueDate", label: "Due Date", type: "date", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "open" }}
      columns={[
        { key: "invoice", label: "Invoice" },
        { key: "account", label: "Account" },
        { key: "billingMonth", label: "Billing Month" },
        { key: "dueDate", label: "Due Date" },
        { key: "amount", label: "Amount" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapUtilityBilling}
      buildCreatePayload={(form) => ({
        title: form.invoice,
        status: form.status,
        amount: Number(form.amount || 0),
        date: form.dueDate,
        data: {
          account: form.account,
          billingMonth: form.billingMonth,
        },
      })}
      summarize={(rows) => {
        const amount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        return [
          { label: "Bills", value: rows.length, color: "#38bdf8" },
          { label: "Open", value: rows.filter((row) => String(row.status) === "open").length, color: "#fbbf24" },
          { label: "Paid", value: rows.filter((row) => String(row.status) === "paid").length, color: "#34d399" },
          { label: "Billed Value", value: amount.toLocaleString(), color: "#a78bfa" },
        ];
      }}
    />
  );
}
