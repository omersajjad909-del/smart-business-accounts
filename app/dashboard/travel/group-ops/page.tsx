"use client";

/**
 * Group Operations — a hundred pilgrims on one screen.
 *
 * Between taking a Hajj booking and putting the group on an aeroplane there
 * are months of chasing: instalments, passports, visas, five documents each,
 * and a room in two cities. At a hundred pilgrims that is five hundred
 * documents and a hundred passports, and it has been living in a register and
 * a WhatsApp group.
 *
 * Bookings are kept by party, which is right — a family pays together. But
 * operations happen per person, and no screen showed a person. This one does:
 * one row per pilgrim, the five things that can stop them travelling, and the
 * ability to fix any of them in place.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { useResponsive } from "@/hooks/useResponsive";
import { useCurrency } from "@/lib/useCurrency";
import { alertToast } from "@/lib/toast-feedback";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  PILGRIM_DOCUMENTS,
  VISA_STATUSES,
  bookingMoney,
  documentsIn,
  passportState,
  readBooking,
  type BookingPilgrim,
  type PassportState,
} from "@/lib/umrahBooking";
import { readDeparture } from "@/lib/umrahPackage";
import { T, ff, flightCss, inputStyle } from "../_flight/ui";

type Row = {
  bookingId: string;
  bookingNo: string;
  party: string;
  phone: string;
  index: number;
  pilgrim: BookingPilgrim;
  /** Party-level money — a family pays together, so it is the party that owes. */
  balance: number;
  overdue: number;
  paidPercent: number;
};

const PASSPORT_TONE: Record<PassportState, { tone: string; label: string }> = {
  missing: { tone: "#f87171", label: "No passport" },
  "no-expiry": { tone: "#f4c25b", label: "No expiry" },
  expired: { tone: "#f87171", label: "Expired" },
  short: { tone: "#f4c25b", label: "Under 6 months" },
  ok: { tone: "#34d399", label: "OK" },
};

const VISA_TONE: Record<string, string> = {
  pending: "#94a3b8", applied: "#60a5fa", approved: "#34d399", rejected: "#f87171",
};

