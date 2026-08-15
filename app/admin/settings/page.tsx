"use client";

import { FormEvent, useEffect, useState } from "react";
import { getCurrentUser, updateStoredUser } from "@/lib/auth";
import ImageAdjusterModal from "@/components/ImageAdjusterModal";

type ProfileResponse = {
  name?: string;
  email?: string;
  role?: string;
  avatar?: string | null;
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

  const [avatar, setAvatar] = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
        setAvatar(data.avatar || null);
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

  /**
   * Saves the cropped photo, or clears it when `next` is null. Sent on its own
   * rather than folded into Save Profile: a photo is picked and confirmed in
   * one gesture, and making the admin press a second button after cropping is
   * how photos end up silently unsaved.
   */
  async function savePhoto(next: string | null) {
    setUploadingPhoto(true);
    setProfileMessage("");
    setProfileError("");

    try {
      const response = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify({ avatar: next }),
      });
      const data: ProfileResponse = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to update photo.");
      }

      const saved = data.avatar ?? null;
      setAvatar(saved);
      updateStoredUser((current: any) => ({
        ...current,
        avatar: saved,
        user: { ...(current?.user || {}), avatar: saved },
      }));
      setProfileMessage(next ? "Profile photo updated." : "Profile photo removed.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to update photo.");
    } finally {
      setUploadingPhoto(false);
      setPendingPhoto(null);
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

  const initials = String(name || email || "AD")
    .split(" ").map((p) => p[0] || "").join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", paddingBottom: 40 }}>
      <ImageAdjusterModal
        open={!!pendingPhoto}
        file={pendingPhoto}
        title="Adjust Profile Photo"
        description="Drag and zoom to center your face in the frame."
        shape="circle"
        onCancel={() => setPendingPhoto(null)}
        onConfirm={savePhoto}
      />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Admin Settings</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.46)" }}>
          Update your admin photo, profile details and login password.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 18 }}>
        <section style={cardStyle}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Profile Details</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)" }}>
              This controls the admin photo, name and email shown in the admin panel.
            </div>
          </div>

          {profileError ? <div style={{ marginBottom: 14, padding: "11px 12px", borderRadius: 12, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#fca5a5", fontSize: 12, fontWeight: 700 }}>{profileError}</div> : null}
          {profileMessage ? <div style={{ marginBottom: 14, padding: "11px 12px", borderRadius: 12, background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.25)", color: "#86efac", fontSize: 12, fontWeight: 700 }}>{profileMessage}</div> : null}

          {/* Photo. Saves on confirm, so it is deliberately outside the form
              below — pressing Enter in Full Name must not resubmit it. */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{ width: 84, height: 84, borderRadius: "50%", overflow: "hidden", background: "linear-gradient(135deg,#4f46e5,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, flexShrink: 0 }}>
              {avatar
                ? <img src={avatar} alt="Admin profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{name || email || "Admin"}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", marginTop: 4 }}>
                Shows in the sidebar and top bar. PNG or JPG, under 2MB.
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                <label style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(99,102,241,.35)", background: "rgba(99,102,241,.12)", color: "#c7d2fe", fontSize: 13, fontWeight: 800, cursor: loading || uploadingPhoto ? "not-allowed" : "pointer", opacity: loading || uploadingPhoto ? 0.65 : 1 }}>
                  {uploadingPhoto ? "Saving..." : avatar ? "Change Photo" : "Upload Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    disabled={loading || uploadingPhoto}
                    onChange={(e) => { setPendingPhoto(e.target.files?.[0] || null); e.target.value = ""; }}
                  />
                </label>
                <button
                  type="button"
                  disabled={!avatar || uploadingPhoto}
                  onClick={() => savePhoto(null)}
                  style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "rgba(255,255,255,.8)", fontSize: 13, fontWeight: 700, cursor: !avatar || uploadingPhoto ? "not-allowed" : "pointer", opacity: !avatar || uploadingPhoto ? 0.55 : 1 }}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

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
            {/* The autocomplete hints below are what make the browser's password
                manager work here. Without new-password on the field it changes,
                Chrome does not recognise this as a password change at all, so it
                never offers to generate a strong one. */}
            <div style={{ display: "grid", gap: 14 }}>
              {/* Which account the new password belongs to. Hidden because the
                  email is edited by the other form on this page, but the manager
                  needs it or it cannot update the saved entry. */}
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={email}
                readOnly
                aria-hidden="true"
                tabIndex={-1}
                style={{ display: "none" }}
              />

              <label>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.36)", marginBottom: 8 }}>Current Password</div>
                <input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={inputStyle} placeholder="Enter current password" disabled={savingPassword} />
              </label>

              <label>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.36)", marginBottom: 8 }}>New Password</div>
                <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} placeholder="Enter new password" disabled={savingPassword} />
              </label>

              <label>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.36)", marginBottom: 8 }}>Confirm Password</div>
                <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} placeholder="Confirm new password" disabled={savingPassword} />
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
