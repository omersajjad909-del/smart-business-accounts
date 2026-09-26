"use client";

import { useEffect, useMemo, useState } from "react";
import { useResponsive } from "@/hooks/useResponsive";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(var(--ink),0.03)";
const border = "rgba(var(--ink),0.07)";

const inputStyle: React.CSSProperties = {
  width: "100%", background: bg, border: `1px solid ${border}`,
  borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box",
};

type LabourRow = {
  id: string;
  name: string;
  code: string;
  phone: string;
  ratePerUnit: number;
  accountId: string;
  balance: number | null;
};

type LabourEntry = {
  id: string;
  date: string;
  labourId: string;
  labourName: string;
  operation: string;
  product: string;
  qty: number;
  rate: number;
  amount: number;
};

/** Only the fields this page reads off a business record. */
type BusinessRecordLike = {
  id: string;
  title?: string;
  date?: string | null;
  amount?: number | null;
  data?: unknown;
};

const cell: React.CSSProperties = {
  padding: "10px 14px", fontSize: 12.5, color: "rgba(var(--ink),.72)",
  borderBottom: `1px solid ${border}`, whiteSpace: "nowrap",
};
const cellNum: React.CSSProperties = {
  ...cell, textAlign: "right", fontFamily: "ui-monospace, monospace",
  fontVariantNumeric: "tabular-nums",
};

