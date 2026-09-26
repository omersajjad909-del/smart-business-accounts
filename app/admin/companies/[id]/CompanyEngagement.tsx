"use client";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type Module = { key: string; label: string; total: number; last30: number; lastCreatedAt: string | null };
type PageRow = { page: string; views: number; lastViewed: string | null };
type Daily = { date: string; logins: number; views: number };
type UserRow = { id: string; name: string | null; email: string; lastLogin: string | null; lastSeen: string | null; totalLogins: number; logins30: number; views30: number };
type TimelineRow = { action: string; createdAt: string; user: string | null };
type EmailSent = { by: string; subject: string; to: string[]; createdAt: string };
type Usage = { modules: Module[]; pages: PageRow[]; daily: Daily[]; users: UserRow[]; timeline: TimelineRow[]; emailsSent: EmailSent[] };

export type Recipient = { id: string; name: string | null; email: string };

const CARD = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "rgba(255,255,255,.35)";

// Customer-facing copy stays in English. {{name}} / {{company}} are filled server-side.
const TEMPLATES: { id: string; label: string; subject: string; cta: string; message: string }[] = [
  {
    id: "miss-you",
    label: "We miss you",
    subject: "{{name}}, everything okay with FinovaOS?",
    cta: "Open FinovaOS",
    message:
      "Hi {{name}},\n\nWe noticed you haven't logged in to FinovaOS for a while, and wanted to check in.\n\nIs something getting in the way — a missing feature, something confusing, or just a busy few weeks? Whatever it is, we'd genuinely like to know so we can fix it for {{company}}.\n\nJust hit reply and tell us in a line or two. A real person on our team reads every reply.\n\nThanks,\nThe FinovaOS Team",
  },
  {
    id: "help",
    label: "Help getting started",
    subject: "Can we help you set up {{company}} on FinovaOS?",
    cta: "Continue setup",
    message:
      "Hi {{name}},\n\nGetting started with new accounting software can take some effort, so we'd like to make it easier.\n\nWe can help you import your opening balances, set up your chart of accounts, or create your first invoices — free of charge. Reply with a time that suits you and we'll set up a short call.\n\nBest regards,\nThe FinovaOS Team",
  },
  {
    id: "feedback",
    label: "Ask for feedback",
    subject: "Quick question about your FinovaOS experience",
    cta: "",
    message:
      "Hi {{name}},\n\nYou've been using FinovaOS with {{company}} for a little while now, and your feedback would help us a lot.\n\n1. What do you use FinovaOS for most?\n2. What's missing or frustrating?\n3. What would make you use it every day?\n\nJust reply to this email — even a one-line answer helps.\n\nThank you,\nThe FinovaOS Team",
  },
  { id: "custom", label: "Custom", subject: "", cta: "", message: "Hi {{name}},\n\n" },
];

function timeAgo(d: string | null) {
  if (!d) return "Never";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "/dashboard/sales-invoice/[id]" → "Sales Invoice › Detail" */
export function pageLabel(path: string) {
  const parts = path.replace(/^\/dashboard\/?/, "").split("/").filter(Boolean);
  if (parts.length === 0) return "Dashboard Home";
  return parts
    .map((p) => (p === "[id]" ? "Detail" : p.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())))
    .join(" › ");
}

export function activityLabel(action: string) {
  if (action.startsWith("CLIENT_PAGE_VIEW:")) return `Viewed ${pageLabel(action.slice("CLIENT_PAGE_VIEW:".length))}`;
  if (action === "ADMIN_EMAIL_SENT") return "Admin email sent";
  return action.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function SectionCard({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px 22px", minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)", textAlign: "center", padding: "20px 0", lineHeight: 1.6 }}>{children}</div>;
}

