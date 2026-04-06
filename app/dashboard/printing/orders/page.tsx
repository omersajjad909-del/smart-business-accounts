"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapPrintOrder, printingAccent } from "../_shared";

const statusOptions = ["queued", "proofing", "printing", "completed"];

export default function PrintOrdersPage() {
  return (
    <BusinessRecordWorkspace
      title="Print Orders"
      subtitle="Manage print jobs, specs, deadlines, and commercial values in one place."
      accent={printingAccent}
      category="print_order"
      emptyState="No print orders yet. Add your first client job."
      fields={[
        { key: "order", label: "Order Name", placeholder: "Ramadan brochure batch", required: true },
        { key: "client", label: "Client", placeholder: "Orbit Marketing", required: true },
        { key: "specs", label: "Specs", placeholder: "A4, matte, four color", required: true },
        { key: "quantity", label: "Quantity", type: "number", placeholder: "5000", required: true },
        { key: "amount", label: "Amount", type: "number", placeholder: "175000", required: true },
        { key: "dueDate", label: "Due Date", type: "date", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "queued" }}
      columns={[
        { key: "order", label: "Order" },
        { key: "client", label: "Client" },
        { key: "specs", label: "Specs" },
        { key: "quantity", label: "Qty" },
        { key: "dueDate", label: "Due Date" },
        { key: "amount", label: "Amount" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapPrintOrder}
      buildCreatePayload={(form) => ({
        title: form.order,
        status: form.status,
        amount: Number(form.amount || 0),
        date: form.dueDate,
        data: {
          client: form.client,
          specs: form.specs,
          quantity: Number(form.quantity || 0),
        },
      })}
      summarize={(rows) => {
        const value = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const active = rows.filter((row) => ["queued", "proofing", "printing"].includes(String(row.status))).length;
        const completed = rows.filter((row) => String(row.status) === "completed").length;
        return [
          { label: "Jobs", value: rows.length, color: "#60a5fa" },
          { label: "Active Queue", value: active, color: "#fbbf24" },
          { label: "Completed", value: completed, color: "#34d399" },
          { label: "Order Value", value: value.toLocaleString(), color: "#a78bfa" },
        ];
      }}
    />
  );
}
