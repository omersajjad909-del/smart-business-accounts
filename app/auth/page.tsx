"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { setCurrentUser, clearCurrentUser } from "@/lib/auth";

/* ─── SVG Icons ──────────────────────────────────────────────────────────── */
const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="3" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconEye = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconEyeOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);
const IconSparkle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 9.27 9.27 3 12l6.27 2.73L12 21l2.73-6.27L21 12l-6.27-2.73z" />
  </svg>
);
const IconShield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
const IconCheck = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
const IconZap = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);
const IconLoader = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "auth-spin 0.8s linear infinite" }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

/* ─── Mini dashboard preview for left panel ─────────────────────────────── */
const barHeights = [28, 42, 35, 55, 48, 62, 52, 70, 58, 78, 65, 88];
const DashPreview = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    {/* Revenue trend chart card */}
    <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 3 }}>Monthly Revenue</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.6px" }}>$248,930</div>
        </div>
        <div style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 600, color: "#6ee7b7" }}>↑ 18.3%</div>
      </div>
      {/* Mini bar chart */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 64 }}>
        {barHeights.map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "4px 4px 0 0", background: i === barHeights.length - 1 ? "linear-gradient(180deg,#818cf8,#6366f1)" : "rgba(99,102,241,0.25)", transition: "height 0.3s" }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
        <span>Jan</span><span>Apr</span><span>Jul</span><span>Dec</span>
      </div>
    </div>
    {/* Two small metric cards side by side */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px 16px" }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#0ea5e9,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>Invoices</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: "-0.4px" }}>1,284</div>
        <div style={{ fontSize: 10, color: "#6ee7b7", marginTop: 4 }}>94% paid on time</div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px 16px" }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#f59e0b,#ef4444)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>Employees</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: "-0.4px" }}>38</div>
        <div style={{ fontSize: 10, color: "#fcd34d", marginTop: 4 }}>Payroll processed</div>
      </div>
    </div>
  </div>
);

