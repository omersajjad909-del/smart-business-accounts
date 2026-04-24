"use client";

import { useEffect, useRef, useState } from "react";

type Category = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
};

type Stats = { total: number; active: number; inactive: number };

type FormData = {
  name: string;
  description: string;
  color: string;
  sortOrder: string;
  isActive: boolean;
};

const PRESET_COLORS = [
  "#8b5cf6", "#4f7cff", "#22c55e", "#f59e0b", "#06b6d4",
  "#ec4899", "#10b981", "#3b82f6", "#f97316", "#64748b",
];

const EMPTY_FORM: FormData = {
  name: "", description: "", color: "#8b5cf6", sortOrder: "0", isActive: true,
};

export default function AdminProductCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
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
      const res = await fetch("/api/admin/product-categories", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setCategories(data.categories || []);
      setStats(data.stats || { total: 0, active: 0, inactive: 0 });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const filtered = categories.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q);
  });

  function openAdd() { setForm(EMPTY_FORM); setEditing(null); setFormError(""); setModal("add"); }
  function openEdit(c: Category) {
    setForm({ name: c.name, description: c.description || "", color: c.color, sortOrder: String(c.sortOrder), isActive: c.isActive });
    setEditing(c); setFormError(""); setModal("edit");
  }
  function closeModal() { setModal(null); setEditing(null); }
  function setField<K extends keyof FormData>(k: K, v: FormData[K]) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSave() {
    if (!form.name.trim()) { setFormError("Category name is required."); return; }
    setSaving(true); setFormError("");
    try {
      const body = { name: form.name.trim(), description: form.description.trim() || null, color: form.color, sortOrder: Number(form.sortOrder) || 0, isActive: form.isActive };
      const url = editing ? `/api/admin/product-categories?id=${editing.id}` : "/api/admin/product-categories";
      const res = await fetch(url, { method: editing ? "PUT" : "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      closeModal(); showToast(editing ? "Category updated." : "Category created."); await load();
    } catch (e: unknown) { setFormError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function toggleActive(c: Category) {
    setTogglingId(c.id);
    try {
      const res = await fetch(`/api/admin/product-categories?id=${c.id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !c.isActive }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Update failed");
      showToast(c.isActive ? "Category deactivated." : "Category activated.");
      await load();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Update failed", false); }
    finally { setTogglingId(null); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/product-categories?id=${confirmDelete.id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      setConfirmDelete(null); showToast("Category deleted."); await load();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Delete failed", false); setConfirmDelete(null); }
    finally { setDeleting(false); }
  }

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "var(--text)", paddingBottom: 48, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
      <style>{pageStyles}</style>

      {toast ? <div className={`pc-toast${toast.ok ? "" : " pc-toast--err"}`}>{toast.msg}</div> : null}

      <div className="pc-header">
        <div>
          <h1 className="pc-title">Product Categories</h1>
          <p className="pc-subtitle">Global category templates used across all company workspaces on the platform.</p>
        </div>
        <button type="button" className="pc-primary-btn" onClick={openAdd}>
          <PlusIcon /> Add Category
        </button>
      </div>

      <div className="pc-stats">
        <div className="pc-stat"><div className="pc-stat-label">Total</div><div className="pc-stat-val" style={{ color: "#8b5cf6" }}>{loading ? "—" : stats.total}</div></div>
        <div className="pc-stat"><div className="pc-stat-label">Active</div><div className="pc-stat-val" style={{ color: "#22c55e" }}>{loading ? "—" : stats.active}</div></div>
        <div className="pc-stat"><div className="pc-stat-label">Inactive</div><div className="pc-stat-val" style={{ color: "#f87171" }}>{loading ? "—" : stats.inactive}</div></div>
      </div>

      <div className="pc-toolbar">
        <div className="pc-search-wrap">
          <SearchIcon />
          <input className="pc-search" placeholder="Search categories…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {error ? <div className="pc-error">{error}</div> : null}

      {loading ? (
        <div className="pc-loading">Loading categories…</div>
      ) : filtered.length === 0 ? (
        <div className="pc-empty">
          <div className="pc-empty-title">{search ? "No categories match your search." : "No categories found."}</div>
          <div className="pc-empty-hint">Click &ldquo;Add Category&rdquo; to create the first one.</div>
        </div>
      ) : (
        <div className="pc-grid">
          {filtered.map((c) => (
            <div key={c.id} className="pc-card">
              <div className="pc-card-top">
                <div className="pc-dot" style={{ background: c.color }} />
                <div className="pc-card-actions">
                  <button type="button" className="pc-icon-btn" title="Edit" onClick={() => openEdit(c)}><EditIcon /></button>
                  <button type="button" className="pc-icon-btn pc-icon-btn--danger" title="Delete" onClick={() => setConfirmDelete(c)}><TrashIcon /></button>
                </div>
              </div>
              <div className="pc-card-name">{c.name}</div>
              {c.description && <div className="pc-card-desc">{c.description}</div>}
              <div className="pc-card-footer">
                <span className="pc-order-badge">Order: {c.sortOrder}</span>
                <button
                  type="button"
                  className={`pc-toggle${c.isActive ? " pc-toggle--on" : ""}`}
                  disabled={togglingId === c.id}
                  onClick={() => void toggleActive(c)}
                >
                  <span className="pc-toggle-thumb" />
                  <span className="pc-toggle-label">{togglingId === c.id ? "…" : c.isActive ? "Active" : "Inactive"}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal ? (
        <div className="pc-overlay" onClick={closeModal}>
          <div className="pc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pc-modal-header">
              <h2>{modal === "add" ? "Add Category" : "Edit Category"}</h2>
              <button type="button" className="pc-close-btn" onClick={closeModal}>✕</button>
            </div>
            <div className="pc-modal-body">
              {formError ? <div className="pc-form-error">{formError}</div> : null}
              <div className="pc-field">
                <label className="pc-label">Category Name *</label>
                <input className="pc-input" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Electronics" />
              </div>
              <div className="pc-field">
                <label className="pc-label">Description</label>
                <textarea className="pc-input pc-textarea" value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Brief description of this category" rows={2} />
              </div>
              <div className="pc-field">
                <label className="pc-label">Color</label>
                <div className="pc-color-grid">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      className={`pc-color-swatch${form.color === col ? " pc-color-swatch--selected" : ""}`}
                      style={{ background: col }}
                      onClick={() => setField("color", col)}
                    />
                  ))}
                </div>
              </div>
              <div className="pc-field-row">
                <div className="pc-field">
                  <label className="pc-label">Sort Order</label>
                  <input className="pc-input" type="number" min="0" value={form.sortOrder} onChange={(e) => setField("sortOrder", e.target.value)} placeholder="0" />
                </div>
                <div className="pc-field">
                  <label className="pc-label">Status</label>
                  <button type="button" className={`pc-toggle pc-toggle--lg${form.isActive ? " pc-toggle--on" : ""}`} onClick={() => setField("isActive", !form.isActive)}>
                    <span className="pc-toggle-thumb" />
                    <span className="pc-toggle-label">{form.isActive ? "Active" : "Inactive"}</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="pc-modal-footer">
              <button type="button" className="pc-cancel-btn" onClick={closeModal}>Cancel</button>
              <button type="button" className="pc-primary-btn" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : modal === "add" ? "Create Category" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDelete ? (
        <div className="pc-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="pc-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pc-confirm-icon"><TrashIcon /></div>
            <h2 className="pc-confirm-title">Delete Category?</h2>
            <p className="pc-confirm-text"><strong>{confirmDelete.name}</strong> will be permanently removed from all company workspaces.</p>
            <div className="pc-confirm-actions">
              <button type="button" className="pc-cancel-btn" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button type="button" className="pc-danger-btn" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting…" : "Yes, Delete"}</button>
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
.pc-toast{position:fixed;top:24px;right:24px;z-index:999;padding:12px 18px;border-radius:14px;font-size:13px;font-weight:700;background:#22c55e;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.22);animation:pcToastIn .2s ease;}
.pc-toast--err{background:#f43f5e;}
@keyframes pcToastIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.pc-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:22px;}
.pc-title{margin:0 0 6px;font-size:24px;font-weight:800;color:var(--text);}
.pc-subtitle{margin:0;font-size:13px;color:var(--text-muted);}
.pc-primary-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 18px;border-radius:13px;border:none;cursor:pointer;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:#fff;font:inherit;font-size:13px;font-weight:700;box-shadow:0 6px 20px rgba(109,40,217,.28);transition:opacity .14s;white-space:nowrap;flex-shrink:0;}
.pc-primary-btn:disabled{opacity:.6;cursor:not-allowed;}
.pc-primary-btn:hover:not(:disabled){opacity:.88;}
.pc-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:16px;}
.pc-stat{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:16px 18px;}
.pc-stat-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;}
.pc-stat-val{font-size:28px;font-weight:800;}
.pc-toolbar{display:flex;gap:10px;align-items:center;margin-bottom:16px;}
.pc-search-wrap{flex:1;min-width:180px;position:relative;display:flex;align-items:center;}
.pc-search-wrap svg{position:absolute;left:12px;color:var(--text-muted);}
.pc-search{width:100%;padding:10px 14px 10px 36px;border-radius:13px;border:1px solid var(--border);background:var(--panel);color:var(--text);font:inherit;font-size:13px;outline:none;}
.pc-search:focus{border-color:#8b5cf6;}
.pc-error{padding:14px 16px;border-radius:14px;background:rgba(244,63,94,.1);color:#f87171;font-size:13px;margin-bottom:14px;}
.pc-loading{padding:48px;text-align:center;color:var(--text-muted);font-size:13px;}
.pc-empty{padding:48px 24px;text-align:center;}
.pc-empty-title{font-size:15px;font-weight:700;color:var(--text-soft);margin-bottom:6px;}
.pc-empty-hint{font-size:12px;color:var(--text-muted);}
.pc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;}
.pc-card{background:var(--panel);border:1px solid var(--border);border-radius:20px;padding:18px;transition:border-color .14s;}
.pc-card:hover{border-color:var(--border-strong,rgba(255,255,255,.12));}
.pc-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.pc-dot{width:32px;height:32px;border-radius:10px;flex-shrink:0;}
.pc-card-actions{display:flex;gap:5px;}
.pc-card-name{font-size:15px;font-weight:800;color:var(--text);margin-bottom:5px;}
.pc-card-desc{font-size:12px;color:var(--text-muted);line-height:1.5;margin-bottom:12px;}
.pc-card-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;padding-top:12px;border-top:1px solid var(--border);}
.pc-order-badge{font-size:11px;font-weight:700;color:var(--text-muted);background:var(--bg-soft,rgba(255,255,255,.04));padding:3px 9px;border-radius:8px;}
.pc-toggle{display:inline-flex;align-items:center;gap:7px;padding:5px 10px 5px 5px;border-radius:999px;border:1px solid var(--border);background:transparent;cursor:pointer;transition:all .18s;}
.pc-toggle--lg{padding:8px 14px 8px 8px;}
.pc-toggle:disabled{opacity:.6;cursor:not-allowed;}
.pc-toggle-thumb{width:16px;height:16px;border-radius:50%;background:rgba(148,163,184,.4);transition:background .18s;flex-shrink:0;}
.pc-toggle--on{border-color:rgba(34,197,94,.3);}
.pc-toggle--on .pc-toggle-thumb{background:#22c55e;}
.pc-toggle-label{font-size:11px;font-weight:700;color:var(--text-muted);}
.pc-toggle--on .pc-toggle-label{color:#4ade80;}
.pc-icon-btn{width:30px;height:30px;border-radius:9px;border:1px solid var(--border);background:transparent;color:var(--text-muted);cursor:pointer;display:grid;place-items:center;transition:all .12s;}
.pc-icon-btn:hover{background:var(--bg-soft);color:var(--text);}
.pc-icon-btn--danger:hover{background:rgba(244,63,94,.12);color:#f87171;border-color:rgba(244,63,94,.24);}
.pc-overlay{position:fixed;inset:0;z-index:200;background:rgba(6,10,20,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;}
.pc-modal{width:100%;max-width:460px;max-height:92vh;overflow-y:auto;border-radius:22px;border:1px solid var(--border-strong);background:linear-gradient(180deg,var(--panel),var(--panel-2,var(--panel)));box-shadow:var(--card-shadow);}
.pc-modal-header{display:flex;align-items:center;justify-content:space-between;padding:20px 22px 0;}
.pc-modal-header h2{margin:0;font-size:18px;font-weight:800;color:var(--text);}
.pc-close-btn{width:34px;height:34px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--text-muted);cursor:pointer;display:grid;place-items:center;font-size:16px;}
.pc-modal-body{padding:18px 22px;display:flex;flex-direction:column;gap:16px;}
.pc-form-error{padding:10px 14px;border-radius:12px;background:rgba(244,63,94,.1);color:#f87171;font-size:13px;}
.pc-field{display:flex;flex-direction:column;gap:6px;}
.pc-field-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.pc-label{font-size:12px;font-weight:700;color:var(--text-soft);letter-spacing:.03em;}
.pc-input{padding:10px 12px;border-radius:11px;border:1px solid var(--border);background:var(--bg-soft,rgba(255,255,255,.03));color:var(--text);font:inherit;font-size:13px;outline:none;transition:border-color .14s;}
.pc-input:focus{border-color:#8b5cf6;}
.pc-textarea{resize:vertical;min-height:60px;}
.pc-color-grid{display:flex;flex-wrap:wrap;gap:8px;}
.pc-color-swatch{width:28px;height:28px;border-radius:8px;border:2px solid transparent;cursor:pointer;transition:transform .1s;}
.pc-color-swatch:hover{transform:scale(1.15);}
.pc-color-swatch--selected{border-color:#fff;box-shadow:0 0 0 2px #8b5cf6;}
.pc-modal-footer{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:16px 22px 20px;border-top:1px solid var(--border);}
.pc-cancel-btn{padding:9px 16px;border-radius:12px;border:1px solid var(--border);background:transparent;color:var(--text-soft);font:inherit;font-size:13px;font-weight:700;cursor:pointer;}
.pc-cancel-btn:hover{background:var(--bg-soft);}
.pc-confirm-modal{width:100%;max-width:400px;border-radius:22px;border:1px solid var(--border-strong);background:linear-gradient(180deg,var(--panel),var(--panel-2,var(--panel)));box-shadow:var(--card-shadow);padding:28px 24px;text-align:center;}
.pc-confirm-icon{width:50px;height:50px;border-radius:16px;background:rgba(244,63,94,.12);display:grid;place-items:center;margin:0 auto 14px;color:#f87171;}
.pc-confirm-icon svg{width:22px;height:22px;}
.pc-confirm-title{margin:0 0 10px;font-size:18px;font-weight:800;color:var(--text);}
.pc-confirm-text{margin:0 0 22px;font-size:13px;color:var(--text-muted);line-height:1.6;}
.pc-confirm-actions{display:flex;gap:10px;justify-content:center;}
.pc-danger-btn{padding:9px 18px;border-radius:12px;border:none;cursor:pointer;background:#f43f5e;color:#fff;font:inherit;font-size:13px;font-weight:700;}
.pc-danger-btn:disabled{opacity:.6;cursor:not-allowed;}
.pc-danger-btn:hover:not(:disabled){background:#e11d48;}
@media(max-width:768px){
  .pc-stats{grid-template-columns:repeat(3,1fr);}
  .pc-grid{grid-template-columns:repeat(auto-fill,minmax(200px,1fr));}
}
@media(max-width:480px){
  .pc-stats{grid-template-columns:1fr 1fr;}
  .pc-field-row{grid-template-columns:1fr;}
}
`;
