"use client";

import { alertToast } from "@/lib/toast-feedback";
import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapTravelTicket, travelAccent } from "../_shared";

const statusOptions = ["quoted", "booked", "issued", "cancelled"];

export default function TravelTicketsPage() {
  return (
    <BusinessRecordWorkspace
      title="Airline Tickets"
      subtitle="Track passenger bookings, PNR status, travel dates, and issued-ticket value."
      accent={travelAccent}
      category="travel_ticket"
      emptyState="No airline tickets yet. Create the first travel booking."
      fields={[
        { key: "booking", label: "Booking Ref", placeholder: "TRV-24018", required: true },
        { key: "passenger", label: "Passenger", placeholder: "Ali Raza", required: true },
        { key: "airline", label: "Airline", placeholder: "Qatar Airways", required: true },
        { key: "route", label: "Route", placeholder: "KHI -> DOH -> LHR", required: true },
        { key: "pnr", label: "PNR", placeholder: "A1B2C3", required: true },
        { key: "supplier", label: "Airline / Supplier", placeholder: "Qatar Airways BSP", required: true },
        { key: "travelDate", label: "Travel Date", type: "date", required: true },
        { key: "amount", label: "Ticket Value", type: "number", placeholder: "185000", required: true },
        { key: "cost", label: "Supplier Cost", type: "number", placeholder: "172000", required: true },
        { key: "paymentDue", label: "Settlement Due", type: "date" },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "quoted" }}
      columns={[
        { key: "booking", label: "Booking" },
        { key: "passenger", label: "Passenger" },
        { key: "airline", label: "Airline" },
        { key: "route", label: "Route" },
        { key: "pnr", label: "PNR" },
        { key: "supplier", label: "Supplier" },
        { key: "travelDate", label: "Travel Date" },
        { key: "amount", label: "Value" },
        { key: "invoiceNo", label: "Invoice" },
        { key: "settlementRef", label: "Settlement" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapTravelTicket}
      actions={[
        {
          label: (row) => (String(row.invoiceNo || "") ? `Invoice ${String(row.invoiceNo)}` : "Create Invoice"),
          tone: "success",
          onClick: async (row, helpers) => {
            if (row.invoiceId) {
              window.location.href = `/dashboard/sales-invoice?id=${encodeURIComponent(String(row.invoiceId))}`;
              return;
            }
            const response = await fetch("/api/travel/create-invoice", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ recordId: row.id }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "Failed to create invoice");
            await helpers.refetch();
            alertToast(`Sales invoice ${result.invoiceNo} created for ${String(row.passenger || "this ticket")}.`, "success", "Invoice Created");
          },
        },
        {
          label: (row) => (String(row.settlementRef || "") ? `Settlement ${String(row.settlementRef)}` : "Create Settlement"),
          tone: "neutral",
          onClick: async (row, helpers) => {
            if (row.settlementId) {
              window.location.href = "/dashboard/travel/settlements";
              return;
            }
            const response = await fetch("/api/travel/create-settlement", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ recordId: row.id }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "Failed to create settlement");
            await helpers.refetch();
            alertToast(`Settlement ${result.settlementRef} created for ${String(row.supplier || "supplier")}.`, "success", "Settlement Created");
          },
        },
      ]}
      buildCreatePayload={(form) => ({
        title: form.booking,
        status: form.status,
        amount: Number(form.amount || 0),
        date: form.travelDate,
        data: {
          passenger: form.passenger,
          airline: form.airline,
          route: form.route,
          pnr: form.pnr,
          supplier: form.supplier,
          cost: Number(form.cost || 0),
          paymentDue: form.paymentDue || null,
        },
      })}
      summarize={(rows) => {
        const totalValue = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const totalCost = rows.reduce((sum, row) => sum + Number(row.cost || 0), 0);
        return [
          { label: "Tickets", value: rows.length, color: travelAccent },
          { label: "Quoted", value: rows.filter((row) => String(row.status) === "quoted").length, color: "#fbbf24" },
          { label: "Issued", value: rows.filter((row) => String(row.status) === "issued").length, color: "#34d399" },
          { label: "Invoice Ready", value: rows.filter((row) => !String(row.invoiceNo || "")).length, color: "#f97316" },
          { label: "Margin", value: (totalValue - totalCost).toLocaleString(), color: "#60a5fa" },
        ];
      }}
    />
  );
}
