"use client";
import { useState, useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const BLANK = { cashier: "", branch: "Main Store", openingCash: "" };

export default function POSSessionsPage() {
  const { records, loading, create, setStatus } = useBusinessRecords("pos_session");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const sessions = useMemo(() =>
    records.map(r => ({
      id: r.id,
      sessionId: r.title,
      date: r.date || r.createdAt.slice(0, 10),
      cashier: String(r.data.cashier || ""),
      branch: String(r.data.branch || ""),
      openingCash: Number(r.data.openingCash || 0),
      closingCash: Number(r.data.closingCash || 0),
      sales: r.amount || 0,
      transactions: Number(r.data.transactions || 0),
      status: r.status,
    })),
  [records]);

  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter(s => s.date === today);

  async function openSession() {
    if (!form.cashier || !form.branch) return;
    setSaving(true);
    try {
      const sessionId = `S-${Date.now().toString().slice(-6)}`;
      await create({
        title: sessionId,
        status: "OPEN",
        date: today,
        amount: 0,
        data: { cashier: form.cashier, branch: form.branch, openingCash: Number(form.openingCash) || 0, closingCash: 0, transactions: 0 },
      });
      setShowModal(false);
      setForm(BLANK);
    } finally {
      setSaving(false);
    }
  }

  const inp = { padding: "9px 12px", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, width: "100%", boxSizing: "border-box" as const };
  const s = { fontFamily: "'Outfit','Inter',sans-serif" };

  return (
    <div style={{ ...s, minHeight: "100vh", background: "var(--app-bg)", padding: "28px 24px", color: "var(--text-primary)" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>📋 POS Sessions</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Daily cashier sessions — opening & closing cash reconciliation</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Open Session
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Open Sessions", val: sessions.filter(s => s.status === "OPEN").length, color: "#10b981" },
          { label: "Today's Sales", val: `Rs ${todaySessions.reduce((a, s) => a + s.sales, 0).toLocaleString()}`, color: "#818cf8" },
          { label: "Today Transactions", val: todaySessions.reduce((a, s) => a + s.transactions, 0), color: "#f59e0b" },
          { label: "Active Cashiers", val: sessions.filter(s => s.status === "OPEN").length, color: "#6366f1" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{loading ? "…" : k.val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Loading sessions…</div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No POS sessions yet. Open your first cashier session.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(99,102,241,.06)" }}>
                {["Session","Date","Cashier","Branch","Opening Cash","Sales","Transactions","Status","Action"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((row, i) => (
                <tr key={row.id} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(99,102,241,.02)" }}>
                  <td style={{ padding: "11px 14px", fontWeight: 700, color: "#818cf8" }}>{row.sessionId}</td>
                  <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{row.date}</td>
                  <td style={{ padding: "11px 14px", fontWeight: 500 }}>{row.cashier}</td>
                  <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{row.branch}</td>
                  <td style={{ padding: "11px 14px" }}>Rs {row.openingCash.toLocaleString()}</td>
                  <td style={{ padding: "11px 14px", fontWeight: 600, color: "#10b981" }}>Rs {row.sales.toLocaleString()}</td>
                  <td style={{ padding: "11px 14px" }}>{row.transactions}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ background: row.status === "OPEN" ? "rgba(16,185,129,.1)" : "rgba(100,116,139,.1)", color: row.status === "OPEN" ? "#10b981" : "#94a3b8", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{row.status}</span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    {row.status === "OPEN"
                      ? <button onClick={() => setStatus(row.id, "CLOSED")} style={{ background: "rgba(239,68,68,.1)", color: "#ef4444", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>Close</button>
                      : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Closed</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 18, padding: 28, width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Open POS Session</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Cashier Name *</label>
                <input value={form.cashier} onChange={e => setForm(p => ({ ...p, cashier: e.target.value }))} placeholder="e.g. Ahmed Khan" style={{ ...inp, marginTop: 6 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Branch</label>
                <input value={form.branch} onChange={e => setForm(p => ({ ...p, branch: e.target.value }))} placeholder="Main Store" style={{ ...inp, marginTop: 6 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Opening Cash (Rs)</label>
                <input type="number" value={form.openingCash} onChange={e => setForm(p => ({ ...p, openingCash: e.target.value }))} placeholder="5000" style={{ ...inp, marginTop: 6 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={openSession} disabled={saving || !form.cashier} style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "white", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer", opacity: !form.cashier ? 0.5 : 1 }}>
                {saving ? "Opening…" : "Open Session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
