"use client";

import { FormEvent, useEffect, useState } from "react";
import { getCurrentUser, updateStoredUser } from "@/lib/auth";

type ProfileResponse = {
  name?: string;
  email?: string;
  role?: string;
  joined?: string;
  error?: string;
  success?: boolean;
};

function getHeaders() {
  const user = getCurrentUser();
  return {
    "Content-Type": "application/json",
    "x-user-id": user?.id || "",
    "x-user-role": user?.role || "",
  };
}

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,.03)",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 20,
  padding: 24,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(255,255,255,.1)",
  color: "white",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [joined, setJoined] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setProfileError("");
      try {
        const response = await fetch("/api/admin/profile", {
          headers: getHeaders(),
          credentials: "include",
          cache: "no-store",
        });
        const data: ProfileResponse = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Unable to load admin profile.");
        }
        if (!active) return;
        setName(data.name || "");
        setEmail(data.email || "");
        setRole(data.role || "");
        setJoined(data.joined || "");
      } catch (error) {
        if (!active) return;
        setProfileError(error instanceof Error ? error.message : "Unable to load admin profile.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage("");
    setProfileError("");

    try {
      const response = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify({ name, email }),
      });
      const data: ProfileResponse = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to update profile.");
      }

      updateStoredUser((current: any) => ({
        ...current,
        name: data.name || name,
        email: data.email || email,
        user: {
          ...(current?.user || {}),
          name: data.name || name,
          email: data.email || email,
        },
      }));

      setRole(data.role || role);
      setJoined(data.joined || joined);
      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordMessage("");
    setPasswordError("");

    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error("Please fill all password fields.");
      }
      if (newPassword.length < 8) {
        throw new Error("New password must be at least 8 characters.");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("New password and confirm password do not match.");
      }

      const response = await fetch("/api/admin/auth/change-password", {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to change password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password changed successfully.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Unable to change password.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", paddingBottom: 40 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Admin Settings</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.46)" }}>
          Update your admin profile details and change your login password.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 18 }}>
        <section style={cardStyle}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Profile Details</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)" }}>
              This controls the admin name and email shown in the admin panel.
            </div>
          </div>

          {profileError ? <div style={{ marginBottom: 14, padding: "11px 12px", borderRadius: 12, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#fca5a5", fontSize: 12, fontWeight: 700 }}>{profileError}</div> : null}
          {profileMessage ? <div style={{ marginBottom: 14, padding: "11px 12px", borderRadius: 12, background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.25)", color: "#86efac", fontSize: 12, fontWeight: 700 }}>{profileMessage}</div> : null}

          <form onSubmit={handleProfileSubmit}>
            <div style={{ display: "grid", gap: 14 }}>
              <label>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.36)", marginBottom: 8 }}>Full Name</div>
                <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Admin name" disabled={loading || savingProfile} />
              </label>

              <label>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.36)", marginBottom: 8 }}>Email</div>
                <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="admin@example.com" disabled={loading || savingProfile} />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.36)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Role</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{role || "-"}</div>
                </div>
                <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.36)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Joined</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{joined ? new Date(joined).toLocaleDateString() : "-"}</div>
                </div>
              </div>

              <button type="submit" disabled={loading || savingProfile} style={{ marginTop: 4, padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(124,58,237,.35)", background: "linear-gradient(135deg, rgba(124,58,237,.95), rgba(139,92,246,.95))", color: "white", fontSize: 14, fontWeight: 800, cursor: "pointer", opacity: loading || savingProfile ? 0.65 : 1 }}>
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </section>

        <section style={cardStyle}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Change Password</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)" }}>
              Use your current password first, then set a new secure password.
            </div>
          </div>

          {passwordError ? <div style={{ marginBottom: 14, padding: "11px 12px", borderRadius: 12, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#fca5a5", fontSize: 12, fontWeight: 700 }}>{passwordError}</div> : null}
          {passwordMessage ? <div style={{ marginBottom: 14, padding: "11px 12px", borderRadius: 12, background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.25)", color: "#86efac", fontSize: 12, fontWeight: 700 }}>{passwordMessage}</div> : null}

          <form onSubmit={handlePasswordSubmit}>
            <div style={{ display: "grid", gap: 14 }}>
              <label>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.36)", marginBottom: 8 }}>Current Password</div>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={inputStyle} placeholder="Enter current password" disabled={savingPassword} />
              </label>

              <label>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.36)", marginBottom: 8 }}>New Password</div>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} placeholder="Enter new password" disabled={savingPassword} />
              </label>

              <label>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.36)", marginBottom: 8 }}>Confirm Password</div>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} placeholder="Confirm new password" disabled={savingPassword} />
              </label>

              <button type="submit" disabled={savingPassword} style={{ marginTop: 4, padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(56,189,248,.3)", background: "rgba(56,189,248,.14)", color: "#7dd3fc", fontSize: 14, fontWeight: 800, cursor: "pointer", opacity: savingPassword ? 0.65 : 1 }}>
                {savingPassword ? "Updating..." : "Change Password"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
