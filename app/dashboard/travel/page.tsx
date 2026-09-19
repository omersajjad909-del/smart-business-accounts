"use client";

/**
 * Travel overview.
 *
 * Built around the three questions a Hajj or Umrah operator opens the software
 * to answer, and nothing else:
 *
 *   What can I still sell?        — seats left on the departures that are open
 *   Who owes me money?            — balances, and which of them are late
 *   Is anything about to go wrong? — files flying soon that are not straight
 *
 * The last one is why this page exists rather than being a row of totals. A
 * pilgrim with an unpaid balance or a missing passport number is not a problem
 * today and is a very expensive problem the week they fly, and nothing else in
 * the system is watching the gap between those two moments.
 */

import Link from "next/link";
import { useMemo } from "react";

import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { AttentionPanel } from "./_flight/AttentionPanel";
import { useResponsive } from "@/hooks/useResponsive";
import { bookingMoney, readBooking } from "@/lib/umrahBooking";
import { occupancyName, readDeparture, seatPosition } from "@/lib/umrahPackage";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.08)";
const accent = "#38bdf8";

/** How far ahead "about to fly" reaches. A visa is filed inside this window. */
const SOON_DAYS = 30;

const LINKS = [
  { label: "Departures", href: "/dashboard/travel/departures" },
  { label: "Bookings", href: "/dashboard/travel/bookings" },
  { label: "Vouchers", href: "/dashboard/travel/vouchers" },
  { label: "Tickets", href: "/dashboard/travel/tickets" },
  { label: "Visas", href: "/dashboard/travel/visas" },
  { label: "Settlements", href: "/dashboard/travel/settlements" },
];

function daysUntil(date: string, today: string): number {
  if (!date) return Infinity;
  const ms = new Date(date).getTime() - new Date(today).getTime();
  if (Number.isNaN(ms)) return Infinity;
  return Math.round(ms / 86_400_000);
}

