"use client";

import { useEffect, useRef, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Currency = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isActive: boolean;
  companyId: string;
  createdAt?: string;
};

type FormData = {
  code: string;
  name: string;
  symbol: string;
  exchangeRate: string;
};

const POPULAR_CURRENCIES = [
  { code: "USD", name: "US Dollar",        symbol: "$"  },
  { code: "EUR", name: "Euro",             symbol: "€"  },
  { code: "GBP", name: "British Pound",    symbol: "£"  },
  { code: "PKR", name: "Pakistani Rupee",  symbol: "₨"  },
  { code: "AED", name: "UAE Dirham",       symbol: "د.إ" },
  { code: "SAR", name: "Saudi Riyal",      symbol: "﷼"  },
  { code: "INR", name: "Indian Rupee",     symbol: "₹"  },
  { code: "JPY", name: "Japanese Yen",     symbol: "¥"  },
  { code: "CNY", name: "Chinese Yuan",     symbol: "¥"  },
  { code: "CAD", name: "Canadian Dollar",  symbol: "C$" },
];

const EMPTY_FORM: FormData = { code: "", name: "", symbol: "", exchangeRate: "1" };

function getHeaders() {
  const u = getCurrentUser();
  return {
    "Content-Type": "application/json",
    "x-user-id": u?.id || "",
    "x-user-role": u?.role || "",
    "x-company-id": u?.companyId || "",
  };
}

