"use client";

// Step 4 — what the factory actually made.
//
// The investor is not standing at the machine. He is handed ten days of
// figures at once and copies them down, so this is a grid he can fill top to
// bottom, not a one-record-at-a-time form. Each line prices itself from the
// rate in force on its own date and then keeps that rate for good.

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useResponsive } from "@/hooks/useResponsive";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { DateInput } from "../../reports/_components/DateInput";
import {
  CAT,
  fmtDate,
  fmtMoney,
  fmtQty,
  lineAmount,
  lotResult,
  mapGrade,
  mapLot,
  mapParty,
  mapProduction,
  rateOn,
  round2,
  todayISO,
} from "../_shared";
import {
  Btn,
  Empty,
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
  MUTED,
} from "../_ui";

type Row = { key: string; date: string; gradeId: string; lotId: string; qty: string; baseProfit: string };

let rowSeq = 0;
function blankRow(date: string, gradeId: string, lotId = ""): Row {
  rowSeq += 1;
  return { key: "r" + rowSeq, date, gradeId, lotId, qty: "", baseProfit: "" };
}

export default function InvestorProductionPage() {
  const { isMobile } = useResponsive();
  const { records: partyRecords } = useBusinessRecords(CAT.party);
  const { records: gradeRecords } = useBusinessRecords(CAT.grade);
  const { records: lotRecords } = useBusinessRecords(CAT.lot);
  const { records, loading, create, remove } = useBusinessRecords(CAT.production);

  const parties = useMemo(() => partyRecords.map(mapParty).filter((p) => p.status === "active"), [partyRecords]);
  // The picker sits on the first party until one is chosen. Deriving that
  // rather than writing it back through an effect keeps a render out of the
  // cycle and stops the selection fighting a slow first load.
  const [pickedParty, setPickedParty] = useState("");
  const partyId = pickedParty || parties[0]?.id || "";
  const setPartyId = setPickedParty;

  const party = parties.find((p) => p.id === partyId);
  const byPercentage = party?.profitModel === "percentage";

  const grades = useMemo(
    () =>
      gradeRecords
        .map(mapGrade)
        .filter((g) => g.partyId === partyId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [gradeRecords, partyId],
  );

  // Newest material first: a cycle being typed up almost always belongs to the
  // last lot that came in, so the one the user wants is at the top of the list.
  const lots = useMemo(
    () =>
      lotRecords
        .map(mapLot)
        .filter((l) => l.partyId === partyId)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.lotNo < b.lotNo ? 1 : -1)),
    [lotRecords, partyId],
  );
  const lotLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of lots) map.set(l.id, (l.lotNo || "Lot") + (l.material ? " · " + l.material : ""));
    return map;
  }, [lots]);

  const lines = useMemo(
    () =>
      records
        .map(mapProduction)
        .filter((l) => l.partyId === partyId)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [records, partyId],
  );
  const unsettled = useMemo(() => lines.filter((l) => !l.settlementId), [lines]);

  /** Weight left in each lot after everything already saved against it. */
  const lotLeft = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of lots) map.set(l.id, lotResult(l, lines).remaining);
    return map;
  }, [lots, lines]);

  const [rows, setRows] = useState<Row[]>([blankRow(todayISO(), "")]);
  const [saving, setSaving] = useState(false);

  function priced(row: Row) {
    const grade = grades.find((g) => g.id === row.gradeId);
    const rate = rateOn(grade, row.date);
    const qty = Number(row.qty) || 0;
    const base = Number(row.baseProfit) || 0;
    return { grade, rate, qty, base, amount: lineAmount(party, qty, rate, base) };
  }

  const draftTotals = useMemo(() => {
    let qty = 0;
    let amount = 0;
    for (const r of rows) {
      const p = priced(r);
      qty += p.qty;
      amount += p.amount;
    }
    return { qty: round2(qty), amount: round2(amount) };
  }, [rows, grades, party]);

  /**
   * Lots this draft would overdraw.
   *
   * Summed per lot across the whole draft rather than checked row by row:
   * three rows of 8,000 kg against a 20,000 kg lot are each fine on their own
   * and wrong together, and row-by-row validation would wave all three through.
   */
  const lotOverflow = useMemo(() => {
    const adding = new Map<string, number>();
    for (const r of rows) {
      if (!r.lotId) continue;
      adding.set(r.lotId, (adding.get(r.lotId) || 0) + (Number(r.qty) || 0));
    }
    const over: { lotNo: string; left: number; adding: number }[] = [];
    for (const [id, qty] of Array.from(adding.entries())) {
      const lot = lots.find((l) => l.id === id);
      // A lot with no weight recorded has nothing to overdraw.
      if (!lot || lot.qty <= 0 || qty <= 0) continue;
      const left = lotLeft.get(id) ?? 0;
      if (qty > left) over.push({ lotNo: lot.lotNo || "That lot", left: Math.max(0, round2(left)), adding: round2(qty) });
    }
    return over;
  }, [rows, lots, lotLeft]);

  const unsettledTotals = useMemo(() => {
    let qty = 0;
    let amount = 0;
    for (const l of unsettled) {
      qty += l.qty;
      amount += l.amount;
    }
    return { qty: round2(qty), amount: round2(amount) };
  }, [unsettled]);

  function setRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    const last = rows[rows.length - 1];
    setRows((prev) => [...prev, blankRow(last?.date || todayISO(), last?.gradeId || "", last?.lotId || "")]);
  }

  async function saveAll() {
    if (!partyId) return toast.error("Add a party first");
    const ready = rows.filter((r) => r.date && r.gradeId && (Number(r.qty) > 0 || Number(r.baseProfit) > 0));
    if (ready.length === 0) return toast.error("Nothing to save — fill at least one line");

    const unpriced = ready.filter((r) => !byPercentage && priced(r).rate <= 0);
    if (unpriced.length > 0) {
      const first = unpriced[0];
      const name = grades.find((g) => g.id === first.gradeId)?.name || "that grade";
      return toast.error("No rate for " + name + " on " + fmtDate(first.date) + ". Add a rate starting on or before that date.");
    }

    if (lotOverflow.length > 0) {
      const o = lotOverflow[0];
      const u = party?.unit || "kg";
      return toast.error(
        o.left > 0
          ? o.lotNo + " has only " + fmtQty(o.left) + " " + u + " left, but this draft adds " + fmtQty(o.adding) + " " + u + "."
          : o.lotNo + " is finished — its whole weight is already produced. Pick another lot.",
      );
    }

    setSaving(true);
    try {
      for (const row of ready) {
        const p = priced(row);
        await create({
          title: p.grade?.name || "Production",
          refId: partyId,
          status: "open",
          amount: p.amount,
          date: row.date,
          data: {
            gradeId: row.gradeId,
            lotId: row.lotId,
            qty: p.qty,
            rate: p.rate,
            baseProfit: p.base,
            settlementId: "",
          },
        });
      }
      // A saved cycle leaves the form exactly as the page opens it: today's
      // date and nothing else. Carrying the last grade and lot forward saved a
      // click but left a filled-in form that had already been submitted — and
      // when the lot it carried was finished, it handed back a dead choice.
      setRows([blankRow(todayISO(), "")]);
      toast.success(ready.length + " line" + (ready.length === 1 ? "" : "s") + " saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Production"
      subtitle="Enter a whole cycle in one pass. Each line takes the rate that was in force on its own date and keeps it."
      isMobile={isMobile}
    >
      <Tabs active="/dashboard/investors/production" />

      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: MUTED, display: "block", marginBottom: 5 }}>
          Party
        </span>
        <PartyPicker parties={parties} value={partyId} onChange={setPartyId} />
      </div>

      <Tiles
        items={[
          { label: "Awaiting settlement", value: fmtQty(unsettledTotals.qty) + " " + (party?.unit || "kg") },
          { label: "Share on those lines", value: fmtMoney(unsettledTotals.amount), tone: "#2dd4bf" },
          { label: "Lines in this draft", value: String(rows.filter((r) => Number(r.qty) > 0 || Number(r.baseProfit) > 0).length) },
          { label: "Draft share", value: fmtMoney(draftTotals.amount) },
        ]}
      />

      <Panel
        step={1}
        title="Enter the cycle"
        hint={
          (byPercentage
            ? "Enter what was produced and the profit the business made for that entry — your share is worked out at " + (party?.sharePercent || 0) + "%."
            : "Rate fills itself from the grade's history for that date. A blank rate means no rate was in force yet.") +
          " Pick the lot the output came from and Material In will show what that batch turned into — leaving it blank costs you nothing but the trace."
        }
        right={<Btn small tone="ghost" onClick={addRow}>+ Row</Btn>}
      >
        <TableWrap>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 150 }}>Date</th>
                <th style={thStyle}>Grade</th>
                <th style={thStyle}>Lot</th>
                <th style={{ ...thStyle, textAlign: "right", width: 110 }}>Qty ({party?.unit || "kg"})</th>
                <th style={{ ...thStyle, textAlign: "right", width: 130 }}>{byPercentage ? "Business profit" : "Rate"}</th>
                <th style={{ ...thStyle, textAlign: "right", width: 120 }}>Your share</th>
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const p = priced(row);
                return (
                  <tr key={row.key}>
                    <td style={tdStyle}>
                      <DateInput value={row.date} onChange={(v) => setRow(row.key, { date: v })} style={inp({ padding: "6px 9px" })} />
                    </td>
                    <td style={tdStyle}>
                      <select style={inp({ padding: "6px 9px" })} value={row.gradeId} onChange={(e) => setRow(row.key, { gradeId: e.target.value })}>
                        <option value="">Select grade…</option>
                        {grades.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <select style={inp({ padding: "6px 9px" })} value={row.lotId} onChange={(e) => setRow(row.key, { lotId: e.target.value })}>
                        <option value="">No lot</option>
                        {lots.map((l) => {
                          const left = l.qty > 0 ? (lotLeft.get(l.id) ?? 0) : 0;
                          const full = l.qty > 0 && left <= 0;
                          return (
                            // A finished lot stays visible but cannot be chosen — hiding it
                            // would leave the user hunting for a lot he knows exists.
                            <option key={l.id} value={l.id} disabled={full && row.lotId !== l.id}>
                              {lotLabel.get(l.id)}
                              {l.qty > 0 ? (full ? " · full" : " · " + fmtQty(left) + " left") : ""}
                            </option>
                          );
                        })}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <input
                        style={inp({ padding: "6px 9px", textAlign: "right" })}
                        type="number"
                        step="any"
                        value={row.qty}
                        onChange={(e) => setRow(row.key, { qty: e.target.value })}
                        placeholder="0"
                      />
                    </td>
                    <td style={tdStyle}>
                      {byPercentage ? (
                        <input
                          style={inp({ padding: "6px 9px", textAlign: "right" })}
                          type="number"
                          step="any"
                          value={row.baseProfit}
                          onChange={(e) => setRow(row.key, { baseProfit: e.target.value })}
                          placeholder="0"
                        />
                      ) : (
                        <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: p.rate > 0 ? undefined : "#fbbf24", fontSize: 13 }}>
                          {p.rate > 0 ? fmtMoney(p.rate) : row.gradeId ? "no rate" : "-"}
                        </div>
                      )}
                    </td>
                    <td style={{ ...numTd, fontWeight: 700 }}>{fmtMoney(p.amount)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {rows.length > 1 && (
                        <Btn small tone="ghost" onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}>
                          ✕
                        </Btn>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td style={{ ...tdStyle, fontWeight: 700 }} colSpan={3}>
                  Draft total
                </td>
                <td style={{ ...numTd, fontWeight: 700 }}>{fmtQty(draftTotals.qty)}</td>
                <td style={tdStyle} />
                <td style={{ ...numTd, fontWeight: 800 }}>{fmtMoney(draftTotals.amount)}</td>
                <td style={tdStyle} />
              </tr>
            </tbody>
          </table>
        </TableWrap>
        {lotOverflow.length > 0 && (
          <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "#fbbf24", lineHeight: 1.55 }}>
            {lotOverflow.map((o) =>
              o.left > 0
                ? o.lotNo + " has " + fmtQty(o.left) + " " + (party?.unit || "kg") + " left, this draft adds " + fmtQty(o.adding) + "."
                : o.lotNo + " is finished — its whole weight is already produced.",
            ).join("  ")}{" "}
            A lot cannot produce more than the weight that went into it.
          </p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <Btn onClick={saveAll} disabled={saving || !partyId || lotOverflow.length > 0}>
            {saving ? "Saving…" : "Save Lines"}
          </Btn>
          <Btn tone="ghost" onClick={addRow}>
            + Row
          </Btn>
        </div>
      </Panel>

      <Panel step={2} title="Entered production" hint="Lines still open have not been swept into a settlement yet.">
        <TableWrap>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Grade</th>
                <th style={thStyle}>Lot</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Qty</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Rate</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Share</th>
                <th style={thStyle}>State</th>
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {lines.slice(0, 200).map((l) => (
                <tr key={l.id}>
                  <td style={tdStyle}>{fmtDate(l.date)}</td>
                  <td style={tdStyle}>{l.gradeName}</td>
                  <td style={{ ...tdStyle, color: l.lotId ? undefined : MUTED }}>{lotLabel.get(l.lotId) || "—"}</td>
                  <td style={numTd}>{fmtQty(l.qty)}</td>
                  <td style={numTd}>{byPercentage ? fmtMoney(l.baseProfit) : fmtMoney(l.rate)}</td>
                  <td style={{ ...numTd, fontWeight: 700 }}>{fmtMoney(l.amount)}</td>
                  <td style={{ ...tdStyle, color: l.settlementId ? MUTED : "#2dd4bf", fontWeight: 700 }}>
                    {l.settlementId ? "settled" : "open"}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {!l.settlementId && (
                      <Btn small tone="danger" onClick={() => remove(l.id)}>
                        Delete
                      </Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && lines.length === 0 && <Empty>No production entered for this party yet.</Empty>}
          {loading && <Empty>Loading…</Empty>}
        </TableWrap>
      </Panel>
    </PageShell>
  );
}
