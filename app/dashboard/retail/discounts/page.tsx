"use client";
import { useState, useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

type DiscountType = "PERCENTAGE" | "FIXED" | "BUY_X_GET_Y";
const STATUS_COLOR: Record<string, string> = { ACTIVE: "#10b981", SCHEDULED: "#f59e0b", EXPIRED: "#94a3b8" };
const TYPE_LABELS: Record<DiscountType, string> = { PERCENTAGE: "% Off", FIXED: "Rs Off", BUY_X_GET_Y: "Buy X Get Y" };

const BLANK = { name: "", code: "", type: "PERCENTAGE" as DiscountType, value: "", minPurchase: "", maxUses: "", startDate: "", endDate: "" };

export default function DiscountsPage() {
  const { records, loading, create, setStatus } = useBusinessRecords("retail_discount");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const discounts = useMemo(() =>
    records.map(r => ({
      id: r.id,
      name: r.title,
      code: String(r.data.code || ""),
      type: (r.data.type || "PERCENTAGE") as DiscountType,
      value: Number(r.data.value || 0),
      minPurchase: Number(r.data.minPurchase || 0),
      maxUses: Number(r.data.maxUses || 999),
      usedCount: Number(r.data.usedCount || 0),
      startDate: String(r.data.startDate || ""),
      endDate: String(r.data.endDate || ""),
      branches: String(r.data.branches || "All"),
      status: r.status as "ACTIVE" | "SCHEDULED" | "EXPIRED",
    })),
  [records]);

  function generateCode() {
    return form.name ? form.name.replace(/\s+/g, "").toUpperCase().slice(0, 6) + Math.floor(Math.random() * 90 + 10) : "";
  }

  async function handleSave() {
    if (!form.name || !form.code) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const status = form.startDate && form.startDate > today ? "SCHEDULED" : "ACTIVE";
      await create({
        title: form.name,
        status,
        data: { code: form.code, type: form.type, value: Number(form.value) || 0, minPurchase: Number(form.minPurchase) || 0, maxUses: Number(form.maxUses) || 999, usedCount: 0, startDate: form.startDate, endDate: form.endDate, branches: "All" },
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
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🏷️ Discounts & Promotions</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Manage promotional codes, flat discounts & offers</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + New Discount
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Active Discounts", val: discounts.filter(d => d.status === "ACTIVE").length, color: "#10b981" },
          { label: "Scheduled", val: discounts.filter(d => d.status === "SCHEDULED").length, color: "#f59e0b" },
          { label: "Total Uses (Active)", val: discounts.filter(d => d.status === "ACTIVE").reduce((s, d) => s + d.usedCount, 0), color: "#818cf8" },
          { label: "Total Discounts", val: discounts.length, color: "#6366f1" },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: kpi.color }}>{loading ? "…" : kpi.val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Loading discounts…</div>
        ) : discounts.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No discounts yet. Create your first promotion.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(99,102,241,.06)" }}>
                {["Name","Code","Type","Value","Min. Purchase","Usage","Valid Until","Status","Action"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {discounts.map((d, i) => (
                <tr key={d.id} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(99,102,241,.02)", opacity: d.status === "EXPIRED" ? 0.55 : 1 }}>
                  <td style={{ padding: "11px 14px", fontWeight: 600 }}>{d.name}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <code style={{ background: "rgba(99,102,241,.1)", color: "#818cf8", padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{d.code}</code>
                  </td>
                  <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{TYPE_LABELS[d.type]}</td>
                  <td style={{ padding: "11px 14px", fontWeight: 700, color: "#10b981" }}>
                    {d.type === "BUY_X_GET_Y" ? "Free Item" : d.type === "PERCENTAGE" ? `${d.value}%` : `Rs ${d.value}`}
                  </td>
                  <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{d.minPurchase > 0 ? `Rs ${d.minPurchase}` : "—"}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ fontSize: 12 }}>{d.usedCount}/{d.maxUses}</div>
                    <div style={{ height: 3, background: "var(--border)", borderRadius: 3, marginTop: 4, width: 60 }}>
                      <div style={{ height: 3, background: "#6366f1", borderRadius: 3, width: `${Math.min(100, (d.usedCount / d.maxUses) * 100)}%` }} />
                    </div>
                  </td>
                  <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{d.endDate || "—"}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ background: (STATUS_COLOR[d.status] || "#94a3b8") + "22", color: STATUS_COLOR[d.status] || "#94a3b8", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{d.status}</span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    {d.status !== "EXPIRED" && (
                      <button onClick={() => setStatus(d.id, "EXPIRED")} style={{ background: "rgba(239,68,68,.08)", color: "#ef4444", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>Stop</button>
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
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 18, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>New Discount</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Discount Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Eid Sale" style={{ ...inp, marginTop: 6 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Promo Code *</label>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="EID30" style={{ ...inp }} />
                  <button onClick={() => setForm(p => ({ ...p, code: generateCode() }))} style={{ flexShrink: 0, background: "rgba(99,102,241,.1)", color: "#818cf8", border: "none", borderRadius: 8, padding: "0 12px", fontSize: 12, cursor: "pointer" }}>Generate</button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as DiscountType }))} style={{ ...inp, marginTop: 6 }}>
                    <option value="PERCENTAGE">Percentage Off</option>
                    <option value="FIXED">Fixed Rs Off</option>
                    <option value="BUY_X_GET_Y">Buy X Get Y</option>
                  </select>
                </div>
                {form.type !== "BUY_X_GET_Y" && (
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{form.type === "PERCENTAGE" ? "Percentage %" : "Amount (Rs)"}</label>
                    <input type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} placeholder={form.type === "PERCENTAGE" ? "20" : "100"} style={{ ...inp, marginTop: 6 }} />
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Min. Purchase (Rs)</label>
                  <input type="number" value={form.minPurchase} onChange={e => setForm(p => ({ ...p, minPurchase: e.target.value }))} placeholder="0" style={{ ...inp, marginTop: 6 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Max Uses</label>
                  <input type="number" value={form.maxUses} onChange={e => setForm(p => ({ ...p, maxUses: e.target.value }))} placeholder="Unlimited" style={{ ...inp, marginTop: 6 }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} style={{ ...inp, marginTop: 6 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>End Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} style={{ ...inp, marginTop: 6 }} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.code} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer", opacity: (!form.name || !form.code) ? 0.5 : 1 }}>
                {saving ? "Saving…" : "Create Discount"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
