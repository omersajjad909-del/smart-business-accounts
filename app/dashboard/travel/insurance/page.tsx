"use client";

/**
 * Travel Insurance — the policy, and whether it actually covers the trip.
 *
 * A Schengen application is refused without cover, and cover that ends before
 * the traveller comes home is worth nothing at the point it is needed. So the
 * dates on the policy matter more than the premium, and the page is built
 * around them.
 */

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { travelAccent } from "../_shared";
import type { BusinessRecord } from "@/lib/useBusinessRecords";

const statusOptions = ["quoted", "issued", "active", "expired", "cancelled"];

const plans = [
  "Schengen (€30,000 medical)", "Worldwide standard", "Worldwide comprehensive",
  "Umrah / Hajj", "Student", "Senior citizen", "Annual multi-trip",
];

function mapPolicy(record: BusinessRecord) {
  const data = record.data ?? {};
  const sale = Number(record.amount || 0);
  const cost = Number(data.cost || 0);
  const from = String(record.date || "").slice(0, 10);
  const to = String(data.coverTo || "").slice(0, 10);
  return {
    id: record.id,
    ref: record.title,
    traveler: String(data.traveler || ""),
    passportNo: String(data.passportNo || ""),
    destination: String(data.destination || ""),
    plan: String(data.plan || ""),
    insurer: String(data.insurer || ""),
    policyNo: String(data.policyNo || ""),
    coverFrom: from,
    coverTo: to,
    /* Both dates in one cell, because a policy is only ever read as a window
       and reading two columns to work out whether today falls inside it is
       how a gap gets missed. */
    cover: from && to ? `${from} → ${to}` : from || "—",
    amount: sale,
    cost,
    margin: Math.round(sale - cost),
    status: record.status || "quoted",
  };
}

export default function TravelInsurancePage() {
  return (
    <BusinessRecordWorkspace
      title="Travel Insurance"
      subtitle="Policies, their cover dates and your margin — the dates being the part a visa officer checks."
      accent={travelAccent}
      category="travel_insurance"
      emptyState="No policies yet. Add one and its cover window, insurer and margin will show here."
      fields={[
        { key: "ref", label: "Reference", placeholder: "INS-24018", required: true },
        { key: "traveler", label: "Traveller", placeholder: "Ali Raza", required: true },
        { key: "passportNo", label: "Passport No", placeholder: "AB1234567" },
        { key: "destination", label: "Destination", placeholder: "Schengen / UAE / Worldwide", required: true },
        { key: "plan", label: "Plan", type: "select", options: plans, required: true },
        { key: "insurer", label: "Insurer", type: "party", placeholder: "Who underwrites it", required: true },
        { key: "policyNo", label: "Policy Number", placeholder: "Once issued" },
        /* The window. A policy that ends before the traveller lands home is
           the specific failure this page exists to make visible. */
        { key: "date", label: "Cover From", type: "date", required: true },
        { key: "coverTo", label: "Cover To", type: "date", required: true },
        { key: "amount", label: "Premium Charged", type: "number", placeholder: "4500", required: true },
        { key: "cost", label: "Insurer Cost", type: "number", placeholder: "3200", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "quoted" }}
      columns={[
        { key: "ref", label: "Reference" },
        { key: "traveler", label: "Traveller" },
        { key: "destination", label: "Destination" },
        { key: "plan", label: "Plan" },
        { key: "insurer", label: "Insurer" },
        { key: "policyNo", label: "Policy No" },
        {
          key: "cover",
          label: "Cover",
          render: (row) => {
            const to = String(row.coverTo || "");
            if (!to) return String(row.cover || "—");
            const days = Math.floor((new Date(to).getTime() - Date.now()) / 864e5);
            const tone = days < 0 ? "#f87171" : days <= 7 ? "#fbbf24" : "inherit";
            return <span style={{ color: tone, fontWeight: days <= 7 ? 700 : 400 }}>{String(row.cover)}</span>;
          },
        },
        { key: "amount", label: "Premium" },
        {
          key: "margin",
          label: "Margin",
          render: (row) => {
            const margin = Number(row.margin) || 0;
            return <span style={{ color: margin > 0 ? "var(--tx-34d399, #34d399)" : "var(--tx-f87171, #f87171)", fontWeight: 700 }}>{margin.toLocaleString()}</span>;
          },
        },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapPolicy}
      buildCreatePayload={(form) => ({
        title: form.ref,
        status: form.status,
        amount: Number(form.amount || 0),
        date: form.date,
        data: {
          traveler: form.traveler,
          passportNo: String(form.passportNo || "").toUpperCase(),
          destination: form.destination,
          plan: form.plan,
          insurer: form.insurer,
          policyNo: form.policyNo || "",
          coverTo: form.coverTo,
          cost: Number(form.cost || 0),
        },
      })}
      summarize={(rows) => {
        const active = rows.filter((row) => ["issued", "active"].includes(String(row.status)));
        const margin = rows.reduce((sum, row) => sum + (Number(row.margin) || 0), 0);
        const noPolicyNo = active.filter((row) => !String(row.policyNo || "").trim()).length;
        const endingSoon = active.filter((row) => {
          const to = String(row.coverTo || "");
          if (!to) return false;
          const days = (new Date(to).getTime() - Date.now()) / 864e5;
          return days >= 0 && days <= 7;
        }).length;

        return [
          { label: "Policies", value: rows.length, color: travelAccent },
          { label: "Active", value: active.length, color: "var(--tx-34d399, #34d399)" },
          { label: "No Policy Number", value: noPolicyNo, color: noPolicyNo ? "var(--tx-f87171, #f87171)" : "var(--tx-34d399, #34d399)" },
          { label: "Cover Ends in 7 Days", value: endingSoon, color: endingSoon ? "var(--tx-fbbf24, #fbbf24)" : "var(--tx-34d399, #34d399)" },
          { label: "Margin", value: margin.toLocaleString(), color: margin >= 0 ? "var(--tx-34d399, #34d399)" : "var(--tx-f87171, #f87171)" },
        ];
      }}
    />
  );
}
