"use client";
// FILE: app/auth/reset-password/page.tsx
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useMemo, Suspense } from "react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get("token") || "";

  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState("");
  const [showPass,  setShowPass]  = useState(false);

  const strength = useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  }, [password]);

  const strengthLabel = ["","Weak","Fair","Good","Strong"];
  const strengthColor = ["","#f87171","#fbbf24","#818cf8","#34d399"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters"); return; }
    if (!token)                { setError("Invalid or missing reset token"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push("/login?reset=1"), 2500);
      } else {
        setError(data.error || "Reset failed. The link may have expired.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  if (!token) {
    return (
      <main style={{ minHeight:"100vh", background:"linear-gradient(160deg,#080c1e,#0c0f2e)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',system-ui,sans-serif" }}>
        <div style={{ textAlign:"center", color:"white" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
          <h1 style={{ fontSize:20, marginBottom:10 }}>Invalid reset link</h1>
          <Link href="/auth/forgot-password" style={{ color:"#818cf8", fontWeight:600, textDecoration:"none" }}>Request a new one →</Link>
        </div>
      </main>
    );
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
          {done ? (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
              <h1 style={{ fontSize:22, fontWeight:800, color:"white", marginBottom:10 }}>Password reset!</h1>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.5)", lineHeight:1.7 }}>
                Your password has been updated. Redirecting to login...
              </p>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize:24, fontWeight:800, color:"white", marginBottom:8 }}>Set new password</h1>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.45)", marginBottom:24, lineHeight:1.6 }}>
                Choose a strong password for your Finova account.
              </p>

              {error && (
                <div style={{ marginBottom:16, padding:"10px 14px", borderRadius:10, background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.25)", color:"#f87171", fontSize:13 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {/* New password */}
                <div>
                  <label style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:6 }}>New Password</label>
                  <div style={{ position:"relative" }}>
                    <input type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 8 characters" required
                      style={{ width:"100%", padding:"12px 40px 12px 14px", borderRadius:11, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:14, outline:"none", boxSizing:"border-box" as any }}
                      onFocus={e=>e.target.style.borderColor="rgba(99,102,241,.5)"}
                      onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}
                    />
                    <button type="button" onClick={()=>setShowPass(v=>!v)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"rgba(255,255,255,.4)", cursor:"pointer", fontSize:14 }}>
                      {showPass?"🙈":"👁️"}
                    </button>
                  </div>
                  {password && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ display:"flex", gap:4, marginBottom:4 }}>
                        {[1,2,3,4].map(i=>(
                          <div key={i} style={{ height:3, flex:1, borderRadius:4, background:i<=strength?strengthColor[strength]:"rgba(255,255,255,.08)", transition:"background .3s" }}/>
                        ))}
                      </div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>
                        Strength: <span style={{ color:strengthColor[strength], fontWeight:700 }}>{strengthLabel[strength]}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:6 }}>Confirm Password</label>
                  <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat your password" required
                    style={{ width:"100%", padding:"12px 14px", borderRadius:11, background:"rgba(255,255,255,.05)", border:`1px solid ${confirm&&confirm!==password?"rgba(248,113,113,.4)":confirm&&confirm===password?"rgba(52,211,153,.4)":"rgba(255,255,255,.1)"}`, color:"white", fontSize:14, outline:"none", boxSizing:"border-box" as any }}
                  />
                  {confirm && confirm !== password && (
                    <div style={{ fontSize:11, color:"#f87171", marginTop:4 }}>Passwords do not match</div>
                  )}
                </div>

                <button type="submit" disabled={loading || !password || !confirm || password !== confirm}
                  style={{ padding:"13px", borderRadius:11, background:(loading||!password||!confirm||password!==confirm)?"rgba(99,102,241,.3)":"linear-gradient(135deg,#4f46e5,#7c3aed)", border:"none", color:"white", fontSize:14, fontWeight:700, cursor:(loading||!password||!confirm||password!==confirm)?"not-allowed":"pointer", transition:"all .2s" }}>
                  {loading ? "Updating..." : "Reset Password →"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight:"100vh", background:"linear-gradient(160deg,#080c1e,#0c0f2e)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ color:"rgba(255,255,255,.4)", fontSize:14 }}>Loading…</div>
      </main>
    }>
      <ResetPasswordForm/>
    </Suspense>
  );
}
