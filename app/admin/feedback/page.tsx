"use client";
import { useEffect, useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  open:      "#f87171",
  in_review: "#fbbf24",
  resolved:  "#34d399",
  closed:    "#64748b",
};
const TYPE_COLORS: Record<string, string> = {
  complaint:  "#f87171",
  suggestion: "#fbbf24",
  bug:        "#a78bfa",
  general:    "#34d399",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "#64748b", normal: "#38bdf8", high: "#f59e0b", urgent: "#ef4444",
};

export default function AdminFeedbackPage() {
  const [items, setItems]     = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [stats, setStats]     = useState<any[]>([]);
  const [byType, setByType]   = useState<any[]>([]);
  const [loading, setLoad]    = useState(true);
  const [status, setStatus]   = useState("");
  const [type, setType]       = useState("");
  const [page, setPage]       = useState(1);
  const [selected, setSelected] = useState<any | null>(null);
  const [note, setNote]       = useState("");
  const [saving, setSaving]   = useState(false);

  async function load() {
    setLoad(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set("status", status);
      if (type)   params.set("type", type);
      const r = await fetch(`/api/admin/feedback?${params}`);
      const d = await r.json();
      setItems(d.items || []);
      setTotal(d.total || 0);
      setStats(d.stats || []);
      setByType(d.byType || []);
    } finally { setLoad(false); }
  }

  useEffect(() => { load(); }, [status, type, page]);

  async function update(id: string, patch: any) {
    setSaving(true);
    await fetch("/api/admin/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    setSaving(false);
    setSelected(null);
    load();
  }

  const openCount    = stats.find((s:any) => s.status === "open")?._count?.id || 0;
  const reviewCount  = stats.find((s:any) => s.status === "in_review")?._count?.id || 0;
  const resolvedCount= stats.find((s:any) => s.status === "resolved")?._count?.id || 0;

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 60px" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fb-row:hover { background:rgba(255,255,255,.03)!important; cursor:pointer; }
        .fb-sel { background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:10px; padding:8px 14px; color:white; font-family:inherit; font-size:13px; outline:none; }
        .fb-btn { border:none; border-radius:10px; padding:8px 18px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; transition:opacity .2s; }
        .fb-btn:hover { opacity:.85; }
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:100; display:flex; align-items:center; justify-content:center; padding:24px; }
        .modal { background:#0f1629; border:1px solid rgba(255,255,255,.1); border-radius:20px; padding:32px; width:100%; max-width:540px; max-height:85vh; overflow-y:auto; }
        .fb-textarea { width:100%; background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:10px; padding:12px; color:white; font-family:inherit; font-size:13px; outline:none; resize:vertical; box-sizing:border-box; }
        .fb-textarea:focus { border-color:rgba(99,102,241,.4); }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Feedback & Complaints</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>Users اور visitors کے complaints، suggestions اور bug reports</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Open",      val: openCount,     color: "#f87171" },
          { label: "In Review", val: reviewCount,   color: "#fbbf24" },
          { label: "Resolved",  val: resolvedCount, color: "#34d399" },
          { label: "Total",     val: total,          color: "#818cf8" },
        ].map(k => (
          <div key={k.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 4, fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Type breakdown */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        {byType.map((t: any) => (
          <div key={t.type} style={{ padding: "6px 14px", borderRadius: 20, background: `${TYPE_COLORS[t.type] || "#818cf8"}15`, border: `1px solid ${TYPE_COLORS[t.type] || "#818cf8"}30`, fontSize: 12, fontWeight: 700, color: TYPE_COLORS[t.type] || "#818cf8" }}>
            {t.type}: {t._count.id}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <select className="fb-sel" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_review">In Review</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select className="fb-sel" value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          <option value="complaint">Complaint</option>
          <option value="suggestion">Suggestion</option>
          <option value="bug">Bug</option>
          <option value="general">General</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              {["Type","Subject","From","Priority","Status","Date"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".07em" }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 14 }}>Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 14 }}>کوئی feedback نہیں ملی</td></tr>
            ) : items.map((fb: any) => (
              <tr key={fb.id} className="fb-row" onClick={() => { setSelected(fb); setNote(fb.adminNote || ""); }}
                style={{ borderBottom: "1px solid rgba(255,255,255,.04)", transition: "background .15s" }}>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${TYPE_COLORS[fb.type] || "#818cf8"}18`, color: TYPE_COLORS[fb.type] || "#818cf8" }}>
                    {fb.type}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, maxWidth: 200 }}>{fb.subject}</td>
                <td style={{ padding: "14px 16px", fontSize: 12, color: "rgba(255,255,255,.5)" }}>{fb.name || fb.email || "—"}</td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${PRIORITY_COLORS[fb.priority]}18`, color: PRIORITY_COLORS[fb.priority] }}>
                    {fb.priority}
                  </span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${STATUS_COLORS[fb.status]}18`, color: STATUS_COLORS[fb.status] }}>
                    {fb.status.replace("_"," ")}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 12, color: "rgba(255,255,255,.4)" }}>
                  {new Date(fb.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 25 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20 }}>
          <button className="fb-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ background: "rgba(255,255,255,.07)", color: "white", opacity: page === 1 ? .3 : 1 }}>← Prev</button>
          <span style={{ padding: "8px 16px", fontSize: 13, color: "rgba(255,255,255,.5)" }}>
            Page {page} of {Math.ceil(total / 25)}
          </span>
          <button className="fb-btn" disabled={page >= Math.ceil(total / 25)} onClick={() => setPage(p => p + 1)}
            style={{ background: "rgba(255,255,255,.07)", color: "white", opacity: page >= Math.ceil(total / 25) ? .3 : 1 }}>Next →</button>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal" style={{ animation: "fadeUp .3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${TYPE_COLORS[selected.type]}18`, color: TYPE_COLORS[selected.type] }}>{selected.type}</span>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${STATUS_COLORS[selected.status]}18`, color: STATUS_COLORS[selected.status] }}>{selected.status.replace("_"," ")}</span>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${PRIORITY_COLORS[selected.priority]}18`, color: PRIORITY_COLORS[selected.priority] }}>{selected.priority}</span>
                </div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{selected.subject}</h2>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,.4)", fontSize: 20, cursor: "pointer", padding: 4 }}>✕</button>
            </div>

            <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 8 }}>MESSAGE</div>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.7)", lineHeight: 1.8 }}>{selected.message}</p>
            </div>

            {(selected.name || selected.email) && (
              <div style={{ display: "flex", gap: 16, marginBottom: 20, fontSize: 12, color: "rgba(255,255,255,.4)" }}>
                {selected.name && <span>👤 {selected.name}</span>}
                {selected.email && <span>✉️ {selected.email}</span>}
                <span>📅 {new Date(selected.createdAt).toLocaleString()}</span>
              </div>
            )}

            {/* Admin note */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", display: "block", marginBottom: 8 }}>ADMIN NOTE (internal)</label>
              <textarea className="fb-textarea" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Internal note — user ko nahi dikhi gi..." />
            </div>

            {/* Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              {[
                { label: "Mark In Review", status: "in_review", color: "#fbbf24" },
                { label: "Mark Resolved",  status: "resolved",  color: "#34d399" },
                { label: "Close",          status: "closed",    color: "#64748b" },
                { label: "Re-open",        status: "open",      color: "#f87171" },
              ].map(a => (
                <button key={a.status} className="fb-btn" onClick={() => update(selected.id, { status: a.status, adminNote: note })}
                  disabled={saving || selected.status === a.status}
                  style={{ background: `${a.color}20`, color: a.color, border: `1px solid ${a.color}30`, opacity: selected.status === a.status ? .35 : 1 }}>
                  {saving ? "..." : a.label}
                </button>
              ))}
            </div>

            {/* Priority */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)", alignSelf: "center" }}>Priority:</span>
              {["low","normal","high","urgent"].map(p => (
                <button key={p} className="fb-btn" onClick={() => update(selected.id, { priority: p, adminNote: note })}
                  disabled={saving || selected.priority === p}
                  style={{ background: `${PRIORITY_COLORS[p]}20`, color: PRIORITY_COLORS[p], border: `1px solid ${PRIORITY_COLORS[p]}30`, padding: "6px 14px", opacity: selected.priority === p ? .35 : 1 }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
