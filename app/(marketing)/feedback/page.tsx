"use client";
import { useState } from "react";
import Link from "next/link";

const TYPES = [
  { id: "complaint",  label: "Complaint",  emoji: "⚠️", color: "#f87171", desc: "کوئی مسئلہ یا شکایت" },
  { id: "suggestion", label: "Suggestion", emoji: "💡", color: "#fbbf24", desc: "بہتری کا کوئی idea" },
  { id: "bug",        label: "Bug Report", emoji: "🐛", color: "#a78bfa", desc: "کوئی technical خرابی" },
  { id: "general",    label: "General",    emoji: "💬", color: "#34d399", desc: "کوئی اور بات" },
];

export default function PublicFeedbackPage() {
  const [type, setType]       = useState("suggestion");
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoad]    = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");

  const active = TYPES.find(t => t.id === type)!;

  async function submit() {
    if (!subject.trim() || message.trim().length < 20) {
      setError("Subject لکھیں اور message کم از کم 20 حروف ہو"); return;
    }
    setLoad(true); setError("");
    try {
      const res = await fetch("/api/public/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, subject: subject.trim(), message: message.trim(), email: email.trim() || undefined, name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally { setLoad(false); }
  }

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", minHeight: "100vh", background: "#080c1e", color: "white", padding: "80px 24px" }}>
      <style>{`
        .pf-input { width:100%; background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:12px; padding:13px 16px; color:white; font-family:inherit; font-size:14px; outline:none; box-sizing:border-box; transition:border-color .2s; }
        .pf-input:focus { border-color:rgba(99,102,241,.45); background:rgba(99,102,241,.04); }
        .pf-input::placeholder { color:rgba(255,255,255,.22); }
        .type-card { border-radius:14px; padding:16px 18px; cursor:pointer; transition:all .2s; border:1.5px solid rgba(255,255,255,.08); background:rgba(255,255,255,.03); }
        .type-card:hover { border-color:rgba(255,255,255,.18); background:rgba(255,255,255,.05); }
      `}</style>

      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 32 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💬</div>
            <span style={{ fontSize: 20, fontWeight: 800, color: "white" }}>FinovaOS</span>
          </Link>
          <h1 style={{ margin: "0 0 12px", fontSize: "clamp(26px,4vw,38px)", fontWeight: 800, letterSpacing: "-0.5px" }}>
            آپ کی بات اہم ہے
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: "rgba(255,255,255,.45)", lineHeight: 1.7 }}>
            کوئی شکایت، suggestion، یا bug — ہمیں بتائیں۔<br />ہماری team ہر feedback پڑھتی ہے۔
          </p>
        </div>

        {done ? (
          <div style={{ background: "rgba(52,211,153,.08)", border: "1.5px solid rgba(52,211,153,.2)", borderRadius: 24, padding: "60px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>🙏</div>
            <h2 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 800, color: "#34d399" }}>شکریہ!</h2>
            <p style={{ margin: "0 0 32px", fontSize: 15, color: "rgba(255,255,255,.5)", lineHeight: 1.7 }}>
              آپ کا {active.label} ہمیں مل گیا ہے۔<br />ہماری team جلد review کرے گی۔
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => { setDone(false); setSubject(""); setMessage(""); setName(""); setEmail(""); }}
                style={{ padding: "11px 24px", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", background: "transparent", color: "white", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                مزید لکھیں
              </button>
              <Link href="/" style={{ padding: "11px 24px", borderRadius: 10, border: "none", background: "#6366f1", color: "white", fontFamily: "inherit", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                Home پر جائیں
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Type selection */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 28 }}>
              {TYPES.map(t => (
                <div key={t.id} className="type-card"
                  onClick={() => { setType(t.id); setError(""); }}
                  style={{ borderColor: type === t.id ? `${t.color}40` : undefined, background: type === t.id ? `${t.color}0e` : undefined }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{t.emoji}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: type === t.id ? t.color : "rgba(255,255,255,.8)" }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{t.desc}</div>
                    </div>
                    {type === t.id && (
                      <div style={{ marginLeft: "auto", width: 18, height: 18, borderRadius: "50%", background: t.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>✓</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Form */}
            <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "28px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".07em", display: "block", marginBottom: 7 }}>آپ کا نام (optional)</label>
                  <input className="pf-input" placeholder="نام" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".07em", display: "block", marginBottom: 7 }}>Email (optional)</label>
                  <input className="pf-input" type="email" placeholder="reply کے لیے" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".07em", display: "block", marginBottom: 7 }}>SUBJECT *</label>
                <input className="pf-input" placeholder={`${active.label} کا مختصر عنوان`} value={subject} onChange={e => setSubject(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".07em", display: "block", marginBottom: 7 }}>DETAILS *</label>
                <textarea className="pf-input" rows={6} placeholder="تفصیل سے لکھیں..."
                  value={message} onChange={e => setMessage(e.target.value)}
                  style={{ resize: "vertical", lineHeight: 1.7 }} />
                <div style={{ fontSize: 11, marginTop: 5, textAlign: "right", color: message.length < 20 ? "rgba(248,113,113,.5)" : "rgba(255,255,255,.2)" }}>
                  {message.length} / 20 min
                </div>
              </div>

              {error && (
                <div style={{ background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#f87171" }}>
                  {error}
                </div>
              )}

              <button onClick={submit} disabled={loading} style={{
                padding: "14px", borderRadius: 12, border: "none",
                background: loading ? "rgba(99,102,241,.4)" : `linear-gradient(135deg,${active.color},${active.color}cc)`,
                color: "white", fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer", transition: "all .2s",
                boxShadow: loading ? "none" : `0 4px 20px ${active.color}30`,
              }}>
                {loading ? "بھیجا جا رہا ہے..." : `${active.emoji} Submit کریں`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
