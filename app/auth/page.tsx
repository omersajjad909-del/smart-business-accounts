"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setCurrentUser } from "@/lib/auth";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "verify">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyPhone, setVerifyPhone] = useState("");
  const [verifyChannel, setVerifyChannel] = useState<"email" | "sms">("email");
  const [verifyTarget, setVerifyTarget] = useState("");
  const [availableChannels, setAvailableChannels] = useState<Array<"email" | "sms">>(["email"]);
  const [verifyCode, setVerifyCode] = useState<string[]>(Array(6).fill(""));
  const [devOtpBanner, setDevOtpBanner] = useState("");
  const [welcomeBack, setWelcomeBack] = useState<{ company: string } | null>(null);
  const [welcomeStep, setWelcomeStep] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const router = useRouter();
  const otpValue = verifyCode.join("");

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const nextMode = (params.get("mode") || "").toLowerCase();
      const nextEmail = (params.get("email") || "").toLowerCase();
      const pendingRaw = localStorage.getItem("pendingVerification");
      const pending = pendingRaw ? JSON.parse(pendingRaw) : null;
      if (nextEmail) setVerifyEmail(nextEmail);
      if (pending && (!nextEmail || String(pending.email || "").toLowerCase() === nextEmail)) {
        applyVerificationState(pending, nextEmail || String(pending.email || ""));
      }
      if (nextMode === "verify") setMode("verify");
    } catch {}
  }, []);

  useEffect(() => {
    if (mode !== "verify") return;
    const timeout = setTimeout(() => otpRefs.current[0]?.focus(), 0);
    return () => clearTimeout(timeout);
  }, [mode]);

  useEffect(() => {
    if (!welcomeBack) return;
    setWelcomeStep(0);
    const t1 = setTimeout(() => setWelcomeStep(1), 400);
    const t2 = setTimeout(() => setWelcomeStep(2), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [welcomeBack]);

  function applyVerificationState(payload: unknown, fallbackEmail: string) {
    const p = payload as Record<string, unknown>;
    const resolvedEmail = String(p?.email || fallbackEmail || "").toLowerCase();
    const resolvedPhone = String(p?.phone || "");
    const channels: Array<"email" | "sms"> = Array.isArray(p?.availableChannels) && p.availableChannels.length
      ? p.availableChannels.filter((item: unknown): item is "email" | "sms" => item === "email" || item === "sms")
      : ["email"];
    const channel = p?.verifyChannel === "sms" && channels.includes("sms") ? "sms" : "email";
    setVerifyEmail(resolvedEmail);
    setVerifyPhone(resolvedPhone);
    setAvailableChannels(channels);
    setVerifyChannel(channel);
    setVerifyTarget(String(p?.verifyTarget || (channel === "sms" ? resolvedPhone : resolvedEmail)));
    setVerifyCode(Array(6).fill(""));
    try {
      localStorage.setItem("pendingVerification", JSON.stringify({
        email: resolvedEmail, phone: resolvedPhone,
        availableChannels: channels, verifyChannel: channel,
        verifyTarget: String(p?.verifyTarget || ""),
      }));
    } catch {}
    setMode("verify");
  }

  function completeLogin(user: unknown, next = "/dashboard") {
    setCurrentUser(user as Parameters<typeof setCurrentUser>[0]);
    const u = user as Record<string, unknown>;
    const companies = u?.companies as Array<Record<string, unknown>> | undefined;
    const company = companies?.find(c => c?.isDefault)?.name || companies?.[0]?.name || "your company";
    setWelcomeBack({ company: String(company) });
    setTimeout(() => { router.replace(next); }, 2200);
  }

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      let payload: Record<string, unknown> = {};
      const text = await response.text();
      try { payload = text ? JSON.parse(text) : {}; } catch {
        setError(`Server error (${response.status}). Please try again.`);
        setLoading(false); return;
      }
      if (response.ok && payload.needsVerification) {
        applyVerificationState(payload, email);
      } else if (response.ok && payload.user) {
        completeLogin(payload.user, "/dashboard");
      } else {
        setError(String(payload.message || payload.error || "Login failed. Please try again."));
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Network error");
    } finally { setLoading(false); }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (otpValue.length !== 6) { setError("Please enter the 6-digit code."); setLoading(false); return; }
      const response = await fetch("/api/auth/verify/confirm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otpValue }),
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (response.ok && payload?.user) {
        try { localStorage.removeItem("pendingVerification"); } catch {}
        completeLogin(payload.user, String(payload.next || "/dashboard")); return;
      }
      setError(String(payload?.error || "Verification failed"));
    } catch (err: unknown) {
      setError((err as Error).message || "Network error");
    } finally { setLoading(false); }
  }

  async function resendOtp(channelOverride?: "email" | "sms") {
    setError(""); setLoading(true);
    try {
      const nextChannel = channelOverride || verifyChannel;
      const response = await fetch("/api/auth/verify/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail, channel: nextChannel }),
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok) setError(String(payload?.error || "Failed to resend"));
      else {
        applyVerificationState({ ...payload, email: verifyEmail, phone: verifyPhone }, verifyEmail);
        if (payload.devOtp) {
          const digits = String(payload.devOtp).padStart(6, "0").split("").slice(0, 6);
          setVerifyCode(digits);
          setDevOtpBanner(String(payload.devOtp).padStart(6, "0"));
        }
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Network error");
    } finally { setLoading(false); }
  }

  function focusOtp(index: number) { otpRefs.current[index]?.focus(); }
  function setOtp(index: number, digit: string) {
    setVerifyCode(prev => { const n = prev.slice(); n[index] = digit; return n; });
  }
  async function switchVerificationChannel(channel: "email" | "sms") {
    if (channel === verifyChannel || loading) return;
    setVerifyChannel(channel); await resendOtp(channel);
  }

  // ── WELCOME ANIMATION ─────────────────────────────────────────────────────
  if (welcomeBack) {
    return (
      <div style={{ position:"fixed", inset:0, background:"#07091c", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Outfit',sans-serif", zIndex:100 }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;800;900&display=swap');
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes wBounce{0%{transform:scale(0) rotate(-15deg);opacity:0}60%{transform:scale(1.12) rotate(3deg);opacity:1}80%{transform:scale(.96) rotate(-1deg)}100%{transform:scale(1) rotate(0)}}
          @keyframes wFadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
          @keyframes wBar{from{width:0}to{width:100%}}
          @keyframes wGlow{0%,100%{box-shadow:0 0 28px rgba(99,102,241,.4)}50%{box-shadow:0 0 56px rgba(99,102,241,.8)}}
          @keyframes wRing{0%{transform:scale(.8);opacity:.8}100%{transform:scale(1.6);opacity:0}}
        `}</style>
        <div style={{ position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)",backgroundSize:"52px 52px",pointerEvents:"none" }}/>
        <div style={{ textAlign:"center", position:"relative" }}>
          <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none" }}>
            <div style={{ position:"absolute",width:180,height:180,borderRadius:"50%",border:"1px solid rgba(99,102,241,.3)",animation:"wRing 1.8s ease-out infinite" }}/>
            <div style={{ position:"absolute",width:180,height:180,borderRadius:"50%",border:"1px solid rgba(99,102,241,.2)",animation:"wRing 1.8s ease-out .4s infinite" }}/>
          </div>
          <div style={{ width:88,height:88,borderRadius:26,background:"linear-gradient(135deg,#6366f1,#4f46e5)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",animation:"wBounce .6s cubic-bezier(.34,1.56,.64,1) both, wGlow 2s ease-in-out .6s infinite",boxShadow:"0 16px 48px rgba(99,102,241,.5)" }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          {welcomeStep >= 1 && (
            <div style={{ animation:"wFadeUp .45s ease both", color:"white" }}>
              <div style={{ fontSize:13,fontWeight:800,color:"#818cf8",letterSpacing:".14em",textTransform:"uppercase",marginBottom:10 }}>Finova</div>
              <div style={{ fontSize:32,fontWeight:900,letterSpacing:-1,marginBottom:6 }}>Welcome back!</div>
              <div style={{ fontSize:15,color:"rgba(255,255,255,.45)",marginBottom:32 }}>
                Opening <span style={{ color:"white",fontWeight:800 }}>{welcomeBack.company}</span>…
              </div>
            </div>
          )}
          {welcomeStep >= 2 && (
            <div style={{ animation:"wFadeUp .4s ease both", width:260, margin:"0 auto" }}>
              <div style={{ height:3,background:"rgba(255,255,255,.08)",borderRadius:4,overflow:"hidden" }}>
                <div style={{ height:"100%",background:"linear-gradient(90deg,#6366f1,#818cf8,#38bdf8)",borderRadius:4,animation:"wBar 1.8s cubic-bezier(.4,0,.2,1) both" }}/>
              </div>
              <div style={{ marginTop:14,fontSize:12,color:"rgba(255,255,255,.25)",fontWeight:600 }}>Loading your workspace…</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── MAIN LOGIN ─────────────────────────────────────────────────────────────
  return (
    <div className="auth-root" style={{ minHeight:"100vh", display:"flex", fontFamily:"'Outfit',sans-serif", background:"#0b0d1a", color:"white", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes floatA { 0%,100% { transform:translate(0,0) scale(1); } 50% { transform:translate(40px,-50px) scale(1.06); } }
        @keyframes floatB { 0%,100% { transform:translate(0,0) scale(1); } 50% { transform:translate(-30px,40px) scale(1.04); } }
        @keyframes floatC { 0%,100% { transform:translate(0,0); } 50% { transform:translate(20px,25px); } }
        @keyframes gridMove { from { backgroundPosition:0 0; } to { backgroundPosition:52px 52px; } }
        @keyframes cardFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes cardFloat2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes shimmer { from{backgroundPosition:200% 0} to{backgroundPosition:-200% 0} }
        @keyframes dotPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
        @keyframes barGrow { from{width:0} to{width:var(--w)} }

        .auth-inp {
          width:100%; padding:13px 16px;
          border-radius:10px;
          border:1.5px solid rgba(255,255,255,.07);
          background:rgba(255,255,255,.04);
          color:white; outline:none;
          font:500 14px 'Outfit',sans-serif;
          -webkit-text-fill-color:white;
          caret-color:#818cf8;
          transition:border-color .2s,box-shadow .2s,background .2s;
        }
        .auth-inp:focus {
          border-color:rgba(129,140,248,.45);
          box-shadow:0 0 0 4px rgba(99,102,241,.08);
          background:rgba(99,102,241,.05);
        }
        .auth-inp::placeholder { color:rgba(255,255,255,.15); }

        .auth-btn {
          width:100%; padding:14px;
          border-radius:10px; border:none;
          background:linear-gradient(135deg,#6366f1,#4f46e5);
          color:white; font:700 14px 'Outfit',sans-serif;
          cursor:pointer;
          box-shadow:0 6px 24px rgba(79,70,229,.4);
          transition:transform .2s,box-shadow .2s,filter .2s;
          display:flex; align-items:center; justify-content:center; gap:8px;
        }
        .auth-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 12px 32px rgba(79,70,229,.55); filter:brightness(1.07); }
        .auth-btn:disabled { opacity:.55; cursor:not-allowed; }

        .auth-ghost {
          width:100%; padding:13px;
          border-radius:10px;
          border:1.5px solid rgba(255,255,255,.07);
          background:rgba(255,255,255,.03);
          color:rgba(255,255,255,.45);
          font:600 13px 'Outfit',sans-serif;
          cursor:pointer;
          display:flex; align-items:center; justify-content:center; gap:8px;
          transition:border-color .2s,background .2s,color .2s;
        }
        .auth-ghost:hover { border-color:rgba(255,255,255,.14); background:rgba(255,255,255,.06); color:rgba(255,255,255,.8); }

        .otp-inp {
          width:46px; height:54px;
          border-radius:10px; text-align:center;
          border:1.5px solid rgba(255,255,255,.08);
          background:rgba(255,255,255,.04);
          color:white; font:800 20px 'Outfit',sans-serif;
          outline:none; transition:border-color .2s,box-shadow .2s;
        }
        .otp-inp:focus { border-color:rgba(129,140,248,.5); box-shadow:0 0 0 4px rgba(99,102,241,.1); }

        /* Mobile responsive */
        @media (max-width:768px) {
          .auth-root { overflow-y:auto !important; }
          .auth-left { display:none !important; }
          .auth-right { width:100% !important; flex:1 1 auto !important; justify-content:flex-start !important; padding:32px 18px !important; }
          .auth-form-shell { max-width:100% !important; }
          .mobile-logo { display:block !important; }
          .otp-row { gap:8px !important; justify-content:center !important; flex-wrap:wrap !important; }
        }
        @media (max-width:480px) {
          .auth-right { padding:24px 14px !important; }
          .auth-title { font-size:24px !important; }
          .auth-subtitle { font-size:13px !important; }
          .otp-inp { width:42px !important; height:50px !important; font-size:18px !important; }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════
          LEFT PANEL — Visual showcase
      ══════════════════════════════════════════════════════ */}
      <div className="auth-left" style={{ flex:"0 0 54%", position:"relative", overflow:"hidden", background:"#080a18" }}>

        {/* Animated grid */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)", backgroundSize:"52px 52px", animation:"gridMove 8s linear infinite", opacity:.6 }}/>

        {/* Glow blobs */}
        <div style={{ position:"absolute", width:600, height:600, borderRadius:"50%", top:"-10%", left:"-10%", background:"radial-gradient(circle,rgba(99,102,241,.18),transparent 60%)", animation:"floatA 18s ease-in-out infinite", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%", bottom:"-15%", right:"-5%", background:"radial-gradient(circle,rgba(56,189,248,.1),transparent 60%)", animation:"floatB 22s ease-in-out infinite", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", width:350, height:350, borderRadius:"50%", top:"40%", right:"10%", background:"radial-gradient(circle,rgba(167,139,250,.08),transparent 60%)", animation:"floatC 14s ease-in-out infinite", pointerEvents:"none" }}/>

        {/* Content */}
        <div style={{ position:"relative", zIndex:2, height:"100%", display:"flex", flexDirection:"column", padding:"44px 52px" }}>

          {/* Logo */}
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:11, textDecoration:"none", animation:"fadeIn .5s ease both" }}>
            <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 6px 20px rgba(99,102,241,.5)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span style={{ fontSize:22, fontWeight:900, color:"white", letterSpacing:"-0.5px" }}>Finova</span>
          </Link>

          {/* Hero text */}
          <div style={{ marginTop:"auto", marginBottom:40, animation:"fadeUp .6s ease .1s both" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(99,102,241,.12)", border:"1px solid rgba(99,102,241,.25)", borderRadius:100, padding:"6px 14px", marginBottom:24 }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:"#818cf8", display:"inline-block", animation:"dotPulse 1.8s ease-in-out infinite" }}/>
              <span style={{ fontSize:12, fontWeight:700, color:"#a5b4fc", letterSpacing:".06em" }}>TRUSTED BY 18,000+ BUSINESSES</span>
            </div>
            <h1 style={{ fontSize:44, fontWeight:900, lineHeight:1.1, letterSpacing:"-1.5px", marginBottom:18, color:"white" }}>
              Smart accounting<br/>
              <span style={{ background:"linear-gradient(135deg,#818cf8,#38bdf8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>for every business.</span>
            </h1>
            <p style={{ fontSize:16, color:"rgba(255,255,255,.4)", lineHeight:1.7, maxWidth:400 }}>
              Invoicing, payroll, inventory, AI insights — all in one platform built for growing businesses.
            </p>
          </div>

          {/* Floating dashboard cards */}
          <div style={{ position:"relative", height:300, animation:"fadeUp .7s ease .2s both" }}>

            {/* Revenue card */}
            <div style={{ position:"absolute", left:0, top:0, width:240, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:16, padding:"18px 20px", backdropFilter:"blur(12px)", boxShadow:"0 24px 48px rgba(0,0,0,.4)", animation:"cardFloat 6s ease-in-out infinite" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <span style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:".06em", textTransform:"uppercase" }}>Revenue MTD</span>
                <div style={{ width:28, height:28, borderRadius:8, background:"rgba(16,185,129,.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                </div>
              </div>
              <div style={{ fontSize:28, fontWeight:900, letterSpacing:"-1px", marginBottom:6 }}>$84,291</div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:12, fontWeight:700, color:"#34d399" }}>↑ 18.4%</span>
                <span style={{ fontSize:12, color:"rgba(255,255,255,.25)" }}>vs last month</span>
              </div>
              {/* Mini bar chart */}
              <div style={{ display:"flex", alignItems:"flex-end", gap:4, marginTop:14, height:32 }}>
                {[40,65,45,80,60,90,75,100].map((h,i) => (
                  <div key={i} style={{ flex:1, height:`${h}%`, borderRadius:3, background:i===7?"linear-gradient(#818cf8,#6366f1)":"rgba(255,255,255,.08)", transition:"height .3s" }}/>
                ))}
              </div>
            </div>

            {/* AI Insight card */}
            <div style={{ position:"absolute", right:0, top:20, width:220, background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.2)", borderRadius:16, padding:"16px 18px", backdropFilter:"blur(12px)", boxShadow:"0 20px 40px rgba(0,0,0,.35)", animation:"cardFloat2 8s ease-in-out infinite .5s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ width:30, height:30, borderRadius:9, background:"linear-gradient(135deg,#6366f1,#818cf8)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:800, color:"#a5b4fc", letterSpacing:".06em", textTransform:"uppercase" }}>AI Insight</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginTop:1 }}>Just now</div>
                </div>
              </div>
              <p style={{ fontSize:12.5, color:"rgba(255,255,255,.6)", lineHeight:1.6 }}>
                Accounts receivable is <span style={{ color:"#fbbf24", fontWeight:700 }}>23% above</span> average. Consider sending reminders to 4 clients.
              </p>
            </div>

            {/* Invoices card */}
            <div style={{ position:"absolute", left:20, bottom:0, width:200, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:16, padding:"16px 18px", backdropFilter:"blur(12px)", boxShadow:"0 20px 40px rgba(0,0,0,.35)", animation:"cardFloat 7s ease-in-out infinite 1s" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.3)", letterSpacing:".06em", textTransform:"uppercase", marginBottom:12 }}>Invoices</div>
              {[{label:"Paid",val:68,color:"#34d399"},{label:"Pending",val:24,color:"#fbbf24"},{label:"Overdue",val:8,color:"#f87171"}].map(r => (
                <div key={r.label} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,.45)", fontWeight:600 }}>{r.label}</span>
                    <span style={{ fontSize:12, color:r.color, fontWeight:800 }}>{r.val}%</span>
                  </div>
                  <div style={{ height:5, borderRadius:4, background:"rgba(255,255,255,.06)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${r.val}%`, borderRadius:4, background:r.color, opacity:.8 }}/>
                  </div>
                </div>
              ))}
            </div>

            {/* Rating pill */}
            <div style={{ position:"absolute", right:10, bottom:30, background:"rgba(251,191,36,.08)", border:"1px solid rgba(251,191,36,.2)", borderRadius:100, padding:"8px 14px", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:13 }}>⭐</span>
              <span style={{ fontSize:12, fontWeight:700, color:"#fde68a" }}>4.8 / 5 — 2,400+ reviews</span>
            </div>
          </div>

          {/* Bottom trust badges */}
          <div style={{ display:"flex", gap:20, marginTop:28, flexWrap:"wrap", animation:"fadeUp .6s ease .35s both" }}>
            {[
              { icon:"🔒", text:"Bank-level encryption" },
              { icon:"🌍", text:"50+ currencies" },
              { icon:"⚡", text:"Real-time sync" },
            ].map(b => (
              <div key={b.text} style={{ display:"flex", alignItems:"center", gap:7 }}>
                <span style={{ fontSize:14 }}>{b.icon}</span>
                <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.28)" }}>{b.text}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          RIGHT PANEL — Sign in form
      ══════════════════════════════════════════════════════ */}
      <div className="auth-right" style={{ flex:"0 0 46%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"48px 40px", background:"#0d0f1e", position:"relative", overflow:"hidden" }}>

        {/* Subtle glow behind form */}
        <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", top:"20%", left:"50%", transform:"translateX(-50%)", background:"radial-gradient(circle,rgba(99,102,241,.07),transparent 65%)", pointerEvents:"none" }}/>

        {/* Mobile-only logo */}
        <div style={{ display:"none", textAlign:"center", marginBottom:32 }} className="mobile-logo">
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:10, textDecoration:"none" }}>
            <div style={{ width:36, height:36, borderRadius:11, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span style={{ fontSize:20, fontWeight:900, color:"white" }}>Finova</span>
          </Link>
        </div>

        {/* Form container */}
        <div className="auth-form-shell" style={{ width:"100%", maxWidth:380, position:"relative", zIndex:2, animation:"fadeUp .5s ease both" }}>

          {/* ── SIGN IN FORM ── */}
          {mode === "signin" && (
            <>
              <div style={{ marginBottom:32 }}>
                <h1 className="auth-title" style={{ fontSize:28, fontWeight:900, letterSpacing:"-0.8px", marginBottom:8 }}>Sign in</h1>
                <p className="auth-subtitle" style={{ fontSize:14, color:"rgba(255,255,255,.35)", lineHeight:1.6 }}>
                  Welcome back — enter your credentials to continue.
                </p>
              </div>

              {error && (
                <div style={{ padding:"11px 14px", borderRadius:10, background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.18)", color:"#fca5a5", fontSize:13, fontWeight:600, marginBottom:20, display:"flex", alignItems:"center", gap:8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              <form onSubmit={signInPassword} style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:"rgba(255,255,255,.4)", marginBottom:8 }}>
                    Email address
                  </label>
                  <input
                    className="auth-inp"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.4)" }}>Password</label>
                    <Link href="/auth/forgot-password" style={{ fontSize:12, fontWeight:700, color:"#818cf8", textDecoration:"none" }}>
                      Forgot password?
                    </Link>
                  </div>
                  <div style={{ position:"relative" }}>
                    <input
                      className="auth-inp"
                      type={showPass ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      style={{ paddingRight:56 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", padding:4, color:"rgba(255,255,255,.3)", display:"flex", alignItems:"center" }}
                    >
                      {showPass
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop:6 }}>
                  {loading ? (
                    <>
                      <span style={{ width:15, height:15, border:"2px solid rgba(255,255,255,.25)", borderTopColor:"white", borderRadius:"50%", animation:"spin .75s linear infinite", display:"inline-block", flexShrink:0 }}/>
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign in
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </>
                  )}
                </button>
              </form>

              <div style={{ display:"flex", alignItems:"center", gap:10, margin:"22px 0" }}>
                <div style={{ flex:1, height:1, background:"rgba(255,255,255,.05)" }}/>
                <span style={{ fontSize:12, color:"rgba(255,255,255,.18)", fontWeight:600 }}>or</span>
                <div style={{ flex:1, height:1, background:"rgba(255,255,255,.05)" }}/>
              </div>

              <button type="button" className="auth-ghost" onClick={() => router.push("/demo")}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
                </svg>
                Try live demo — no account needed
              </button>

              <p style={{ textAlign:"center", marginTop:26, fontSize:13, color:"rgba(255,255,255,.25)" }}>
                Don&apos;t have an account?{" "}
                <Link href="/onboarding/signup/starter" style={{ color:"#818cf8", fontWeight:700, textDecoration:"none" }}>
                  Create one →
                </Link>
              </p>

              {/* Trust row */}
              <div style={{ display:"flex", justifyContent:"center", gap:18, marginTop:32, flexWrap:"wrap" }}>
                {["🔒 Encrypted", "🛡️ 2FA", "99.9% uptime"].map(t => (
                  <span key={t} style={{ fontSize:11, color:"rgba(255,255,255,.16)", fontWeight:600 }}>{t}</span>
                ))}
              </div>
            </>
          )}

          {/* ── OTP VERIFY FORM ── */}
          {mode === "verify" && (
            <>
              <div style={{ marginBottom:28 }}>
                <div style={{ width:48, height:48, borderRadius:14, background:"rgba(16,185,129,.1)", border:"1px solid rgba(16,185,129,.2)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <h2 style={{ fontSize:26, fontWeight:900, letterSpacing:"-0.6px", marginBottom:8 }}>Check your inbox</h2>
                <p style={{ fontSize:13.5, color:"rgba(255,255,255,.35)", lineHeight:1.6 }}>
                  We sent a 6-digit code to{" "}
                  <span style={{ color:"rgba(255,255,255,.65)", fontWeight:700 }}>{verifyTarget || verifyEmail}</span>
                </p>
              </div>

              {devOtpBanner && (
                <div style={{ padding:"11px 14px", borderRadius:10, background:"rgba(16,185,129,.08)", border:"1px solid rgba(16,185,129,.2)", color:"#a7f3d0", fontFamily:"monospace", fontWeight:800, letterSpacing:"10px", marginBottom:18, textAlign:"center" }}>
                  {devOtpBanner}
                </div>
              )}

              {error && (
                <div style={{ padding:"11px 14px", borderRadius:10, background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.18)", color:"#fca5a5", fontSize:13, fontWeight:600, marginBottom:18, display:"flex", alignItems:"center", gap:8 }}>
                  <span>⚠</span> {error}
                </div>
              )}

              {availableChannels.length > 1 && (
                <div style={{ display:"flex", gap:8, marginBottom:20 }}>
                  {(["email","sms"] as const).map(ch => (
                    <button
                      key={ch} type="button"
                      onClick={() => switchVerificationChannel(ch)}
                      style={{ flex:1, padding:"10px", borderRadius:9, border:`1.5px solid ${verifyChannel===ch?"rgba(99,102,241,.35)":"rgba(255,255,255,.07)"}`, background:verifyChannel===ch?"rgba(99,102,241,.12)":"rgba(255,255,255,.02)", color:verifyChannel===ch?"white":"rgba(255,255,255,.35)", font:"600 13px 'Outfit',sans-serif", cursor:"pointer", transition:"all .2s" }}>
                      {ch === "email" ? "📧 Email" : "📱 SMS"}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={verifyOtp} style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div className="otp-row" style={{ display:"flex", gap:8, justifyContent:"space-between" }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <input
                      key={i} ref={el => { otpRefs.current[i] = el; }}
                      inputMode="numeric" pattern="[0-9]*"
                      value={verifyCode[i] || ""}
                      className="otp-inp"
                      onChange={e => {
                        const next = e.target.value.replace(/\D/g,"");
                        if (!next) { setOtp(i,""); return; }
                        setOtp(i,next.slice(-1));
                        if (i < 5) focusOtp(i+1);
                      }}
                      onKeyDown={e => {
                        if (e.key === "Backspace") {
                          if (verifyCode[i]) { setOtp(i,""); e.preventDefault(); return; }
                          if (i > 0) { focusOtp(i-1); setOtp(i-1,""); e.preventDefault(); }
                        }
                      }}
                      maxLength={1} autoComplete="one-time-code"
                    />
                  ))}
                </div>

                <button type="submit" className="auth-btn" disabled={loading || otpValue.length < 6}>
                  {loading
                    ? <><span style={{ width:15, height:15, border:"2px solid rgba(255,255,255,.25)", borderTopColor:"white", borderRadius:"50%", animation:"spin .75s linear infinite", display:"inline-block" }}/>Verifying…</>
                    : "Confirm code →"
                  }
                </button>
              </form>

              <button type="button" className="auth-ghost" onClick={() => resendOtp()} style={{ marginTop:10 }}>
                Resend code
              </button>

              <button type="button" onClick={() => setMode("signin")}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,.28)", fontSize:13, cursor:"pointer", fontFamily:"'Outfit',sans-serif", display:"flex", alignItems:"center", gap:6, margin:"16px auto 0", padding:"4px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                Back to login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