export default function LabourPage() {
  const { isMobile } = useResponsive();
  const [rows, setRows] = useState<LabourRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pageError, setPageError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", ratePer1000: "" });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/manufacturing/labour", { cache: "no-store" });
      const list = (await res.json()) as LabourRow[];
      // balanceOnly sums everything dated before `from` — pass tomorrow so
      // "before" covers every voucher posted up to and including today.
      const asOf = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const withBalances = await Promise.all(
        list.map(async (l) => {
          try {
            const bal = await fetch(`/api/reports/ledger?accountId=${l.accountId}&balanceOnly=1&from=${asOf}`, { cache: "no-store" });
            const body = await bal.json();
            return { ...l, balance: Number(body?.balance) || 0 };
          } catch {
            return { ...l, balance: null };
          }
        }),
      );
      setRows(withBalances);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totalOwed = useMemo(() => rows.reduce((s, r) => s + (r.balance || 0), 0), [rows]);

  /* ── Work done ──
     One record per worker per run, written when the run posts. Loaded once —
     the filtering below is over a list this size, not a round trip. */
  const [entries, setEntries] = useState<LabourEntry[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [workerFilter, setWorkerFilter] = useState("");

  useEffect(() => {
    fetch("/api/business-records?category=labour_entry&limit=500", { cache: "no-store" })
      .then((r) => r.json())
      .then((list) => {
        if (!Array.isArray(list)) return setEntries([]);
        setEntries(list.map((r: BusinessRecordLike): LabourEntry => {
          const d = (r.data ?? {}) as Record<string, unknown>;
          return {
            id: r.id,
            date: String(r.date || "").slice(0, 10),
            labourId: String(d.labourId || ""),
            labourName: String(d.labourName || r.title || ""),
            operation: String(d.operation || ""),
            product: String(d.product || ""),
            qty: Number(d.qty) || 0,
            rate: Number(d.rate) || 0,
            amount: Number(r.amount) || 0,
          };
        }));
      })
      .catch(() => setEntries([]));
  }, []);

  const visibleEntries = useMemo(
    () => entries.filter((e) =>
      (!workerFilter || e.labourId === workerFilter) &&
      (!fromDate || e.date >= fromDate) &&
      (!toDate || e.date <= toDate)),
    [entries, workerFilter, fromDate, toDate],
  );

  /* What each worker comes to over the range — the question this page is
     opened to answer, which a list of runs only answers after adding up. */
  const entryTotals = useMemo(() => {
    const by = new Map<string, { labourId: string; name: string; qty: number; amount: number; ops: Set<string> }>();
    for (const e of visibleEntries) {
      const acc = by.get(e.labourId) || { labourId: e.labourId, name: e.labourName, qty: 0, amount: 0, ops: new Set<string>() };
      acc.qty += e.qty;
      acc.amount += e.amount;
      if (e.operation) acc.ops.add(e.operation);
      by.set(e.labourId, acc);
    }
    return [...by.values()]
      .map((t) => ({ ...t, jobs: t.ops.size ? [...t.ops].join(", ") : "—" }))
      .sort((a, b) => b.amount - a.amount);
  }, [visibleEntries]);

  function openAdd() {
    setEditingId(null);
    setForm({ name: "", phone: "", ratePer1000: "" });
    setFormError("");
    setShowModal(true);
  }

  function openEdit(r: LabourRow) {
    setEditingId(r.id);
    // Stored per unit, entered per 1,000 pcs — the same conversion the API
    // does, run the other way so the box shows the number that was typed.
    setForm({ name: r.name, phone: r.phone, ratePer1000: r.ratePerUnit ? String(r.ratePerUnit * 1000) : "" });
    setFormError("");
    setShowModal(true);
  }

  async function save() {
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    setFormError("");
    setSaving(true);
    try {
      const res = await fetch("/api/manufacturing/labour", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          name: form.name.trim(),
          phone: form.phone.trim(),
          ratePer1000: Number(form.ratePer1000) || 0,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || (editingId ? "Could not save changes." : "Could not add labour."));
      setShowModal(false);
      setEditingId(null);
      setForm({ name: "", phone: "", ratePer1000: "" });
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save labour.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: LabourRow) {
    if (!window.confirm(`Delete ${r.name}? Their labour payable account goes with them.`)) return;
    setPageError("");
    setDeletingId(r.id);
    try {
      const res = await fetch(`/api/manufacturing/labour?id=${encodeURIComponent(r.id)}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Could not delete labour.");
      await load();
    } catch (e) {
      setPageError(e instanceof Error ? e.message : "Could not delete labour.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ padding: isMobile ? "15px 14px" : "28px 32px", fontFamily: ff, color: "var(--ink-solid, #fff)", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26, gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Labour</h1>
          <p style={{ fontSize: 13, color: "rgba(var(--ink),.42)", margin: 0 }}>
            Piece-rate workers. Assign them to a production run and what they&apos;re owed posts to their own ledger.
          </p>
        </div>
        <button onClick={openAdd} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Add Labour
        </button>
      </div>

      {pageError && (
        <div style={{ marginBottom: 18, padding: "11px 14px", borderRadius: 10, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12.5 }}>
          {pageError}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Workers", value: rows.length, color: "var(--tx-f97316, #f97316)" },
          { label: "Owed right now", value: `Rs. ${Math.round(totalOwed).toLocaleString()}`, color: "var(--tx-f59e0b, #f59e0b)" },
          { label: "Fully paid", value: rows.filter((r) => (r.balance || 0) <= 0).length, color: "var(--tx-22c55e, #22c55e)" },
        ].map((card) => (
          <div key={card.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "12px 10px" : "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(var(--ink),.48)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "12px 10px" : "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: "rgba(var(--ink),.42)", marginTop: 4 }}>
                {r.code} • {r.phone || "No phone"} • Rs. {(r.ratePerUnit * 1000).toLocaleString()} / 1,000 pcs
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: (r.balance || 0) > 0 ? "var(--tx-f59e0b, #f59e0b)" : "var(--tx-22c55e, #22c55e)" }}>
                  Rs. {Math.round(r.balance || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: "rgba(var(--ink),.35)" }}>owed</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a href={`/dashboard/reports/ledger?accountId=${r.accountId}`} style={{ padding: "7px 14px", background: "rgba(56,189,248,.12)", border: "1px solid rgba(56,189,248,.3)", color: "var(--tx-38bdf8, #38bdf8)", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                  Ledger
                </a>
                <a href="/dashboard/cpv" style={{ padding: "7px 14px", background: "rgba(34,197,94,.15)", border: "1px solid rgba(34,197,94,.3)", color: "#22c55e", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                  Pay →
                </a>
                <button onClick={() => openEdit(r)} style={{ padding: "7px 14px", background: "rgba(249,115,22,.14)", border: "1px solid rgba(249,115,22,.32)", color: "#fb923c", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Edit
                </button>
                <button onClick={() => remove(r)} disabled={deletingId === r.id} style={{ padding: "7px 14px", background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.3)", color: "#f87171", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: deletingId === r.id ? "not-allowed" : "pointer", opacity: deletingId === r.id ? 0.6 : 1 }}>
                  {deletingId === r.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 && (
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 36, textAlign: "center", color: "rgba(var(--ink),.28)" }}>
            No labour added yet.
          </div>
        )}
      </div>

      {/* ── Work done ───────────────────────────────────────────────────────
          What the balances above are made of. The ledger has the money but
          cannot say which of four credits on one voucher was for cutting and
          which for packing — VoucherEntry carries no narration of its own — so
          each assignment is recorded in its own right when a run posts. */}
      <div style={{ marginTop: 26 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Work done</h2>
            <p style={{ fontSize: 12.5, color: "rgba(var(--ink),.42)", margin: "3px 0 0" }}>
              Every job a worker was credited for, run by run. This is what makes up the balances above.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit" }} />
            <span style={{ color: "rgba(var(--ink),.3)", fontSize: 12 }}>to</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit" }} />
            <select value={workerFilter} onChange={(e) => setWorkerFilter(e.target.value)}
              style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit" }}>
              <option value="">All workers</option>
              {rows.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>

        {/* Per worker first — the question is almost always "what does this one
            come to", and a list of runs answers it only after adding up. */}
        {entryTotals.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginBottom: 14 }}>
            {entryTotals.map((t) => (
              <div key={t.labourId} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 12.5, color: "rgba(var(--ink),.55)" }}>{t.name}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--tx-f59e0b, #f59e0b)", marginTop: 2 }}>
                  Rs. {Math.round(t.amount).toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: "rgba(var(--ink),.33)", marginTop: 1 }}>
                  {t.qty.toLocaleString()} pcs · {t.jobs}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
            <thead>
              <tr>
                {["Date", "Worker", "Job", "Product", "Pcs", "Rate", "Amount"].map((h, i) => (
                  <th key={h} style={{
                    textAlign: i >= 4 ? "right" : "left", padding: "10px 14px", fontSize: 11,
                    fontWeight: 700, letterSpacing: .5, textTransform: "uppercase",
                    color: "rgba(var(--ink),.38)", borderBottom: `1px solid ${border}`, whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((e) => (
                <tr key={e.id}>
                  <td style={cell}>{e.date}</td>
                  <td style={{ ...cell, fontWeight: 700 }}>{e.labourName}</td>
                  <td style={{ ...cell, color: "rgba(var(--ink),.55)" }}>{e.operation || "—"}</td>
                  <td style={{ ...cell, color: "rgba(var(--ink),.45)" }}>{e.product || "—"}</td>
                  <td style={cellNum}>{e.qty.toLocaleString()}</td>
                  <td style={cellNum}>{e.rate}</td>
                  <td style={{ ...cellNum, fontWeight: 800, color: "var(--tx-f59e0b, #f59e0b)" }}>Rs. {Math.round(e.amount).toLocaleString()}</td>
                </tr>
              ))}
              {visibleEntries.length > 0 && (
                <tr>
                  <td colSpan={6} style={{ ...cell, textAlign: "right", fontWeight: 700, color: "rgba(var(--ink),.5)" }}>Total</td>
                  <td style={{ ...cellNum, fontWeight: 800, color: "var(--tx-f59e0b, #f59e0b)" }}>
                    Rs. {Math.round(visibleEntries.reduce((s, e) => s + e.amount, 0)).toLocaleString()}
                  </td>
                </tr>
              )}
              {visibleEntries.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...cell, textAlign: "center", color: "rgba(var(--ink),.28)", padding: 30 }}>
                    {entries.length
                      ? "Nothing in this range."
                      : "No work recorded yet. It appears here as soon as a production run names its workers."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--dk-161b27, #161b27)", border: `1px solid ${border}`, borderRadius: 16, padding: 30, width: 460, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>{editingId ? "Edit Labour" : "Add Labour"}</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(var(--ink),.45)", marginBottom: 6 }}>Name</label>
                <input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(var(--ink),.45)", marginBottom: 6 }}>Phone</label>
                <input value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(var(--ink),.45)", marginBottom: 6 }}>Rate per 1,000 pcs (Rs)</label>
                <input type="number" min={0} step="any" value={form.ratePer1000} onChange={(e) => setForm((c) => ({ ...c, ratePer1000: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            {editingId && (
              <p style={{ margin: "14px 0 0", fontSize: 11.5, color: "rgba(var(--ink),.35)" }}>
                A new rate applies to future production runs — runs already completed keep the rate they were costed at.
              </p>
            )}
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} disabled={saving} style={{ flex: 1, padding: "11px 0", background: saving ? "rgba(249,115,22,.5)" : "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving…" : editingId ? "Save Changes" : "Add Labour"}
              </button>
              <button onClick={() => { setShowModal(false); setEditingId(null); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(var(--ink),.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
