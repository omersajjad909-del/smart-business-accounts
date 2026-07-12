"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";

type Update = {
  id: string;
  title: string;
  body: string;
  type: string;
  version?: string | null;
  published: boolean;
  createdAt: string;
};

const TYPES = ["feature", "improvement", "fix", "security", "announcement"] as const;

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  feature:      { bg: "rgba(129,140,248,.15)", color: "#818cf8" },
  improvement:  { bg: "rgba(52,211,153,.15)",  color: "#34d399" },
  fix:          { bg: "rgba(251,191,36,.15)",  color: "#fbbf24" },
  security:     { bg: "rgba(248,113,113,.15)", color: "#f87171" },
  announcement: { bg: "rgba(244,114,182,.15)", color: "#f472b6" },
};

function authHeaders(): Record<string, string> {
  const u = getCurrentUser();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (u?.role) h["x-user-role"] = u.role;
  if (u?.id) h["x-user-id"] = u.id;
  return h;
}

export default function AdminUpdatesPage() {
  const [items, setItems] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<typeof TYPES[number]>("feature");
  const [version, setVersion] = useState("");
  const [published, setPublished] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/updates", { headers: authHeaders() });
      const d = await r.json();
      setItems(Array.isArray(d.updates) ? d.updates : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function resetForm() {
    setTitle(""); setBody(""); setType("feature"); setVersion(""); setPublished(true);
    setEditingId(null); setShowForm(false);
  }

  function beginEdit(u: Update) {
    setEditingId(u.id);
    setTitle(u.title);
    setBody(u.body);
    setType((TYPES as readonly string[]).includes(u.type) ? (u.type as typeof TYPES[number]) : "feature");
    setVersion(u.version || "");
    setPublished(u.published);
    setShowForm(true);
  }

  async function save() {
    if (!title || !body) {
      toast.error("Title and body required");
      return;
    }
    setSaving(true);
    try {
      const action = editingId ? "EDIT" : "CREATE";
      const r = await fetch("/api/admin/updates", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ action, id: editingId || undefined, title, body, type, version, published }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save failed");
      toast.success(editingId ? "Update saved" : "Update published");
      resetForm();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(u: Update) {
    try {
      const r = await fetch("/api/admin/updates", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ action: "TOGGLE_PUBLISH", id: u.id, published: !u.published }),
      });
      if (!r.ok) throw new Error("Toggle failed");
      toast.success(u.published ? "Update unpublished" : "Update published");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Toggle failed");
    }
  }

  async function deleteUpdate(u: Update) {
    if (!confirm(`Delete update "${u.title}"?`)) return;
    try {
      const r = await fetch("/api/admin/updates", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ action: "DELETE", id: u.id }),
      });
      if (!r.ok) throw new Error("Delete failed");
      toast.success("Update deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 60px" }}>
      <style>{css}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Product Updates</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
            Publish changelog entries, feature announcements, and product news.
          </p>
        </div>
        <button className="up-btn" onClick={() => showForm ? resetForm() : setShowForm(true)}
          style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white" }}>
          {showForm ? "Close" : "+ New Update"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Updates", val: items.length,                             color: "#818cf8" },
          { label: "Published",     val: items.filter(u => u.published).length,   color: "#34d399" },
          { label: "Drafts",        val: items.filter(u => !u.published).length,  color: "#94a3b8" },
        ].map(k => (
          <div key={k.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 4, fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 22, marginBottom: 22 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>{editingId ? "Edit Update" : "New Update"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={label}>Title *</label>
              <input className="up-inp" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <label style={label}>Type</label>
              <select className="up-inp" value={type} onChange={e => setType(e.target.value as typeof TYPES[number])}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Version</label>
              <input className="up-inp" value={version} onChange={e => setVersion(e.target.value)} placeholder="e.g. 4.6.1" />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={label}>Body *</label>
            <textarea className="up-inp" rows={5} value={body} onChange={e => setBody(e.target.value)} placeholder="Describe what changed…" style={{ resize: "vertical", lineHeight: 1.6 }} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 16, cursor: "pointer" }}>
            <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} />
            Publish immediately
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="up-btn" onClick={save} disabled={saving} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white" }}>
              {saving ? "Saving…" : editingId ? "Save Changes" : "Publish"}
            </button>
            <button className="up-btn" onClick={resetForm} style={{ background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.6)" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              {["Title","Type","Version","Published","Date","Actions"].map(h => (
                <th key={h} style={th}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={empty}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} style={empty}>No updates yet</td></tr>
            ) : items.map(u => {
              const st = TYPE_STYLE[u.type] || TYPE_STYLE.feature;
              return (
                <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <td style={{ ...td, fontWeight: 700, maxWidth: 320 }}>
                    <div>{u.title}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", fontWeight: 400, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {u.body.slice(0, 90)}
                    </div>
                  </td>
                  <td style={td}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>{u.type}</span>
                  </td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{u.version || "—"}</td>
                  <td style={td}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: u.published ? "rgba(52,211,153,.15)" : "rgba(148,163,184,.15)",
                      color: u.published ? "#34d399" : "#94a3b8" }}>
                      {u.published ? "PUBLISHED" : "DRAFT"}
                    </span>
                  </td>
                  <td style={{ ...td, color: "rgba(255,255,255,.4)", fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString("en-GB")}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="up-btn-sm" onClick={() => beginEdit(u)} style={{ background: "rgba(129,140,248,.15)", color: "#818cf8" }}>Edit</button>
                      <button className="up-btn-sm" onClick={() => togglePublish(u)}
                        style={{ background: u.published ? "rgba(148,163,184,.15)" : "rgba(52,211,153,.15)", color: u.published ? "#94a3b8" : "#34d399" }}>
                        {u.published ? "Unpublish" : "Publish"}
                      </button>
                      <button className="up-btn-sm" onClick={() => deleteUpdate(u)} style={{ background: "rgba(248,113,113,.15)", color: "#f87171" }}>Delete</button>
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

const th: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".07em" };
const td: React.CSSProperties = { padding: "13px 16px", fontSize: 13 };
const empty: React.CSSProperties = { padding: 40, textAlign: "center", color: "rgba(255,255,255,.3)" };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", display: "block", marginBottom: 6 };

const css = `
  .up-inp { width:100%; background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:10px; padding:10px 12px; color:white; font-family:inherit; font-size:13px; outline:none; box-sizing:border-box; }
  .up-btn { border:none; border-radius:10px; padding:9px 20px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; transition:opacity .2s; }
  .up-btn:disabled { opacity:.4; cursor:not-allowed; }
  .up-btn:hover:not(:disabled) { opacity:.85; }
  .up-btn-sm { border:none; border-radius:6px; padding:5px 12px; font-family:inherit; font-size:11px; font-weight:700; cursor:pointer; transition:opacity .2s; }
  .up-btn-sm:hover { opacity:.75; }
`;
