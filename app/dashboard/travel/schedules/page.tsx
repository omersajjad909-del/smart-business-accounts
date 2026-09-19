"use client";

/**
 * Flight Schedules — the timetable this agency actually sells.
 *
 * Flight Search shows a departure time only if it finds one here. It used to
 * generate them, which put a flight number and a 00:45 departure on the card
 * that looked exactly like real ones and were a random number — an agent could
 * read "PA 163 departs 00:45" off the screen and tell a customer. Now the
 * search shows no times at all on a sector nobody has recorded.
 *
 * So this is the way to get them back, and it is worth filling in for the ten
 * or twenty sectors a desk actually sells. Every row here is something a human
 * checked against the airline.
 */

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { ScheduleImport } from "../_flight/ScheduleImport";
import { travelAccent } from "../_shared";
import { AIRLINES, AIRPORTS, minutesBetween, formatDuration } from "@/lib/travel/flightSearch";
import type { BusinessRecord } from "@/lib/useBusinessRecords";

const airportCodes = AIRPORTS.map((airport) => airport.code);
const airlineNames = AIRLINES.map((airline) => airline.name);

/* A flight that stops operating is suspended, not deleted — last winter's
   timetable is what last winter's bookings were sold against. */
const statusOptions = ["active", "suspended"];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "1,3,5" → "Mon, Wed, Fri". Empty means it operates every day. */
function describeDays(raw: string): string {
  const days = String(raw || "")
    .split(/[^0-9]+/)
    .map((n) => Number(n))
    .filter((n) => n >= 1 && n <= 7);
  if (!days.length) return "Daily";
  if (days.length === 7) return "Daily";
  return days.sort((a, b) => a - b).map((n) => DAY_LABELS[n - 1]).join(", ");
}

function mapSchedule(record: BusinessRecord) {
  const data = record.data ?? {};
  const departAt = String(data.departAt || "");
  const arriveAt = String(data.arriveAt || "");
  const minutes = minutesBetween(departAt, arriveAt);
  return {
    id: record.id,
    title: record.title,
    flightNo: String(data.flightNo || ""),
    airline: String(data.airline || ""),
    sector: `${String(data.from || "?")} → ${String(data.to || "?")}`,
    departAt,
    arriveAt: arriveAt + (arriveAt && departAt && arriveAt < departAt ? " (+1)" : ""),
    duration: minutes ? formatDuration(minutes) : "-",
    via: String(data.via || "") || "Direct",
    days: describeDays(String(data.days || "")),
    validFrom: String(record.date || "").slice(0, 10),
    validTo: String(data.validTo || "").slice(0, 10),
    status: record.status || "active",
  };
}

export default function TravelSchedulesPage() {
  return (
    <>
    {/* Above the list, because importing a sector is what you do before the
        list has anything in it. */}
    <div style={{ padding: "20px 28px 0" }}>
      <ScheduleImport />
    </div>
    <BusinessRecordWorkspace
      title="Flight Schedules"
      subtitle="The timetable you sell. Flight Search shows a departure time only where it finds one here — it never invents one."
      accent={travelAccent}
      category="travel_schedule"
      emptyState="No schedules recorded. Until a sector has one here, Flight Search shows that carrier with no times rather than making them up."
      headerAction={{ label: "🔍 Open Flight Search", href: "/dashboard/travel/flight-search" }}
      fields={[
        { key: "airline", label: "Airline", type: "select", options: airlineNames, required: true },
        { key: "flightNo", label: "Flight Number", placeholder: "PA 200", required: true },
        { key: "from", label: "From (IATA)", placeholder: "KHI", suggestions: airportCodes, required: true },
        { key: "to", label: "To (IATA)", placeholder: "PEW", suggestions: airportCodes, required: true },
        /* Local clock at each end, which is how a timetable is published and
           how the passenger reads it. An arrival earlier than the departure is
           taken as landing the next day rather than needing its own box. */
        { key: "departAt", label: "Departs (local)", placeholder: "07:15", required: true },
        { key: "arriveAt", label: "Arrives (local)", placeholder: "09:05", required: true },
        { key: "via", label: "Stops At", placeholder: "DXB — leave empty for direct", suggestions: airportCodes },
        { key: "days", label: "Operates On", placeholder: "1,3,5 — empty means daily" },
        { key: "validFrom", label: "Valid From", type: "date", required: true },
        { key: "validTo", label: "Valid To", type: "date" },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "active" }}
      columns={[
        { key: "flightNo", label: "Flight" },
        { key: "airline", label: "Airline" },
        { key: "sector", label: "Sector" },
        { key: "departAt", label: "Departs" },
        { key: "arriveAt", label: "Arrives" },
        { key: "duration", label: "Duration" },
        { key: "via", label: "Via" },
        { key: "days", label: "Operates" },
        {
          key: "validTo",
          label: "Valid Until",
          render: (row) => String(row.validTo || "") || "No end date",
        },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapSchedule}
      buildCreatePayload={(form) => ({
        title: `${form.flightNo} · ${String(form.from || "").toUpperCase()} → ${String(form.to || "").toUpperCase()}`,
        status: form.status,
        date: form.validFrom,
        data: {
          airline: form.airline,
          flightNo: String(form.flightNo || "").trim().toUpperCase(),
          from: String(form.from || "").trim().toUpperCase(),
          to: String(form.to || "").trim().toUpperCase(),
          departAt: String(form.departAt || "").trim(),
          arriveAt: String(form.arriveAt || "").trim(),
          via: String(form.via || "").trim().toUpperCase(),
          days: String(form.days || "").trim(),
          validTo: form.validTo || null,
        },
      })}
      summarize={(rows) => {
        const active = rows.filter((row) => String(row.status) === "active");
        const sectors = new Set(active.map((row) => String(row.sector)));
        const airlines = new Set(active.map((row) => String(row.airline)));
        const soon = active.filter((row) => {
          const until = String(row.validTo || "");
          if (!until) return false;
          const days = (new Date(until).getTime() - Date.now()) / 864e5;
          return days >= 0 && days <= 30;
        }).length;

        return [
          { label: "Flights", value: rows.length, color: travelAccent },
          { label: "Active", value: active.length, color: "#34d399" },
          { label: "Sectors Covered", value: sectors.size, color: "#60a5fa" },
          { label: "Airlines", value: airlines.size, color: "#a78bfa" },
          { label: "Expiring in 30 Days", value: soon, color: soon ? "#fbbf24" : "#34d399" },
        ];
      }}
    />
    </>
  );
}
