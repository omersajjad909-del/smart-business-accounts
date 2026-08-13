"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useResponsive } from "@/hooks/useResponsive";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { isMobile } = useResponsive();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Password validation checks
  const checks = {
    minLength: newPassword.length >= 10,
    hasUppercase: /[A-Z]/.test(newPassword),
    hasLowercase: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecial: /[^A-Za-z0-9]/.test(newPassword),
    passwordsMatch: newPassword === confirmPassword && confirmPassword.length > 0,
  };

  const classesCount = Object.values(checks).slice(0, 4).filter(Boolean).length;
  const meetsClassRequirement = classesCount >= 3;
  const allChecksMet =
    checks.minLength &&
    meetsClassRequirement &&
    checks.passwordsMatch &&
    oldPassword.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allChecksMet) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/me/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: oldPassword,
          newPassword: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to change password");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    background: "var(--panel-bg)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    padding: isMobile ? "16px 14px" : "24px 28px",
    marginBottom: "20px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,.1)",
    background: "rgba(255,255,255,.03)",
    color: "white",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    transition: "all .2s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 700,
    color: "rgba(255,255,255,.4)",
    textTransform: "uppercase",
    letterSpacing: ".08em",
    marginBottom: "8px",
    display: "block",
  };

  const checkItem = (met: boolean, label: string) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "13px",
        color: met ? "#86efac" : "rgba(255,255,255,.4)",
        marginBottom: "6px",
        transition: "color .2s",
      }}
    >
      <div
        style={{
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          border: `2px solid ${met ? "#86efac" : "rgba(255,255,255,.2)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "10px",
          flexShrink: 0,
        }}
      >
        {met && "✓"}
      </div>
      {label}
    </div>
  );

  return (
    <div
      style={{
        maxWidth: "580px",
        margin: "0 auto",
        padding: isMobile ? "16px" : "32px 16px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: isMobile ? "22px" : "28px",
            fontWeight: 900,
            color: "white",
            marginBottom: "8px",
            letterSpacing: "-0.5px",
          }}
        >
          Change Password
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "rgba(255,255,255,.5)",
            lineHeight: "1.6",
          }}
        >
          Update your password to keep your account secure. You'll need to sign in again after changing it.
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            borderRadius: "10px",
            background: "rgba(16,185,129,.12)",
            border: "1px solid rgba(16,185,129,.25)",
            color: "#6ee7b7",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          ✓ Password changed successfully! Redirecting to login...
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            borderRadius: "10px",
            background: "rgba(239,68,68,.12)",
            border: "1px solid rgba(239,68,68,.25)",
            color: "#fca5a5",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          ✗ {error}
        </div>
      )}

      {/* Form Card */}
      <div style={cardStyle}>
        <form onSubmit={handleSubmit}>
          {/* Current Password */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Current Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showOld ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter your current password"
                disabled={loading || success}
                style={inputStyle}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor =
                    "rgba(99,102,241,.4)";
                  (e.target as HTMLInputElement).style.background =
                    "rgba(255,255,255,.05)";
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor =
                    "rgba(255,255,255,.1)";
                  (e.target as HTMLInputElement).style.background =
                    "rgba(255,255,255,.03)";
                }}
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,.4)",
                  cursor: "pointer",
                  fontSize: "14px",
                  padding: "4px 8px",
                }}
              >
                {showOld ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>New Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a strong password"
                disabled={loading || success}
                style={inputStyle}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor =
                    "rgba(99,102,241,.4)";
                  (e.target as HTMLInputElement).style.background =
                    "rgba(255,255,255,.05)";
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor =
                    "rgba(255,255,255,.1)";
                  (e.target as HTMLInputElement).style.background =
                    "rgba(255,255,255,.03)";
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,.4)",
                  cursor: "pointer",
                  fontSize: "14px",
                  padding: "4px 8px",
                }}
              >
                {showNew ? "🙈" : "👁️"}
              </button>
            </div>

            {/* Password Requirements */}
            {newPassword.length > 0 && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "12px 14px",
                  borderRadius: "9px",
                  background: "rgba(99,102,241,.06)",
                  border: "1px solid rgba(99,102,241,.15)",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "rgba(255,255,255,.35)",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    marginBottom: "8px",
                  }}
                >
                  Password Requirements
                </div>
                {checkItem(checks.minLength, "Minimum 10 characters")}
                {checkItem(checks.hasUppercase, "One uppercase letter")}
                {checkItem(checks.hasLowercase, "One lowercase letter")}
                {checkItem(checks.hasNumber, "One number")}
                {checkItem(checks.hasSpecial, "One special character")}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Confirm Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                disabled={loading || success}
                style={{
                  ...inputStyle,
                  borderColor:
                    confirmPassword && !checks.passwordsMatch
                      ? "rgba(239,68,68,.3)"
                      : confirmPassword && checks.passwordsMatch
                        ? "rgba(52,211,153,.3)"
                        : "rgba(255,255,255,.1)",
                }}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.background =
                    "rgba(255,255,255,.05)";
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.background =
                    "rgba(255,255,255,.03)";
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,.4)",
                  cursor: "pointer",
                  fontSize: "14px",
                  padding: "4px 8px",
                }}
              >
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>
            {confirmPassword && !checks.passwordsMatch && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#fca5a5",
                  marginTop: "6px",
                  fontWeight: 500,
                }}
              >
                Passwords do not match
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!allChecksMet || loading || success}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "10px",
              border: "none",
              background:
                !allChecksMet || loading || success
                  ? "rgba(99,102,241,.25)"
                  : "linear-gradient(135deg, #6366f1, #7c3aed)",
              color: "white",
              fontSize: "14px",
              fontWeight: 800,
              cursor: !allChecksMet || loading || success ? "not-allowed" : "pointer",
              transition: "all .2s",
              marginBottom: "14px",
            }}
            onMouseEnter={(e) => {
              if (allChecksMet && !loading && !success) {
                (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
                (e.target as HTMLButtonElement).style.boxShadow =
                  "0 8px 20px rgba(99,102,241,.3)";
              }
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              (e.target as HTMLButtonElement).style.boxShadow = "none";
            }}
          >
            {loading ? "Updating..." : success ? "✓ Password Changed" : "Change Password"}
          </button>
        </form>
      </div>

      {/* Company Information Link */}
      <div
        style={{
          marginTop: "20px",
          padding: "16px 18px",
          borderRadius: "10px",
          background: "rgba(52,211,153,.08)",
          border: "1px solid rgba(52,211,153,.2)",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "rgba(52,211,153,.8)",
            marginBottom: "8px",
            textTransform: "uppercase",
            letterSpacing: ".06em",
          }}
        >
          ℹ️ Company Information
        </div>
        <p
          style={{
            fontSize: "13px",
            color: "rgba(255,255,255,.6)",
            marginBottom: "10px",
            lineHeight: "1.5",
          }}
        >
          Manage your company details, legal information, invoice settings, and more.
        </p>
        <Link
          href="/dashboard/company-profile"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "9px 12px",
            borderRadius: "8px",
            background: "rgba(52,211,153,.15)",
            border: "1px solid rgba(52,211,153,.3)",
            color: "#86efac",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: 700,
            transition: "all .2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background =
              "rgba(52,211,153,.25)";
            (e.currentTarget as HTMLAnchorElement).style.transform =
              "translateX(2px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background =
              "rgba(52,211,153,.15)";
            (e.currentTarget as HTMLAnchorElement).style.transform = "translateX(0)";
          }}
        >
          View Company Profile →
        </Link>
      </div>

      {/* Additional Help */}
      <div
        style={{
          marginTop: "20px",
          padding: "16px 18px",
          borderRadius: "10px",
          background: "rgba(255,255,255,.02)",
          border: "1px solid rgba(255,255,255,.05)",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            color: "rgba(255,255,255,.5)",
            lineHeight: "1.6",
          }}
        >
          <strong>💡 Security Tip:</strong> Use a unique password that you don't use on other
          websites. Your password will be encrypted and securely stored.
        </div>
      </div>
    </div>
  );
}
