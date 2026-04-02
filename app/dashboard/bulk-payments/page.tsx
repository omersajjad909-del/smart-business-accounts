"use client";
import { useEffect, useState } from "react";

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
  totalAmount: number;
  status: "DRAFT" | "SUBMITTED" | "PROCESSED";
  payments: PaymentRow[];
};

const DEMO_BATCH: Batch = {
  id: "b1",
  name: "March 2025 Supplier Payments",
  createdAt: "2025-03-01",
  totalAmount: 485000,
  status: "DRAFT",
  payments: [
    { id: "p1", partyName: "Al-Rehman Traders",    partyType: "supplier", amount: 150000, reference: "PO-2025-0041", method: "bank",   status: "PENDING" },
    { id: "p2", partyName: "Excel Packaging Ltd",  partyType: "supplier", amount: 85000,  reference: "PO-2025-0038", method: "bank",   status: "PENDING" },
    { id: "p3", partyName: "City Freight Services", partyType: "other",   amount: 35000,  reference: "INV-345",      method: "cheque", status: "PENDING" },
    { id: "p4", partyName: "Karachi Electric",      partyType: "other",   amount: 12000,  reference: "BILL-MAR",     method: "bank",   status: "APPROVED" },
    { id: "p5", partyName: "Ahmed Ali (Salary)",    partyType: "employee", amount: 65000,  reference: "SALARY-MAR",   method: "bank",   status: "PROCESSED" },
    { id: "p6", partyName: "Zara Textiles",         partyType: "supplier", amount: 138000, reference: "PO-2025-0039", method: "bank",   status: "PENDING" },
  ],
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#94a3b8", APPROVED: "#818cf8", PROCESSED: "#34d399", FAILED: "#f87171",
};
const METHOD_ICON: Record<string, string> = { bank: "🏦", cash: "💵", cheque: "📄" };

export default function BulkPaymentsPage() {
  const [batch, setBatch] = useState<Batch>(DEMO_BATCH);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ partyName: "", amount: "", reference: "", method: "bank", note: "" });

  const pendingPayments = batch.payments.filter(p => p.status === "PENDING" || p.status === "APPROVED");
  const selectedAmt = batch.payments.filter(p => selected.has(p.id)).reduce((s, p) => s + p.amount, 0);
  const processedAmt = batch.payments.filter(p => p.status === "PROCESSED").reduce((s, p) => s + p.amount, 0);

  function toggleAll() {
    if (selected.size === pendingPayments.length) setSelected(new Set());
    else setSelected(new Set(pendingPayments.map(p => p.id)));
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function processSelected() {
    if (selected.size === 0) { setMsg("Select at least one payment"); return; }
    setProcessing(true);
    setMsg("");
    try {
      await new Promise(r => setTimeout(r, 1200)); // simulate API
      setBatch(prev => ({
        ...prev,
        payments: prev.payments.map(p =>
          selected.has(p.id) ? { ...p, status: "PROCESSED" as const } : p
        ),
      }));
      setSelected(new Set());
      setMsg(`✓ ${selected.size} payment(s) processed successfully`);
    } finally {
      setProcessing(false);
    }
  }

  function addPayment() {
    if (!addForm.partyName || !addForm.amount) { setMsg("Party name and amount required"); return; }
    setBatch(prev => ({
      ...prev,
      totalAmount: prev.totalAmount + parseFloat(addForm.amount),
      payments: [...prev.payments, {
        id: Date.now().toString(),
        partyName: addForm.partyName,
        partyType: "other" as const,
        amount: parseFloat(addForm.amount),
        reference: addForm.reference,
        method: addForm.method as "bank" | "cash" | "cheque",
        status: "PENDING" as const,
        note: addForm.note,
      }],
    }));
    setAddForm({ partyName: "", amount: "", reference: "", method: "bank", note: "" });
    setShowAdd(false);
    setMsg("Payment row added");
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

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Bulk Payments</h1>
          <p style={s.sub}>Approve and process multiple payments in a single batch — eliminate manual one-by-one posting</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...s.btn, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)" }} onClick={() => setShowAdd(true)}>
            + Add Row
          </button>
          <button style={{ ...s.btn, opacity: selected.size === 0 ? .5 : 1 }} onClick={processSelected} disabled={processing || selected.size === 0}>
            {processing ? "Processing…" : `Process ${selected.size > 0 ? `(${selected.size})` : ""}`}
          </button>
        </div>
      </div>

      {/* Batch Info */}
      <div style={{ padding: "12px 18px", borderRadius: 12, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" as const }}>
        <div style={{ fontWeight: 700, color: "#818cf8", fontSize: 14 }}>{batch.name}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Created: {batch.createdAt}</div>
        <div style={{ marginLeft: "auto", padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(129,140,248,.2)", color: "#818cf8" }}>{batch.status}</div>
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
          <div style={s.cval}>Rs. {batch.totalAmount.toLocaleString()}</div>
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
          <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Payment Rows — {batch.payments.length} total</span>
        </div>
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
            {batch.payments.map(p => {
              const canSelect = p.status === "PENDING" || p.status === "APPROVED";
              return (
                <tr key={p.id} style={{ background: selected.has(p.id) ? "rgba(99,102,241,.08)" : "transparent" }}>
                  <td style={s.td}>
                    {canSelect && (
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} style={{ cursor: "pointer" }} />
                    )}
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
      </div>

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
                <input style={s.input} placeholder="PO-2025-001" value={addForm.reference} onChange={e => setAddForm(p => ({ ...p, reference: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Payment Method</label>
                <select style={s.input} value={addForm.method} onChange={e => setAddForm(p => ({ ...p, method: e.target.value }))}>
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
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
