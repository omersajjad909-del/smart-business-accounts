"use client";
import { useState, useEffect } from "react";

interface Branch { id: string; name: string; code: string; city: string; address?: string; managerName?: string; phone?: string; isActive: boolean; }

const DEMO: Branch[] = [
  { id: "b1", name: "Main Store", code: "HQ", city: "Lahore", address: "15 Mall Road, Lahore", managerName: "Ahmed Khan", phone: "+92 42 1234567", isActive: true },
  { id: "b2", name: "Karachi Branch", code: "KHI", city: "Karachi", address: "45 Tariq Road, Karachi", managerName: "Sara Ali", phone: "+92 21 9876543", isActive: true },
  { id: "b3", name: "Islamabad Branch", code: "ISB", city: "Islamabad", address: "F-10 Markaz, Islamabad", managerName: "Usman Raza", phone: "+92 51 5551234", isActive: true },
];

export default function RetailBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>(DEMO);
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState({ name: "", code: "", city: "", address: "", managerName: "", phone: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/branches")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length) setBranches(d.map((b: any) => ({ id: b.id, name: b.name, code: b.code || "", city: b.city || "", address: b.address || "", managerName: "", phone: "", isActive: b.isActive !== false }))); })
      .catch(() => {});
  }, []);

  function openAdd() { setEditBranch(null); setForm({ name: "", code: "", city: "", address: "", managerName: "", phone: "" }); setShowModal(true); }
  function openEdit(b: Branch) { setEditBranch(b); setForm({ name: b.name, code: b.code, city: b.city, address: b.address || "", managerName: b.managerName || "", phone: b.phone || "" }); setShowModal(true); }

  async function handleSave() {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editBranch) {
        await fetch("/api/branches", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editBranch.id, ...form }) });
        setBranches(p => p.map(b => b.id === editBranch.id ? { ...b, ...form } : b));
      } else {
        const res = await fetch("/api/branches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const d = await res.json();
        setBranches(p => [...p, { id: d.id || Date.now().toString(), ...form, isActive: true }]);
      }
    } catch {}
    setSaving(false);
    setShowModal(false);
  }

  async function toggleActive(b: Branch) {
    try {
      await fetch("/api/branches", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: b.id, isActive: !b.isActive }) });
      setBranches(p => p.map(x => x.id === b.id ? { ...x, isActive: !x.isActive } : x));
    } catch {}
  }

  const s = { fontFamily: "'Outfit','Inter',sans-serif" };
  const inp = { padding: "9px 12px", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, width: "100%", boxSizing: "border-box" as const };

  return (
    <div style={{ ...s, minHeight: "100vh", background: "var(--app-bg)", padding: "28px 24px", color: "var(--text-primary)" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🏪 Branches & Stores</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Manage all your retail locations and branches</p>
        </div>
        <button onClick={openAdd} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Add Branch
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Branches", val: branches.length, color: "#818cf8" },
          { label: "Active", val: branches.filter(b => b.isActive).length, color: "#10b981" },
          { label: "Cities", val: [...new Set(branches.map(b => b.city))].length, color: "#f59e0b" },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.val}</div>
          </div>
        ))}
      </div>

      {/* Branch Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {branches.map(b => (
          <div key={b.id} style={{ background: "var(--panel-bg)", border: `1px solid ${b.isActive ? "rgba(99,102,241,.25)" : "var(--border)"}`, borderRadius: 16, padding: "20px 22px", position: "relative" }}>
            {b.isActive && <div style={{ position: "absolute", top: 14, right: 14, width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,rgba(99,102,241,.2),rgba(79,70,229,.1))", border: "1px solid rgba(99,102,241,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏪</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 600 }}>{b.code}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
              <div>📍 {b.city}{b.address ? ` — ${b.address}` : ""}</div>
              {b.managerName && <div>👤 {b.managerName}</div>}
              {b.phone && <div>📞 {b.phone}</div>}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => openEdit(b)} style={{ flex: 1, background: "rgba(99,102,241,.1)", color: "#818cf8", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Edit</button>
              <button onClick={() => toggleActive(b)} style={{ flex: 1, background: b.isActive ? "rgba(239,68,68,.08)" : "rgba(16,185,129,.08)", color: b.isActive ? "#ef4444" : "#10b981", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {b.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 18, padding: 28, width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{editBranch ? "Edit Branch" : "Add Branch"}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Branch Name *", key: "name", placeholder: "Main Store, Karachi Branch…" },
                { label: "Code", key: "code", placeholder: "HQ, KHI, ISB…" },
                { label: "City", key: "city", placeholder: "Lahore" },
                { label: "Address", key: "address", placeholder: "Full address" },
                { label: "Manager Name", key: "managerName", placeholder: "Manager's full name" },
                { label: "Phone", key: "phone", placeholder: "+92 XX XXXXXXX" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ ...inp, marginTop: 6 }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {saving ? "Saving…" : editBranch ? "Update" : "Add Branch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
