"use client";

import { useEffect, useRef, useState } from "react";

type Currency = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  flag: string | null;
  isEnabled: boolean;
  isDefault: boolean;
  rateSource: string;
  exchangeRate: number;
  createdAt: string;
};

type Stats = { total: number; enabled: number; disabled: number; defaultCode: string };

type FormData = {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  exchangeRate: string;
  rateSource: string;
  isEnabled: boolean;
  isDefault: boolean;
};

const RATE_SOURCES = ["MANUAL", "OPEN_EXCHANGE", "ECB", "FIXER"];
const EMPTY_FORM: FormData = { code: "", name: "", symbol: "", flag: "", exchangeRate: "1", rateSource: "MANUAL", isEnabled: true, isDefault: false };

export default function AdminPlatformCurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, enabled: 0, disabled: 0, defaultCode: "USD" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Currency | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Currency | null>(null);
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
      const res = await fetch("/api/admin/platform-currencies", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setCurrencies(data.currencies || []);
      setStats(data.stats || { total: 0, enabled: 0, disabled: 0, defaultCode: "USD" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const filtered = currencies.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.symbol.includes(q);
  });

  function openAdd() { setForm(EMPTY_FORM); setEditing(null); setFormError(""); setModal("add"); }
  function openEdit(c: Currency) {
    setForm({ code: c.code, name: c.name, symbol: c.symbol, flag: c.flag || "", exchangeRate: String(c.exchangeRate), rateSource: c.rateSource, isEnabled: c.isEnabled, isDefault: c.isDefault });
    setEditing(c); setFormError(""); setModal("edit");
  }
  function closeModal() { setModal(null); setEditing(null); }
  function setField<K extends keyof FormData>(k: K, v: FormData[K]) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSave() {
    if (!form.code.trim()) { setFormError("Currency code is required (e.g. USD)."); return; }
    if (!form.name.trim()) { setFormError("Currency name is required."); return; }
    if (!form.symbol.trim()) { setFormError("Symbol is required."); return; }
    const rate = Number(form.exchangeRate);
    if (isNaN(rate) || rate <= 0) { setFormError("Exchange rate must be a positive number."); return; }
    setSaving(true); setFormError("");
    try {
      const body = { code: form.code.trim().toUpperCase(), name: form.name.trim(), symbol: form.symbol.trim(), flag: form.flag.trim() || null, exchangeRate: rate, rateSource: form.rateSource, isEnabled: form.isEnabled, isDefault: form.isDefault };
      const url = editing ? `/api/admin/platform-currencies?id=${editing.id}` : "/api/admin/platform-currencies";
      const res = await fetch(url, { method: editing ? "PUT" : "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      closeModal(); showToast(editing ? "Currency updated." : "Currency added."); await load();
    } catch (e: unknown) { setFormError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function toggleEnabled(c: Currency) {
    setTogglingId(c.id);
    try {
      const res = await fetch(`/api/admin/platform-currencies?id=${c.id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isEnabled: !c.isEnabled }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Update failed");
      showToast(c.isEnabled ? "Currency disabled." : "Currency enabled.");
      await load();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Update failed", false); }
    finally { setTogglingId(null); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/platform-currencies?id=${confirmDelete.id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      setConfirmDelete(null); showToast("Currency deleted."); await load();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Delete failed", false); setConfirmDelete(null); }
    finally { setDeleting(false); }
  }

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "var(--text)", paddingBottom: 48, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
      <style>{pageStyles}</style>

      {toast ? <div className={`cy-toast${toast.ok ? "" : " cy-toast--err"}`}>{toast.msg}</div> : null}

      <div className="cy-header">
        <div>
          <h1 className="cy-title">Platform Currencies</h1>
          <p className="cy-subtitle">Control which currencies are available globally across all company workspaces.</p>
        </div>
        <button type="button" className="cy-primary-btn" onClick={openAdd}>
          <PlusIcon /> Add Currency
        </button>
      </div>

      <div className="cy-stats">
        <div className="cy-stat"><div className="cy-stat-label">Total</div><div className="cy-stat-val" style={{ color: "#8b5cf6" }}>{loading ? "—" : stats.total}</div></div>
        <div className="cy-stat"><div className="cy-stat-label">Enabled</div><div className="cy-stat-val" style={{ color: "#22c55e" }}>{loading ? "—" : stats.enabled}</div></div>
        <div className="cy-stat"><div className="cy-stat-label">Disabled</div><div className="cy-stat-val" style={{ color: "#f87171" }}>{loading ? "—" : stats.disabled}</div></div>
        <div className="cy-stat"><div className="cy-stat-label">Default</div><div className="cy-stat-val" style={{ color: "#f59e0b" }}>{loading ? "—" : stats.defaultCode}</div></div>
      </div>

      <div className="cy-toolbar">
        <div className="cy-search-wrap">
          <SearchIcon />
          <input className="cy-search" placeholder="Search by code, name or symbol…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {error ? <div className="cy-error">{error}</div> : null}

      <div className="cy-card">
        <div className="cy-table-wrap">
          <table className="cy-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Currency</th>
                <th>Symbol</th>
                <th>Rate</th>
                <th>Source</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="cy-state-cell">Loading currencies…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="cy-state-cell">
                  <div className="cy-empty-title">{search ? "No currencies match your search." : "No currencies found."}</div>
                  <div className="cy-empty-hint">Click &ldquo;Add Currency&rdquo; to add the first one.</div>
                </td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="cy-row">
                    <td>
                      <div className="cy-code-cell">
                        {c.flag && <span className="cy-flag">{c.flag}</span>}
                        <span className="cy-code">{c.code}</span>
                        {c.isDefault && <span className="cy-default-badge">Default</span>}
                      </div>
                    </td>
                    <td><span className="cy-name">{c.name}</span></td>
                    <td><span className="cy-symbol">{c.symbol}</span></td>
                    <td>
                      <span className={`cy-rate${c.isDefault ? " cy-rate--base" : ""}`}>
                        {c.isDefault ? "1.00 (Base)" : c.exchangeRate.toFixed(4)}
                      </span>
                    </td>
                    <td><span className="cy-source-badge">{c.rateSource}</span></td>
                    <td>
                      <button
                        type="button"
                        className={`cy-toggle${c.isEnabled ? " cy-toggle--on" : ""}`}
                        disabled={togglingId === c.id}
                        onClick={() => void toggleEnabled(c)}
                      >
                        <span className="cy-toggle-thumb" />
                        <span className="cy-toggle-label">{togglingId === c.id ? "…" : c.isEnabled ? "Enabled" : "Disabled"}</span>
                      </button>
                    </td>
                    <td>
                      <div className="cy-actions">
                        <button type="button" className="cy-icon-btn" title="Edit" onClick={() => openEdit(c)}><EditIcon /></button>
                        <button type="button" className={`cy-icon-btn cy-icon-btn--danger${c.isDefault ? " cy-icon-btn--disabled" : ""}`} title={c.isDefault ? "Cannot delete default currency" : "Delete"} onClick={() => !c.isDefault && setConfirmDelete(c)}><TrashIcon /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="cy-table-footer">Showing {filtered.length} of {currencies.length} currencies</div>
        )}
      </div>

      {modal ? (
        <div className="cy-overlay" onClick={closeModal}>
          <div className="cy-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cy-modal-header">
              <h2>{modal === "add" ? "Add Currency" : `Edit ${editing?.code}`}</h2>
              <button type="button" className="cy-close-btn" onClick={closeModal}>✕</button>
            </div>
            <div className="cy-modal-body">
              {formError ? <div className="cy-form-error">{formError}</div> : null}
              <div className="cy-field-grid">
                <div className="cy-field">
                  <label className="cy-label">Code * {modal === "edit" && <span className="cy-label-note">(read-only)</span>}</label>
                  <input className="cy-input" value={form.code} onChange={(e) => setField("code", e.target.value)} placeholder="USD" maxLength={5} disabled={modal === "edit"} style={{ opacity: modal === "edit" ? 0.6 : 1 }} />
                </div>
                <div className="cy-field">
                  <label className="cy-label">Symbol *</label>
                  <input className="cy-input" value={form.symbol} onChange={(e) => setField("symbol", e.target.value)} placeholder="$" maxLength={6} />
                </div>
                <div className="cy-field cy-field--full">
                  <label className="cy-label">Currency Name *</label>
                  <input className="cy-input" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="US Dollar" />
                </div>
                <div className="cy-field">
                  <label className="cy-label">Flag Emoji</label>
                  <input className="cy-input" value={form.flag} onChange={(e) => setField("flag", e.target.value)} placeholder="🇺🇸" maxLength={4} />
                </div>
                <div className="cy-field">
                  <label className="cy-label">Rate Source</label>
                  <select className="cy-input" value={form.rateSource} onChange={(e) => setField("rateSource", e.target.value)}>
                    {RATE_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="cy-field cy-field--full">
                  <label className="cy-label">Exchange Rate (1 base = ?)</label>
                  <input className="cy-input" type="number" min="0.0001" step="0.0001" value={form.exchangeRate} onChange={(e) => setField("exchangeRate", e.target.value)} placeholder="1.00" />
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Set to 1 and mark as default to use as the base currency.</span>
                </div>
                <div className="cy-field">
                  <label className="cy-label">Enabled</label>
                  <button type="button" className={`cy-toggle cy-toggle--lg${form.isEnabled ? " cy-toggle--on" : ""}`} onClick={() => setField("isEnabled", !form.isEnabled)}>
                    <span className="cy-toggle-thumb" />
                    <span className="cy-toggle-label">{form.isEnabled ? "Enabled" : "Disabled"}</span>
                  </button>
                </div>
                <div className="cy-field">
                  <label className="cy-label">Set as Default</label>
                  <button type="button" className={`cy-toggle cy-toggle--lg${form.isDefault ? " cy-toggle--on" : ""}`} onClick={() => setField("isDefault", !form.isDefault)}>
                    <span className="cy-toggle-thumb" />
                    <span className="cy-toggle-label">{form.isDefault ? "Yes" : "No"}</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="cy-modal-footer">
              <button type="button" className="cy-cancel-btn" onClick={closeModal}>Cancel</button>
              <button type="button" className="cy-primary-btn" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : modal === "add" ? "Add Currency" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDelete ? (
        <div className="cy-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="cy-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cy-confirm-icon"><TrashIcon /></div>
            <h2 className="cy-confirm-title">Delete Currency?</h2>
            <p className="cy-confirm-text"><strong>{confirmDelete.flag} {confirmDelete.code} — {confirmDelete.name}</strong> will be permanently removed from the platform.</p>
            <div className="cy-confirm-actions">
              <button type="button" className="cy-cancel-btn" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button type="button" className="cy-danger-btn" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting…" : "Yes, Delete"}</button>
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
.cy-toast{position:fixed;top:24px;right:24px;z-index:999;padding:12px 18px;border-radius:14px;font-size:13px;font-weight:700;background:#22c55e;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.22);animation:cyToastIn .2s ease;}
.cy-toast--err{background:#f43f5e;}
@keyframes cyToastIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.cy-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:22px;}
.cy-title{margin:0 0 6px;font-size:24px;font-weight:800;color:var(--text);}
.cy-subtitle{margin:0;font-size:13px;color:var(--text-muted);}
.cy-primary-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 18px;border-radius:13px;border:none;cursor:pointer;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:#fff;font:inherit;font-size:13px;font-weight:700;box-shadow:0 6px 20px rgba(109,40,217,.28);transition:opacity .14s;white-space:nowrap;flex-shrink:0;}
.cy-primary-btn:disabled{opacity:.6;cursor:not-allowed;}
.cy-primary-btn:hover:not(:disabled){opacity:.88;}
.cy-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px;}
.cy-stat{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:16px 18px;}
.cy-stat-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;}
.cy-stat-val{font-size:28px;font-weight:800;}
.cy-toolbar{display:flex;gap:10px;align-items:center;margin-bottom:14px;}
.cy-search-wrap{flex:1;min-width:200px;position:relative;display:flex;align-items:center;}
.cy-search-wrap svg{position:absolute;left:12px;color:var(--text-muted);}
.cy-search{width:100%;padding:10px 14px 10px 36px;border-radius:13px;border:1px solid var(--border);background:var(--panel);color:var(--text);font:inherit;font-size:13px;outline:none;}
.cy-search:focus{border-color:#8b5cf6;}
.cy-error{padding:14px 16px;border-radius:14px;background:rgba(244,63,94,.1);color:#f87171;font-size:13px;margin-bottom:14px;}
.cy-card{background:var(--panel);border:1px solid var(--border);border-radius:20px;overflow:hidden;}
.cy-table-wrap{overflow-x:auto;}
.cy-table{width:100%;border-collapse:collapse;min-width:640px;}
.cy-table th{padding:12px 14px;text-align:left;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border);white-space:nowrap;}
.cy-table td{padding:13px 14px;font-size:13px;color:var(--text-soft);border-bottom:1px solid var(--border);}
.cy-row:last-child td{border-bottom:none;}
.cy-row:hover{background:var(--bg-soft);}
.cy-state-cell{padding:48px 20px;text-align:center;color:var(--text-muted);font-size:13px;}
.cy-empty-title{font-size:15px;font-weight:700;color:var(--text-soft);margin-bottom:6px;}
.cy-empty-hint{font-size:12px;color:var(--text-muted);}
.cy-code-cell{display:flex;align-items:center;gap:7px;flex-wrap:wrap;}
.cy-flag{font-size:18px;line-height:1;}
.cy-code{font-family:monospace;font-size:13px;font-weight:800;color:#8b5cf6;background:rgba(139,92,246,.12);padding:3px 8px;border-radius:7px;}
.cy-default-badge{display:inline-flex;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:800;background:rgba(245,158,11,.14);color:#fbbf24;letter-spacing:.05em;}
.cy-name{font-weight:700;color:var(--text);}
.cy-symbol{font-size:16px;font-weight:700;color:var(--text);}
.cy-rate{font-family:monospace;font-size:13px;font-weight:700;color:var(--text-soft);}
.cy-rate--base{color:#4ade80;}
.cy-source-badge{display:inline-flex;padding:3px 8px;border-radius:8px;font-size:10px;font-weight:800;letter-spacing:.06em;background:rgba(99,102,241,.12);color:#a5b4fc;}
.cy-toggle{display:inline-flex;align-items:center;gap:7px;padding:5px 10px 5px 5px;border-radius:999px;border:1px solid var(--border);background:transparent;cursor:pointer;transition:all .18s;}
.cy-toggle--lg{padding:8px 14px 8px 8px;}
.cy-toggle:disabled{opacity:.6;cursor:not-allowed;}
.cy-toggle-thumb{width:16px;height:16px;border-radius:50%;background:rgba(148,163,184,.4);transition:background .18s;flex-shrink:0;}
.cy-toggle--on{border-color:rgba(34,197,94,.3);}
.cy-toggle--on .cy-toggle-thumb{background:#22c55e;}
.cy-toggle-label{font-size:12px;font-weight:700;color:var(--text-muted);}
.cy-toggle--on .cy-toggle-label{color:#4ade80;}
.cy-actions{display:flex;gap:6px;justify-content:flex-end;}
.cy-icon-btn{width:32px;height:32px;border-radius:9px;border:1px solid var(--border);background:transparent;color:var(--text-muted);cursor:pointer;display:grid;place-items:center;transition:all .12s;}
.cy-icon-btn:hover{background:var(--bg-soft);color:var(--text);}
.cy-icon-btn--danger:hover{background:rgba(244,63,94,.12);color:#f87171;border-color:rgba(244,63,94,.24);}
.cy-icon-btn--disabled{opacity:.3;cursor:not-allowed;}
.cy-icon-btn--disabled:hover{background:transparent;color:var(--text-muted);border-color:var(--border);}
.cy-table-footer{padding:12px 14px;font-size:12px;color:var(--text-muted);border-top:1px solid var(--border);}
.cy-overlay{position:fixed;inset:0;z-index:200;background:rgba(6,10,20,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;}
.cy-modal{width:100%;max-width:520px;max-height:92vh;overflow-y:auto;border-radius:22px;border:1px solid var(--border-strong);background:linear-gradient(180deg,var(--panel),var(--panel-2,var(--panel)));box-shadow:var(--card-shadow);}
.cy-modal-header{display:flex;align-items:center;justify-content:space-between;padding:20px 22px 0;}
.cy-modal-header h2{margin:0;font-size:18px;font-weight:800;color:var(--text);}
.cy-close-btn{width:34px;height:34px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--text-muted);cursor:pointer;display:grid;place-items:center;font-size:16px;}
.cy-modal-body{padding:18px 22px;}
.cy-form-error{padding:10px 14px;border-radius:12px;background:rgba(244,63,94,.1);color:#f87171;font-size:13px;margin-bottom:14px;}
.cy-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.cy-field{display:flex;flex-direction:column;gap:6px;}
.cy-field--full{grid-column:1/-1;}
.cy-label{font-size:12px;font-weight:700;color:var(--text-soft);letter-spacing:.03em;}
.cy-label-note{font-weight:400;color:var(--text-muted);font-size:11px;}
.cy-input{padding:10px 12px;border-radius:11px;border:1px solid var(--border);background:var(--bg-soft,rgba(255,255,255,.03));color:var(--text);font:inherit;font-size:13px;outline:none;transition:border-color .14s;}
.cy-input:focus{border-color:#8b5cf6;}
.cy-input:disabled{opacity:.6;cursor:not-allowed;}
.cy-modal-footer{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:16px 22px 20px;border-top:1px solid var(--border);}
.cy-cancel-btn{padding:9px 16px;border-radius:12px;border:1px solid var(--border);background:transparent;color:var(--text-soft);font:inherit;font-size:13px;font-weight:700;cursor:pointer;}
.cy-cancel-btn:hover{background:var(--bg-soft);}
.cy-confirm-modal{width:100%;max-width:420px;border-radius:22px;border:1px solid var(--border-strong);background:linear-gradient(180deg,var(--panel),var(--panel-2,var(--panel)));box-shadow:var(--card-shadow);padding:28px 24px;text-align:center;}
.cy-confirm-icon{width:50px;height:50px;border-radius:16px;background:rgba(244,63,94,.12);display:grid;place-items:center;margin:0 auto 14px;color:#f87171;}
.cy-confirm-icon svg{width:22px;height:22px;}
.cy-confirm-title{margin:0 0 10px;font-size:18px;font-weight:800;color:var(--text);}
.cy-confirm-text{margin:0 0 22px;font-size:13px;color:var(--text-muted);line-height:1.6;}
.cy-confirm-actions{display:flex;gap:10px;justify-content:center;}
.cy-danger-btn{padding:9px 18px;border-radius:12px;border:none;cursor:pointer;background:#f43f5e;color:#fff;font:inherit;font-size:13px;font-weight:700;}
.cy-danger-btn:disabled{opacity:.6;cursor:not-allowed;}
.cy-danger-btn:hover:not(:disabled){background:#e11d48;}
@media(max-width:768px){
  .cy-stats{grid-template-columns:repeat(2,1fr);}
  .cy-field-grid{grid-template-columns:1fr;}
  .cy-field--full{grid-column:1;}
}
@media(max-width:480px){
  .cy-stats{grid-template-columns:1fr 1fr;}
  .cy-toolbar{flex-direction:column;align-items:stretch;}
}
`;
