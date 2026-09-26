"use client";

/**
 * The passengers on one PNR.
 *
 * A family going to Umrah is one booking, one set of dates, one supplier and
 * one invoice. Entering them as separate tickets meant five records that agreed
 * only by accident — change the date and you change it five times, refund the
 * booking and you refund five things and hope you found them all.
 *
 * The ticket's sale value and supplier cost are the sums of these rows and are
 * written from here. A total typed separately from the lines it is meant to be
 * the sum of will, sooner or later, stop being the sum of them.
 */

import { useMemo, useState } from "react";

import {
  PAX_TYPE_LABELS,
  describeParty,
  emptyPassenger,
  suggestFare,
  totalPassengers,
  validatePassengers,
  type PaxType,
  type Passenger,
} from "@/lib/travelPassengers";

const ff = "'Outfit','Inter',sans-serif";
const border = "rgba(255,255,255,0.09)";

const cell: React.CSSProperties = {
  width: "100%", background: "rgba(var(--ink),.05)", border: `1px solid ${border}`,
  borderRadius: 8, padding: "7px 9px", color: "var(--ink-solid, #fff)", fontSize: 12.5,
  fontFamily: "inherit", boxSizing: "border-box",
};
const head: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase",
  color: "rgba(var(--ink),.38)", paddingBottom: 4,
};

