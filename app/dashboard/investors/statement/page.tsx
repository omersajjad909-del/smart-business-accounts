"use client";

// Step 6 — the sheet of paper.
//
// This is what the whole module exists to produce. Not a dashboard: one page
// the investor can print or photograph and put in front of the man running the
// factory, showing what was placed, what was made, what was earned, what was
// paid, and what is still owed — with nothing left to interpret.

import { useMemo, useState } from "react";
import { useResponsive } from "@/hooks/useResponsive";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { DateInput } from "../../reports/_components/DateInput";
import {
  CAT,
  capitalTotals,
  fmtDate,
  fmtMoney,
  fmtQty,
  mapCapital,
  mapParty,
  mapProduction,
  mapSettlement,
  round2,
  todayISO,
} from "../_shared";
import { Btn, Field, PageShell, PartyPicker, Tabs, inp, MUTED, BORDER, TEXT, ACCENT } from "../_ui";

export default function InvestorStatementPage() {
  const { isMobile } = useResponsive();
  const { records: partyRecords } = useBusinessRecords(CAT.party);
  const { records: capitalRecords } = useBusinessRecords(CAT.capital);
  const { records: productionRecords } = useBusinessRecords(CAT.production);
  const { records: settlementRecords } = useBusinessRecords(CAT.settlement);

  const parties = useMemo(() => partyRecords.map(mapParty), [partyRecords]);
  // The picker sits on the first party until one is chosen. Deriving that
  // rather than writing it back through an effect keeps a render out of the
  // cycle and stops the selection fighting a slow first load.
  const [pickedParty, setPickedParty] = useState("");
  const partyId = pickedParty || parties[0]?.id || "";
  const setPartyId = setPickedParty;

  const party = parties.find((p) => p.id === partyId);

  const [fromEdit, setFromEdit] = useState("");
  const [to, setTo] = useState(todayISO());

  const capital = useMemo(() => capitalRecords.map(mapCapital).filter((c) => c.partyId === partyId), [capitalRecords, partyId]);
  const capTotals = useMemo(() => capitalTotals(capital), [capital]);

  // Default the window to the day the first rupee went in.
  const from = fromEdit || capTotals.firstDate || "";
  const setFrom = setFromEdit;

  const production = useMemo(
    () => productionRecords.map(mapProduction).filter((l) => l.partyId === partyId && l.date >= from && l.date <= to),
    [productionRecords, partyId, from, to],
  );

  const settlements = useMemo(
    () =>
      settlementRecords
        .map(mapSettlement)
        .filter((s) => s.partyId === partyId && s.toDate >= from && s.toDate <= to)
        .sort((a, b) => a.cycleNo - b.cycleNo),
    [settlementRecords, partyId, from, to],
  );

  const byGrade = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; amount: number }>();
    for (const l of production) {
      const row = map.get(l.gradeName) || { name: l.gradeName, qty: 0, amount: 0 };
      row.qty += l.qty;
      row.amount += l.amount;
      map.set(l.gradeName, row);
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }, [production]);

  const earned = round2(production.reduce((s, l) => s + l.amount, 0));
  const produced = round2(production.reduce((s, l) => s + l.qty, 0));
  const received = round2(settlements.reduce((s, x) => s + x.cashReceived, 0));
  // The closing balance of the last settlement is the authoritative figure —
  // it already carries everything from before this statement's window.
  const outstanding = settlements.length ? settlements[settlements.length - 1].closingBalance : round2(earned - received);

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    padding: "7px 0",
    fontSize: 13.5,
    fontVariantNumeric: "tabular-nums",
    borderBottom: "1px solid " + BORDER,
  };

  return (
    <PageShell
      title="Statement"
      subtitle="One page, the same shape every time. Print it or send the photo."
      isMobile={isMobile}
      actions={
        <Btn onClick={() => window.print()}>Print</Btn>
      }
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #investor-statement, #investor-statement * { visibility: visible !important; }
          #investor-statement { position: absolute; left: 0; top: 0; width: 100%; padding: 0; color: #000; }
          #investor-statement .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print">
        <Tabs active="/dashboard/investors/statement" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginBottom: 20 }}>
          <Field label="Party" width={260}>
            <PartyPicker parties={parties} value={partyId} onChange={setPartyId} />
          </Field>
          <Field label="From" width={160}>
            <DateInput value={from} onChange={setFrom} style={inp()} />
          </Field>
          <Field label="To" width={160}>
            <DateInput value={to} onChange={setTo} style={inp()} />
          </Field>
        </div>
      </div>

      <div
        id="investor-statement"
        style={{
          background: "var(--panel-bg)",
          border: "1px solid " + BORDER,
          borderRadius: 12,
          padding: isMobile ? "20px 18px" : "30px 34px",
          maxWidth: 660,
        }}
      >
        <div style={{ borderBottom: "2px solid " + TEXT, paddingBottom: 14, marginBottom: 18 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: MUTED }}>
            Investor Statement
          </div>
          <h2 style={{ margin: "8px 0 0", fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>{party?.name || "—"}</h2>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 5 }}>
            {party?.business ? party.business + " · " : ""}
            {fmtDate(from)} to {fmtDate(to)}
          </div>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 3 }}>
            {party?.profitModel === "percentage"
              ? party.sharePercent + "% share of profit"
              : "Fixed rate per " + (party?.unit || "kg")}
          </div>
        </div>

        <SectionTitle>Capital</SectionTitle>
        <div style={rowStyle}>
          <span>Placed</span>
          <span>{fmtMoney(capTotals.invested)}</span>
        </div>
        <div style={rowStyle}>
          <span>Withdrawn</span>
          <span>{capTotals.withdrawn > 0 ? "-" + fmtMoney(capTotals.withdrawn) : fmtMoney(0)}</span>
        </div>
        <div style={{ ...rowStyle, fontWeight: 800, borderBottom: "none" }}>
          <span>Net capital with the party</span>
          <span>{fmtMoney(capTotals.net)}</span>
        </div>

        <SectionTitle>Production in this period</SectionTitle>
        {byGrade.length === 0 && <div style={{ fontSize: 13, color: MUTED, padding: "8px 0" }}>No production recorded in this period.</div>}
        {byGrade.map((g) => (
          <div key={g.name} style={rowStyle}>
            <span>
              {g.name} · {fmtQty(g.qty)} {party?.unit || "kg"}
            </span>
            <span>{fmtMoney(g.amount)}</span>
          </div>
        ))}
        <div style={{ ...rowStyle, fontWeight: 800, borderBottom: "none" }}>
          <span>Total · {fmtQty(produced)} {party?.unit || "kg"}</span>
          <span>{fmtMoney(earned)}</span>
        </div>

        <SectionTitle>Settlements</SectionTitle>
        {settlements.length === 0 && <div style={{ fontSize: 13, color: MUTED, padding: "8px 0" }}>No cycle closed in this period.</div>}
        {settlements.map((s) => (
          <div key={s.id} style={rowStyle}>
            <span>
              Cycle {s.cycleNo} · {fmtDate(s.fromDate)}–{fmtDate(s.toDate)} · earned {fmtMoney(s.profitDue)}
            </span>
            <span>-{fmtMoney(s.cashReceived)}</span>
          </div>
        ))}
        <div style={rowStyle}>
          <span>Total received</span>
          <span>-{fmtMoney(received)}</span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
            marginTop: 14,
            paddingTop: 14,
            borderTop: "2px solid " + ACCENT,
            fontSize: 17,
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span>Outstanding</span>
          <span>{fmtMoney(outstanding)}</span>
        </div>

        <div style={{ marginTop: 22, fontSize: 11.5, color: MUTED, lineHeight: 1.6 }}>
          Generated {fmtDate(todayISO())}. Rates shown are the rates that were in force on each day of production.
        </div>
      </div>
    </PageShell>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: ".12em",
        textTransform: "uppercase",
        color: MUTED,
        margin: "22px 0 8px",
      }}
    >
      {children}
    </div>
  );
}
