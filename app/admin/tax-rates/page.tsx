"use client";

import { useEffect, useRef, useState } from "react";

type TaxPreset = {
  id: string;
  country: string;
  countryCode: string;
  region: string | null;
  taxType: string;
  name: string;
  code: string;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
  description: string | null;
  createdAt: string;
};

type Stats = { total: number; active: number; countries: number; avgRate: number };

type FormData = {
  country: string;
  countryCode: string;
  region: string;
  taxType: string;
  name: string;
  code: string;
  rate: string;
  description: string;
  isDefault: boolean;
  isActive: boolean;
};

const TAX_TYPES = ["GST", "VAT", "SALES_TAX", "INCOME_TAX", "WHT", "EXCISE", "CUSTOMS", "OTHER"];
const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  GST: { bg: "rgba(34,197,94,.14)", color: "#4ade80" },
  VAT: { bg: "rgba(79,124,255,.14)", color: "#93c5fd" },
  SALES_TAX: { bg: "rgba(245,158,11,.14)", color: "#fbbf24" },
  INCOME_TAX: { bg: "rgba(139,92,246,.14)", color: "#c4b5fd" },
  WHT: { bg: "rgba(248,113,113,.14)", color: "#f87171" },
  EXCISE: { bg: "rgba(6,182,212,.14)", color: "#67e8f9" },
  CUSTOMS: { bg: "rgba(236,72,153,.14)", color: "#f9a8d4" },
  OTHER: { bg: "rgba(148,163,184,.12)", color: "#94a3b8" },
};

const EMPTY_FORM: FormData = {
  country: "", countryCode: "", region: "", taxType: "GST",
  name: "", code: "", rate: "", description: "", isDefault: false, isActive: true,
};

