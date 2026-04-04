"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ClientAcceptInvite() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token") || "";

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState("");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setInviteError("Invalid invite link — no token found."); setLoadingInvite(false); return; }
    fetch(`/api/invitations/preview?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(j => {
        if (j.error) { setInviteError(j.error); }
        else { setInviteEmail(j.email || ""); setInviteRole(j.role || ""); }
      })
      .catch(() => setInviteError("Could not load invite details."))
      .finally(() => setLoadingInvite(false));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const r = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const j = await r.json();
      if (r.ok && j.ok) {
        setDone(true);
        setTimeout(() => router.replace("/login"), 1800);
      } else {
        setError(j.error || "Failed to accept invite");
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const bg: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #04061a 0%, #07091f 50%, #0d0f2b 100%)",
    fontFamily: "'Outfit', 'Inter', sans-serif",
    padding: "24px",
  };

  const card: React.CSSProperties = {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    backdropFilter: "blur(20px)",
    padding: "36px 32px",
    boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
  };

  const label: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700,
    color: "rgba(255,255,255,0.45)", letterSpacing: ".08em",
    textTransform: "uppercase", marginBottom: 6,
  };

  const input: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    color: "white", fontSize: 14, outline: "none", boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const readonlyInput: React.CSSProperties = {
    ...input,
    background: "rgba(99,102,241,0.08)",
    border: "1px solid rgba(99,102,241,0.25)",
    color: "rgba(255,255,255,0.7)",
    cursor: "default",
  };

  if (loadingInvite) return (
    <div style={bg}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin .7s linear infinite", margin: "0 auto 16px" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Loading invite…</div>
      </div>
    </div>
  );

  if (inviteError) return (
    <div style={bg}>
      <div style={card}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#f87171", marginBottom: 8 }}>Invalid Invite</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{inviteError}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={bg}>
      <div style={card}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="8" width="14" height="2.5" rx="1.25" fill="white" opacity=".9"/>
              <rect x="4" y="4.5" width="10" height="2.5" rx="1.25" fill="white" opacity=".65"/>
              <rect x="6" y="11.5" width="6" height="2.5" rx="1.25" fill="white" opacity=".45"/>
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: "white", letterSpacing: "-.3px" }}>FinovaOS</span>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "white", margin: "0 0 6px", letterSpacing: "-.4px" }}>Accept Invite</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>Set up your account to join the team.</p>
        </div>

        {done ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#34d399", marginBottom: 6 }}>Account created!</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Redirecting to login…</div>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Email — read only from invite */}
            <div>
              <label style={label}>Your Email</label>
              <input style={readonlyInput} value={inviteEmail} readOnly />
              {inviteRole && (
                <div style={{ marginTop: 6, fontSize: 11, color: "rgba(99,102,241,0.8)", fontWeight: 600 }}>
                  Role: {inviteRole}
                </div>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label style={label}>Your Name</label>
              <input
                style={input}
                placeholder="Enter your full name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label style={label}>Set Password</label>
              <input
                style={input}
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", fontSize: 13, color: "#f87171" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "13px", borderRadius: 10, border: "none",
                background: submitting ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#4f46e5,#6366f1)",
                color: "white", fontWeight: 700, fontSize: 14,
                cursor: submitting ? "not-allowed" : "pointer", fontFamily: "inherit",
                marginTop: 4,
              }}
            >
              {submitting ? "Creating account…" : "Join Team"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
