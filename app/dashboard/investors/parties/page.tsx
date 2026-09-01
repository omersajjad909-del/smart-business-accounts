"use client";

// Step 1 — who the money is with.
//
// One row per business the investor has money in. Everything else on these
// pages hangs off the party: capital, grades, production, settlements.

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useResponsive } from "@/hooks/useResponsive";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { CAT, mapParty, type ProfitModel } from "../_shared";
import {
  Btn,
  Empty,
  Field,
  PageShell,
  Panel,
  TableWrap,
  Tabs,
  inp,
  numTd,
  tableStyle,
  tdStyle,
  thStyle,
  MUTED,
  labelStyle,
} from "../_ui";

export default function InvestorPartiesPage() {
  const { isMobile } = useResponsive();
  const { records, loading, create, remove, setStatus } = useBusinessRecords(CAT.party);
  const parties = useMemo(() => records.map(mapParty), [records]);

  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [cycleDays, setCycleDays] = useState("10");
  const [model, setModel] = useState<ProfitModel>("per_unit");
  const [sharePercent, setSharePercent] = useState("");
  const [unit, setUnit] = useState("kg");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return toast.error("Party name is required");
    if (model === "percentage" && !(Number(sharePercent) > 0)) {
      return toast.error("Enter the agreed share percentage");
    }
    setSaving(true);
    try {
      await create({
        title: name.trim(),
        status: "active",
        data: {
          business: business.trim(),
          cycleDays: Number(cycleDays) || 10,
          profitModel: model,
          sharePercent: Number(sharePercent) || 0,
          unit: unit.trim() || "kg",
        },
      });
      setName("");
      setBusiness("");
      setSharePercent("");
      toast.success("Party added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string, label: string) {
    if (!window.confirm("Remove " + label + "? Its capital, grades and production stay in the database.")) return;
    try {
      await remove(id);
      toast.success("Party removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    }
  }

  return (
    <PageShell
      title="Parties"
      subtitle="Every business the money sits in. Set the settlement cycle and how the share is agreed — the rest of the module reads both."
      isMobile={isMobile}
    >
      <Tabs active="/dashboard/investors/parties" />

      <Panel
        step={1}
        title="Add a party"
        hint="Cycle days is how often accounts are settled — ten days is the usual arrangement. The profit model decides how every production line is priced, so it is worth getting right at the start."
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <Field label="Party name">
            <input style={inp()} value={name} onChange={(e) => setName(e.target.value)} placeholder="Rehman Textile Mills" />
          </Field>
          <Field label="Business">
            <input style={inp()} value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="Business description" />
          </Field>
          <Field label="Cycle days">
            <input style={inp()} type="number" step="any" value={cycleDays} onChange={(e) => setCycleDays(e.target.value)} />
          </Field>
          <Field label="Profit model">
            <select style={inp()} value={model} onChange={(e) => setModel(e.target.value as ProfitModel)}>
              <option value="per_unit">Fixed rate per unit</option>
              <option value="percentage">Share of profit</option>
            </select>
          </Field>
          {model === "percentage" ? (
            <Field label="Your share %">
              <input style={inp()} type="number" step="any" value={sharePercent} onChange={(e) => setSharePercent(e.target.value)} placeholder="30" />
            </Field>
          ) : (
            <Field label="Unit">
              <input style={inp()} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg" />
            </Field>
          )}
          <div style={{ minWidth: 0 }}>
            <span style={labelStyle()}>Action</span>
            <Btn onClick={save} disabled={saving} fullWidth>
              {saving ? "Saving…" : "Add Party"}
            </Btn>
          </div>
        </div>
      </Panel>

      <Panel step={2} title="Parties" hint="Close a party when the money is fully returned. Closed parties stay out of the pickers but keep their history.">
        <TableWrap>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Party</th>
                <th style={thStyle}>Business</th>
                <th style={thStyle}>Terms</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Cycle</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {parties.map((p) => (
                <tr key={p.id}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{p.name}</td>
                  <td style={{ ...tdStyle, color: MUTED }}>{p.business || "-"}</td>
                  <td style={tdStyle}>
                    {p.profitModel === "percentage" ? p.sharePercent + "% of profit" : "Fixed rate per " + p.unit}
                  </td>
                  <td style={numTd}>{p.cycleDays} days</td>
                  <td style={tdStyle}>{p.status}</td>
                  <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-flex", gap: 6 }}>
                      <Btn small tone="ghost" onClick={() => setStatus(p.id, p.status === "active" ? "closed" : "active")}>
                        {p.status === "active" ? "Close" : "Reopen"}
                      </Btn>
                      <Btn small tone="danger" onClick={() => del(p.id, p.name)}>
                        Delete
                      </Btn>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && parties.length === 0 && <Empty>No party yet. Add the business your money is in to get started.</Empty>}
          {loading && <Empty>Loading…</Empty>}
        </TableWrap>
      </Panel>
    </PageShell>
  );
}
