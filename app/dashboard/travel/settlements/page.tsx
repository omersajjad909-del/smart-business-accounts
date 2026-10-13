"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapTravelSettlement, travelAccent } from "../_shared";

const statusOptions = ["pending", "processing", "settled", "disputed"];

export default function TravelSettlementsPage() {
  return (
    <BusinessRecordWorkspace
      title="Supplier Settlements"
      subtitle="Track airline, embassy, and vendor payables created from tickets and visa files."
      accent={travelAccent}
      category="travel_settlement"
      emptyState="No supplier settlements yet. Create one from a ticket or visa case."
      /* A settlement is raised from the file it belongs to: that is the path
         that posts the supplier's payable to the ledger. A record typed in here
         is only a note — it counts in Exposure but the airline's account never
         sees it — so the form stays out of the way until asked for. */
      headerAction={{ label: "🎫 Raise from a ticket", href: "/dashboard/travel/tickets" }}
      fields={[
        { key: "settlementRef", label: "Settlement Ref", placeholder: "SET-TRV-24018", required: true },
        { key: "supplierName", label: "Supplier", placeholder: "Qatar Airways BSP", required: true },
        { key: "customerName", label: "Customer", placeholder: "Ali Raza" },
        { key: "sourceTitle", label: "Source File", placeholder: "TRV-24018" },
        { key: "invoiceNo", label: "Invoice No", placeholder: "SI-102" },
        { key: "dueDate", label: "Due Date", type: "date", required: true },
        { key: "amount", label: "Payable Amount", type: "number", placeholder: "172000", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "pending" }}
      columns={[
        { key: "settlementRef", label: "Settlement" },
        { key: "supplierName", label: "Supplier" },
        { key: "customerName", label: "Customer" },
        { key: "sourceTitle", label: "Source File" },
        { key: "invoiceNo", label: "Invoice" },
        { key: "dueDate", label: "Due Date" },
        { key: "amount", label: "Payable" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapTravelSettlement}
      actions={[
        {
          /* Opens a payment voucher already filled in for this supplier. The
             voucher, not this page, marks the settlement paid — so the status
             can never say settled for money that did not leave. */
          label: (row) => {
            const left = Number(row.amount || 0) - Number(row.paidAmount || 0);
            return `Pay ${left.toLocaleString()}`;
          },
          tone: "success",
          hidden: (row) => String(row.status) === "settled" || !row.supplierId,
          onClick: (row) => {
            const left = Number(row.amount || 0) - Number(row.paidAmount || 0);
            const q = new URLSearchParams({
              travelSettlement: String(row.id),
              supplierId: String(row.supplierId),
              supplierName: String(row.supplierName || ""),
              amount: String(left),
              ref: String(row.settlementRef || ""),
            });
            window.location.href = `/dashboard/cpv?${q.toString()}`;
          },
        },
      ]}
      buildCreatePayload={(form) => ({
        title: form.settlementRef,
        status: form.status,
        amount: Number(form.amount || 0),
        date: form.dueDate,
        data: {
          supplierName: form.supplierName,
          customerName: form.customerName,
          sourceTitle: form.sourceTitle,
          invoiceNo: form.invoiceNo,
        },
      })}
      summarize={(rows) => {
        // What is still owed, not what was ever owed: a settled bill is no exposure.
        const totalPayable = rows
          .filter((row) => String(row.status) !== "settled")
          .reduce((sum, row) => sum + Number(row.amount || 0) - Number(row.paidAmount || 0), 0);
        return [
          { label: "Settlements", value: rows.length, color: travelAccent },
          { label: "Pending", value: rows.filter((row) => String(row.status) === "pending").length, color: "var(--tx-fbbf24, #fbbf24)" },
          { label: "Settled", value: rows.filter((row) => String(row.status) === "settled").length, color: "var(--tx-34d399, #34d399)" },
          { label: "Exposure", value: totalPayable.toLocaleString(), color: "var(--tx-60a5fa, #60a5fa)" },
        ];
      }}
    />
  );
}
