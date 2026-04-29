"use client";

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
        { key: "travelDate", label: "Travel Date", type: "date", required: true },
        { key: "amount", label: "Ticket Value", type: "number", placeholder: "185000", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "quoted" }}
      columns={[
        { key: "booking", label: "Booking" },
        { key: "passenger", label: "Passenger" },
        { key: "airline", label: "Airline" },
        { key: "route", label: "Route" },
        { key: "pnr", label: "PNR" },
        { key: "travelDate", label: "Travel Date" },
        { key: "amount", label: "Value" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapTravelTicket}
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
        },
      })}
      summarize={(rows) => {
        const totalValue = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        return [
          { label: "Tickets", value: rows.length, color: travelAccent },
          { label: "Quoted", value: rows.filter((row) => String(row.status) === "quoted").length, color: "#fbbf24" },
          { label: "Issued", value: rows.filter((row) => String(row.status) === "issued").length, color: "#34d399" },
          { label: "Ticket Value", value: totalValue.toLocaleString(), color: "#60a5fa" },
        ];
      }}
    />
  );
}
