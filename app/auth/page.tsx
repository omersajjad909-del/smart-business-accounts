"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Mail, Lock, Loader2, CheckCircle2, ShieldCheck, Sparkles, Eye, EyeOff } from "lucide-react";

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
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [otpEmail, setOtpEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOtpForm, setShowOtpForm] = useState(false);

  useEffect(() => {
    setMode(modeParam === "signup" ? "signup" : "signin");
    setMessage(null);
    setError(null);
  }, [modeParam]);

  const redirectTo = useMemo(() => {
    if (redirectParam && redirectParam.startsWith("/")) return redirectParam;
    return "/dashboard";
  }, [redirectParam]);

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

      if (!response.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

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
    if (!verificationToken) {
      setError("Verification session expired. Please try again.");
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/auth/verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationToken,
          code: otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid code.");
        return;
      }

      setMessage("Email verified. Redirecting...");
      router.push(data.redirectTo || redirectTo);
    } catch {
      setError("Unable to verify code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!verificationToken || !otpEmail) return;

    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/auth/verify/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otpEmail,
          verificationToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to resend code.");
        return;
      }

      if (data.verificationToken) {
        setVerificationToken(data.verificationToken);
      }

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
    <div className="min-h-screen bg-[#070b1f] text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden overflow-hidden border-r border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.22),_transparent_36%),radial-gradient(circle_at_bottom_left,_rgba(168,85,247,0.18),_transparent_28%),linear-gradient(180deg,#0a1026_0%,#070b1f_100%)] lg:flex">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:70px_70px] opacity-30" />
          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
            <div className="space-y-8">
              <Link href="/" className="inline-flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-lg shadow-indigo-900/40">
                  <Image src="/logo.svg" alt="Finova" width={26} height={26} className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-semibold tracking-tight">Finova</div>
                  <div className="text-sm text-slate-300">Cloud accounting, built for real operations.</div>
                </div>
              </Link>

              <div className="max-w-xl space-y-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
                  <Sparkles className="h-4 w-4" />
                  Trusted by finance, trading, and service teams
                </span>
                <h1 className="text-5xl font-semibold leading-tight text-white xl:text-6xl">
                  Secure access to your business command center.
                </h1>
                <p className="text-lg leading-8 text-slate-300">
                  Sign in to manage accounting, inventory, payroll, reporting, and AI insights from one place.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <ShieldCheck className="mb-4 h-8 w-8 text-emerald-300" />
                <h3 className="text-lg font-semibold">Protected access</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Password login, Google sign-in, email verification, and real OTP-based onboarding.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <CheckCircle2 className="mb-4 h-8 w-8 text-indigo-300" />
                <h3 className="text-lg font-semibold">Ready for teams</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Invite users, manage permissions, and route every business to the correct dashboard flow.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <div className="mb-8 space-y-3">
              <Link href="/" className="inline-flex items-center gap-3 lg:hidden">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-lg shadow-indigo-900/30">
                  <Image src="/logo.svg" alt="Finova" width={22} height={22} className="h-5 w-5" />
                </div>
                <span className="text-xl font-semibold">Finova</span>
              </Link>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-indigo-200/80">
                  {showOtpForm ? "Verify your email" : mode === "signin" ? "Welcome back" : "Create your account"}
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  {showOtpForm
                    ? "Enter the 6-digit code"
                    : mode === "signin"
                      ? "Sign in to Finova"
                      : "Get started in minutes"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {showOtpForm
                    ? `We sent a verification code to ${otpEmail || email}.`
                    : mode === "signin"
                      ? "Use your email and password or continue with Google."
                      : "Create your workspace and verify your email to continue."}
                </p>
              </div>
            </div>

            {error ? (
              <div className="mb-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                {message}
              </div>
            ) : null}

            {!showOtpForm ? (
              <form onSubmit={handleAuth} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Work email</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0d1330] px-4 py-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@company.com"
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Password</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0d1330] px-4 py-3">
                    <Lock className="h-5 w-5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-slate-400 transition hover:text-white"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </label>

                {mode === "signin" ? (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-400">Use your company email for the fastest access.</span>
                    <Link href="/auth/forgot-password" className="font-medium text-indigo-300 hover:text-indigo-200">
                      Forgot password?
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-slate-400">
                    By creating an account, you agree to our{" "}
                    <Link href="/legal/terms" className="text-indigo-300 hover:text-indigo-200">
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link href="/legal/privacy" className="text-indigo-300 hover:text-indigo-200">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {mode === "signin" ? "Sign In" : "Create Account"}
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-[#0b1028] px-4 text-xs font-medium uppercase tracking-[0.25em] text-slate-500">
                      or
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={isGoogleLoading}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Image src="/google.svg" alt="Google" width={18} height={18} className="h-[18px] w-[18px]" />
                  )}
                  Continue with Google
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Verification code</span>
                  <div className="rounded-2xl border border-white/10 bg-[#0d1330] px-4 py-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="w-full bg-transparent text-center text-2xl font-semibold tracking-[0.45em] text-white outline-none placeholder:tracking-[0.45em] placeholder:text-slate-500"
                      required
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Verify and continue
                </button>

                <div className="flex flex-col gap-3 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="font-medium text-indigo-300 transition hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Resend code
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOtpForm(false);
                      setOtp("");
                      setMessage(null);
                      setError(null);
                    }}
                    className="font-medium text-slate-300 transition hover:text-white"
                  >
                    Back to sign in
                  </button>
                </div>
              </form>
            )}

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              {mode === "signin" ? (
                <>
                  New to Finova?{" "}
                  <button
                    type="button"
                    onClick={() => router.push(`/auth?mode=signup${redirectTo ? `&redirect=${encodeURIComponent(redirectTo)}` : ""}`)}
                    className="font-semibold text-indigo-300 hover:text-indigo-200"
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
                    className="font-semibold text-indigo-300 hover:text-indigo-200"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070b1f]" />}>
      <AuthPageInner />
    </Suspense>
  );
}
