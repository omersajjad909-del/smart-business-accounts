"use client";
import { useState, useMemo, useEffect, useCallback } from "react";

const FONT = "'Outfit','Inter',sans-serif";

interface OverdueInvoice {
  id: string;
  invoiceNo: string;
  customer: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  lastFollowup: string | null;
  status: "PENDING" | "CONTACTED" | "PROMISED" | "PAID";
  note: string | null;
}

const STATUS_PALETTE: Record<string, { bg: string; color: string }> = {
  PENDING:   { bg: "rgba(239,68,68,0.12)",   color: "#f87171" },
  CONTACTED: { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24" },
  PROMISED:  { bg: "rgba(99,102,241,0.12)",  color: "#a5b4fc" },
  PAID:      { bg: "rgba(34,197,94,0.12)",   color: "#4ade80" },
};

function Badge({ label }: { label: string }) {
  const style = STATUS_PALETTE[label] ?? { bg: "rgba(120,120,120,0.15)", color: "#aaa" };
  return (
    <span style={{ display: "inline-block", padding: "3px 11px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: style.bg, color: style.color, letterSpacing: 0.3 }}>
      {label}
    </span>
  );
}

function AgingBadge({ days }: { days: number }) {
  const color = days > 60 ? "#f87171" : days > 30 ? "#fbbf24" : "#a5b4fc";
  return <span style={{ fontWeight: 700, color, fontSize: 13 }}>{days}d overdue</span>;
}

export default function PaymentFollowupPage() {
  const [invoices, setInvoices] = useState<OverdueInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "CONTACTED" | "PROMISED" | "PAID">("ALL");
  const [search, setSearch] = useState("");
  const [noteModal, setNoteModal] = useState<OverdueInvoice | null>(null);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payment-followup?days=0");
      const data = await res.json();
      if (data.invoices) setInvoices(data.invoices);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const filtered = useMemo(() => {
    let list = invoices;
    if (filter !== "ALL") list = list.filter(inv => inv.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(inv => inv.customer.toLowerCase().includes(q) || inv.invoiceNo.toLowerCase().includes(q));
    }
    return list;
  }, [invoices, filter, search]);

  const kpis = useMemo(() => ({
    total:    invoices.length,
    pending:  invoices.filter(i => i.status === "PENDING").length,
    inProg:   invoices.filter(i => i.status === "CONTACTED" || i.status === "PROMISED").length,
    totalAmt: invoices.reduce((s, i) => s + i.amount, 0),
  }), [invoices]);

  async function updateStatus(id: string, newStatus: string, note?: string) {
    // Optimistic update
    setInvoices(prev => prev.map(inv =>
      inv.id === id
        ? { ...inv, status: newStatus as OverdueInvoice["status"], ...(note !== undefined ? { note } : {}), lastFollowup: new Date().toISOString().split("T")[0] }
        : inv
    ));

    await fetch(`/api/payment-followup/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, ...(note !== undefined ? { note } : {}) }),
    });
  }

  async function saveNote() {
    if (!noteModal) return;
    setSaving(true);
    await updateStatus(noteModal.id, "CONTACTED", noteText);
    setSaving(false);
    setNoteModal(null);
  }

  const th: React.CSSProperties = { padding: "11px 14px", textAlign: "left", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, borderBottom: "1px solid var(--border)", fontWeight: 600 };
  const td: React.CSSProperties = { padding: "13px 14px", fontSize: 14, borderBottom: "1px solid var(--border)", color: "var(--text-primary)" };
  const btn: (color: string) => React.CSSProperties = (color) => ({ background: "transparent", border: `1px solid ${color}`, borderRadius: 8, padding: "4px 11px", fontSize: 11, fontWeight: 600, color, cursor: "pointer", fontFamily: FONT });

  const TABS: Array<"ALL" | "PENDING" | "CONTACTED" | "PROMISED" | "PAID"> = ["ALL", "PENDING", "CONTACTED", "PROMISED", "PAID"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg)", padding: "32px 28px", fontFamily: FONT, color: "var(--text-primary)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.5 }}>Payment Follow-up</h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Track and chase overdue customer invoices</p>
        </div>
        <button onClick={loadInvoices} style={{ background: "var(--text-muted)", border: "1px solid var(--text-muted)", borderRadius: 10, padding: "8px 16px", color: "var(--text-muted)", fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
          ↻ Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Overdue Invoices",  value: loading ? "…" : kpis.total,    color: "#6366f1" },
          { label: "Not Yet Contacted", value: loading ? "…" : kpis.pending,  color: "#f87171" },
          { label: "In Progress",       value: loading ? "…" : kpis.inProg,   color: "#fbbf24" },
          { label: "Total Overdue",     value: loading ? "…" : `Rs. ${kpis.totalAmt.toLocaleString()}`, color: "#f87171" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 22px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 4 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              background: filter === t ? "#6366f1" : "transparent",
              color: filter === t ? "#fff" : "var(--text-muted)",
              border: "none", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
            }}>{t}</button>
          ))}
        </div>
        <input
          style={{ flex: 1, minWidth: 200, background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 14px", color: "var(--text-primary)", fontSize: 13, fontFamily: FONT, outline: "none" }}
          placeholder="Search by customer or invoice…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--text-muted)", fontSize: 15 }}>Loading invoices…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--text-muted)", fontSize: 15 }}>
            {invoices.length === 0 ? "No overdue invoices found. All invoices are up to date!" : "No invoices matching your filter."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Invoice", "Customer", "Amount", "Date", "Overdue", "Last Follow-up", "Note", "Status", "Actions"].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => (
                <tr key={inv.id} style={{ background: i % 2 === 1 ? "var(--panel-bg)" : "transparent" }}>
                  <td style={{ ...td, fontWeight: 600, fontFamily: "monospace", fontSize: 12 }}>{inv.invoiceNo}</td>
                  <td style={td}>{inv.customer}</td>
                  <td style={{ ...td, fontWeight: 700 }}>Rs. {inv.amount.toLocaleString()}</td>
                  <td style={{ ...td, fontSize: 12, color: "var(--text-muted)" }}>{inv.dueDate}</td>
                  <td style={td}><AgingBadge days={inv.daysOverdue} /></td>
                  <td style={{ ...td, fontSize: 12, color: "var(--text-muted)" }}>
                    {inv.lastFollowup || <span style={{ color: "#f87171" }}>Never</span>}
                  </td>
                  <td style={{ ...td, fontSize: 12, color: "var(--text-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {inv.note || <span style={{ opacity: 0.4 }}>—</span>}
                  </td>
                  <td style={td}><Badge label={inv.status} /></td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => { setNoteModal(inv); setNoteText(inv.note || ""); }} style={btn("#a5b4fc")}>+ Note</button>
                      {inv.status === "PENDING" && (
                        <button onClick={() => updateStatus(inv.id, "CONTACTED")} style={btn("#fbbf24")}>Contacted</button>
                      )}
                      {inv.status === "CONTACTED" && (
                        <button onClick={() => updateStatus(inv.id, "PROMISED")} style={btn("#6366f1")}>Promised</button>
                      )}
                      {inv.status !== "PAID" && (
                        <button onClick={() => updateStatus(inv.id, "PAID")} style={btn("#4ade80")}>Mark Paid</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Note Modal */}
      {noteModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setNoteModal(null); }}
        >
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 18, width: "100%", maxWidth: 480, padding: "28px 32px", fontFamily: FONT }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px" }}>Follow-up Note</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 20px" }}>{noteModal.invoiceNo} · {noteModal.customer}</p>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="e.g. Spoke with Ahmed, promised to pay by April 30…"
              rows={4}
              style={{ width: "100%", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 13px", color: "var(--text-primary)", fontSize: 14, fontFamily: FONT, outline: "none", resize: "vertical", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setNoteModal(null)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 18px", fontSize: 13, cursor: "pointer", color: "var(--text-muted)", fontFamily: FONT }}>Cancel</button>
              <button onClick={saveNote} disabled={saving} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 9, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Save Note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
