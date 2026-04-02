"use client";
import { useEffect, useState } from "react";

export default function AdminNewsletterPage() {
  const [items, setItems]         = useState<any[]>([]);
  const [total, setTotal]         = useState(0);
  const [activeCount, setActive]  = useState(0);
  const [unsubCount, setUnsub]    = useState(0);
  const [status, setStatus]       = useState("active");
  const [page, setPage]           = useState(1);
  const [loading, setLoad]        = useState(true);

  // Broadcast modal
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [subject, setSubject]   = useState("");
  const [bodyText, setBodyText] = useState("");
  const [preview, setPreview]   = useState<number | null>(null);
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState<{ sent: number; total: number } | null>(null);

  async function load() {
    setLoad(true);
    try {
      const params = new URLSearchParams({ status, page: String(page) });
      const r = await fetch(`/api/admin/newsletter?${params}`);
      const d = await r.json();
      setItems(d.items || []);
      setTotal(d.total || 0);
      setActive(d.activeCount || 0);
      setUnsub(d.unsubCount || 0);
    } finally { setLoad(false); }
  }

  useEffect(() => { load(); }, [status, page]);

  async function checkPreview() {
    setSending(true);
    const r = await fetch("/api/admin/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, html: bodyText, preview: true }),
    });
    const d = await r.json();
    setPreview(d.count);
    setSending(false);
  }

  async function broadcast() {
    if (!subject || !bodyText) return;
    setSending(true);
    const r = await fetch("/api/admin/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">${bodyText}</div>` }),
    });
    const d = await r.json();
    setSent({ sent: d.sent, total: d.total });
    setSending(false);
  }

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 60px" }}>
      <style>{`
        .nl-sel { background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:10px; padding:8px 14px; color:white; font-family:inherit; font-size:13px; outline:none; }
        .nl-btn { border:none; border-radius:10px; padding:9px 20px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; transition:opacity .2s; }
        .nl-btn:hover { opacity:.85; }
        .nl-input { width:100%; background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:10px; padding:12px; color:white; font-family:inherit; font-size:13px; outline:none; box-sizing:border-box; }
        .nl-input:focus { border-color:rgba(99,102,241,.4); }
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,.65); z-index:100; display:flex; align-items:center; justify-content:center; padding:24px; }
        .modal { background:#0f1629; border:1px solid rgba(255,255,255,.1); border-radius:20px; padding:32px; width:100%; max-width:580px; max-height:88vh; overflow-y:auto; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Newsletter Subscribers</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>جن لوگوں نے subscribe کیا ہے ان کی list اور broadcast</p>
        </div>
        <button className="nl-btn" onClick={() => { setShowBroadcast(true); setSent(null); setPreview(null); }}
          style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", display: "flex", alignItems: "center", gap: 8 }}>
          📧 Email Bhejo
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Active Subscribers", val: activeCount, color: "#34d399" },
          { label: "Unsubscribed",       val: unsubCount,  color: "#f87171" },
          { label: "Total Ever",         val: activeCount + unsubCount, color: "#818cf8" },
        ].map(k => (
          <div key={k.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 4, fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <select className="nl-sel" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="active">Active</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              {["Email","Naam","Source","Status","Date"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".07em" }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.3)" }}>Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.3)" }}>کوئی subscriber نہیں</td></tr>
            ) : items.map((s: any) => (
              <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600 }}>{s.email}</td>
                <td style={{ padding: "13px 16px", fontSize: 13, color: "rgba(255,255,255,.6)" }}>{s.name || "—"}</td>
                <td style={{ padding: "13px 16px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(99,102,241,.15)", color: "#a5b4fc" }}>
                    {s.source || "website"}
                  </span>
                </td>
                <td style={{ padding: "13px 16px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.status === "active" ? "rgba(52,211,153,.15)" : "rgba(248,113,113,.15)", color: s.status === "active" ? "#34d399" : "#f87171" }}>
                    {s.status}
                  </span>
                </td>
                <td style={{ padding: "13px 16px", fontSize: 12, color: "rgba(255,255,255,.4)" }}>
                  {new Date(s.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20 }}>
          <button className="nl-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ background: "rgba(255,255,255,.07)", color: "white", opacity: page === 1 ? .3 : 1 }}>← Prev</button>
          <span style={{ padding: "8px 16px", fontSize: 13, color: "rgba(255,255,255,.5)" }}>{page} / {Math.ceil(total / 50)}</span>
          <button className="nl-btn" disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)}
            style={{ background: "rgba(255,255,255,.07)", color: "white", opacity: page >= Math.ceil(total / 50) ? .3 : 1 }}>Next →</button>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowBroadcast(false)}>
          <div className="modal" style={{ animation: "fadeUp .3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>📧 Subscribers کو Email Bhejo</h2>
              <button onClick={() => setShowBroadcast(false)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,.4)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            {sent ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
                <h3 style={{ margin: "0 0 8px", color: "#34d399" }}>Email Bhej Di Gayi!</h3>
                <p style={{ color: "rgba(255,255,255,.5)", fontSize: 14 }}>{sent.sent} / {sent.total} subscribers کو successfully deliver ہوئی</p>
                <button className="nl-btn" onClick={() => setShowBroadcast(false)} style={{ background: "#6366f1", color: "white", marginTop: 20 }}>Close</button>
              </div>
            ) : (
              <>
                <div style={{ background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#a5b4fc" }}>
                  📊 {activeCount} active subscribers کو email jayegi
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", display: "block", marginBottom: 8 }}>EMAIL SUBJECT *</label>
                  <input className="nl-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Maslan: Finova ka naya feature launch!" />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", display: "block", marginBottom: 8 }}>MESSAGE / HTML *</label>
                  <textarea className="nl-input" rows={8} value={bodyText} onChange={e => setBodyText(e.target.value)}
                    placeholder="Email ka content likhein (plain text ya HTML)..." style={{ resize: "vertical" }} />
                </div>

                {preview !== null && (
                  <div style={{ background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#fbbf24" }}>
                    ✅ Preview OK — {preview} subscribers ko jayegi. Confirm karein?
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  {preview === null ? (
                    <button className="nl-btn" onClick={checkPreview} disabled={!subject || !bodyText || sending}
                      style={{ background: "rgba(251,191,36,.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,.25)", flex: 1 }}>
                      {sending ? "Check kar raha hai..." : "Preview Check Karo"}
                    </button>
                  ) : (
                    <button className="nl-btn" onClick={broadcast} disabled={sending}
                      style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", flex: 1 }}>
                      {sending ? "Bhej raha hai..." : `✅ Confirm — ${activeCount} ko Bhejo`}
                    </button>
                  )}
                  <button className="nl-btn" onClick={() => setPreview(null)} style={{ background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.6)" }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
