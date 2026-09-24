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

import { useEffect, useMemo, useState } from "react";

import { alertToast } from "@/lib/toast-feedback";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { useResponsive } from "@/hooks/useResponsive";
import {
  costDeparture,
  emptyDeparture,
  emptyLeg,
  emptyLeg2,
  layoverLabel,
  PILGRIMAGE_CITIES,
  layoverMinutes,
  occupancyName,
  readDeparture,
  roomCostPerRoom,
  sectorText,
  seatPosition,
  syncFlight,
  totalFixed,
  totalNights,
  validateDeparture,
  type FlightLeg,
  type PackageFixedCosts,
  type PackageLeg,
  type UmrahDeparture,
} from "@/lib/umrahPackage";
import { AirportInput, PartyInput, readParties, type PartyChoice } from "../_flight/ui";
import { TRAVEL_SUPPLIER_KIND, partyKindHeading } from "@/lib/partyVocabulary";

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

type FixedField = { key: keyof PackageFixedCosts; label: string };

const FIXED_FIELDS: FixedField[] = [
  { key: "air", label: "Air seat" },
  { key: "visa", label: "Visa" },
  { key: "transport", label: "Transport" },
  { key: "ziyarat", label: "Ziyarat" },
  { key: "meals", label: "Meals" },
  { key: "insurance", label: "Insurance" },
  { key: "misc", label: "Other" },
];

/* The days of Hajj itself, which happen outside the hotels and used to have
   nowhere to go but "Other" — hiding the biggest cost after the rooms. An
   Umrah never goes to Mina, so an Umrah departure is never asked. */
const MASHAIR_FIELDS: FixedField[] = [
  { key: "minaTent", label: "Mina tent" },
  { key: "arafatTent", label: "Arafat tent" },
  { key: "muzdalifah", label: "Muzdalifah" },
  { key: "maktab", label: "Maktab" },
];

function fixedFieldsFor(kind: string): FixedField[] {
  if (kind !== "hajj") return FIXED_FIELDS;
  // "Other" stays last, after the Mashair, so the list reads in the order the
  // costing is actually argued.
  return [...FIXED_FIELDS.slice(0, -1), ...MASHAIR_FIELDS, FIXED_FIELDS[FIXED_FIELDS.length - 1]];
}

/** The ground-staff field is named after the city it belongs to. */
function staffLabel(d: UmrahDeparture, index: number): string {
  if (d.kind === "tour") {
    /* A tour goes wherever it goes, so the contacts are named after its own
       cities — each one once, however many nights are booked in it. */
    const cities = [...new Set(d.legs.map((l) => l.city.trim()).filter(Boolean))];
    return cities[index] ? `${cities[index]} staff` : `Ground staff ${index + 1}`;
  }
  /* These two fields ARE Makkah and Madinah — makkahStaff and madinahStaff.
     Naming them after whichever hotel leg happened to be first put the Makkah
     contact under a "Madinah staff" label on a trip that starts in Madinah,
     and left both fields wearing the same label. */
  return index === 0 ? "Makkah staff" : "Madinah staff";
}

/** What a new hotel leg starts as, given where this group is going. */
function nextLegCity(d: UmrahDeparture): string {
  if (d.kind === "tour") return "";
  /* The next city the trip has not booked yet, in the order a pilgrimage
     happens: Makkah, then Madinah, then Aziziah for the days of the Hajj
     itself. Once all three are on the trip a fourth leg is a second stay
     somewhere, so it opens on Makkah for the operator to change. */
  const taken = new Set(d.legs.map((l) => l.city.trim().toLowerCase()).filter(Boolean));
  const offered = d.kind === "hajj" ? PILGRIMAGE_CITIES : PILGRIMAGE_CITIES.slice(0, 2);
  return offered.find((city) => !taken.has(city.toLowerCase())) || PILGRIMAGE_CITIES[0];
}

