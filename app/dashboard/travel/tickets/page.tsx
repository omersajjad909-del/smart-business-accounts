"use client";

import { useEffect, useState } from "react";

import { alertToast } from "@/lib/toast-feedback";
import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { PassengerDialog } from "../_PassengerDialog";
import { RefundDialog, type RefundTarget } from "../_RefundDialog";
import { mapTravelTicket, travelAccent } from "../_shared";
import { describeParty, readPassengers, totalPassengers, type Passenger } from "@/lib/travelPassengers";

/* "cancelled" is gone and "refunded" and "void" are in.
 
   The old word was typed into a box and moved nothing: the invoice stood, the
   passenger still owed the fare and the airline was still carried as a payable
   for a seat nobody flew. Leaving it on the list would leave a way to say a
   ticket was cancelled without anything being cancelled, which is the whole
   bug. Cancelling is the Refund button now, and these two are what it leaves
   behind — set by the posting, not chosen from a dropdown. */
const statusOptions = ["quoted", "booked", "issued", "refunded", "void"];

export default function TravelTicketsPage() {
  const [refundTarget, setRefundTarget] = useState<RefundTarget | null>(null);
  const [afterRefund, setAfterRefund] = useState<{ refetch: () => Promise<void> } | null>(null);
  const [paxTarget, setPaxTarget] = useState<{ id: string; label: string; rows: Passenger[] } | null>(null);

  /* Airlines, consolidators and embassies the company already deals with.
     Re-typing them by hand is how "Qatar Airways BSP" and "Qatar Airways Bsp"
     become two suppliers with half the payable each. */
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
    <>
    {paxTarget && (
      <PassengerDialog
        bookingLabel={paxTarget.label}
        initial={paxTarget.rows}
        onClose={() => setPaxTarget(null)}
        onSave={async (passengers) => {
          const res = await fetch("/api/travel/passengers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recordId: paxTarget.id, passengers }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body?.error || "Could not save the passengers");
          await afterRefund?.refetch();
          alertToast(
            `${describeParty(totalPassengers(passengers))} on ${paxTarget.label} — ${body.totals.sale.toLocaleString()}.`,
            "success",
            "Passengers Saved",
          );
        }}
      />
    )}
    {refundTarget && (
      <RefundDialog
        target={refundTarget}
        onClose={() => setRefundTarget(null)}
        onDone={async (message) => {
          await afterRefund?.refetch();
          alertToast(message, "success", "Refund Posted");
        }}
      />
    )}
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
        // Offered from the chart of accounts. Typing a new one still works —
        // the settlement posting creates the supplier account.
        { key: "supplier", label: "Airline / Supplier", placeholder: "Qatar Airways BSP", required: true, suggestions: supplierNames },
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
          /* A family on one PNR is one booking, not five. Once it is invoiced
             the party is fixed — changing it under a raised invoice would leave
             the ledger charging for people who are no longer on the file. */
          label: (row) => {
            const n = Number(row.paxCount) || 0;
            return n > 1 ? `Passengers (${n})` : n === 1 ? "Passengers" : "Add Passengers";
          },
          tone: "accent",
          hidden: (row) =>
            Boolean(row.invoiceNo) ||
            String(row.status) === "refunded" ||
            String(row.status) === "void",
          onClick: (row, helpers) => {
            setAfterRefund({ refetch: helpers.refetch });
            setPaxTarget({
              id: String(row.id),
              label: String(row.pnr || row.booking || "this booking"),
              rows: readPassengers(row.passengers),
            });
          },
        },
        {
          /* Only once there is something to reverse. A quote that was never
             invoiced has nothing to refund — it is simply abandoned. */
          label: () => "Refund / Void",
          tone: "neutral",
          hidden: (row) =>
            !String(row.invoiceNo || "") ||
            String(row.status) === "refunded" ||
            String(row.status) === "void",
          onClick: (row, helpers) => {
            setAfterRefund({ refetch: helpers.refetch });
            setRefundTarget({
              id: String(row.id),
              label: String(row.pnr || row.booking || "this ticket"),
              saleAmount: Number(row.amount) || 0,
              costAmount: Number(row.cost) || 0,
            });
          },
        },
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
    </>
  );
}
