"use client";

import { useEffect, useState } from "react";

interface Branch {
  id: string;
  name: string;
  code: string;
  city: string;
  isActive: boolean;
}

export default function RetailBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState({ name: "", code: "", city: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/branches", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (Array.isArray(d)) {
          setBranches(
            d.map((b: { id: string; name: string; code?: string; city?: string; isActive?: boolean }) => ({
              id: b.id,
              name: b.name,
              code: b.code || "",
              city: b.city || "",
              isActive: b.isActive !== false,
            })),
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function openAdd() {
    setEditBranch(null);
    setForm({ name: "", code: "", city: "" });
    setShowModal(true);
  }

  function openEdit(branch: Branch) {
    setEditBranch(branch);
    setForm({ name: branch.name, code: branch.code, city: branch.city });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.code) return;
    setSaving(true);
    try {
      if (editBranch) {
        const res = await fetch("/api/branches", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editBranch.id, ...form, isActive: editBranch.isActive }),
        });
        const updated = await res.json();
        setBranches((current) =>
          current.map((branch) =>
            branch.id === editBranch.id
              ? { id: updated.id || branch.id, name: updated.name || form.name, code: updated.code || form.code, city: updated.city || form.city, isActive: updated.isActive !== false }
              : branch,
          ),
        );
      } else {
        const res = await fetch("/api/branches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const created = await res.json();
        setBranches((current) => [...current, { id: created.id, name: created.name || form.name, code: created.code || form.code, city: created.city || form.city, isActive: created.isActive !== false }]);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(branch: Branch) {
    const res = await fetch("/api/branches", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: branch.id, code: branch.code, name: branch.name, city: branch.city, isActive: !branch.isActive }),
    });
    const updated = await res.json();
    setBranches((current) => current.map((item) => (item.id === branch.id ? { ...item, isActive: updated.isActive !== false } : item)));
  }

  const s = { fontFamily: "'Outfit','Inter',sans-serif" };
  const inp = { padding: "9px 12px", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, width: "100%", boxSizing: "border-box" as const };

  return (
    <div style={{ ...s, minHeight: "100vh", background: "var(--app-bg)", padding: "28px 24px", color: "var(--text-primary)" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Branches and Stores</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Manage active retail locations with real branch records.</p>
        </div>
        <button onClick={openAdd} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Add Branch
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Branches", val: branches.length, color: "#818cf8" },
          { label: "Active", val: branches.filter((branch) => branch.isActive).length, color: "#10b981" },
          { label: "Cities", val: [...new Set(branches.map((branch) => branch.city).filter(Boolean))].length, color: "#f59e0b" },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{loading ? "..." : kpi.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {loading ? (
          <div style={{ color: "var(--text-muted)", padding: 20 }}>Loading branches...</div>
        ) : branches.length === 0 ? (
          <div style={{ color: "var(--text-muted)", padding: 20 }}>No branches added yet.</div>
        ) : (
          branches.map((branch) => (
            <div key={branch.id} style={{ background: "var(--panel-bg)", border: `1px solid ${branch.isActive ? "rgba(99,102,241,.25)" : "var(--border)"}`, borderRadius: 16, padding: "20px 22px", position: "relative" }}>
              {branch.isActive && <div style={{ position: "absolute", top: 14, right: 14, width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,rgba(99,102,241,.2),rgba(79,70,229,.1))", border: "1px solid rgba(99,102,241,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>B</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{branch.name}</div>
                  <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 600 }}>{branch.code}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
                <div>City: {branch.city || "Not set"}</div>
                <div>Status: {branch.isActive ? "Active" : "Inactive"}</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={() => openEdit(branch)} style={{ flex: 1, background: "rgba(99,102,241,.1)", color: "#818cf8", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Edit</button>
                <button onClick={() => toggleActive(branch)} style={{ flex: 1, background: branch.isActive ? "rgba(239,68,68,.08)" : "rgba(16,185,129,.08)", color: branch.isActive ? "#ef4444" : "#10b981", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {branch.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 18, padding: 28, width: "100%", maxWidth: 420 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{editBranch ? "Edit Branch" : "Add Branch"}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>x</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Branch Name *", key: "name", placeholder: "Main Store" },
                { label: "Code *", key: "code", placeholder: "HQ" },
                { label: "City", key: "city", placeholder: "Lahore" },
              ].map((field) => (
                <div key={field.key}>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{field.label}</label>
                  <input value={form[field.key as keyof typeof form]} onChange={(e) => setForm((current) => ({ ...current, [field.key]: e.target.value }))} placeholder={field.placeholder} style={{ ...inp, marginTop: 6 }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.code} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: !form.name || !form.code ? 0.5 : 1 }}>
                {saving ? "Saving..." : editBranch ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
