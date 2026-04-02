"use client";
import { useState, useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const STATUS_COLOR: Record<string, string> = { COMPLETED: "#10b981", IN_TRANSIT: "#f59e0b", PENDING: "#6366f1" };
const BLANK = { fromBranch: "", toBranch: "", items: "", notes: "" };

export default function StockTransferPage() {
  const { records, loading, create, setStatus } = useBusinessRecords("stock_transfer");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const transfers = useMemo(() =>
    records.map(r => ({
      id: r.id,
      transferId: r.title,
      date: r.date || r.createdAt.slice(0, 10),
      fromBranch: String(r.data.fromBranch || ""),
      toBranch: String(r.data.toBranch || ""),
      itemCount: Number(r.data.itemCount || 0),
      notes: String(r.data.notes || ""),
      status: r.status,
    })),
  [records]);

  async function handleSave() {
    if (!form.fromBranch || !form.toBranch || !form.items) return;
    setSaving(true);
    try {
      const tId = `TRF-${String(Date.now()).slice(-5)}`;
      const lines = form.items.split("\n").filter(Boolean);
      await create({
        title: tId,
        status: "PENDING",
        date: new Date().toISOString().slice(0, 10),
        data: { fromBranch: form.fromBranch, toBranch: form.toBranch, itemCount: lines.length, items: lines, notes: form.notes },
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
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🔄 Stock Transfer</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Move inventory between branches</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + New Transfer
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Transfers", val: transfers.length, color: "#818cf8" },
          { label: "Pending", val: transfers.filter(t => t.status === "PENDING").length, color: "#6366f1" },
          { label: "In Transit", val: transfers.filter(t => t.status === "IN_TRANSIT").length, color: "#f59e0b" },
          { label: "Completed", val: transfers.filter(t => t.status === "COMPLETED").length, color: "#10b981" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{loading ? "…" : k.val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Loading transfers…</div>
        ) : transfers.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No stock transfers yet. Create your first transfer.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(99,102,241,.06)" }}>
                {["Transfer ID","Date","From","To","Items","Status","Action"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transfers.map((row, i) => (
                <tr key={row.id} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(99,102,241,.02)" }}>
                  <td style={{ padding: "11px 14px", fontWeight: 700, color: "#818cf8" }}>{row.transferId}</td>
                  <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{row.date}</td>
                  <td style={{ padding: "11px 14px" }}>{row.fromBranch}</td>
                  <td style={{ padding: "11px 14px" }}>{row.toBranch}</td>
                  <td style={{ padding: "11px 14px" }}>{row.itemCount} line(s)</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ background: (STATUS_COLOR[row.status] || "#94a3b8") + "20", color: STATUS_COLOR[row.status] || "#94a3b8", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{row.status.replace("_", " ")}</span>
                  </td>
                  <td style={{ padding: "11px 14px", display: "flex", gap: 6 }}>
                    {row.status === "PENDING" && (
                      <button onClick={() => setStatus(row.id, "IN_TRANSIT")} style={{ background: "rgba(245,158,11,.1)", color: "#f59e0b", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>Dispatch</button>
                    )}
                    {row.status === "IN_TRANSIT" && (
                      <button onClick={() => setStatus(row.id, "COMPLETED")} style={{ background: "rgba(16,185,129,.1)", color: "#10b981", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>Receive</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 18, padding: 28, width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>New Stock Transfer</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>From Branch *</label>
                  <input value={form.fromBranch} onChange={e => setForm(p => ({ ...p, fromBranch: e.target.value }))} placeholder="Main Store" style={{ ...inp, marginTop: 6 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>To Branch *</label>
                  <input value={form.toBranch} onChange={e => setForm(p => ({ ...p, toBranch: e.target.value }))} placeholder="Karachi Branch" style={{ ...inp, marginTop: 6 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Items (one per line) *</label>
                <textarea value={form.items} onChange={e => setForm(p => ({ ...p, items: e.target.value }))} placeholder={"Basmati Rice 5kg x20\nCooking Oil 1L x10"} rows={4} style={{ ...inp, marginTop: 6, resize: "vertical" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Notes</label>
                <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" style={{ ...inp, marginTop: 6 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.fromBranch || !form.toBranch || !form.items} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer", opacity: (!form.fromBranch || !form.toBranch || !form.items) ? 0.5 : 1 }}>
                {saving ? "Creating…" : "Create Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
