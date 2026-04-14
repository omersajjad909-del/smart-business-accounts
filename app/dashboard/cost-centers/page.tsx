"use client";
import { useEffect, useState } from "react";

const ff = "'Outfit','Inter',sans-serif";

type CostCenter = { id: string; code: string; name: string; isActive: boolean };

export default function CostCentersPage() {
  const [items,   setItems]   = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId,  setEditId]  = useState<string | null>(null);
  const [form,    setForm]    = useState({ code: "", name: "", isActive: true });
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState("");

  async function load() {
    setLoading(true);
    const res  = await fetch("/api/cost-centers");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const method  = editId ? "PUT" : "POST";
    const payload = editId ? { ...form, id: editId } : form;
    await fetch("/api/cost-centers", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setForm({ code: "", name: "", isActive: true });
    setEditId(null);
    setSaving(false);
    setMsg(editId ? "Cost center updated." : "Cost center created.");
    setTimeout(() => setMsg(""), 2500);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this cost center?")) return;
    await fetch(`/api/cost-centers?id=${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(c: CostCenter) {
    setEditId(c.id);
    setForm({ code: c.code, name: c.name, isActive: c.isActive });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditId(null);
    setForm({ code: "", name: "", isActive: true });
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 9,
    border: "1.5px solid var(--border)", background: "var(--panel-bg-2)",
    color: "var(--text-primary)", fontFamily: ff, fontSize: 13, outline: "none", boxSizing: "border-box",
  };

  const activeItems   = items.filter(c => c.isActive);
  const inactiveItems = items.filter(c => !c.isActive);

  return (
    <div style={{ padding: "28px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 860 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Cost Centers</h1>
        <p style={{ margin: "5px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
          Tag expense vouchers, invoices, and purchase orders to a cost center for granular reporting
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total",    value: items.length,         color: "#6366f1", bg: "rgba(99,102,241,.07)",  border: "rgba(99,102,241,.2)" },
          { label: "Active",   value: activeItems.length,   color: "#34d399", bg: "rgba(52,211,153,.07)",  border: "rgba(52,211,153,.2)" },
          { label: "Inactive", value: inactiveItems.length, color: "#6b7280", bg: "rgba(107,114,128,.06)", border: "rgba(107,114,128,.15)" },
        ].map(s => (
          <div key={s.label} style={{ borderRadius: 12, padding: "14px 18px", background: s.bg, border: `1px solid ${s.border}` }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div style={{ background: "var(--panel-bg)", border: `1.5px solid ${editId ? "rgba(99,102,241,.4)" : "var(--border)"}`, borderRadius: 14, padding: "20px 22px", marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: editId ? "#818cf8" : "var(--text-primary)" }}>
          {editId ? "✏️ Edit Cost Center" : "➕ New Cost Center"}
        </div>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".06em" }}>Code</div>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. MKT, OPS" required style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".06em" }}>Name</div>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Marketing, Operations" required style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".06em" }}>Active</div>
              <select value={form.isActive ? "yes" : "no"} onChange={e => setForm({ ...form, isActive: e.target.value === "yes" })} style={{ ...inp, width: "auto", minWidth: 90 }}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button type="submit" disabled={saving}
              style={{ padding: "9px 22px", borderRadius: 9, background: saving ? "rgba(99,102,241,.4)" : "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: ff }}>
              {saving ? "Saving…" : editId ? "Update" : "Create"}
            </button>
            {editId && (
              <button type="button" onClick={cancelEdit}
                style={{ padding: "9px 18px", borderRadius: 9, border: "1.5px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>
                Cancel
              </button>
            )}
            {msg && <span style={{ fontSize: 12, fontWeight: 700, color: "#34d399", padding: "9px 14px", borderRadius: 9, background: "rgba(52,211,153,.1)" }}>✓ {msg}</span>}
          </div>
        </form>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)", fontSize: 13 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🏷️</div>
          No cost centers yet — create one above
        </div>
      ) : (
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
            {items.length} Cost Center{items.length !== 1 ? "s" : ""}
          </div>
          {items.map((c, i) => (
            <div key={c.id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none", gap: 12 }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: c.isActive ? "rgba(99,102,241,.1)" : "rgba(107,114,128,.08)", border: `1px solid ${c.isActive ? "rgba(99,102,241,.25)" : "rgba(107,114,128,.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: c.isActive ? "#818cf8" : "#6b7280" }}>
                  {c.code.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{c.code} — {c.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Code: {c.code}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: c.isActive ? "rgba(52,211,153,.1)" : "rgba(107,114,128,.1)", color: c.isActive ? "#34d399" : "#6b7280" }}>
                  {c.isActive ? "Active" : "Inactive"}
                </span>
                <button onClick={() => startEdit(c)}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: "transparent", color: "var(--text-primary)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>
                  Edit
                </button>
                <button onClick={() => remove(c.id)}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid rgba(248,113,113,.3)", background: "rgba(248,113,113,.07)", color: "#f87171", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Usage tip */}
      <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.2)", fontSize: 12, color: "#d97706", lineHeight: 1.6 }}>
        <strong>How to use cost centers:</strong> When creating an Expense Voucher, Sales Invoice, or Purchase Order, select a cost center to tag that transaction. Then view cost-center-wise spending in Reports → Expense Breakdown (select "By Cost Center") or Budget vs Actual (filter by cost center).
      </div>
    </div>
  );
}
