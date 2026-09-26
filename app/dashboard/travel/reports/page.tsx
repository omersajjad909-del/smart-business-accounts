"use client";

/**
 * Travel reports.
 *
 * Three, because there were none, and because an Umrah operator asks three
 * questions of their books and no others often enough to matter:
 *
 *   Did that departure make money?   — the owner's question, at the end
 *   Who owes me, and how late?       — the cashier's question, every morning
 *   Who is on the flight?            — the manifest, needed to file visas and
 *                                      handed to the Saudi office
 *
 * The manifest is the one that is not really a report: it is a working document
 * with a deadline, which is why it prints.
 */

import { useMemo, useState } from "react";

import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { useResponsive } from "@/hooks/useResponsive";
import { bookingMoney, readBooking } from "@/lib/umrahBooking";
import { costDeparture, occupancyName, readDeparture, seatPosition } from "@/lib/umrahPackage";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(var(--ink),0.03)";
const border = "rgba(var(--ink),0.08)";
const accent = "#38bdf8";

type Tab = "profit" | "owing" | "manifest";

const TABS: { key: Tab; label: string; blurb: string }[] = [
  { key: "profit", label: "Departure P&L", blurb: "What each trip cost, sold for and kept." },
  { key: "owing", label: "Who owes what", blurb: "Balances by how late they are." },
  { key: "manifest", label: "Manifest", blurb: "Everyone on one departure, ready to file." },
];

const th: React.CSSProperties = {
  textAlign: "left", padding: "9px 12px", fontSize: 10.5, fontWeight: 800,
  letterSpacing: ".05em", textTransform: "uppercase", color: "rgba(var(--ink),var(--ta-38, .38))",
  borderBottom: `1px solid ${border}`, whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "10px 12px", fontSize: 13, borderBottom: `1px solid ${border}`, color: "rgba(var(--ink),.8)",
};
const num: React.CSSProperties = { ...td, textAlign: "right", fontFamily: "ui-monospace, monospace" };

/** Buckets the trade actually uses when chasing money. */
const AGEING = [
  { key: "current", label: "Not yet due", from: -Infinity, to: 0 },
  { key: "1-30", label: "1–30 days late", from: 1, to: 30 },
  { key: "31-60", label: "31–60 days", from: 31, to: 60 },
  { key: "60+", label: "Over 60 days", from: 61, to: Infinity },
];

