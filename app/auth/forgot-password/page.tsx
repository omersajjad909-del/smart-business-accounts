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
      const res = await fetch("/api/auth/forgot-password", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Couldn't send reset link right now. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight:"100vh", background:"linear-gradient(160deg,var(--dk-080c1e, #080c1e) 0%,var(--dk-0c0f2e, #0c0f2e) 50%,var(--dk-080c1e, #080c1e) 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'DM Sans','Outfit',system-ui,sans-serif" }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <Link href="/" style={{ textDecoration:"none" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:10 }}>
              <img src="/icon1.png" alt="FinovaOS" width={40} height={40} style={{ objectFit:"contain", flexShrink:0 }}/>
              <span style={{ fontSize:20, fontWeight:800, color:"var(--ink-solid, white)", fontFamily:"Lora,serif" }}>FinovaOS</span>
            </div>
          </Link>
        </div>

        <div style={{ background:"rgba(var(--ink),.04)", borderRadius:20, border:"1px solid rgba(var(--ink),.08)", padding:"36px 32px", backdropFilter:"blur(20px)" }}>
          {sent ? (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:16 }}>📧</div>
              <h1 style={{ fontSize:22, fontWeight:800, color:"var(--ink-solid, white)", marginBottom:10 }}>Check your email</h1>
              <p style={{ fontSize:14, color:"rgba(var(--ink),var(--ta-50, .5))", lineHeight:1.7, marginBottom:24 }}>
                We've sent a password reset link to <strong style={{color:"var(--ink-solid, white)"}}>{email}</strong>. Check your inbox and follow the instructions.
              </p>
              <p style={{ fontSize:12, color:"rgba(var(--ink),var(--ta-30, .3))" }}>Didn't receive it? Check your spam folder or{" "}
                <button onClick={()=>setSent(false)} style={{ background:"none", border:"none", color:"var(--tx-818cf8, #818cf8)", cursor:"pointer", fontSize:12, fontWeight:600 }}>try again</button>
              </p>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize:24, fontWeight:800, color:"var(--ink-solid, white)", marginBottom:8 }}>Forgot password?</h1>
              <p style={{ fontSize:14, color:"rgba(var(--ink),var(--ta-45, .45))", marginBottom:24, lineHeight:1.6 }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {error && (
                <div style={{ marginBottom:16, padding:"10px 14px", borderRadius:10, background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.25)", color:"var(--tx-f87171, #f87171)", fontSize:13 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div>
                  <label style={{ fontSize:10, fontWeight:700, color:"rgba(var(--ink),var(--ta-40, .4))", textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:6 }}>Email Address</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required
                    style={{ width:"100%", padding:"12px 14px", borderRadius:11, background:"rgba(var(--ink),.05)", border:"1px solid rgba(var(--ink),.1)", color:"var(--ink-solid, white)", fontSize:14, outline:"none", boxSizing:"border-box" as any }}
                    onFocus={e=>e.target.style.borderColor="rgba(99,102,241,.5)"}
                    onBlur={e=>e.target.style.borderColor="rgba(var(--ink),.1)"}
                  />
                </div>

                <button type="submit" disabled={loading || !email.trim()}
                  style={{ padding:"13px", borderRadius:11, background:loading?"rgba(99,102,241,.3)":"linear-gradient(135deg,#4f46e5,#7c3aed)", border:"none", color:"white", fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer" }}>
                  {loading ? "Sending..." : "Send Reset Link →"}
                </button>
              </form>

              <div style={{ textAlign:"center", marginTop:20 }}>
                <Link href="/login" style={{ fontSize:13, color:"var(--tx-818cf8, #818cf8)", fontWeight:600, textDecoration:"none" }}>← Back to Login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
