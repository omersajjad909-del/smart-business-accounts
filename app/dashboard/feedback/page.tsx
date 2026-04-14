"use client";
import { fmtDate } from "@/lib/dateUtils";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type FeedbackType = "complaint" | "suggestion" | "bug" | "general";

const TYPES: {
  id: FeedbackType; label: string; icon: string; color: string;
  desc: string; placeholder: string;
}[] = [
  {
    id: "complaint", label: "Complaint", icon: "⚠️", color: "#f87171",
    desc: "Koi masla ya pareshani",
    placeholder: "Kiya masla aaya? Kis page pe, kiya hua, kab se ho raha hai — tafseel mein batayein...",
  },
  {
    id: "suggestion", label: "Suggestion", icon: "💡", color: "#fbbf24",
    desc: "Naya idea ya improvement",
    placeholder: "Aapka idea kiya hai? Kiya feature add ho ya kaise behtar ho sakta hai...",
  },
  {
    id: "bug", label: "Bug Report", icon: "🐛", color: "#a78bfa",
    desc: "Technical error ya kharabi",
    placeholder: "Kaunsa page, kiya hua, kiya expect tha, browser/device bhi batayein...",
  },
  {
    id: "general", label: "General", icon: "💬", color: "#60a5fa",
    desc: "Koi aur baat",
    placeholder: "Jo bhi kehna ho batayein...",
  },
];

const PRIORITIES = [
  { value: "low",    label: "Low",    color: "#34d399" },
  { value: "normal", label: "Normal", color: "#60a5fa" },
  { value: "high",   label: "High",   color: "#fbbf24" },
  { value: "urgent", label: "Urgent", color: "#f87171" },
];

const MODULES = [
  "Dashboard", "Sales & Invoices", "Purchase Orders", "Inventory",
  "Accounting / Vouchers", "HR & Payroll", "CRM", "Reports",
  "Users & Permissions", "Notifications", "Billing & Plan",
  "AI Features", "Other",
];

const STATUS_META: Record<string, { label: string; color: string }> = {
  open:        { label: "Open",        color: "#60a5fa" },
  in_progress: { label: "In Progress", color: "#fbbf24" },
  resolved:    { label: "Resolved",    color: "#34d399" },
  closed:      { label: "Closed",      color: "#64748b" },
};

type HistoryItem = {
  id: string; type: string; subject: string;
  status: string; priority: string; createdAt: string;
};

