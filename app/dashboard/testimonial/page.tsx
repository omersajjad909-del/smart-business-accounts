"use client";
import { fmtDate } from "@/lib/dateUtils";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useResponsive } from "@/hooks/useResponsive";

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING:   { label: "⏳ Under Review",  color: "#fbbf24" },
  PUBLISHED: { label: "✅ Published",      color: "#34d399" },
  REJECTED:  { label: "❌ Not Approved",   color: "#f87171" },
};

type PrevItem = { id: string; message: string; rating: number; status: string; createdAt: string };

export default function TestimonialPage() {
  const { isMobile } = useResponsive();
  const user = getCurrentUser() as any;

  const [rating,   setRating]   = useState(5);
  const [hover,    setHover]    = useState(0);
  const [message,  setMessage]  = useState("");
  const [name,     setName]     = useState((user?.name as string) || "");
  const [company,  setCompany]  = useState("");
  const [role,     setRole]     = useState("");
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState("");
  const [history,  setHistory]  = useState<PrevItem[]>([]);
  const [loadingH, setLoadingH] = useState(true);

  function getHeaders() {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (user?.id)        h["x-user-id"]    = user.id;
    if (user?.companyId) h["x-company-id"] = user.companyId;
    if (user?.role)      h["x-user-role"]  = user.role;
    return h;
  }

  useEffect(() => {
    // Pre-fill company name
    fetch("/api/me/company", { headers: getHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.name) setCompany(d.name); })
      .catch(() => {});

    // Load history
    fetch("/api/public/submit-testimonial", { headers: getHeaders() })
      .then(r => r.json())
      .then(d => setHistory(d.items || []))
      .catch(() => {})
      .finally(() => setLoadingH(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  async function submit() {
    if (message.trim().length < 20) { setError("Review must be at least 20 characters."); return; }
    if (!name.trim()) { setError("Please enter your name."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/public/submit-testimonial", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ message: message.trim(), rating, name: name.trim(), company: company.trim(), role: role.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setDone(true);
      setMessage(""); setRole("");
    } catch (e: any) {
      setError(e.message);
    } finally { setSaving(false); }
  }

  const card: React.CSSProperties = {
    background: "var(--panel-bg)", border: "1px solid var(--border)",
    borderRadius: "14px", padding: "24px",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 13px", borderRadius: "8px",
    border: "1px solid var(--border)", background: "var(--app-bg)",
    color: "var(--text-primary)", fontSize: "13px", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "11px", fontWeight: 600, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "7px",
  };

  return (
    <div style={{ padding: "32px", maxWidth: "720px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>
          Write a Review
        </h1>
        <p style={{ fontSize: "13.5px", color: "var(--text-muted)", margin: 0 }}>
          Share your experience with FinovaOS — approved reviews appear on our website
        </p>
      </div>

      {/* Form card */}
      <div style={card}>
        {done ? (
          /* Success state */
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: "52px", marginBottom: "16px" }}>🎉</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
              Thank you for your review!
            </div>
            <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginBottom: "24px", lineHeight: 1.7 }}>
              Your review has been submitted and is under review. Once approved it will appear on our website.
            </p>
            <button
              onClick={() => setDone(false)}
              style={{
                padding: "9px 28px", borderRadius: "8px",
                background: "var(--primary, #6366f1)", border: "none",
                color: "white", fontWeight: 700, fontSize: "13px",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Write Another
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Star rating */}
            <div>
              <label style={labelStyle}>Your Rating</label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(star)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: "30px", padding: "0 2px", lineHeight: 1,
                      transition: "transform .15s",
                      transform: (hover || rating) >= star ? "scale(1.15)" : "scale(1)",
                      filter: (hover || rating) >= star ? "none" : "grayscale(1) opacity(.3)",
                    }}
                  >⭐</button>
                ))}
                <span style={{ fontSize: "13px", color: "var(--text-muted)", marginLeft: "8px" }}>
                  {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][hover || rating]}
                </span>
              </div>
            </div>

            {/* Review message */}
            <div>
              <label style={labelStyle}>Your Review *</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Share your experience — what do you like most, how has it helped your business, would you recommend it..."
                rows={5}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }}
              />
              <div style={{ fontSize: "11px", color: message.trim().length < 20 && message.length > 0 ? "#f87171" : "var(--text-muted)", marginTop: "5px", textAlign: "right" }}>
                {message.trim().length} characters {message.trim().length < 20 ? "(minimum 20)" : ""}
              </div>
            </div>

            {/* Name + Role row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={labelStyle}>Your Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Your Role (optional)</label>
                <input
                  type="text"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="e.g. CEO, Accountant, Owner"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Company */}
            <div>
              <label style={labelStyle}>Company Name (optional)</label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Your company name"
                style={inputStyle}
              />
            </div>

            {/* Info note */}
            <div style={{
              padding: "10px 14px", borderRadius: "8px",
              background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.18)",
              fontSize: "12.5px", color: "var(--text-muted)", lineHeight: 1.65,
            }}>
              ℹ️ Your review will be visible on the website only after admin approval. We may edit for brevity/clarity with your permission.
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding: "10px 14px", borderRadius: "8px", background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.25)", fontSize: "13px", color: "#f87171" }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={submit}
              disabled={saving}
              style={{
                padding: "12px", borderRadius: "9px", border: "none",
                background: saving ? "var(--border)" : "var(--primary, #6366f1)",
                color: "white", fontWeight: 700, fontSize: "14px",
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "inherit", transition: "all .2s",
              }}
            >
              {saving ? "Submitting..." : "⭐ Submit Review"}
            </button>
          </div>
        )}
      </div>

      {/* Previous submissions */}
      <div style={{ ...card, marginTop: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
          My Submitted Reviews
        </div>

        {loadingH ? (
          <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "13px" }}>Loading...</div>
        ) : history.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "24px",
            border: "1px dashed var(--border)", borderRadius: "10px",
            color: "var(--text-muted)", fontSize: "13px",
          }}>
            No reviews submitted yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {history.map(item => {
              const s = STATUS_META[item.status] || { label: item.status, color: "#64748b" };
              return (
                <div key={item.id} style={{
                  padding: isMobile ? "12px 10px" : "14px 16px", borderRadius: "10px",
                  background: "var(--app-bg)", border: "1px solid var(--border)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "8px" }}>
                    <div style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.6, flex: 1 }}>
                      {"⭐".repeat(item.rating)}{" "}
                      <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>({item.rating}/5)</span>
                    </div>
                    <span style={{
                      fontSize: "10px", fontWeight: 700, padding: "3px 10px",
                      borderRadius: "10px", whiteSpace: "nowrap",
                      background: `${s.color}18`, color: s.color,
                      border: `1px solid ${s.color}35`,
                    }}>
                      {s.label}
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 6px", lineHeight: 1.65 }}>
                    &ldquo;{item.message}&rdquo;
                  </p>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", opacity: 0.6 }}>
                    Submitted on {fmtDate(item.createdAt)}
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
