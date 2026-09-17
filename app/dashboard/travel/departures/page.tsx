"use client";

/**
 * Hajj & Umrah departures.
 *
 * The object the group business turns on: a dated trip with a seat quota, the
 * hotel legs it is built from, and what a pilgrim pays depending on how many
 * they share a room with.
 *
 * The rate card recalculates as the operator types, because pricing an Umrah is
 * an argument with a calculator — "if I put five in a room instead of four,
 * what can I sell it at?" — and that argument is the work. Answering it on
 * screen is the difference between this and a spreadsheet.
 */

import { useMemo, useState } from "react";

import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { useResponsive } from "@/hooks/useResponsive";
import {
  costDeparture,
  emptyDeparture,
  emptyLeg,
  occupancyName,
  readDeparture,
  roomCostPerRoom,
  seatPosition,
  totalFixed,
  totalNights,
  validateDeparture,
  type PackageFixedCosts,
  type PackageLeg,
  type UmrahDeparture,
} from "@/lib/umrahPackage";

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

const FIXED_FIELDS: { key: keyof PackageFixedCosts; label: string }[] = [
  { key: "air", label: "Air seat" },
  { key: "visa", label: "Visa" },
  { key: "transport", label: "Transport" },
  { key: "ziyarat", label: "Ziyarat" },
  { key: "meals", label: "Meals" },
  { key: "insurance", label: "Insurance" },
  { key: "misc", label: "Other" },
];

