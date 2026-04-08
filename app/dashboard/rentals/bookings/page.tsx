"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapRentalBooking, rentalsAccent } from "../_shared";

const statusOptions = ["reserved", "out", "returned"];

export default function RentalsBookingsPage() {
  return (
    <BusinessRecordWorkspace
      title="Bookings"
      subtitle="Track rental bookings, deployments, and return schedules."
      accent={rentalsAccent}
      category="rental_booking"
      emptyState="No rental bookings yet. Add the first reservation."
      fields={[
        { key: "booking", label: "Booking", placeholder: "BK-2026-0104", required: true },
        { key: "customer", label: "Customer", placeholder: "Vertex Logistics", required: true },
        { key: "asset", label: "Asset", placeholder: "Corolla 1.6 AT", required: true },
        { key: "amount", label: "Booking Value", type: "number", placeholder: "25000", required: true },
        { key: "pickupDate", label: "Pickup Date", type: "date", required: true },
        { key: "returnDate", label: "Return Date", type: "date", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "reserved" }}
      columns={[
        { key: "booking", label: "Booking" },
        { key: "customer", label: "Customer" },
        { key: "asset", label: "Asset" },
        { key: "pickupDate", label: "Pickup" },
        { key: "returnDate", label: "Return" },
        { key: "amount", label: "Value" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapRentalBooking}
      buildCreatePayload={(form) => ({
        title: form.booking,
        status: form.status,
        amount: Number(form.amount || 0),
        date: form.pickupDate,
        data: {
          customer: form.customer,
          asset: form.asset,
          returnDate: form.returnDate,
        },
      })}
      summarize={(rows) => {
        const value = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        return [
          { label: "Bookings", value: rows.length, color: rentalsAccent },
          { label: "Reserved", value: rows.filter((row) => String(row.status) === "reserved").length, color: "#60a5fa" },
          { label: "On Rent", value: rows.filter((row) => String(row.status) === "out").length, color: "#fbbf24" },
          { label: "Booking Value", value: value.toLocaleString(), color: "#34d399" },
        ];
      }}
    />
  );
}