export default function TravelReportsPage() {
  const { isMobile } = useResponsive();
  const [tab, setTab] = useState<Tab>("profit");
  const [manifestId, setManifestId] = useState("");
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

  /**
   * Per-departure profit, taken from the bookings rather than the rate card.
   *
   * The rate card is what the operator hoped to sell at; the bookings are what
   * they actually sold at, after every price was argued down. Only the second
   * one is a report — the first is a plan, and a plan that reports on itself
   * always looks good.
   */
  const profit = useMemo(() => {
    return departures.map((x) => {
      const mine = bookings.filter((r) => r.b.departureId === x.id);
      const pax = mine.reduce((s, r) => s + r.money.pax, 0);
      const revenue = mine.reduce((s, r) => s + r.money.total, 0);
      const collected = mine.reduce((s, r) => s + r.money.paid, 0);

      // Cost follows the sharing each party actually took, because the room
      // cost is the part that moves with it.
      const card = costDeparture(x.d);
      const cost = mine.reduce((s, r) => {
        const tier = card.find((t) => t.occupancy === r.b.occupancy) ?? card[0];
        return s + (tier ? tier.costPerPilgrim * r.money.pax : 0);
      }, 0);

      const seats = seatPosition(x.d.seats, pax);
      const margin = Math.round((revenue - cost) * 100) / 100;
      return {
        id: x.id,
        title: x.d.title || "—",
        date: x.d.departureDate,
        pax,
        seats,
        revenue: Math.round(revenue),
        cost: Math.round(cost),
        collected: Math.round(collected),
        margin: Math.round(margin),
        marginPercent: revenue > 0 ? Math.round((margin / revenue) * 1000) / 10 : 0,
      };
    }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [departures, bookings]);

  /** Every unpaid instalment, bucketed by how late it is. */
  const owing = useMemo(() => {
    const lines: { id: string; name: string; departure: string; due: string; amount: number; daysLate: number }[] = [];
    for (const r of bookings) {
      const dep = departures.find((d) => d.id === r.b.departureId);
      for (const inst of r.b.instalments) {
        if (inst.paidDate) continue;
        const amount = Number(inst.amount) || 0;
        if (amount <= 0) continue;
        const daysLate = inst.dueDate
          ? Math.round((new Date(today).getTime() - new Date(inst.dueDate).getTime()) / 86_400_000)
          : 0;
        lines.push({
          id: `${r.id}-${inst.id}`,
          name: r.b.partyName || r.b.bookingNo || "—",
          departure: dep?.d.title || "—",
          due: inst.dueDate,
          amount,
          daysLate,
        });
      }
    }
    return lines.sort((a, b) => b.daysLate - a.daysLate);
  }, [bookings, departures, today]);

  const buckets = useMemo(
    () => AGEING.map((b) => {
      const lines = owing.filter((l) => l.daysLate >= b.from && l.daysLate <= b.to);
      return { ...b, total: lines.reduce((s, l) => s + l.amount, 0), count: lines.length };
    }),
    [owing],
  );

  const manifest = useMemo(() => {
    const dep = departures.find((d) => d.id === manifestId);
    if (!dep) return null;
    const mine = bookings.filter((r) => r.b.departureId === manifestId);
    const people = mine.flatMap((r) =>
      r.b.pilgrims.map((p) => ({
        id: p.id,
        name: p.name,
        passportNo: p.passportNo,
        gender: p.gender,
        age: p.age,
        party: r.b.partyName,
        sharing: occupancyName(r.b.occupancy),
        balance: r.money.balance,
      })),
    );
    return { dep: dep.d, people };
  }, [manifestId, departures, bookings]);

  return (
    <div style={{ padding: isMobile ? "15px 13px" : "24px 28px", fontFamily: ff, color: "var(--ink-solid, #fff)" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 5px" }}>Travel Reports</h1>
      <p style={{ fontSize: 13, color: "rgba(var(--ink),var(--ta-42, .42))", margin: "0 0 18px" }}>
        {TABS.find((t) => t.key === tab)?.blurb}
      </p>

      <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: "8px 16px", borderRadius: 9, fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
              background: tab === t.key ? "rgba(56,189,248,.16)" : bg,
              border: `1px solid ${tab === t.key ? "rgba(56,189,248,.45)" : border}`,
              color: tab === t.key ? accent : "rgba(var(--ink),var(--ta-60, .6))",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profit" && (
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr>
                <th style={th}>Departure</th>
                <th style={{ ...th, textAlign: "right" }}>Pax</th>
                <th style={{ ...th, textAlign: "right" }}>Sold</th>
                <th style={{ ...th, textAlign: "right" }}>Cost</th>
                <th style={{ ...th, textAlign: "right" }}>Margin</th>
                <th style={{ ...th, textAlign: "right" }}>%</th>
                <th style={{ ...th, textAlign: "right" }}>Collected</th>
              </tr>
            </thead>
            <tbody>
              {profit.map((p) => (
                <tr key={p.id}>
                  <td style={td}>
                    <div style={{ fontWeight: 700 }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: "rgba(var(--ink),var(--ta-35, .35))" }}>
                      {p.date || "no date"} · {p.seats.sold} of {p.seats.quota} seats
                    </div>
                  </td>
                  <td style={num}>{p.pax}</td>
                  <td style={num}>{p.revenue.toLocaleString()}</td>
                  <td style={{ ...num, color: "rgba(var(--ink),var(--ta-50, .5))" }}>{p.cost.toLocaleString()}</td>
                  <td style={{ ...num, fontWeight: 700, color: p.margin >= 0 ? "var(--tx-34d399, #34d399)" : "var(--tx-fca5a5, #fca5a5)" }}>
                    {p.margin.toLocaleString()}
                  </td>
                  <td style={{ ...num, color: "rgba(var(--ink),var(--ta-50, .5))" }}>{p.marginPercent}%</td>
                  <td style={num}>
                    {p.collected.toLocaleString()}
                    {p.revenue > p.collected && (
                      <div style={{ fontSize: 10.5, color: "var(--tx-fbbf24, #fbbf24)" }}>
                        {(p.revenue - p.collected).toLocaleString()} out
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {profit.length === 0 && (
                <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: "rgba(var(--ink),var(--ta-30, .3))", padding: 36 }}>No departures yet.</td></tr>
              )}
            </tbody>
          </table>
          {profit.length > 0 && (
            <div style={{ padding: "11px 14px", fontSize: 11.5, color: "rgba(var(--ink),var(--ta-35, .35))", lineHeight: 1.6 }}>
              Taken from the bookings, not the rate card — what was actually sold after every price was argued
              down, rather than what the trip was hoped to sell at.
            </div>
          )}
        </div>
      )}

      {tab === "owing" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
            {buckets.map((b) => (
              <div key={b.key} style={{ background: bg, border: `1px solid ${b.key === "current" ? border : "rgba(239,68,68,.2)"}`, borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 11.5, color: "rgba(var(--ink),var(--ta-45, .45))", marginBottom: 5 }}>{b.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: b.key === "current" ? "rgba(var(--ink),.75)" : b.total > 0 ? "var(--tx-fca5a5, #fca5a5)" : "rgba(var(--ink),var(--ta-30, .3))" }}>
                  {b.total.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: "rgba(var(--ink),var(--ta-30, .3))" }}>{b.count} instalment{b.count === 1 ? "" : "s"}</div>
              </div>
            ))}
          </div>
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={th}>Who</th>
                  <th style={th}>Departure</th>
                  <th style={th}>Due</th>
                  <th style={{ ...th, textAlign: "right" }}>Late by</th>
                  <th style={{ ...th, textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {owing.map((l) => (
                  <tr key={l.id}>
                    <td style={{ ...td, fontWeight: 700 }}>{l.name}</td>
                    <td style={{ ...td, color: "rgba(var(--ink),var(--ta-50, .5))" }}>{l.departure}</td>
                    <td style={td}>{l.due || "—"}</td>
                    <td style={{ ...num, color: l.daysLate > 0 ? "var(--tx-fca5a5, #fca5a5)" : "rgba(var(--ink),var(--ta-35, .35))", fontWeight: l.daysLate > 0 ? 700 : 400 }}>
                      {l.daysLate > 0 ? `${l.daysLate}d` : "—"}
                    </td>
                    <td style={{ ...num, fontWeight: 700 }}>{l.amount.toLocaleString()}</td>
                  </tr>
                ))}
                {owing.length === 0 && (
                  <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: "rgba(var(--ink),var(--ta-30, .3))", padding: 36 }}>Nothing outstanding.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "manifest" && (
        <>
          <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <select value={manifestId} onChange={(e) => setManifestId(e.target.value)}
              style={{ minWidth: 280, background: "var(--dk-161b27, #161b27)", border: `1px solid ${border}`, borderRadius: 9, padding: "9px 12px", color: "var(--ink-solid, #fff)", fontSize: 13, fontFamily: "inherit" }}>
              <option value="">— Pick a departure —</option>
              {departures.map((x) => (
                <option key={x.id} value={x.id}>{x.d.title || "Untitled"}{x.d.departureDate ? ` · ${x.d.departureDate}` : ""}</option>
              ))}
            </select>
            {manifest && (
              <button onClick={() => window.print()}
                style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: accent, color: "#04202e", fontSize: 13, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>
                Print manifest
              </button>
            )}
          </div>

          {manifest ? (
            <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, overflowX: "auto" }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${border}` }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{manifest.dep.title}</div>
                <div style={{ fontSize: 12, color: "rgba(var(--ink),var(--ta-42, .42))", marginTop: 3 }}>
                  {manifest.dep.departureDate} → {manifest.dep.returnDate || "—"} · {manifest.people.length} pilgrims
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: 40 }}>#</th>
                    <th style={th}>Pilgrim</th>
                    <th style={th}>Passport No</th>
                    <th style={th}>Gender</th>
                    <th style={{ ...th, textAlign: "right" }}>Age</th>
                    <th style={th}>Party</th>
                    <th style={th}>Sharing</th>
                  </tr>
                </thead>
                <tbody>
                  {manifest.people.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ ...td, color: "rgba(var(--ink),var(--ta-35, .35))" }}>{i + 1}</td>
                      <td style={{ ...td, fontWeight: 700 }}>
                        {p.name || "—"}
                        {p.balance > 0.01 && (
                          <span className="no-print" style={{ marginLeft: 8, fontSize: 10.5, padding: "1px 7px", borderRadius: 999, background: "rgba(251,191,36,.14)", color: "#fbbf24", fontWeight: 800 }}>
                            owes
                          </span>
                        )}
                      </td>
                      {/* Blank rather than a dash: a manifest goes to the
                          embassy, and an empty cell is a missing passport
                          somebody has to chase, not a formatting choice. */}
                      <td style={{ ...td, fontFamily: "ui-monospace, monospace", color: p.passportNo ? "inherit" : "var(--tx-fca5a5, #fca5a5)" }}>
                        {p.passportNo || "MISSING"}
                      </td>
                      <td style={td}>{p.gender}</td>
                      <td style={num}>{p.age === "" ? "—" : p.age}</td>
                      <td style={{ ...td, color: "rgba(var(--ink),var(--ta-50, .5))" }}>{p.party}</td>
                      <td style={{ ...td, color: "rgba(var(--ink),var(--ta-50, .5))" }}>{p.sharing}</td>
                    </tr>
                  ))}
                  {manifest.people.length === 0 && (
                    <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: "rgba(var(--ink),var(--ta-30, .3))", padding: 36 }}>Nobody booked on this departure yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 36, textAlign: "center", color: "rgba(var(--ink),var(--ta-30, .3))", fontSize: 13 }}>
              Pick a departure to see who is on it.
            </div>
          )}
        </>
      )}
    </div>
  );
}
