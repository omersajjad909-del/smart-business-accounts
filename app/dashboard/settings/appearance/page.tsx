"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { BRAND_ORDER, BRAND_PRESETS, type BrandKey } from "@/lib/brandPalette";
import { getCurrentUser } from "@/lib/auth";

type ThemeMode = "light" | "dark" | "auto";
type Density = "compact" | "comfortable";
type Sidebar = "expanded" | "collapsed";

type UserPrefs = { themeMode: ThemeMode; density: Density; sidebarDefault: Sidebar };
type CompanyBranding = { name: string; logoUrl: string | null; brandColor: BrandKey };

const CARD: React.CSSProperties = {
  background: "var(--card-bg, rgba(255,255,255,.03))",
  border: "1px solid var(--card-border, rgba(255,255,255,.08))",
  borderRadius: 16,
  padding: 24,
  color: "var(--text-primary, #fff)",
};

const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase",
  color: "var(--text-muted, rgba(255,255,255,.5))", marginBottom: 10,
};

export default function AppearancePage() {
  const currentUser = getCurrentUser() as { role?: string } | null;
  const isAdmin = String(currentUser?.role || "").toUpperCase() === "ADMIN";

  const [prefs, setPrefs] = useState<UserPrefs>({ themeMode: "auto", density: "comfortable", sidebarDefault: "expanded" });
  const [brand, setBrand] = useState<CompanyBranding>({ name: "", logoUrl: null, brandColor: "teal" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [uRes, cRes] = await Promise.all([
          fetch("/api/preferences/user", { cache: "no-store" }),
          fetch("/api/preferences/company", { cache: "no-store" }),
        ]);
        if (uRes.ok) setPrefs(await uRes.json());
        if (cRes.ok) setBrand(await cRes.json());
      } catch {}
      setLoading(false);
    })();
  }, []);

  // Live preview — apply CSS variables locally as soon as user changes selection
  const preset = BRAND_PRESETS[brand.brandColor] || BRAND_PRESETS.teal;
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", preset.accent);
    document.documentElement.style.setProperty("--accent-strong", preset.accentStrong);
    document.documentElement.style.setProperty("--accent-soft", preset.accentSoft);
  }, [preset.accent, preset.accentStrong, preset.accentSoft]);

  useEffect(() => {
    // Apply theme mode preview
    const root = document.documentElement;
    if (prefs.themeMode === "dark") root.classList.add("dark");
    else if (prefs.themeMode === "light") root.classList.remove("dark");
    else {
      // auto
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    }
  }, [prefs.themeMode]);

  async function saveUserPrefs(patch: Partial<UserPrefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      const r = await fetch("/api/preferences/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error("save failed");
    } catch {
      toast.error("Couldn't save preference");
    }
  }

  async function saveBranding(patch: Partial<CompanyBranding>) {
    if (!isAdmin) return;
    const next = { ...brand, ...patch };
    setBrand(next);
    setSaving(true);
    try {
      const r = await fetch("/api/preferences/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandColor: patch.brandColor,
          name: patch.name,
        }),
      });
      if (!r.ok) throw new Error();
      toast.success("Branding updated");
    } catch {
      toast.error("Couldn't save branding");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file: File) {
    if (!isAdmin) return;
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/preferences/company/logo", { method: "POST", body: fd });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Upload failed");
      }
      const d = await r.json();
      setBrand(b => ({ ...b, logoUrl: d.logoUrl }));
      toast.success("Logo updated");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setLogoUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeLogo() {
    if (!isAdmin) return;
    try {
      await fetch("/api/preferences/company/logo", { method: "DELETE" });
      setBrand(b => ({ ...b, logoUrl: null }));
      toast.success("Logo removed");
    } catch {
      toast.error("Couldn't remove logo");
    }
  }

  if (loading) {
    return <div style={{ padding: 40, color: "var(--text-muted, rgba(255,255,255,.5))" }}>Loading appearance…</div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 80px", display: "flex", flexDirection: "column", gap: 22, fontFamily: "'Outfit','Inter',sans-serif" }}>
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Appearance</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted, rgba(255,255,255,.5))", margin: "6px 0 0", lineHeight: 1.6 }}>
          Personal settings apply to your account. Branding is shared across everyone in your company{isAdmin ? "" : " and can only be changed by an admin"}.
        </p>
      </header>

      {/* ── Company Branding (admin) ────────────────────────────────── */}
      <section style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 2 }}>Company branding</div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted, rgba(255,255,255,.45))" }}>
              Logo and brand color appear on the dashboard, invoices, and shared documents.
            </div>
          </div>
          {!isAdmin && (
            <span style={{ padding: "5px 10px", borderRadius: 999, background: "rgba(251,191,36,.15)", border: "1px solid rgba(251,191,36,.35)", color: "#fbbf24", fontSize: 11, fontWeight: 700 }}>
              Read only — admin required
            </span>
          )}
        </div>

        {/* Logo */}
        <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 24 }}>
          <div style={{ width: 84, height: 84, borderRadius: 16, background: "var(--sidebar-bg, rgba(255,255,255,.05))", border: "1px solid var(--card-border, rgba(255,255,255,.1))", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            {brand.logoUrl
              ? <img src={brand.logoUrl} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              : <span style={{ fontSize: 30, opacity: 0.4 }}>🏢</span>
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={LABEL}>Company logo</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])}
                style={{ display: "none" }}
                disabled={!isAdmin || logoUploading}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={!isAdmin || logoUploading}
                style={{
                  padding: "9px 16px", borderRadius: 10, border: "1px solid var(--card-border, rgba(255,255,255,.12))",
                  background: "var(--accent-soft, rgba(13,148,136,.1))", color: "var(--accent, #0d9488)",
                  fontSize: 13, fontWeight: 700, cursor: (!isAdmin || logoUploading) ? "not-allowed" : "pointer",
                }}
              >
                {logoUploading ? "Uploading…" : brand.logoUrl ? "Change logo" : "Upload logo"}
              </button>
              {brand.logoUrl && isAdmin && (
                <button
                  onClick={removeLogo}
                  style={{
                    padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(239,68,68,.25)",
                    background: "rgba(239,68,68,.08)", color: "#f87171", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted, rgba(255,255,255,.35))", marginTop: 8 }}>
              PNG, JPEG, WebP or SVG — max 1 MB
            </div>
          </div>
        </div>

        {/* Brand color palette */}
        <div style={{ marginBottom: 18 }}>
          <div style={LABEL}>Brand color</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: 10 }}>
            {BRAND_ORDER.map(k => {
              const p = BRAND_PRESETS[k];
              const active = brand.brandColor === k;
              return (
                <button
                  key={k}
                  onClick={() => saveBranding({ brandColor: k })}
                  disabled={!isAdmin || saving}
                  style={{
                    padding: "12px 8px 10px", borderRadius: 12,
                    border: `1.5px solid ${active ? p.accent : "var(--card-border, rgba(255,255,255,.08))"}`,
                    background: active ? p.accentSoft : "var(--sidebar-bg, rgba(255,255,255,.03))",
                    cursor: (!isAdmin || saving) ? "not-allowed" : "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    transition: "all .15s ease",
                  }}
                >
                  <span style={{ width: 26, height: 26, borderRadius: 8, background: p.accent, boxShadow: active ? `0 0 0 3px ${p.accentSoft}` : "none" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: active ? p.accent : "var(--text-primary, #fff)", textAlign: "center" }}>
                    {p.label.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Company name */}
        <div>
          <div style={LABEL}>Display name</div>
          <input
            value={brand.name}
            onChange={e => setBrand({ ...brand, name: e.target.value })}
            onBlur={e => e.target.value.trim() && saveBranding({ name: e.target.value.trim() })}
            disabled={!isAdmin || saving}
            placeholder="Your company name"
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 10,
              background: "var(--sidebar-bg, rgba(255,255,255,.03))",
              border: "1px solid var(--card-border, rgba(255,255,255,.1))",
              color: "var(--text-primary, #fff)", fontSize: 14, fontFamily: "inherit", outline: "none",
            }}
          />
        </div>
      </section>

      {/* ── Personal preferences ────────────────────────────────────── */}
      <section style={CARD}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 2 }}>Personal preferences</div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted, rgba(255,255,255,.45))" }}>
            Only affects your view. Every teammate has their own settings.
          </div>
        </div>

        {/* Theme mode */}
        <div style={{ marginBottom: 22 }}>
          <div style={LABEL}>Theme</div>
          <SegmentedControl
            value={prefs.themeMode}
            options={[{v:"light",l:"☀️ Light"},{v:"dark",l:"🌙 Dark"},{v:"auto",l:"🖥 Auto"}]}
            onChange={v => saveUserPrefs({ themeMode: v as ThemeMode })}
          />
        </div>

        {/* Density */}
        <div style={{ marginBottom: 22 }}>
          <div style={LABEL}>Density</div>
          <SegmentedControl
            value={prefs.density}
            options={[{v:"comfortable",l:"Comfortable"},{v:"compact",l:"Compact"}]}
            onChange={v => saveUserPrefs({ density: v as Density })}
          />
        </div>

        {/* Sidebar default */}
        <div>
          <div style={LABEL}>Sidebar default</div>
          <SegmentedControl
            value={prefs.sidebarDefault}
            options={[{v:"expanded",l:"Expanded"},{v:"collapsed",l:"Collapsed"}]}
            onChange={v => saveUserPrefs({ sidebarDefault: v as Sidebar })}
          />
        </div>
      </section>
    </div>
  );
}

function SegmentedControl({
  value, options, onChange,
}: {
  value: string;
  options: { v: string; l: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div style={{
      display: "inline-flex", padding: 4, borderRadius: 12,
      background: "var(--sidebar-bg, rgba(255,255,255,.03))",
      border: "1px solid var(--card-border, rgba(255,255,255,.08))",
      gap: 2,
    }}>
      {options.map(o => {
        const active = o.v === value;
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            style={{
              padding: "8px 16px", borderRadius: 9, border: "none",
              background: active ? "var(--accent-soft, rgba(13,148,136,.15))" : "transparent",
              color: active ? "var(--accent, #0d9488)" : "var(--text-primary, #fff)",
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              transition: "all .12s ease",
            }}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}
