"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";

type Branch = {
  id: string;
  code: string;
  name: string;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  managerName?: string | null;
  isActive: boolean;
};

const EMPTY = { code: "", name: "", city: "", address: "", phone: "", managerName: "", isActive: true };

function authHeaders() {
  const u = getCurrentUser();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (u?.role)      h["x-user-role"]      = u.role;
  if (u?.id)        h["x-user-id"]        = u.id;
  if (u?.companyId) h["x-company-id"]     = u.companyId;
  return h;
}

export default function BranchesPage() {
  const [items,   setItems]   = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId,  setEditId]  = useState<string | null>(null);
  const [form,    setForm]    = useState(EMPTY);
  const [deleting, setDeleting] = useState<string | null>(null);

  function f(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: field === "isActive" ? (e.target as HTMLSelectElement).value === "yes" : e.target.value }));
  }

  async function load() {
    const res = await fetch("/api/branches", { headers: authHeaders() });
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) { toast.error("Code and Name are required"); return; }
    setLoading(true);
    const method = editId ? "PUT" : "POST";
    const payload = editId ? { ...form, id: editId } : form;
    const res = await fetch("/api/branches", { method, headers: authHeaders(), body: JSON.stringify(payload) });
    if (res.ok) {
      toast.success(editId ? "Branch updated" : "Branch created");
      setForm(EMPTY); setEditId(null);
      load();
    } else {
      const j = await res.json();
      toast.error(j?.error || "Failed");
    }
    setLoading(false);
  }

  function startEdit(b: Branch) {
    setEditId(b.id);
    setForm({ code: b.code, name: b.name, city: b.city || "", address: b.address || "", phone: b.phone || "", managerName: b.managerName || "", isActive: b.isActive });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() { setEditId(null); setForm(EMPTY); }

  async function remove(id: string) {
    if (!confirm("Delete this branch?")) return;
    setDeleting(id);
    const res = await fetch(`/api/branches?id=${id}`, { method: "DELETE", headers: authHeaders() });
    if (res.ok) { toast.success("Branch deleted"); load(); }
    else toast.error("Delete failed");
    setDeleting(null);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
    color: "white", fontSize: 13, outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: ".06em", display: "block", marginBottom: 5 };

  return (
    <div style={{ padding: "28px 24px 60px", maxWidth: 900, margin: "0 auto", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <style>{`select option { background:#0f172a; color:white; } *{box-sizing:border-box;}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "white" }}>Branches</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#475569" }}>Manage company branches and locations</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Branches",    value: items.length,                            color: "#818cf8" },
          { label: "Active",            value: items.filter(b => b.isActive).length,    color: "#22c55e" },
          { label: "Inactive",          value: items.filter(b => !b.isActive).length,   color: "#f87171" },
        ].map(s => (
          <div key={s.label} style={{ padding: "14px 18px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: `1px solid ${s.color}20` }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div style={{ borderRadius: 18, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", padding: "24px", marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 20 }}>
          {editId ? "✏️ Edit Branch" : "➕ Add New Branch"}
        </div>

        <form onSubmit={submit}>
          {/* Row 1: Code + Name */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={lbl}>BRANCH CODE *</label>
              <input style={inp} value={form.code} onChange={f("code")} placeholder="e.g. BR-001" required />
            </div>
            <div>
              <label style={lbl}>BRANCH NAME *</label>
              <input style={inp} value={form.name} onChange={f("name")} placeholder="e.g. Main Office — Lahore" required />
            </div>
          </div>

          {/* Row 2: City + Phone */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={lbl}>CITY</label>
              <input style={inp} value={form.city} onChange={f("city")} placeholder="e.g. Lahore" />
            </div>
            <div>
              <label style={lbl}>PHONE</label>
              <input style={inp} value={form.phone} onChange={f("phone")} placeholder="e.g. +92-300-1234567" />
            </div>
          </div>

          {/* Row 3: Address */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>ADDRESS</label>
            <textarea
              style={{ ...inp, resize: "none", height: 72, lineHeight: 1.6 }}
              value={form.address}
              onChange={f("address")}
              placeholder="e.g. 12-A, Main Boulevard, Gulberg III, Lahore, Pakistan"
            />
          </div>

          {/* Row 4: Manager + Status */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <div>
              <label style={lbl}>BRANCH MANAGER</label>
              <input style={inp} value={form.managerName} onChange={f("managerName")} placeholder="e.g. Ahmed Khan" />
            </div>
            <div>
              <label style={lbl}>STATUS</label>
              <select style={{ ...inp }} value={form.isActive ? "yes" : "no"} onChange={f("isActive")}>
                <option value="yes">Active</option>
                <option value="no">Inactive</option>
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            {editId && (
              <button type="button" onClick={cancelEdit}
                style={{ padding: "11px 22px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#64748b", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Cancel
              </button>
            )}
            <button type="submit" disabled={loading}
              style={{ padding: "11px 28px", borderRadius: 10, background: loading ? "#4338ca" : "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: loading ? "wait" : "pointer", opacity: loading ? .7 : 1 }}>
              {loading ? "Saving…" : editId ? "Update Branch" : "Create Branch"}
            </button>
          </div>
        </form>
      </div>

      {/* Branch list */}
      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#334155", fontSize: 14 }}>
          No branches yet — add your first branch above
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map(b => (
            <div key={b.id} style={{
              borderRadius: 16, background: "rgba(255,255,255,.03)",
              border: `1px solid ${b.isActive ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.04)"}`,
              padding: "18px 20px",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
              opacity: b.isActive ? 1 : 0.6,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Top row */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#818cf8", background: "rgba(129,140,248,.1)", border: "1px solid rgba(129,140,248,.2)", padding: "2px 10px", borderRadius: 20 }}>
                    {b.code}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{b.name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                    background: b.isActive ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.1)",
                    color: b.isActive ? "#22c55e" : "#f87171",
                    border: `1px solid ${b.isActive ? "rgba(34,197,94,.2)" : "rgba(239,68,68,.2)"}`,
                  }}>
                    {b.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Details row */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 18px", fontSize: 12, color: "#475569" }}>
                  {b.city       && <span>📍 {b.city}</span>}
                  {b.phone      && <span>📞 {b.phone}</span>}
                  {b.managerName && <span>👤 {b.managerName}</span>}
                </div>
                {b.address && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "#334155", lineHeight: 1.5 }}>
                    🏢 {b.address}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => startEdit(b)}
                  style={{ padding: "6px 16px", borderRadius: 9, background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.25)", color: "#818cf8", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Edit
                </button>
                <button onClick={() => remove(b.id)} disabled={deleting === b.id}
                  style={{ padding: "6px 16px", borderRadius: 9, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: deleting === b.id ? .5 : 1 }}>
                  {deleting === b.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