function BarList({ rows }: { rows: { label: string; value: number; sub?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((r) => (
        <div key={r.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4, gap: 10 }}>
            <span style={{ color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
            <span style={{ color: MUTED, whiteSpace: "nowrap" }}>{r.sub}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,.06)" }}>
            <div style={{ height: 6, borderRadius: 3, width: `${Math.max(2, (r.value / max) * 100)}%`, background: "linear-gradient(90deg,#4f46e5,#818cf8)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityStrip({ daily }: { daily: Daily[] }) {
  const max = Math.max(1, ...daily.map((d) => d.logins + d.views));
  const activeDays = daily.filter((d) => d.logins + d.views > 0).length;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 70 }}>
        {daily.map((d) => {
          const total = d.logins + d.views;
          return (
            <div key={d.date} title={`${d.date}: ${d.logins} login(s), ${d.views} page view(s)`}
              style={{ flex: 1, height: total ? `${Math.max(8, (total / max) * 100)}%` : 3, borderRadius: 3, background: total ? "#6366f1" : "rgba(255,255,255,.07)" }} />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTED, marginTop: 6 }}>
        <span>30 days ago</span>
        <span>Active on {activeDays} of 30 days</span>
        <span>Today</span>
      </div>
    </div>
  );
}

export function EmailComposer({ recipients, preselected, onClose, onSent, adminHeaders, companyRef }: {
  recipients: Recipient[];
  preselected: string[];
  onClose: () => void;
  onSent: () => void;
  adminHeaders: () => Record<string, string>;
  companyRef: string;
}) {
  const [selected, setSelected] = useState<string[]>(preselected);
  const [tpl, setTpl] = useState(TEMPLATES[0].id);
  const [subject, setSubject] = useState(TEMPLATES[0].subject);
  const [message, setMessage] = useState(TEMPLATES[0].message);
  const [cta, setCta] = useState(TEMPLATES[0].cta);
  const [sending, setSending] = useState(false);

  function applyTemplate(id: string) {
    const t = TEMPLATES.find((x) => x.id === id)!;
    setTpl(id); setSubject(t.subject); setMessage(t.message); setCta(t.cta);
  }

  async function send() {
    if (!selected.length) { toast.error("Select at least one recipient"); return; }
    if (!subject.trim() || !message.trim()) { toast.error("Subject and message are required"); return; }
    setSending(true);
    try {
      const r = await fetch(`/api/admin/companies/${companyRef}/email`, {
        method: "POST",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selected, subject, message, ctaLabel: cta }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed to send");
      toast.success(d.failed ? `Sent to ${d.sent}, failed for ${d.failed}` : `Email sent to ${d.sent} user${d.sent > 1 ? "s" : ""}`);
      onSent();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to send email");
    } finally { setSending(false); }
  }

  const input: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,.06)",
    color: "#e2e8f0", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6, letterSpacing: ".06em" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", background: "#0f1225", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#e2e8f0" }}>Email users</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: MUTED, fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <span style={lbl}>RECIPIENTS</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {recipients.map((u) => (
              <label key={u.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#cbd5e1", cursor: "pointer" }}>
                <input type="checkbox" checked={selected.includes(u.id)}
                  onChange={(e) => setSelected((s) => e.target.checked ? [...s, u.id] : s.filter((x) => x !== u.id))} />
                {u.name || "—"} <span style={{ color: "#38bdf8", fontFamily: "monospace", fontSize: 12 }}>{u.email}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <span style={lbl}>TEMPLATE</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => applyTemplate(t.id)} style={{
                padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${tpl === t.id ? "#6366f1" : BORDER}`, background: tpl === t.id ? "rgba(99,102,241,.18)" : "transparent",
                color: tpl === t.id ? "#c7d2fe" : "#94a3b8",
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <span style={lbl}>SUBJECT</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} style={input} maxLength={200} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <span style={lbl}>MESSAGE</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={11} style={{ ...input, resize: "vertical", lineHeight: 1.6 }} maxLength={5000} />
          <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
            <code>{"{{name}}"}</code> and <code>{"{{company}}"}</code> are replaced for each recipient. Replies go to support@finovaos.app.
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <span style={lbl}>BUTTON TEXT (optional — links to dashboard)</span>
          <input value={cta} onChange={(e) => setCta(e.target.value)} style={input} maxLength={60} placeholder="e.g. Open FinovaOS" />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "transparent", color: "#cbd5e1", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={send} disabled={sending} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "white", fontSize: 13, fontWeight: 700, cursor: sending ? "wait" : "pointer", opacity: sending ? 0.7 : 1 }}>
            {sending ? "Sending…" : `Send to ${selected.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CompanyEngagement({ companyRef, adminHeaders, lastLogin, recipients }: {
  companyRef: string;
  adminHeaders: () => Record<string, string>;
  lastLogin: string | null;
  recipients: Recipient[];
}) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [composeFor, setComposeFor] = useState<string[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/admin/companies/${companyRef}/usage`, { headers: adminHeaders(), cache: "no-store" });
        if (r.ok) setUsage(await r.json());
      } finally { setLoading(false); }
    })();
    // adminHeaders is a stable module-level helper in the parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyRef, reloadKey]);

  const daysInactive = lastLogin ? Math.floor((Date.now() - new Date(lastLogin).getTime()) / 86400000) : null;
  const inactive = daysInactive === null || daysInactive >= 7;
  const allIds = useMemo(() => recipients.map((r) => r.id), [recipients]);

  const btn: React.CSSProperties = { padding: "8px 14px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" };

  return (
    <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#e2e8f0" }}>Usage &amp; Engagement</div>
        <button onClick={() => setComposeFor(allIds)} style={btn}>✉️ Email users</button>
      </div>

      {inactive && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "14px 18px", borderRadius: 12, background: "rgba(249,115,22,.08)", border: "1px solid rgba(249,115,22,.25)" }}>
          <div style={{ fontSize: 13, color: "#fdba74" }}>
            {daysInactive === null ? "No one from this company has logged in yet." : `No login for ${daysInactive} days.`} A short check-in email can bring them back.
          </div>
          <button onClick={() => setComposeFor(allIds)} style={{ ...btn, background: "#f97316" }}>Send check-in email</button>
        </div>
      )}

      {loading ? (
        <SectionCard title="Loading usage…"><Empty>Loading…</Empty></SectionCard>
      ) : !usage ? (
        <SectionCard title="Usage"><Empty>Could not load usage data.</Empty></SectionCard>
      ) : (
        <>
          <SectionCard title="Activity — last 30 days"><ActivityStrip daily={usage.daily} /></SectionCard>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}>
            <SectionCard title="Features they use (records created)">
              {usage.modules.length === 0 ? <Empty>No records created yet — they haven't started using any module.</Empty> : (
                <BarList rows={usage.modules.map((m) => ({ label: m.label, value: m.total, sub: `${m.total} total · ${m.last30} in 30d · last ${timeAgo(m.lastCreatedAt)}` }))} />
              )}
            </SectionCard>
            <SectionCard title="Most visited pages (30d)">
              {usage.pages.length === 0 ? <Empty>No page views recorded.<br />Page views are only tracked when the user allows analytics cookies.</Empty> : (
                <BarList rows={usage.pages.map((p) => ({ label: pageLabel(p.page), value: p.views, sub: `${p.views} views · ${timeAgo(p.lastViewed)}` }))} />
              )}
            </SectionCard>
          </div>

          <SectionCard title="User engagement">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead>
                  <tr>
                    {["User", "Last seen", "Logins (30d)", "Page views (30d)", "Total logins", ""].map((h) => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 800, letterSpacing: ".08em", color: "rgba(255,255,255,.3)", textTransform: "uppercase", borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usage.users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "10px", fontSize: 13, color: "#cbd5e1" }}>
                        {u.name || "—"}<div style={{ fontSize: 11, color: "#38bdf8", fontFamily: "monospace" }}>{u.email}</div>
                      </td>
                      <td style={{ padding: "10px", fontSize: 12, color: "#cbd5e1" }}>{timeAgo(u.lastSeen)}</td>
                      <td style={{ padding: "10px", fontSize: 12, color: "#cbd5e1" }}>{u.logins30}</td>
                      <td style={{ padding: "10px", fontSize: 12, color: "#cbd5e1" }}>{u.views30}</td>
                      <td style={{ padding: "10px", fontSize: 12, color: "#cbd5e1" }}>{u.totalLogins}</td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        <button onClick={() => setComposeFor([u.id])} style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: "#c7d2fe", fontSize: 12, cursor: "pointer" }}>✉️ Email</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}>
            <SectionCard title="Activity timeline">
              {usage.timeline.length === 0 ? <Empty>No activity yet.</Empty> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 360, overflowY: "auto" }}>
                  {usage.timeline.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: a.action.startsWith("CLIENT_PAGE_VIEW:") ? "#38bdf8" : "#6366f1", marginTop: 5, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12, color: "#cbd5e1" }}>{activityLabel(a.action)}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2 }}>{a.user ? `${a.user} · ` : ""}{timeAgo(a.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
            <SectionCard title="Emails sent by admin">
              {usage.emailsSent.length === 0 ? <Empty>No outreach emails sent yet.</Empty> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {usage.emailsSent.map((e, i) => (
                    <div key={i} style={{ fontSize: 12 }}>
                      <div style={{ color: "#cbd5e1", fontWeight: 600 }}>{e.subject}</div>
                      <div style={{ color: "rgba(255,255,255,.3)", marginTop: 2 }}>to {e.to.join(", ") || "—"} · by {e.by} · {timeAgo(e.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}

      {composeFor && (
        <EmailComposer
          recipients={recipients}
          preselected={composeFor}
          onClose={() => setComposeFor(null)}
          onSent={() => setReloadKey((k) => k + 1)}
          adminHeaders={adminHeaders}
          companyRef={companyRef}
        />
      )}
    </div>
  );
}
