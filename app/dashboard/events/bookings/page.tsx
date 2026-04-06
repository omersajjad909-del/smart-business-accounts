"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { eventsAccent, mapEventBooking } from "../_shared";

const statusOptions = ["tentative", "confirmed", "completed"];

export default function EventBookingsPage() {
  return (
    <BusinessRecordWorkspace
      title="Event Bookings"
      subtitle="Track bookings, packages, and commercial commitments before execution starts."
      accent={eventsAccent}
      category="event_booking"
      emptyState="No event bookings yet. Add the first client booking."
      fields={[
        { key: "booking", label: "Booking", placeholder: "Wedding-Apr-24", required: true },
        { key: "client", label: "Client", placeholder: "Ahmed Family", required: true },
        { key: "package", label: "Package", placeholder: "Gold decor + catering", required: true },
        { key: "eventDate", label: "Event Date", type: "date", required: true },
        { key: "amount", label: "Booking Value", type: "number", placeholder: "450000", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "tentative" }}
      columns={[
        { key: "booking", label: "Booking" },
        { key: "client", label: "Client" },
        { key: "package", label: "Package" },
        { key: "eventDate", label: "Event Date" },
        { key: "amount", label: "Value" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapEventBooking}
      buildCreatePayload={(form) => ({
        title: form.booking,
        status: form.status,
        amount: Number(form.amount || 0),
        date: form.eventDate,
        data: {
          client: form.client,
          package: form.package,
        },
      })}
      summarize={(rows) => {
        const totalValue = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        return [
          { label: "Bookings", value: rows.length, color: "#fb7185" },
          { label: "Confirmed", value: rows.filter((row) => String(row.status) === "confirmed").length, color: "#34d399" },
          { label: "Tentative", value: rows.filter((row) => String(row.status) === "tentative").length, color: "#fbbf24" },
          { label: "Pipeline Value", value: totalValue.toLocaleString(), color: "#60a5fa" },
        ];
      }}
    />
  );
}
