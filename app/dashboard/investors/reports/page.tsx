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
  lotResult,
  lotTotals,
  mapCapital,
  mapLot,
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
  TEXT,
} from "../_ui";

type ReportKey = "production" | "monthly" | "return" | "history" | "material";

function isReportKey(value: string | null): value is ReportKey {
  return (
    value === "production" || value === "monthly" || value === "return" || value === "history" || value === "material"
  );
}

// Appended rather than slotted in beside Production: the blurbs below are read
// by index, and reordering this array would silently relabel four panels.
const REPORTS: { key: ReportKey; label: string; blurb: string }[] = [
  { key: "production", label: "Production", blurb: "Every line in the window, by date and grade." },
  { key: "monthly", label: "Monthly Summary", blurb: "Month by month: how much was made and what it earned." },
  { key: "return", label: "Capital & Return", blurb: "What the money earned against what was placed." },
  { key: "history", label: "Settlement History", blurb: "Cycle by cycle, including how long the cash took." },
  { key: "material", label: "Material & Profit", blurb: "Each batch of material against what it produced and what it paid you." },
];

export default function InvestorReportsPage() {
  const { isMobile } = useResponsive();
  const searchParams = useSearchParams();
  const { records: partyRecords } = useBusinessRecords(CAT.party);
  const { records: capitalRecords } = useBusinessRecords(CAT.capital);
  const { records: lotRecords } = useBusinessRecords(CAT.lot);
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

  // Which lots have their grade breakdown open. A set rather than a single id,
  // so two lots can be held side by side while they are compared.
  const [openLots, setOpenLots] = useState<Set<string>>(new Set());
  const toggleLot = (id: string) =>
    setOpenLots((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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

  // Lots are picked by the window, but their output is read from every line
  // ever entered rather than the windowed set. Material lifted on the last day
  // of the window is spun after it, and windowing the output would report a
  // recovery of nothing on a batch that ran perfectly well.
  const lotRows = useMemo(() => {
    const inWindow = lotRecords
      .map(mapLot)
      .filter((l) => l.partyId === partyId && l.date >= from && l.date <= to)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.lotNo < b.lotNo ? 1 : -1));
    return inWindow.map((l) => lotResult(l, allProduction));
  }, [lotRecords, partyId, from, to, allProduction]);

  /**
   * Output in the window that no lot claims.
   *
   * The table above is built lot by lot, so a production line saved without one
   * never reaches it — and its earning is missing from the profit total. On a
   * screen that would be a detail; this is the page that gets printed and handed
   * to the party, so it has to say so rather than quietly under-report.
   */
  const unlinked = useMemo(() => {
    const open = allProduction.filter((l) => !l.lotId && l.date >= from && l.date <= to);
    return {
      count: open.length,
      qty: round2(open.reduce((s, l) => s + l.qty, 0)),
      share: round2(open.reduce((s, l) => s + l.amount, 0)),
    };
  }, [allProduction, from, to]);

  const lotSums = useMemo(() => {
    const totals = lotTotals(lotRows.map((r) => r.lot));
    let producedFromLots = 0;
    let share = 0;
    for (const r of lotRows) {
      producedFromLots += r.producedQty;
      share += r.share;
    }
    return {
      value: totals.value,
      qty: totals.qty,
      produced: round2(producedFromLots),
      share: round2(share),
      recovery: totals.qty > 0 ? round2((producedFromLots / totals.qty) * 100) : 0,
      perUnit: producedFromLots > 0 ? round2(share / producedFromLots) : 0,
      costPerUnit: totals.qty > 0 ? round2(totals.value / totals.qty) : 0,
    };
  }, [lotRows]);

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
      <style>{`
        .investor-report-print-heading { display: none; }
        @media print {
          @page { size: A4; margin: 14mm; }
          html, body, #__next { background: #fff !important; color: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          #investor-report-print, #investor-report-print * { visibility: visible !important; }
          #investor-report-print { position: fixed; inset: 0; width: 100vw; min-height: 100vh; padding: 14mm; box-sizing: border-box; color: #000 !important; background: #fff !important; font-family: Arial, sans-serif !important; }
          #investor-report-print * { color: #000 !important; background: transparent !important; border-color: transparent !important; box-shadow: none !important; text-shadow: none !important; }
          #investor-report-print .investor-report-print-heading { display: block !important; padding-bottom: 10px; margin-bottom: 18px; }
          #investor-report-print section { border: none !important; border-radius: 0 !important; break-inside: avoid; }
          #investor-report-print table { width: 100% !important; min-width: 0 !important; }
          #investor-report-print thead { display: table-header-group; }
          #investor-report-print tr { break-inside: avoid; }
        }
      `}</style>

      <div className="no-print">
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

      </div>

      <div id="investor-report-print">
        <div className="investor-report-print-heading">
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" }}>FinovaOS · Investor Report</div>
          <h1 style={{ margin: "6px 0 0", fontSize: 22 }}>{REPORTS.find((item) => item.key === report)?.label}</h1>
          <div style={{ marginTop: 5, fontSize: 12 }}>
            {party?.name || "—"}{party?.business ? " · " + party.business : ""} · {fmtDate(from)} to {fmtDate(to)}
          </div>
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

      {report === "material" && (
        <Panel title="Material & Profit" hint={REPORTS[4].blurb}>
          <Tiles
            items={[
              { label: "Material in", value: fmtMoney(lotSums.value) },
              { label: "Weight in", value: fmtQty(lotSums.qty) + " " + unit },
              { label: "Cost per " + unit, value: fmtMoney(lotSums.costPerUnit) },
              { label: "Produced", value: fmtQty(lotSums.produced) + " " + unit },
              { label: "Your profit", value: fmtMoney(lotSums.share), tone: "#2dd4bf" },
              { label: "Profit per " + unit, value: fmtMoney(lotSums.perUnit), tone: "#2dd4bf" },
            ]}
          />
          <TableWrap>
            <table style={{ ...tableStyle, minWidth: 860 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Lot #</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Material</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Value</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>In ({unit})</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Cost/{unit}</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Produced</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Recovery</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Your profit</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Profit/{unit}</th>
                </tr>
              </thead>
              <tbody>
                {lotRows.map((r) => {
                  const open = openLots.has(r.lot.id);
                  return [
                    <tr key={r.lot.id}>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>
                        {r.grades.length > 0 && (
                          <button
                            type="button"
                            className="lot-toggle"
                            onClick={() => toggleLot(r.lot.id)}
                            aria-expanded={open}
                            title={open ? "Hide grades" : "Show grades"}
                            style={{
                              border: "1px solid " + BORDER,
                              background: "transparent",
                              color: open ? ACCENT : MUTED,
                              borderRadius: 6,
                              width: 20,
                              height: 20,
                              lineHeight: 1,
                              fontSize: 10,
                              cursor: "pointer",
                              marginRight: 7,
                              padding: 0,
                            }}
                          >
                            {open ? "▾" : "▸"}
                          </button>
                        )}
                        {r.lot.lotNo || "-"}
                      </td>
                      <td style={tdStyle}>{fmtDate(r.lot.date)}</td>
                      <td style={tdStyle}>{r.lot.material}</td>
                      <td style={numTd}>{fmtMoney(r.lot.value)}</td>
                      <td style={numTd}>{fmtQty(r.lot.qty)}</td>
                      <td style={numTd}>{fmtMoney(r.costPerUnit)}</td>
                      <td style={numTd}>{r.lineCount > 0 ? fmtQty(r.producedQty) : "-"}</td>
                      <td
                        style={{
                          ...numTd,
                          color:
                            r.lineCount === 0 ? MUTED : r.recoveryPct > 100 ? "#f87171" : r.recoveryPct === 100 ? undefined : "#fbbf24",
                        }}
                      >
                        {r.lineCount > 0 ? fmtQty(r.recoveryPct) + "%" : "not yet"}
                      </td>
                      <td style={{ ...numTd, fontWeight: 700 }}>{fmtMoney(r.share)}</td>
                      <td style={numTd}>{r.producedQty > 0 ? fmtMoney(r.sharePerUnit) : "-"}</td>
                    </tr>,
                    // Always rendered, only hidden — a collapsed row that does not
                    // exist cannot be brought back by print CSS, and this page is
                    // printed and handed over. On paper every lot opens itself.
                    r.grades.length > 0 ? (
                      <tr key={r.lot.id + "-grades"} className="lot-detail" style={{ display: open ? undefined : "none" }}>
                        <td style={{ ...tdStyle, padding: "0 12px 14px 12px" }} colSpan={10}>
                          <table style={{ borderCollapse: "collapse", fontSize: 12.5, minWidth: 420 }}>
                            <thead>
                              <tr>
                                <th style={{ ...thStyle, borderBottom: "none", padding: "6px 14px 6px 0" }}>Grade</th>
                                <th style={{ ...thStyle, borderBottom: "none", padding: "6px 14px 6px 0", textAlign: "right" }}>
                                  Qty ({unit})
                                </th>
                                {party?.profitModel !== "percentage" && (
                                  <th style={{ ...thStyle, borderBottom: "none", padding: "6px 14px 6px 0", textAlign: "right" }}>
                                    Rate
                                  </th>
                                )}
                                <th style={{ ...thStyle, borderBottom: "none", padding: "6px 14px 6px 0", textAlign: "right" }}>
                                  Profit
                                </th>
                                <th style={{ ...thStyle, borderBottom: "none", padding: "6px 0", textAlign: "right" }}>Of lot</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.grades.map((g) => (
                                <tr key={g.gradeId}>
                                  <td style={{ padding: "5px 14px 5px 0", color: TEXT }}>{g.name}</td>
                                  <td style={{ padding: "5px 14px 5px 0", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                    {fmtQty(g.qty)}
                                  </td>
                                  {party?.profitModel !== "percentage" && (
                                    <td style={{ padding: "5px 14px 5px 0", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                      {fmtMoney(g.rate)}
                                    </td>
                                  )}
                                  <td
                                    style={{
                                      padding: "5px 14px 5px 0",
                                      textAlign: "right",
                                      fontVariantNumeric: "tabular-nums",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {fmtMoney(g.share)}
                                  </td>
                                  <td style={{ padding: "5px 0", textAlign: "right", color: MUTED, fontVariantNumeric: "tabular-nums" }}>
                                    {r.producedQty > 0 ? fmtQty(round2((g.qty / r.producedQty) * 100)) + "%" : "-"}
                                  </td>
                                </tr>
                              ))}
                              {/* The line that answers "where did 5.47 come from". */}
                              <tr>
                                <td style={{ padding: "7px 14px 0 0", fontWeight: 700, borderTop: "1px solid " + BORDER }}>
                                  {r.lot.lotNo || "Lot"} total
                                </td>
                                <td
                                  style={{
                                    padding: "7px 14px 0 0",
                                    textAlign: "right",
                                    fontWeight: 700,
                                    borderTop: "1px solid " + BORDER,
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  {fmtQty(r.producedQty)}
                                </td>
                                {party?.profitModel !== "percentage" && (
                                  <td
                                    style={{
                                      padding: "7px 14px 0 0",
                                      textAlign: "right",
                                      color: MUTED,
                                      borderTop: "1px solid " + BORDER,
                                      fontVariantNumeric: "tabular-nums",
                                    }}
                                  >
                                    {fmtMoney(r.sharePerUnit)} avg
                                  </td>
                                )}
                                <td
                                  style={{
                                    padding: "7px 14px 0 0",
                                    textAlign: "right",
                                    fontWeight: 800,
                                    borderTop: "1px solid " + BORDER,
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  {fmtMoney(r.share)}
                                </td>
                                <td style={{ padding: "7px 0 0", borderTop: "1px solid " + BORDER }} />
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    ) : null,
                  ];
                })}
                {lotRows.length > 0 && (
                  <tr>
                    <td style={{ ...tdStyle, fontWeight: 800 }} colSpan={3}>
                      Total
                    </td>
                    <td style={{ ...numTd, fontWeight: 800 }}>{fmtMoney(lotSums.value)}</td>
                    <td style={{ ...numTd, fontWeight: 800 }}>{fmtQty(lotSums.qty)}</td>
                    <td style={{ ...numTd, fontWeight: 800 }}>{fmtMoney(lotSums.costPerUnit)}</td>
                    <td style={{ ...numTd, fontWeight: 800 }}>{fmtQty(lotSums.produced)}</td>
                    <td style={{ ...numTd, fontWeight: 800 }}>{lotSums.recovery > 0 ? fmtQty(lotSums.recovery) + "%" : "-"}</td>
                    <td style={{ ...numTd, fontWeight: 800 }}>{fmtMoney(lotSums.share)}</td>
                    <td style={{ ...numTd, fontWeight: 800 }}>{fmtMoney(lotSums.perUnit)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {!loading && lotRows.length === 0 && <Empty>No material recorded in this window.</Empty>}
            {loading && <Empty>Loading…</Empty>}
          </TableWrap>
          {unlinked.count > 0 && (
            <div
              style={{
                marginTop: 14,
                border: "1px solid #fbbf2455",
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 12.5,
                lineHeight: 1.6,
                color: "#fbbf24",
                maxWidth: 620,
              }}
            >
              Also produced in this window but not tied to any lot: <strong>{fmtQty(unlinked.qty)} {unit}</strong> across{" "}
              {unlinked.count} line{unlinked.count === 1 ? "" : "s"}, earning <strong>{fmtMoney(unlinked.share)}</strong>. That is not
              counted in the table above, so your total earning for this window is{" "}
              <strong>{fmtMoney(round2(lotSums.share + unlinked.share))}</strong>. Tie those lines to a lot on the Production page to
              bring them in.
            </div>
          )}

          <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6, marginTop: 14, maxWidth: 620 }}>
            The window picks the lots by the day the material came in. Output is counted whenever it was spun, so a batch lifted at
            the end of the window still shows the kilos it went on to produce. Profit per {unit} is your own earning under the agreed
            rates — it is not the factory&apos;s margin on the goods.
          </p>
        </Panel>
      )}
      </div>
    </PageShell>
  );
}
