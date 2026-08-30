"use client";

// The four questions that get asked away from the daily grind.
//
// Production and Monthly answer "what is the factory doing". Capital & Return
// answers the one no trading or manufacturing report can: what this money
// earned against what it cost to leave it there. Settlement History answers
// whether the man on the other side pays on time — and it answers it with a
// number rather than a feeling.

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useResponsive } from "@/hooks/useResponsive";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { DateInput } from "../../reports/_components/DateInput";
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
  monthLabel,
  returnSummary,
  round2,
  todayISO,
} from "../_shared";
import {
  Btn,
  Empty,
  Field,
  PageShell,
  Panel,
  PartyPicker,
  TableWrap,
  Tabs,
  Tiles,
  inp,
  numTd,
  tableStyle,
  tdStyle,
  thStyle,
  ACCENT,
  BORDER,
  MUTED,
} from "../_ui";

type ReportKey = "production" | "monthly" | "return" | "history";

function isReportKey(value: string | null): value is ReportKey {
  return value === "production" || value === "monthly" || value === "return" || value === "history";
}

const REPORTS: { key: ReportKey; label: string; blurb: string }[] = [
  { key: "production", label: "Production", blurb: "Every line in the window, by date and grade." },
  { key: "monthly", label: "Monthly Summary", blurb: "Month by month: how much was made and what it earned." },
  { key: "return", label: "Capital & Return", blurb: "What the money earned against what was placed." },
  { key: "history", label: "Settlement History", blurb: "Cycle by cycle, including how long the cash took." },
];

