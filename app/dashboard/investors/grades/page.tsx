"use client";

// Step 3 — the agreed terms, and the reason old settlements never move.
//
// A grade does not hold one rate, it holds a dated list of them. Raising the
// medium grade from 4 to 5 adds a new point from a chosen day; production
// already entered keeps the rate that was copied onto it, and production
// entered for an earlier date still prices at the older rate. Overwriting a
// single rate field would silently restate every month already settled.

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useResponsive } from "@/hooks/useResponsive";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { DateInput } from "../../reports/_components/DateInput";
import { CAT, fmtDate, fmtMoney, mapGrade, mapParty, todayISO, type RatePoint } from "../_shared";
import {
  Btn,
  Empty,
  Field,
  PageShell,
  Panel,
  PartyPicker,
  TableWrap,
  Tabs,
  inp,
  numTd,
  tableStyle,
  tdStyle,
  thStyle,
  ACCENT,
  MUTED,
} from "../_ui";

export default function InvestorGradesPage() {
  const { isMobile } = useResponsive();
  const { records: partyRecords } = useBusinessRecords(CAT.party);
  const { records, loading, create, update, remove } = useBusinessRecords(CAT.grade);

  const parties = useMemo(() => partyRecords.map(mapParty).filter((p) => p.status === "active"), [partyRecords]);
  const [partyId, setPartyId] = useState("");
  useEffect(() => {
    if (!partyId && parties.length) setPartyId(parties[0].id);
  }, [parties, partyId]);

  const party = parties.find((p) => p.id === partyId);
  const grades = useMemo(
    () =>
      records
        .map(mapGrade)
        .filter((g) => g.partyId === partyId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [records, partyId],
  );

  const [gradeName, setGradeName] = useState("");
  const [rate, setRate] = useState("");
  const [from, setFrom] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newFrom, setNewFrom] = useState(todayISO());

  async function addGrade() {
    if (!partyId) return toast.error("Add a party first");
    if (!gradeName.trim()) return toast.error("Grade name is required");
    if (!(Number(rate) > 0)) return toast.error("Enter the rate");
    setSaving(true);
    try {
      const point: RatePoint = { rate: Number(rate), from };
      await create({
        title: gradeName.trim(),
        refId: partyId,
        status: "active",
        amount: Number(rate),
        data: { unit: party?.unit || "kg", sortOrder: grades.length, history: [point] },
      });
      setGradeName("");
      setRate("");
      toast.success("Grade added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function applyNewRate(gradeId: string) {
    if (!(Number(newRate) > 0)) return toast.error("Enter the new rate");
    const grade = grades.find((g) => g.id === gradeId);
    if (!grade) return;
    if (grade.history.some((h) => h.from === newFrom)) {
      return toast.error("This grade already has a rate starting " + fmtDate(newFrom));
    }
    try {
      const history = [...grade.history, { rate: Number(newRate), from: newFrom }].sort((a, b) => (a.from < b.from ? 1 : -1));
      // `amount` mirrors whichever rate is newest so pickers and lists have a
      // headline figure; the history remains the source of truth for pricing.
      await update(gradeId, { amount: history[0].rate, data: { history } });
      setEditId("");
      setNewRate("");
      toast.success("Rate updated from " + fmtDate(newFrom));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  }

  return (
    <PageShell
      title="Profit Terms"
      subtitle="What each grade pays, and from which day. Change a rate here and nothing already settled moves."
      isMobile={isMobile}
    >
      <Tabs active="/dashboard/investors/grades" />

      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: MUTED, display: "block", marginBottom: 5 }}>
          Party
        </span>
        <PartyPicker parties={parties} value={partyId} onChange={setPartyId} />
      </div>

      {party?.profitModel === "percentage" && (
        <div
          style={{
            background: "rgba(45,212,191,.08)",
            border: "1px solid rgba(45,212,191,.3)",
            borderRadius: 10,
            padding: "13px 16px",
            marginBottom: 18,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <strong>{party.name}</strong> pays {party.sharePercent}% of profit, so grades here are optional — they only label what was
          produced. The share is worked out from the profit figure entered on each production line.
        </div>
      )}

      <Panel
        step={1}
        title="Add a grade"
        hint="One row per quality the factory produces. The date is the day this rate starts applying, not the day you typed it."
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <Field label="Grade name">
            <input style={inp()} value={gradeName} onChange={(e) => setGradeName(e.target.value)} placeholder="Medium quality" />
          </Field>
          <Field label={"Rate per " + (party?.unit || "kg")} width={150}>
            <input style={inp()} type="number" step="any" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="4" />
          </Field>
          <Field label="Applies from" width={160}>
            <DateInput value={from} onChange={setFrom} style={inp()} />
          </Field>
          <Btn onClick={addGrade} disabled={saving || !partyId}>
            {saving ? "Saving…" : "Add Grade"}
          </Btn>
        </div>
      </Panel>

      <Panel step={2} title="Grades and rate history">
        <TableWrap>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Grade</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Current rate</th>
                <th style={thStyle}>History</th>
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {grades.map((g) => (
                <tr key={g.id}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{g.name}</td>
                  <td style={numTd}>{fmtMoney(g.rate)}</td>
                  <td style={{ ...tdStyle, color: MUTED, fontSize: 12.5 }}>
                    {g.history.length === 0
                      ? "-"
                      : g.history.map((h) => fmtMoney(h.rate) + " from " + fmtDate(h.from)).join("  ·  ")}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-flex", gap: 6 }}>
                      <Btn small tone="ghost" onClick={() => { setEditId(editId === g.id ? "" : g.id); setNewRate(""); }}>
                        {editId === g.id ? "Cancel" : "Change rate"}
                      </Btn>
                      <Btn small tone="danger" onClick={() => remove(g.id)}>
                        Delete
                      </Btn>
                    </span>
                  </td>
                </tr>
              ))}
              {editId && (
                <tr>
                  <td style={{ ...tdStyle, background: "rgba(20,184,166,.06)" }} colSpan={4}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
                      <Field label="New rate" width={140}>
                        <input style={inp()} type="number" step="any" value={newRate} onChange={(e) => setNewRate(e.target.value)} />
                      </Field>
                      <Field label="Applies from" width={160}>
                        <DateInput value={newFrom} onChange={setNewFrom} style={inp()} />
                      </Field>
                      <Btn onClick={() => applyNewRate(editId)}>Apply</Btn>
                      <span style={{ fontSize: 12, color: MUTED, flex: "1 1 220px", lineHeight: 1.5 }}>
                        Production already entered keeps the rate it was priced at. Only lines dated on or after{" "}
                        <span style={{ color: ACCENT, fontWeight: 700 }}>{fmtDate(newFrom)}</span> use the new one.
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {!loading && grades.length === 0 && <Empty>No grades yet. Add each quality the factory produces and what it pays you.</Empty>}
          {loading && <Empty>Loading…</Empty>}
        </TableWrap>
      </Panel>
    </PageShell>
  );
}
