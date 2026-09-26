"use client";

/**
 * Umrah / Hajj vouchers.
 *
 * The document the pilgrim actually carries, and the first screen in this
 * module built for the trade rather than adapted from a general booking form.
 * A trip is several hotel stays in order, a party of pilgrims, and two flights
 * — none of which fits a flat set of fields, which is why this is its own page
 * and not another BusinessRecordWorkspace.
 */

import { useMemo, useState, useEffect } from "react";

import { alertToast } from "@/lib/toast-feedback";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { useResponsive } from "@/hooks/useResponsive";
import {
  emptyPilgrim,
  emptyStay,
  fmtVoucherDate,
  nightsBetween,
  readVoucher,
  totalNights,
  validateVoucher,
  type UmrahVoucher,
  type VoucherHotelStay,
  type VoucherPilgrim,
} from "@/lib/umrahVoucher";
import { VoucherPrint } from "./VoucherPrint";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.08)";
const accent = "#38bdf8";

const input: React.CSSProperties = {
  width: "100%", background: "rgba(var(--ink),.05)", border: `1px solid ${border}`,
  borderRadius: 8, padding: "8px 10px", color: "var(--ink-solid, #fff)", fontSize: 13,
  fontFamily: "inherit", boxSizing: "border-box",
};
const label: React.CSSProperties = {
  display: "block", fontSize: 11.5, color: "rgba(var(--ink),.45)", marginBottom: 5,
};
const sectionHead: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase",
  color: "rgba(var(--ink),.4)", margin: "22px 0 10px",
};

function blankVoucher(): UmrahVoucher {
  return {
    agentName: "", subAgent: "", mainAgent: "", tripNumber: "",
    entryDate: new Date().toISOString().slice(0, 10), enteredBy: "",
    guestName: "", careOf: "", reference: "", pnr: "",
    arrival: { flightNo: "", date: "", sector: "", terminal: "", time: "" },
    departure: { flightNo: "", date: "", sector: "", terminal: "", time: "" },
    // Madinah, Makkah, Madinah — the shape of nearly every trip, so the form
    // opens on it rather than on one empty row that has to be added to twice.
    stays: [emptyStay("Madinah"), emptyStay("Makkah"), emptyStay("Madinah")],
    pilgrims: [emptyPilgrim()],
    remarks: "", notice: "", terms: "", makkahStaff: "", madinahStaff: "", qrUrl: "",
  };
}

