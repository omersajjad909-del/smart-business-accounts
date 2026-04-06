"use client";
import { confirmToast, alertToast } from "@/lib/toast-feedback";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapRebateRecords, tradeBg, tradeBorder, tradeFont, tradeMuted } from "../_shared";

type RebateStatus = "filed" | "under_review" | "approved" | "received" | "rejected";

const STATUS_COLORS: Record<RebateStatus, { bg: string; color: string; border: string }> = {
  filed: { bg: "rgba(59,130,246,.12)", color: "#60a5fa", border: "rgba(59,130,246,.28)" },
  under_review: { bg: "rgba(245,158,11,.12)", color: "#fbbf24", border: "rgba(245,158,11,.28)" },
  approved: { bg: "rgba(16,185,129,.12)", color: "#34d399", border: "rgba(16,185,129,.28)" },
  received: { bg: "rgba(99,102,241,.12)", color: "#818cf8", border: "rgba(99,102,241,.28)" },
  rejected: { bg: "rgba(239,68,68,.12)", color: "#f87171", border: "rgba(239,68,68,.28)" },
};

const STATUS_OPTIONS: RebateStatus[] = ["filed", "under_review", "approved", "received", "rejected"];
const SCHEMES = ["DLTL", "Duty Drawback", "SRO", "Export Refinance", "Freight Support"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${tradeBorder}`,
  background: "rgba(255,255,255,.04)",
  color: "#fff",
  fontSize: 13,
  fontFamily: tradeFont,
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  color: tradeMuted,
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: ".06em",
  fontWeight: 700,
};

const cardStyle: React.CSSProperties = {
  background: tradeBg,
  border: `1px solid ${tradeBorder}`,
  borderRadius: 14,
  padding: "18px 20px",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function buildClaimNo(count: number) {
  const year = new Date().getFullYear();
  return `REB-${year}-${String(count + 1).padStart(4, "0")}`;
}

export default function TradeRebatePage() {
  const { records, loading, create, update, remove } = useBusinessRecords("export_rebate");
  const rebates = useMemo(() => mapRebateRecords(records), [records]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | RebateStatus>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    claimNo: "",
    invoiceRef: "",
    shipmentRef: "",
    scheme: "DLTL",
    amount: "",
    status: "filed" as RebateStatus,
    date: todayIso(),
    notes: "",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rebates.filter((row) => {
      const matchesFilter = filter === "all" ? true : row.status === filter;
      const matchesSearch = !q
        || row.claimNo.toLowerCase().includes(q)
        || row.invoiceRef.toLowerCase().includes(q)
        || row.shipmentRef.toLowerCase().includes(q)
        || row.scheme.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [rebates, filter, search]);

  const totals = useMemo(() => ({
    total: rebates.length,
    open: rebates.filter((row) => row.status === "filed" || row.status === "under_review").length,
    approved: rebates.filter((row) => row.status === "approved" || row.status === "received").reduce((sum, row) => sum + row.amount, 0),
    claimed: rebates.reduce((sum, row) => sum + row.amount, 0),
  }), [rebates]);

  function resetForm() {
    setForm({
      claimNo: buildClaimNo(rebates.length),
      invoiceRef: "",
      shipmentRef: "",
      scheme: "DLTL",
      amount: "",
      status: "filed",
      date: todayIso(),
      notes: "",
    });
    setEditingId(null);
    setError("");
  }

  function openNew() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(id: string) {
    const row = rebates.find((entry) => entry.id === id);
    if (!row) return;
    setForm({
      claimNo: row.claimNo,
      invoiceRef: row.invoiceRef,
      shipmentRef: row.shipmentRef,
      scheme: row.scheme,
      amount: String(row.amount),
      status: row.status as RebateStatus,
      date: row.date || todayIso(),
      notes: row.notes,
    });
    setEditingId(id);
    setError("");
    setShowModal(true);
  }

  async function save() {
    const amount = Number(form.amount);
    if (!form.claimNo.trim()) return setError("Claim number required.");
    if (!form.scheme.trim()) return setError("Scheme is required.");
    if (!form.invoiceRef.trim() && !form.shipmentRef.trim()) return setError("Invoice ref ya shipment ref me se kam az kam ek chahiye.");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Valid claim amount required.");
    if (!form.date) return setError("Claim date required.");

    const duplicate = rebates.find((row) => row.claimNo.toLowerCase() === form.claimNo.trim().toLowerCase() && row.id !== editingId);
    if (duplicate) return setError("Ye claim number already maujood hai.");

    const payload = {
      title: form.claimNo.trim(),
      status: form.status,
      amount,
      date: form.date,
      data: {
        claimNo: form.claimNo.trim(),
        invoiceRef: form.invoiceRef.trim(),
        shipmentRef: form.shipmentRef.trim(),
        scheme: form.scheme,
        notes: form.notes.trim(),
      },
    };

    setSaving(true);
    setError("");
    try {
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setShowModal(false);
      resetForm();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, claimNo: string) {
    if (!await confirmToast(`Delete rebate claim ${claimNo}?`)) return;
    await remove(id);
  }

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: tradeFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800 }}>Export Rebate & Drawback</h1>
          <p style={{ margin: 0, fontSize: 13, color: tradeMuted }}>DLTL, drawback, SRO claims, and recovery tracking for exporters.</p>
        </div>
        <button onClick={openNew} style={{ border: "none", borderRadius: 10, background: "#2563eb", color: "#fff", padding: "10px 16px", fontFamily: tradeFont, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          New Claim
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 22 }}>
        {[
          { label: "Claims", value: totals.total, color: "#60a5fa" },
          { label: "Open Claims", value: totals.open, color: "#fbbf24" },
          { label: "Claimed Value", value: `USD ${totals.claimed.toLocaleString()}`, color: "#34d399" },
          { label: "Approved / Received", value: `USD ${totals.approved.toLocaleString()}`, color: "#818cf8" },
        ].map((card) => (
          <div key={card.label} style={cardStyle}>
            <div style={{ fontSize: 12, color: tradeMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search claim no, shipment, invoice, scheme..." style={{ ...inputStyle, flex: 1, minWidth: 240 }} />
        <select value={filter} onChange={(e) => setFilter(e.target.value as "all" | RebateStatus)} style={{ ...inputStyle, width: 180 }}>
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
        </select>
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
        {loading ? <div style={{ padding: "56px 20px", textAlign: "center", color: tradeMuted }}>Loading claims...</div>
          : filtered.length === 0 ? <div style={{ padding: "56px 20px", textAlign: "center", color: tradeMuted }}>No rebate claims found.</div>
          : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Claim No", "Scheme", "Invoice", "Shipment", "Amount", "Date", "Status", "Actions"].map((head) => (
                    <th key={head} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: tradeMuted, borderBottom: `1px solid ${tradeBorder}` }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const meta = STATUS_COLORS[row.status as RebateStatus] || STATUS_COLORS.filed;
                  return (
                    <tr key={row.id}>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${tradeBorder}`, fontWeight: 700, color: "#93c5fd" }}>{row.claimNo}</td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${tradeBorder}` }}>{row.scheme}</td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${tradeBorder}`, color: tradeMuted }}>{row.invoiceRef || "-"}</td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${tradeBorder}`, color: tradeMuted }}>{row.shipmentRef || "-"}</td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${tradeBorder}`, fontWeight: 700 }}>USD {row.amount.toLocaleString()}</td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${tradeBorder}` }}>{row.date || "-"}</td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${tradeBorder}` }}>
                        <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontSize: 11, fontWeight: 700 }}>
                          {row.status.replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${tradeBorder}` }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => openEdit(row.id)} style={{ background: "transparent", border: `1px solid ${tradeBorder}`, color: "#fff", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>Edit</button>
                          <button onClick={() => handleDelete(row.id, row.claimNo)} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer" }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 1200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ width: "100%", maxWidth: 860, margin: "24px 0", background: "#101522", border: `1px solid ${tradeBorder}`, borderRadius: 18, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800 }}>{editingId ? "Edit Rebate Claim" : "New Rebate Claim"}</h2>
                <p style={{ margin: 0, fontSize: 12, color: tradeMuted }}>Track export claim filing, approval, and receipt against invoices and shipments.</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", color: tradeMuted, fontSize: 24, cursor: "pointer" }}>x</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14 }}>
              <div><label style={labelStyle}>Claim No</label><input value={form.claimNo} onChange={(e) => setForm((prev) => ({ ...prev, claimNo: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Scheme</label><select value={form.scheme} onChange={(e) => setForm((prev) => ({ ...prev, scheme: e.target.value }))} style={inputStyle}>{SCHEMES.map((scheme) => <option key={scheme} value={scheme}>{scheme}</option>)}</select></div>
              <div><label style={labelStyle}>Status</label><select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as RebateStatus }))} style={inputStyle}>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}</select></div>
              <div><label style={labelStyle}>Invoice Ref</label><input value={form.invoiceRef} onChange={(e) => setForm((prev) => ({ ...prev, invoiceRef: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Shipment Ref</label><input value={form.shipmentRef} onChange={(e) => setForm((prev) => ({ ...prev, shipmentRef: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Claim Date</label><input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Amount</label><input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} style={inputStyle} /></div>
              <div style={{ gridColumn: "span 2" }}><label style={labelStyle}>Notes</label><input value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} style={inputStyle} /></div>
            </div>

            {error ? <div style={{ marginTop: 14, color: "#f87171", fontSize: 13 }}>{error}</div> : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowModal(false)} style={{ background: "rgba(255,255,255,.08)", border: "none", color: "#fff", borderRadius: 10, padding: "10px 14px", cursor: "pointer" }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ background: "#2563eb", border: "none", color: "#fff", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 700 }}>
                {saving ? "Saving..." : editingId ? "Update Claim" : "Create Claim"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
