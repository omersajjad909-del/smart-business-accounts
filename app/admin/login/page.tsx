"use client";

/**
 * Admin sign-in — two steps, always.
 *
 *   1. email + password  →  /api/admin/auth/login
 *   2. 6-digit authenticator code  →  /api/admin/auth/2fa/verify
 *
 * An account with no authenticator yet is sent through enrolment between the
 * two: it shows a QR code once, and the same 6-digit field completes both the
 * enrolment and the sign-in. There is no way to skip step 2 — the password
 * step only returns a 5-minute pre-auth cookie, never a session.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { setCurrentUser } from "@/lib/auth";

type Step = "password" | "enrol" | "otp";

/** Seconds left on the current 30-second TOTP window. */
function useOtpCountdown(active: boolean) {
  const [left, setLeft] = useState(() => 30 - (Math.floor(Date.now() / 1000) % 30));
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setLeft(30 - (Math.floor(Date.now() / 1000) % 30)), 250);
    return () => clearInterval(t);
  }, [active]);
  return left;
}

const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  padding: 40,
  background: "rgba(255,255,255,.03)",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 24,
  textAlign: "center",
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "rgba(255,255,255,.4)",
  marginBottom: 8,
  textTransform: "uppercase",
  letterSpacing: ".05em",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 12,
  background: "rgba(255,255,255,.05)",
  border: "1px solid rgba(255,255,255,.1)",
  color: "white",
  outline: "none",
  transition: "all .2s",
};

const button: React.CSSProperties = {
  marginTop: 8,
  padding: 14,
  borderRadius: 12,
  background: "linear-gradient(135deg,#6366f1,#4f46e5)",
  border: "none",
  color: "white",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all .2s",
};

export default function AdminLoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [secret, setSecret] = useState("");
  const [otpAuthUrl, setOtpAuthUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const codeRef = useRef<HTMLInputElement>(null);
  const secondsLeft = useOtpCountdown(step !== "password");

  useEffect(() => {
    if (step !== "password") codeRef.current?.focus();
  }, [step]);

  const submitPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || `Error ${res.status}`);
        return;
      }
      setPassword("");
      if (data.step === "enrol") {
        // Fetch the secret straight away so the QR is on screen with the form.
        const setupRes = await fetch("/api/admin/auth/2fa/setup", { method: "POST" });
        const setup = await setupRes.json();
        if (!setupRes.ok) {
          setError(setup.error || "Could not start authenticator setup");
          return;
        }
        setSecret(setup.secret);
        setOtpAuthUrl(setup.otpAuthUrl);
        setStep("enrol");
      } else {
        setStep("otp");
      }
    } catch (err: any) {
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const submitCode = useCallback(
    async (value: string) => {
      setError("");
      setLoading(true);
      try {
        const res = await fetch("/api/admin/auth/2fa/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: value }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || `Error ${res.status}`);
          setCode("");
          if (res.status === 401 || res.status === 429) setStep("password");
          return;
        }
        // Cosmetic only — the sidebar re-reads /api/admin/auth/me on load and
        // every API call is authorised from the signed cookie, not from this.
        setCurrentUser({ ...data.user, companyId: "system" });
        router.push("/admin");
      } catch (err: any) {
        setError(err?.message || "Network error");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const onCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && !loading) void submitCode(digits);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#080c1e",
        fontFamily: "'Outfit',sans-serif",
        padding: 20,
      }}
    >
      <div style={card}>
        <div style={{ marginBottom: 28 }}>
          <img
            src="/icon.png"
            alt=""
            style={{ width: 72, height: 72, margin: "0 auto 16px", borderRadius: 12, display: "block" }}
          />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", marginBottom: 8 }}>
            {step === "password" ? "Admin Login" : step === "enrol" ? "Set up your authenticator" : "Enter your code"}
          </h1>
          <p style={{ color: "rgba(255,255,255,.4)", fontSize: 14, lineHeight: 1.5 }}>
            {step === "password"
              ? "Control Center Access"
              : step === "enrol"
              ? "Scan this once with Google Authenticator, Authy or 1Password."
              : "6-digit code from your authenticator app."}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "rgba(248,113,113,.1)",
              border: "1px solid rgba(248,113,113,.2)",
              color: "#f87171",
              fontSize: 13,
              marginBottom: 20,
              textAlign: "left",
            }}
          >
            {error}
          </div>
        )}

        {step === "password" ? (
          <form onSubmit={submitPassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ textAlign: "left" }}>
              <label style={label} htmlFor="admin-email">Email Address</label>
              <input
                id="admin-email"
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={input}
              />
            </div>
            <div style={{ textAlign: "left" }}>
              <label style={label} htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={input}
              />
            </div>
            <button type="submit" disabled={loading} style={{ ...button, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Checking…" : "Continue"}
            </button>
          </form>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {step === "enrol" && otpAuthUrl && (
              <>
                <div
                  style={{
                    background: "white",
                    padding: 14,
                    borderRadius: 16,
                    alignSelf: "center",
                    lineHeight: 0,
                  }}
                >
                  <QRCodeSVG value={otpAuthUrl} size={168} level="M" />
                </div>
                <div style={{ textAlign: "left" }}>
                  <label style={label}>Can&apos;t scan? Enter this key</label>
                  <code
                    style={{
                      display: "block",
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,.05)",
                      border: "1px solid rgba(255,255,255,.1)",
                      color: "rgba(255,255,255,.75)",
                      fontSize: 13,
                      letterSpacing: ".08em",
                      wordBreak: "break-all",
                    }}
                  >
                    {secret}
                  </code>
                </div>
              </>
            )}

            <div style={{ textAlign: "left" }}>
              <label style={label} htmlFor="admin-otp">Authentication code</label>
              <input
                id="admin-otp"
                ref={codeRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                placeholder="000000"
                style={{
                  ...input,
                  textAlign: "center",
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: ".35em",
                  paddingLeft: 24,
                }}
              />
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: "rgba(255,255,255,.35)",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 3,
                    background: "rgba(255,255,255,.08)",
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      height: "100%",
                      width: `${(secondsLeft / 30) * 100}%`,
                      background: secondsLeft <= 5 ? "#f87171" : "#6366f1",
                      transition: "width .25s linear",
                    }}
                  />
                </span>
                <span>Code changes in {secondsLeft}s</span>
              </div>
            </div>

            <button
              type="button"
              disabled={loading || code.length !== 6}
              onClick={() => void submitCode(code)}
              style={{ ...button, opacity: loading || code.length !== 6 ? 0.5 : 1 }}
            >
              {loading ? "Verifying…" : step === "enrol" ? "Confirm & sign in" : "Sign in"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("password");
                setCode("");
                setError("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,.35)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Start over
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