export default function TravelOverviewPage() {
  const { isMobile } = useResponsive();
  const departuresStore = useBusinessRecords("umrah_departure");
  const bookingsStore = useBusinessRecords("umrah_booking");
  const today = new Date().toISOString().slice(0, 10);

  const departures = useMemo(
    () => departuresStore.records.map((r) => ({ id: r.id, d: readDeparture(r.data) })),
    [departuresStore.records],
  );

  const bookings = useMemo(
    () => bookingsStore.records
      .map((r) => {
        const b = readBooking(r.data);
        return { id: r.id, b, money: bookingMoney(b, today) };
      })
      .filter((r) => r.b.status !== "cancelled"),
    [bookingsStore.records, today],
  );

  /* Seats are counted off the bookings, the same way the departures screen
     does it, so the two can never tell the owner different numbers. */
  const soldByDeparture = useMemo(() => {
    const by = new Map<string, number>();
    for (const r of bookings) {
      if (!r.b.departureId) continue;
      by.set(r.b.departureId, (by.get(r.b.departureId) || 0) + r.money.pax);
    }
    return by;
  }, [bookings]);

  const upcoming = useMemo(
    () => departures
      .filter((x) => !x.d.departureDate || x.d.departureDate >= today)
      .sort((a, b) => (a.d.departureDate || "").localeCompare(b.d.departureDate || "")),
    [departures, today],
  );

  const totals = useMemo(() => {
    let seatsLeft = 0;
    for (const x of upcoming) {
      seatsLeft += seatPosition(x.d.seats, soldByDeparture.get(x.id) || 0).left;
    }
    const owed = bookings.reduce((s, r) => s + r.money.balance, 0);
    const overdue = bookings.reduce((s, r) => s + r.money.overdue, 0);
    const flyingSoon = bookings.filter((r) => {
      const dep = departures.find((d) => d.id === r.b.departureId);
      const days = daysUntil(dep?.d.departureDate || "", today);
      return days >= 0 && days <= SOON_DAYS;
    });
    return {
      seatsLeft,
      owed,
      overdue,
      flyingSoonPax: flyingSoon.reduce((s, r) => s + r.money.pax, 0),
    };
  }, [upcoming, soldByDeparture, bookings, departures, today]);

  /**
   * Files that fly inside the window and are not straight.
   *
   * Two things stop a pilgrim travelling, and neither shows up in any ledger: a
   * balance the operator has already paid the airline and hotel for, and a
   * missing passport number that immigration will refuse.
   */
  const attention = useMemo(() => {
    const out: { id: string; name: string; departure: string; days: number; reasons: string[] }[] = [];
    for (const r of bookings) {
      const dep = departures.find((d) => d.id === r.b.departureId);
      const days = daysUntil(dep?.d.departureDate || "", today);
      if (days < 0 || days > SOON_DAYS) continue;

      const reasons: string[] = [];
      if (r.money.balance > 0.01) reasons.push(`${r.money.balance.toLocaleString()} still owed`);
      const noPassport = r.b.pilgrims.filter((p) => !p.passportNo.trim()).length;
      if (noPassport) reasons.push(`${noPassport} without a passport number`);
      if (!reasons.length) continue;

      out.push({
        id: r.id,
        name: r.b.partyName || r.b.bookingNo || "—",
        departure: dep?.d.title || "—",
        days,
        reasons,
      });
    }
    // Soonest first: the one flying on Tuesday matters more than the one
    // flying in four weeks, whatever the amounts.
    return out.sort((a, b) => a.days - b.days);
  }, [bookings, departures, today]);

  const cards = [
    { label: "Seats left to sell", value: totals.seatsLeft.toLocaleString(), colour: totals.seatsLeft > 0 ? accent : "rgba(255,255,255,.35)" },
    { label: "Owed by pilgrims", value: totals.owed.toLocaleString(), colour: totals.owed > 0 ? "#fbbf24" : "#22c55e" },
    { label: "Overdue", value: totals.overdue.toLocaleString(), colour: totals.overdue > 0 ? "#ef4444" : "#22c55e" },
    { label: `Flying in ${SOON_DAYS} days`, value: totals.flyingSoonPax.toLocaleString(), colour: "#a78bfa" },
  ];

  return (
    <div style={{ padding: isMobile ? "15px 13px" : "24px 28px", color: "#e2e8f0", fontFamily: ff }}>
      {/* Across every desk at once: what is not a problem today and is an
          expensive problem the week it lands. */}
      <AttentionPanel />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: "0 0 5px", fontSize: 23, fontWeight: 800, color: "#fff" }}>Travel</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.42)" }}>
            What is left to sell, who owes money, and what is about to go wrong.
          </p>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {LINKS.map((l) => (
            <Link key={l.href} prefetch={false} href={l.href}
              style={{ padding: "8px 13px", borderRadius: 9, border: `1px solid ${border}`, background: bg, color: "rgba(255,255,255,.62)", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "13px 12px" : "17px 19px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: c.colour }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* The one that earns the page. */}
      {attention.length > 0 && (
        <div style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 14, padding: isMobile ? "14px 13px" : "18px 20px", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#fca5a5", marginBottom: 4 }}>
            Flying soon, not ready
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 13 }}>
            A balance or a missing passport is cheap to fix now and very expensive the week they fly.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {attention.slice(0, 8).map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", paddingBottom: 9, borderBottom: `1px solid ${border}` }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>{a.name}</div>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.42)", marginTop: 2 }}>
                    {a.departure} · {a.reasons.join(" · ")}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: a.days <= 7 ? "#ef4444" : "#fbbf24", whiteSpace: "nowrap" }}>
                  {a.days === 0 ? "today" : a.days === 1 ? "tomorrow" : `${a.days} days`}
                </span>
              </div>
            ))}
          </div>
          {attention.length > 8 && (
            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,.4)" }}>
              and {attention.length - 8} more —{" "}
              <Link href="/dashboard/travel/bookings" style={{ color: accent }}>open bookings</Link>
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginBottom: 10 }}>
        Next departures
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {upcoming.slice(0, 8).map((x) => {
          const seats = seatPosition(x.d.seats, soldByDeparture.get(x.id) || 0);
          const mine = bookings.filter((r) => r.b.departureId === x.id);
          const owed = mine.reduce((s, r) => s + r.money.balance, 0);
          const collected = mine.reduce((s, r) => s + r.money.paid, 0);
          const days = daysUntil(x.d.departureDate, today);
          return (
            <div key={x.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "15px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{x.d.title || "—"}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", marginTop: 3 }}>
                    {x.d.departureDate || "no date"}
                    {Number.isFinite(days) && days >= 0 ? ` · in ${days} day${days === 1 ? "" : "s"}` : ""}
                    {" · "}{x.d.legs.filter((l) => l.nights > 0).map((l) => `${l.city} ${l.nights}`).join(" → ") || "no legs"}
                  </div>
                </div>
                <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: seats.left === 0 ? "#fbbf24" : "#22c55e" }}>
                    {seats.over > 0 ? `${seats.over} over` : `${seats.left} left`}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{seats.sold} of {seats.quota} sold</div>
                </div>
              </div>
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 200px", minWidth: 150, background: "rgba(255,255,255,.07)", height: 6, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${seats.percent}%`, height: "100%", background: seats.over > 0 ? "#ef4444" : seats.percent >= 90 ? "#fbbf24" : "#22c55e" }} />
                </div>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>
                  collected <strong style={{ color: "#34d399" }}>{collected.toLocaleString()}</strong>
                  {owed > 0 ? <> · owed <strong style={{ color: "#fbbf24" }}>{owed.toLocaleString()}</strong></> : null}
                </span>
              </div>
            </div>
          );
        })}
        {!departuresStore.loading && upcoming.length === 0 && (
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 36, textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 13 }}>
            No departures ahead.{" "}
            <Link href="/dashboard/travel/departures" style={{ color: accent }}>Create one</Link>.
          </div>
        )}
      </div>

      {/* Where the money sits per sharing option — the mix an operator prices
          the next departure from. */}
      {bookings.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", margin: "22px 0 10px" }}>
            What is selling
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[...new Set(bookings.map((r) => r.b.occupancy))].sort((a, b) => a - b).map((occ) => {
              const mine = bookings.filter((r) => r.b.occupancy === occ);
              const pax = mine.reduce((s, r) => s + r.money.pax, 0);
              return (
                <span key={occ} style={{ fontSize: 12.5, padding: "7px 14px", borderRadius: 999, background: bg, border: `1px solid ${border}`, color: "rgba(255,255,255,.62)" }}>
                  {occupancyName(occ)} <strong style={{ color: "#fff" }}>{pax}</strong> pax
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
