"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Customer { id: string; code?: string; name: string; phone: string; email: string; city: string; creditLimit: number; balance: number; totalSales: number; transactions?: number; loyaltyPoints: number; status: string; }

export default function RetailCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: "", creditLimit: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/retail/customers", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.customers)) setCustomers(d.customers); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || c.city.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSave() {
    if (!form.name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/retail/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, phone: form.phone, email: form.email, city: form.city, creditLimit: Number(form.creditLimit) || 0 }) });
      if (res.ok) {
        const d = await res.json();
        setCustomers(p => [d, ...p]);
      }
    } catch {}
    setSaving(false);
    setShowModal(false);
    setForm({ name: "", phone: "", email: "", city: "", creditLimit: "" });
  }

  const totalBalance = filtered.reduce((s, c) => s + c.balance, 0);
  const totalSales = filtered.reduce((s, c) => s + c.totalSales, 0);

  const s = { fontFamily: "'Outfit','Inter',sans-serif" };
  const inp = { padding: "9px 12px", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, width: "100%", boxSizing: "border-box" as const };

  return (
    <div style={{ ...s, minHeight: "100vh", background: "var(--app-bg)", padding: "28px 24px", color: "var(--text-primary)" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>👥 Customers</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Manage your retail customers, credit limits & loyalty</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Add Customer
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Customers", val: customers.length, color: "#818cf8" },
          { label: "Active", val: customers.filter(c => c.status === "active").length, color: "#10b981" },
          { label: "Outstanding Balance", val: `Rs ${totalBalance.toLocaleString()}`, color: "#f59e0b" },
          { label: "Total Sales (All Time)", val: `Rs ${totalSales.toLocaleString()}`, color: "#6366f1" },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color }}>{kpi.val}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search by name, phone, city…" style={{ ...inp, maxWidth: 380 }} />
      </div>

      {/* Table */}
      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "rgba(99,102,241,.06)" }}>
              {["Customer","Contact","City","Credit Limit","Balance","Sales","Loyalty","Status","Actions"].map(h => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>Loading customers...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>No customers found</td></tr>
            ) : filtered.map((c, i) => (
              <tr key={c.id} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(99,102,241,.02)" }}>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.email}</div>
                </td>
                <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{c.phone}</td>
                <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{c.city}</td>
                <td style={{ padding: "11px 14px" }}>{c.creditLimit > 0 ? `Rs ${c.creditLimit.toLocaleString()}` : "—"}</td>
                <td style={{ padding: "11px 14px", fontWeight: 600, color: c.balance > 0 ? "#f59e0b" : "var(--text-muted)" }}>
                  {c.balance > 0 ? `Rs ${c.balance.toLocaleString()}` : "—"}
                </td>
                <td style={{ padding: "11px 14px" }}>Rs {c.totalSales.toLocaleString()}</td>
                <td style={{ padding: "11px 14px" }}>
                  {c.loyaltyPoints > 0 && <span style={{ background: "rgba(251,191,36,.1)", color: "#fbbf24", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>⭐ {c.loyaltyPoints}</span>}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <span style={{ background: c.status === "active" ? "rgba(16,185,129,.1)" : "rgba(100,116,139,.1)", color: c.status === "active" ? "#10b981" : "#94a3b8", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    {c.status}
                  </span>
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Link href={`/dashboard/reports/ledger?account=${c.id}`} style={{ background: "rgba(99,102,241,.1)", color: "#818cf8", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>Ledger</Link>
                    <button style={{ background: "rgba(16,185,129,.1)", color: "#10b981", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 18, padding: 28, width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Add Customer</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Full Name *", key: "name", placeholder: "Customer / Business name" },
                { label: "Phone", key: "phone", placeholder: "+92 300 0000000" },
                { label: "Email", key: "email", placeholder: "email@example.com" },
                { label: "City", key: "city", placeholder: "Lahore, Karachi…" },
                { label: "Credit Limit (Rs)", key: "creditLimit", placeholder: "0 = no credit" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ ...inp, marginTop: 6 }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: !form.name ? 0.5 : 1 }}>
                {saving ? "Saving…" : "Add Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