export default function FeedbackPage() {
  const user = getCurrentUser();

  const [fbType,   setFbType]   = useState<FeedbackType>("complaint");
  const [subject,  setSubject]  = useState("");
  const [message,  setMessage]  = useState("");
  const [priority, setPriority] = useState("normal");
  const [module,   setModule]   = useState("");
  const [submitting, setSub]    = useState(false);
  const [done,     setDone]     = useState<{ id: string } | null>(null);
  const [error,    setError]    = useState("");
  const [history,  setHistory]  = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingH] = useState(true);

  const activeType = TYPES.find(t => t.id === fbType)!;

  function getHeaders() {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (user?.id)        h["x-user-id"]    = user.id;
    if (user?.companyId) h["x-company-id"] = user.companyId;
    if (user?.role)      h["x-user-role"]  = user.role;
    return h;
  }

  useEffect(() => {
    fetch("/api/public/feedback", { headers: getHeaders() })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => setHistory(d.items || []))
      .catch(() => {})
      .finally(() => setLoadingH(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  async function submit() {
    if (!subject.trim()) { setError("Subject likhein."); return; }
    if (message.trim().length < 20) { setError("Message kam az kam 20 huroof ka hona chahiye."); return; }
    setSub(true); setError("");
    try {
      const res = await fetch("/api/public/feedback", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          type: fbType,
          subject: subject.trim(),
          message: message.trim(),
          priority,
          module: module || undefined,
          email: user?.email || undefined,
          name:  user?.name  || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDone({ id: data.id });
      setSubject(""); setMessage(""); setPriority("normal"); setModule("");
    } catch (e: any) {
      setError(e.message);
    } finally { setSub(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 13px", borderRadius: "8px",
    border: "1px solid var(--border)", background: "var(--app-bg)",
    color: "var(--text-primary)", fontSize: "13px", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "11px", fontWeight: 600, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "7px",
  };
  const card: React.CSSProperties = {
    background: "var(--panel-bg)", border: "1px solid var(--border)",
    borderRadius: "14px", padding: "24px",
  };

  return (
    <div style={{ padding: "32px", maxWidth: "760px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          Feedback & Complaints
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
          Koi masla, idea, ya bug — hamen batayein, hum suntay hain
        </p>
      </div>

      {/* Success state */}
      {done && (
        <div style={{
          ...card, marginBottom: "20px",
          background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.25)",
          textAlign: "center", padding: "40px 24px",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#34d399", marginBottom: "6px" }}>
            Mila! Shukriya
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>
            Aapka {activeType.label} hamare paas pahuncha. Hum jald review karenge.
          </div>
          <div style={{
            display: "inline-block", padding: "4px 12px", borderRadius: "6px",
            background: "var(--app-bg)", border: "1px solid var(--border)",
            fontSize: "11px", fontFamily: "monospace", color: "var(--text-muted)", marginBottom: "20px",
          }}>
            Ticket #{done.id.slice(-8).toUpperCase()}
          </div>
          <br />
          <button
            onClick={() => setDone(null)}
            style={{
              padding: "9px 22px", borderRadius: "8px", border: "none",
              background: "#6366f1", color: "#fff", fontSize: "13px",
              fontWeight: 600, cursor: "pointer",
            }}
          >
            Aur likhen
          </button>
        </div>
      )}

      {!done && (
        <div style={card}>
          {/* Type selector */}
          <div style={{ marginBottom: "22px" }}>
            <label style={labelStyle}>Type select karein</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              {TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setFbType(t.id); setError(""); }}
                  style={{
                    padding: "12px 8px", borderRadius: "10px", border: "none", cursor: "pointer",
                    background: fbType === t.id ? `${t.color}18` : "var(--app-bg)",
                    border: `1.5px solid ${fbType === t.id ? t.color + "60" : "var(--border)"}`,
                    textAlign: "center", transition: "all .15s",
                  }}
                >
                  <div style={{ fontSize: "20px", marginBottom: "4px" }}>{t.icon}</div>
                  <div style={{
                    fontSize: "12px", fontWeight: 700,
                    color: fbType === t.id ? t.color : "var(--text-primary)",
                  }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                    {t.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div style={{ marginBottom: "14px" }}>
            <label style={labelStyle}>Subject <span style={{ color: "#ef4444" }}>*</span></label>
            <input
              style={inputStyle}
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={`${activeType.label} ka mukhtasar unwaan`}
            />
          </div>

          {/* Priority + Module row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
            <div>
              <label style={labelStyle}>Priority</label>
              <div style={{ display: "flex", gap: "6px" }}>
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    style={{
                      flex: 1, padding: "7px 4px", borderRadius: "7px", border: "none",
                      cursor: "pointer", fontSize: "11px", fontWeight: 600,
                      background: priority === p.value ? `${p.color}18` : "var(--app-bg)",
                      border: `1px solid ${priority === p.value ? p.color + "50" : "var(--border)"}`,
                      color: priority === p.value ? p.color : "var(--text-muted)",
                      transition: "all .15s",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Affected Module (optional)</label>
              <select
                value={module}
                onChange={e => setModule(e.target.value)}
                style={{ ...inputStyle, paddingRight: "28px" }}
              >
                <option value="">Select module...</option>
                {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Message */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Details <span style={{ color: "#ef4444" }}>*</span></label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={activeType.placeholder}
              rows={6}
              style={{
                ...inputStyle, resize: "vertical", lineHeight: "1.7",
                fontFamily: "inherit",
              }}
            />
            <div style={{
              fontSize: "11px", marginTop: "5px", textAlign: "right",
              color: message.length < 20 ? "#f87171" : "var(--text-muted)",
            }}>
              {message.length} huroof (kam az kam 20)
            </div>
          </div>

          {/* User info strip */}
          {user && (
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 14px", borderRadius: "8px", marginBottom: "16px",
              background: "var(--app-bg)", border: "1px solid var(--border)",
            }}>
              <div style={{
                width: "30px", height: "30px", borderRadius: "50%",
                background: "#6366f1", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#fff", flexShrink: 0,
              }}>
                {(user.name || user.email || "U")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                  {user.name || "User"}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{user.email}</div>
              </div>
              <div style={{
                fontSize: "10px", padding: "2px 8px", borderRadius: "10px",
                background: "rgba(99,102,241,0.1)", color: "#818cf8",
                border: "1px solid rgba(99,102,241,0.2)", fontWeight: 600,
              }}>
                {user.role}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: "8px", marginBottom: "14px",
              background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)",
              fontSize: "13px", color: "#f87171",
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={submit} disabled={submitting}
            style={{
              padding: "11px 28px", borderRadius: "9px", border: "none",
              background: submitting ? "var(--border)" : activeType.color,
              color: submitting ? "var(--text-muted)" : "#fff",
              fontSize: "14px", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer",
              transition: "all .2s",
            }}
          >
            {submitting ? "Bheja ja raha hai…" : `${activeType.icon} Submit Karen`}
          </button>
        </div>
      )}

      {/* Submission History */}
      <div style={{ ...card, marginTop: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
          Meri Purani Submissions
        </div>

        {loadingHistory ? (
          <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "13px" }}>
            Loading...
          </div>
        ) : history.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "24px",
            border: "1px dashed var(--border)", borderRadius: "10px",
            color: "var(--text-muted)", fontSize: "13px",
          }}>
            Abhi tak koi submission nahi.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {history.map(item => {
              const t = TYPES.find(x => x.id === item.type);
              const p = PRIORITIES.find(x => x.value === item.priority);
              const s = STATUS_META[item.status] || { label: item.status, color: "#64748b" };
              return (
                <div key={item.id} style={{
                  display: "grid", gridTemplateColumns: "1fr auto auto auto",
                  gap: "12px", alignItems: "center",
                  padding: "12px 14px", borderRadius: "9px",
                  background: "var(--app-bg)", border: "1px solid var(--border)",
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <span style={{ fontSize: "13px" }}>{t?.icon || "📝"}</span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {item.subject}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", paddingLeft: "20px" }}>
                      #{item.id.slice(-8).toUpperCase()} · {fmtDate(item.createdAt)}
                    </div>
                  </div>
                  {/* Priority */}
                  <span style={{
                    fontSize: "10px", fontWeight: 700, padding: "2px 8px",
                    borderRadius: "10px", whiteSpace: "nowrap",
                    background: `${p?.color || "#64748b"}15`,
                    color: p?.color || "#64748b",
                    border: `1px solid ${p?.color || "#64748b"}35`,
                  }}>
                    {p?.label || item.priority}
                  </span>
                  {/* Type */}
                  <span style={{
                    fontSize: "10px", fontWeight: 700, padding: "2px 8px",
                    borderRadius: "10px", whiteSpace: "nowrap",
                    background: `${t?.color || "#64748b"}15`,
                    color: t?.color || "#64748b",
                    border: `1px solid ${t?.color || "#64748b"}35`,
                  }}>
                    {t?.label || item.type}
                  </span>
                  {/* Status */}
                  <span style={{
                    fontSize: "10px", fontWeight: 700, padding: "2px 8px",
                    borderRadius: "10px", whiteSpace: "nowrap",
                    background: `${s.color}15`,
                    color: s.color,
                    border: `1px solid ${s.color}35`,
                  }}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
