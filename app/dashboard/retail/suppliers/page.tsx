"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Supplier { id: string; code?: string; name: string; phone: string; email: string; city: string; balance: number; totalPurchases: number; transactions?: number; status: string; }

export default function RetailSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/retail/suppliers", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.suppliers)) setSuppliers(d.suppliers); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = suppliers.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.city.toLowerCase().includes(search.toLowerCase()));

  async function handleSave() {
    if (!form.name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/retail/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, phone: form.phone, email: form.email, city: form.city }) });
      if (res.ok) {
        const created = await res.json();
        setSuppliers(p => [created, ...p]);
      }
    } catch {}
    setSaving(false);
    setShowModal(false);
    setForm({ name: "", phone: "", email: "", city: "" });
  }

  const s = { fontFamily: "'Outfit','Inter',sans-serif" };
  const inp = { padding: "9px 12px", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, width: "100%", boxSizing: "border-box" as const };

  return (
    <div style={{ ...s, minHeight: "100vh", background: "var(--app-bg)", padding: "28px 24px", color: "var(--text-primary)" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🏭 Suppliers</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Manage your suppliers, payables & purchase history</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Add Supplier
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Suppliers", val: suppliers.length, color: "#818cf8" },
          { label: "Active", val: suppliers.filter(x => x.status === "active").length, color: "#10b981" },
          { label: "Total Payable", val: `Rs ${suppliers.reduce((s, x) => s + x.balance, 0).toLocaleString()}`, color: "#ef4444" },
          { label: "Total Purchases", val: `Rs ${suppliers.reduce((s, x) => s + x.totalPurchases, 0).toLocaleString()}`, color: "#6366f1" },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color }}>{kpi.val}</div>
          </div>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search suppliers…" style={{ ...inp, maxWidth: 380, marginBottom: 20 }} />

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "rgba(99,102,241,.06)" }}>
              {["Supplier","Contact","City","Payable","Total Purchases","Status","Actions"].map(h => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>Loading suppliers...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>No suppliers found</td></tr>
            ) : filtered.map((sup, i) => (
              <tr key={sup.id} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(99,102,241,.02)" }}>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ fontWeight: 600 }}>{sup.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sup.email}</div>
                </td>
                <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{sup.phone}</td>
                <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{sup.city}</td>
                <td style={{ padding: "11px 14px", fontWeight: 600, color: sup.balance > 0 ? "#ef4444" : "var(--text-muted)" }}>
                  {sup.balance > 0 ? `Rs ${sup.balance.toLocaleString()}` : "—"}
                </td>
                <td style={{ padding: "11px 14px" }}>Rs {sup.totalPurchases.toLocaleString()}</td>
                <td style={{ padding: "11px 14px" }}>
                  <span style={{ background: sup.status === "active" ? "rgba(16,185,129,.1)" : "rgba(100,116,139,.1)", color: sup.status === "active" ? "#10b981" : "#94a3b8", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    {sup.status}
                  </span>
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <Link href={`/dashboard/reports/ledger?account=${sup.id}`} style={{ background: "rgba(99,102,241,.1)", color: "#818cf8", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>Ledger</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 18, padding: 28, width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Add Supplier</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Business Name *", key: "name", placeholder: "Supplier name" },
                { label: "Phone", key: "phone", placeholder: "+92 300 0000000" },
                { label: "Email", key: "email", placeholder: "supplier@email.com" },
                { label: "City", key: "city", placeholder: "Lahore, Karachi…" },
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
                {saving ? "Saving…" : "Add Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