export default function DeparturesPage() {
  const { isMobile } = useResponsive();
  const store = useBusinessRecords("umrah_departure");
  const bookings = useBusinessRecords("umrah_booking");
  const [editing, setEditing] = useState<{ id: string | null; d: UmrahDeparture } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* Seats sold, counted off the bookings rather than kept as a number on the
     departure. A stored count is a number that drifts the first time a booking
     is cancelled and nobody remembers to decrement it. */
  const soldByDeparture = useMemo(() => {
    const by = new Map<string, number>();
    for (const b of bookings.records) {
      if (b.status === "cancelled") continue;
      const key = b.refId || "";
      if (!key) continue;
      const pax = Number((b.data as { pax?: unknown })?.pax) || 0;
      by.set(key, (by.get(key) || 0) + pax);
    }
    return by;
  }, [bookings.records]);

  const rows = useMemo(
    () => store.records.map((r) => ({ id: r.id, status: r.status, d: readDeparture(r.data) })),
    [store.records],
  );

  const problems = useMemo(() => (editing ? validateDeparture(editing.d) : []), [editing]);
  const card = useMemo(() => (editing ? costDeparture(editing.d) : []), [editing]);

  const patch = (changes: Partial<UmrahDeparture>) =>
    setEditing((prev) => (prev ? { ...prev, d: { ...prev.d, ...changes } } : prev));

  const patchLeg = (id: string, changes: Partial<PackageLeg>) =>
    patch({ legs: (editing?.d.legs ?? []).map((l) => (l.id === id ? { ...l, ...changes } : l)) });

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: editing.d.title || editing.d.tripNumber || "Departure",
        status: "open",
        date: editing.d.departureDate,
        data: editing.d as unknown as Record<string, unknown>,
      };
      if (editing.id) await store.update(editing.id, payload);
      else await store.create(payload);
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the departure");
    } finally {
      setSaving(false);
    }
  }

  // ── Editor ───────────────────────────────────────────────────────────────
  if (editing) {
    const d = editing.d;
    const money = (name: string, value: number, onChange: (n: number) => void) => (
      <div>
        <label style={label}>{name}</label>
        <input type="number" min={0} step="any" value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          onFocus={(e) => e.currentTarget.select()}
          style={{ ...input, textAlign: "right" }} />
      </div>
    );

    return (
      <div style={{ padding: isMobile ? "14px 12px" : "24px 28px", fontFamily: ff, color: "#fff", maxWidth: 1080 }}>
        <h1 style={{ fontSize: 21, fontWeight: 800, margin: "0 0 4px" }}>
          {editing.id ? d.title || "Departure" : "New departure"}
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", margin: 0 }}>
          {totalNights(d.legs)} nights · {d.seats || 0} seats · room {d.hotelCurrency} {roomCostPerRoom(d.legs).toLocaleString()} for the trip
        </p>

        <div style={sectionHead}>The trip</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(6,1fr)", gap: 12 }}>
          <div style={{ gridColumn: isMobile ? "span 2" : "span 2" }}>
            <label style={label}>Name</label>
            <input value={d.title} placeholder="Umrah 21 Days — Economy"
              onChange={(e) => patch({ title: e.target.value })} style={input} />
          </div>
          <div>
            <label style={label}>Kind</label>
            <select value={d.kind} onChange={(e) => patch({ kind: e.target.value as "umrah" | "hajj" })}
              style={{ ...input, background: "#161b27" }}>
              <option value="umrah">Umrah</option>
              <option value="hajj">Hajj</option>
            </select>
          </div>
          <div>
            <label style={label}>Trip Number</label>
            <input value={d.tripNumber} onChange={(e) => patch({ tripNumber: e.target.value })} style={input} />
          </div>
          <div>
            <label style={label}>Departs</label>
            <input type="date" value={d.departureDate} onChange={(e) => patch({ departureDate: e.target.value })} style={input} />
          </div>
          <div>
            <label style={label}>Returns</label>
            <input type="date" value={d.returnDate} onChange={(e) => patch({ returnDate: e.target.value })} style={input} />
          </div>
          {money("Seat quota", d.seats, (n) => patch({ seats: n }))}
          <div>
            <label style={label}>Hotel currency</label>
            <input value={d.hotelCurrency} onChange={(e) => patch({ hotelCurrency: e.target.value.toUpperCase() })} style={input} />
          </div>
          {/* Stored on the departure, not read live. A trip costed in March must
              not re-cost itself in June because the riyal moved. */}
          {money(`1 ${d.hotelCurrency || "SAR"} =`, d.hotelRate, (n) => patch({ hotelRate: n }))}
        </div>

        <div style={sectionHead}>Hotel legs — rate is per room, per night</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {d.legs.map((leg) => (
            <div key={leg.id} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "130px 1.8fr 90px 130px 150px 30px", gap: 9, alignItems: "end" }}>
              <div>
                <label style={label}>City</label>
                <input value={leg.city} onChange={(e) => patchLeg(leg.id, { city: e.target.value })} style={input} />
              </div>
              <div>
                <label style={label}>Hotel</label>
                <input value={leg.hotelName} onChange={(e) => patchLeg(leg.id, { hotelName: e.target.value.toUpperCase() })} style={input} />
              </div>
              <div>
                <label style={label}>Nights</label>
                <input type="number" min={0} value={leg.nights}
                  onChange={(e) => patchLeg(leg.id, { nights: Number(e.target.value) || 0 })}
                  onFocus={(e) => e.currentTarget.select()} style={{ ...input, textAlign: "right" }} />
              </div>
              <div>
                <label style={label}>{d.hotelCurrency}/room/night</label>
                <input type="number" min={0} step="any" value={leg.roomRatePerNight}
                  onChange={(e) => patchLeg(leg.id, { roomRatePerNight: Number(e.target.value) || 0 })}
                  onFocus={(e) => e.currentTarget.select()} style={{ ...input, textAlign: "right" }} />
              </div>
              <div>
                <label style={label}>Leg total</label>
                <div style={{ ...input, background: "rgba(56,189,248,.07)", borderColor: "rgba(56,189,248,.25)", textAlign: "right", color: accent, fontWeight: 700 }}>
                  {(leg.nights * leg.roomRatePerNight).toLocaleString()}
                </div>
              </div>
              <button tabIndex={-1} title="Remove leg"
                onClick={() => patch({ legs: d.legs.filter((l) => l.id !== leg.id) })}
                style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.45)", cursor: "pointer", padding: "8px 0" }}>×</button>
            </div>
          ))}
        </div>
        <button onClick={() => patch({ legs: [...d.legs, emptyLeg("Makkah")] })}
          style={{ marginTop: 10, padding: "7px 14px", borderRadius: 8, background: "rgba(255,255,255,.05)", border: `1px solid ${border}`, color: "rgba(255,255,255,.65)", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
          + Add leg
        </button>

        <div style={sectionHead}>Per pilgrim, whoever they share with</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(7,1fr)", gap: 10 }}>
          {FIXED_FIELDS.map((f) =>
            money(f.label, d.fixed[f.key], (n) => patch({ fixed: { ...d.fixed, [f.key]: n } })),
          )}
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,.42)" }}>
          Fixed cost per pilgrim: <strong style={{ color: "#fff" }}>{totalFixed(d.fixed).toLocaleString()}</strong>
        </div>

        <div style={sectionHead}>Pricing</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {(["sharing", "flat"] as const).map((mode) => (
            <button key={mode} onClick={() => patch({ pricingMode: mode })}
              style={{
                padding: "7px 16px", borderRadius: 9, fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
                background: d.pricingMode === mode ? "rgba(56,189,248,.16)" : "rgba(255,255,255,.04)",
                border: `1px solid ${d.pricingMode === mode ? "rgba(56,189,248,.45)" : border}`,
                color: d.pricingMode === mode ? accent : "rgba(255,255,255,.6)",
              }}>
              {mode === "sharing" ? "Per sharing" : "One flat price"}
            </button>
          ))}
        </div>

        {d.pricingMode === "flat" && (
          <div style={{ maxWidth: 260, marginBottom: 14 }}>
            {money("Flat price per pilgrim", d.flatPrice, (n) => patch({ flatPrice: n }))}
          </div>
        )}

        {/* The rate card. Recalculates as the room rate, the nights or the
            sharing change, because pricing an Umrah is an argument with a
            calculator and this is the answer to it. */}
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.2fr 1fr 80px 34px", gap: 8, padding: "9px 14px", background: "rgba(255,255,255,.03)", fontSize: 10.5, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "rgba(255,255,255,.38)" }}>
            <span>Sharing</span><span style={{ textAlign: "right" }}>Room</span><span style={{ textAlign: "right" }}>Cost</span>
            <span style={{ textAlign: "right" }}>Sells for</span><span style={{ textAlign: "right" }}>Margin</span><span style={{ textAlign: "right" }}>%</span><span />
          </div>
          {card.map((t, i) => (
            <div key={t.occupancy} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.2fr 1fr 80px 34px", gap: 8, padding: "9px 14px", alignItems: "center", borderTop: `1px solid ${border}`, fontSize: 13 }}>
              <span style={{ fontWeight: 700 }}>
                {t.tierName} <span style={{ color: "rgba(255,255,255,.35)", fontWeight: 500 }}>({t.occupancy})</span>
              </span>
              <span style={{ textAlign: "right", color: "rgba(255,255,255,.55)", fontFamily: "ui-monospace, monospace" }}>{t.roomCost.toLocaleString()}</span>
              <span style={{ textAlign: "right", fontFamily: "ui-monospace, monospace" }}>{t.costPerPilgrim.toLocaleString()}</span>
              <span style={{ textAlign: "right" }}>
                {d.pricingMode === "flat" ? (
                  <span style={{ fontFamily: "ui-monospace, monospace", color: "rgba(255,255,255,.55)" }}>{t.sellPerPilgrim.toLocaleString()}</span>
                ) : (
                  <input type="number" min={0} step="any" value={d.tiers[i]?.sellPrice ?? 0}
                    onChange={(e) => patch({ tiers: d.tiers.map((x, xi) => (xi === i ? { ...x, sellPrice: Number(e.target.value) || 0 } : x)) })}
                    onFocus={(e) => e.currentTarget.select()}
                    style={{ ...input, textAlign: "right", padding: "6px 9px" }} />
                )}
              </span>
              <span style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700, color: t.marginPerPilgrim >= 0 ? "#34d399" : "#fca5a5" }}>
                {t.marginPerPilgrim.toLocaleString()}
              </span>
              <span style={{ textAlign: "right", fontSize: 12, color: "rgba(255,255,255,.45)" }}>{t.marginPercent}%</span>
              {d.pricingMode === "sharing" ? (
                <button tabIndex={-1} title="Remove tier"
                  onClick={() => patch({ tiers: d.tiers.filter((_, xi) => xi !== i) })}
                  style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: 7, color: "rgba(255,255,255,.4)", cursor: "pointer", padding: "5px 0" }}>×</button>
              ) : <span />}
            </div>
          ))}
        </div>
        {d.pricingMode === "sharing" && (
          <button onClick={() => patch({ tiers: [...d.tiers, { occupancy: (d.tiers.at(-1)?.occupancy ?? 4) + 1, sellPrice: 0 }] })}
            style={{ marginTop: 10, padding: "7px 14px", borderRadius: 8, background: "rgba(255,255,255,.05)", border: `1px solid ${border}`, color: "rgba(255,255,255,.65)", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
            + Add sharing option
          </button>
        )}

        {problems.length > 0 && (
          <div style={{ marginTop: 18, padding: "12px 15px", borderRadius: 12, background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.3)", color: "#fbbf24", fontSize: 12.5, lineHeight: 1.8 }}>
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
            {saving ? "Saving…" : "Save departure"}
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
  return (
    <div style={{ padding: isMobile ? "14px 12px" : "24px 28px", fontFamily: ff, color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Hajj &amp; Umrah Departures</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", margin: 0 }}>
            A dated trip with a seat quota. One departure, one price per sharing option — because a room costs
            what it costs and the pilgrims in it split that.
          </p>
        </div>
        <button onClick={() => setEditing({ id: null, d: emptyDeparture("umrah") })}
          style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: accent, color: "#04202e", fontSize: 13, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>
          + New Departure
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map((row) => {
          const seats = seatPosition(row.d.seats, soldByDeparture.get(row.id) || 0);
          const tiers = costDeparture(row.d);
          const cheapest = tiers.filter((t) => t.sellPerPilgrim > 0).sort((a, b) => a.sellPerPilgrim - b.sellPerPilgrim)[0];
          return (
            <div key={row.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 800 }}>
                    {row.d.title || "—"}
                    <span style={{ marginLeft: 9, fontSize: 10.5, padding: "2px 8px", borderRadius: 999, background: "rgba(56,189,248,.14)", color: accent, fontWeight: 800, textTransform: "uppercase" }}>
                      {row.d.kind}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", marginTop: 4 }}>
                    {row.d.tripNumber ? `${row.d.tripNumber} · ` : ""}
                    {row.d.departureDate || "no date"} → {row.d.returnDate || "—"} · {totalNights(row.d.legs)} nights ·{" "}
                    {row.d.legs.filter((l) => l.nights > 0).map((l) => `${l.city} ${l.nights}`).join(" → ") || "no legs"}
                  </div>
                </div>
                <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {cheapest ? (
                    <>
                      <div style={{ fontSize: 17, fontWeight: 800, color: accent }}>{cheapest.sellPerPilgrim.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>from · {cheapest.tierName.toLowerCase()}</div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>not priced</div>
                  )}
                </div>
              </div>

              {/* Seats, because a departure is a quota before it is anything
                  else — an operator's first question is how many are left. */}
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 220px", minWidth: 180 }}>
                  <div style={{ background: "rgba(255,255,255,.07)", height: 7, borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${seats.percent}%`, height: "100%", background: seats.over > 0 ? "#ef4444" : seats.percent >= 90 ? "#fbbf24" : "#22c55e" }} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>
                  <strong style={{ color: "#fff" }}>{seats.sold}</strong> of {seats.quota} sold ·{" "}
                  {seats.over > 0
                    ? <span style={{ color: "#fca5a5", fontWeight: 700 }}>{seats.over} over quota</span>
                    : <span style={{ color: seats.left === 0 ? "#fbbf24" : "inherit" }}>{seats.left} left</span>}
                </div>
                <button onClick={() => setEditing({ id: row.id, d: row.d })}
                  style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,.05)", border: `1px solid ${border}`, color: "rgba(255,255,255,.7)", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
                  Edit &amp; price
                </button>
              </div>

              {tiers.some((t) => t.sellPerPilgrim > 0) && (
                <div style={{ marginTop: 11, display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {tiers.filter((t) => t.sellPerPilgrim > 0).map((t) => (
                    <span key={t.occupancy} style={{ fontSize: 11.5, padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,.04)", border: `1px solid ${border}`, color: "rgba(255,255,255,.62)" }}>
                      {occupancyName(t.occupancy)}{" "}
                      <strong style={{ color: "#fff", fontFamily: "ui-monospace, monospace" }}>{t.sellPerPilgrim.toLocaleString()}</strong>
                      <span style={{ color: t.marginPerPilgrim >= 0 ? "#34d399" : "#fca5a5", marginLeft: 6 }}>+{t.marginPercent}%</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!store.loading && rows.length === 0 && (
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 40, textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 13.5 }}>
            No departures yet.
          </div>
        )}
      </div>
    </div>
  );
}
