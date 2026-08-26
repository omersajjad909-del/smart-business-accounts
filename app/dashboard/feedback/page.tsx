"use client";
import { fmtDate } from "@/lib/dateUtils";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useResponsive } from "@/hooks/useResponsive";

type CompanyInfo = { name: string; plan: string; country: string | null; businessType: string | null };

type FeedbackType = "feedback" | "complaint" | "suggestion" | "bug" | "general";

const TYPES: {
  id: FeedbackType; label: string; icon: string; color: string;
  // "label" is the button text; "noun" is the same thing inside a sentence
  // ("Your review has been submitted"), because the two rarely read alike.
  noun: string; desc: string; placeholder: string;
}[] = [
  {
    // This is the old "Write a Review" page in type form — rating, consent and
    // all. There is no separate review page any more.
    id: "feedback", label: "Write a Review", icon: "⭐", color: "#34d399",
    noun: "review", desc: "Rate your experience",
    placeholder: "What do you like? What's working well? Share your overall experience with FinovaOS...",
  },
  {
    id: "complaint", label: "Complaint", icon: "⚠️", color: "#f87171",
    noun: "complaint", desc: "Issue or problem",
    placeholder: "What happened? Which page, what went wrong, since when — describe in detail...",
  },
  {
    id: "suggestion", label: "Suggestion", icon: "💡", color: "#fbbf24",
    noun: "suggestion", desc: "New idea or improvement",
    placeholder: "What is your idea? What feature should be added or improved...",
  },
  {
    id: "bug", label: "Bug Report", icon: "🐛", color: "#a78bfa",
    noun: "bug report", desc: "Technical error or glitch",
    placeholder: "Which page, what happened, what was expected, also mention browser/device...",
  },
  {
    id: "general", label: "General", icon: "💬", color: "#60a5fa",
    noun: "message", desc: "Anything else",
    placeholder: "Share anything you'd like us to know...",
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
  open:        { label: "⏳ Pending Review", color: "#60a5fa" },
  in_progress: { label: "🔄 In Progress",    color: "#fbbf24" },
  resolved:    { label: "✅ Resolved",        color: "#34d399" },
  closed:      { label: "🔒 Closed",          color: "#64748b" },
};

type HistoryItem = {
  id: string; type: string; subject: string;
  status: string; priority: string; createdAt: string;
  rating?: number | null; publishConsent?: boolean; testimonialId?: string | null;
};

/**
 * Where a submitted review stands on its way to the public site. Returns null
 * for anything that is not a review, or a review the user never allowed us to
 * publish — those are read by the team but never go anywhere public.
 */
function reviewStage(item: HistoryItem): { label: string; color: string } | null {
  if (item.type !== "feedback" || !item.rating) return null;
  if (item.testimonialId) return { label: "🌐 Live on website", color: "#34d399" };
  if (item.publishConsent) return { label: "⏳ Awaiting approval", color: "#fbbf24" };
  return { label: "🔒 Private review", color: "#64748b" };
}

export default function FeedbackPage() {
  const { isMobile } = useResponsive();
  const user = getCurrentUser();

  const [fbType,   setFbType]   = useState<FeedbackType>("feedback");
  const [subject,  setSubject]  = useState("");
  const [message,  setMessage]  = useState("");
  // 0 = nothing picked yet. Stars start empty; the user chooses 1-5.
  const [rating,   setRating]   = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [publishConsent, setPublishConsent] = useState(false);
  // Job title shown beside the name if this review is ever published.
  const [role,     setRole]     = useState("");
  const [priority, setPriority] = useState("normal");
  const [module,   setModule]   = useState("");
  const [submitting, setSub]    = useState(false);
  const [done,     setDone]     = useState<{ id: string } | null>(null);
  const [error,    setError]    = useState("");
  const [history,  setHistory]  = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingH] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  const activeType = TYPES.find(t => t.id === fbType)!;
  // Only "Share your experience" can become a public testimonial, so that is
  // the only type that carries a star rating.
  const ratingApplies = fbType === "feedback";

  /**
   * A review is somebody telling us how it is going. It is not a ticket, so it
   * is not triaged: nothing to rank by urgency, nothing to route to a module,
   * and no title the writer was going to think of anyway. Asked for all three,
   * the form reads like a support desk and the review never gets written.
   *
   * A complaint and a bug are tickets, and there the same three fields are what
   * make them answerable.
   */
  /**
   * A title for a review that was not given one: its first sentence, trimmed.
   * The support list shows submissions by subject, and a blank row there is a
   * review nobody opens.
   */
  function derivedSubject(): string {
    const firstSentence = message.trim().split(/(?<=[.!?])\s|\n/)[0] || message.trim();
    const short = firstSentence.slice(0, 70).trim();
    if (short) return short + (firstSentence.length > 70 ? "…" : "");
    return ratingApplies && rating > 0 ? `${rating}-star review` : "Feedback";
  }

  const triageApplies = fbType === "complaint" || fbType === "bug";
  const moduleApplies = fbType !== "feedback";
  const subjectRequired = fbType !== "feedback";

  function getHeaders() {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (user?.id)        h["x-user-id"]    = user.id;
    if (user?.companyId) h["x-company-id"] = user.companyId;
    if (user?.role)      h["x-user-role"]  = user.role;
    return h;
  }

  useEffect(() => {
    const h = getHeaders();
    fetch("/api/public/feedback", { headers: h })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => setHistory(d.items || []))
      .catch(() => {})
      .finally(() => setLoadingH(false));

    fetch("/api/me/company", { headers: h })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCompanyInfo({ name: d.name, plan: d.plan, country: d.country, businessType: d.businessType }); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  async function submit() {
    if (subjectRequired && !subject.trim()) { setError("Please enter a subject."); return; }
    // A rating must never travel on its own — the written review is what makes
    // it meaningful, and it is what an admin reads before publishing it.
    if (message.trim().length < 20) {
      setError(ratingApplies && rating > 0
        ? "Please write your review as well — a star rating alone cannot be submitted (minimum 20 characters)."
        : "Message must be at least 20 characters.");
      return;
    }
    if (ratingApplies && rating === 0) { setError("Please pick a star rating from 1 to 5."); return; }
    setSub(true); setError("");
    try {
      const res = await fetch("/api/public/feedback", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          type: fbType,
          subject: subject.trim() || derivedSubject(),
          message: message.trim(),
          rating: ratingApplies ? rating : undefined,
          publishConsent: ratingApplies ? publishConsent : undefined,
          role: ratingApplies && role.trim() ? role.trim() : undefined,
          priority,
          module: module || undefined,
          email: user?.email || undefined,
          name:  user?.name  || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDone({ id: data.id });
      setSubject(""); setMessage(""); setPriority("normal"); setModule(""); setRating(0); setPublishConsent(false); setRole("");
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
          Feedback & Reviews
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
          Write a review, report an issue, or suggest an improvement — we're listening
        </p>
      </div>

      {/* Success state */}
      {done && (
        <div style={{
          ...card, marginBottom: "20px",
          background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.25)",
          textAlign: "center", padding: isMobile ? "22px 11px" : "40px 24px",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#34d399", marginBottom: "6px" }}>
            Received! Thank you
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>
            Your {activeType.noun} has been submitted. We'll review it shortly.
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
            Submit Another
          </button>
        </div>
      )}

      {!done && (
        <div style={card}>
          {/* Type selector */}
          <div style={{ marginBottom: "22px" }}>
            <label style={labelStyle}>Select Type</label>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: "8px" }}>
              {TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setFbType(t.id); setError(""); }}
                  style={{
                    padding: "12px 8px", borderRadius: "10px", cursor: "pointer",
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

          {/* Star rating — only for "Share your experience", because that is
              the only feedback type an admin can publish as a testimonial. */}
          {ratingApplies && (
            <div style={{
              marginBottom: "14px", padding: "14px 16px", borderRadius: "10px",
              background: "var(--app-bg)", border: "1px solid var(--border)",
            }}>
              <label style={{ ...labelStyle, marginBottom: "9px" }}>
                Your Rating <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div
                  style={{ display: "flex", gap: "4px" }}
                  onMouseLeave={() => setHoverStar(0)}
                  role="radiogroup"
                  aria-label="Rate your experience from 1 to 5 stars"
                >
                  {[1, 2, 3, 4, 5].map(n => {
                    const filled = n <= (hoverStar || rating);
                    return (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={rating === n}
                        aria-label={`${n} star${n > 1 ? "s" : ""}`}
                        onClick={() => setRating(n === rating ? 0 : n)}
                        onMouseEnter={() => setHoverStar(n)}
                        style={{
                          background: "none", border: "none", padding: 0,
                          cursor: "pointer", lineHeight: 0,
                          transform: filled ? "scale(1.06)" : "scale(1)",
                          transition: "transform .12s ease",
                        }}
                      >
                        <svg width="27" height="27" viewBox="0 0 24 24"
                          fill={filled ? "#fbbf24" : "none"}
                          stroke={filled ? "#fbbf24" : "var(--text-muted)"}
                          strokeWidth="1.6" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      </button>
                    );
                  })}
                </div>
                <span style={{
                  fontSize: "12px", fontWeight: 600,
                  color: (hoverStar || rating) ? "#fbbf24" : "var(--text-muted)",
                }}>
                  {["Tap a star to rate", "Poor", "Fair", "Good", "Very good", "Excellent"][hoverStar || rating]}
                </span>
              </div>
              {/* Optional, and only useful on a published review — "Sana Malik,
                  Finance Manager" reads better on the site than a bare name. */}
              <div style={{ marginTop: "12px", maxWidth: "320px" }}>
                <label style={{ ...labelStyle, marginBottom: "6px" }}>
                  Your Role (optional)
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  maxLength={60}
                  placeholder="e.g. CEO, Accountant, Owner"
                  style={inputStyle}
                />
              </div>

              {/* Explicit permission before anyone's words go on the public
                  site under their name. Without this the review is still read
                  by the team — it just never becomes a testimonial. */}
              <label style={{
                display: "flex", alignItems: "flex-start", gap: "9px",
                marginTop: "12px", paddingTop: "12px",
                borderTop: "1px solid var(--border)", cursor: "pointer",
              }}>
                <input
                  type="checkbox"
                  checked={publishConsent}
                  onChange={e => setPublishConsent(e.target.checked)}
                  style={{ marginTop: "2px", width: "15px", height: "15px", cursor: "pointer", accentColor: "#fbbf24", flexShrink: 0 }}
                />
                <span style={{ fontSize: "11.5px", color: "var(--text-muted)", lineHeight: 1.6 }}>
                  You may publish this review publicly with my name
                  {companyInfo?.name ? ` and company (${companyInfo.name})` : " and company"}.
                  Optional — your feedback still reaches the team either way, and nothing is
                  published until our team reviews it.
                </span>
              </label>
            </div>
          )}

          {/* Subject */}
          <div style={{ marginBottom: "14px" }}>
            <label style={labelStyle}>
              Subject{subjectRequired
                ? <span style={{ color: "#ef4444" }}> *</span>
                : <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> (optional)</span>}
            </label>
            <input
              style={inputStyle}
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={subjectRequired
                ? `Brief title for your ${activeType.noun}`
                : "Leave it blank and we'll take it from your review"}
            />
          </div>

          {/* Priority + Module row. Both are for tickets; a review has neither,
              and a suggestion is routed but not ranked. */}
          {(triageApplies || moduleApplies) && (
          <div style={{ display: "grid", gridTemplateColumns: triageApplies && moduleApplies ? "1fr 1fr" : "1fr", gap: "14px", marginBottom: "14px" }}>
            {triageApplies && (
            <div>
              <label style={labelStyle}>Priority</label>
              <div style={{ display: "flex", gap: "6px" }}>
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    style={{
                      flex: 1, padding: "7px 4px", borderRadius: "7px",
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
            )}
            {moduleApplies && (
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
            )}
          </div>
          )}

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
              {message.length} characters (minimum 20)
            </div>
          </div>

          {/* User + Company info strip */}
          {user && (
            <div style={{
              padding: isMobile ? "12px 10px" : "14px 16px", borderRadius: "10px", marginBottom: "16px",
              background: "var(--app-bg)", border: "1px solid var(--border)",
            }}>
              <div style={{
                fontSize: "10px", fontWeight: 700, color: "var(--text-muted)",
                textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px",
              }}>
                Submission Info — these details will be sent to our support team
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {/* User */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                    background: "#6366f1", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "#fff",
                  }}>
                    {(user.name || user.email || "U")[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {user.name || "User"}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{user.email}</div>
                  </div>
                </div>
                {/* Company */}
                {companyInfo && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
                      background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                      display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "#fff",
                    }}>
                      {companyInfo.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {companyInfo.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {companyInfo.country || "—"} · {companyInfo.businessType || "Business"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* Badges row */}
              <div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap" }}>
                <span style={{
                  fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px",
                  background: "rgba(99,102,241,0.1)", color: "#818cf8",
                  border: "1px solid rgba(99,102,241,0.2)",
                }}>
                  Role: {user.role}
                </span>
                {companyInfo && (
                  <span style={{
                    fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px",
                    background: companyInfo.plan === "ENTERPRISE" ? "rgba(52,211,153,0.1)"
                      : companyInfo.plan === "PROFESSIONAL" ? "rgba(167,139,250,0.1)"
                      : "rgba(129,140,248,0.1)",
                    color: companyInfo.plan === "ENTERPRISE" ? "#34d399"
                      : companyInfo.plan === "PROFESSIONAL" ? "#a78bfa"
                      : "#818cf8",
                    border: `1px solid ${companyInfo.plan === "ENTERPRISE" ? "rgba(52,211,153,0.25)"
                      : companyInfo.plan === "PROFESSIONAL" ? "rgba(167,139,250,0.25)"
                      : "rgba(129,140,248,0.25)"}`,
                  }}>
                    Plan: {companyInfo.plan}
                  </span>
                )}
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
            {submitting ? "Submitting…" : `${activeType.icon} Submit`}
          </button>
        </div>
      )}

      {/* Submission History */}
      <div style={{ ...card, marginTop: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
          My Previous Submissions
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
            No any Submission.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {history.map(item => {
              const t = TYPES.find(x => x.id === item.type);
              const p = PRIORITIES.find(x => x.value === item.priority);
              const s = STATUS_META[item.status] || { label: item.status, color: "#64748b" };
              const review = reviewStage(item);
              const badge = (color: string): React.CSSProperties => ({
                fontSize: "10px", fontWeight: 700, padding: "2px 8px",
                borderRadius: "10px", whiteSpace: "nowrap",
                background: `${color}15`, color,
                border: `1px solid ${color}35`,
              });
              return (
                <div key={item.id} style={{
                  display: isMobile ? "block" : "grid",
                  gridTemplateColumns: "1fr auto",
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
                      {/* The stars the user gave, so a review reads as a review at a glance. */}
                      {item.rating ? (
                        <span style={{ fontSize: "11px", color: "#fbbf24", letterSpacing: "1px" }}>
                          {"★".repeat(item.rating)}<span style={{ opacity: .3 }}>{"★".repeat(5 - item.rating)}</span>
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", paddingLeft: "20px" }}>
                      #{item.id.slice(-8).toUpperCase()} · {fmtDate(item.createdAt)}
                    </div>
                  </div>
                  {/* Badges wrap instead of forcing fixed columns, because a review
                      carries one more of them than everything else does. */}
                  <div style={{
                    display: "flex", gap: "6px", flexWrap: "wrap",
                    justifyContent: isMobile ? "flex-start" : "flex-end",
                    marginTop: isMobile ? "9px" : 0, paddingLeft: isMobile ? "20px" : 0,
                  }}>
                    <span style={badge(p?.color || "#64748b")}>
                      {p?.label || item.priority}
                    </span>
                    <span style={{ ...badge(t?.color || "#64748b"), textTransform: "capitalize" }}>
                      {t?.noun || item.type}
                    </span>
                    <span style={badge(s.color)}>{s.label}</span>
                    {review && <span style={badge(review.color)}>{review.label}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