/* ─── Main inner component ───────────────────────────────────────────────── */
function AuthPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const modeParam = searchParams.get("mode");
  const redirectParam = searchParams.get("redirect");

  const [mode, setMode] = useState<"signin" | "signup">(modeParam === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpBoxes, setOtpBoxes] = useState(["", "", "", "", "", ""]);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [otpEmail, setOtpEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOtpForm, setShowOtpForm] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (modeParam === "verify") {
      const emailParam = searchParams.get("email") || "";
      setOtpEmail(emailParam);
      setShowOtpForm(true);
      setMessage("We sent a 6-digit code to your email. Please enter it below.");
      return;
    }
    setMode(modeParam === "signup" ? "signup" : "signin");
    setMessage(null);
    setError(null);
  }, [modeParam, searchParams]);

  const redirectTo = useMemo(() => {
    if (redirectParam && redirectParam.startsWith("/")) return redirectParam;
    return "/dashboard";
  }, [redirectParam]);

  // Sync OTP boxes → single otp string
  useEffect(() => {
    setOtp(otpBoxes.join(""));
  }, [otpBoxes]);

  const handleOtpBox = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otpBoxes];
    next[idx] = digit;
    setOtpBoxes(next);
    if (digit && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpBoxes[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const boxes = [...otpBoxes];
    pasted.split("").forEach((ch, i) => { if (i < 6) boxes[i] = ch; });
    setOtpBoxes(boxes);
    const nextFocus = Math.min(pasted.length, 5);
    otpRefs.current[nextFocus]?.focus();
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setError(null);
    try {
      const endpoint = mode === "signin" ? "/api/auth/login" : "/api/auth/signup";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || data.message || "Something went wrong."); return; }
      if (mode === "signup" || data.needsVerification || data.requiresVerification) {
        setVerificationToken(data.verificationToken ?? null);
        setOtpEmail(data.email || email);
        setShowOtpForm(true);
        setMessage(data.message || "We have sent you a 6-digit code.");
        return;
      }
      if (data.user) {
        // Clear any stale session before setting the new user
        clearCurrentUser();
        setCurrentUser(data.user);
      }
      setMessage("Signed in successfully.");
      router.push(data.redirectTo || redirectTo);
    } catch {
      setError("Unable to complete the request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/auth/verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(verificationToken ? { verificationToken } : {}),
          code: otp,
        }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Verification session expired. Please restart signup."); return; }
      try { localStorage.removeItem("pendingVerification"); } catch {}
      if (data.user) setCurrentUser(data.user);
      setMessage("Email verified! Redirecting...");
      router.push(data.next || data.redirectTo || redirectTo);
    } catch {
      setError("Unable to verify code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpEmail) return;
    setIsLoading(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/auth/verify/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, verificationToken }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Unable to resend code."); return; }
      if (data.verificationToken) setVerificationToken(data.verificationToken);
      setMessage(data.message || "A fresh code has been sent.");
    } catch {
      setError("Unable to resend code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        @keyframes auth-spin { to { transform: rotate(360deg); } }
        @keyframes auth-orb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,-30px) scale(1.08)} }
        @keyframes auth-orb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-30px,40px) scale(1.06)} }
        @keyframes auth-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes auth-fade-up { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        .auth-page { font-family:'Outfit',sans-serif; }
        .auth-input:focus { outline: none; border-color: rgba(99,102,241,0.6) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
        .auth-input { transition: border-color 0.2s, box-shadow 0.2s; }
        .auth-btn-main:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .auth-btn-main { transition: opacity 0.2s, transform 0.2s; }
        .auth-otp-box:focus { outline: none; border-color: rgba(99,102,241,0.7) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); background: rgba(99,102,241,0.08) !important; }
        .auth-otp-box { transition: border-color 0.15s, box-shadow 0.15s, background 0.15s; }
        .auth-left-panel { animation: auth-fade-up 0.6s ease both; }
        .auth-right-panel { animation: auth-fade-up 0.6s 0.1s ease both; }
        @media (max-width: 900px) {
          .auth-left-col { display: none !important; }
          .auth-page { height: 100dvh !important; min-height: unset !important; overflow: hidden !important; }
          .auth-grid { grid-template-columns: 1fr !important; height: 100dvh !important; min-height: unset !important; }
          .auth-right-col { padding: 16px !important; height: 100dvh !important; overflow-y: auto !important; align-items: center !important; justify-content: center !important; }
          .auth-mobile-logo { display: inline-flex !important; }
        }
        @media (max-width: 480px) {
          .auth-card { padding: 20px 18px !important; border-radius: 20px !important; }
          .auth-otp-row { gap: 8px !important; }
          .auth-otp-box { width: 42px !important; height: 52px !important; font-size: 20px !important; }
        }
      `}</style>

      <div className="auth-page" style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #04061a 0%, #07091f 50%, #0a0d28 100%)",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background orbs */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", top: "-10%", left: "-5%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)", animation: "auth-orb1 10s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.14) 0%, transparent 70%)", animation: "auth-orb2 13s ease-in-out infinite" }} />
          {/* Grid */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "60px 60px", opacity: 0.6 }} />
        </div>

        <div className="auth-grid" style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", minHeight: "100vh", maxWidth: 1300, margin: "0 auto", gap: 0 }}>

          {/* ── Left Column ── */}
          <div className="auth-left-col auth-left-panel" style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "52px 56px",
            borderRight: "1px solid rgba(255,255,255,0.07)",
            background: "linear-gradient(180deg, rgba(99,102,241,0.06) 0%, transparent 60%)",
          }}>
            {/* Logo */}
            <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 14 }}>
              <img src="/icon1.png" alt="FinovaOS" width={48} height={48} style={{ objectFit: "contain", flexShrink: 0 }}/>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.4px" }}>FinovaOS</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>Cloud accounting platform</div>
              </div>
            </Link>

            {/* Headline */}
            <div style={{ marginTop: 48, flex: 1 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 100, padding: "6px 14px", fontSize: 12, fontWeight: 600, color: "#6ee7b7", marginBottom: 24 }}>
                <IconSparkle />
                Trusted by finance, trading &amp; service teams
              </div>

              <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-1.2px", color: "#fff", margin: "0 0 20px" }}>
                Your business<br />
                <span style={{ background: "linear-gradient(90deg, #818cf8, #c084fc, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  command center
                </span>
              </h1>

              <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.55)", maxWidth: 400, margin: "0 0 36px" }}>
                Manage accounting, inventory, payroll, reporting, and AI insights — all from one unified dashboard.
              </p>

              {/* Dashboard preview */}
              <div style={{ animation: "auth-float 5s ease-in-out infinite" }}>
                <DashPreview />
              </div>
            </div>

            {/* Bottom stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 36 }}>
              {[
                { value: "500+", label: "Businesses", desc: "across 6 countries", color: "#34d399", border: "rgba(52,211,153,0.2)", bg: "rgba(52,211,153,0.08)" },
                { value: "99.9%", label: "Uptime", desc: "SLA guaranteed", color: "#818cf8", border: "rgba(99,102,241,0.2)", bg: "rgba(99,102,241,0.08)" },
                { value: "4.9★", label: "Rating", desc: "from real users", color: "#fbbf24", border: "rgba(251,191,36,0.2)", bg: "rgba(251,191,36,0.08)" },
              ].map((c) => (
                <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: "14px 16px" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: c.color, letterSpacing: "-0.5px", marginBottom: 2 }}>{c.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{c.label}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className="auth-right-col auth-right-panel" style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 56px",
          }}>
            <div className="auth-card" style={{
              width: "100%",
              maxWidth: 440,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 28,
              padding: "36px 32px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
              backdropFilter: "blur(24px)",
            }}>

              {/* Mobile logo */}
              <Link href="/" style={{ textDecoration: "none", display: "none", alignItems: "center", gap: 12, marginBottom: 24 }} className="auth-mobile-logo">
                <img src="/icon1.png" alt="FinovaOS" width={40} height={40} style={{ objectFit: "contain", flexShrink: 0 }}/>
                <span style={{ fontSize: 20, fontWeight: 700 }}>FinovaOS</span>
              </Link>

              {/* Header */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(165,180,252,0.8)", marginBottom: 8 }}>
                  {showOtpForm ? "Verify your email" : mode === "signin" ? "Welcome back" : "Create account"}
                </div>
                <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.7px", color: "#fff", margin: "0 0 10px" }}>
                  {showOtpForm
                    ? "Enter the 6-digit code"
                    : mode === "signin"
                    ? "Sign in to FinovaOS"
                    : "Get started today"}
                </h2>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                  {showOtpForm
                    ? `Code sent to ${otpEmail || email}`
                    : mode === "signin"
                    ? "Enter your email and password to continue."
                    : "Create your workspace and verify your email to continue."}
                </p>
              </div>

              {/* Alerts */}
              {error && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 14, padding: "12px 16px", fontSize: 13, color: "#fca5a5", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}
              {message && (
                <div style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 14, padding: "12px 16px", fontSize: 13, color: "#6ee7b7", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                  {message}
                </div>
              )}

              {/* ── Auth Form ── */}
              {!showOtpForm ? (
                <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {/* Email */}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.75)", marginBottom: 8 }}>Work email</label>
                    <div className="auth-input" style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "13px 16px" }}>
                      <span style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }}><IconMail /></span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                        autoComplete="email"
                        placeholder="you@company.com"
                        style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: "#fff", fontFamily: "inherit" }}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.75)", marginBottom: 8 }}>Password</label>
                    <div className="auth-input" style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "13px 16px" }}>
                      <span style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }}><IconLock /></span>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        placeholder="Enter your password"
                        style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: "#fff", fontFamily: "inherit" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: 0, display: "flex" }}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <IconEyeOff /> : <IconEye />}
                      </button>
                    </div>
                  </div>

                  {/* Forgot / Terms */}
                  {mode === "signin" ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>Use your company email.</span>
                      <Link href="/auth/forgot-password" style={{ fontWeight: 600, color: "#a5b4fc", textDecoration: "none" }}>Forgot password?</Link>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: 0 }}>
                      By creating an account you agree to our{" "}
                      <Link href="/legal/terms" style={{ color: "#a5b4fc", textDecoration: "none" }}>Terms</Link>
                      {" "}and{" "}
                      <Link href="/legal/privacy" style={{ color: "#a5b4fc", textDecoration: "none" }}>Privacy Policy</Link>.
                    </p>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="auth-btn-main"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef)",
                      border: "none", borderRadius: 14, padding: "14px", fontSize: 14, fontWeight: 600,
                      color: "#fff", cursor: isLoading ? "not-allowed" : "pointer",
                      opacity: isLoading ? 0.6 : 1, boxShadow: "0 8px 24px rgba(99,102,241,0.35)",
                      fontFamily: "inherit",
                    }}
                  >
                    {isLoading && <IconLoader />}
                    {mode === "signin" ? "Sign In" : "Create Account"}
                    {!isLoading && <IconArrow />}
                  </button>

                </form>
              ) : (
                /* ── OTP Form ── */
                <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.75)", marginBottom: 16, textAlign: "center" }}>
                      Enter the 6-digit verification code
                    </label>
                    <div className="auth-otp-row" style={{ display: "flex", justifyContent: "center", gap: 10 }} onPaste={handleOtpPaste}>
                      {otpBoxes.map((val, i) => (
                        <input
                          key={i}
                          ref={(el) => { otpRefs.current[i] = el; }}
                          className="auth-otp-box"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={val}
                          onChange={(e) => handleOtpBox(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          style={{
                            width: 48, height: 58, borderRadius: 14,
                            background: val ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.05)",
                            border: val ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.12)",
                            fontSize: 22, fontWeight: 700, color: "#fff",
                            textAlign: "center", fontFamily: "inherit",
                            cursor: "text",
                          }}
                        />
                      ))}
                    </div>
                    <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 12 }}>
                      Didn&apos;t receive a code?{" "}
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isLoading}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#a5b4fc", fontFamily: "inherit", padding: 0 }}
                      >
                        Resend
                      </button>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otp.length !== 6}
                    className="auth-btn-main"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                      background: otp.length === 6 ? "linear-gradient(135deg,#6366f1,#8b5cf6,#d946ef)" : "rgba(255,255,255,0.07)",
                      border: "none", borderRadius: 14, padding: "14px", fontSize: 14, fontWeight: 600,
                      color: "#fff", cursor: (isLoading || otp.length !== 6) ? "not-allowed" : "pointer",
                      opacity: (isLoading || otp.length !== 6) ? 0.6 : 1,
                      boxShadow: otp.length === 6 ? "0 8px 24px rgba(99,102,241,0.35)" : "none",
                      transition: "background 0.2s, box-shadow 0.2s", fontFamily: "inherit",
                    }}
                  >
                    {isLoading && <IconLoader />}
                    Verify and continue
                    {!isLoading && <IconArrow />}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShowOtpForm(false); setOtpBoxes(["","","","","",""]); setMessage(null); setError(null); }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "inherit", textAlign: "center" }}
                  >
                    &larr; Back to sign in
                  </button>
                </form>
              )}

              {/* Switch mode */}
              {!showOtpForm && (
                <div style={{ marginTop: 24, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "13px 16px", fontSize: 13, color: "rgba(255,255,255,0.55)", textAlign: "center" }}>
                  {mode === "signin" ? (
                    <>
                      New to FinovaOS?{" "}
                      <button
                        type="button"
                        onClick={() => router.push(`/auth?mode=signup${redirectTo ? `&redirect=${encodeURIComponent(redirectTo)}` : ""}`)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#a5b4fc", fontFamily: "inherit", padding: 0 }}
                      >
                        Create an account
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => router.push(`/auth?mode=signin${redirectTo ? `&redirect=${encodeURIComponent(redirectTo)}` : ""}`)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#a5b4fc", fontFamily: "inherit", padding: 0 }}
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#04061a" }} />}>
      <AuthPageInner />
    </Suspense>
  );
}
