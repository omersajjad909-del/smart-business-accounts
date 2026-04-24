"use client";

import { useEffect, useRef, useState } from "react";

type Gateway = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  isEnabled: boolean;
  configJson: string | null;
  sortOrder: number;
};

type Stats = { total: number; enabled: number; byCategory: Record<string, number> };

type EditForm = {
  name: string;
  description: string;
  configJson: string;
};

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  OFFLINE: { label: "Offline", color: "#94a3b8", bg: "rgba(148,163,184,.12)" },
  CARD:    { label: "Card",    color: "#93c5fd", bg: "rgba(79,124,255,.14)" },
  MOBILE:  { label: "Mobile", color: "#4ade80", bg: "rgba(34,197,94,.14)" },
  CRYPTO:  { label: "Crypto", color: "#fbbf24", bg: "rgba(245,158,11,.14)" },
  OTHER:   { label: "Other",  color: "#c4b5fd", bg: "rgba(139,92,246,.14)" },
};

const GATEWAY_ICONS: Record<string, string> = {
  CASH: "💵", BANK: "🏦", CHEQUE: "📝",
  STRIPE: "💳", PAYPAL: "🅿️", JAZZCASH: "📱",
  EASYPAISA: "📱", SADAD: "🔵", RAZORPAY: "⚡", CRYPTO: "🔗",
};

