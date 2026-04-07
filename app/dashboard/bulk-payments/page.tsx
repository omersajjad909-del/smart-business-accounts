"use client";
import { fmtDate } from "@/lib/dateUtils";
import { useEffect, useState, useCallback } from "react";

type PaymentRow = {
  id: string;
  partyName: string;
  partyType: "supplier" | "employee" | "other";
  amount: number;
  reference: string;
  method: "bank" | "cash" | "cheque";
  status: "PENDING" | "APPROVED" | "PROCESSED" | "FAILED";
  note?: string;
};

type Batch = {
  id: string;
  name: string;
  createdAt: string;
  status: "DRAFT" | "SUBMITTED" | "PROCESSED";
  rows: PaymentRow[];
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#94a3b8", APPROVED: "#818cf8", PROCESSED: "#34d399", FAILED: "#f87171",
};
const METHOD_ICON: Record<string, string> = { bank: "🏦", cash: "💵", cheque: "📄" };

export default function BulkPaymentsPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [addForm, setAddForm] = useState({ partyName: "", amount: "", reference: "", method: "bank", note: "" });

  const activeBatch = batches.find(b => b.id === activeBatchId) ?? null;

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bulk-payments");
      const data = await res.json();
      if (data.batches) {
        setBatches(data.batches);
        if (!activeBatchId && data.batches.length > 0) setActiveBatchId(data.batches[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [activeBatchId]);

  useEffect(() => { loadBatches(); }, []);

  const pendingPayments = activeBatch?.rows.filter(p => p.status === "PENDING" || p.status === "APPROVED") ?? [];
  const selectedAmt = activeBatch?.rows.filter(p => selected.has(p.id)).reduce((s, p) => s + p.amount, 0) ?? 0;
  const processedAmt = activeBatch?.rows.filter(p => p.status === "PROCESSED").reduce((s, p) => s + p.amount, 0) ?? 0;
  const totalAmt = activeBatch?.rows.reduce((s, p) => s + p.amount, 0) ?? 0;

  function toggleAll() {
    if (selected.size === pendingPayments.length) setSelected(new Set());
    else setSelected(new Set(pendingPayments.map(p => p.id)));
  }

  function toggleOne(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function createBatch() {
    if (!newBatchName.trim()) { setMsg("Batch name required"); return; }
    const res = await fetch("/api/bulk-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newBatchName.trim() }),
    });
    const data = await res.json();
    if (data.batch) {
      setBatches(prev => [data.batch, ...prev]);
      setActiveBatchId(data.batch.id);
      setNewBatchName("");
      setShowNewBatch(false);
      setMsg("New batch created");
    }
  }

  async function processSelected() {
    if (!activeBatch || selected.size === 0) { setMsg("Select at least one payment"); return; }
    setProcessing(true);
    setMsg("");
    try {
      const res = await fetch(`/api/bulk-payments/${activeBatch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (data.batch) {
        setBatches(prev => prev.map(b => b.id === data.batch.id ? data.batch : b));
        setSelected(new Set());
        setMsg(`✓ ${selected.size} payment(s) processed successfully`);
      }
    } finally {
      setProcessing(false);
    }
  }

  async function addPayment() {
    if (!activeBatch) return;
    if (!addForm.partyName || !addForm.amount) { setMsg("Party name and amount required"); return; }
    const res = await fetch(`/api/bulk-payments/${activeBatch.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addForm, amount: parseFloat(addForm.amount) }),
    });
    const data = await res.json();
    if (data.row) {
      setBatches(prev => prev.map(b => b.id === activeBatch.id ? { ...b, rows: [...b.rows, data.row] } : b));
      setAddForm({ partyName: "", amount: "", reference: "", method: "bank", note: "" });
      setShowAdd(false);
      setMsg("Payment row added");
    }
  }

  const s: Record<string, React.CSSProperties> = {
    page:   { padding: "28px 32px", maxWidth: 1100, margin: "0 auto" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
    title:  { fontSize: 22, fontWeight: 800, color: "white", margin: 0 },
    sub:    { fontSize: 13, color: "rgba(255,255,255,.4)", marginTop: 3 },
    btn:    { padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" },
    cards:  { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 },
    card:   { borderRadius: 14, padding: 18, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" },
    clabel: { fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".06em" },
    cval:   { fontSize: 22, fontWeight: 800, color: "white", marginTop: 6 },
    table:  { width: "100%", borderCollapse: "collapse" as const },
    th:     { padding: "10px 14px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase" as const, letterSpacing: ".06em", borderBottom: "1px solid rgba(255,255,255,.07)" },
    td:     { padding: "12px 14px", fontSize: 13, color: "rgba(255,255,255,.8)", borderBottom: "1px solid rgba(255,255,255,.05)" },
    modal:  { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
    mbox:   { background: "#0f1629", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, padding: 28, width: 420, maxWidth: "90vw" },
    label:  { fontSize: 12, color: "rgba(255,255,255,.5)", fontWeight: 600, display: "block", marginBottom: 6 },
    input:  { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white", fontSize: 13, outline: "none", boxSizing: "border-box" as const },
  };

  if (loading) return (
    <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
      <div style={{ color: "rgba(255,255,255,.4)", fontSize: 14 }}>Loading batches…</div>
    </div>
  );

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Bulk Payments</h1>
          <p style={s.sub}>Approve and process multiple payments in a single batch — eliminate manual one-by-one posting</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...s.btn, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)" }} onClick={() => setShowNewBatch(true)}>
            + New Batch
          </button>
          {activeBatch && (
            <>
              <button style={{ ...s.btn, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)" }} onClick={() => setShowAdd(true)}>
                + Add Row
              </button>
              <button style={{ ...s.btn, opacity: selected.size === 0 ? .5 : 1 }} onClick={processSelected} disabled={processing || selected.size === 0}>
                {processing ? "Processing…" : `Process${selected.size > 0 ? ` (${selected.size})` : ""}`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Batch Tabs */}
      {batches.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" as const }}>
          {batches.map(b => (
            <button key={b.id} onClick={() => { setActiveBatchId(b.id); setSelected(new Set()); }}
              style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${b.id === activeBatchId ? "rgba(99,102,241,.6)" : "rgba(255,255,255,.1)"}`, background: b.id === activeBatchId ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.04)", color: b.id === activeBatchId ? "#818cf8" : "rgba(255,255,255,.5)", fontSize: 13, fontWeight: b.id === activeBatchId ? 700 : 400, cursor: "pointer" }}>
              {b.name}
              <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 6px", borderRadius: 6, background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.4)" }}>{b.status}</span>
            </button>
          ))}
        </div>
      )}

      {!activeBatch ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,.35)", fontSize: 15 }}>
          No batches yet. Click <strong style={{ color: "#818cf8" }}>+ New Batch</strong> to create one.
        </div>
      ) : (
        <>
          {/* Batch Info */}
          <div style={{ padding: "12px 18px", borderRadius: 12, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" as const }}>
            <div style={{ fontWeight: 700, color: "#818cf8", fontSize: 14 }}>{activeBatch.name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Created: {fmtDate(activeBatch.createdAt)}</div>
            <div style={{ marginLeft: "auto", padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(129,140,248,.2)", color: "#818cf8" }}>{activeBatch.status}</div>
          </div>

          {msg && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: msg.startsWith("✓") ? "rgba(52,211,153,.12)" : "rgba(248,113,113,.12)", color: msg.startsWith("✓") ? "#34d399" : "#f87171", fontSize: 13, marginBottom: 16 }}>
              {msg}
            </div>
          )}

          {/* KPI Cards */}
          <div style={s.cards}>
            <div style={s.card}>
              <div style={s.clabel}>Total Batch</div>
              <div style={s.cval}>Rs. {totalAmt.toLocaleString()}</div>
            </div>
            <div style={s.card}>
              <div style={s.clabel}>Selected</div>
              <div style={{ ...s.cval, color: "#818cf8" }}>Rs. {selectedAmt.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 3 }}>{selected.size} rows</div>
            </div>
            <div style={s.card}>
              <div style={s.clabel}>Processed</div>
              <div style={{ ...s.cval, color: "#34d399" }}>Rs. {processedAmt.toLocaleString()}</div>
            </div>
            <div style={s.card}>
              <div style={s.clabel}>Pending</div>
              <div style={{ ...s.cval, color: "#fbbf24" }}>{pendingPayments.length} rows</div>
            </div>
          </div>

          {/* Table */}
          <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 12 }}>
              <input type="checkbox" checked={selected.size === pendingPayments.length && pendingPayments.length > 0} onChange={toggleAll} style={{ width: 15, height: 15, cursor: "pointer" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Payment Rows — {activeBatch.rows.length} total</span>
            </div>
            {activeBatch.rows.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: "rgba(255,255,255,.35)", fontSize: 14 }}>
                No rows yet. Click <strong style={{ color: "#818cf8" }}>+ Add Row</strong> to add payments.
              </div>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={{ ...s.th, width: 36 }}></th>
                    {["Party / Recipient", "Reference", "Method", "Amount", "Status"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeBatch.rows.map(p => {
                    const canSelect = p.status === "PENDING" || p.status === "APPROVED";
                    return (
                      <tr key={p.id} style={{ background: selected.has(p.id) ? "rgba(99,102,241,.08)" : "transparent" }}>
                        <td style={s.td}>
                          {canSelect && <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} style={{ cursor: "pointer" }} />}
                        </td>
                        <td style={s.td}>
                          <div style={{ fontWeight: 700, color: "white" }}>{p.partyName}</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{p.partyType}</div>
                        </td>
                        <td style={{ ...s.td, color: "rgba(255,255,255,.5)", fontSize: 12 }}>{p.reference || "—"}</td>
                        <td style={s.td}>
                          <span style={{ fontSize: 13 }}>{METHOD_ICON[p.method]}</span>{" "}
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>{p.method}</span>
                        </td>
                        <td style={{ ...s.td, fontWeight: 700, color: "white" }}>Rs. {p.amount.toLocaleString()}</td>
                        <td style={s.td}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${STATUS_COLOR[p.status]}20`, color: STATUS_COLOR[p.status], border: `1px solid ${STATUS_COLOR[p.status]}40` }}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* New Batch Modal */}
      {showNewBatch && (
        <div style={s.modal} onClick={() => setShowNewBatch(false)}>
          <div style={s.mbox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "white", marginBottom: 20 }}>Create New Batch</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={s.label}>Batch Name</label>
                <input style={s.input} placeholder="e.g. April 2026 Supplier Payments" value={newBatchName} onChange={e => setNewBatchName(e.target.value)} onKeyDown={e => e.key === "Enter" && createBatch()} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button style={{ ...s.btn, flex: 1 }} onClick={createBatch}>Create</button>
                <button style={{ ...s.btn, background: "rgba(255,255,255,.06)", flex: 1 }} onClick={() => setShowNewBatch(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Row Modal */}
      {showAdd && (
        <div style={s.modal} onClick={() => setShowAdd(false)}>
          <div style={s.mbox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "white", marginBottom: 20 }}>Add Payment Row</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={s.label}>Party / Recipient</label>
                <input style={s.input} placeholder="Supplier, employee, vendor…" value={addForm.partyName} onChange={e => setAddForm(p => ({ ...p, partyName: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Amount (Rs.)</label>
                <input style={s.input} type="number" placeholder="0" value={addForm.amount} onChange={e => setAddForm(p => ({ ...p, amount: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Reference (PO / Invoice No.)</label>
                <input style={s.input} placeholder="PO-2026-001" value={addForm.reference} onChange={e => setAddForm(p => ({ ...p, reference: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Payment Method</label>
                <select style={s.input} value={addForm.method} onChange={e => setAddForm(p => ({ ...p, method: e.target.value }))}>
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Note (optional)</label>
                <input style={s.input} placeholder="Any note…" value={addForm.note} onChange={e => setAddForm(p => ({ ...p, note: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button style={{ ...s.btn, flex: 1 }} onClick={addPayment}>Add Row</button>
                <button style={{ ...s.btn, background: "rgba(255,255,255,.06)", flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
