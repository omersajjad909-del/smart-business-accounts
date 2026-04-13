"use client";
import { confirmToast } from "@/lib/toast-feedback";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";

const ff     = "'Outfit','Inter',sans-serif";
const accent = "#10b981";

interface TaxConfiguration {
  id: string; taxType: string; taxCode: string;
  taxRate: number; description?: string; isActive: boolean;
}

const TAX_TYPES = [
  { value: "GST",          label: "GST — Goods & Services Tax",       regions: "Pakistan, India, Australia, Singapore, Canada" },
  { value: "VAT",          label: "VAT — Value Added Tax",            regions: "UK, EU, UAE, Saudi Arabia, Africa" },
  { value: "SALES_TAX",   label: "Sales Tax",                        regions: "USA, Pakistan (provincial)" },
  { value: "INCOME_TAX",  label: "Income Tax",                       regions: "Universal" },
  { value: "WHT",          label: "WHT — Withholding Tax",            regions: "Pakistan, India, Kenya, Nigeria" },
  { value: "FED",          label: "FED — Federal Excise Duty",        regions: "Pakistan" },
  { value: "SST",          label: "SST — Sales & Services Tax",       regions: "Malaysia" },
  { value: "HST",          label: "HST — Harmonized Sales Tax",       regions: "Canada" },
  { value: "PST",          label: "PST — Provincial Sales Tax",       regions: "Canada" },
  { value: "SERVICE_TAX",  label: "Service Tax",                      regions: "India, various" },
  { value: "EXCISE_DUTY",  label: "Excise Duty",                      regions: "Universal (alcohol, tobacco, fuel)" },
  { value: "CUSTOM_DUTY",  label: "Custom Duty",                      regions: "Import/Export worldwide" },
  { value: "CORPORATE_TAX",label: "Corporate Income Tax (CIT)",       regions: "Universal" },
  { value: "CAPITAL_GAINS",label: "Capital Gains Tax",                regions: "USA, UK, Australia, Pakistan" },
  { value: "STAMP_DUTY",   label: "Stamp Duty",                       regions: "UK, Australia, Pakistan, India" },
  { value: "ZAKAT",        label: "Zakat",                            regions: "Pakistan, Saudi Arabia, Islamic countries" },
  { value: "OTHER",        label: "Other / Custom",                   regions: "Any" },
];

