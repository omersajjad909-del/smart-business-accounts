"use client";

/**
 * Bookings against a departure.
 *
 * A family books in June for October, puts down an advance and clears the rest
 * before the visa is filed. So the screen is built around a balance and its
 * instalments rather than around a sale: the operator's daily question is who
 * owes what, and whether anyone is about to fly with money outstanding.
 */

import { useMemo, useState } from "react";

import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { useResponsive } from "@/hooks/useResponsive";
import {
  bookingMoney,
  emptyBooking,
  emptyInstalment,
  emptyPilgrim,
  readBooking,
  suggestSchedule,
  validateBooking,
  type BookingStatus,
  type Instalment,
  type UmrahBooking,
} from "@/lib/umrahBooking";
import { costDeparture, occupancyName, readDeparture } from "@/lib/umrahPackage";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.08)";
const accent = "#38bdf8";

const input: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,.05)", border: `1px solid ${border}`,
  borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 13,
  fontFamily: "inherit", boxSizing: "border-box",
};
const label: React.CSSProperties = {
  display: "block", fontSize: 11.5, color: "rgba(255,255,255,.45)", marginBottom: 5,
};
const sectionHead: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase",
  color: "rgba(255,255,255,.4)", margin: "22px 0 10px",
};

const STATUS_COLOUR: Record<BookingStatus, string> = {
  enquiry: "#818cf8", confirmed: "#22c55e", travelled: "#38bdf8", cancelled: "#6b7280",
};

