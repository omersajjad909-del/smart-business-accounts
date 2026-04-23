"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Broadcast = {
  id: string;
  subject?: string;
  body?: string;
  audience?: string;
  plan?: string;
  sentTo?: number;
  channel?: string;
  createdAt: string;
  note?: string;
};

export default function AdminBroadcastsPage() {
  const [items, setItems] = useState<Broadcast[] | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [plan, setPlan] = useState("PRO");
  const [channel, setChannel] = useState("email");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const u = getCurrentUser();
    const headers: Record<string, string> = {};
    if (u?.role) headers["x-user-role"] = u.role;
    if (u?.id) headers["x-user-id"] = u.id;

    try {
      const r = await fetch("/api/admin/broadcasts", {
        cache: "no-store",
        headers,
        credentials: "include" as RequestCredentials,
      });
      const data = await r.json();
      setItems(r.ok ? data.broadcasts || [] : []);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit() {
    const u = getCurrentUser();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (u?.role) headers["x-user-role"] = u.role;
    if (u?.id) headers["x-user-id"] = u.id;

    setSending(true);
    setMessage(null);
    try {
      const r = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers,
        credentials: "include" as RequestCredentials,
        body: JSON.stringify({ subject, body, audience, plan, channel }),
      });
      const data = await r.json();
      if (r.ok) {
        setMessage(`Broadcast sent successfully to ${data.sentTo ?? 0} recipients.`);
        setSubject("");
        setBody("");
        load();
      } else {
        setMessage(data.error || "Failed to send broadcast.");
      }
    } catch {
      setMessage("Failed to send broadcast.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="broadcasts-page">
      <style>{styles}</style>

      <div className="page-head">
        <div>
          <h1>Broadcasts</h1>
          <p>Send campaigns to users and review the most recent broadcast history.</p>
        </div>
      </div>

      <div className="broadcasts-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Create Broadcast</h2>
            <span>Admin messaging</span>
          </div>
          <div className="form-grid">
            <select value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            <select value={audience} onChange={(e) => setAudience(e.target.value)}>
              <option value="all">All Users</option>
              <option value="active">Active Subscribers</option>
              <option value="trial">Trial Users</option>
              <option value="churned">Churned Users</option>
              <option value="plan">Specific Plan</option>
            </select>
            {audience === "plan" ? (
              <select value={plan} onChange={(e) => setPlan(e.target.value)}>
                <option value="STARTER">Starter</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            ) : null}
          </div>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="Write your broadcast message..." />
          {message ? <div className="message-box">{message}</div> : null}
          <button type="button" className="primary-btn" disabled={sending || !body || (channel === "email" && !subject)} onClick={submit}>
            {sending ? "Sending..." : "Send Broadcast"}
          </button>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Recent Broadcasts</h2>
            <span>Last 50</span>
          </div>
          {!items ? (
            <div className="empty-state">Loading broadcasts...</div>
          ) : items.length === 0 ? (
            <div className="empty-state">No broadcasts found.</div>
          ) : (
            <div className="history-list">
              {items.map((item) => (
                <article key={item.id} className="history-item">
                  <div className="history-top">
                    <strong>{item.subject || "Untitled Broadcast"}</strong>
                    <span className="tag">{item.channel || "email"}</span>
                  </div>
                  <p>{item.body || item.note || "Broadcast record available in history."}</p>
                  <div className="history-meta">
                    <span>Audience: {item.audience || "all"}</span>
                    <span>Sent: {item.sentTo ?? 0}</span>
                    <span>{new Date(item.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const styles = `
.broadcasts-page{display:grid;gap:18px}
.page-head h1{margin:0;font-size:34px;font-weight:800;letter-spacing:-.05em}
.page-head p{margin:6px 0 0;color:rgba(203,213,225,.72);font-size:14px}
.broadcasts-grid{display:grid;grid-template-columns:1.15fr .95fr;gap:16px}
.panel{padding:18px;border-radius:22px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg, rgba(19,27,46,.98), rgba(15,22,39,.96));box-shadow:0 24px 70px rgba(3,6,18,.22)}
.panel-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:16px}
.panel-head h2{margin:0;font-size:20px;font-weight:800}
.panel-head span{color:#bca9ff;font-size:12px;font-weight:700}
.form-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:12px}
.panel input,.panel select,.panel textarea{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px 13px;color:white;font:inherit;box-sizing:border-box}
.panel textarea{margin-top:12px;resize:vertical}
.message-box{margin-top:12px;padding:12px 13px;border-radius:12px;background:rgba(124,58,237,.12);color:#d8ccff;font-size:13px}
.primary-btn{margin-top:14px;border:none;border-radius:14px;padding:12px 16px;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:white;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.primary-btn:disabled{opacity:.55;cursor:not-allowed}
.history-list{display:grid;gap:12px}
.history-item{padding:14px;border-radius:16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)}
.history-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.history-top strong{font-size:14px}
.history-item p{margin:8px 0;color:rgba(203,213,225,.68);font-size:12px;line-height:1.5}
.history-meta{display:flex;flex-wrap:wrap;gap:12px;color:rgba(148,163,184,.78);font-size:11px}
.tag{padding:4px 8px;border-radius:999px;background:rgba(34,197,94,.14);color:#86efac;font-size:10px;font-weight:700;text-transform:uppercase}
.empty-state{padding:26px 6px;color:rgba(148,163,184,.72);font-size:13px}
@media (max-width: 1100px){.broadcasts-grid{grid-template-columns:1fr}.form-grid{grid-template-columns:1fr 1fr}}
@media (max-width: 640px){.page-head h1{font-size:26px}.panel{padding:14px;border-radius:18px}.form-grid{grid-template-columns:1fr}}
`;
