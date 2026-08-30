"use client";

// Step 5 — closing a cycle.
//
// Every ten days the factory hands over figures and some cash, and the two
// rarely match to the rupee. Closing a cycle sweeps the open production lines
// in a date range, adds whatever was still owed from last time, subtracts what
// was actually paid, and carries the difference forward. That carried figure
// is the only number either side needs to argue about.

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useResponsive } from "@/hooks/useResponsive";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { DateInput } from "../../reports/_components/DateInput";
import {
  CAT,
  daysBetween,
  fmtDate,
  fmtMoney,
  fmtQty,
  mapParty,
  mapProduction,
  mapSettlement,
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
  MUTED,
} from "../_ui";

export default function InvestorSettlementsPage() {
  const { isMobile } = useResponsive();
  const { records: partyRecords } = useBusinessRecords(CAT.party);
  const { records: productionRecords, update: updateProduction, refetch: refetchProduction } = useBusinessRecords(CAT.production);
  const { records, loading, create, remove } = useBusinessRecords(CAT.settlement);

  const parties = useMemo(() => partyRecords.map(mapParty).filter((p) => p.status === "active"), [partyRecords]);
  const [partyId, setPartyId] = useState("");
  useEffect(() => {
    if (!partyId && parties.length) setPartyId(parties[0].id);
  }, [parties, partyId]);

  const party = parties.find((p) => p.id === partyId);

  const settlements = useMemo(
    () =>
      records
        .map(mapSettlement)
        .filter((s) => s.partyId === partyId)
        .sort((a, b) => b.cycleNo - a.cycleNo),
    [records, partyId],
  );

  const lines = useMemo(() => productionRecords.map(mapProduction).filter((l) => l.partyId === partyId), [productionRecords, partyId]);

  const lastSettlement = settlements[0];
  const openingBalance = lastSettlement ? lastSettlement.closingBalance : 0;
  const nextCycleNo = (lastSettlement?.cycleNo || 0) + 1;

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState(todayISO());
  const [cash, setCash] = useState("");
  const [closing, setClosing] = useState(false);

  // A new cycle starts the day after the last one ended, so nothing falls
  // between two settlements and nothing is counted twice.
  useEffect(() => {
    if (!lastSettlement) {
      const earliest = lines.filter((l) => !l.settlementId).map((l) => l.date).sort()[0];
      setFromDate(earliest || todayISO());
      return;
    }
    const next = new Date(lastSettlement.toDate + "T00:00:00Z");
    next.setUTCDate(next.getUTCDate() + 1);
    setFromDate(next.toISOString().slice(0, 10));
  }, [lastSettlement, lines]);

  const inRange = useMemo(
    () => lines.filter((l) => !l.settlementId && l.date >= fromDate && l.date <= toDate),
    [lines, fromDate, toDate],
  );

  const profitDue = useMemo(() => round2(inRange.reduce((s, l) => s + l.amount, 0)), [inRange]);
  const totalQty = useMemo(() => round2(inRange.reduce((s, l) => s + l.qty, 0)), [inRange]);
  const cashNum = Number(cash) || 0;
  const closingBalance = round2(openingBalance + profitDue - cashNum);

  async function closeCycle() {
    if (!partyId) return toast.error("Add a party first");
    if (!fromDate || !toDate) return toast.error("Pick the cycle dates");
    if (fromDate > toDate) return toast.error("The cycle ends before it starts");
    if (inRange.length === 0 && profitDue === 0 && cashNum === 0) {
      return toast.error("Nothing in this range and no cash received");
    }
    setClosing(true);
    try {
      const settlement = await create({
        title: "Cycle " + nextCycleNo + " · " + fmtDate(fromDate) + " to " + fmtDate(toDate),
        refId: partyId,
        status: "closed",
        amount: profitDue,
        date: toDate,
        data: {
          cycleNo: nextCycleNo,
          fromDate,
          toDate,
          totalQty,
          openingBalance,
          cashReceived: cashNum,
          closingBalance,
          // Days from the end of the cycle to the day it was actually settled.
          // Three cycles of two days and then one of fourteen says something no
          // single figure does.
          settledAfterDays: daysBetween(toDate, todayISO()),
        },
      });
      for (const line of inRange) {
        await updateProduction(line.id, { status: "settled", data: { settlementId: settlement.id } });
      }
      await refetchProduction();
      setCash("");
      toast.success("Cycle " + nextCycleNo + " closed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not close the cycle");
    } finally {
      setClosing(false);
    }
  }

  async function reopen(id: string, cycleNo: number) {
    if (!window.confirm("Reopen cycle " + cycleNo + "? Its production lines go back to open and the balance it carried is dropped.")) return;
    try {
      const affected = lines.filter((l) => l.settlementId === id);
      for (const line of affected) {
        await updateProduction(line.id, { status: "open", data: { settlementId: "" } });
      }
      await remove(id);
      await refetchProduction();
      toast.success("Cycle " + cycleNo + " reopened");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reopen");
    }
  }

  return (
    <PageShell
      title="Settlements"
      subtitle="Close a cycle: what was earned, what was paid, what carries forward."
      isMobile={isMobile}
    >
      <Tabs active="/dashboard/investors/settlements" />

      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: MUTED, display: "block", marginBottom: 5 }}>
          Party
        </span>
        <PartyPicker parties={parties} value={partyId} onChange={setPartyId} />
      </div>

      <Tiles
        items={[
          { label: "Next cycle", value: "#" + nextCycleNo },
          { label: "Brought forward", value: fmtMoney(openingBalance) },
          { label: "Earned this cycle", value: fmtMoney(profitDue), tone: "#2dd4bf" },
          { label: "Carries forward", value: fmtMoney(closingBalance), tone: closingBalance > 0 ? "#fbbf24" : undefined },
        ]}
      />

      <Panel
        step={1}
        title={"Close cycle " + nextCycleNo}
        hint={
          "Every open production line between these dates is swept into this cycle. The cycle starts where the last one ended, so nothing is counted twice." +
          (party ? " " + party.name + " settles every " + party.cycleDays + " days." : "")
        }
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginBottom: 16 }}>
          <Field label="From" width={160}>
            <DateInput value={fromDate} onChange={setFromDate} style={inp()} />
          </Field>
          <Field label="To" width={160}>
            <DateInput value={toDate} onChange={setToDate} style={inp()} />
          </Field>
          <Field label="Cash received" width={170}>
            <input style={inp()} type="number" step="any" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="0" />
          </Field>
          <Btn onClick={closeCycle} disabled={closing || !partyId}>
            {closing ? "Closing…" : "Close Cycle"}
          </Btn>
        </div>

        <div
          style={{
            background: "rgba(20,184,166,.06)",
            border: "1px solid " + ACCENT + "44",
            borderRadius: 10,
            padding: "14px 16px",
            maxWidth: 420,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {[
            ["Lines in range", String(inRange.length)],
            ["Produced", fmtQty(totalQty) + " " + (party?.unit || "kg")],
            ["Earned this cycle", fmtMoney(profitDue)],
            ["Brought forward", fmtMoney(openingBalance)],
            ["Cash received", "-" + fmtMoney(cashNum)],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "5px 0", fontSize: 13, color: MUTED }}>
              <span>{k}</span>
              <span>{v}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              paddingTop: 10,
              marginTop: 6,
              borderTop: "1.5px solid " + ACCENT,
              fontSize: 14.5,
              fontWeight: 800,
            }}
          >
            <span>Carries forward</span>
            <span>{fmtMoney(closingBalance)}</span>
          </div>
        </div>
      </Panel>

      <Panel step={2} title="Closed cycles">
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
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s.id}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>#{s.cycleNo}</td>
                  <td style={{ ...tdStyle, color: MUTED }}>
                    {fmtDate(s.fromDate)} – {fmtDate(s.toDate)}
                  </td>
                  <td style={numTd}>{fmtQty(s.totalQty)}</td>
                  <td style={numTd}>{fmtMoney(s.profitDue)}</td>
                  <td style={numTd}>{fmtMoney(s.cashReceived)}</td>
                  <td style={{ ...numTd, fontWeight: 700, color: s.closingBalance > 0 ? "#fbbf24" : undefined }}>
                    {fmtMoney(s.closingBalance)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <Btn small tone="ghost" onClick={() => reopen(s.id, s.cycleNo)}>
                      Reopen
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && settlements.length === 0 && <Empty>No cycle closed yet for this party.</Empty>}
          {loading && <Empty>Loading…</Empty>}
        </TableWrap>
      </Panel>
    </PageShell>
  );
}
