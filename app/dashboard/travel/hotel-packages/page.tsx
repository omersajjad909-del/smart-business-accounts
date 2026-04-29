"use client";

import { alertToast } from "@/lib/toast-feedback";
import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapHotelBooking, travelAccent } from "../_shared";

const statusOptions = ["quoted", "confirmed", "checked_in", "checked_out", "cancelled"];
const mealPlanOptions = ["room_only", "with_breakfast", "half_board", "full_board", "all_inclusive"];

export default function HotelPackagesPage() {
  return (
    <BusinessRecordWorkspace
      title="Hotel & Package Bookings"
      subtitle="Track hotel reservations, package tours, check-in/out dates, and supplier costs."
      accent="#a78bfa"
      category="travel_hotel"
      emptyState="No hotel bookings yet. Create the first reservation."
      fields={[
        { key: "bookingRef", label: "Booking Ref", placeholder: "HTL-24001", required: true },
        { key: "guestName", label: "Guest Name", placeholder: "Ahmed Khan", required: true },
        { key: "hotelName", label: "Hotel Name", placeholder: "Pearl Continental Lahore", required: true },
        { key: "destination", label: "Destination", placeholder: "Lahore / Dubai / Istanbul", required: true },
        { key: "checkIn", label: "Check-in Date", type: "date", required: true },
        { key: "checkOut", label: "Check-out Date", type: "date", required: true },
        { key: "rooms", label: "No. of Rooms", type: "number", placeholder: "1" },
        { key: "mealPlan", label: "Meal Plan", type: "select", options: mealPlanOptions },
        { key: "supplier", label: "Hotel / Supplier", placeholder: "Direct / Travel Bed", required: true },
        { key: "amount", label: "Sale Price", type: "number", placeholder: "85000", required: true },
        { key: "cost", label: "Supplier Cost", type: "number", placeholder: "72000", required: true },
        { key: "paymentDue", label: "Payment Due", type: "date" },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "quoted", rooms: "1" }}
      columns={[
        { key: "bookingRef", label: "Booking" },
        { key: "guestName", label: "Guest" },
        { key: "hotelName", label: "Hotel" },
        { key: "destination", label: "Destination" },
        { key: "checkIn", label: "Check-in" },
        { key: "checkOut", label: "Check-out" },
        { key: "rooms", label: "Rooms" },
        { key: "mealPlan", label: "Meal Plan" },
        { key: "supplier", label: "Supplier" },
        { key: "amount", label: "Sale Price" },
        { key: "invoiceNo", label: "Invoice" },
        { key: "settlementRef", label: "Settlement" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapHotelBooking}
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
            alertToast(`Invoice ${result.invoiceNo} created for ${String(row.guestName || "guest")}.`, "success", "Invoice Created");
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
        title: form.bookingRef,
        status: form.status,
        amount: Number(form.amount || 0),
        date: form.checkIn,
        data: {
          guestName: form.guestName,
          hotelName: form.hotelName,
          destination: form.destination,
          checkOut: form.checkOut || null,
          rooms: Number(form.rooms || 1),
          mealPlan: form.mealPlan || "room_only",
          supplier: form.supplier,
          cost: Number(form.cost || 0),
          paymentDue: form.paymentDue || null,
        },
      })}
      summarize={(rows) => {
        const totalSale = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
        const totalCost = rows.reduce((s, r) => s + Number(r.cost || 0), 0);
        return [
          { label: "Bookings", value: rows.length, color: "#a78bfa" },
          { label: "Confirmed", value: rows.filter(r => String(r.status) === "confirmed").length, color: "#34d399" },
          { label: "Checked In", value: rows.filter(r => String(r.status) === "checked_in").length, color: travelAccent },
          { label: "Invoice Pending", value: rows.filter(r => !String(r.invoiceNo || "")).length, color: "#f97316" },
          { label: "Margin", value: (totalSale - totalCost).toLocaleString(), color: "#60a5fa" },
        ];
      }}
    />
  );
}