export function PassengerDialog({
  bookingLabel,
  initial,
  onClose,
  onSave,
}: {
  bookingLabel: string;
  initial: Passenger[];
  onClose: () => void;
  onSave: (passengers: Passenger[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<Passenger[]>(
    // A booking always has at least one traveller, so an empty file opens ready
    // to type into rather than showing a button that has to be found first.
    initial.length ? initial : [emptyPassenger("ADT")],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const totals = useMemo(() => totalPassengers(rows), [rows]);
  const problems = useMemo(() => validatePassengers(rows), [rows]);

  const patch = (index: number, changes: Partial<Passenger>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...changes } : r)));

  /* A new row starts from the first adult's fare, scaled for its type. Only a
     suggestion and only into an empty row — an operator who has typed a
     negotiated child fare must not lose it. */
  function addRow(type: PaxType) {
    const adult = rows.find((r) => r.type === "ADT" && r.fare > 0);
    const suggested = suggestFare(type, adult?.fare ?? 0, adult?.tax ?? 0);
    setRows((prev) => [
      ...prev,
      { ...emptyPassenger(type), ...suggested, cost: 0 },
    ]);
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      await onSave(rows);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the passengers");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--dk-161b27, #161b27)", border: `1px solid ${border}`, borderRadius: 16, padding: 26, width: 880, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", fontFamily: ff, color: "var(--ink-solid, #fff)" }}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800 }}>
          Passengers on {bookingLabel}
        </h2>
        <div style={{ fontSize: 12.5, color: "rgba(var(--ink),.42)", marginBottom: 18, lineHeight: 1.6 }}>
          Everyone travelling on this PNR. The booking&rsquo;s value and supplier cost are added up from
          these rows, so they cannot drift apart. An infant travels on a lap and takes no seat.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 96px 1.1fr 1fr 96px 88px 96px 30px", gap: 7, alignItems: "end", marginBottom: 6 }}>
          <div style={head}>Passenger</div>
          <div style={head}>Type</div>
          <div style={head}>Passport</div>
          <div style={head}>Ticket No</div>
          <div style={{ ...head, textAlign: "right" }}>Fare</div>
          <div style={{ ...head, textAlign: "right" }}>Tax</div>
          <div style={{ ...head, textAlign: "right" }}>Our Cost</div>
          <div />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {rows.map((row, index) => (
            <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 96px 1.1fr 1fr 96px 88px 96px 30px", gap: 7, alignItems: "center" }}>
              <input value={row.name} placeholder="Full name as on passport"
                onChange={(e) => patch(index, { name: e.target.value.toUpperCase() })}
                style={{ ...cell, borderColor: row.name.trim() ? border : "rgba(239,68,68,.45)" }} />
              <select value={row.type}
                onChange={(e) => patch(index, { type: e.target.value as PaxType })}
                style={{ ...cell, background: "var(--dk-161b27, #161b27)" }}>
                {(Object.keys(PAX_TYPE_LABELS) as PaxType[]).map((t) => (
                  <option key={t} value={t}>{PAX_TYPE_LABELS[t]}</option>
                ))}
              </select>
              <input value={row.passportNo || ""} placeholder="AB1234567"
                onChange={(e) => patch(index, { passportNo: e.target.value.toUpperCase() })}
                style={cell} />
              <input value={row.ticketNo || ""} placeholder="214-1234567890"
                onChange={(e) => patch(index, { ticketNo: e.target.value })}
                style={cell} />
              <input type="number" min={0} step="any" value={row.fare}
                onChange={(e) => patch(index, { fare: Number(e.target.value) || 0 })}
                onFocus={(e) => e.currentTarget.select()}
                style={{ ...cell, textAlign: "right" }} />
              <input type="number" min={0} step="any" value={row.tax}
                onChange={(e) => patch(index, { tax: Number(e.target.value) || 0 })}
                onFocus={(e) => e.currentTarget.select()}
                style={{ ...cell, textAlign: "right" }} />
              <input type="number" min={0} step="any" value={row.cost}
                onChange={(e) => patch(index, { cost: Number(e.target.value) || 0 })}
                onFocus={(e) => e.currentTarget.select()}
                style={{ ...cell, textAlign: "right" }} />
              {/* Out of the tab order — removing a passenger is a click, not
                  something Enter should reach on the way past. */}
              <button tabIndex={-1} title="Remove passenger"
                onClick={() => setRows((prev) => (prev.length === 1 ? [emptyPassenger("ADT")] : prev.filter((_, i) => i !== index)))}
                style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(var(--ink),.45)", cursor: "pointer", padding: "7px 0" }}>×</button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {(Object.keys(PAX_TYPE_LABELS) as PaxType[]).map((t) => (
            <button key={t} onClick={() => addRow(t)}
              style={{ padding: "6px 13px", borderRadius: 8, background: "rgba(var(--ink),.05)", border: `1px solid ${border}`, color: "rgba(var(--ink),.65)", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
              + {PAX_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 18, padding: "13px 15px", borderRadius: 12, background: "rgba(56,189,248,.06)", border: "1px solid rgba(56,189,248,.22)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 12.5, color: "rgba(var(--ink),.6)" }}>
              {describeParty(totals)} · {totals.seats} seat{totals.seats === 1 ? "" : "s"}
            </span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#38bdf8", fontFamily: "ui-monospace, monospace" }}>
              {totals.sale.toLocaleString()}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(var(--ink),.42)" }}>
            <span>Fare {totals.fare.toLocaleString()} + tax {totals.tax.toLocaleString()}</span>
            <span>
              Cost {totals.cost.toLocaleString()} ·{" "}
              <strong style={{ color: totals.margin >= 0 ? "#34d399" : "#fca5a5" }}>
                margin {totals.margin.toLocaleString()}
              </strong>
            </span>
          </div>
        </div>

        {problems.length > 0 && (
          <div style={{ marginTop: 12, padding: "10px 13px", borderRadius: 10, background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.3)", color: "#fbbf24", fontSize: 12, lineHeight: 1.7 }}>
            {problems.map((p) => <div key={p}>{p}</div>)}
          </div>
        )}
        {error && (
          <div style={{ marginTop: 12, padding: "10px 13px", borderRadius: 10, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)", color: "#fca5a5", fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <button onClick={save} disabled={busy || problems.length > 0}
            style={{
              flex: 1, padding: "11px 0", border: "none", borderRadius: 9, color: "#fff",
              fontSize: 14, fontWeight: 800, fontFamily: "inherit",
              background: busy || problems.length > 0 ? "rgba(56,189,248,.35)" : "#0ea5e9",
              cursor: busy || problems.length > 0 ? "not-allowed" : "pointer",
            }}>
            {busy ? "Saving…" : `Save ${totals.count} passenger${totals.count === 1 ? "" : "s"}`}
          </button>
          <button onClick={onClose} disabled={busy}
            style={{ padding: "11px 22px", background: "transparent", border: `1px solid ${border}`, borderRadius: 9, color: "rgba(var(--ink),.65)", fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
