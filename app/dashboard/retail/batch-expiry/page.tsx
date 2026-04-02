"use client";
import { useState, useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const BLANK = { item: "", batch: "", mfgDate: "", expDate: "", qty: "", unit: "Units", supplier: "" };

function daysUntil(expDate: string) {
  if (!expDate) return 999;
  return Math.floor((new Date(expDate).getTime() - Date.now()) / 86400000);
}

function getExpiryStatus(days: number) {
  if (days <= 0) return { bg: "#ef444420", color: "#ef4444", label: "EXPIRED", statusKey: "EXPIRED" };
  if (days <= 7) return { bg: "#ef444420", color: "#ef4444", label: "CRITICAL", statusKey: "CRITICAL" };
  if (days <= 30) return { bg: "#f59e0b20", color: "#f59e0b", label: "EXPIRING_SOON", statusKey: "EXPIRING_SOON" };
  return { bg: "#10b98120", color: "#10b981", label: "OK", statusKey: "OK" };
}

export default function BatchExpiryPage() {
  const { records, loading, create, remove } = useBusinessRecords("batch_expiry");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  const batches = useMemo(() =>
    records.map(r => {
      const days = daysUntil(String(r.data.expDate || r.date || ""));
      return {
        id: r.id,
        item: r.title,
        batch: String(r.data.batch || ""),
        mfgDate: String(r.data.mfgDate || ""),
        expDate: String(r.data.expDate || r.date || ""),
        qty: Number(r.data.qty || 0),
        unit: String(r.data.unit || "Units"),
        supplier: String(r.data.supplier || ""),
        daysLeft: days,
        ...getExpiryStatus(days),
      };
    }),
  [records]);

  const filtered = batches.filter(b => {
    if (filter === "critical") return b.daysLeft <= 7;
    if (filter === "soon") return b.daysLeft > 7 && b.daysLeft <= 30;
    if (filter === "ok") return b.daysLeft > 30;
    return true;
  });

  async function handleSave() {
    if (!form.item || !form.batch || !form.expDate) return;
    setSaving(true);
    try {
      const days = daysUntil(form.expDate);
      const { statusKey } = getExpiryStatus(days);
      await create({
        title: form.item,
        status: statusKey,
        date: form.expDate,
        data: { batch: form.batch, mfgDate: form.mfgDate, expDate: form.expDate, qty: Number(form.qty) || 0, unit: form.unit, supplier: form.supplier },
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
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>⚠️ Batch & Expiry Tracking</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Track product batches and expiry dates</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#0f172a", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Add Batch
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Batches", val: batches.length, color: "#818cf8" },
          { label: "Critical (≤7 days)", val: batches.filter(b => b.daysLeft <= 7).length, color: "#ef4444" },
          { label: "Expiring Soon (≤30d)", val: batches.filter(b => b.daysLeft > 7 && b.daysLeft <= 30).length, color: "#f59e0b" },
          { label: "Safe Stock", val: batches.filter(b => b.daysLeft > 30).length, color: "#10b981" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>{loading ? "…" : k.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["all","All"],["critical","Critical"],["soon","Expiring Soon"],["ok","Safe"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{ padding: "7px 16px", borderRadius: 20, border: "1px solid var(--border)", background: filter === v ? "#6366f1" : "var(--panel-bg)", color: filter === v ? "white" : "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{l}</button>
        ))}
      </div>

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Loading batches…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No batches in this category.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(99,102,241,.06)" }}>
                {["Item","Batch","Mfg Date","Exp Date","Days Left","Qty","Supplier","Status","Action"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <tr key={b.id} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(99,102,241,.02)" }}>
                  <td style={{ padding: "11px 14px", fontWeight: 600 }}>{b.item}</td>
                  <td style={{ padding: "11px 14px", color: "var(--text-muted)", fontFamily: "monospace" }}>{b.batch}</td>
                  <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{b.mfgDate || "—"}</td>
                  <td style={{ padding: "11px 14px" }}>{b.expDate}</td>
                  <td style={{ padding: "11px 14px", fontWeight: 700, color: b.color }}>{b.daysLeft <= 0 ? "Expired" : `${b.daysLeft}d`}</td>
                  <td style={{ padding: "11px 14px" }}>{b.qty} {b.unit}</td>
                  <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{b.supplier || "—"}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ background: b.bg, color: b.color, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{b.label}</span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <button onClick={() => remove(b.id)} style={{ background: "rgba(239,68,68,.08)", color: "#ef4444", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>Remove</button>
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
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Add Batch</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Item Name *</label>
                  <input value={form.item} onChange={e => setForm(p => ({ ...p, item: e.target.value }))} placeholder="e.g. Panadol 500mg" style={{ ...inp, marginTop: 6 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Batch No. *</label>
                  <input value={form.batch} onChange={e => setForm(p => ({ ...p, batch: e.target.value }))} placeholder="B-2025-001" style={{ ...inp, marginTop: 6 }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Manufacture Date</label>
                  <input type="date" value={form.mfgDate} onChange={e => setForm(p => ({ ...p, mfgDate: e.target.value }))} style={{ ...inp, marginTop: 6 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Expiry Date *</label>
                  <input type="date" value={form.expDate} onChange={e => setForm(p => ({ ...p, expDate: e.target.value }))} style={{ ...inp, marginTop: 6 }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Quantity</label>
                  <input type="number" value={form.qty} onChange={e => setForm(p => ({ ...p, qty: e.target.value }))} placeholder="500" style={{ ...inp, marginTop: 6 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Unit</label>
                  <input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="Strips / Bottles" style={{ ...inp, marginTop: 6 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Supplier</label>
                <input value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))} placeholder="Supplier name" style={{ ...inp, marginTop: 6 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.item || !form.batch || !form.expDate} style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#0f172a", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: (!form.item || !form.expDate) ? 0.5 : 1 }}>
                {saving ? "Saving…" : "Add Batch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
