"use client";

import { alertToast } from "@/lib/toast-feedback";
import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapGroupTour, travelAccent } from "../_shared";

const statusOptions = ["enquiry", "confirmed", "departed", "completed", "cancelled"];

export default function GroupToursPage() {
  return (
    <BusinessRecordWorkspace
      title="Group Tours & Packages"
      subtitle="Manage group tour bookings, passenger counts, departure schedules, and supplier payables."
      accent="#f97316"
      category="travel_tour"
      emptyState="No group tours yet. Create the first tour booking."
      fields={[
        { key: "tourRef", label: "Tour Ref", placeholder: "TOUR-24001", required: true },
        { key: "tourName", label: "Tour Name / Package", placeholder: "Umrah Package 2024", required: true },
        { key: "destination", label: "Destination", placeholder: "Makkah / Bali / Europe", required: true },
        { key: "departureDate", label: "Departure Date", type: "date", required: true },
        { key: "returnDate", label: "Return Date", type: "date" },
        { key: "pax", label: "No. of Passengers", type: "number", placeholder: "20", required: true },
        { key: "leader", label: "Group Leader", placeholder: "Haji Noman", required: true },
        { key: "supplier", label: "Tour Operator / Supplier", placeholder: "Al-Noor Travel", required: true },
        { key: "amount", label: "Sale Price (Total)", type: "number", placeholder: "500000", required: true },
        { key: "cost", label: "Supplier Cost (Total)", type: "number", placeholder: "430000", required: true },
        { key: "paymentDue", label: "Payment Due", type: "date" },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "enquiry", pax: "1" }}
      columns={[
        { key: "tourRef", label: "Tour Ref" },
        { key: "tourName", label: "Package" },
        { key: "destination", label: "Destination" },
        { key: "departureDate", label: "Departure" },
        { key: "returnDate", label: "Return" },
        { key: "pax", label: "Pax" },
        { key: "leader", label: "Leader" },
        { key: "supplier", label: "Supplier" },
        { key: "amount", label: "Sale" },
        { key: "invoiceNo", label: "Invoice" },
        { key: "settlementRef", label: "Settlement" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapGroupTour}
      actions={[
        {
          label: (row) => (String(row.invoiceNo || "") ? `Invoice ${String(row.invoiceNo)}` : "Create Invoice"),
          tone: "success",
          onClick: async (row, helpers) => {
            if (row.invoiceId) {
              window.location.href = `/dashboard/sales-invoice?id=${encodeURIComponent(String(row.invoiceId))}`;
              return;
            }
            const res = await fetch("/api/travel/create-invoice", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ recordId: row.id }),
            });
            const result = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(result.error || "Failed to create invoice");
            await helpers.refetch();
            alertToast(`Invoice ${result.invoiceNo} created for tour ${String(row.tourRef || "")}.`, "success", "Invoice Created");
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
            const res = await fetch("/api/travel/create-settlement", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ recordId: row.id }),
            });
            const result = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(result.error || "Failed to create settlement");
            await helpers.refetch();
            alertToast(`Settlement ${result.settlementRef} created for ${String(row.supplier || "supplier")}.`, "success", "Settlement Created");
          },
        },
      ]}
      buildCreatePayload={(form) => ({
        title: form.tourRef,
        status: form.status,
        amount: Number(form.amount || 0),
        date: form.departureDate,
        data: {
          tourName: form.tourName,
          destination: form.destination,
          returnDate: form.returnDate || null,
          pax: Number(form.pax || 1),
          leader: form.leader,
          supplier: form.supplier,
          cost: Number(form.cost || 0),
          paymentDue: form.paymentDue || null,
        },
      })}
      summarize={(rows) => {
        const totalSale = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
        const totalCost = rows.reduce((s, r) => s + Number(r.cost || 0), 0);
        const totalPax = rows.reduce((s, r) => s + Number(r.pax || 0), 0);
        return [
          { label: "Tours", value: rows.length, color: "#f97316" },
          { label: "Total Passengers", value: totalPax, color: travelAccent },
          { label: "Confirmed", value: rows.filter(r => String(r.status) === "confirmed").length, color: "#34d399" },
          { label: "Invoice Pending", value: rows.filter(r => !String(r.invoiceNo || "")).length, color: "#fbbf24" },
          { label: "Margin", value: (totalSale - totalCost).toLocaleString(), color: "#60a5fa" },
        ];
      }}
    />
  );
}