/** Native time inputs use 24-hour values; seconds are included for precise entry. */
function timeWithSeconds(value: string): string {
  if (!value) return "";
  return /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
}

/**
 * The cities this leg offers, in the order a pilgrimage happens.
 *
 * The three canonical ones first, then every city this agency has actually
 * used on any departure — so a city typed once is on the list from then on,
 * without anybody maintaining a list. An Umrah is not offered Aziziah unless
 * one of theirs has stayed there, in which case it is their own history and
 * worth offering back.
 *
 * The box is pick-or-type either way. A fixed dropdown looked tidier and took
 * away the ability to name a city nobody had thought of, which is the one
 * thing a free-text box was good at.
 */
function cityOptions(kind: string, used: string[]): string[] {
  const base = kind === "hajj" ? PILGRIMAGE_CITIES : PILGRIMAGE_CITIES.slice(0, 2);
  const seen = new Set(base.map((c) => c.toLowerCase()));
  const extra: string[] = [];
  for (const city of used) {
    const key = city.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    extra.push(city.trim());
  }
  return [...base, ...extra.sort((a, b) => a.localeCompare(b))];
}

export default function DeparturesPage() {
  const { isMobile } = useResponsive();
  const store = useBusinessRecords("umrah_departure");
  const bookings = useBusinessRecords("umrah_booking");
  const settlements = useBusinessRecords("travel_settlement");
  /* Suppliers filed as Hotels on the chart of accounts. Offered rather than
     imposed — a hotel being used for the first time must still be typeable. */
  const [hotels, setHotels] = useState<PartyChoice[]>([]);
  useEffect(() => {
    fetch("/api/accounts?partyType=SUPPLIER", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setHotels(readParties(rows)))
      .catch(() => setHotels([]));
  }, []);
  const [editing, setEditing] = useState<{ id: string | null; d: UmrahDeparture } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [bill, setBill] = useState({ supplierName: "", component: "air", qty: "", amount: "" });

  /** Raise a supplier bill against the departure being edited. */
  async function raiseBill() {
    if (!editing?.id) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/travel/departure-settlement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departureId: editing.id,
          supplierName: bill.supplierName,
          component: bill.component,
          qty: Number(bill.qty) || 0,
          amount: Number(bill.amount) || 0,
        }),
      });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(b?.error || "Could not raise the bill");
      await settlements.refetch();
      setBill({ supplierName: "", component: "air", qty: "", amount: "" });
      alertToast(`${b.settlementRef} — ${b.component} ${Number(b.amount).toLocaleString()} owed to ${b.supplierName}.`, "success", "Bill Raised");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not raise the bill");
    } finally {
      setBusy(false);
    }
  }

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

  /** Bills already raised against the departure being edited. */
  const billed = useMemo(() => {
    if (!editing?.id) return [];
    return settlements.records
      .filter((r) => r.refId === editing.id)
      .map((r) => {
        const d = r.data as { componentLabel?: unknown; supplierName?: unknown };
        return {
          id: r.id,
          title: r.title,
          status: r.status,
          amount: Number(r.amount) || 0,
          componentLabel: String(d?.componentLabel || "—"),
          supplierName: String(d?.supplierName || "—"),
        };
      });
  }, [settlements.records, editing]);

  /* Every city this agency has ever put a group in. Read off their own saved
     departures rather than kept in a settings screen nobody would remember to
     fill in. */
  const citiesUsed = useMemo(
    () => rows.flatMap((row) => row.d.legs.map((leg) => leg.city)).filter(Boolean),
    [rows],
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
            <select value={d.kind} onChange={(e) => patch({ kind: e.target.value as "umrah" | "hajj" | "tour" })}
              style={{ ...input, background: "#161b27" }}>
              <option value="umrah">Umrah</option>
              <option value="hajj">Hajj</option>
              <option value="tour">Group Tour</option>
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

        {/* Held here and not on each booking: everyone on a departure is on the
            same aircraft — that is what a group departure is. Asking forty
            families for the same flight number gets thirty-nine right. */}
        <div style={sectionHead}>The group&rsquo;s flights</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 }}>
          {([["arrivalFlight", "Going out"], ["returnFlight", "Coming back"]] as const).map(([key, heading]) => {
            const f = d[key] || { flightNo: "", sector: "", terminal: "", time: "", legs: [] };
            const legs = f.legs?.length ? f.legs : [emptyLeg2()];
            /* The sector, the headline flight number and the check-in time are
               written from the legs every time one changes, so the voucher and
               the invoice — which read those — can never disagree with what is
               on screen. */
            const setLegs = (next: FlightLeg[]) =>
              patch({ [key]: syncFlight({ ...f, legs: next }) } as Partial<UmrahDeparture>);
            const patchLegAt = (id: string, changes: Partial<FlightLeg>) =>
              setLegs(legs.map((leg) => (leg.id === id ? { ...leg, ...changes } : leg)));

            return (
              <div key={key} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{heading}</div>
                  {sectorText(legs) ? (
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)" }}>{sectorText(legs)}</div>
                  ) : null}
                </div>

                {legs.map((leg, index) => {
                  const wait = index > 0 ? layoverMinutes(legs[index - 1].arrTime, leg.depTime) : null;
                  return (
                    <div key={leg.id}>
                      {index > 0 ? (
                        /* The hours a group spends in a transit hall between
                           two aircraft. Worked out rather than asked for —
                           both times are already on the page. */
                        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", margin: "10px 0 6px", display: "flex", alignItems: "center", gap: 6 }}>
                          <span>↓</span>
                          <span>
                            Change of aircraft at {legs[index - 1].to || "—"}
                            {wait !== null ? ` · ${layoverLabel(wait)} on the ground` : ""}
                          </span>
                        </div>
                      ) : null}

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <label style={label}>From</label>
                          <AirportInput compact value={leg.from} placeholder="Lahore"
                            onChange={(code) => patchLegAt(leg.id, { from: code })} />
                        </div>
                        <div>
                          <label style={label}>To</label>
                          <AirportInput compact value={leg.to} placeholder="Jeddah"
                            onChange={(code) => patchLegAt(leg.id, { to: code })} />
                        </div>
                        <div>
                          <label style={label}>Flight No</label>
                          <input value={leg.flightNo} placeholder="PK-747"
                            onChange={(e) => patchLegAt(leg.id, { flightNo: e.target.value.toUpperCase() })} style={input} />
                        </div>
                        <div>
                          <label style={label}>Terminal</label>
                          <input value={leg.terminal} placeholder="T1"
                            onChange={(e) => patchLegAt(leg.id, { terminal: e.target.value })} style={input} />
                        </div>
                        <div>
                          <label style={label}>Departs</label>
                          <input type="time" lang="en-GB" step={1} value={timeWithSeconds(leg.depTime)}
                            onChange={(e) => patchLegAt(leg.id, { depTime: e.target.value })} style={input} />
                        </div>
                        <div>
                          <label style={label}>Arrives</label>
                          <input type="time" lang="en-GB" step={1} value={timeWithSeconds(leg.arrTime)}
                            onChange={(e) => patchLegAt(leg.id, { arrTime: e.target.value })} style={input} />
                        </div>
                      </div>

                      {legs.length > 1 ? (
                        <button type="button" onClick={() => setLegs(legs.filter((row) => row.id !== leg.id))}
                          style={{ marginTop: 6, background: "none", border: "none", color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                          Remove this flight
                        </button>
                      ) : null}
                    </div>
                  );
                })}

                <button type="button"
                  onClick={() => setLegs([...legs, emptyLeg2(legs[legs.length - 1]?.to || "")])}
                  style={{ marginTop: 10, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,.05)", border: `1px solid ${border}`, color: "rgba(255,255,255,.65)", fontSize: 11.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
                  + Change of aircraft
                </button>
              </div>
            );
          })}
        </div>

        {/* Printed on every voucher for this departure, so they are entered once
            for the group rather than forty times. */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 12, marginTop: 12 }}>
          {/* Named after the cities on the itinerary rather than after Makkah
              and Madinah. The same two fields serve a Dubai group, whose
              ground staff are in Dubai and Abu Dhabi — only the labels ever
              needed to know where the group was going. */}
          {[0, 1].map((index) => {
            const city = staffLabel(d, index);
            const nameKey = index === 0 ? "makkahStaffName" : "madinahStaffName";
            const phoneKey = index === 0 ? "makkahStaffPhone" : "madinahStaffPhone";
            const legacyKey = index === 0 ? "makkahStaff" : "madinahStaff";
            const value = d as UmrahDeparture & Record<string, string | undefined>;
            return <div key={city}>
              <label style={label}>{city} name</label>
              <input value={value[nameKey] || ""} placeholder="Staff name"
                onChange={(e) => patch({ [nameKey]: e.target.value, [legacyKey]: "" } as Partial<UmrahDeparture>)} style={input} />
              <label style={{ ...label, marginTop: 7 }}>Phone number</label>
              <input type="tel" value={value[phoneKey] || ""} placeholder="+966 58 315 6418"
                onChange={(e) => patch({ [phoneKey]: e.target.value, [legacyKey]: "" } as Partial<UmrahDeparture>)} style={input} />
            </div>;
          })}
          <div>
            <label style={label}>Transport note</label>
            <input value={d.transportNote || ""} placeholder="TRANSPORT BY VOUCHER # 106830"
              onChange={(e) => patch({ transportNote: e.target.value })} style={input} />
          </div>
        </div>

        <div style={sectionHead}>Hotel legs — rate is per room, per night</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {d.legs.map((leg) => (
            <div key={leg.id} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "130px 1.8fr 90px 130px 150px 30px", gap: 9, alignItems: "end" }}>
              <div>
                <label style={label}>City</label>
                {/* Pick one, or type a new one — Aziziah was a new one once.
                    A city typed here shows up in this list on the next
                    departure, because the list is read off what they have
                    actually used. */}
                <PartyInput
                  compact
                  value={leg.city}
                  options={cityOptions(d.kind, citiesUsed).map((city) => ({ name: city }))}
                  placeholder="Pick or type a city"
                  onChange={(city) => patchLeg(leg.id, { city })}
                />
              </div>
              <div>
                <label style={label}>Hotel</label>
                {/* The hotels already on the chart, under the Hotel type the
                    Accounts screen records. Typed once, then picked — which is
                    also what stops "Makkah Towers" and "MAKKAH TOWER" becoming
                    two suppliers with half the payable each. */}
                <PartyInput
                  compact
                  value={leg.hotelName}
                  options={hotels}
                  kind={TRAVEL_SUPPLIER_KIND.HOTEL}
                  kindLabel={partyKindHeading(TRAVEL_SUPPLIER_KIND.HOTEL)}
                  placeholder={hotels.length ? "Pick or type" : "Hotel name"}
                  onChange={(name) => patchLeg(leg.id, { hotelName: name })}
                />
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
        <button onClick={() => patch({ legs: [...d.legs, emptyLeg(nextLegCity(d))] })}
          style={{ marginTop: 10, padding: "7px 14px", borderRadius: 8, background: "rgba(255,255,255,.05)", border: `1px solid ${border}`, color: "rgba(255,255,255,.65)", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
          + Add leg
        </button>

        <div style={sectionHead}>
          Per pilgrim, whoever they share with
          {d.kind === "hajj" ? <span style={{ color: "rgba(255,255,255,.3)", fontWeight: 600, textTransform: "none", letterSpacing: 0 }}> — including the Mashair</span> : null}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit,minmax(110px,1fr))", gap: 10 }}>
          {fixedFieldsFor(d.kind).map((f) =>
            money(f.label, d.fixed[f.key] ?? 0, (n) => patch({ fixed: { ...d.fixed, [f.key]: n } })),
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
              <select aria-label="People sharing this room" value={t.occupancy}
                onChange={(e) => patch({ tiers: d.tiers.map((x, xi) => xi === i ? { ...x, occupancy: Number(e.target.value) } : x) })}
                style={{ ...input, padding: "6px 8px", fontWeight: 700 }}>
                {Array.from({ length: 10 }, (_, n) => n + 1).map((n) => <option key={n} value={n} style={{ color: "#111" }}>{occupancyName(n)} ({n})</option>)}
              </select>
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
            Close
          </button>
        </div>

        {/* ── What the departure is bought with ──
            A group trip is bought in blocks — forty seats from a consolidator,
            a room allocation from a hotel, forty visas from an agent. None of
            those belongs to any one pilgrim, which is why the per-ticket
            settlement could not hold them and the payable for a whole
            departure appeared nowhere. */}
        {editing.id && (
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${border}` }}>
            <div style={{ ...sectionHead, margin: "0 0 4px" }}>Supplier bills for this departure</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.38)", marginBottom: 12, lineHeight: 1.6 }}>
              Posts the cost to its own head and the money owed to the supplier, where a CPV clears it.
            </div>

            {billed.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
                {billed.map((s) => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, fontSize: 12.5, flexWrap: "wrap" }}>
                    <span style={{ color: "rgba(255,255,255,.62)" }}>
                      <strong style={{ color: "#fff" }}>{s.title}</strong> · {s.componentLabel} · {s.supplierName}
                    </span>
                    <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, color: s.status === "settled" ? "#34d399" : "#fbbf24" }}>
                      {s.amount.toLocaleString()} {s.status === "settled" ? "paid" : "owing"}
                    </span>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${border}`, paddingTop: 7, display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800 }}>
                  <span>Bought so far</span>
                  <span style={{ fontFamily: "ui-monospace, monospace" }}>
                    {billed.reduce((s, x) => s + x.amount, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1.4fr 1fr 110px 1fr 130px", gap: 9, alignItems: "end" }}>
              <div>
                <label style={label}>Supplier</label>
                <input value={bill.supplierName} placeholder="Diamond Hijazi / Qatar BSP"
                  onChange={(e) => setBill({ ...bill, supplierName: e.target.value })} style={input} />
              </div>
              <div>
                <label style={label}>For</label>
                <select value={bill.component} onChange={(e) => setBill({ ...bill, component: e.target.value })}
                  style={{ ...input, background: "#161b27" }}>
                  <option value="air">Air seats</option>
                  <option value="visa">Visas</option>
                  <option value="hotel">Hotel rooms</option>
                  <option value="transport">Transport</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={label}>Qty</label>
                <input type="number" min={0} value={bill.qty}
                  onChange={(e) => setBill({ ...bill, qty: e.target.value })}
                  onFocus={(e) => e.currentTarget.select()} style={{ ...input, textAlign: "right" }} />
              </div>
              <div>
                <label style={label}>Amount</label>
                <input type="number" min={0} step="any" value={bill.amount}
                  onChange={(e) => setBill({ ...bill, amount: e.target.value })}
                  onFocus={(e) => e.currentTarget.select()} style={{ ...input, textAlign: "right" }} />
              </div>
              <button onClick={raiseBill}
                disabled={busy || !bill.supplierName.trim() || !(Number(bill.amount) > 0)}
                style={{
                  padding: "9px 0", borderRadius: 9, border: "none", fontSize: 12.5, fontWeight: 800, fontFamily: "inherit",
                  background: bill.supplierName.trim() && Number(bill.amount) > 0 ? "#a78bfa" : "rgba(167,139,250,.35)",
                  color: "#1b1033",
                  cursor: bill.supplierName.trim() && Number(bill.amount) > 0 ? "pointer" : "not-allowed",
                }}>
                {busy ? "Posting…" : "Raise bill"}
              </button>
            </div>
          </div>
        )}
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
