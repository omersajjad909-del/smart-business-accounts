"use client";

import { useEffect, useState } from "react";

type Subscriber = {
  id: string;
  email: string;
  name?: string | null;
  company?: string | null;
  source?: string | null;
  status: string;
  createdAt: string;
};

export default function AdminNewsletterPage() {
  const [items, setItems] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [activeCount, setActive] = useState(0);
  const [unsubCount, setUnsub] = useState(0);
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [loading, setLoad] = useState(true);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [preview, setPreview] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ sent: number; total: number } | null>(null);
  const [showPreviewPane, setShowPreviewPane] = useState(false);

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
    } finally {
      setLoad(false);
    }
  }

  useEffect(() => {
    load();
  }, [status, page]);

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

  function buildEmailHtml(subj: string, body: string) {
    const escaped = body.replace(/\n/g, "<br/>");
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#4f46e5,#6366f1);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
        <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Finova<span style="color:#a5b4fc;">OS</span></div>
        <div style="font-size:12px;color:rgba(255,255,255,.65);margin-top:4px;letter-spacing:.08em;text-transform:uppercase;">Business Suite</div>
      </td></tr>

      <!-- Body -->
      <tr><td style="background:#ffffff;padding:40px 40px 32px;">
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f172a;line-height:1.3;">${subj}</h1>
        <div style="width:48px;height:3px;background:linear-gradient(90deg,#6366f1,#818cf8);border-radius:2px;margin-bottom:28px;"></div>
        <div style="font-size:15px;color:#334155;line-height:1.75;">${escaped}</div>
      </td></tr>

      <!-- CTA -->
      <tr><td style="background:#ffffff;padding:0 40px 36px;text-align:center;">
        <a href="https://finovaos.app" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 32px;border-radius:10px;letter-spacing:.02em;">
          Visit FinovaOS →
        </a>
      </td></tr>

      <!-- Divider -->
      <tr><td style="background:#ffffff;padding:0 40px;">
        <div style="border-top:1px solid #e2e8f0;"></div>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#ffffff;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
        <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">You are receiving this email because you subscribed to FinovaOS updates.</p>
        <p style="margin:0;font-size:12px;color:#94a3b8;">
          <a href="https://finovaos.app/unsubscribe" style="color:#6366f1;text-decoration:none;">Unsubscribe</a>
          &nbsp;·&nbsp;
          <a href="https://finovaos.app" style="color:#6366f1;text-decoration:none;">finovaos.app</a>
        </p>
      </td></tr>

      <!-- Bottom strip -->
      <tr><td style="padding:20px 0;text-align:center;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">© 2026 FinovaOS. All rights reserved.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
  }

  async function broadcast() {
    if (!subject || !bodyText) return;
    setSending(true);
    const r = await fetch("/api/admin/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, html: buildEmailHtml(subject, bodyText) }),
    });
    const d = await r.json();
    setSent({ sent: d.sent, total: d.total });
    setSending(false);
  }

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 60px" }}>
      <style>{styles}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Newsletter Subscribers</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
            View subscribers, filter their status, and send email broadcasts.
          </p>
        </div>
        <button
          className="nl-btn"
          onClick={() => {
            setShowBroadcast(true);
            setSent(null);
            setPreview(null);
          }}
          style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", display: "flex", alignItems: "center", gap: 8 }}
        >
          Send Email
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Active Subscribers", val: activeCount, color: "#34d399" },
          { label: "Unsubscribed", val: unsubCount, color: "#f87171" },
          { label: "Total Subscribers", val: activeCount + unsubCount, color: "#818cf8" },
        ].map((k) => (
          <div key={k.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 4, fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <select className="nl-sel" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="active">Active</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="all">All</option>
        </select>
      </div>

      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              {["Email", "Name", "Source", "Status", "Date"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".07em" }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.3)" }}>Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.3)" }}>No subscribers found</td></tr>
            ) : items.map((s) => (
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

      {total > 50 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20 }}>
          <button className="nl-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={{ background: "rgba(255,255,255,.07)", color: "white", opacity: page === 1 ? 0.3 : 1 }}>
            Previous
          </button>
          <span style={{ padding: "8px 16px", fontSize: 13, color: "rgba(255,255,255,.5)" }}>{page} / {Math.ceil(total / 50)}</span>
          <button className="nl-btn" disabled={page >= Math.ceil(total / 50)} onClick={() => setPage((p) => p + 1)} style={{ background: "rgba(255,255,255,.07)", color: "white", opacity: page >= Math.ceil(total / 50) ? 0.3 : 1 }}>
            Next
          </button>
        </div>
      )}

      {showBroadcast && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setShowBroadcast(false)}>
          <div className="modal" style={{ animation: "fadeUp .3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Email Subscribers</h2>
              <button onClick={() => setShowBroadcast(false)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,.4)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            {sent ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
                <h3 style={{ margin: "0 0 8px", color: "#34d399" }}>Broadcast Sent</h3>
                <p style={{ color: "rgba(255,255,255,.5)", fontSize: 14 }}>
                  {sent.sent} of {sent.total} subscriber emails were delivered successfully.
                </p>
                <button className="nl-btn" onClick={() => setShowBroadcast(false)} style={{ background: "#6366f1", color: "white", marginTop: 20 }}>Close</button>
              </div>
            ) : (
              <>
                <div style={{ background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#a5b4fc" }}>
                  📧 This email will be sent to <strong>{activeCount}</strong> active subscribers.
                </div>

                {/* Tab Toggle */}
                <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,.05)", borderRadius: 10, padding: 4, marginBottom: 20 }}>
                  {["Compose", "Preview"].map(tab => (
                    <button key={tab} onClick={() => setShowPreviewPane(tab === "Preview")}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        background: (tab === "Preview") === showPreviewPane ? "#6366f1" : "transparent",
                        color: (tab === "Preview") === showPreviewPane ? "#fff" : "rgba(255,255,255,.45)" }}>
                      {tab === "Compose" ? "✏️ Compose" : "👁 Preview"}
                    </button>
                  ))}
                </div>

                {!showPreviewPane ? (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", display: "block", marginBottom: 8 }}>EMAIL SUBJECT *</label>
                      <input className="nl-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. New features just launched — FinovaOS" />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", display: "block", marginBottom: 8 }}>MESSAGE *</label>
                      <textarea className="nl-input" rows={9} value={bodyText} onChange={(e) => setBodyText(e.target.value)}
                        placeholder={"Write your message here...\n\nNew paragraphs will be preserved.\nNo HTML needed — just write naturally."} style={{ resize: "vertical", lineHeight: 1.6 }} />
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 6 }}>Plain text only — the professional email design is applied automatically.</div>
                    </div>
                  </>
                ) : (
                  <div style={{ marginBottom: 20, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)" }}>
                    {subject && bodyText ? (
                      <iframe
                        srcDoc={buildEmailHtml(subject || "Your Subject", bodyText || "Your message here.")}
                        style={{ width: "100%", height: 480, border: "none", background: "#fff" }}
                        title="Email Preview"
                      />
                    ) : (
                      <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 13 }}>
                        Fill in subject and message first to see the preview.
                      </div>
                    )}
                  </div>
                )}

                {preview !== null && (
                  <div style={{ background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#34d399" }}>
                    ✓ Ready to send to {preview} subscribers.
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  {preview === null ? (
                    <button className="nl-btn" onClick={checkPreview} disabled={!subject || !bodyText || sending}
                      style={{ background: "rgba(251,191,36,.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,.25)", flex: 1 }}>
                      {sending ? "Checking..." : "Check & Confirm"}
                    </button>
                  ) : (
                    <button className="nl-btn" onClick={broadcast} disabled={sending}
                      style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", flex: 1 }}>
                      {sending ? "Sending..." : `🚀 Send to ${activeCount} subscribers`}
                    </button>
                  )}
                  <button className="nl-btn" onClick={() => { setShowBroadcast(false); setPreview(null); setShowPreviewPane(false); }}
                    style={{ background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.6)" }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = `
  .nl-sel { background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:10px; padding:8px 14px; color:white; font-family:inherit; font-size:13px; outline:none; }
  .nl-btn { border:none; border-radius:10px; padding:9px 20px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; transition:opacity .2s; }
  .nl-btn:hover { opacity:.85; }
  .nl-input { width:100%; background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:10px; padding:12px; color:white; font-family:inherit; font-size:13px; outline:none; box-sizing:border-box; }
  .nl-input:focus { border-color:rgba(99,102,241,.4); }
  .overlay { position:fixed; inset:0; background:rgba(0,0,0,.65); z-index:100; display:flex; align-items:center; justify-content:center; padding:24px; }
  .modal { background:#0f1629; border:1px solid rgba(255,255,255,.1); border-radius:20px; padding:32px; width:100%; max-width:580px; max-height:88vh; overflow-y:auto; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
`;
