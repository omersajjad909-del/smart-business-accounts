"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";
import { useResponsive } from "@/hooks/useResponsive";

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

export default function RetailBranchesPage() {
  const { isMobile } = useResponsive();
  const [items,    setItems]    = useState<Branch[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [form,     setForm]     = useState(EMPTY);

  function f(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({
        ...prev,
        [field]: field === "isActive" ? (e.target as HTMLSelectElement).value === "yes" : e.target.value,
      }));
  }

  async function load() {
    const res = await fetch("/api/branches", { headers: authHeaders() });
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditId(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(b: Branch) {
    setEditId(b.id);
    setForm({ code: b.code, name: b.name, city: b.city || "", address: b.address || "", phone: b.phone || "", managerName: b.managerName || "", isActive: b.isActive });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) { toast.error("Branch Code and Name are required"); return; }
    setSaving(true);
    try {
      const method = editId ? "PUT" : "POST";
      const payload = editId ? { ...form, id: editId } : form;
      const res = await fetch("/api/branches", { method, headers: authHeaders(), body: JSON.stringify(payload) });
      if (res.ok) {
        toast.success(editId ? "Branch updated" : "Branch created");
        setShowModal(false);
        load();
      } else {
        const j = await res.json();
        toast.error(j?.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this branch?")) return;
    setDeleting(id);
    const res = await fetch(`/api/branches?id=${id}`, { method: "DELETE", headers: authHeaders() });
    if (res.ok) { toast.success("Branch deleted"); load(); }
    else toast.error("Delete failed");
    setDeleting(null);
  }

  const s = { fontFamily: "'Outfit','Inter',sans-serif" };
  const inp: React.CSSProperties = {
    padding: "9px 12px", background: "var(--app-bg)", border: "1px solid var(--border)",
    borderRadius: 8, color: "var(--text-primary)", fontSize: 13, width: "100%", boxSizing: "border-box",
    outline: "none",
  };
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: ".06em", display: "block", marginBottom: 5 };

  const cities = [...new Set(items.map(b => b.city).filter(Boolean))].length;

  return (
    <div style={{ ...s, minHeight: "100vh", background: "var(--app-bg)", padding: "28px 24px 60px", color: "var(--text-primary)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Branches &amp; Stores</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Manage your retail locations and store branches</p>
        </div>
        <button onClick={openAdd} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Add Branch
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Branches", val: items.length,                           color: "#818cf8" },
          { label: "Active",         val: items.filter(b => b.isActive).length,   color: "#10b981" },
          { label: "Cities",         val: cities,                                  color: "#f59e0b" },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: isMobile ? "12px 10px" : "16px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{loading ? "..." : kpi.val}</div>
          </div>
        ))}
      </div>

      {/* Branch Cards */}
      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: 20 }}>Loading branches...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 14 }}>
          No branches added yet — click "+ Add Branch" to get started
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {items.map(b => (
            <div key={b.id} style={{
              background: "var(--panel-bg)",
              border: `1px solid ${b.isActive ? "rgba(99,102,241,.25)" : "var(--border)"}`,
              borderRadius: 16, padding: isMobile ? "12px 10px" : "20px 22px", position: "relative",
              opacity: b.isActive ? 1 : 0.65,
            }}>
              {b.isActive && (
                <div style={{ position: "absolute", top: 14, right: 14, width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,rgba(99,102,241,.2),rgba(79,70,229,.1))", border: "1px solid rgba(99,102,241,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  🏬
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 600 }}>{b.code}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
                {b.city       && <span>📍 {b.city}</span>}
                {b.phone      && <span>📞 {b.phone}</span>}
                {b.managerName && <span>👤 {b.managerName}</span>}
                {b.address    && <span>🏢 {b.address}</span>}
                <span style={{ color: b.isActive ? "#10b981" : "#f87171", fontWeight: 600 }}>
                  {b.isActive ? "● Active" : "● Inactive"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => openEdit(b)} style={{ flex: 1, background: "rgba(99,102,241,.1)", color: "#818cf8", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Edit</button>
                <button onClick={() => remove(b.id)} disabled={deleting === b.id} style={{ flex: 1, background: "rgba(239,68,68,.08)", color: "#ef4444", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: deleting === b.id ? .5 : 1 }}>
                  {deleting === b.id ? "..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 18, padding: 28, width: "100%", maxWidth: 520 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{editId ? "Edit Branch" : "Add New Branch"}</div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>BRANCH CODE *</label>
                  <input style={inp} value={form.code} onChange={f("code")} placeholder="e.g. BR-001" required />
                </div>
                <div>
                  <label style={lbl}>BRANCH NAME *</label>
                  <input style={inp} value={form.name} onChange={f("name")} placeholder="e.g. Main Store — Lahore" required />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>CITY</label>
                  <input style={inp} value={form.city} onChange={f("city")} placeholder="e.g. Lahore" />
                </div>
                <div>
                  <label style={lbl}>PHONE</label>
                  <input style={inp} value={form.phone} onChange={f("phone")} placeholder="e.g. +92-300-1234567" />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>ADDRESS</label>
                <textarea style={{ ...inp, resize: "none", height: 68, lineHeight: 1.6 }} value={form.address} onChange={f("address")} placeholder="e.g. 12-A Main Boulevard, Gulberg, Lahore" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
                <div>
                  <label style={lbl}>BRANCH MANAGER</label>
                  <input style={inp} value={form.managerName} onChange={f("managerName")} placeholder="e.g. Ahmed Khan" />
                </div>
                <div>
                  <label style={lbl}>STATUS</label>
                  <select style={inp} value={form.isActive ? "yes" : "no"} onChange={f("isActive")}>
                    <option value="yes">Active</option>
                    <option value="no">Inactive</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: "10px 0", borderRadius: 10, background: saving ? "#4338ca" : "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? .7 : 1 }}>
                  {saving ? "Saving..." : editId ? "Update Branch" : "Create Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
