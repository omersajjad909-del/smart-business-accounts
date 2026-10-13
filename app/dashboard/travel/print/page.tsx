"use client";

/**
 * The travel invoice, on paper.
 *
 * A sale out of the travel desks posts an ordinary SalesInvoice, which is
 * right — the ledger does not care what was sold. But the customer's copy was
 * printing the shape every trade uses, Item / Qty / Rate, so a ticket read
 * "Air Ticket Revenue ×1" and told the passenger nothing they could check.
 *
 * Same letterhead, same print engine, same company settings as every other
 * document. Only the body changes, because only the body was wrong.
 */

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PrintActionBar } from "@/components/print/PrintActionBar";
import { TravelInvoiceSheet, TravelPaper } from "@/components/print/TravelInvoiceSheet";
import { useCompanyPrintHeader } from "@/hooks/useCompanyPrintHeader";
import { useCurrency } from "@/lib/useCurrency";
import type { TravelInvoiceDoc } from "@/lib/travel/invoicePrint";

type Payload = {
  doc: TravelInvoiceDoc;
  partyName: string;
  invoiceNo: string;
  date: string;
  total: number;
};

function TravelPrint() {
  const params = useSearchParams();
  const kind = params.get("kind") || "";
  const id = params.get("id") || "";

  // Same company letterhead as every other document; the design and what may
  // show come from the Travel Invoice entry in Print Preferences.
  const printHeader = useCompanyPrintHeader("travel_invoice");
  const symbol = useCurrency();

  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!kind || !id) { setError("Nothing to print — no document was named."); return; }
    let cancelled = false;
    fetch(`/api/travel/invoice-print?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`)
      .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) { setError(body?.error || "Could not build the invoice"); return; }
        setPayload(body as Payload);
      })
      .catch(() => { if (!cancelled) setError("Could not build the invoice"); });
    return () => { cancelled = true; };
  }, [kind, id]);

  if (error) {
    return <div style={{ padding: 28, color: "#f87171", fontSize: 14 }}>{error}</div>;
  }
  if (!payload) {
    return <div style={{ padding: 28, color: "var(--text-muted)", fontSize: 14 }}>Building the invoice…</div>;
  }

  const { doc } = payload;
  const money = (n: unknown) => `${symbol}${Math.round(Number(n) || 0).toLocaleString()}`;

  return (
    <div style={{ padding: 20 }}>
      {/* One Back. The bar's second button is for pages with two destinations,
          and this one has only the list it was opened from. */}
      <PrintActionBar
        onPrintA4={() => window.print()}
        onEdit={() => window.history.back()}
        editLabel="Back"
      />
      <TravelPaper>
        <TravelInvoiceSheet
          {...printHeader}
          docTitle={doc.docTitle}
          docNo={payload.invoiceNo || "—"}
          date={payload.date}
          partyName={payload.partyName}
          metaFields={doc.metaFields}
          columns={doc.columns.map((col) => ({
            ...col,
            // Money reads as money on the page, and only the money columns do.
            render: ["fare", "rate", "amount"].includes(col.key) ? (value: unknown) => money(value) : undefined,
          }))}
          rows={doc.rows}
          totalText={money(payload.total)}
          summaryFields={doc.summaryFields}
          notes={doc.notes}
        />
      </TravelPaper>
    </div>
  );
}

export default function TravelPrintPage() {
  return (
    <Suspense fallback={<div style={{ padding: 28, color: "var(--text-muted)" }}>Loading…</div>}>
      <TravelPrint />
    </Suspense>
  );
}