export default function UmrahVouchersPage() {
  /* The saved default, pulled once and used to seed a voucher that has no
     terms of its own yet — a new one, or one created before this existed. */
  const [defaultTerms, setDefaultTerms] = useState("");
  useEffect(() => {
    fetch("/api/travel/voucher-terms")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => { if (b?.terms) setDefaultTerms(String(b.terms)); })
      .catch(() => {});
  }, []);

  const { isMobile } = useResponsive();
  const store = useBusinessRecords("umrah_voucher");
  const [editing, setEditing] = useState<{ id: string | null; v: UmrahVoucher } | null>(null);

  /* A voucher opened with no terms of its own takes the agency's default —
     a new one, or an old one created before terms existed. One that already
     carries terms is left exactly as it was issued. */
  useEffect(() => {
    if (!defaultTerms || !editing) return;
    if (editing.v.terms) return;
    setEditing((current) =>
      current && !current.v.terms ? { ...current, v: { ...current.v, terms: defaultTerms } } : current,
    );
  }, [defaultTerms, editing]);
  const [previewing, setPreviewing] = useState<UmrahVoucher | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const rows = useMemo(
    () => store.records.map((r) => ({ id: r.id, status: r.status, v: readVoucher(r.data) })),
    [store.records],
  );

  const problems = useMemo(() => (editing ? validateVoucher(editing.v) : []), [editing]);

  const patch = (changes: Partial<UmrahVoucher>) =>
    setEditing((prev) => (prev ? { ...prev, v: { ...prev.v, ...changes } } : prev));

  const patchStay = (id: string, changes: Partial<VoucherHotelStay>) =>
    patch({ stays: (editing?.v.stays ?? []).map((s) => (s.id === id ? { ...s, ...changes } : s)) });

  const patchPilgrim = (id: string, changes: Partial<VoucherPilgrim>) =>
    patch({ pilgrims: (editing?.v.pilgrims ?? []).map((p) => (p.id === id ? { ...p, ...changes } : p)) });

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: editing.v.tripNumber || editing.v.guestName || "Voucher",
        status: "issued",
        date: editing.v.arrival.date || editing.v.entryDate,
        data: editing.v as unknown as Record<string, unknown>,
      };
      if (editing.id) await store.update(editing.id, payload);
      else await store.create(payload);
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the voucher");
    } finally {
      setSaving(false);
    }
  }

  // ── Print view ───────────────────────────────────────────────────────────
  if (previewing) {
    return (
      <div style={{ padding: isMobile ? "14px 12px" : "24px 28px", fontFamily: ff }}>
        <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <button onClick={() => window.print()}
            style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: accent, color: "#04202e", fontSize: 13, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>
            Print voucher
          </button>
          <button onClick={() => setPreviewing(null)}
            style={{ padding: "9px 18px", borderRadius: 9, background: "transparent", border: `1px solid ${border}`, color: "rgba(var(--ink),.65)", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
            Back
          </button>
        </div>
        <VoucherPrint voucher={previewing} />
      </div>
    );
  }

  // ── Editor ───────────────────────────────────────────────────────────────
  if (editing) {
    const v = editing.v;
    const field = (name: string, value: string, onChange: (s: string) => void, type = "text", placeholder = "") => (
      <div>
        <label style={label}>{name}</label>
        <input type={type} value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)} style={input} />
      </div>
    );

    return (
      <div style={{ padding: isMobile ? "14px 12px" : "24px 28px", fontFamily: ff, color: "var(--ink-solid, #fff)", maxWidth: 1080 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 21, fontWeight: 800, margin: 0 }}>
            {editing.id ? `Voucher ${v.tripNumber || ""}` : "New voucher"}
          </h1>
          <div style={{ fontSize: 12.5, color: "rgba(var(--ink),.42)" }}>
            {v.pilgrims.length} pilgrim{v.pilgrims.length === 1 ? "" : "s"} · {totalNights(v.stays)} nights
          </div>
        </div>

        <div style={sectionHead}>Trip</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,1fr)", gap: 12 }}>
          {field("Agent Name", v.agentName, (s) => patch({ agentName: s.toUpperCase() }))}
          {field("Sub Agent", v.subAgent, (s) => patch({ subAgent: s }))}
          {field("Main Agent", v.mainAgent, (s) => patch({ mainAgent: s.toUpperCase() }))}
          {field("Trip Number", v.tripNumber, (s) => patch({ tripNumber: s }))}
          {field("Entry Date", v.entryDate, (s) => patch({ entryDate: s }), "date")}
          {field("Guest Name", v.guestName, (s) => patch({ guestName: s }))}
          {field("C/O", v.careOf || "", (s) => patch({ careOf: s }))}
          {field("Reference", v.reference || "", (s) => patch({ reference: s }))}
          {field("PNR", v.pnr || "", (s) => patch({ pnr: s.toUpperCase() }))}
          {field("Entered By", v.enteredBy || "", (s) => patch({ enteredBy: s.toUpperCase() }))}
        </div>

        <div style={sectionHead}>Flights</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 }}>
          {(["arrival", "departure"] as const).map((leg) => (
            <div key={leg} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10, textTransform: "capitalize" }}>{leg}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {field("Flight No", v[leg].flightNo, (s) => patch({ [leg]: { ...v[leg], flightNo: s.toUpperCase() } } as Partial<UmrahVoucher>))}
                {field("Date", v[leg].date, (s) => patch({ [leg]: { ...v[leg], date: s } } as Partial<UmrahVoucher>), "date")}
                {field("Sector", v[leg].sector, (s) => patch({ [leg]: { ...v[leg], sector: s } } as Partial<UmrahVoucher>), "text", "LHE - Madina")}
                {field("Terminal", v[leg].terminal, (s) => patch({ [leg]: { ...v[leg], terminal: s } } as Partial<UmrahVoucher>))}
                {field("Time", v[leg].time || "", (s) => patch({ [leg]: { ...v[leg], time: s } } as Partial<UmrahVoucher>), "text", "19:30")}
              </div>
            </div>
          ))}
        </div>

        <div style={sectionHead}>Hotel stays and Mina camp — in trip order</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {v.stays.map((stay) => {
            const nights = nightsBetween(stay.inDate, stay.outDate);
            const mina = stay.city.trim().toLowerCase() === "mina";
            return (
              <div key={stay.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : mina ? "120px 1.5fr 1.2fr 100px 1fr 1fr 80px 30px" : "120px 1.5fr 96px 1fr 1fr 110px 80px 90px 30px", gap: 9, alignItems: "end" }}>
                  {field("City", stay.city, (s) => patchStay(stay.id, { city: s }))}
                  {mina ? field("Hajj Company", stay.hajjCompanyName || "", (s) => patchStay(stay.id, { hajjCompanyName: s })) : field("Hotel", stay.hotelName, (s) => patchStay(stay.id, { hotelName: s.toUpperCase() }))}
                  {mina ? field("Maktab name", stay.maktabName || "", (s) => patchStay(stay.id, { maktabName: s })) : (
                    <div>
                      <label style={label}>Sharing</label>
                      <select value={stay.occupancy} onChange={(e) => patchStay(stay.id, { occupancy: Number(e.target.value) })} style={{ ...input, background: "var(--dk-161b27, #161b27)" }}>
                        {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} Pax</option>)}
                      </select>
                    </div>
                  )}
                  {mina ? <div>
                    <label style={label}>Maktab category</label>
                    <select value={stay.maktabCategory || ""} onChange={(e) => patchStay(stay.id, { maktabCategory: e.target.value as "A" | "B" | "C" | "D" | "" })} style={{ ...input, background: "var(--dk-161b27, #161b27)" }}>
                      <option value="">Choose</option>{["A", "B", "C", "D"].map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </div> : null}
                  {field("In Date", stay.inDate, (s) => patchStay(stay.id, { inDate: s }), "date")}
                  {field("Out Date", stay.outDate, (s) => patchStay(stay.id, { outDate: s }), "date")}
                  {!mina ? field("Room No", stay.roomNo || "", (s) => patchStay(stay.id, { roomNo: s }), "text", "Enter room number") : null}
                  {!mina ? <div>
                    <label style={label}>Rooms</label>
                    <input type="number" min={1} value={stay.rooms}
                      onChange={(e) => patchStay(stay.id, { rooms: Number(e.target.value) || 1 })}
                      onFocus={(e) => e.currentTarget.select()} style={input} />
                  </div> : null}
                  {/* Worked out, not typed. The hotel reads the nights and the
                      dates off the same voucher. */}
                  <div>
                    <label style={label}>Nights</label>
                    <div style={{ ...input, background: "rgba(56,189,248,.08)", borderColor: "rgba(56,189,248,.3)", color: nights ? accent : "rgba(var(--ink),.3)", fontWeight: 700, textAlign: "center" }}>
                      {nights || "—"}
                    </div>
                  </div>
                  <button tabIndex={-1} title="Remove stay"
                    onClick={() => patch({ stays: v.stays.filter((s) => s.id !== stay.id) })}
                    style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(var(--ink),.45)", cursor: "pointer", padding: "8px 0" }}>×</button>
                </div>
                {!mina ? <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "rgba(var(--ink),.45)", marginTop: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={stay.orSimilar !== false}
                    onChange={(e) => patchStay(stay.id, { orSimilar: e.target.checked })} />
                  Or similar hotel — printed on the voucher, because that is how the room was sold
                </label> : null}
              </div>
            );
          })}
        </div>
        <button onClick={() => patch({ stays: [...v.stays, emptyStay("Makkah")] })}
          style={{ marginTop: 10, padding: "7px 14px", borderRadius: 8, background: "rgba(var(--ink),.05)", border: `1px solid ${border}`, color: "rgba(var(--ink),.65)", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
          + Add stay
        </button>

        <div style={sectionHead}>Pilgrims</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {v.pilgrims.map((p) => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1.7fr 1.3fr 1.1fr 110px 80px 30px", gap: 9, alignItems: "end" }}>
              {field("Group Name", p.groupName, (s) => patchPilgrim(p.id, { groupName: s.toUpperCase() }))}
              {field("Pilgrim Name", p.name, (s) => patchPilgrim(p.id, { name: s.toUpperCase() }))}
              {field("Passport No", p.passportNo, (s) => patchPilgrim(p.id, { passportNo: s.toUpperCase() }))}
              <div>
                <label style={label}>Gender</label>
                <select value={p.gender} onChange={(e) => patchPilgrim(p.id, { gender: e.target.value as "Male" | "Female" })}
                  style={{ ...input, background: "var(--dk-161b27, #161b27)" }}>
                  <option>Male</option><option>Female</option>
                </select>
              </div>
              <div>
                <label style={label}>Age</label>
                <input type="number" min={0} value={p.age}
                  onChange={(e) => patchPilgrim(p.id, { age: e.target.value === "" ? "" : Number(e.target.value) })}
                  onFocus={(e) => e.currentTarget.select()} style={input} />
              </div>
              <button tabIndex={-1} title="Remove pilgrim"
                onClick={() => patch({ pilgrims: v.pilgrims.length === 1 ? [emptyPilgrim()] : v.pilgrims.filter((x) => x.id !== p.id) })}
                style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(var(--ink),.45)", cursor: "pointer", padding: "8px 0" }}>×</button>
            </div>
          ))}
        </div>
        <button
          onClick={() => patch({ pilgrims: [...v.pilgrims, emptyPilgrim(v.pilgrims[0]?.groupName || "")] })}
          style={{ marginTop: 10, padding: "7px 14px", borderRadius: 8, background: "rgba(var(--ink),.05)", border: `1px solid ${border}`, color: "rgba(var(--ink),.65)", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
          + Add pilgrim
        </button>

        <div style={sectionHead}>Notes for the voucher</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          {field("Remarks", v.remarks || "", (s) => patch({ remarks: s }), "text", "TRANSPORT BY VOUCHER # 106830")}
          {field("Red notice", v.notice || "", (s) => patch({ notice: s }), "text", "Transport will be provided by NAQA")}

          {/* Written once, reused for ever. A desk that has to retype its terms
              on every voucher is a desk whose vouchers disagree with each
              other by the end of the season. */}
          <label style={{ display: "grid", gap: 4, gridColumn: "1 / -1" }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "rgba(var(--ink),.4)" }}>
              Terms &amp; Conditions
            </span>
            <textarea
              value={v.terms || ""}
              onChange={(e) => patch({ terms: e.target.value })}
              rows={5}
              placeholder="Your agency's terms — printed at the foot of the voucher. Written once and saved as the default below."
              style={{
                width: "100%", background: "rgba(var(--ink),.05)", border: "1px solid rgba(var(--ink),.09)",
                borderRadius: 8, padding: "8px 10px", color: "var(--ink-solid, #fff)", fontSize: 12.5,
                fontFamily: "inherit", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6,
              }}
            />
            <span style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/travel/voucher-terms", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ terms: v.terms || "" }),
                  });
                  alertToast("Saved. New vouchers will start with these terms.", "success", "Default Terms Saved");
                }}
                style={{
                  border: "1px solid rgba(var(--ink),.16)", background: "rgba(var(--ink),.05)", color: "var(--ink-solid, #fff)",
                  borderRadius: 8, padding: "5px 11px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Save as default
              </button>
              <span style={{ fontSize: 10.5, color: "rgba(var(--ink),.38)" }}>
                A voucher keeps the terms it was issued with, even after the default changes.
              </span>
            </span>
          </label>
          {field("Makkah staff", v.makkahStaff || "", (s) => patch({ makkahStaff: s }), "text", "+966 58 315 6418 Qudratullah")}
          {field("Madinah staff", v.madinahStaff || "", (s) => patch({ madinahStaff: s }), "text", "SAEED +966 58 013 0848")}
          {field("QR link", v.qrUrl || "", (s) => patch({ qrUrl: s }), "text", "https://…")}
        </div>

        {problems.length > 0 && (
          <div style={{ marginTop: 18, padding: "12px 15px", borderRadius: 12, background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.3)", color: "#fbbf24", fontSize: 12.5, lineHeight: 1.8 }}>
            {problems.map((p) => <div key={p}>{p}</div>)}
          </div>
        )}
        {error && (
          <div style={{ marginTop: 14, padding: "10px 13px", borderRadius: 10, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)", color: "#fca5a5", fontSize: 12.5 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
          <button onClick={save} disabled={saving || problems.length > 0}
            style={{
              padding: "11px 26px", border: "none", borderRadius: 9, color: "#04202e",
              fontSize: 14, fontWeight: 800, fontFamily: "inherit",
              background: saving || problems.length > 0 ? "rgba(56,189,248,.35)" : accent,
              cursor: saving || problems.length > 0 ? "not-allowed" : "pointer",
            }}>
            {saving ? "Saving…" : "Save voucher"}
          </button>
          <button onClick={() => setPreviewing(v)}
            style={{ padding: "11px 20px", background: "rgba(var(--ink),.05)", border: `1px solid ${border}`, borderRadius: 9, color: "rgba(var(--ink),.75)", fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>
            Preview
          </button>
          <button onClick={() => setEditing(null)}
            style={{ padding: "11px 20px", background: "transparent", border: `1px solid ${border}`, borderRadius: 9, color: "rgba(var(--ink),.6)", fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: isMobile ? "14px 12px" : "24px 28px", fontFamily: ff, color: "var(--ink-solid, #fff)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Umrah &amp; Hajj Vouchers</h1>
          <p style={{ fontSize: 13, color: "rgba(var(--ink),.42)", margin: 0 }}>
            The arrival–departure voucher the pilgrim carries — flights, every hotel stay in order, and the party.
          </p>
        </div>
        <button onClick={() => setEditing({ id: null, v: blankVoucher() })}
          style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: accent, color: "#04202e", fontSize: 13, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>
          + New Voucher
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((row) => (
          <div key={row.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "15px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>
                {row.v.guestName || "—"}
                <span style={{ color: accent, marginLeft: 10, fontFamily: "ui-monospace, monospace" }}>{row.v.tripNumber}</span>
              </div>
              <div style={{ fontSize: 12, color: "rgba(var(--ink),.42)", marginTop: 4 }}>
                {row.v.pilgrims.length} pax · {totalNights(row.v.stays)} nights ·{" "}
                {row.v.stays.map((s) => `${s.city} ${nightsBetween(s.inDate, s.outDate)}`).join(" → ") || "no stays"}
                {row.v.arrival.date ? ` · arrives ${fmtVoucherDate(row.v.arrival.date)}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setPreviewing(row.v)}
                style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(56,189,248,.12)", border: "1px solid rgba(56,189,248,.35)", color: accent, fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
                Voucher
              </button>
              <button onClick={() => setEditing({ id: row.id, v: row.v })}
                style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(var(--ink),.05)", border: `1px solid ${border}`, color: "rgba(var(--ink),.7)", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
                Edit
              </button>
            </div>
          </div>
        ))}
        {!store.loading && rows.length === 0 && (
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 40, textAlign: "center", color: "rgba(var(--ink),.3)", fontSize: 13.5 }}>
            No vouchers yet.
          </div>
        )}
      </div>
    </div>
  );
}
