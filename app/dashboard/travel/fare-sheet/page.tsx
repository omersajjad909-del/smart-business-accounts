"use client";

/**
 * Contract Fares — what this agency actually buys and sells a sector for.
 *
 * The published fare on a GDS is not the agency's fare. Seats are bought from a
 * consolidator at a negotiated net, sold at a number the desk decides, and the
 * difference is the whole business. Neither of those numbers exists in any feed
 * anyone could connect to — they exist on a sheet of paper behind the desk, and
 * that sheet is what this screen is.
 *
 * Search reads these first. A route with a contract fare on it comes back with
 * the agency's real numbers rather than an estimate, which is why this is worth
 * filling in before any GDS is wired up at all.
 */

import { useEffect, useState } from "react";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { travelAccent } from "../_shared";
import { AIRLINES, COMMON_AIRPORT_CODES, CABIN_LABELS, type CabinClass } from "@/lib/travel/flightSearch";
import type { BusinessRecord } from "@/lib/useBusinessRecords";

const airportCodes = COMMON_AIRPORT_CODES;
const airlineNames = AIRLINES.map((airline) => airline.name);

/* A fare that has lapsed is not deleted — it is what last year's booking was
   priced against, and a margin query six months from now needs to find it. */
const statusOptions = ["active", "expired"];

function mapFare(record: BusinessRecord) {
  const data = record.data ?? {};
  const sell = Number(data.sellFare || 0);
  const taxes = Number(data.taxes || 0);
  const net = Number(data.netCost || 0);
  return {
    id: record.id,
    title: record.title,
    from: String(data.from || ""),
    to: String(data.to || ""),
    route: `${String(data.from || "?")} → ${String(data.to || "?")}`,
    airline: String(data.airline || ""),
    supplier: String(data.supplier || data.airline || ""),
    cabin: String(data.cabin || "economy"),
    tripType: String(data.tripType || "oneway") === "round" ? "Round trip" : "One way",
    sellFare: sell,
    taxes,
    netCost: net,
    baggageKg: Number(data.baggageKg || 0),
    // What the agency keeps per adult. The reason the sheet exists.
    margin: Math.round(sell + taxes - net),
    validFrom: String(record.date || "").slice(0, 10),
    validTo: String(data.validTo || "").slice(0, 10),
    status: record.status || "active",
  };
}