export default function AdminCurrenciesPage() {
  const [items, setItems] = useState<Currency[]>([]);
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
      const res = await fetch("/api/currencies", { credentials: "include", headers: getHeaders(), cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load currencies");
      setItems(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const filtered = items.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.symbol.includes(q);
  });

  const totalCurrencies = items.length;
  const baseCurrency = items.find((c) => c.exchangeRate === 1);
  const avgRate = items.length > 1 ? (items.filter((c) => c.exchangeRate !== 1).reduce((s, c) => s + c.exchangeRate, 0) / Math.max(1, items.filter((c) => c.exchangeRate !== 1).length)).toFixed(2) : "1.00";

  function openAdd() { setForm(EMPTY_FORM); setEditing(null); setFormError(""); setModal("add"); }
  function openEdit(c: Currency) {
    setForm({ code: c.code, name: c.name, symbol: c.symbol, exchangeRate: String(c.exchangeRate) });
    setEditing(c); setFormError(""); setModal("edit");
  }
  function closeModal() { setModal(null); setEditing(null); }
  function setField(key: keyof FormData, val: string) { setForm((p) => ({ ...p, [key]: val })); }

  function applyPreset(preset: typeof POPULAR_CURRENCIES[0]) {
    setForm((p) => ({ ...p, code: preset.code, name: preset.name, symbol: preset.symbol }));
  }

  async function handleSave() {
    if (!form.code.trim()) { setFormError("Currency code is required (e.g. USD)."); return; }
    if (!form.name.trim()) { setFormError("Currency name is required."); return; }
    if (!form.symbol.trim()) { setFormError("Currency symbol is required."); return; }
    const rate = Number(form.exchangeRate);
    if (isNaN(rate) || rate <= 0) { setFormError("Exchange rate must be a positive number."); return; }
    setSaving(true); setFormError("");
    try {
      if (editing) {
        const res = await fetch(`/api/currencies?id=${editing.id}`, {
          method: "PUT", credentials: "include", headers: getHeaders(),
          body: JSON.stringify({ name: form.name.trim(), symbol: form.symbol.trim(), exchangeRate: rate, isActive: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Update failed");
      } else {
        const res = await fetch("/api/currencies", {
          method: "POST", credentials: "include", headers: getHeaders(),
          body: JSON.stringify({ code: form.code.trim().toUpperCase(), name: form.name.trim(), symbol: form.symbol.trim(), exchangeRate: rate }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Create failed");
      }
      closeModal(); showToast(editing ? "Currency updated." : "Currency added."); await load();
    } catch (e: unknown) { setFormError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/currencies?id=${confirmDelete.id}`, {
        method: "DELETE", credentials: "include", headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      setConfirmDelete(null); showToast("Currency deleted."); await load();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Delete failed", false); setConfirmDelete(null); }
    finally { setDeleting(false); }
  }

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "var(--text)", paddingBottom: 48 }}>
      <style>{pageStyles}</style>

      {toast ? <div className={`bp-toast${toast.ok ? "" : " bp-toast--err"}`}>{toast.msg}</div> : null}

      <div className="bp-header">
        <div>
          <h1 className="bp-title">Currencies</h1>
          <p className="bp-subtitle">Manage active currencies and exchange rates for multi-currency transactions.</p>
        </div>
        <button type="button" className="bp-primary-btn" onClick={openAdd}>
          <PlusIcon /> Add Currency
        </button>
      </div>

      <div className="bp-stats">
        <StatCard label="Total Currencies" value={loading ? "—" : totalCurrencies} color="#8b5cf6" />
        <StatCard label="Base Currency" value={loading ? "—" : baseCurrency?.code || "—"} color="#4f7cff" />
        <StatCard label="Avg Exchange Rate" value={loading ? "—" : avgRate} color="#f59e0b" />
        <StatCard label="All Active" value={loading ? "—" : items.every((c) => c.isActive) ? "Yes" : "No"} color="#22c55e" />
      </div>

      <div className="bp-toolbar">
        <div className="bp-search-wrap">
          <SearchIcon />
          <input className="bp-search" placeholder="Search by code, name or symbol…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {error ? <div className="bp-error">{error}</div> : null}

      <div className="bp-card">
        <div className="bp-table-wrap">
          <table className="bp-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Currency</th>
                <th>Symbol</th>
                <th>Exchange Rate</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="bp-state-cell">Loading currencies…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="bp-state-cell">
                  <div className="bp-empty-title">{search ? "No currencies match your search." : "No currencies configured."}</div>
                  <div className="bp-empty-hint">Add your base currency first, then add additional currencies with exchange rates.</div>
                </td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="bp-row">
                    <td><span className="bp-code">{c.code}</span></td>
                    <td>
                      <div className="bp-name">{c.name}</div>
                      {c.exchangeRate === 1 && <div className="bp-base-tag">Base</div>}
                    </td>
                    <td><span className="bp-symbol">{c.symbol}</span></td>
                    <td>
                      <span className={`bp-rate${c.exchangeRate === 1 ? " bp-rate--base" : ""}`}>
                        {c.exchangeRate === 1 ? "1.00 (Base)" : c.exchangeRate.toFixed(4)}
                      </span>
                    </td>
                    <td>
                      <span className={`bp-status${c.isActive ? " bp-status--active" : " bp-status--inactive"}`}>
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="bp-actions">
                        <button type="button" className="bp-icon-btn" title="Edit" onClick={() => openEdit(c)}><EditIcon /></button>
                        <button type="button" className="bp-icon-btn bp-icon-btn--danger" title="Delete" onClick={() => setConfirmDelete(c)}><TrashIcon /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="bp-table-footer">
            {filtered.length} {filtered.length === 1 ? "currency" : "currencies"} configured
          </div>
        )}
      </div>

      {modal ? (
        <div className="bp-overlay" onClick={closeModal}>
          <div className="bp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bp-modal-header">
              <h2>{modal === "add" ? "Add Currency" : `Edit ${editing?.code}`}</h2>
              <button type="button" className="bp-close-btn" onClick={closeModal}>✕</button>
            </div>
            <div className="bp-modal-body">
              {formError ? <div className="bp-form-error">{formError}</div> : null}
              {modal === "add" && (
                <div className="bp-presets">
                  <div className="bp-presets-label">Quick Select</div>
                  <div className="bp-presets-grid">
                    {POPULAR_CURRENCIES.map((p) => (
                      <button key={p.code} type="button" className="bp-preset-btn" onClick={() => applyPreset(p)}>
                        <span className="bp-preset-symbol">{p.symbol}</span>
                        <span className="bp-preset-code">{p.code}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="bp-field-grid">
                <div className="bp-field">
                  <label className="bp-label">Currency Code * {modal === "edit" ? <span className="bp-label-note">(read-only)</span> : ""}</label>
                  <input className="bp-input" value={form.code} onChange={(e) => setField("code", e.target.value)} placeholder="USD" maxLength={5} disabled={modal === "edit"} style={{ opacity: modal === "edit" ? 0.6 : 1 }} />
                </div>
                <div className="bp-field">
                  <label className="bp-label">Symbol *</label>
                  <input className="bp-input" value={form.symbol} onChange={(e) => setField("symbol", e.target.value)} placeholder="$" maxLength={6} />
                </div>
                <div className="bp-field bp-field--full">
                  <label className="bp-label">Currency Name *</label>
                  <input className="bp-input" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="US Dollar" />
                </div>
                <div className="bp-field bp-field--full">
                  <label className="bp-label">Exchange Rate (1 base = ?)</label>
                  <input className="bp-input" type="number" min="0.0001" step="0.0001" value={form.exchangeRate} onChange={(e) => setField("exchangeRate", e.target.value)} placeholder="1.00" />
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Set to 1 to use as base currency. All other rates are relative to the base.</span>
                </div>
              </div>
            </div>
            <div className="bp-modal-footer">
              <button type="button" className="bp-cancel-btn" onClick={closeModal}>Cancel</button>
              <button type="button" className="bp-primary-btn" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : modal === "add" ? "Add Currency" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDelete ? (
        <div className="bp-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="bp-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bp-confirm-icon"><TrashIcon /></div>
            <h2 className="bp-confirm-title">Delete Currency?</h2>
            <p className="bp-confirm-text"><strong>{confirmDelete.code} ({confirmDelete.name})</strong> will be permanently removed. Existing transactions in this currency will not be affected.</p>
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
.bp-error{padding:14px 16px;border-radius:14px;background:rgba(244,63,94,.1);color:#f87171;font-size:13px;margin-bottom:14px;}
.bp-card{background:var(--panel);border:1px solid var(--border);border-radius:20px;overflow:hidden;}
.bp-table-wrap{overflow-x:auto;}
.bp-table{width:100%;border-collapse:collapse;min-width:560px;}
.bp-table th{padding:13px 14px;text-align:left;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border);white-space:nowrap;}
.bp-table td{padding:14px 14px;font-size:13px;color:var(--text-soft);border-bottom:1px solid var(--border);}
.bp-row:last-child td{border-bottom:none;}
.bp-row:hover{background:var(--bg-soft);}
.bp-state-cell{padding:48px 20px;text-align:center;color:var(--text-muted);font-size:13px;}
.bp-empty-title{font-size:15px;font-weight:700;color:var(--text-soft);margin-bottom:6px;}
.bp-empty-hint{font-size:12px;color:var(--text-muted);}
.bp-code{font-family:monospace;font-size:13px;font-weight:800;color:#8b5cf6;background:rgba(139,92,246,.12);padding:4px 10px;border-radius:8px;}
.bp-name{font-weight:700;color:var(--text);}
.bp-base-tag{display:inline-block;font-size:10px;font-weight:800;color:#fbbf24;background:rgba(251,191,36,.14);padding:2px 7px;border-radius:999px;margin-top:3px;letter-spacing:.06em;}
.bp-symbol{font-size:15px;font-weight:700;color:var(--text);}
.bp-rate{font-family:monospace;font-size:13px;font-weight:700;color:var(--text-soft);}
.bp-rate--base{color:#4ade80;}
.bp-status{display:inline-flex;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;}
.bp-status--active{background:rgba(34,197,94,.14);color:#4ade80;}
.bp-status--inactive{background:rgba(248,113,113,.14);color:#f87171;}
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
.bp-presets{margin-bottom:18px;}
.bp-presets-label{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;}
.bp-presets-grid{display:flex;flex-wrap:wrap;gap:7px;}
.bp-preset-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:10px;border:1px solid var(--border);background:var(--bg-soft,rgba(255,255,255,.03));color:var(--text-soft);font:inherit;font-size:12px;cursor:pointer;transition:all .12s;}
.bp-preset-btn:hover{border-color:#8b5cf6;color:var(--text);background:rgba(139,92,246,.08);}
.bp-preset-symbol{font-weight:800;color:var(--text);}
.bp-preset-code{color:var(--text-muted);}
.bp-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.bp-field{display:flex;flex-direction:column;gap:6px;}
.bp-field--full{grid-column:1/-1;}
.bp-label{font-size:12px;font-weight:700;color:var(--text-soft);letter-spacing:.03em;}
.bp-label-note{font-weight:400;color:var(--text-muted);font-size:11px;}
.bp-input{padding:10px 12px;border-radius:11px;border:1px solid var(--border);background:var(--bg-soft,rgba(255,255,255,.03));color:var(--text);font:inherit;font-size:13px;outline:none;transition:border-color .14s;}
.bp-input:focus{border-color:#8b5cf6;}
.bp-input:disabled{opacity:.6;cursor:not-allowed;}
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
@media(max-width:480px){.bp-stats{grid-template-columns:1fr;}}
`;
