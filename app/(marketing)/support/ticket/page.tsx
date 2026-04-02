"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const SUBJECTS = [
  "Bank Integration Issue",
  "Billing & Subscription",
  "Transaction Categorization",
  "Reporting & Exports",
  "Multi-Branch Setup",
  "Account & Access",
  "Feature Request",
  "Other",
];

const PRIORITIES = [
  { label: "Low", desc: "General questions", color: "#34d399" },
  { label: "Medium", desc: "Affecting workflow", color: "#fbbf24" },
  { label: "High", desc: "Business critical", color: "#f87171" },
];

export default function SupportTicketPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]["label"]>("Medium");
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const ticketId = useMemo(() => `TKT-${Math.floor(10000 + Math.random() * 90000)}`, []);

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setStatus("idle");
    try {
      const res = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, priority }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("success");
        setSubject("");
        setMessage("");
        setPriority("Medium");
        setAttachmentName(null);
      } else {
        setStatus("error");
        setErrorMsg(data?.error || "Failed to submit ticket. Please try again.");
      }
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg,#06071a 0%,#0c0f2e 40%,#0f0c2e 70%,#080c1e 100%)",
        color: "white",
        fontFamily: "'Outfit','DM Sans',sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Lora:wght@600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; }
        @keyframes fadeUp { from { opacity:0; transform: translateY(18px); } to { opacity:1; transform: translateY(0); } }
        @keyframes gridDrift { from{transform:translateY(0)} to{transform:translateY(40px)} }
        @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,-30px) scale(1.1)} }
        @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-30px,20px) scale(1.08)} }
        .st-fade-1 { opacity:0; animation:fadeUp .65s ease forwards .1s; }
        .st-fade-2 { opacity:0; animation:fadeUp .65s ease forwards .25s; }
        .st-input { width:100%; padding:11px 15px; background:rgba(255,255,255,.05); border:1.5px solid rgba(255,255,255,.1); border-radius:11px; font-size:14px; font-family:inherit; color:rgba(255,255,255,.85); transition:all .2s; outline:none; }
        .st-input::placeholder { color:rgba(255,255,255,.22); }
        .st-input:focus { border-color:rgba(99,102,241,.6); background:rgba(99,102,241,.06); box-shadow:0 0 0 3px rgba(99,102,241,.12); }
        select.st-input option { background:#0c0f2e; color:white; }
        .st-label { display:block; font-size:11px; font-weight:700; color:rgba(255,255,255,.38); letter-spacing:.07em; text-transform:uppercase; margin-bottom:7px; }
      `}</style>

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(99,102,241,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.07) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
            animation: "gridDrift 8s linear infinite alternate",
            opacity: 0.6,
          }}
        />
        <div style={{ position: "absolute", width: 680, height: 680, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.18) 0%,transparent 65%)", top: -220, left: -120, animation: "orb1 12s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle,rgba(124,58,237,.12) 0%,transparent 65%)", bottom: -140, right: 60, animation: "orb2 15s ease-in-out infinite" }} />
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px 100px", position: "relative", zIndex: 1 }}>
        <div className="st-fade-1" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 22 }}>
          <Link href="/support" style={{ color: "rgba(255,255,255,.65)", textDecoration: "none", fontWeight: 600, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>â†</span> Back to Support
          </Link>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.32)", fontWeight: 600 }}>Support Ticket</div>
        </div>

        <div className="st-fade-2" style={{ textAlign: "center", marginBottom: 38 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "7px 14px 7px 10px", borderRadius: 24, background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.25)", marginBottom: 18 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981" }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: "#a5b4fc", letterSpacing: ".08em", textTransform: "uppercase" }}>Submit a ticket</span>
          </div>
          <h1 style={{ fontFamily: "'Lora', serif", fontSize: "clamp(32px, 4vw, 46px)", fontWeight: 700, letterSpacing: "-1px", marginBottom: 10 }}>
            Tell us what&apos;s going on
          </h1>
          <p style={{ fontSize: 14.5, color: "rgba(255,255,255,.42)", maxWidth: 620, margin: "0 auto", lineHeight: 1.8 }}>
            We usually respond within 24 hours (often much faster). Include details so we can help you in one reply.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 22, alignItems: "start" }}>
          <div style={{ borderRadius: 18, background: "rgba(255,255,255,.04)", border: "1.5px solid rgba(255,255,255,.08)", backdropFilter: "blur(18px)", boxShadow: "0 10px 42px rgba(0,0,0,.28)", overflow: "hidden" }}>
            <div style={{ padding: "18px 18px 0" }}>
              {status === "success" && (
                <div style={{ padding: "14px 14px", borderRadius: 14, background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.22)", marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, color: "#34d399", fontSize: 13, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>
                    Ticket submitted
                  </div>
                  <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.7)", lineHeight: 1.6 }}>
                    Ticket ID: <span style={{ fontWeight: 800, color: "white" }}>{ticketId}</span>
                  </div>
                </div>
              )}
              {status === "error" && (
                <div style={{ padding: "14px 14px", borderRadius: 14, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.22)", marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, color: "#f87171", fontSize: 13, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>
                    Submission failed
                  </div>
                  <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.65)", lineHeight: 1.6 }}>{errorMsg}</div>
                </div>
              )}
            </div>

            <form onSubmit={submitTicket} style={{ padding: "18px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label className="st-label">Subject</label>
                  <select className="st-input" value={subject} onChange={(e) => setSubject(e.target.value)}>
                    <option value="">Select a subject</option>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="st-label">Priority</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    {PRIORITIES.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setPriority(p.label)}
                        style={{
                          padding: "10px 10px",
                          borderRadius: 12,
                          border: `1.5px solid ${priority === p.label ? p.color + "66" : "rgba(255,255,255,.1)"}`,
                          background: priority === p.label ? p.color + "16" : "rgba(255,255,255,.04)",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          transition: "all .2s",
                          textAlign: "left",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
                          <span style={{ fontSize: 12.5, fontWeight: 800, color: priority === p.label ? "white" : "rgba(255,255,255,.7)" }}>{p.label}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", lineHeight: 1.3 }}>{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="st-label">Message</label>
                <textarea
                  className="st-input"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe the issue, steps to reproduce, and what you expected to happen."
                  rows={7}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="file"
                    onChange={(e) => setAttachmentName(e.target.files && e.target.files[0] ? e.target.files[0].name : null)}
                    style={{ display: "none" }}
                  />
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1.5px solid rgba(255,255,255,.12)",
                      background: "rgba(255,255,255,.04)",
                      color: "rgba(255,255,255,.7)",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    ðŸ“Ž Attach file
                  </span>
                  {attachmentName ? <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.35)" }}>{attachmentName}</span> : null}
                </label>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.28)", fontWeight: 600 }}>Sends to /api/support/ticket</span> */}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !subject || !message}
                style={{
                  width: "100%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: "none",
                  cursor: loading || !subject || !message ? "not-allowed" : "pointer",
                  background: loading || !subject || !message ? "rgba(99,102,241,.25)" : "linear-gradient(135deg,#6366f1,#4f46e5)",
                  color: "white",
                  fontSize: 14.5,
                  fontWeight: 800,
                  fontFamily: "inherit",
                  boxShadow: loading || !subject || !message ? "none" : "0 10px 28px rgba(99,102,241,.4)",
                  transition: "all .25s",
                  opacity: loading || !subject || !message ? 0.7 : 1,
                }}
              >
                {loading ? "Submitting..." : "Submit Ticket"}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </form>
          </div>

          <div style={{ borderRadius: 18, background: "rgba(255,255,255,.035)", border: "1.5px solid rgba(255,255,255,.08)", backdropFilter: "blur(18px)", boxShadow: "0 10px 42px rgba(0,0,0,.22)" }}>
            <div style={{ padding: "18px 18px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.35)", letterSpacing: ".09em", textTransform: "uppercase", marginBottom: 10 }}>
                Quick options
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <a href="mailto:finovaos.app@gmail.com" style={{ textDecoration: "none", padding: "12px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 12, background: "rgba(129,140,248,.14)", border: "1px solid rgba(129,140,248,.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>âœ‰ï¸</div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "white", marginBottom: 2 }}>Email support</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>finovaos.app@gmail.com</div>
                  </div>
                </a>

                <Link href="/support" style={{ textDecoration: "none", padding: "12px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 12, background: "rgba(52,211,153,.14)", border: "1px solid rgba(52,211,153,.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>ðŸ“š</div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "white", marginBottom: 2 }}>Support center</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>FAQs, guides, contact options</div>
                  </div>
                </Link>
              </div>

              <div style={{ height: 1, background: "rgba(255,255,255,.07)", margin: "16px 0" }} />

              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.4)", lineHeight: 1.7 }}>
                Include your company name, the page URL, and screenshots if possible. This helps us resolve issues faster.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

