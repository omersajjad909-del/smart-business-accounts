"use client";

import { FormEvent, useEffect, useState } from "react";
import ImageAdjusterModal from "@/components/ImageAdjusterModal";
import { dispatchUserProfileUpdated } from "@/lib/dashboardProfileEvents";
import { getCurrentUser, updateStoredUser } from "@/lib/auth";

type ProfileResponse = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  avatar?: string | null;
  joined?: string;
  error?: string;
  success?: boolean;
};

type CompanyResponse = {
  name?: string;
};

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

function dataUrlToBlob(dataUrl: string) {
  const [meta, content] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(meta || "")?.[1] || "image/png";
  const binary = atob(content || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export default function AccountSettingsPage() {
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [joined, setJoined] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const [profileRes, companyRes] = await Promise.all([
          fetch("/api/me/profile", { cache: "no-store" }),
          fetch("/api/me/company", { cache: "no-store" }),
        ]);

        const profileData: ProfileResponse = await profileRes.json().catch(() => ({}));
        const companyData: CompanyResponse = await companyRes.json().catch(() => ({}));

        if (!profileRes.ok) {
          throw new Error(profileData.error || "Unable to load account settings.");
        }

        if (!active) return;

        setName(profileData.name || "");
        setEmail(profileData.email || "");
        setRole(profileData.role || "");
        setJoined(profileData.joined || "");
        setAvatar(profileData.avatar || null);
        setCompanyName(companyData.name || "");
      } catch (error) {
        if (!active) return;
        setProfileError(error instanceof Error ? error.message : "Unable to load account settings.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  function syncStoredUser(next: { name?: string; email?: string; avatar?: string | null }) {
    updateStoredUser((stored: any) => ({
      ...stored,
      name: next.name ?? stored?.name,
      email: next.email ?? stored?.email,
      avatar: next.avatar !== undefined ? next.avatar : stored?.avatar,
      user: {
        ...(stored?.user || {}),
        name: next.name ?? stored?.user?.name,
        email: next.email ?? stored?.user?.email,
        avatar: next.avatar !== undefined ? next.avatar : stored?.user?.avatar,
      },
    }));
    dispatchUserProfileUpdated(next);
  }

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage("");
    setProfileError("");

    try {
      const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data: ProfileResponse = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to update profile.");
      }

      setRole(data.role || role);
      setJoined(data.joined || joined);
      syncStoredUser({ name: data.name || name, email: data.email || email, avatar: data.avatar ?? avatar });
      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function uploadAvatar(dataUrl: string) {
    setUploadingPhoto(true);
    setProfileMessage("");
    setProfileError("");
    try {
      const formData = new FormData();
      formData.append("avatar", new File([dataUrlToBlob(dataUrl)], "avatar.png", { type: "image/png" }));
      const response = await fetch("/api/me/avatar", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to upload photo.");
      }
      setAvatar(data.avatar || null);
      syncStoredUser({ avatar: data.avatar || null });
      setProfileMessage("Profile photo updated.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to upload photo.");
    } finally {
      setUploadingPhoto(false);
      setPendingAvatarFile(null);
    }
  }

  async function removeAvatar() {
    setUploadingPhoto(true);
    setProfileMessage("");
    setProfileError("");
    try {
      const response = await fetch("/api/me/avatar", { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to remove photo.");
      }
      setAvatar(null);
      syncStoredUser({ avatar: null });
      setProfileMessage("Profile photo removed.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to remove photo.");
    } finally {
      setUploadingPhoto(false);
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

      const response = await fetch("/api/me/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const initials = (name || email || "U").trim().charAt(0).toUpperCase();

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", paddingBottom: 40 }}>
      <ImageAdjusterModal
        open={!!pendingAvatarFile}
        file={pendingAvatarFile}
        title="Adjust Profile Photo"
        description="WhatsApp jaisa drag aur zoom use karke apna chehra frame me set karen."
        shape="circle"
        onCancel={() => setPendingAvatarFile(null)}
        onConfirm={uploadAvatar}
      />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Account Settings</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.46)" }}>
          Yahin se aap apni photo, naam, email aur password manage kar sakte hain.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 18 }}>
        <section style={cardStyle}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Profile Details</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)" }}>
              Yahan wali photo navbar aur sidebar me bhi turant update hogi.
            </div>
          </div>

          {profileError ? <div style={{ marginBottom: 14, padding: "11px 12px", borderRadius: 12, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#fca5a5", fontSize: 12, fontWeight: 700 }}>{profileError}</div> : null}
          {profileMessage ? <div style={{ marginBottom: 14, padding: "11px 12px", borderRadius: 12, background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.25)", color: "#86efac", fontSize: 12, fontWeight: 700 }}>{profileMessage}</div> : null}

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
            <div style={{ width: 84, height: 84, borderRadius: "50%", overflow: "hidden", background: "linear-gradient(135deg,#4f46e5,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800, flexShrink: 0 }}>
              {avatar ? <img src={avatar} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{name || email || "User"}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", marginTop: 4 }}>
                Drag, zoom aur reposition karke face ko center me la sakte hain.
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                <label style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(99,102,241,.35)", background: "rgba(99,102,241,.12)", color: "#c7d2fe", fontSize: 13, fontWeight: 800, cursor: loading || uploadingPhoto ? "not-allowed" : "pointer", opacity: loading || uploadingPhoto ? 0.65 : 1 }}>
                  {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                  <input type="file" accept="image/*" style={{ display: "none" }} disabled={loading || uploadingPhoto} onChange={(event) => setPendingAvatarFile(event.target.files?.[0] || null)} />
                </label>
                <button type="button" disabled={!avatar || uploadingPhoto} onClick={removeAvatar} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "rgba(255,255,255,.8)", fontSize: 13, fontWeight: 700, cursor: !avatar || uploadingPhoto ? "not-allowed" : "pointer", opacity: !avatar || uploadingPhoto ? 0.55 : 1 }}>
                  Remove
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit}>
            <div style={{ display: "grid", gap: 14 }}>
              <label>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.36)", marginBottom: 8 }}>Full Name</div>
                <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Your name" disabled={loading || savingProfile} />
              </label>

              <label>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.36)", marginBottom: 8 }}>Email</div>
                <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="you@example.com" disabled={loading || savingProfile} />
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

        <section style={{ display: "grid", gap: 18 }}>
          <div style={cardStyle}>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Change Password</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)" }}>
                Apna current password dein aur naya secure password set karein.
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
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Company Access</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.56)", lineHeight: 1.6 }}>
              Company name ab <strong style={{ color: "white" }}>{companyName || "your company"}</strong> ke under manage hota hai.
              {isAdmin ? " Aap admin hain, is liye company name aur logo `/dashboard/company-profile` se change kar sakte hain." : " Sirf admin company name aur logo change kar sakta hai."}
            </div>
            <a href="/dashboard/company-profile" style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 14px", borderRadius: 12, textDecoration: "none", color: "#c7d2fe", background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.25)", fontWeight: 800, fontSize: 13 }}>
              Open Company Profile
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