export default function TaxConfigurationPage() {
  const user = getCurrentUser();

  const [taxes,      setTaxes]      = useState<TaxConfiguration[]>([]);
  const [showForm,   setShowForm]   = useState(true);
  const [loading,    setLoading]    = useState(false);
  const [editingId,  setEditingId]  = useState("");
  const [form,       setForm]       = useState({ taxType: "", taxCode: "", taxRate: "", description: "" });
  const [hint,       setHint]       = useState("");

  const h = (json = false): Record<string, string> => ({
    "x-user-role":  user?.role      || "",
    "x-user-id":    user?.id        || "",
    "x-company-id": user?.companyId || "",
    ...(json ? { "Content-Type": "application/json" } : {}),
  });

  useEffect(() => { fetchTaxes(); }, []);

  async function fetchTaxes() {
    try {
      const res  = await fetch("/api/tax-configuration", { headers: h() });
      const data = await res.json();
      setTaxes(Array.isArray(data) ? data : []);
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url    = editingId ? `/api/tax-configuration?id=${editingId}` : "/api/tax-configuration";
      const method = editingId ? "PUT" : "POST";
      const res    = await fetch(url, {
        method, headers: h(true),
        body: JSON.stringify({ id: editingId, ...form, taxRate: parseFloat(form.taxRate) || 0 }),
      });
      if (res.ok) {
        toast.success(editingId ? "Tax updated!" : "Tax added!");
        setForm({ taxType: "", taxCode: "", taxRate: "", description: "" });
        setEditingId(""); setHint(""); setShowForm(false);
        fetchTaxes();
      } else toast.error("Failed to save");
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  }

  function handleEdit(t: TaxConfiguration) {
    setForm({ taxType: t.taxType, taxCode: t.taxCode, taxRate: t.taxRate.toString(), description: t.description || "" });
    const found = TAX_TYPES.find(x => x.value === t.taxType);
    setHint(found?.regions || "");
    setEditingId(t.id); setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!await confirmToast("Delete this tax configuration?")) return;
    const res = await fetch(`/api/tax-configuration?id=${id}`, { method: "DELETE", headers: h() });
    if (res.ok) { toast.success("Deleted!"); fetchTaxes(); }
    else toast.error("Delete failed");
  }

  function handleCancel() {
    setForm({ taxType: "", taxCode: "", taxRate: "", description: "" });
    setEditingId(""); setHint(""); setShowForm(false);
  }

  // Style helpers
  const inp: React.CSSProperties  = { width: "100%", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties  = { fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 5 };
  const panel: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14 };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 920 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-.3px" }}>Tax Configuration</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Configure tax rates for invoicing, purchases, and compliance</p>
        </div>
        <button onClick={() => { setShowForm(f => !f); if (showForm) handleCancel(); }}
          style={{ padding: "8px 18px", borderRadius: 9, background: showForm ? "var(--panel-bg)" : accent, border: showForm ? "1px solid var(--border)" : "none", color: showForm ? "var(--text-muted)" : "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>
          {showForm ? "Show List" : "+ New Tax"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ ...panel, padding: 22, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 18 }}>
            {editingId ? "Edit Tax Configuration" : "New Tax Configuration"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            {/* Tax Type */}
            <div style={{ gridColumn: "1 / 3" }}>
              <label style={lbl}>Tax Type *</label>
              <select required value={form.taxType} style={inp}
                onChange={e => {
                  const found = TAX_TYPES.find(t => t.value === e.target.value);
                  setHint(found?.regions || "");
                  setForm(f => ({ ...f, taxType: e.target.value }));
                }}>
                <option value="">— Select Tax Type —</option>
                {TAX_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {hint && (
                <div style={{ marginTop: 5, fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                  <span>🌍</span> Used in: {hint}
                </div>
              )}
            </div>

            {/* Tax Rate */}
            <div>
              <label style={lbl}>Tax Rate (%) *</label>
              <input type="number" required step="0.01" min="0" max="100" placeholder="e.g. 17" value={form.taxRate}
                onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))} style={inp} />
            </div>

            {/* Tax Code */}
            <div>
              <label style={lbl}>Tax Code *</label>
              <input type="text" required placeholder="e.g. GST17, WHT10" value={form.taxCode}
                onChange={e => setForm(f => ({ ...f, taxCode: e.target.value }))} style={inp} />
              <div style={{ marginTop: 5, fontSize: 11, color: "var(--text-muted)" }}>Short code used on invoices</div>
            </div>

            {/* Description */}
            <div style={{ gridColumn: "2 / 4" }}>
              <label style={lbl}>Description (optional)</label>
              <input type="text" placeholder="e.g. Standard GST on goods" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inp} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" disabled={loading}
              style={{ padding: "9px 24px", borderRadius: 9, background: accent, border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: ff }}>
              {loading ? "Saving…" : editingId ? "Update Tax" : "Save Tax"}
            </button>
            <button type="button" onClick={handleCancel}
              style={{ padding: "9px 20px", borderRadius: 9, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 13, cursor: "pointer", fontFamily: ff }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div style={{ ...panel, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Configured Taxes ({taxes.length})</div>
          {taxes.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No taxes configured yet</div>
          )}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Type", "Code", "Rate", "Description", "Status", "Action"].map((h, i) => (
                <th key={h} style={{ padding: "11px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i === 2 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {taxes.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "48px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🧾</div>
                  No tax configurations yet — click &ldquo;+ New Tax&rdquo; to add one
                </td>
              </tr>
            ) : taxes.map((t, idx) => {
              const typeMeta = TAX_TYPES.find(x => x.value === t.taxType);
              return (
                <tr key={t.id} style={{ borderBottom: idx < taxes.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{typeMeta?.label?.split(" — ")[0] || t.taxType}</div>
                    {typeMeta && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>🌍 {typeMeta.regions}</div>}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 6, background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.25)", color: accent, fontSize: 12, fontWeight: 700 }}>{t.taxCode}</span>
                  </td>
                  <td style={{ padding: "13px 16px", textAlign: "right", fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>{t.taxRate.toFixed(2)}%</td>
                  <td style={{ padding: "13px 16px", fontSize: 12, color: "var(--text-muted)" }}>{t.description || "—"}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: t.isActive ? "rgba(16,185,129,.1)" : "rgba(148,163,184,.1)", color: t.isActive ? "#10b981" : "#94a3b8", border: `1px solid ${t.isActive ? "rgba(16,185,129,.25)" : "rgba(148,163,184,.2)"}` }}>
                      {t.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button onClick={() => handleEdit(t)} style={{ background: "none", border: "none", color: "#818cf8", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>Edit</button>
                      <button onClick={() => handleDelete(t.id)} style={{ background: "none", border: "none", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
