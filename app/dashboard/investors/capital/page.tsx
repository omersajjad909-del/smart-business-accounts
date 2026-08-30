"use client";

// Step 2 — the capital account, kept apart from the profit account.
//
// Standard partnership accounting keeps two ledgers per partner: capital, for
// the money put in and taken back out, and current, for the share earned. Mix
// them and six months later nobody can say whether the original stake has come
// home. Profit never touches this page.

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useResponsive } from "@/hooks/useResponsive";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { DateInput } from "../../reports/_components/DateInput";
import { CAT, capitalTotals, fmtDate, fmtMoney, mapCapital, mapParty, todayISO } from "../_shared";
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

export default function InvestorCapitalPage() {
  const { isMobile } = useResponsive();
  const { records: partyRecords } = useBusinessRecords(CAT.party);
  const { records, loading, create, remove } = useBusinessRecords(CAT.capital);

  const parties = useMemo(() => partyRecords.map(mapParty).filter((p) => p.status === "active"), [partyRecords]);
  const [partyId, setPartyId] = useState("");
  useEffect(() => {
    if (!partyId && parties.length) setPartyId(parties[0].id);
  }, [parties, partyId]);

  const entries = useMemo(
    () =>
      records
        .map(mapCapital)
        .filter((e) => e.partyId === partyId)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [records, partyId],
  );
  const totals = useMemo(() => capitalTotals(entries), [entries]);

  const [date, setDate] = useState(todayISO());
  const [kind, setKind] = useState<"invest" | "withdraw">("invest");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!partyId) return toast.error("Add a party first");
    if (!(Number(amount) > 0)) return toast.error("Enter an amount");
    setSaving(true);
    try {
      await create({
        title: note.trim() || (kind === "invest" ? "Capital placed" : "Capital withdrawn"),
        refId: partyId,
        status: "active",
        amount: Number(amount),
        date,
        data: { kind },
      });
      setAmount("");
      setNote("");
      toast.success(kind === "invest" ? "Capital recorded" : "Withdrawal recorded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Capital"
      subtitle="Money put in and money taken back out. Nothing the factory pays as profit belongs on this page — that lives in Settlements."
      isMobile={isMobile}
    >
      <Tabs active="/dashboard/investors/capital" />

      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: MUTED, display: "block", marginBottom: 5 }}>
          Party
        </span>
        <PartyPicker parties={parties} value={partyId} onChange={setPartyId} />
      </div>

      <Tiles
        items={[
          { label: "Placed", value: fmtMoney(totals.invested) },
          { label: "Withdrawn", value: fmtMoney(totals.withdrawn) },
          { label: "Net capital", value: fmtMoney(totals.net), tone: "#2dd4bf" },
          { label: "First placed", value: totals.firstDate ? fmtDate(totals.firstDate) : "-" },
        ]}
      />

      <Panel step={1} title="Record capital movement" hint="Use Withdraw when part of the stake comes back — not when profit is paid.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <Field label="Date" width={150}>
            <DateInput value={date} onChange={setDate} style={inp()} />
          </Field>
          <Field label="Type" width={150}>
            <select style={inp()} value={kind} onChange={(e) => setKind(e.target.value as "invest" | "withdraw")}>
              <option value="invest">Placed</option>
              <option value="withdraw">Withdrawn</option>
            </select>
          </Field>
          <Field label="Amount" width={150}>
            <input style={inp()} type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="2000000" />
          </Field>
          <Field label="Note">
            <input style={inp()} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Cash handed at mill" />
          </Field>
          <Btn onClick={save} disabled={saving || !partyId}>
            {saving ? "Saving…" : "Record"}
          </Btn>
        </div>
      </Panel>

      <Panel step={2} title="Capital ledger">
        <TableWrap>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Note</th>
                <th style={thStyle}>Type</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td style={tdStyle}>{fmtDate(e.date)}</td>
                  <td style={tdStyle}>{e.note}</td>
                  <td style={{ ...tdStyle, color: e.kind === "withdraw" ? "#fbbf24" : "#2dd4bf", fontWeight: 700 }}>
                    {e.kind === "withdraw" ? "Withdrawn" : "Placed"}
                  </td>
                  <td style={numTd}>{(e.kind === "withdraw" ? "-" : "") + fmtMoney(e.amount)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <Btn small tone="danger" onClick={() => remove(e.id)}>
                      Delete
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && entries.length === 0 && <Empty>Nothing recorded for this party yet.</Empty>}
          {loading && <Empty>Loading…</Empty>}
        </TableWrap>
      </Panel>
    </PageShell>
  );
}
