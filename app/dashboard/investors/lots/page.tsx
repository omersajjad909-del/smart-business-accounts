"use client";

// Step 3 — the material that the money bought.
//
// Every other page on this module answers "what came out". This one answers
// "what went in", and it exists because an investor looking at 9,400 kg and a
// profit figure could not tell you what those kilos were made from or what the
// factory paid to get them. A lot carries the two numbers he is handed on the
// day — the value of the material and its weight — and output is tied back to
// it. Nothing here changes what he earns; the rate per kg still decides that.
// It changes what he can see.

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
  lotResult,
  lotTotals,
  mapLot,
  mapParty,
  mapProduction,
  nextLotNo,
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
  MUTED,
} from "../_ui";

export default function InvestorLotsPage() {
  const { isMobile } = useResponsive();
  const { records: partyRecords } = useBusinessRecords(CAT.party);
  const { records: productionRecords } = useBusinessRecords(CAT.production);
  const { records, loading, create, remove } = useBusinessRecords(CAT.lot);

  const parties = useMemo(() => partyRecords.map(mapParty).filter((p) => p.status === "active"), [partyRecords]);
  // The picker sits on the first party until one is chosen. Deriving that
  // rather than writing it back through an effect keeps a render out of the
  // cycle and stops the selection fighting a slow first load.
  const [pickedParty, setPickedParty] = useState("");
  const partyId = pickedParty || parties[0]?.id || "";
  const setPartyId = setPickedParty;
  const party = parties.find((p) => p.id === partyId);
  const unit = party?.unit || "kg";

  const lots = useMemo(
    () =>
      records
        .map(mapLot)
        .filter((l) => l.partyId === partyId)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.lotNo < b.lotNo ? 1 : -1)),
    [records, partyId],
  );

  const lines = useMemo(
    () => productionRecords.map(mapProduction).filter((l) => l.partyId === partyId),
    [productionRecords, partyId],
  );

  const results = useMemo(() => lots.map((l) => lotResult(l, lines)), [lots, lines]);
  const totals = useMemo(() => lotTotals(lots), [lots]);

  const summary = useMemo(() => {
    let produced = 0;
    let share = 0;
    for (const r of results) {
      produced += r.producedQty;
      share += r.share;
    }
    return {
      produced: round2(produced),
      share: round2(share),
      perUnit: produced > 0 ? round2(share / produced) : 0,
      recovery: totals.qty > 0 ? round2((produced / totals.qty) * 100) : 0,
    };
  }, [results, totals]);

  // Output entered before this page existed, or entered in a hurry without
  // picking a lot. It is not an error — the share is still right — but it is
  // the reason a lot's recovery can read low, so it is stated, not hidden.
  const unlinked = useMemo(() => {
    const open = lines.filter((l) => !l.lotId);
    return { count: open.length, qty: round2(open.reduce((s, l) => s + l.qty, 0)) };
  }, [lines]);

  const [date, setDate] = useState(todayISO());
  const [lotNo, setLotNo] = useState("");
  const [material, setMaterial] = useState("");
  const [value, setValue] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const suggestedNo = useMemo(() => nextLotNo(lots), [lots]);
  const draftCost = useMemo(() => {
    const v = Number(value) || 0;
    const q = Number(qty) || 0;
    return q > 0 ? round2(v / q) : 0;
  }, [value, qty]);

  async function save() {
    if (!partyId) return toast.error("Add a party first");
    if (!(Number(value) > 0)) return toast.error("Enter what the material cost");
    if (!(Number(qty) > 0)) return toast.error("Enter the weight taken in");
    setSaving(true);
    try {
      await create({
        title: material.trim() || "Material",
        refId: partyId,
        status: "open",
        amount: Number(value),
        date,
        data: { lotNo: lotNo.trim() || suggestedNo, qty: Number(qty), note: note.trim() },
      });
      setLotNo("");
      setMaterial("");
      setValue("");
      setQty("");
      setNote("");
      toast.success("Material recorded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string, linked: number) {
    if (linked > 0) {
      return toast.error(
        "This lot has " + linked + " production line" + (linked === 1 ? "" : "s") + " against it. Move them to another lot first.",
      );
    }
    try {
      await remove(id);
      toast.success("Lot removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    }
  }

  return (
    <PageShell
      title="Material In"
      subtitle="What the factory lifted against your money — the value and the weight. Production ties back to it, so every lot shows what it turned into and what it earned you."
      isMobile={isMobile}
    >
      <Tabs active="/dashboard/investors/lots" />

      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: MUTED, display: "block", marginBottom: 5 }}>
          Party
        </span>
        <PartyPicker parties={parties} value={partyId} onChange={setPartyId} />
      </div>

      <Tiles
        items={[
          { label: "Material in", value: fmtMoney(totals.value) },
          { label: "Weight in", value: fmtQty(totals.qty) + " " + unit },
          { label: "Produced", value: fmtQty(summary.produced) + " " + unit },
          { label: "Your profit", value: fmtMoney(summary.share), tone: "#2dd4bf" },
          { label: "Profit per " + unit, value: fmtMoney(summary.perUnit), tone: "#2dd4bf" },
        ]}
      />

      <Panel
        step={1}
        title="Record material"
        hint={
          "Enter it the way the mill tells it to you: this much money of material came in, weighing this much. Cost per " +
          unit +
          " works itself out."
        }
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <Field label="Date" width={isMobile ? "100%" : 150}>
            <DateInput value={date} onChange={setDate} style={inp()} />
          </Field>
          <Field label="Lot #" width={isMobile ? "100%" : 120}>
            <input style={inp()} value={lotNo} onChange={(e) => setLotNo(e.target.value)} placeholder={suggestedNo} />
          </Field>
          <Field label="Material">
            <input style={inp()} value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Jersey, pillow waste…" />
          </Field>
          <Field label="Value" width={isMobile ? "100%" : 150}>
            <input
              style={inp({ textAlign: "right" })}
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label={"Weight (" + unit + ")"} width={isMobile ? "100%" : 130}>
            <input
              style={inp({ textAlign: "right" })}
              type="number"
              step="any"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label={"Cost per " + unit} width={isMobile ? "100%" : 120}>
            <div style={{ ...inp({ textAlign: "right" }), background: "transparent", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {draftCost > 0 ? fmtMoney(draftCost) : "-"}
            </div>
          </Field>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginTop: 12 }}>
          <Field label="Note">
            <input style={inp()} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          </Field>
          <Btn onClick={save} disabled={saving || !partyId} fullWidth={isMobile}>
            {saving ? "Saving…" : "Save Material"}
          </Btn>
        </div>
      </Panel>

      <Panel
        step={2}
        title="Lot by lot"
        hint={
          "Recovery is what came out against what went in — under 100% is normal. Profit per " +
          unit +
          " is your own earning across every grade in that lot, not the factory's margin."
        }
      >
        <TableWrap>
          <table style={{ ...tableStyle, minWidth: 900 }}>
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
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.lot.id}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{r.lot.lotNo || "-"}</td>
                  <td style={tdStyle}>{fmtDate(r.lot.date)}</td>
                  <td style={tdStyle}>
                    {r.lot.material}
                    {r.lot.note && <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{r.lot.note}</div>}
                  </td>
                  <td style={numTd}>{fmtMoney(r.lot.value)}</td>
                  <td style={numTd}>{fmtQty(r.lot.qty)}</td>
                  <td style={numTd}>{fmtMoney(r.costPerUnit)}</td>
                  <td style={numTd}>{r.lineCount > 0 ? fmtQty(r.producedQty) : "-"}</td>
                  <td style={{ ...numTd, color: r.lineCount === 0 ? MUTED : r.recoveryPct >= 100 ? undefined : "#fbbf24" }}>
                    {r.lineCount > 0 ? fmtQty(r.recoveryPct) + "%" : "not yet"}
                  </td>
                  <td style={{ ...numTd, fontWeight: 700, color: r.share > 0 ? "#2dd4bf" : undefined }}>{fmtMoney(r.share)}</td>
                  <td style={numTd}>{r.producedQty > 0 ? fmtMoney(r.sharePerUnit) : "-"}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <Btn small tone="danger" onClick={() => del(r.lot.id, r.lineCount)}>
                      Delete
                    </Btn>
                  </td>
                </tr>
              ))}
              {results.length > 0 && (
                <tr>
                  <td style={{ ...tdStyle, fontWeight: 700 }} colSpan={3}>
                    Total
                  </td>
                  <td style={{ ...numTd, fontWeight: 800 }}>{fmtMoney(totals.value)}</td>
                  <td style={{ ...numTd, fontWeight: 800 }}>{fmtQty(totals.qty)}</td>
                  <td style={tdStyle} />
                  <td style={{ ...numTd, fontWeight: 800 }}>{fmtQty(summary.produced)}</td>
                  <td style={{ ...numTd, fontWeight: 800 }}>{summary.recovery > 0 ? fmtQty(summary.recovery) + "%" : "-"}</td>
                  <td style={{ ...numTd, fontWeight: 800 }}>{fmtMoney(summary.share)}</td>
                  <td style={{ ...numTd, fontWeight: 800 }}>{fmtMoney(summary.perUnit)}</td>
                  <td style={tdStyle} />
                </tr>
              )}
            </tbody>
          </table>
          {!loading && lots.length === 0 && (
            <Empty>
              No material recorded for this party yet.
              <br />
              Add the first lot above, then pick it on the Production page.
            </Empty>
          )}
          {loading && <Empty>Loading…</Empty>}
        </TableWrap>

        {unlinked.count > 0 && (
          <p style={{ margin: "12px 0 0", fontSize: 12.5, color: MUTED, lineHeight: 1.55 }}>
            {fmtQty(unlinked.qty)} {unit} of production across {unlinked.count} line
            {unlinked.count === 1 ? " is" : "s are"} not tied to any lot. Your share on those lines is unaffected — they simply do not
            count towards any lot&apos;s recovery.
          </p>
        )}
      </Panel>
    </PageShell>
  );
}
