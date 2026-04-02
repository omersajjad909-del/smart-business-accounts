"use client";
// FILE: app/auth/forgot-password/page.tsx
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setError("");
    try {
      await fetch("/api/auth/forgot-password", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(160deg,#080c1e 0%,#0c0f2e 50%,#080c1e 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'DM Sans','Outfit',system-ui,sans-serif" }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <Link href="/" style={{ textDecoration:"none" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:10 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span style={{ fontSize:20, fontWeight:800, color:"white", fontFamily:"Lora,serif" }}>Finova</span>
            </div>
          </Link>
        </div>

        <div style={{ background:"rgba(255,255,255,.04)", borderRadius:20, border:"1px solid rgba(255,255,255,.08)", padding:"36px 32px", backdropFilter:"blur(20px)" }}>
          {sent ? (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:16 }}>📧</div>
              <h1 style={{ fontSize:22, fontWeight:800, color:"white", marginBottom:10 }}>Check your email</h1>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.5)", lineHeight:1.7, marginBottom:24 }}>
                We've sent a password reset link to <strong style={{color:"white"}}>{email}</strong>. Check your inbox and follow the instructions.
              </p>
              <p style={{ fontSize:12, color:"rgba(255,255,255,.3)" }}>Didn't receive it? Check your spam folder or{" "}
                <button onClick={()=>setSent(false)} style={{ background:"none", border:"none", color:"#818cf8", cursor:"pointer", fontSize:12, fontWeight:600 }}>try again</button>
              </p>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize:24, fontWeight:800, color:"white", marginBottom:8 }}>Forgot password?</h1>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.45)", marginBottom:24, lineHeight:1.6 }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {error && (
                <div style={{ marginBottom:16, padding:"10px 14px", borderRadius:10, background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.25)", color:"#f87171", fontSize:13 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div>
                  <label style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:6 }}>Email Address</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required
                    style={{ width:"100%", padding:"12px 14px", borderRadius:11, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:14, outline:"none", boxSizing:"border-box" as any }}
                    onFocus={e=>e.target.style.borderColor="rgba(99,102,241,.5)"}
                    onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}
                  />
                </div>

                <button type="submit" disabled={loading || !email.trim()}
                  style={{ padding:"13px", borderRadius:11, background:loading?"rgba(99,102,241,.3)":"linear-gradient(135deg,#4f46e5,#7c3aed)", border:"none", color:"white", fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer" }}>
                  {loading ? "Sending..." : "Send Reset Link →"}
                </button>
              </form>

              <div style={{ textAlign:"center", marginTop:20 }}>
                <Link href="/login" style={{ fontSize:13, color:"#818cf8", fontWeight:600, textDecoration:"none" }}>← Back to Login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}