export default function InvestorReportsPage() {
  const { isMobile } = useResponsive();
  const searchParams = useSearchParams();
  const { records: partyRecords } = useBusinessRecords(CAT.party);
  const { records: capitalRecords } = useBusinessRecords(CAT.capital);
  const { records: productionRecords, loading } = useBusinessRecords(CAT.production);
  const { records: settlementRecords } = useBusinessRecords(CAT.settlement);

  const parties = useMemo(() => partyRecords.map(mapParty), [partyRecords]);
  // The picker sits on the first party until one is chosen. Deriving that
  // rather than writing it back through an effect keeps a render out of the
  // cycle and stops the selection fighting a slow first load.
  const [pickedParty, setPickedParty] = useState("");
  const partyId = pickedParty || parties[0]?.id || "";
  const setPartyId = setPickedParty;

  const party = parties.find((p) => p.id === partyId);
  const unit = party?.unit || "kg";

  const [report, setReport] = useState<ReportKey>("production");
  useEffect(() => {
    const view = searchParams.get("view");
    if (isReportKey(view)) setReport(view);
  }, [searchParams]);
  const [fromEdit, setFromEdit] = useState("");
  const [to, setTo] = useState(todayISO());

  const capital = useMemo(() => capitalRecords.map(mapCapital).filter((c) => c.partyId === partyId), [capitalRecords, partyId]);
  const capTotals = useMemo(() => capitalTotals(capital), [capital]);

  // Default the window to the day the first rupee went in.
  const from = fromEdit || capTotals.firstDate || "";
  const setFrom = setFromEdit;

  const allProduction = useMemo(() => productionRecords.map(mapProduction).filter((l) => l.partyId === partyId), [productionRecords, partyId]);
  const production = useMemo(
    () => allProduction.filter((l) => l.date >= from && l.date <= to).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [allProduction, from, to],
  );

  const settlements = useMemo(
    () =>
      settlementRecords
        .map(mapSettlement)
        .filter((s) => s.partyId === partyId)
        .sort((a, b) => b.cycleNo - a.cycleNo),
    [settlementRecords, partyId],
  );

  const earned = round2(production.reduce((s, l) => s + l.amount, 0));
  const produced = round2(production.reduce((s, l) => s + l.qty, 0));

  const monthly = useMemo(() => {
    const map = new Map<string, { key: string; qty: number; amount: number; grades: Map<string, number> }>();
    for (const l of production) {
      const k = monthKey(l.date);
      const row = map.get(k) || { key: k, qty: 0, amount: 0, grades: new Map<string, number>() };
      row.qty += l.qty;
      row.amount += l.amount;
      row.grades.set(l.gradeName, (row.grades.get(l.gradeName) || 0) + l.qty);
      map.set(k, row);
    }
    return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [production]);

  // Return is measured on everything ever earned, not just the window — the
  // window would flatter or punish the number depending on where it was cut.
  const lifetimeEarned = useMemo(() => round2(allProduction.reduce((s, l) => s + l.amount, 0)), [allProduction]);
  const ret = useMemo(
    () => returnSummary(capTotals.net, lifetimeEarned, capTotals.firstDate, todayISO()),
    [capTotals.net, capTotals.firstDate, lifetimeEarned],
  );

  const delays = settlements.map((s) => daysBetween(s.toDate, s.settledOn)).filter((d) => d >= 0);
  const avgDelay = delays.length ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0;

  return (
    <PageShell
      title="Reports"
      subtitle="Four views on the same records. The window applies to production; return is measured over the whole life of the investment."
      isMobile={isMobile}
      actions={<Btn onClick={() => window.print()}>Print</Btn>}
    >
      <Tabs active="/dashboard/investors/reports" />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginBottom: 18 }}>
        <Field label="Party" width={240}>
          <PartyPicker parties={parties} value={partyId} onChange={setPartyId} />
        </Field>
        <Field label="From" width={155}>
          <DateInput value={from} onChange={setFrom} style={inp()} />
        </Field>
        <Field label="To" width={155}>
          <DateInput value={to} onChange={setTo} style={inp()} />
        </Field>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {REPORTS.map((r) => {
          const on = r.key === report;
          return (
            <button
              key={r.key}
              onClick={() => setReport(r.key)}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Outfit','Inter',sans-serif",
                border: "1px solid " + (on ? ACCENT : BORDER),
                background: on ? ACCENT : "transparent",
                color: on ? "#04231f" : MUTED,
              }}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {report === "production" && (
        <Panel title="Production" hint={REPORTS[0].blurb}>
          <Tiles
            items={[
              { label: "Lines", value: String(production.length) },
              { label: "Produced", value: fmtQty(produced) + " " + unit },
              { label: "Earned", value: fmtMoney(earned), tone: "#2dd4bf" },
            ]}
          />
          <TableWrap>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Grade</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Qty</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Rate</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Earned</th>
                  <th style={thStyle}>State</th>
                </tr>
              </thead>
              <tbody>
                {production.slice(0, 400).map((l) => (
                  <tr key={l.id}>
                    <td style={tdStyle}>{fmtDate(l.date)}</td>
                    <td style={tdStyle}>{l.gradeName}</td>
                    <td style={numTd}>{fmtQty(l.qty)}</td>
                    <td style={numTd}>{party?.profitModel === "percentage" ? fmtMoney(l.baseProfit) : fmtMoney(l.rate)}</td>
                    <td style={{ ...numTd, fontWeight: 700 }}>{fmtMoney(l.amount)}</td>
                    <td style={{ ...tdStyle, color: l.settlementId ? MUTED : "#2dd4bf" }}>{l.settlementId ? "settled" : "open"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && production.length === 0 && <Empty>No production in this window.</Empty>}
            {loading && <Empty>Loading…</Empty>}
          </TableWrap>
        </Panel>
      )}

      {report === "monthly" && (
        <Panel title="Monthly Summary" hint={REPORTS[1].blurb}>
          <TableWrap>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Month</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Produced ({unit})</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Earned</th>
                  <th style={thStyle}>By grade</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m) => (
                  <tr key={m.key}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{monthLabel(m.key)}</td>
                    <td style={numTd}>{fmtQty(m.qty)}</td>
                    <td style={{ ...numTd, fontWeight: 700 }}>{fmtMoney(m.amount)}</td>
                    <td style={{ ...tdStyle, color: MUTED, fontSize: 12.5 }}>
                      {[...m.grades.entries()].map(([g, q]) => g + " " + fmtQty(q)).join("  ·  ") || "-"}
                    </td>
                  </tr>
                ))}
                {monthly.length > 0 && (
                  <tr>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>Total</td>
                    <td style={{ ...numTd, fontWeight: 800 }}>{fmtQty(produced)}</td>
                    <td style={{ ...numTd, fontWeight: 800 }}>{fmtMoney(earned)}</td>
                    <td style={tdStyle} />
                  </tr>
                )}
              </tbody>
            </table>
            {!loading && monthly.length === 0 && <Empty>No production in this window.</Empty>}
          </TableWrap>
        </Panel>
      )}

      {report === "return" && (
        <Panel
          title="Capital & Return"
          hint="Measured from the day the first rupee went in, over everything earned since. Annualised by simple scaling, not compounding."
        >
          <div
            style={{
              background: "var(--panel-bg)",
              border: "1px solid " + BORDER,
              borderRadius: 10,
              padding: "18px 20px",
              maxWidth: 460,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {[
              ["Capital placed", fmtMoney(capTotals.invested)],
              ["Capital withdrawn", capTotals.withdrawn > 0 ? "-" + fmtMoney(capTotals.withdrawn) : fmtMoney(0)],
              ["Net capital", fmtMoney(capTotals.net)],
              ["Total earned", fmtMoney(lifetimeEarned)],
              ["Held for", ret.days + " days"],
              ["Return", ret.returnPct + "%"],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{ display: "flex", justifyContent: "space-between", gap: 18, padding: "8px 0", fontSize: 13.5, borderBottom: "1px solid " + BORDER }}
              >
                <span style={{ color: MUTED }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 18,
                paddingTop: 13,
                marginTop: 8,
                borderTop: "2px solid " + ACCENT,
                fontSize: 17,
                fontWeight: 800,
              }}
            >
              <span>Annualised return</span>
              <span>{ret.annualPct}%</span>
            </div>
          </div>
          <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6, marginTop: 14, maxWidth: 560 }}>
            This is the figure to hold against a bank deposit, a plot, or another factory. It does not come out of a trading or
            manufacturing report, because those measure what a business earned — not what your capital earned by sitting in it.
          </p>
        </Panel>
      )}

      {report === "history" && (
        <Panel title="Settlement History" hint={REPORTS[3].blurb}>
          <Tiles
            items={[
              { label: "Cycles closed", value: String(settlements.length) },
              { label: "Average wait for cash", value: avgDelay + " days", tone: avgDelay > 7 ? "#fbbf24" : undefined },
              { label: "Currently outstanding", value: fmtMoney(settlements[0]?.closingBalance || 0) },
            ]}
          />
          <TableWrap>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Cycle</th>
                  <th style={thStyle}>Period</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Produced</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Earned</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Received</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Carried</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Waited</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => {
                  const waited = daysBetween(s.toDate, s.settledOn);
                  return (
                    <tr key={s.id}>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>#{s.cycleNo}</td>
                      <td style={{ ...tdStyle, color: MUTED }}>
                        {fmtDate(s.fromDate)} – {fmtDate(s.toDate)}
                      </td>
                      <td style={numTd}>{fmtQty(s.totalQty)}</td>
                      <td style={numTd}>{fmtMoney(s.profitDue)}</td>
                      <td style={numTd}>{fmtMoney(s.cashReceived)}</td>
                      <td style={{ ...numTd, fontWeight: 700 }}>{fmtMoney(s.closingBalance)}</td>
                      <td style={{ ...numTd, color: waited > 7 ? "#fbbf24" : MUTED }}>{waited} d</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {settlements.length === 0 && <Empty>No cycle closed yet for this party.</Empty>}
          </TableWrap>
        </Panel>
      )}
    </PageShell>
  );
}
