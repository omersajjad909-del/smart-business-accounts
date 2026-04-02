"use client";
import { useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Tab = "feedback" | "suggestion" | "bug";

const TABS: { id: Tab; label: string; emoji: string; color: string; placeholder: string }[] = [
  { id: "feedback",   label: "Complaint",  emoji: "⚠️", color: "#f87171", placeholder: "کیا مسئلہ آیا؟ detail میں بتائیں..." },
  { id: "suggestion", label: "Suggestion", emoji: "💡", color: "#fbbf24", placeholder: "آپ کا idea یا suggestion کیا ہے؟" },
  { id: "bug",        label: "Bug Report", emoji: "🐛", color: "#a78bfa", placeholder: "کون سا page، کیا ہوا، کیا expect تھا..." },
];

export default function FeedbackPage() {
  const [tab, setTab]           = useState<Tab>("feedback");
  const [subject, setSubject]   = useState("");
  const [message, setMessage]   = useState("");
  const [submitting, setSub]    = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState("");

  const user = getCurrentUser();
  const activeTab = TABS.find(t => t.id === tab)!;

  async function submit() {
    if (!subject.trim() || message.trim().length < 20) {
      setError("Subject لکھیں اور message کم از کم 20 حروف کا ہو"); return;
    }
    setSub(true); setError("");
    try {
      const h: Record<string, string> = { "Content-Type": "application/json" };
      if (user?.id)        h["x-user-id"]    = user.id;
      if (user?.companyId) h["x-company-id"] = user.companyId;

      const res = await fetch("/api/public/feedback", {
        method: "POST",
        headers: h,
        body: JSON.stringify({
          type: tab === "feedback" ? "complaint" : tab,
          subject: subject.trim(),
          message: message.trim(),
          email: user?.email || undefined,
          name:  user?.name  || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally { setSub(false); }
  }

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", maxWidth: 680, margin: "0 auto", padding: "32px 0 80px" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fb-tab { border:none; cursor:pointer; font-family:inherit; padding:10px 22px; border-radius:12px; font-size:13px; font-weight:600; transition:all .2s; }
        .fb-input { width:100%; background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:12px; padding:13px 16px; color:white; font-family:inherit; font-size:14px; outline:none; box-sizing:border-box; transition:border-color .2s; }
        .fb-input:focus { border-color:rgba(99,102,241,.5); }
        .fb-input::placeholder { color:rgba(255,255,255,.25); }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800 }}>Feedback & Complaints</h1>
        <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,.45)" }}>
          کوئی مسئلہ، idea، یا bug — ہمیں بتائیں، ہم سنتے ہیں
        </p>
      </div>

      {done ? (
        <div style={{ animation: "fadeUp .4s ease", background: "rgba(52,211,153,.08)", border: "1.5px solid rgba(52,211,153,.25)", borderRadius: 20, padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
          <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800, color: "#34d399" }}>Received!</h2>
          <p style={{ margin: "0 0 28px", fontSize: 14, color: "rgba(255,255,255,.5)" }}>
            آپ کا {activeTab.label} ہمیں مل گیا ہے۔ ہم جلد review کریں گے۔
          </p>
          <button onClick={() => { setDone(false); setSubject(""); setMessage(""); }}
            style={{ padding: "10px 28px", borderRadius: 10, border: "none", background: "#6366f1", color: "white", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            دوبارہ لکھیں
          </button>
        </div>
      ) : (
        <div style={{ animation: "fadeUp .4s ease" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 28, background: "rgba(255,255,255,.03)", padding: 6, borderRadius: 14, width: "fit-content", border: "1px solid rgba(255,255,255,.07)" }}>
            {TABS.map(t => (
              <button key={t.id} className="fb-tab" onClick={() => { setTab(t.id); setError(""); }}
                style={{
                  background: tab === t.id ? `${t.color}18` : "transparent",
                  color: tab === t.id ? t.color : "rgba(255,255,255,.4)",
                  border: tab === t.id ? `1px solid ${t.color}35` : "1px solid transparent",
                }}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "28px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${activeTab.color}18`, border: `1.5px solid ${activeTab.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                {activeTab.emoji}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{activeTab.label} Submit کریں</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>آپ کی بات ہم تک پہنچے گی</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.4)", letterSpacing: ".06em", display: "block", marginBottom: 7 }}>SUBJECT</label>
                <input className="fb-input" placeholder={`${activeTab.label} کا مختصر عنوان`}
                  value={subject} onChange={e => setSubject(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.4)", letterSpacing: ".06em", display: "block", marginBottom: 7 }}>DETAILS</label>
                <textarea className="fb-input" rows={6} placeholder={activeTab.placeholder}
                  value={message} onChange={e => setMessage(e.target.value)}
                  style={{ resize: "vertical", lineHeight: 1.7 }} />
                <div style={{ fontSize: 11, color: message.length < 20 ? "rgba(248,113,113,.6)" : "rgba(255,255,255,.25)", marginTop: 5, textAlign: "right" }}>
                  {message.length} حروف (کم از کم 20)
                </div>
              </div>

              {error && (
                <div style={{ background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.25)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#f87171" }}>
                  {error}
                </div>
              )}

              <button onClick={submit} disabled={submitting}
                style={{
                  padding: "13px 28px", borderRadius: 12, border: "none", cursor: submitting ? "not-allowed" : "pointer",
                  background: submitting ? "rgba(99,102,241,.4)" : "#6366f1",
                  color: "white", fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                  opacity: submitting ? 0.7 : 1, transition: "all .2s", alignSelf: "flex-start",
                }}>
                {submitting ? "بھیجا جا رہا ہے..." : `${activeTab.emoji} Submit کریں`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