export default function BookingsPage() {
  const { isMobile } = useResponsive();
  const store = useBusinessRecords("umrah_booking");
  const departuresStore = useBusinessRecords("umrah_departure");
  const [editing, setEditing] = useState<{ id: string | null; b: UmrahBooking } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const departures = useMemo(
    () => departuresStore.records.map((r) => ({ id: r.id, d: readDeparture(r.data) })),
    [departuresStore.records],
  );

  const rows = useMemo(
    () => store.records.map((r) => {
      const b = readBooking(r.data);
      return { id: r.id, b, money: bookingMoney(b, today) };
    }),
    [store.records, today],
  );

  const chosenDeparture = editing ? departures.find((x) => x.id === editing.b.departureId) : undefined;
  const money = useMemo(
    () => (editing ? bookingMoney(editing.b, today) : null),
    [editing, today],
  );
  const problems = useMemo(
    () => (editing && money ? validateBooking(editing.b, money, chosenDeparture?.d.departureDate) : []),
    [editing, money, chosenDeparture],
  );

  const patch = (changes: Partial<UmrahBooking>) =>
    setEditing((prev) => (prev ? { ...prev, b: { ...prev.b, ...changes } } : prev));

  const patchInstalment = (id: string, changes: Partial<Instalment>) =>
    patch({ instalments: (editing?.b.instalments ?? []).map((i) => (i.id === id ? { ...i, ...changes } : i)) });

  /* Picking a departure or a sharing option seeds the price off that
     departure's rate card — and then leaves it editable, because it is
     negotiated. A price that cannot be argued down is a price nobody here
     would use. */
  function applyRateCard(departureId: string, occupancy: number) {
    const dep = departures.find((x) => x.id === departureId);
    if (!dep) return;
    const tier = costDeparture(dep.d).find((t) => t.occupancy === occupancy);
    patch({
      departureId,
      departureTitle: dep.d.title,
      occupancy,
      ...(tier && tier.sellPerPilgrim > 0 ? { pricePerPilgrim: tier.sellPerPilgrim } : {}),
    });
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const m = bookingMoney(editing.b, today);
      const payload = {
        title: editing.b.bookingNo || editing.b.partyName || "Booking",
        status: editing.b.status,
        // refId links the booking to its departure. The departures screen
        // counts seats off this rather than keeping a number of its own.
        refId: editing.b.departureId,
        amount: m.total,
        date: chosenDeparture?.d.departureDate || today,
        data: { ...editing.b, pax: m.pax } as unknown as Record<string, unknown>,
      };
      if (editing.id) await store.update(editing.id, payload);
      else await store.create(payload);
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the booking");
    } finally {
      setSaving(false);
    }
  }

  // ── Editor ───────────────────────────────────────────────────────────────
  if (editing && money) {
    const b = editing.b;
    const tiers = chosenDeparture ? costDeparture(chosenDeparture.d) : [];

    return (
      <div style={{ padding: isMobile ? "14px 12px" : "24px 28px", fontFamily: ff, color: "#fff", maxWidth: 1040 }}>
        <h1 style={{ fontSize: 21, fontWeight: 800, margin: "0 0 4px" }}>
          {editing.id ? b.partyName || "Booking" : "New booking"}
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", margin: 0 }}>
          {money.pax} pilgrim{money.pax === 1 ? "" : "s"} · {money.total.toLocaleString()} total ·{" "}
          <strong style={{ color: money.balance > 0 ? "#fbbf24" : "#34d399" }}>
            {money.balance > 0 ? `${money.balance.toLocaleString()} owing` : "paid in full"}
          </strong>
        </p>

        <div style={sectionHead}>The party</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,1fr)", gap: 12 }}>
          <div>
            <label style={label}>Booking No</label>
            <input value={b.bookingNo} onChange={(e) => patch({ bookingNo: e.target.value })} style={input} />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={label}>Lead name</label>
            <input value={b.partyName} onChange={(e) => patch({ partyName: e.target.value })} style={input} />
          </div>
          <div>
            <label style={label}>Phone</label>
            <input value={b.phone} onChange={(e) => patch({ phone: e.target.value })} style={input} />
          </div>
          <div>
            <label style={label}>Status</label>
            <select value={b.status} onChange={(e) => patch({ status: e.target.value as BookingStatus })}
              style={{ ...input, background: "#161b27" }}>
              {(["enquiry", "confirmed", "travelled", "cancelled"] as BookingStatus[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={sectionHead}>Departure &amp; price</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={label}>Departure</label>
            <select value={b.departureId} onChange={(e) => applyRateCard(e.target.value, b.occupancy)}
              style={{ ...input, background: "#161b27" }}>
              <option value="">— Pick a departure —</option>
              {departures.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.d.title || "Untitled"}{x.d.departureDate ? ` · ${x.d.departureDate}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Sharing</label>
            <select value={b.occupancy} onChange={(e) => applyRateCard(b.departureId, Number(e.target.value))}
              style={{ ...input, background: "#161b27" }}>
              {(tiers.length ? tiers.map((t) => t.occupancy) : [1, 2, 3, 4, 5]).map((n) => (
                <option key={n} value={n}>{occupancyName(n)} ({n})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Price per pilgrim</label>
            <input type="number" min={0} step="any" value={b.pricePerPilgrim}
              onChange={(e) => patch({ pricePerPilgrim: Number(e.target.value) || 0 })}
              onFocus={(e) => e.currentTarget.select()}
              style={{ ...input, textAlign: "right" }} />
          </div>
        </div>
        {tiers.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 11.5, color: "rgba(255,255,255,.38)" }}>
            Rate card: {tiers.filter((t) => t.sellPerPilgrim > 0).map((t) => `${t.tierName} ${t.sellPerPilgrim.toLocaleString()}`).join(" · ") || "not priced"}
          </div>
        )}

        <div style={sectionHead}>Pilgrims</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {b.pilgrims.map((p) => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1.3fr 110px 80px 30px", gap: 9, alignItems: "end" }}>
              <div>
                <label style={label}>Name</label>
                <input value={p.name}
                  onChange={(e) => patch({ pilgrims: b.pilgrims.map((x) => (x.id === p.id ? { ...x, name: e.target.value.toUpperCase() } : x)) })}
                  style={input} />
              </div>
              <div>
                <label style={label}>Passport No</label>
                <input value={p.passportNo}
                  onChange={(e) => patch({ pilgrims: b.pilgrims.map((x) => (x.id === p.id ? { ...x, passportNo: e.target.value.toUpperCase() } : x)) })}
                  style={input} />
              </div>
              <div>
                <label style={label}>Gender</label>
                <select value={p.gender}
                  onChange={(e) => patch({ pilgrims: b.pilgrims.map((x) => (x.id === p.id ? { ...x, gender: e.target.value as "Male" | "Female" } : x)) })}
                  style={{ ...input, background: "#161b27" }}>
                  <option>Male</option><option>Female</option>
                </select>
              </div>
              <div>
                <label style={label}>Age</label>
                <input type="number" min={0} value={p.age}
                  onChange={(e) => patch({ pilgrims: b.pilgrims.map((x) => (x.id === p.id ? { ...x, age: e.target.value === "" ? "" : Number(e.target.value) } : x)) })}
                  onFocus={(e) => e.currentTarget.select()} style={input} />
              </div>
              <button tabIndex={-1} title="Remove pilgrim"
                onClick={() => patch({ pilgrims: b.pilgrims.length === 1 ? [emptyPilgrim()] : b.pilgrims.filter((x) => x.id !== p.id) })}
                style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.45)", cursor: "pointer", padding: "8px 0" }}>×</button>
            </div>
          ))}
        </div>
        <button onClick={() => patch({ pilgrims: [...b.pilgrims, emptyPilgrim()] })}
          style={{ marginTop: 10, padding: "7px 14px", borderRadius: 8, background: "rgba(255,255,255,.05)", border: `1px solid ${border}`, color: "rgba(255,255,255,.65)", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
          + Add pilgrim
        </button>

        <div style={sectionHead}>Instalments</div>
        {b.instalments.length === 0 ? (
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)", marginBottom: 12, lineHeight: 1.7 }}>
              Nothing scheduled. {money.total > 0 ? `${money.total.toLocaleString()} is owed` : "Set a price first"} —
              a balance with no dates on it is a balance nobody will chase.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[2, 3, 4].map((n) => (
                <button key={n} disabled={money.total <= 0}
                  onClick={() => patch({
                    instalments: suggestSchedule(money.total, n, today, chosenDeparture?.d.departureDate || ""),
                  })}
                  style={{
                    padding: "7px 14px", borderRadius: 8, background: "rgba(56,189,248,.12)",
                    border: "1px solid rgba(56,189,248,.32)", color: accent, fontSize: 12, fontWeight: 700,
                    fontFamily: "inherit", cursor: money.total > 0 ? "pointer" : "not-allowed",
                    opacity: money.total > 0 ? 1 : .4,
                  }}>
                  Split into {n}
                </button>
              ))}
              <button onClick={() => patch({ instalments: [emptyInstalment(today, money.total)] })}
                style={{ padding: "7px 14px", borderRadius: 8, background: "rgba(255,255,255,.05)", border: `1px solid ${border}`, color: "rgba(255,255,255,.65)", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
                One payment
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {b.instalments.map((inst) => {
                const late = !inst.paidDate && inst.dueDate && inst.dueDate < today;
                return (
                  <div key={inst.id} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "150px 150px 150px 1fr 96px 30px", gap: 9, alignItems: "end" }}>
                    <div>
                      <label style={label}>Due</label>
                      <input type="date" value={inst.dueDate}
                        onChange={(e) => patchInstalment(inst.id, { dueDate: e.target.value })}
                        style={{ ...input, borderColor: late ? "rgba(251,191,36,.5)" : border }} />
                    </div>
                    <div>
                      <label style={label}>Amount</label>
                      <input type="number" min={0} step="any" value={inst.amount}
                        onChange={(e) => patchInstalment(inst.id, { amount: Number(e.target.value) || 0 })}
                        onFocus={(e) => e.currentTarget.select()}
                        style={{ ...input, textAlign: "right" }} />
                    </div>
                    <div>
                      <label style={label}>Paid on</label>
                      <input type="date" value={inst.paidDate || ""}
                        onChange={(e) => patchInstalment(inst.id, { paidDate: e.target.value })}
                        style={input} />
                    </div>
                    <div>
                      <label style={label}>Receipt / CRV</label>
                      <input value={inst.receiptNo || ""} placeholder="CRV-121"
                        onChange={(e) => patchInstalment(inst.id, { receiptNo: e.target.value })}
                        style={input} />
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, paddingBottom: 10, textAlign: "right", color: inst.paidDate ? "#34d399" : late ? "#fbbf24" : "rgba(255,255,255,.35)" }}>
                      {inst.paidDate ? "paid" : late ? "overdue" : "due"}
                    </div>
                    <button tabIndex={-1} title="Remove instalment"
                      onClick={() => patch({ instalments: b.instalments.filter((x) => x.id !== inst.id) })}
                      style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.45)", cursor: "pointer", padding: "8px 0" }}>×</button>
                  </div>
                );
              })}
            </div>
            <button onClick={() => patch({ instalments: [...b.instalments, emptyInstalment(today, Math.max(money.unscheduled, 0))] })}
              style={{ marginTop: 10, padding: "7px 14px", borderRadius: 8, background: "rgba(255,255,255,.05)", border: `1px solid ${border}`, color: "rgba(255,255,255,.65)", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
              + Add instalment
            </button>
          </>
        )}

        <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 12, background: "rgba(56,189,248,.06)", border: "1px solid rgba(56,189,248,.22)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
            <span style={{ color: "rgba(255,255,255,.6)" }}>{money.pax} × {b.pricePerPilgrim.toLocaleString()}</span>
            <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>{money.total.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "rgba(255,255,255,.45)" }}>
            <span>Paid ({money.percentPaid}%)</span>
            <span style={{ fontFamily: "ui-monospace, monospace", color: "#34d399" }}>{money.paid.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${border}` }}>
            <span>Balance</span>
            <span style={{ fontFamily: "ui-monospace, monospace", color: money.balance > 0 ? "#fbbf24" : "#34d399" }}>
              {money.balance.toLocaleString()}
            </span>
          </div>
          {/* Money that belongs to the booking with no date against it. Not the
              same as a balance: a dated balance gets chased, this does not. */}
          {Math.abs(money.unscheduled) > 0.01 && (
            <div style={{ marginTop: 8, fontSize: 11.5, color: "#fbbf24" }}>
              {money.unscheduled > 0
                ? `${money.unscheduled.toLocaleString()} is not on any instalment — nothing is watching for it.`
                : `Instalments come to ${Math.abs(money.unscheduled).toLocaleString()} more than the booking is worth.`}
            </div>
          )}
        </div>

        {problems.length > 0 && (
          <div style={{ marginTop: 16, padding: "12px 15px", borderRadius: 12, background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.3)", color: "#fbbf24", fontSize: 12.5, lineHeight: 1.8 }}>
            {problems.map((p) => <div key={p}>{p}</div>)}
          </div>
        )}
        {error && (
          <div style={{ marginTop: 14, padding: "10px 13px", borderRadius: 10, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)", color: "#fca5a5", fontSize: 12.5 }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button onClick={save} disabled={saving || problems.length > 0}
            style={{
              padding: "11px 26px", border: "none", borderRadius: 9, color: "#04202e",
              fontSize: 14, fontWeight: 800, fontFamily: "inherit",
              background: saving || problems.length > 0 ? "rgba(56,189,248,.35)" : accent,
              cursor: saving || problems.length > 0 ? "not-allowed" : "pointer",
            }}>
            {saving ? "Saving…" : "Save booking"}
          </button>
          <button onClick={() => setEditing(null)}
            style={{ padding: "11px 20px", background: "transparent", border: `1px solid ${border}`, borderRadius: 9, color: "rgba(255,255,255,.6)", fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────
  const owed = rows.filter((r) => r.b.status !== "cancelled").reduce((s, r) => s + r.money.balance, 0);
  const late = rows.filter((r) => r.b.status !== "cancelled" && r.money.overdue > 0);

  return (
    <div style={{ padding: isMobile ? "14px 12px" : "24px 28px", fontFamily: ff, color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Bookings</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", margin: 0 }}>
            Who is on which departure, and what they still owe.
          </p>
        </div>
        <button onClick={() => setEditing({ id: null, b: emptyBooking() })}
          style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: accent, color: "#04202e", fontSize: 13, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>
          + New Booking
        </button>
      </div>

      {/* The two numbers an operator opens this page for. */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Bookings", value: rows.filter((r) => r.b.status !== "cancelled").length, colour: accent },
          { label: "Still owed", value: owed.toLocaleString(), colour: owed > 0 ? "#fbbf24" : "#22c55e" },
          { label: "Overdue instalments", value: late.reduce((s, r) => s + r.money.overdueCount, 0), colour: late.length ? "#ef4444" : "#22c55e" },
        ].map((c) => (
          <div key={c.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "15px 18px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 5 }}>{c.label}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: c.colour }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((row) => (
          <div key={row.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "15px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>
                  {row.b.partyName || "—"}
                  <span style={{ marginLeft: 9, fontSize: 10.5, padding: "2px 8px", borderRadius: 999, background: `${STATUS_COLOUR[row.b.status]}22`, color: STATUS_COLOUR[row.b.status], fontWeight: 800, textTransform: "uppercase" }}>
                    {row.b.status}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", marginTop: 4 }}>
                  {row.b.bookingNo ? `${row.b.bookingNo} · ` : ""}
                  {row.b.departureTitle || "no departure"} · {row.money.pax} pax · {occupancyName(row.b.occupancy)}
                  {row.money.nextDue ? ` · next ${row.money.nextDue.dueDate}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: row.money.balance > 0 ? "#fbbf24" : "#34d399" }}>
                  {row.money.balance > 0 ? row.money.balance.toLocaleString() : "clear"}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>
                  {row.money.paid.toLocaleString()} of {row.money.total.toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 11, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px", minWidth: 160, background: "rgba(255,255,255,.07)", height: 6, borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${row.money.percentPaid}%`, height: "100%", background: row.money.overdue > 0 ? "#ef4444" : row.money.balance > 0 ? "#fbbf24" : "#22c55e" }} />
              </div>
              {row.money.overdue > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fca5a5" }}>
                  {row.money.overdue.toLocaleString()} overdue
                </span>
              )}
              <button onClick={() => setEditing({ id: row.id, b: row.b })}
                style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,.05)", border: `1px solid ${border}`, color: "rgba(255,255,255,.7)", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
                Open
              </button>
            </div>
          </div>
        ))}
        {!store.loading && rows.length === 0 && (
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 40, textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 13.5 }}>
            No bookings yet.
          </div>
        )}
      </div>
    </div>
  );
}
