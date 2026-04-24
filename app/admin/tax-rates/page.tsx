"use client";

import { useEffect, useRef, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type TaxRate = {
  id: string;
  taxCode: string;
  taxType: string;
  description?: string;
  taxRate: number;
  isActive: boolean;
  companyId: string;
};

type FormData = {
  taxType: string;
  taxCode: string;
  taxRate: string;
  description: string;
};

const TAX_TYPES = ["GST", "VAT", "INCOME_TAX", "SALES_TAX", "WITHHOLDING_TAX", "EXCISE_DUTY", "CUSTOM_DUTY", "OTHER"];
const EMPTY_FORM: FormData = { taxType: "GST", taxCode: "", taxRate: "", description: "" };

function getHeaders() {
  const u = getCurrentUser();
  return {
    "Content-Type": "application/json",
    "x-user-id": u?.id || "",
    "x-user-role": u?.role || "",
    "x-company-id": u?.companyId || "",
  };
}

export default function AdminTaxRatesPage() {
  const [items, setItems] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<TaxRate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, ok = true) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/tax-configuration", { credentials: "include", headers: getHeaders(), cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load tax rates");
      setItems(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const filtered = items.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.taxCode.toLowerCase().includes(q) || t.taxType.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? t.isActive : !t.isActive);
    return matchSearch && matchStatus;
  });

  const totalTaxes = items.length;
  const activeTaxes = items.filter((t) => t.isActive).length;
  const inactiveTaxes = items.filter((t) => !t.isActive).length;
  const avgRate = items.length ? (items.reduce((s, t) => s + t.taxRate, 0) / items.length).toFixed(1) : "0";

  function openAdd() { setForm(EMPTY_FORM); setEditing(null); setFormError(""); setModal("add"); }
  function openEdit(t: TaxRate) {
    setForm({ taxType: t.taxType, taxCode: t.taxCode, taxRate: String(t.taxRate), description: t.description || "" });
    setEditing(t); setFormError(""); setModal("edit");
  }
  function closeModal() { setModal(null); setEditing(null); }
  function setField(key: keyof FormData, val: string) { setForm((p) => ({ ...p, [key]: val })); }

  async function handleSave() {
    if (!form.taxCode.trim()) { setFormError("Tax code is required."); return; }
    if (!form.taxRate || isNaN(Number(form.taxRate))) { setFormError("Valid tax rate (%) is required."); return; }
    setSaving(true); setFormError("");
    try {
      const body = {
        taxType: form.taxType,
        taxCode: form.taxCode.trim().toUpperCase(),
        taxRate: Number(form.taxRate),
        description: form.description.trim(),
        ...(editing ? { id: editing.id } : {}),
      };
      const res = await fetch("/api/tax-configuration", {
        method: editing ? "PUT" : "POST",
        credentials: "include", headers: getHeaders(), body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      closeModal(); showToast(editing ? "Tax rate updated." : "Tax rate added."); await load();
    } catch (e: unknown) { setFormError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function toggleActive(t: TaxRate) {
    setTogglingId(t.id);
    try {
      const res = await fetch("/api/tax-configuration", {
        method: "PUT", credentials: "include", headers: getHeaders(),
        body: JSON.stringify({ id: t.id, isActive: !t.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Update failed");
      showToast(t.isActive ? "Tax rate deactivated." : "Tax rate activated.");
      await load();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Update failed", false); }
    finally { setTogglingId(null); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tax-configuration?id=${confirmDelete.id}`, {
        method: "DELETE", credentials: "include", headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      setConfirmDelete(null); showToast("Tax rate deleted."); await load();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Delete failed", false); setConfirmDelete(null); }
    finally { setDeleting(false); }
  }

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "var(--text)", paddingBottom: 48 }}>
      <style>{pageStyles}</style>

      {toast ? <div className={`bp-toast${toast.ok ? "" : " bp-toast--err"}`}>{toast.msg}</div> : null}

      <div className="bp-header">
        <div>
          <h1 className="bp-title">Tax Rates</h1>
          <p className="bp-subtitle">Configure tax profiles and rules applied to invoices across your workspace.</p>
        </div>
        <button type="button" className="bp-primary-btn" onClick={openAdd}>
          <PlusIcon /> Add Tax Rate
        </button>
      </div>

      <div className="bp-stats">
        <StatCard label="Total Configured" value={loading ? "—" : totalTaxes} color="#8b5cf6" />
        <StatCard label="Active" value={loading ? "—" : activeTaxes} color="#22c55e" />
        <StatCard label="Inactive" value={loading ? "—" : inactiveTaxes} color="#f87171" />
        <StatCard label="Average Rate" value={loading ? "—" : `${avgRate}%`} color="#f59e0b" />
      </div>

      <div className="bp-toolbar">
        <div className="bp-search-wrap">
          <SearchIcon />
          <input className="bp-search" placeholder="Search by code, type or description…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="bp-filter-group">
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((f) => (
            <button key={f} type="button" className={`bp-filter-btn${statusFilter === f ? " active" : ""}`} onClick={() => setStatusFilter(f)}>
              {f === "ALL" ? "All" : f === "ACTIVE" ? "Active" : "Inactive"}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="bp-error">{error}</div> : null}

      <div className="bp-card">
        <div className="bp-table-wrap">
          <table className="bp-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Description</th>
                <th>Rate (%)</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="bp-state-cell">Loading tax rates…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="bp-state-cell">
                  <div className="bp-empty-title">{search || statusFilter !== "ALL" ? "No tax rates match your filter." : "No tax rates configured."}</div>
                  <div className="bp-empty-hint">Add your first tax rate using the button above.</div>
                </td></tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="bp-row">
                    <td><span className="bp-code">{t.taxCode}</span></td>
                    <td><span className="bp-type-badge">{t.taxType}</span></td>
                    <td className="bp-desc">{t.description || <span className="bp-muted">—</span>}</td>
                    <td><span className="bp-rate-val">{t.taxRate}%</span></td>
                    <td>
                      <button
                        type="button"
                        className={`bp-toggle${t.isActive ? " bp-toggle--on" : ""}`}
                        disabled={togglingId === t.id}
                        onClick={() => void toggleActive(t)}
                        title={t.isActive ? "Click to deactivate" : "Click to activate"}
                      >
                        <span className="bp-toggle-thumb" />
                        <span className="bp-toggle-label">{togglingId === t.id ? "…" : t.isActive ? "Active" : "Inactive"}</span>
                      </button>
                    </td>
                    <td>
                      <div className="bp-actions">
                        <button type="button" className="bp-icon-btn" title="Edit" onClick={() => openEdit(t)}><EditIcon /></button>
                        <button type="button" className="bp-icon-btn bp-icon-btn--danger" title="Delete" onClick={() => setConfirmDelete(t)}><TrashIcon /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="bp-table-footer">Showing {filtered.length} of {items.length} tax rates</div>
        )}
      </div>

      {modal ? (
        <div className="bp-overlay" onClick={closeModal}>
          <div className="bp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bp-modal-header">
              <h2>{modal === "add" ? "Add Tax Rate" : "Edit Tax Rate"}</h2>
              <button type="button" className="bp-close-btn" onClick={closeModal}>✕</button>
            </div>
            <div className="bp-modal-body">
              {formError ? <div className="bp-form-error">{formError}</div> : null}
              <div className="bp-field-grid">
                <div className="bp-field">
                  <label className="bp-label">Tax Type</label>
                  <select className="bp-input" value={form.taxType} onChange={(e) => setField("taxType", e.target.value)}>
                    {TAX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="bp-field">
                  <label className="bp-label">Tax Code *</label>
                  <input className="bp-input" value={form.taxCode} onChange={(e) => setField("taxCode", e.target.value)} placeholder="e.g. GST-17" />
                </div>
                <div className="bp-field">
                  <label className="bp-label">Rate (%) *</label>
                  <input className="bp-input" type="number" min="0" max="100" step="0.01" value={form.taxRate} onChange={(e) => setField("taxRate", e.target.value)} placeholder="e.g. 17" />
                </div>
                <div className="bp-field bp-field--full">
                  <label className="bp-label">Description</label>
                  <input className="bp-input" value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Optional description" />
                </div>
              </div>
            </div>
            <div className="bp-modal-footer">
              <button type="button" className="bp-cancel-btn" onClick={closeModal}>Cancel</button>
              <button type="button" className="bp-primary-btn" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : modal === "add" ? "Add Tax Rate" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDelete ? (
        <div className="bp-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="bp-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bp-confirm-icon"><TrashIcon /></div>
            <h2 className="bp-confirm-title">Delete Tax Rate?</h2>
            <p className="bp-confirm-text"><strong>{confirmDelete.taxCode}</strong> ({confirmDelete.taxType} — {confirmDelete.taxRate}%) will be permanently removed. Invoices referencing this tax may be affected.</p>
            <div className="bp-confirm-actions">
              <button type="button" className="bp-cancel-btn" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button type="button" className="bp-danger-btn" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting…" : "Yes, Delete"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bp-stat-card">
      <div className="bp-stat-label">{label}</div>
      <div className="bp-stat-value" style={{ color }}>{value}</div>
    </div>
  );
}

function PlusIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function SearchIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function EditIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TrashIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>; }

const pageStyles = `
.bp-toast{position:fixed;top:24px;right:24px;z-index:999;padding:12px 18px;border-radius:14px;font-size:13px;font-weight:700;background:#22c55e;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.22);animation:bpToastIn .2s ease;}
.bp-toast--err{background:#f43f5e;}
@keyframes bpToastIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.bp-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:22px;}
.bp-title{margin:0 0 6px;font-size:24px;font-weight:800;color:var(--text);}
.bp-subtitle{margin:0;font-size:13px;color:var(--text-muted);}
.bp-primary-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 18px;border-radius:13px;border:none;cursor:pointer;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:#fff;font:inherit;font-size:13px;font-weight:700;box-shadow:0 6px 20px rgba(109,40,217,.28);transition:opacity .14s;white-space:nowrap;flex-shrink:0;}
.bp-primary-btn:disabled{opacity:.6;cursor:not-allowed;}
.bp-primary-btn:hover:not(:disabled){opacity:.88;}
.bp-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px;}
.bp-stat-card{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:16px 18px;}
.bp-stat-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;}
.bp-stat-value{font-size:28px;font-weight:800;}
.bp-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px;}
.bp-search-wrap{flex:1;min-width:220px;position:relative;display:flex;align-items:center;}
.bp-search-wrap svg{position:absolute;left:12px;color:var(--text-muted);}
.bp-search{width:100%;padding:10px 14px 10px 36px;border-radius:13px;border:1px solid var(--border);background:var(--panel);color:var(--text);font:inherit;font-size:13px;outline:none;}
.bp-search:focus{border-color:#8b5cf6;}
.bp-filter-group{display:flex;gap:4px;background:var(--panel);border:1px solid var(--border);border-radius:13px;padding:4px;}
.bp-filter-btn{padding:7px 14px;border-radius:10px;border:none;background:transparent;color:var(--text-muted);font:inherit;font-size:12px;font-weight:700;cursor:pointer;transition:all .14s;}
.bp-filter-btn.active{background:linear-gradient(135deg,rgba(124,58,237,.35),rgba(90,61,248,.18));color:#c4b5fd;}
.bp-error{padding:14px 16px;border-radius:14px;background:rgba(244,63,94,.1);color:#f87171;font-size:13px;margin-bottom:14px;}
.bp-card{background:var(--panel);border:1px solid var(--border);border-radius:20px;overflow:hidden;}
.bp-table-wrap{overflow-x:auto;}
.bp-table{width:100%;border-collapse:collapse;min-width:680px;}
.bp-table th{padding:13px 14px;text-align:left;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border);white-space:nowrap;}
.bp-table td{padding:14px 14px;font-size:13px;color:var(--text-soft);border-bottom:1px solid var(--border);}
.bp-row:last-child td{border-bottom:none;}
.bp-row:hover{background:var(--bg-soft);}
.bp-state-cell{padding:48px 20px;text-align:center;color:var(--text-muted);font-size:13px;}
.bp-empty-title{font-size:15px;font-weight:700;color:var(--text-soft);margin-bottom:6px;}
.bp-empty-hint{font-size:12px;color:var(--text-muted);}
.bp-code{font-family:monospace;font-size:12px;font-weight:700;color:#8b5cf6;background:rgba(139,92,246,.12);padding:3px 8px;border-radius:7px;}
.bp-type-badge{display:inline-flex;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;background:rgba(79,124,255,.14);color:#93c5fd;}
.bp-rate-val{font-size:15px;font-weight:800;color:var(--text);}
.bp-desc{max-width:280px;color:var(--text-muted);}
.bp-muted{color:var(--text-muted);}
/* Toggle switch */
.bp-toggle{
  display:inline-flex;align-items:center;gap:8px;
  padding:5px 10px 5px 5px;border-radius:999px;border:1px solid var(--border);
  background:transparent;cursor:pointer;transition:all .18s;
}
.bp-toggle:disabled{opacity:.6;cursor:not-allowed;}
.bp-toggle-thumb{
  width:18px;height:18px;border-radius:50%;background:rgba(148,163,184,.4);
  transition:background .18s;flex-shrink:0;
}
.bp-toggle--on{border-color:rgba(34,197,94,.3);}
.bp-toggle--on .bp-toggle-thumb{background:#22c55e;}
.bp-toggle-label{font-size:12px;font-weight:700;color:var(--text-muted);}
.bp-toggle--on .bp-toggle-label{color:#4ade80;}
.bp-actions{display:flex;gap:6px;justify-content:flex-end;}
.bp-icon-btn{width:32px;height:32px;border-radius:9px;border:1px solid var(--border);background:transparent;color:var(--text-muted);cursor:pointer;display:grid;place-items:center;transition:all .12s;}
.bp-icon-btn:hover{background:var(--bg-soft);color:var(--text);border-color:var(--border-strong);}
.bp-icon-btn--danger:hover{background:rgba(244,63,94,.12);color:#f87171;border-color:rgba(244,63,94,.24);}
.bp-table-footer{padding:12px 14px;font-size:12px;color:var(--text-muted);border-top:1px solid var(--border);}
.bp-overlay{position:fixed;inset:0;z-index:200;background:rgba(6,10,20,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;}
.bp-modal{width:100%;max-width:520px;max-height:92vh;overflow-y:auto;border-radius:22px;border:1px solid var(--border-strong);background:linear-gradient(180deg,var(--panel),var(--panel-2));box-shadow:var(--card-shadow);}
.bp-modal-header{display:flex;align-items:center;justify-content:space-between;padding:20px 22px 0;}
.bp-modal-header h2{margin:0;font-size:18px;font-weight:800;color:var(--text);}
.bp-close-btn{width:34px;height:34px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--text-muted);cursor:pointer;display:grid;place-items:center;font-size:16px;}
.bp-modal-body{padding:18px 22px;}
.bp-form-error{padding:10px 14px;border-radius:12px;background:rgba(244,63,94,.1);color:#f87171;font-size:13px;margin-bottom:14px;}
.bp-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.bp-field{display:flex;flex-direction:column;gap:6px;}
.bp-field--full{grid-column:1/-1;}
.bp-label{font-size:12px;font-weight:700;color:var(--text-soft);letter-spacing:.03em;}
.bp-input{padding:10px 12px;border-radius:11px;border:1px solid var(--border);background:var(--bg-soft,rgba(255,255,255,.03));color:var(--text);font:inherit;font-size:13px;outline:none;transition:border-color .14s;}
.bp-input:focus{border-color:#8b5cf6;}
.bp-modal-footer{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:16px 22px 20px;border-top:1px solid var(--border);}
.bp-cancel-btn{padding:9px 16px;border-radius:12px;border:1px solid var(--border);background:transparent;color:var(--text-soft);font:inherit;font-size:13px;font-weight:700;cursor:pointer;}
.bp-cancel-btn:hover{background:var(--bg-soft);}
.bp-confirm-modal{width:100%;max-width:420px;border-radius:22px;border:1px solid var(--border-strong);background:linear-gradient(180deg,var(--panel),var(--panel-2));box-shadow:var(--card-shadow);padding:28px 24px;text-align:center;}
.bp-confirm-icon{width:52px;height:52px;border-radius:16px;background:rgba(244,63,94,.12);display:grid;place-items:center;margin:0 auto 14px;color:#f87171;}
.bp-confirm-icon svg{width:22px;height:22px;}
.bp-confirm-title{margin:0 0 10px;font-size:18px;font-weight:800;color:var(--text);}
.bp-confirm-text{margin:0 0 22px;font-size:13px;color:var(--text-muted);line-height:1.6;}
.bp-confirm-actions{display:flex;gap:10px;justify-content:center;}
.bp-danger-btn{padding:9px 18px;border-radius:12px;border:none;cursor:pointer;background:#f43f5e;color:#fff;font:inherit;font-size:13px;font-weight:700;}
.bp-danger-btn:disabled{opacity:.6;cursor:not-allowed;}
.bp-danger-btn:hover:not(:disabled){background:#e11d48;}
@media(max-width:768px){.bp-stats{grid-template-columns:repeat(2,1fr);}.bp-field-grid{grid-template-columns:1fr;}.bp-field--full{grid-column:1;}}
@media(max-width:480px){.bp-stats{grid-template-columns:1fr;}.bp-toolbar{flex-direction:column;align-items:stretch;}}
`;