export default function AdminPaymentMethodsPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, enabled: 0, byCategory: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingGateway, setEditingGateway] = useState<Gateway | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", description: "", configJson: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
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
      const res = await fetch("/api/admin/payment-gateways", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setGateways(data.gateways || []);
      setStats(data.stats || { total: 0, enabled: 0, byCategory: {} });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function toggleGateway(g: Gateway) {
    setTogglingId(g.id);
    try {
      const res = await fetch(`/api/admin/payment-gateways?id=${g.id}`, {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !g.isEnabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Update failed");
      showToast(g.isEnabled ? `${g.name} disabled.` : `${g.name} enabled.`);
      await load();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Update failed", false); }
    finally { setTogglingId(null); }
  }

  function openEdit(g: Gateway) {
    let cfg = "";
    if (g.configJson) {
      try { cfg = JSON.stringify(JSON.parse(g.configJson), null, 2); } catch { cfg = g.configJson; }
    }
    setEditForm({ name: g.name, description: g.description || "", configJson: cfg });
    setEditingGateway(g); setFormError("");
  }

  async function handleSave() {
    if (!editingGateway) return;
    if (!editForm.name.trim()) { setFormError("Name is required."); return; }
    let parsedConfig = null;
    if (editForm.configJson.trim()) {
      try { parsedConfig = JSON.parse(editForm.configJson.trim()); }
      catch { setFormError("Config JSON is not valid JSON."); return; }
    }
    setSaving(true); setFormError("");
    try {
      const res = await fetch(`/api/admin/payment-gateways?id=${editingGateway.id}`, {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editForm.name.trim(), description: editForm.description.trim() || null, configJson: parsedConfig }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setEditingGateway(null); showToast("Gateway updated."); await load();
    } catch (e: unknown) { setFormError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  const categories = ["OFFLINE", "CARD", "MOBILE", "CRYPTO", "OTHER"].filter((cat) =>
    gateways.some((g) => g.category === cat)
  );

  const catMeta = (cat: string) => CATEGORY_META[cat] || CATEGORY_META.OTHER;

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "var(--text)", paddingBottom: 48, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
      <style>{pageStyles}</style>

      {toast ? <div className={`pg-toast${toast.ok ? "" : " pg-toast--err"}`}>{toast.msg}</div> : null}

      <div className="pg-header">
        <div>
          <h1 className="pg-title">Payment Gateways</h1>
          <p className="pg-subtitle">Control which payment gateways are available to companies on the platform. Toggle gateways on or off globally.</p>
        </div>
      </div>

      <div className="pg-stats">
        <div className="pg-stat"><div className="pg-stat-label">Total Gateways</div><div className="pg-stat-val" style={{ color: "#8b5cf6" }}>{loading ? "—" : stats.total}</div></div>
        <div className="pg-stat"><div className="pg-stat-label">Enabled</div><div className="pg-stat-val" style={{ color: "#22c55e" }}>{loading ? "—" : stats.enabled}</div></div>
        <div className="pg-stat"><div className="pg-stat-label">Disabled</div><div className="pg-stat-val" style={{ color: "#f87171" }}>{loading ? "—" : stats.total - stats.enabled}</div></div>
        <div className="pg-stat">
          <div className="pg-stat-label">By Category</div>
          <div className="pg-cat-pills">
            {loading ? <span className="pg-stat-val">—</span> : Object.entries(stats.byCategory).map(([cat, count]) => (
              <span key={cat} className="pg-cat-pill" style={{ background: catMeta(cat).bg, color: catMeta(cat).color }}>
                {catMeta(cat).label} {count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {error ? <div className="pg-error">{error}</div> : null}

      {loading ? (
        <div className="pg-loading">Loading payment gateways…</div>
      ) : (
        categories.map((cat) => {
          const group = gateways.filter((g) => g.category === cat);
          if (!group.length) return null;
          const meta = catMeta(cat);
          return (
            <div key={cat} className="pg-section">
              <div className="pg-section-head">
                <span className="pg-section-badge" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                <span className="pg-section-count">{group.length} gateway{group.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="pg-grid">
                {group.map((g) => (
                  <div key={g.id} className={`pg-card${g.isEnabled ? " pg-card--on" : ""}`}>
                    <div className="pg-card-top">
                      <div className="pg-card-icon" style={{ background: g.isEnabled ? meta.bg : "rgba(148,163,184,.08)" }}>
                        {GATEWAY_ICONS[g.key] || "💳"}
                      </div>
                      <button type="button" className="pg-edit-btn" title="Configure" onClick={() => openEdit(g)}>
                        <EditIcon />
                      </button>
                    </div>
                    <div className="pg-card-name">{g.name}</div>
                    {g.description && <div className="pg-card-desc">{g.description}</div>}
                    <div className="pg-card-footer">
                      <span className="pg-key-badge">{g.key}</span>
                      <button
                        type="button"
                        className={`pg-toggle${g.isEnabled ? " pg-toggle--on" : ""}`}
                        disabled={togglingId === g.id}
                        onClick={() => void toggleGateway(g)}
                        title={g.isEnabled ? "Click to disable" : "Click to enable"}
                      >
                        <span className="pg-toggle-track">
                          <span className="pg-toggle-thumb" />
                        </span>
                        <span className="pg-toggle-label">{togglingId === g.id ? "…" : g.isEnabled ? "ON" : "OFF"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {editingGateway ? (
        <div className="pg-overlay" onClick={() => setEditingGateway(null)}>
          <div className="pg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pg-modal-header">
              <div>
                <h2>{editingGateway.name}</h2>
                <span className="pg-modal-key">{editingGateway.key}</span>
              </div>
              <button type="button" className="pg-close-btn" onClick={() => setEditingGateway(null)}>✕</button>
            </div>
            <div className="pg-modal-body">
              {formError ? <div className="pg-form-error">{formError}</div> : null}
              <div className="pg-field">
                <label className="pg-label">Display Name</label>
                <input className="pg-input" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="pg-field">
                <label className="pg-label">Description</label>
                <input className="pg-input" value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
              </div>
              <div className="pg-field">
                <label className="pg-label">Config JSON <span className="pg-label-note">(API keys, webhook URLs, etc.)</span></label>
                <textarea
                  className="pg-input pg-textarea"
                  value={editForm.configJson}
                  onChange={(e) => setEditForm((p) => ({ ...p, configJson: e.target.value }))}
                  placeholder={'{\n  "apiKey": "sk_live_...",\n  "webhookSecret": "whsec_..."\n}'}
                  rows={6}
                />
              </div>
            </div>
            <div className="pg-modal-footer">
              <button type="button" className="pg-cancel-btn" onClick={() => setEditingGateway(null)}>Cancel</button>
              <button type="button" className="pg-primary-btn" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EditIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }

const pageStyles = `
.pg-toast{position:fixed;top:24px;right:24px;z-index:999;padding:12px 18px;border-radius:14px;font-size:13px;font-weight:700;background:#22c55e;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.22);animation:pgToastIn .2s ease;}
.pg-toast--err{background:#f43f5e;}
@keyframes pgToastIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.pg-header{margin-bottom:22px;}
.pg-title{margin:0 0 6px;font-size:24px;font-weight:800;color:var(--text);}
.pg-subtitle{margin:0;font-size:13px;color:var(--text-muted);}
.pg-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:22px;}
.pg-stat{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:16px 18px;}
.pg-stat-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;}
.pg-stat-val{font-size:28px;font-weight:800;}
.pg-cat-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.pg-cat-pill{padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;}
.pg-error{padding:14px 16px;border-radius:14px;background:rgba(244,63,94,.1);color:#f87171;font-size:13px;margin-bottom:14px;}
.pg-loading{padding:48px;text-align:center;color:var(--text-muted);font-size:13px;}
.pg-section{margin-bottom:24px;}
.pg-section-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.pg-section-badge{padding:5px 13px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.04em;}
.pg-section-count{font-size:12px;color:var(--text-muted);}
.pg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;}
.pg-card{
  background:var(--panel);border:1px solid var(--border);border-radius:20px;padding:16px;
  display:flex;flex-direction:column;gap:0;transition:border-color .18s;
}
.pg-card--on{border-color:rgba(34,197,94,.25);}
.pg-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.pg-card-icon{
  width:42px;height:42px;border-radius:13px;display:grid;place-items:center;
  font-size:22px;transition:background .18s;
}
.pg-edit-btn{width:30px;height:30px;border-radius:9px;border:1px solid var(--border);background:transparent;color:var(--text-muted);cursor:pointer;display:grid;place-items:center;transition:all .12s;}
.pg-edit-btn:hover{background:var(--bg-soft);color:var(--text);}
.pg-card-name{font-size:14px;font-weight:800;color:var(--text);margin-bottom:4px;}
.pg-card-desc{font-size:11px;color:var(--text-muted);line-height:1.45;margin-bottom:12px;flex:1;}
.pg-card-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:12px;border-top:1px solid var(--border);margin-top:auto;}
.pg-key-badge{font-family:monospace;font-size:11px;font-weight:700;color:var(--text-muted);background:var(--bg-soft,rgba(255,255,255,.04));padding:3px 8px;border-radius:7px;}
.pg-toggle{display:inline-flex;align-items:center;gap:8px;background:transparent;border:none;cursor:pointer;padding:0;}
.pg-toggle:disabled{opacity:.6;cursor:not-allowed;}
.pg-toggle-track{
  width:38px;height:22px;border-radius:999px;background:rgba(148,163,184,.2);
  position:relative;transition:background .18s;flex-shrink:0;
}
.pg-toggle--on .pg-toggle-track{background:#22c55e;}
.pg-toggle-thumb{
  position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;
  background:#fff;transition:left .18s;box-shadow:0 1px 3px rgba(0,0,0,.3);
}
.pg-toggle--on .pg-toggle-thumb{left:19px;}
.pg-toggle-label{font-size:12px;font-weight:800;color:var(--text-muted);}
.pg-toggle--on .pg-toggle-label{color:#4ade80;}
.pg-overlay{position:fixed;inset:0;z-index:200;background:rgba(6,10,20,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;}
.pg-modal{width:100%;max-width:500px;max-height:92vh;overflow-y:auto;border-radius:22px;border:1px solid var(--border-strong);background:linear-gradient(180deg,var(--panel),var(--panel-2,var(--panel)));box-shadow:var(--card-shadow);}
.pg-modal-header{display:flex;align-items:flex-start;justify-content:space-between;padding:20px 22px 0;gap:12px;}
.pg-modal-header h2{margin:0 0 4px;font-size:18px;font-weight:800;color:var(--text);}
.pg-modal-key{font-family:monospace;font-size:11px;font-weight:700;color:var(--text-muted);background:rgba(255,255,255,.06);padding:2px 8px;border-radius:6px;}
.pg-close-btn{width:34px;height:34px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--text-muted);cursor:pointer;display:grid;place-items:center;font-size:16px;flex-shrink:0;}
.pg-modal-body{padding:18px 22px;display:flex;flex-direction:column;gap:14px;}
.pg-form-error{padding:10px 14px;border-radius:12px;background:rgba(244,63,94,.1);color:#f87171;font-size:13px;}
.pg-field{display:flex;flex-direction:column;gap:6px;}
.pg-label{font-size:12px;font-weight:700;color:var(--text-soft);letter-spacing:.03em;}
.pg-label-note{font-weight:400;color:var(--text-muted);font-size:11px;}
.pg-input{padding:10px 12px;border-radius:11px;border:1px solid var(--border);background:var(--bg-soft,rgba(255,255,255,.03));color:var(--text);font:inherit;font-size:13px;outline:none;transition:border-color .14s;}
.pg-input:focus{border-color:#8b5cf6;}
.pg-textarea{resize:vertical;min-height:100px;font-family:monospace;font-size:12px;}
.pg-modal-footer{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:16px 22px 20px;border-top:1px solid var(--border);}
.pg-cancel-btn{padding:9px 16px;border-radius:12px;border:1px solid var(--border);background:transparent;color:var(--text-soft);font:inherit;font-size:13px;font-weight:700;cursor:pointer;}
.pg-cancel-btn:hover{background:var(--bg-soft);}
.pg-primary-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 18px;border-radius:13px;border:none;cursor:pointer;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:#fff;font:inherit;font-size:13px;font-weight:700;box-shadow:0 6px 20px rgba(109,40,217,.28);transition:opacity .14s;}
.pg-primary-btn:disabled{opacity:.6;cursor:not-allowed;}
.pg-primary-btn:hover:not(:disabled){opacity:.88;}
@media(max-width:768px){
  .pg-stats{grid-template-columns:repeat(2,1fr);}
  .pg-grid{grid-template-columns:repeat(auto-fill,minmax(180px,1fr));}
}
@media(max-width:480px){
  .pg-stats{grid-template-columns:1fr 1fr;}
}
`;
