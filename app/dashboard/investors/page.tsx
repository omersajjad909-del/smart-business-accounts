"use client";

// The landing screen: every party on one row, and the four numbers that
// actually decide anything. If a cycle is overdue or a balance is climbing,
// it should be visible here without opening anything.

import Link from "next/link";
import { useMemo } from "react";
import { useResponsive } from "@/hooks/useResponsive";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  CAT,
  capitalTotals,
  daysBetween,
  fmtDate,
  fmtMoney,
  fmtQty,
  mapCapital,
  mapParty,
  mapProduction,
  mapSettlement,
  monthKey,
  round2,
  todayISO,
} from "./_shared";
import { Btn, Empty, PageShell, Panel, TableWrap, Tabs, Tiles, numTd, tableStyle, tdStyle, thStyle, ACCENT, BORDER, MUTED } from "./_ui";

export default function InvestorOverviewPage() {
  const { isMobile } = useResponsive();
  const { records: partyRecords, loading } = useBusinessRecords(CAT.party);
  const { records: capitalRecords } = useBusinessRecords(CAT.capital);
  const { records: productionRecords } = useBusinessRecords(CAT.production);
  const { records: settlementRecords } = useBusinessRecords(CAT.settlement);

  const parties = useMemo(() => partyRecords.map(mapParty).filter((p) => p.status === "active"), [partyRecords]);
  const capital = useMemo(() => capitalRecords.map(mapCapital), [capitalRecords]);
  const production = useMemo(() => productionRecords.map(mapProduction), [productionRecords]);
  const settlements = useMemo(() => settlementRecords.map(mapSettlement), [settlementRecords]);

  const thisMonth = monthKey(todayISO());

  const rows = useMemo(
    () =>
      parties.map((p) => {
        const caps = capitalTotals(capital.filter((c) => c.partyId === p.id));
        const lines = production.filter((l) => l.partyId === p.id);
        const monthLines = lines.filter((l) => monthKey(l.date) === thisMonth);
        const cycles = settlements.filter((s) => s.partyId === p.id).sort((a, b) => b.cycleNo - a.cycleNo);
        const last = cycles[0];
        const open = lines.filter((l) => !l.settlementId);
        return {
          party: p,
          net: caps.net,
          monthQty: round2(monthLines.reduce((s, l) => s + l.qty, 0)),
          monthEarned: round2(monthLines.reduce((s, l) => s + l.amount, 0)),
          openEarned: round2(open.reduce((s, l) => s + l.amount, 0)),
          outstanding: last ? last.closingBalance : round2(lines.reduce((s, l) => s + l.amount, 0)),
          lastCycleEnd: last?.toDate || "",
          // A cycle is due when more days have passed since the last one closed
          // than the party's own agreed cycle length.
          overdue: last ? daysBetween(last.toDate, todayISO()) > p.cycleDays : open.length > 0,
        };
      }),
    [parties, capital, production, settlements, thisMonth],
  );

  const totals = useMemo(
    () => ({
      net: round2(rows.reduce((s, r) => s + r.net, 0)),
      monthQty: round2(rows.reduce((s, r) => s + r.monthQty, 0)),
      monthEarned: round2(rows.reduce((s, r) => s + r.monthEarned, 0)),
      outstanding: round2(rows.reduce((s, r) => s + r.outstanding, 0)),
    }),
    [rows],
  );

  return (
    <PageShell
      title="Investors"
      subtitle="Money placed in someone else's business. Track what gets produced, what your share comes to, and what is still owed."
      isMobile={isMobile}
    >
      <Tabs active="/dashboard/investors" />

      <Tiles
        items={[
          { label: "Capital placed", value: fmtMoney(totals.net) },
          { label: "Produced this month", value: fmtQty(totals.monthQty) },
          { label: "Your share this month", value: fmtMoney(totals.monthEarned), tone: "#2dd4bf" },
          { label: "Outstanding", value: fmtMoney(totals.outstanding), tone: totals.outstanding > 0 ? "#fbbf24" : undefined },
        ]}
      />

      <Panel
        title="Parties"
        hint="A party is flagged when more days have passed since its last settlement than the cycle you agreed with it."
        right={
          <Link href="/dashboard/investors/parties" style={{ textDecoration: "none" }}>
            <Btn small tone="ghost">Manage</Btn>
          </Link>
        }
      >
        <TableWrap>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Party</th>
                <th style={thStyle}>Terms</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Net capital</th>
                <th style={{ ...thStyle, textAlign: "right" }}>This month</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Not settled</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Outstanding</th>
                <th style={thStyle}>Last cycle</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.party.id}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{r.party.name}</td>
                  <td style={{ ...tdStyle, color: MUTED }}>
                    {r.party.profitModel === "percentage" ? r.party.sharePercent + "% of profit" : "per " + r.party.unit}
                  </td>
                  <td style={numTd}>{fmtMoney(r.net)}</td>
                  <td style={numTd}>{fmtMoney(r.monthEarned)}</td>
                  <td style={numTd}>{fmtMoney(r.openEarned)}</td>
                  <td style={{ ...numTd, fontWeight: 700 }}>{fmtMoney(r.outstanding)}</td>
                  <td style={tdStyle}>
                    {r.lastCycleEnd ? fmtDate(r.lastCycleEnd) : "none yet"}
                    {r.overdue && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: ".06em",
                          textTransform: "uppercase",
                          color: "#fbbf24",
                          border: "1px solid #fbbf2455",
                          borderRadius: 5,
                          padding: "2px 6px",
                        }}
                      >
                        due
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && parties.length === 0 && (
            <Empty>
              No party yet. Start at <Link href="/dashboard/investors/parties" style={{ color: ACCENT }}>Parties</Link>, then set the
              rates in Profit Terms.
            </Empty>
          )}
          {loading && <Empty>Loading…</Empty>}
        </TableWrap>
      </Panel>

      <Panel title="How it runs" hint="Three steps once, three every cycle.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
          {[
            { n: 1, t: "Parties", d: "Who holds the money and how often you settle.", href: "/dashboard/investors/parties", once: true },
            { n: 2, t: "Capital", d: "What went in, what came back out.", href: "/dashboard/investors/capital", once: true },
            { n: 3, t: "Profit Terms", d: "What each grade pays, and from which day.", href: "/dashboard/investors/grades", once: true },
            { n: 4, t: "Production", d: "A whole cycle typed in one pass.", href: "/dashboard/investors/production", once: false },
            { n: 5, t: "Settlements", d: "Earned, paid, carried forward.", href: "/dashboard/investors/settlements", once: false },
            { n: 6, t: "Statement", d: "The page you hand over.", href: "/dashboard/investors/statement", once: false },
          ].map((s) => (
            <Link
              key={s.n}
              href={s.href}
              style={{
                textDecoration: "none",
                color: "inherit",
                border: "1px solid " + BORDER,
                borderRadius: 10,
                padding: "13px 15px",
                display: "block",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                <span
                  style={{
                    width: 21,
                    height: 21,
                    borderRadius: 6,
                    background: ACCENT,
                    color: "#04231f",
                    fontSize: 11.5,
                    fontWeight: 800,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {s.n}
                </span>
                <span style={{ fontWeight: 700, fontSize: 13.5 }}>{s.t}</span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: MUTED, letterSpacing: ".06em", textTransform: "uppercase" }}>
                  {s.once ? "once" : "each cycle"}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.55 }}>{s.d}</div>
            </Link>
          ))}
        </div>
      </Panel>
    </PageShell>
  );
}
