"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";

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
const IconGoogle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

/* ─── Mini dashboard preview cards for left panel ───────────────────────── */
const DashPreview = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    {/* Revenue card */}
    <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>Total Revenue</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>$84,320</div>
      </div>
      <div style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 8, padding: "2px 8px", fontSize: 11, fontWeight: 600, color: "#6ee7b7" }}>+12.4%</div>
    </div>
    {/* Inventory card */}
    <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#0ea5e9,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>Inventory Items</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>2,847</div>
      </div>
      <div style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8, padding: "2px 8px", fontSize: 11, fontWeight: 600, color: "#a5b4fc" }}>In stock</div>
    </div>
    {/* Payroll card */}
    <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#f59e0b,#ef4444)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>Team Payroll</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>$18,500</div>
      </div>
      <div style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, padding: "2px 8px", fontSize: 11, fontWeight: 600, color: "#fcd34d" }}>Processed</div>
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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
      if (!response.ok) { setError(data.error || "Something went wrong."); return; }
      if (mode === "signup" || data.requiresVerification) {
        setVerificationToken(data.verificationToken ?? null);
        setOtpEmail(data.email || email);
        setShowOtpForm(true);
        setMessage(data.message || "We have sent you a 6-digit code.");
        return;
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

  const handleGoogle = async () => {
    setIsGoogleLoading(true);
    setError(null);
    setMessage(null);
    try {
      const url = new URL("/api/auth/google/start", window.location.origin);
      if (redirectTo) url.searchParams.set("redirect", redirectTo);
      window.location.href = url.toString();
    } catch {
      setError("Google sign-in could not be started.");
      setIsGoogleLoading(false);
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
        .auth-btn-google:hover:not(:disabled) { background: rgba(255,255,255,0.1) !important; }
        .auth-btn-google { transition: background 0.2s; }
        .auth-otp-box:focus { outline: none; border-color: rgba(99,102,241,0.7) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); background: rgba(99,102,241,0.08) !important; }
        .auth-otp-box { transition: border-color 0.15s, box-shadow 0.15s, background 0.15s; }
        .auth-left-panel { animation: auth-fade-up 0.6s ease both; }
        .auth-right-panel { animation: auth-fade-up 0.6s 0.1s ease both; }
        @media (max-width: 900px) {
          .auth-left-col { display: none !important; }
          .auth-grid { grid-template-columns: 1fr !important; }
          .auth-right-col { padding: 24px 16px !important; }
          .auth-mobile-logo { display: inline-flex !important; }
        }
        @media (max-width: 480px) {
          .auth-card { padding: 24px 20px !important; border-radius: 24px !important; }
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

        <div className="auth-grid" style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", minHeight: "100vh", maxWidth: 1300, margin: "0 auto" }}>

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
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(99,102,241,0.4)" }}>
                <Image src="/logo.svg" alt="Finova" width={24} height={24} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.4px" }}>Finova</div>
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

            {/* Bottom feature cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 36 }}>
              {[
                { icon: <IconShield />, color: "#34d399", bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.2)", label: "Protected access", desc: "OTP-verified sign-in" },
                { icon: <IconCheck />, color: "#818cf8", bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.2)", label: "Team ready", desc: "Roles & permissions" },
                { icon: <IconZap />, color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.2)", label: "AI insights", desc: "Smart analytics" },
              ].map((c) => (
                <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: "14px 16px" }}>
                  <div style={{ color: c.color, marginBottom: 8 }}>{c.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 3 }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className="auth-right-col auth-right-panel" style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 48px",
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
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6,#d946ef)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Image src="/logo.svg" alt="Finova" width={20} height={20} />
                </div>
                <span style={{ fontSize: 20, fontWeight: 700 }}>Finova</span>
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
                    ? "Sign in to Finova"
                    : "Get started today"}
                </h2>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                  {showOtpForm
                    ? `Code sent to ${otpEmail || email}`
                    : mode === "signin"
                    ? "Use your email and password or continue with Google."
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

                  {/* Divider */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>or</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                  </div>

                  {/* Google */}
                  <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={isGoogleLoading}
                    className="auth-btn-google"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 14, padding: "13px", fontSize: 14, fontWeight: 500,
                      color: "#fff", cursor: isGoogleLoading ? "not-allowed" : "pointer",
                      opacity: isGoogleLoading ? 0.6 : 1, fontFamily: "inherit",
                    }}
                  >
                    {isGoogleLoading ? <IconLoader /> : <IconGoogle />}
                    Continue with Google
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
                      New to Finova?{" "}
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