export default function TravelFareSheetPage() {
  const [supplierNames, setSupplierNames] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/accounts?partyType=SUPPLIER", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        setSupplierNames(rows.map((a: { name?: unknown }) => String(a?.name || "")).filter(Boolean));
      })
      .catch(() => {});
  }, []);

  return (
    <BusinessRecordWorkspace
      title="Contract Fares"
      subtitle="Your negotiated net and selling fares per sector. Flight Search prices from these before it estimates anything."
      accent={travelAccent}
      category="travel_fare"
      emptyState="No contract fares yet. Add the sectors you sell most and Flight Search will quote your own numbers on them."
      headerAction={{ label: "🔍 Open Flight Search", href: "/dashboard/travel/flight-search" }}
      fields={[
        /* Codes rather than city names, because the search matches on them and
           "Lahore" would have to be guessed back into LHE every time. */
        { key: "from", label: "From (IATA)", placeholder: "LHE", suggestions: airportCodes, required: true },
        { key: "to", label: "To (IATA)", placeholder: "JED", suggestions: airportCodes, required: true },
        /* Two parties, because they are genuinely two things: the aircraft the
           passenger boards, and the account the payable lands in. An agency
           buying Emirates seats through a consolidator owes the consolidator. */
        { key: "airline", label: "Operating Airline", type: "select", options: airlineNames, required: true },
        { key: "supplier", label: "Buy From (Supplier)", type: "party", options: supplierNames, placeholder: "Consolidator or the airline itself", required: true },
        { key: "cabin", label: "Cabin", type: "select", options: Object.keys(CABIN_LABELS), required: true },
        { key: "tripType", label: "Fare Type", type: "select", options: ["oneway", "round"], required: true },
        { key: "sellFare", label: "Selling Fare / Adult", type: "number", placeholder: "185000", required: true },
        { key: "taxes", label: "Taxes / Adult", type: "number", placeholder: "21250", required: true },
        { key: "netCost", label: "Net Cost / Adult", type: "number", placeholder: "172000", required: true },
        /* Optional, and the only place a baggage figure can come from. Left
           empty, Flight Search says "confirm with the airline" rather than
           inventing one. */
        { key: "baggageKg", label: "Checked Baggage (kg)", type: "number", placeholder: "30" },
        { key: "validFrom", label: "Valid From", type: "date", required: true },
        { key: "validTo", label: "Valid To", type: "date" },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "active", cabin: "economy", tripType: "oneway" }}
      columns={[
        { key: "route", label: "Sector" },
        { key: "airline", label: "Airline" },
        { key: "supplier", label: "Supplier" },
        { key: "cabin", label: "Cabin" },
        { key: "tripType", label: "Fare Type" },
        { key: "sellFare", label: "Sell / Adult" },
        { key: "taxes", label: "Taxes" },
        { key: "netCost", label: "Net Cost" },
        {
          key: "baggageKg",
          label: "Baggage",
          render: (row) => (Number(row.baggageKg) > 0 ? `${row.baggageKg} kg` : "Not recorded"),
        },
        {
          key: "margin",
          label: "Margin / Adult",
          render: (row) => {
            const margin = Number(row.margin) || 0;
            return (
              <span style={{ color: margin > 0 ? "var(--tx-34d399, #34d399)" : "var(--tx-f87171, #f87171)", fontWeight: 700 }}>
                {margin.toLocaleString()}
              </span>
            );
          },
        },
        {
          key: "validTo",
          label: "Valid Until",
          render: (row) => String(row.validTo || "") || "No end date",
        },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapFare}
      buildCreatePayload={(form) => ({
        title: `${String(form.from || "").toUpperCase()} → ${String(form.to || "").toUpperCase()} · ${form.airline}`,
        status: form.status,
        // The selling fare is what this row is worth at a glance.
        amount: Number(form.sellFare || 0),
        date: form.validFrom,
        data: {
          from: String(form.from || "").trim().toUpperCase(),
          to: String(form.to || "").trim().toUpperCase(),
          airline: form.airline,
          supplier: form.supplier || form.airline,
          cabin: (form.cabin || "economy") as CabinClass,
          tripType: form.tripType || "oneway",
          sellFare: Number(form.sellFare || 0),
          taxes: Number(form.taxes || 0),
          netCost: Number(form.netCost || 0),
          baggageKg: Number(form.baggageKg || 0),
          validTo: form.validTo || null,
        },
      })}
      summarize={(rows) => {
        const active = rows.filter((row) => String(row.status) === "active");
        const margins = active.map((row) => Number(row.margin) || 0);
        const avg = margins.length ? Math.round(margins.reduce((a, b) => a + b, 0) / margins.length) : 0;
        const thin = active.filter((row) => (Number(row.margin) || 0) <= 0).length;
        /* A fare with a fortnight left is a fare that needs renegotiating now,
           not on the morning a booking is refused at the old price. */
        const soon = active.filter((row) => {
          const until = String(row.validTo || "");
          if (!until) return false;
          const days = (new Date(until).getTime() - Date.now()) / 864e5;
          return days >= 0 && days <= 14;
        }).length;

        return [
          { label: "Fares", value: rows.length, color: travelAccent },
          { label: "Active", value: active.length, color: "var(--tx-34d399, #34d399)" },
          { label: "Avg Margin / Adult", value: avg.toLocaleString(), color: avg > 0 ? "var(--tx-60a5fa, #60a5fa)" : "var(--tx-f87171, #f87171)" },
          { label: "At or Below Cost", value: thin, color: thin ? "var(--tx-f87171, #f87171)" : "var(--tx-34d399, #34d399)" },
          { label: "Expiring in 14 Days", value: soon, color: soon ? "var(--tx-fbbf24, #fbbf24)" : "var(--tx-34d399, #34d399)" },
        ];
      }}
    />
  );
}
