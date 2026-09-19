"use client";

/**
 * Transport — airport transfers, cabs, coasters, the Makkah–Madinah run.
 *
 * Built around the assignment rather than the sale, because the operator's
 * question at four in the morning is not what it was sold for — it is whether
 * a driver has been given to the family landing at six.
 */

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { travelAccent } from "../_shared";
import type { BusinessRecord } from "@/lib/useBusinessRecords";

/* A vehicle that has not been given a driver is the failure mode of this whole
   module, so it is a status of its own rather than a flag hidden on the row. */
const statusOptions = ["unassigned", "assigned", "confirmed", "completed", "cancelled"];

const vehicleTypes = [
  "Car (3 pax)", "Car (4 pax)", "SUV (6 pax)", "Hiace (12 pax)",
  "Coaster (22 pax)", "Bus (45 pax)", "Luxury / VIP",
];

const serviceTypes = [
  "Airport pickup", "Airport drop", "Airport transfer (both ways)",
  "Cab / point to point", "At disposal (hourly)", "At disposal (daily)",
  "Intercity", "Ziyarat", "Makkah ↔ Madinah",
];

function mapTransport(record: BusinessRecord) {
  const data = record.data ?? {};
  const sale = Number(record.amount || 0);
  const cost = Number(data.cost || 0);
  return {
    id: record.id,
    ref: record.title,
    service: String(data.service || ""),
    passenger: String(data.passenger || ""),
    pickup: String(data.pickup || ""),
    dropoff: String(data.dropoff || ""),
    when: `${String(record.date || "").slice(0, 10)}${data.time ? ` ${data.time}` : ""}`,
    pax: Number(data.pax || 0),
    vehicle: String(data.vehicle || ""),
    driver: String(data.driver || ""),
    driverPhone: String(data.driverPhone || ""),
    supplier: String(data.supplier || ""),
    amount: sale,
    cost,
    margin: Math.round(sale - cost),
    status: record.status || "unassigned",
  };
}

export default function TravelTransportPage() {
  return (
    <BusinessRecordWorkspace
      title="Transport"
      subtitle="Airport transfers, cabs and coaches — and whether each one actually has a driver against it."
      accent={travelAccent}
      category="travel_transport"
      emptyState="No transport booked. Add the first transfer and it will show here with its driver and its margin."
      fields={[
        { key: "ref", label: "Reference", placeholder: "TRP-24018", required: true },
        { key: "passenger", label: "Passenger / Party", placeholder: "Ali Raza +3", required: true },
        { key: "service", label: "Service", type: "select", options: serviceTypes, required: true },
        { key: "pickup", label: "Pickup", placeholder: "KHI Terminal 1", required: true },
        { key: "dropoff", label: "Drop-off", placeholder: "Hotel Beach Luxury", required: true },
        { key: "date", label: "Date", type: "date", required: true },
        /* A transfer without a time is a transfer nobody can be sent to. */
        { key: "time", label: "Pickup Time", placeholder: "06:15", required: true },
        { key: "pax", label: "Passengers", type: "number", placeholder: "4", required: true },
        { key: "vehicle", label: "Vehicle", type: "select", options: vehicleTypes, required: true },
        { key: "driver", label: "Driver", placeholder: "Name — leave empty until assigned" },
        { key: "driverPhone", label: "Driver Phone", placeholder: "+92 300 1234567" },
        { key: "supplier", label: "Supplier", type: "party", placeholder: "Transport vendor", required: true },
        { key: "amount", label: "Charged", type: "number", placeholder: "9000", required: true },
        { key: "cost", label: "Vendor Cost", type: "number", placeholder: "6000", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "unassigned" }}
      columns={[
        { key: "ref", label: "Reference" },
        { key: "passenger", label: "Party" },
        { key: "service", label: "Service" },
        { key: "pickup", label: "Pickup" },
        { key: "dropoff", label: "Drop-off" },
        { key: "when", label: "When" },
        { key: "pax", label: "Pax" },
        { key: "vehicle", label: "Vehicle" },
        {
          key: "driver",
          label: "Driver",
          render: (row) => {
            const driver = String(row.driver || "");
            if (driver) return `${driver}${row.driverPhone ? ` · ${row.driverPhone}` : ""}`;
            // The thing that goes wrong, said in red rather than left blank.
            return <span style={{ color: "#f87171", fontWeight: 700 }}>Not assigned</span>;
          },
        },
        { key: "supplier", label: "Supplier" },
        { key: "amount", label: "Charged" },
        {
          key: "margin",
          label: "Margin",
          render: (row) => {
            const margin = Number(row.margin) || 0;
            return <span style={{ color: margin > 0 ? "#34d399" : "#f87171", fontWeight: 700 }}>{margin.toLocaleString()}</span>;
          },
        },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapTransport}
      buildCreatePayload={(form) => ({
        title: form.ref,
        status: form.status,
        amount: Number(form.amount || 0),
        date: form.date,
        data: {
          passenger: form.passenger,
          service: form.service,
          pickup: form.pickup,
          dropoff: form.dropoff,
          time: form.time,
          pax: Number(form.pax || 0),
          vehicle: form.vehicle,
          driver: form.driver || "",
          driverPhone: form.driverPhone || "",
          supplier: form.supplier,
          cost: Number(form.cost || 0),
        },
      })}
      summarize={(rows) => {
        const live = rows.filter((row) => !["completed", "cancelled"].includes(String(row.status)));
        const unassigned = live.filter((row) => !String(row.driver || "").trim()).length;
        /* Tomorrow, because that is when somebody still has time to do
           something about a transfer with no driver on it. */
        const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
        const dueTomorrow = rows.filter((row) => String(row.when || "").slice(0, 10) === tomorrow).length;
        const margin = rows.reduce((sum, row) => sum + (Number(row.margin) || 0), 0);

        return [
          { label: "Transfers", value: rows.length, color: travelAccent },
          { label: "Live", value: live.length, color: "#60a5fa" },
          { label: "No Driver Yet", value: unassigned, color: unassigned ? "#f87171" : "#34d399" },
          { label: "Tomorrow", value: dueTomorrow, color: dueTomorrow ? "#fbbf24" : "#34d399" },
          { label: "Margin", value: margin.toLocaleString(), color: margin >= 0 ? "#34d399" : "#f87171" },
        ];
      }}
    />
  );
}