/** Pakistani CNIC format: five digits, seven digits, then one digit. */
function formatCnic(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export default function GroupOpsPage() {
  const { isMobile } = useResponsive();
  const symbol = useCurrency();
  const money = (n: number) => `${symbol}${Math.round(Number(n) || 0).toLocaleString()}`;

  const departures = useBusinessRecords("umrah_departure");
  const bookings = useBusinessRecords("umrah_booking");

  const [departureId, setDepartureId] = useState("");
  const [filter, setFilter] = useState<"all" | "passport" | "visa" | "docs" | "room" | "money">("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState("");

  const departureList = useMemo(
    () => departures.records.map((r) => ({ id: r.id, title: r.title, d: readDeparture(r.data) })),
    [departures.records],
  );

  // Open on the next departure rather than making somebody choose every time.
  useEffect(() => {
    if (departureId || !departureList.length) return;
    const upcoming = [...departureList].sort((a, b) => (a.d.departureDate || "").localeCompare(b.d.departureDate || ""));
    setDepartureId(upcoming[0].id);
  }, [departureList, departureId]);

  const departure = departureList.find((d) => d.id === departureId);
  const accommodationLegs = departure?.d.legs.filter((leg) =>
    leg.nights > 0 || Boolean(leg.hotelName.trim()) || Boolean(
      departure.d.kind === "hajj" && leg.city.trim().toLowerCase() === "mina" &&
      (leg.hajjCompanyName?.trim() || leg.maktabName?.trim()),
    ),
  ) ?? [];
  const roomCities = [...new Set(accommodationLegs
    .filter((leg) => !(departure?.d.kind === "hajj" && leg.city.trim().toLowerCase() === "mina"))
    .map((leg) => leg.city.trim()).filter(Boolean))];
  if (!roomCities.length && accommodationLegs.length === 0) roomCities.push("Makkah", "Madinah");
  const roomValue = (pilgrim: BookingPilgrim, city: string) => {
    const key = city.trim().toLowerCase();
    if (pilgrim.roomAssignments?.[key] != null) return pilgrim.roomAssignments[key];
    if (key === "makkah") return pilgrim.roomMakkah || "";
    if (key === "madinah") return pilgrim.roomMadinah || "";
    return "";
  };

  const rows = useMemo(() => {
    const out: Row[] = [];
    for (const record of bookings.records) {
      const b = readBooking(record.data);
      if (b.departureId !== departureId) continue;
      if (b.status === "cancelled") continue;
      const m = bookingMoney(b);
      b.pilgrims.forEach((pilgrim, index) => {
        out.push({
          bookingId: record.id,
          bookingNo: b.bookingNo || record.title,
          party: b.partyName,
          phone: b.phone,
          index,
          pilgrim,
          balance: m.balance,
          overdue: m.overdue,
          paidPercent: m.percentPaid,
        });
      });
    }
    return out;
  }, [bookings.records, departureId]);

  const departureDate = departure?.d.departureDate;

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle) {
        const hay = `${row.pilgrim.name} ${row.pilgrim.passportNo} ${row.party} ${row.bookingNo}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      const state = passportState(row.pilgrim, departureDate);
      switch (filter) {
        case "passport": return state !== "ok";
        case "visa": return (row.pilgrim.visaStatus ?? "pending") !== "approved";
        case "docs": return documentsIn(row.pilgrim) < PILGRIM_DOCUMENTS.length;
        case "room": return roomCities.some((city) => !roomValue(row.pilgrim, city).trim());
        case "money": return row.overdue > 0 || row.balance > 0;
        default: return true;
      }
    });
  }, [rows, filter, search, departureDate, roomCities]);

  const stats = useMemo(() => {
    const parties = new Set(rows.map((r) => r.bookingId));
    const owed = [...parties].reduce((sum, id) => {
      const row = rows.find((r) => r.bookingId === id);
      return sum + (row?.balance ?? 0);
    }, 0);
    const overdueParties = new Set(rows.filter((r) => r.overdue > 0).map((r) => r.bookingId)).size;
    const passportIssues = rows.filter((r) => passportState(r.pilgrim, departureDate) !== "ok").length;
    const visaPending = rows.filter((r) => (r.pilgrim.visaStatus ?? "pending") !== "approved").length;
    const docsIn = rows.reduce((sum, r) => sum + documentsIn(r.pilgrim), 0);
    const docsTotal = rows.length * PILGRIM_DOCUMENTS.length;
    const noRoom = rows.filter((r) => roomCities.some((city) => !roomValue(r.pilgrim, city).trim())).length;
    return { parties: parties.size, owed, overdueParties, passportIssues, visaPending, docsIn, docsTotal, noRoom };
  }, [rows, departureDate, roomCities]);

  /* Saving one pilgrim writes the party's whole booking back, because that is
     the record — the pilgrim is a row inside it. */
  const patchPilgrim = useCallback(
    async (row: Row, changes: Partial<BookingPilgrim>) => {
      const record = bookings.records.find((r) => r.id === row.bookingId);
      if (!record) return;
      setSaving(`${row.bookingId}:${row.index}`);
      try {
        const b = readBooking(record.data);
        b.pilgrims = b.pilgrims.map((p, i) => (i === row.index ? { ...p, ...changes } : p));
        await bookings.update(row.bookingId, { data: { ...record.data, pilgrims: b.pilgrims } });
      } catch {
        alertToast("Could not save that change.", "error", "Not Saved");
      } finally {
        setSaving("");
      }
    },
    [bookings],
  );

  const cell = { ...inputStyle, padding: "6px 8px", fontSize: 12 };
  const seats = departure?.d.seats ?? 0;

  return (
    <div className="fl-form" style={{ padding: isMobile ? 16 : "24px 28px", fontFamily: ff, color: T.text, maxWidth: "100%", overflow: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: flightCss }} />

      <header style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "grid", placeItems: "center", background: "linear-gradient(135deg,var(--accent),var(--accent-strong))", fontSize: 19 }}>🕋</span>
        <div style={{ minWidth: 0, flex: "1 1 240px" }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 21 : 25, fontWeight: 800, color: T.text }}>Group Operations</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: T.muted }}>
            Every pilgrim on a departure, and the five things that can stop them travelling.
          </p>
        </div>
        <select value={departureId} onChange={(e) => setDepartureId(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 240, padding: "9px 12px", fontSize: 13 }}>
          {!departureList.length ? <option value="">No departures yet</option> : null}
          {departureList.map((d) => (
            <option key={d.id} value={d.id}>{d.title}{d.d.departureDate ? ` · ${d.d.departureDate}` : ""}</option>
          ))}
        </select>
      </header>

      {!departureList.length ? (
        <div style={{ border: `1px dashed ${T.border}`, borderRadius: 14, padding: "36px 20px", textAlign: "center", color: T.muted, fontSize: 13.5, lineHeight: 1.6, background: T.card }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🕋</div>
          No departures yet. Create one on{" "}
          <a href="/dashboard/travel/departures" style={{ color: T.accent, textDecoration: "none" }}>Departures</a>{" "}
          — the group, its hotels, its quota and its rate card — and the parties you book onto it will appear here.
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Pilgrims", value: `${rows.length}${seats ? ` / ${seats}` : ""}`, tone: T.accent },
              { label: "Parties", value: String(stats.parties), tone: "#60a5fa" },
              { label: "Still Owed", value: money(stats.owed), tone: stats.owed > 0 ? "#f4c25b" : "#34d399" },
              { label: "Parties Overdue", value: String(stats.overdueParties), tone: stats.overdueParties ? "#f87171" : "#34d399" },
              { label: "Passport Issues", value: String(stats.passportIssues), tone: stats.passportIssues ? "#f87171" : "#34d399" },
              { label: "Visas Not In", value: String(stats.visaPending), tone: stats.visaPending ? "#f4c25b" : "#34d399" },
              { label: "Documents", value: `${stats.docsIn} / ${stats.docsTotal}`, tone: stats.docsIn < stats.docsTotal ? "#f4c25b" : "#34d399" },
              { label: "No Room Yet", value: String(stats.noRoom), tone: stats.noRoom ? "#f4c25b" : "#34d399" },
            ].map((card) => (
              <div key={card.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "13px 15px", minWidth: 0 }}>
                <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.label}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: card.tone }}>{card.value}</div>
              </div>
            ))}
          </div>

          {accommodationLegs.length > 0 ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {accommodationLegs.map((leg) => {
              const mina = departure?.d.kind === "hajj" && leg.city.trim().toLowerCase() === "mina";
              const detail = mina
                ? `${leg.hajjCompanyName || "Hajj Company not set"} · Maktab ${leg.maktabName || "—"} · Category ${leg.maktabCategory || "—"}`
                : leg.hotelName || "Hotel not set";
              return <div key={leg.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "8px 11px", fontSize: 11.5, color: T.muted }}>
                <strong style={{ color: T.text }}>{leg.city}</strong> · {detail} · {leg.nights} nights
              </div>;
            })}
          </div> : null}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
            {([
              ["all", `All ${rows.length}`],
              ["money", "Owing"],
              ["passport", "Passport"],
              ["visa", "Visa"],
              ["docs", "Documents"],
              ["room", "No room"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                style={{
                  border: `1px solid ${filter === key ? "var(--accent)" : T.border}`,
                  background: filter === key ? "var(--accent-soft)" : T.panel,
                  color: filter === key ? T.accent : T.muted,
                  borderRadius: 999, padding: "6px 14px", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {label}
              </button>
            ))}
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, passport or party" style={{ ...inputStyle, flex: "1 1 200px", padding: "8px 11px", fontSize: 12.5 }} className="fl-in" />
          </div>

          {bookings.loading ? (
            <div style={{ fontSize: 13, color: T.muted }}>Loading…</div>
          ) : !visible.length ? (
            <div style={{ border: `1px dashed ${T.border}`, borderRadius: 14, padding: "30px 20px", textAlign: "center", color: T.muted, fontSize: 13, background: T.card }}>
              {rows.length ? "Nothing matches that filter — which on this screen is good news." : "No parties booked on this departure yet."}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {visible.map((row) => {
                const state = passportState(row.pilgrim, departureDate);
                const pp = PASSPORT_TONE[state];
                const visa = row.pilgrim.visaStatus ?? "pending";
                const docs = row.pilgrim.documents ?? {};
                const busy = saving === `${row.bookingId}:${row.index}`;

                return (
                  <article
                    key={`${row.bookingId}-${row.index}`}
                    className="fl-card"
                    style={{ border: `1px solid ${T.border}`, borderRadius: 13, background: T.card, padding: 13, display: "grid", gap: 11, opacity: busy ? 0.6 : 1 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 800, color: T.text }}>
                          {row.pilgrim.name || <span style={{ color: "#f87171" }}>Unnamed pilgrim</span>}
                        </div>
                        <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
                          {row.party} · {row.bookingNo}
                          {row.pilgrim.mahram ? ` · mahram: ${row.pilgrim.mahram}` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: pp.tone, border: `1px solid ${pp.tone}44`, background: `${pp.tone}14`, borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>
                          🛂 {pp.label}
                        </span>
                        {/* The party owes, not the person — a family pays together. */}
                        {row.overdue > 0 ? (
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#f87171", border: "1px solid rgba(248,113,113,.35)", background: "rgba(248,113,113,.12)", borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>
                            💰 {money(row.overdue)} overdue
                          </span>
                        ) : row.balance > 0 ? (
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#f4c25b", border: "1px solid rgba(244,194,91,.35)", background: "rgba(244,194,91,.12)", borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>
                            {row.paidPercent}% paid · {money(row.balance)} left
                          </span>
                        ) : (
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#34d399", border: "1px solid rgba(52,211,153,.35)", background: "rgba(52,211,153,.12)", borderRadius: 999, padding: "3px 9px" }}>
                            Paid in full
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${isMobile ? 130 : 145}px,1fr))`, gap: 9 }}>
                      <label style={{ display: "grid", gap: 3 }}>
                        <span style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>Passport No</span>
                        <input defaultValue={row.pilgrim.passportNo || ""} onBlur={(e) => { const v = e.target.value.toUpperCase().trim(); if (v !== (row.pilgrim.passportNo || "")) patchPilgrim(row, { passportNo: v }); }} style={cell} className="fl-in" />
                      </label>
                      <label style={{ display: "grid", gap: 3 }}>
                        <span style={{ fontSize: 10, color: pp.tone, textTransform: "uppercase", letterSpacing: ".05em" }}>Expiry</span>
                        <input type="date" defaultValue={row.pilgrim.passportExpiry || ""} onBlur={(e) => { if (e.target.value !== (row.pilgrim.passportExpiry || "")) patchPilgrim(row, { passportExpiry: e.target.value }); }} style={cell} className="fl-in" />
                      </label>
                      <label style={{ display: "grid", gap: 3 }}>
                        <span style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>CNIC</span>
                        <input defaultValue={formatCnic(row.pilgrim.cnic || "")} inputMode="numeric" maxLength={15} placeholder="33100-1234567-1"
                          onChange={(e) => { e.currentTarget.value = formatCnic(e.currentTarget.value); }}
                          onBlur={(e) => { const value = formatCnic(e.target.value); if (value !== (row.pilgrim.cnic || "")) patchPilgrim(row, { cnic: value }); }}
                          style={cell} className="fl-in" />
                      </label>
                      <label style={{ display: "grid", gap: 3 }}>
                        <span style={{ fontSize: 10, color: VISA_TONE[visa], textTransform: "uppercase", letterSpacing: ".05em" }}>Visa</span>
                        <select value={visa} onChange={(e) => patchPilgrim(row, { visaStatus: e.target.value })} style={{ ...cell, color: VISA_TONE[visa], fontWeight: 700 }}>
                          {VISA_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </label>
                      {roomCities.map((city) => {
                        const key = city.trim().toLowerCase();
                        const current = roomValue(row.pilgrim, city);
                        return <label key={key} style={{ display: "grid", gap: 3 }}>
                          <span style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>Room — {city}</span>
                          <input defaultValue={current} placeholder="Room number"
                            onBlur={(e) => {
                              const value = e.target.value.trim();
                              if (value === current) return;
                              const changes: Partial<BookingPilgrim> = { roomAssignments: { ...(row.pilgrim.roomAssignments || {}), [key]: value } };
                              if (key === "makkah") changes.roomMakkah = value;
                              if (key === "madinah") changes.roomMadinah = value;
                              patchPilgrim(row, changes);
                            }} style={cell} className="fl-in" />
                        </label>;
                      })}
                    </div>

                    {/* Five ticks. At a hundred pilgrims this is the five hundred
                        things that were living in a register. */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
                      <span style={{ fontSize: 10.5, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>
                        Documents {documentsIn(row.pilgrim)}/{PILGRIM_DOCUMENTS.length}
                      </span>
                      {PILGRIM_DOCUMENTS.map((doc) => {
                        const on = Boolean(docs[doc.key]);
                        return (
                          <button
                            key={doc.key}
                            type="button"
                            onClick={() => patchPilgrim(row, { documents: { ...docs, [doc.key]: !on } })}
                            style={{
                              border: `1px solid ${on ? "rgba(52,211,153,.45)" : T.border}`,
                              background: on ? "rgba(52,211,153,.14)" : "transparent",
                              color: on ? "#34d399" : T.muted,
                              borderRadius: 999, padding: "4px 11px", fontSize: 11, fontWeight: 700,
                              cursor: "pointer", fontFamily: "inherit",
                            }}
                          >
                            {on ? "✓ " : ""}{doc.label}
                          </button>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
