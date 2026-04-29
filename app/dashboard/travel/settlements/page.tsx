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
        const totalPayable = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        return [
          { label: "Settlements", value: rows.length, color: travelAccent },
          { label: "Pending", value: rows.filter((row) => String(row.status) === "pending").length, color: "#fbbf24" },
          { label: "Settled", value: rows.filter((row) => String(row.status) === "settled").length, color: "#34d399" },
          { label: "Exposure", value: totalPayable.toLocaleString(), color: "#60a5fa" },
        ];
      }}
    />
  );
}