export default function AdminTaxPresetsPage() {
  const [presets, setPresets] = useState<TaxPreset[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, countries: 0, avgRate: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<TaxPreset | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<TaxPreset | null>(null);
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
      const res = await fetch("/api/admin/tax-presets", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setPresets(data.presets || []);
      setStats(data.stats || { total: 0, active: 0, countries: 0, avgRate: 0 });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const allTypes = ["ALL", ...Array.from(new Set(presets.map((p) => p.taxType))).sort()];
  const filtered = presets.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.country.toLowerCase().includes(q) || p.countryCode.toLowerCase().includes(q);
    const matchType = typeFilter === "ALL" || p.taxType === typeFilter;
    return matchSearch && matchType;
  });

  function openAdd() { setForm(EMPTY_FORM); setEditing(null); setFormError(""); setModal("add"); }
  function openEdit(p: TaxPreset) {
    setForm({ country: p.country, countryCode: p.countryCode, region: p.region || "", taxType: p.taxType, name: p.name, code: p.code, rate: String(p.rate), description: p.description || "", isDefault: p.isDefault, isActive: p.isActive });
    setEditing(p); setFormError(""); setModal("edit");
  }
  function closeModal() { setModal(null); setEditing(null); }
  function setField<K extends keyof FormData>(k: K, v: FormData[K]) { setForm((prev) => ({ ...prev, [k]: v })); }

  async function handleSave() {
    if (!form.country.trim()) { setFormError("Country is required."); return; }
    if (!form.countryCode.trim()) { setFormError("Country code is required."); return; }
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (!form.code.trim()) { setFormError("Tax code is required."); return; }
    if (!form.rate || isNaN(Number(form.rate))) { setFormError("Valid rate (%) is required."); return; }
    setSaving(true); setFormError("");
    try {
      const body = { country: form.country.trim(), countryCode: form.countryCode.trim().toUpperCase(), region: form.region.trim() || null, taxType: form.taxType, name: form.name.trim(), code: form.code.trim().toUpperCase(), rate: Number(form.rate), description: form.description.trim() || null, isDefault: form.isDefault, isActive: form.isActive };
      const url = editing ? `/api/admin/tax-presets?id=${editing.id}` : "/api/admin/tax-presets";
      const res = await fetch(url, { method: editing ? "PUT" : "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      closeModal(); showToast(editing ? "Tax preset updated." : "Tax preset created."); await load();
    } catch (e: unknown) { setFormError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function toggleActive(p: TaxPreset) {
    setTogglingId(p.id);
    try {
      const res = await fetch(`/api/admin/tax-presets?id=${p.id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !p.isActive }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Update failed");
      showToast(p.isActive ? "Preset deactivated." : "Preset activated.");
      await load();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Update failed", false); }
    finally { setTogglingId(null); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/tax-presets?id=${confirmDelete.id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      setConfirmDelete(null); showToast("Tax preset deleted."); await load();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Delete failed", false); setConfirmDelete(null); }
    finally { setDeleting(false); }
  }

  const typeStyle = (t: string) => TYPE_COLORS[t] || TYPE_COLORS.OTHER;

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "var(--text)", paddingBottom: 48, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
      <style>{pageStyles}</style>

      {toast ? <div className={`tx-toast${toast.ok ? "" : " tx-toast--err"}`}>{toast.msg}</div> : null}

      <div className="tx-header">
        <div>
          <h1 className="tx-title">Tax Presets</h1>
          <p className="tx-subtitle">Platform-wide default tax templates. Companies can adopt these when setting up their tax configuration.</p>
        </div>
        <button type="button" className="tx-primary-btn" onClick={openAdd}>
          <PlusIcon /> Add Preset
        </button>
      </div>

      <div className="tx-stats">
        <div className="tx-stat"><div className="tx-stat-label">Total Presets</div><div className="tx-stat-val" style={{ color: "#8b5cf6" }}>{loading ? "—" : stats.total}</div></div>
        <div className="tx-stat"><div className="tx-stat-label">Active</div><div className="tx-stat-val" style={{ color: "#22c55e" }}>{loading ? "—" : stats.active}</div></div>
        <div className="tx-stat"><div className="tx-stat-label">Countries</div><div className="tx-stat-val" style={{ color: "#4f7cff" }}>{loading ? "—" : stats.countries}</div></div>
        <div className="tx-stat"><div className="tx-stat-label">Avg Rate</div><div className="tx-stat-val" style={{ color: "#f59e0b" }}>{loading ? "—" : `${stats.avgRate}%`}</div></div>
      </div>

      <div className="tx-toolbar">
        <div className="tx-search-wrap">
          <SearchIcon />
          <input className="tx-search" placeholder="Search by name, code or country…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="tx-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          {allTypes.map((t) => <option key={t} value={t}>{t === "ALL" ? "All Types" : t}</option>)}
        </select>
      </div>

      {error ? <div className="tx-error">{error}</div> : null}

      <div className="tx-card">
        <div className="tx-table-wrap">
          <table className="tx-table">
            <thead>
              <tr>
                <th>Country</th>
                <th>Name</th>
                <th>Code</th>
                <th>Type</th>
                <th>Rate</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="tx-state-cell">Loading tax presets…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="tx-state-cell">
                  <div className="tx-empty-title">{search || typeFilter !== "ALL" ? "No presets match your filter." : "No tax presets found."}</div>
                  <div className="tx-empty-hint">Click &ldquo;Add Preset&rdquo; to create the first one.</div>
                </td></tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="tx-row">
                    <td>
                      <div className="tx-country-cell">
                        <span className="tx-cc-badge">{p.countryCode}</span>
                        <span className="tx-country-name">{p.country}</span>
                      </div>
                    </td>
                    <td>
                      <div className="tx-name">{p.name}</div>
                      {p.description && <div className="tx-desc">{p.description}</div>}
                    </td>
                    <td><span className="tx-code">{p.code}</span></td>
                    <td><span className="tx-type-badge" style={{ background: typeStyle(p.taxType).bg, color: typeStyle(p.taxType).color }}>{p.taxType}</span></td>
                    <td><span className="tx-rate">{p.rate}%</span></td>
                    <td>
                      <button
                        type="button"
                        className={`tx-toggle${p.isActive ? " tx-toggle--on" : ""}`}
                        disabled={togglingId === p.id}
                        onClick={() => void toggleActive(p)}
                      >
                        <span className="tx-toggle-thumb" />
                        <span className="tx-toggle-label">{togglingId === p.id ? "…" : p.isActive ? "Active" : "Inactive"}</span>
                      </button>
                    </td>
                    <td>
                      <div className="tx-actions">
                        <button type="button" className="tx-icon-btn" title="Edit" onClick={() => openEdit(p)}><EditIcon /></button>
                        <button type="button" className="tx-icon-btn tx-icon-btn--danger" title="Delete" onClick={() => setConfirmDelete(p)}><TrashIcon /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="tx-table-footer">Showing {filtered.length} of {presets.length} presets</div>
        )}
      </div>

      {modal ? (
        <div className="tx-overlay" onClick={closeModal}>
          <div className="tx-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tx-modal-header">
              <h2>{modal === "add" ? "Add Tax Preset" : "Edit Tax Preset"}</h2>
              <button type="button" className="tx-close-btn" onClick={closeModal}>✕</button>
            </div>
            <div className="tx-modal-body">
              {formError ? <div className="tx-form-error">{formError}</div> : null}
              <div className="tx-field-grid">
                <div className="tx-field">
                  <label className="tx-label">Country *</label>
                  <input className="tx-input" value={form.country} onChange={(e) => setField("country", e.target.value)} placeholder="e.g. Pakistan" />
                </div>
                <div className="tx-field">
                  <label className="tx-label">Country Code *</label>
                  <input className="tx-input" value={form.countryCode} onChange={(e) => setField("countryCode", e.target.value)} placeholder="e.g. PK" maxLength={3} />
                </div>
                <div className="tx-field">
                  <label className="tx-label">Tax Type</label>
                  <select className="tx-input" value={form.taxType} onChange={(e) => setField("taxType", e.target.value)}>
                    {TAX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="tx-field">
                  <label className="tx-label">Rate (%) *</label>
                  <input className="tx-input" type="number" min="0" max="100" step="0.01" value={form.rate} onChange={(e) => setField("rate", e.target.value)} placeholder="e.g. 17" />
                </div>
                <div className="tx-field tx-field--full">
                  <label className="tx-label">Preset Name *</label>
                  <input className="tx-input" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Pakistan GST" />
                </div>
                <div className="tx-field tx-field--full">
                  <label className="tx-label">Unique Code *</label>
                  <input className="tx-input" value={form.code} onChange={(e) => setField("code", e.target.value)} placeholder="e.g. PK-GST-17" />
                </div>
                <div className="tx-field tx-field--full">
                  <label className="tx-label">Description</label>
                  <input className="tx-input" value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Optional description" />
                </div>
                <div className="tx-field">
                  <label className="tx-label">Region / State</label>
                  <input className="tx-input" value={form.region} onChange={(e) => setField("region", e.target.value)} placeholder="Optional" />
                </div>
                <div className="tx-field">
                  <label className="tx-label">Status</label>
                  <button type="button" className={`tx-toggle tx-toggle--lg${form.isActive ? " tx-toggle--on" : ""}`} onClick={() => setField("isActive", !form.isActive)}>
                    <span className="tx-toggle-thumb" />
                    <span className="tx-toggle-label">{form.isActive ? "Active" : "Inactive"}</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="tx-modal-footer">
              <button type="button" className="tx-cancel-btn" onClick={closeModal}>Cancel</button>
              <button type="button" className="tx-primary-btn" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : modal === "add" ? "Create Preset" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDelete ? (
        <div className="tx-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="tx-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tx-confirm-icon"><TrashIcon /></div>
            <h2 className="tx-confirm-title">Delete Tax Preset?</h2>
            <p className="tx-confirm-text"><strong>{confirmDelete.name}</strong> ({confirmDelete.code} — {confirmDelete.rate}%) will be permanently deleted.</p>
            <div className="tx-confirm-actions">
              <button type="button" className="tx-cancel-btn" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button type="button" className="tx-danger-btn" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting…" : "Yes, Delete"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PlusIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function SearchIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function EditIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TrashIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>; }

const pageStyles = `
.tx-toast{position:fixed;top:24px;right:24px;z-index:999;padding:12px 18px;border-radius:14px;font-size:13px;font-weight:700;background:#22c55e;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.22);animation:txToastIn .2s ease;}
.tx-toast--err{background:#f43f5e;}
@keyframes txToastIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.tx-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:22px;}
.tx-title{margin:0 0 6px;font-size:24px;font-weight:800;color:var(--text);}
.tx-subtitle{margin:0;font-size:13px;color:var(--text-muted);}
.tx-primary-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 18px;border-radius:13px;border:none;cursor:pointer;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:#fff;font:inherit;font-size:13px;font-weight:700;box-shadow:0 6px 20px rgba(109,40,217,.28);transition:opacity .14s;white-space:nowrap;flex-shrink:0;}
.tx-primary-btn:disabled{opacity:.6;cursor:not-allowed;}
.tx-primary-btn:hover:not(:disabled){opacity:.88;}
.tx-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px;}
.tx-stat{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:16px 18px;}
.tx-stat-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;}
.tx-stat-val{font-size:28px;font-weight:800;}
.tx-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px;}
.tx-search-wrap{flex:1;min-width:200px;position:relative;display:flex;align-items:center;}
.tx-search-wrap svg{position:absolute;left:12px;color:var(--text-muted);}
.tx-search{width:100%;padding:10px 14px 10px 36px;border-radius:13px;border:1px solid var(--border);background:var(--panel);color:var(--text);font:inherit;font-size:13px;outline:none;}
.tx-search:focus{border-color:#8b5cf6;}
.tx-select{padding:10px 14px;border-radius:13px;border:1px solid var(--border);background:var(--panel);color:var(--text);font:inherit;font-size:13px;cursor:pointer;}
.tx-error{padding:14px 16px;border-radius:14px;background:rgba(244,63,94,.1);color:#f87171;font-size:13px;margin-bottom:14px;}
.tx-card{background:var(--panel);border:1px solid var(--border);border-radius:20px;overflow:hidden;}
.tx-table-wrap{overflow-x:auto;}
.tx-table{width:100%;border-collapse:collapse;min-width:700px;}
.tx-table th{padding:12px 14px;text-align:left;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border);white-space:nowrap;}
.tx-table td{padding:13px 14px;font-size:13px;color:var(--text-soft);border-bottom:1px solid var(--border);}
.tx-row:last-child td{border-bottom:none;}
.tx-row:hover{background:var(--bg-soft);}
.tx-state-cell{padding:48px 20px;text-align:center;color:var(--text-muted);font-size:13px;}
.tx-empty-title{font-size:15px;font-weight:700;color:var(--text-soft);margin-bottom:6px;}
.tx-empty-hint{font-size:12px;color:var(--text-muted);}
.tx-country-cell{display:flex;align-items:center;gap:8px;}
.tx-cc-badge{display:inline-flex;align-items:center;padding:3px 8px;border-radius:7px;font-size:11px;font-weight:800;background:rgba(139,92,246,.12);color:#c4b5fd;font-family:monospace;}
.tx-country-name{font-size:12px;color:var(--text-muted);}
.tx-name{font-weight:700;color:var(--text);font-size:13px;}
.tx-desc{font-size:11px;color:var(--text-muted);margin-top:2px;max-width:220px;}
.tx-code{font-family:monospace;font-size:12px;font-weight:700;color:#8b5cf6;background:rgba(139,92,246,.12);padding:3px 8px;border-radius:7px;}
.tx-type-badge{display:inline-flex;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;}
.tx-rate{font-size:15px;font-weight:800;color:var(--text);}
.tx-toggle{display:inline-flex;align-items:center;gap:7px;padding:5px 10px 5px 5px;border-radius:999px;border:1px solid var(--border);background:transparent;cursor:pointer;transition:all .18s;}
.tx-toggle--lg{padding:8px 14px 8px 8px;}
.tx-toggle:disabled{opacity:.6;cursor:not-allowed;}
.tx-toggle-thumb{width:16px;height:16px;border-radius:50%;background:rgba(148,163,184,.4);transition:background .18s;flex-shrink:0;}
.tx-toggle--on{border-color:rgba(34,197,94,.3);}
.tx-toggle--on .tx-toggle-thumb{background:#22c55e;}
.tx-toggle-label{font-size:12px;font-weight:700;color:var(--text-muted);}
.tx-toggle--on .tx-toggle-label{color:#4ade80;}
.tx-actions{display:flex;gap:6px;justify-content:flex-end;}
.tx-icon-btn{width:32px;height:32px;border-radius:9px;border:1px solid var(--border);background:transparent;color:var(--text-muted);cursor:pointer;display:grid;place-items:center;transition:all .12s;}
.tx-icon-btn:hover{background:var(--bg-soft);color:var(--text);}
.tx-icon-btn--danger:hover{background:rgba(244,63,94,.12);color:#f87171;border-color:rgba(244,63,94,.24);}
.tx-table-footer{padding:12px 14px;font-size:12px;color:var(--text-muted);border-top:1px solid var(--border);}
.tx-overlay{position:fixed;inset:0;z-index:200;background:rgba(6,10,20,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;}
.tx-modal{width:100%;max-width:540px;max-height:92vh;overflow-y:auto;border-radius:22px;border:1px solid var(--border-strong);background:linear-gradient(180deg,var(--panel),var(--panel-2,var(--panel)));box-shadow:var(--card-shadow);}
.tx-modal-header{display:flex;align-items:center;justify-content:space-between;padding:20px 22px 0;}
.tx-modal-header h2{margin:0;font-size:18px;font-weight:800;color:var(--text);}
.tx-close-btn{width:34px;height:34px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--text-muted);cursor:pointer;display:grid;place-items:center;font-size:16px;}
.tx-modal-body{padding:18px 22px;}
.tx-form-error{padding:10px 14px;border-radius:12px;background:rgba(244,63,94,.1);color:#f87171;font-size:13px;margin-bottom:14px;}
.tx-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.tx-field{display:flex;flex-direction:column;gap:6px;}
.tx-field--full{grid-column:1/-1;}
.tx-label{font-size:12px;font-weight:700;color:var(--text-soft);letter-spacing:.03em;}
.tx-input{padding:10px 12px;border-radius:11px;border:1px solid var(--border);background:var(--bg-soft,rgba(255,255,255,.03));color:var(--text);font:inherit;font-size:13px;outline:none;transition:border-color .14s;}
.tx-input:focus{border-color:#8b5cf6;}
.tx-modal-footer{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:16px 22px 20px;border-top:1px solid var(--border);}
.tx-cancel-btn{padding:9px 16px;border-radius:12px;border:1px solid var(--border);background:transparent;color:var(--text-soft);font:inherit;font-size:13px;font-weight:700;cursor:pointer;}
.tx-cancel-btn:hover{background:var(--bg-soft);}
.tx-confirm-modal{width:100%;max-width:420px;border-radius:22px;border:1px solid var(--border-strong);background:linear-gradient(180deg,var(--panel),var(--panel-2,var(--panel)));box-shadow:var(--card-shadow);padding:28px 24px;text-align:center;}
.tx-confirm-icon{width:50px;height:50px;border-radius:16px;background:rgba(244,63,94,.12);display:grid;place-items:center;margin:0 auto 14px;color:#f87171;}
.tx-confirm-icon svg{width:22px;height:22px;}
.tx-confirm-title{margin:0 0 10px;font-size:18px;font-weight:800;color:var(--text);}
.tx-confirm-text{margin:0 0 22px;font-size:13px;color:var(--text-muted);line-height:1.6;}
.tx-confirm-actions{display:flex;gap:10px;justify-content:center;}
.tx-danger-btn{padding:9px 18px;border-radius:12px;border:none;cursor:pointer;background:#f43f5e;color:#fff;font:inherit;font-size:13px;font-weight:700;}
.tx-danger-btn:disabled{opacity:.6;cursor:not-allowed;}
.tx-danger-btn:hover:not(:disabled){background:#e11d48;}
@media(max-width:768px){
  .tx-stats{grid-template-columns:repeat(2,1fr);}
  .tx-field-grid{grid-template-columns:1fr;}
  .tx-field--full{grid-column:1;}
}
@media(max-width:480px){
  .tx-stats{grid-template-columns:1fr 1fr;}
  .tx-toolbar{flex-direction:column;align-items:stretch;}
}
`;
