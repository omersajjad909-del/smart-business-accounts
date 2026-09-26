"use client";

/**
 * Refunding a travel document.
 *
 * A cancellation is the one moment in a travel file where money moves in two
 * directions at once: something goes back to the passenger, something comes
 * back from the airline, and each side keeps a slice. Four numbers, none of
 * them derivable from the other three — which is why this is a dialog and not
 * a button.
 *
 * It shows the whole shape before anything posts, the way the production run
 * is priced before it posts. In particular it shows the net, which is often
 * negative: an airline penalty larger than the agency's own charge means the
 * cancellation cost the agency money, and that is worth knowing at the moment
 * of confirming rather than at month end.
 */

import { useMemo, useState } from "react";

// From the maths module, not from travelAmend — that one imports Prisma, and a
// client component reaching into it drags the database client into the browser
// bundle, where it cannot run.
import { quoteRefund } from "@/lib/travelRefundMath";

const ff = "'Outfit','Inter',sans-serif";
const border = "rgba(var(--ink),0.09)";
const panel = "var(--dk-161b27, #161b27)";

export type RefundTarget = {
  id: string;
  label: string;
  /** What the passenger was charged. */
  saleAmount: number;
  /** What the supplier is owed. */
  costAmount: number;
};

const field: React.CSSProperties = {
  width: "100%", background: "rgba(var(--ink),.05)", border: `1px solid ${border}`,
  borderRadius: 9, padding: "10px 12px", color: "var(--ink-solid, #fff)", fontSize: 14,
  fontFamily: "inherit", boxSizing: "border-box",
};
const label: React.CSSProperties = {
  display: "block", fontSize: 12, color: "rgba(var(--ink),var(--ta-45, .45))", marginBottom: 6,
};

export function RefundDialog({
  target,
  onClose,
  onDone,
}: {
  target: RefundTarget;
  onClose: () => void;
  onDone: (message: string) => Promise<void> | void;
}) {
  /* Opens on a full refund — the commonest case is a void, and it is the one
     figure that is certainly right before anyone has read the penalty letter.
     Anything less is a decision, and a decision should be typed. */
  const [customerRefund, setCustomerRefund] = useState(String(target.saleAmount));
  const [supplierRefund, setSupplierRefund] = useState(String(target.costAmount));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const quote = useMemo(
    () =>
      quoteRefund({
        saleAmount: target.saleAmount,
        costAmount: target.costAmount,
        customerRefund: Number(customerRefund) || 0,
        supplierRefund: Number(supplierRefund) || 0,
      }),
    [target.saleAmount, target.costAmount, customerRefund, supplierRefund],
  );

  const isVoid =
    quote.customerRefund >= target.saleAmount && quote.supplierRefund >= target.costAmount;

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/travel/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: target.id,
          customerRefund: Number(customerRefund) || 0,
          supplierRefund: Number(supplierRefund) || 0,
          reason,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Could not refund this document");
      await onDone(
        `${target.label} ${body.status === "void" ? "voided" : "refunded"} — credit note ${body.creditNoteNo}.`,
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refund this document");
    } finally {
      setBusy(false);
    }
  }

  const row = (name: string, value: number, colour: string, note?: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "5px 0" }}>
      <span style={{ fontSize: 12.5, color: "rgba(var(--ink),var(--ta-55, .55))" }}>
        {name}
        {note && <span style={{ color: "rgba(var(--ink),var(--ta-30, .3))", marginLeft: 6 }}>{note}</span>}
      </span>
      <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, color: colour, whiteSpace: "nowrap" }}>
        {value.toLocaleString()}
      </span>
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: panel, border: `1px solid ${border}`, borderRadius: 16, padding: 26, width: 520, maxHeight: "90vh", overflowY: "auto", fontFamily: ff, color: "#fff" }}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800 }}>
          {isVoid ? "Void" : "Refund"} {target.label}
        </h2>
        <div style={{ fontSize: 12.5, color: "rgba(var(--ink),var(--ta-42, .42))", marginBottom: 18, lineHeight: 1.6 }}>
          Sold for {target.saleAmount.toLocaleString()}, supplier owed {target.costAmount.toLocaleString()}.
          A credit note posts against the sale and the supplier payable falls to whatever the airline keeps.
          Nothing is deleted.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div>
            <label style={label}>Back to the passenger</label>
            <input
              type="number" min={0} step="any" value={customerRefund} autoFocus
              onChange={(e) => setCustomerRefund(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              style={field}
            />
          </div>
          <div>
            <label style={label}>Back from the supplier</label>
            <input
              type="number" min={0} step="any" value={supplierRefund}
              onChange={(e) => setSupplierRefund(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              style={field}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={label}>Reason</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Passenger cancelled, flight cancelled, no-show…"
            style={field}
          />
        </div>

        {/* What the two figures actually mean, in the words the desk uses. */}
        <div style={{ padding: "13px 15px", borderRadius: 12, background: "rgba(var(--ink),.03)", border: `1px solid ${border}`, marginBottom: 14 }}>
          {row("Passenger gets back", quote.customerRefund, "#fff")}
          {row("Agency keeps", quote.retainedIncome, "#34d399", "service charge")}
          {row("Supplier returns", quote.supplierRefund, "#fff")}
          {row("Supplier keeps", quote.supplierCharge, "#fbbf24", "penalty")}
          <div style={{ borderTop: `1px solid ${border}`, marginTop: 8, paddingTop: 8 }}>
            {row(
              quote.netToAgency < 0 ? "This cancellation costs the agency" : "Net to the agency",
              Math.abs(quote.netToAgency),
              quote.netToAgency < 0 ? "#fca5a5" : "#34d399",
            )}
          </div>
        </div>

        {quote.errors.length > 0 && (
          <div style={{ padding: "10px 13px", borderRadius: 10, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)", color: "var(--tx-fca5a5, #fca5a5)", fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>
            {quote.errors.join(" ")}
          </div>
        )}
        {error && (
          <div style={{ padding: "10px 13px", borderRadius: 10, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)", color: "var(--tx-fca5a5, #fca5a5)", fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={confirm}
            disabled={busy || quote.errors.length > 0}
            style={{
              flex: 1, padding: "11px 0", border: "none", borderRadius: 9, color: "#fff",
              fontSize: 14, fontWeight: 800, fontFamily: "inherit",
              background: busy || quote.errors.length > 0 ? "rgba(239,68,68,.4)" : "#ef4444",
              cursor: busy || quote.errors.length > 0 ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Posting…" : isVoid ? "Void it" : "Post the refund"}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            style={{ padding: "11px 22px", background: "transparent", border: `1px solid ${border}`, borderRadius: 9, color: "rgba(var(--ink),var(--ta-65, .65))", fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
