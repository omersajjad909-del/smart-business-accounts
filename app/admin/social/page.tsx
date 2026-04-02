"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* ─── Types ─────────────────────────────────────────────── */
type Platform = "facebook" | "instagram" | "twitter" | "linkedin" | "tiktok" | "youtube";

type PlatformSettings = {
  enabled: boolean;
  pageUrl: string;
  // Facebook
  pageId?: string;
  accessToken?: string;
  // Instagram
  igUserId?: string;
  // Twitter
  bearerToken?: string;
  apiKey?: string;
  apiSecret?: string;
  accessTokenSecret?: string;
  // LinkedIn
  orgId?: string;
  // YouTube
  channelId?: string;
};

type SocialSettings = Record<Platform, PlatformSettings>;

type PostResult = { success: boolean; id?: string; error?: string };

type SocialPost = {
  id: string;
  createdAt: string;
  text: string;
  mediaUrl?: string;
  platforms: string[];
  results: Record<string, PostResult>;
};

/* ─── Platform meta ──────────────────────────────────────── */
const PLATFORMS: { id: Platform; name: string; icon: string; color: string; bg: string; fields: { key: string; label: string; type?: string; placeholder: string; help?: string }[] }[] = [
  {
    id: "facebook", name: "Facebook", icon: "f", color: "#1877F2", bg: "rgba(24,119,242,.12)",
    fields: [
      { key: "pageUrl",     label: "Page URL",        placeholder: "https://facebook.com/yourpage" },
      { key: "pageId",      label: "Page ID",         placeholder: "1234567890", help: "Found in Facebook Page settings → About" },
      { key: "accessToken", label: "Page Access Token", type: "password", placeholder: "EAAx...", help: "Generate in Meta Developer Console → Graph API Explorer" },
    ],
  },
  {
    id: "instagram", name: "Instagram", icon: "◈", color: "#E1306C", bg: "rgba(225,48,108,.12)",
    fields: [
      { key: "pageUrl",     label: "Profile URL",     placeholder: "https://instagram.com/yourhandle" },
      { key: "igUserId",   label: "IG User ID",      placeholder: "17841400...", help: "Connected Instagram Business Account ID via Facebook" },
      { key: "accessToken", label: "Access Token",    type: "password", placeholder: "EAAx...", help: "Same Page Access Token as Facebook (requires Instagram Business account connected)" },
    ],
  },
  {
    id: "twitter", name: "Twitter / X", icon: "𝕏", color: "#000000", bg: "rgba(255,255,255,.06)",
    fields: [
      { key: "pageUrl",            label: "Profile URL",          placeholder: "https://twitter.com/yourhandle" },
      { key: "bearerToken",        label: "Bearer Token",         type: "password", placeholder: "AAAA...", help: "Twitter Developer Portal → Project → Bearer Token" },
      { key: "apiKey",             label: "API Key",              type: "password", placeholder: "xxxx" },
      { key: "apiSecret",          label: "API Secret",           type: "password", placeholder: "xxxx" },
      { key: "accessToken",        label: "Access Token",         type: "password", placeholder: "xxxx" },
      { key: "accessTokenSecret",  label: "Access Token Secret",  type: "password", placeholder: "xxxx" },
    ],
  },
  {
    id: "linkedin", name: "LinkedIn", icon: "in", color: "#0A66C2", bg: "rgba(10,102,194,.12)",
    fields: [
      { key: "pageUrl",     label: "Company Page URL", placeholder: "https://linkedin.com/company/yourco" },
      { key: "orgId",       label: "Organization ID",  placeholder: "1234567", help: "Found in LinkedIn Company Page URL: linkedin.com/company/{orgId}" },
      { key: "accessToken", label: "Access Token",     type: "password", placeholder: "AQVF...", help: "LinkedIn Developer → OAuth 2.0 → Generate access token with w_member_social scope" },
    ],
  },
  {
    id: "tiktok", name: "TikTok", icon: "♪", color: "#010101", bg: "rgba(255,255,255,.04)",
    fields: [
      { key: "pageUrl", label: "Profile URL", placeholder: "https://tiktok.com/@yourhandle" },
    ],
  },
  {
    id: "youtube", name: "YouTube", icon: "▶", color: "#FF0000", bg: "rgba(255,0,0,.1)",
    fields: [
      { key: "pageUrl",   label: "Channel URL",  placeholder: "https://youtube.com/@yourchannel" },
      { key: "channelId", label: "Channel ID",   placeholder: "UCxxxxx", help: "Found in YouTube Studio → Settings → Channel" },
    ],
  },
];

const DEFAULT_SETTINGS: SocialSettings = {
  facebook:  { enabled: false, pageUrl: "", pageId: "", accessToken: "" },
  instagram: { enabled: false, pageUrl: "", igUserId: "", accessToken: "" },
  twitter:   { enabled: false, pageUrl: "", bearerToken: "", apiKey: "", apiSecret: "", accessToken: "", accessTokenSecret: "" },
  linkedin:  { enabled: false, pageUrl: "", orgId: "", accessToken: "" },
  tiktok:    { enabled: false, pageUrl: "" },
  youtube:   { enabled: false, pageUrl: "", channelId: "" },
};

/* ─── Main component ─────────────────────────────────────── */
export default function SocialMediaPage() {
  const router = useRouter();
  const [tab,          setTab]          = useState<"settings" | "compose" | "history">("settings");
  const [settings,     setSettings]     = useState<SocialSettings>(DEFAULT_SETTINGS);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [loading,      setLoading]      = useState(true);

  // Compose state
  const [postText,      setPostText]      = useState("");
  const [mediaUrl,      setMediaUrl]      = useState("");
  const [selPlatforms,  setSelPlatforms]  = useState<Platform[]>([]);
  const [posting,       setPosting]       = useState(false);
  const [postResults,   setPostResults]   = useState<Record<string, PostResult> | null>(null);
  const [postError,     setPostError]     = useState("");

  // History
  const [posts,         setPosts]         = useState<SocialPost[]>([]);
  const [histLoading,   setHistLoading]   = useState(false);

  const headers = () => ({
    "Content-Type": "application/json",
    "x-user-role": "ADMIN",
  });

  useEffect(() => {
    fetch("/api/admin/social/settings", { headers: headers() })
      .then(r => r.json())
      .then(d => { if (d.settings) setSettings({ ...DEFAULT_SETTINGS, ...d.settings }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab]);

  function loadHistory() {
    setHistLoading(true);
    fetch("/api/admin/social/post", { headers: headers() })
      .then(r => r.json())
      .then(d => { if (d.posts) setPosts(d.posts); })
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }

  function setPlatformField(platform: Platform, field: string, value: string | boolean) {
    setSettings(prev => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value },
    }));
  }

  async function saveSettings() {
    setSaving(true);
    try {
      await fetch("/api/admin/social/settings", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {/* */}
    finally { setSaving(false); }
  }

  async function createPost() {
    if (!postText.trim()) { setPostError("Write something before posting."); return; }
    if (!selPlatforms.length) { setPostError("Select at least one platform."); return; }
    setPosting(true);
    setPostError("");
    setPostResults(null);
    try {
      const r = await fetch("/api/admin/social/post", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ text: postText, mediaUrl: mediaUrl || undefined, platforms: selPlatforms }),
      });
      const d = await r.json();
      if (!r.ok) { setPostError(d.error || "Failed"); return; }
      setPostResults(d.results);
      setPostText("");
      setMediaUrl("");
    } catch { setPostError("Network error."); }
    finally { setPosting(false); }
  }

  function togglePlatform(id: Platform) {
    setSelPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  const enabledPlatforms = PLATFORMS.filter(p => settings[p.id]?.enabled);

  /* ── Styles ── */
  const s = {
    page: { minHeight: "100vh", background: "#070b14", color: "white", fontFamily: "'Outfit','DM Sans',sans-serif" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)" },
    nav: { display: "flex", gap: 4, padding: "16px 28px 0", borderBottom: "1px solid rgba(255,255,255,.07)" },
    navBtn: (active: boolean) => ({
      padding: "10px 20px", borderRadius: "10px 10px 0 0", border: "none", cursor: "pointer",
      fontFamily: "inherit", fontSize: 13, fontWeight: 700, transition: "all .15s",
      background: active ? "rgba(99,102,241,.15)" : "transparent",
      color: active ? "#a5b4fc" : "rgba(255,255,255,.4)",
      borderBottom: active ? "2px solid #6366f1" : "2px solid transparent",
    }),
    content: { padding: "28px 28px", maxWidth: 960, margin: "0 auto" },
    card: { borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", padding: "20px 24px", marginBottom: 16 },
    label: { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase" as const, letterSpacing: ".05em", display: "block", marginBottom: 6 },
    input: { width: "100%", padding: "10px 12px", borderRadius: 9, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "white", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const },
    btn: (color?: string) => ({
      padding: "11px 22px", borderRadius: 10, border: "none", cursor: "pointer",
      fontFamily: "inherit", fontSize: 13, fontWeight: 700,
      background: color || "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white",
    }),
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => router.push("/admin")} style={{ background: "none", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.5)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
            ← Admin
          </button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "white" }}>Social Media Marketing</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Connect accounts, compose posts, and publish to all platforms at once</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["facebook","instagram","twitter","linkedin","tiktok","youtube"].map(p => {
            const meta = PLATFORMS.find(x => x.id === p)!;
            const en = (settings as any)[p]?.enabled;
            return (
              <div key={p} style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, background: en ? meta.bg : "rgba(255,255,255,.04)", border: `1px solid ${en ? meta.color + "40" : "rgba(255,255,255,.08)"}`, color: en ? meta.color : "rgba(255,255,255,.2)", transition: "all .2s" }}>
                {meta.icon}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={s.nav}>
        {(["settings", "compose", "history"] as const).map(t => (
          <button key={t} style={s.navBtn(tab === t)} onClick={() => setTab(t)}>
            {t === "settings" && "⚙ Platform Settings"}
            {t === "compose" && "✍ Post Composer"}
            {t === "history" && "📋 Post History"}
          </button>
        ))}
      </div>

      <div style={s.content}>

        {/* ══ SETTINGS TAB ══ */}
        {tab === "settings" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "white" }}>Platform Connections</div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.4)", marginTop: 3 }}>Enable platforms and enter your API credentials to start posting</div>
              </div>
              <button onClick={saveSettings} disabled={saving} style={s.btn(saved ? "rgba(52,211,153,.2)" : undefined)}>
                {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Settings"}
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.3)" }}>Loading settings…</div>
            ) : PLATFORMS.map(plat => (
              <div key={plat.id} style={{ ...s.card, border: `1px solid ${settings[plat.id]?.enabled ? plat.color + "30" : "rgba(255,255,255,.07)"}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: settings[plat.id]?.enabled ? 20 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: plat.bg, border: `1px solid ${plat.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: plat.color }}>
                      {plat.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{plat.name}</div>
                      {settings[plat.id]?.pageUrl && (
                        <a href={settings[plat.id].pageUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: plat.color, textDecoration: "none" }}>
                          {settings[plat.id].pageUrl}
                        </a>
                      )}
                    </div>
                  </div>
                  {/* Toggle */}
                  <div
                    onClick={() => setPlatformField(plat.id, "enabled", !settings[plat.id]?.enabled)}
                    style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", position: "relative", background: settings[plat.id]?.enabled ? plat.color : "rgba(255,255,255,.1)", transition: "all .2s" }}
                  >
                    <div style={{ position: "absolute", top: 3, left: settings[plat.id]?.enabled ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left .2s" }} />
                  </div>
                </div>

                {settings[plat.id]?.enabled && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {plat.fields.map(field => (
                      <div key={field.key}>
                        <label style={s.label}>{field.label}</label>
                        <input
                          type={field.type || "text"}
                          value={(settings[plat.id] as any)[field.key] || ""}
                          onChange={e => setPlatformField(plat.id, field.key, e.target.value)}
                          placeholder={field.placeholder}
                          style={s.input}
                        />
                        {field.help && <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.25)", marginTop: 4 }}>{field.help}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <button onClick={saveSettings} disabled={saving} style={{ ...s.btn(), marginTop: 8, width: "100%" }}>
              {saving ? "Saving…" : saved ? "✓ Settings Saved!" : "Save All Settings"}
            </button>
          </>
        )}

        {/* ══ COMPOSE TAB ══ */}
        {tab === "compose" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 }}>
            {/* Left: editor */}
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 16 }}>Create Post</div>

              {/* Platform selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={s.label}>Publish to</label>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                  {PLATFORMS.map(plat => {
                    const enabled = settings[plat.id]?.enabled;
                    const selected = selPlatforms.includes(plat.id);
                    return (
                      <button
                        key={plat.id}
                        onClick={() => enabled && togglePlatform(plat.id)}
                        disabled={!enabled}
                        style={{
                          display: "flex", alignItems: "center", gap: 7, padding: "8px 14px",
                          borderRadius: 9, border: `1.5px solid ${selected ? plat.color : "rgba(255,255,255,.1)"}`,
                          background: selected ? plat.bg : "rgba(255,255,255,.03)",
                          color: enabled ? (selected ? plat.color : "rgba(255,255,255,.6)") : "rgba(255,255,255,.2)",
                          cursor: enabled ? "pointer" : "not-allowed", fontFamily: "inherit",
                          fontSize: 12.5, fontWeight: 600, transition: "all .15s", opacity: enabled ? 1 : 0.4,
                        }}
                      >
                        <span style={{ fontWeight: 900, fontSize: 13 }}>{plat.icon}</span>
                        {plat.name}
                        {!enabled && <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>(not connected)</span>}
                      </button>
                    );
                  })}
                </div>
                {enabledPlatforms.length === 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#fbbf24" }}>
                    ⚠ No platforms connected. Go to Platform Settings to connect your accounts.
                  </div>
                )}
              </div>

              {/* Post text */}
              <div style={{ marginBottom: 12 }}>
                <label style={s.label}>Caption / Post Text</label>
                <textarea
                  value={postText}
                  onChange={e => setPostText(e.target.value)}
                  placeholder="Write your post here… Include hashtags, mentions, and calls to action."
                  rows={6}
                  style={{ ...s.input, resize: "vertical" as const, lineHeight: 1.6 }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 4 }}>
                  <span>Twitter limit: 280 chars</span>
                  <span style={{ color: postText.length > 280 ? "#f87171" : "rgba(255,255,255,.25)" }}>{postText.length} chars</span>
                </div>
              </div>

              {/* Media URL */}
              <div style={{ marginBottom: 20 }}>
                <label style={s.label}>Image or Video URL <span style={{ fontWeight: 400, textTransform: "none" as const, color: "rgba(255,255,255,.2)" }}>(optional — required for Instagram)</span></label>
                <input
                  value={mediaUrl}
                  onChange={e => setMediaUrl(e.target.value)}
                  placeholder="https://yourcdn.com/image.jpg"
                  style={s.input}
                />
                {mediaUrl && (
                  <div style={{ marginTop: 8, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)", maxHeight: 200 }}>
                    <img src={mediaUrl} alt="Preview" style={{ width: "100%", objectFit: "cover" as const, maxHeight: 200 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
              </div>

              {postError && (
                <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 9, background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.25)", fontSize: 12.5, color: "#f87171" }}>
                  {postError}
                </div>
              )}

              <button onClick={createPost} disabled={posting || !selPlatforms.length} style={{ ...s.btn(), width: "100%", padding: "13px", fontSize: 14, opacity: posting || !selPlatforms.length ? 0.5 : 1 }}>
                {posting ? "Posting…" : `Post to ${selPlatforms.length || 0} Platform${selPlatforms.length !== 1 ? "s" : ""} →`}
              </button>

              {/* Results */}
              {postResults && (
                <div style={{ marginTop: 16, padding: "16px 20px", borderRadius: 12, background: "rgba(52,211,153,.06)", border: "1px solid rgba(52,211,153,.2)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399", marginBottom: 12 }}>Post Results</div>
                  {Object.entries(postResults).map(([platform, result]) => (
                    <div key={platform} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12.5 }}>
                      <span style={{ fontWeight: 700, color: "rgba(255,255,255,.7)", width: 80, textTransform: "capitalize" as const }}>{platform}</span>
                      {result.success
                        ? <span style={{ color: "#34d399" }}>✓ Published {result.id ? `(ID: ${result.id})` : ""}</span>
                        : <span style={{ color: "#f87171" }}>✗ {result.error}</span>
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: preview */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.6)", marginBottom: 12 }}>Preview</div>
              <div style={{ borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white" }}>F</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Finova</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>Just now</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)", lineHeight: 1.6, whiteSpace: "pre-wrap" as const, marginBottom: mediaUrl ? 12 : 0 }}>
                  {postText || <span style={{ color: "rgba(255,255,255,.2)" }}>Your post will appear here…</span>}
                </div>
                {mediaUrl && (
                  <div style={{ borderRadius: 10, overflow: "hidden", marginTop: 8 }}>
                    <img src={mediaUrl} alt="" style={{ width: "100%", objectFit: "cover" as const, maxHeight: 240 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", gap: 16, fontSize: 12, color: "rgba(255,255,255,.3)" }}>
                  <span>👍 Like</span>
                  <span>💬 Comment</span>
                  <span>↗ Share</span>
                </div>
              </div>

              {/* Character counts */}
              <div style={{ marginTop: 14, borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", padding: "12px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.3)", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 10 }}>Character Limits</div>
                {[
                  { platform: "Twitter/X", limit: 280, icon: "𝕏" },
                  { platform: "LinkedIn", limit: 3000, icon: "in" },
                  { platform: "Facebook", limit: 63206, icon: "f" },
                  { platform: "Instagram", limit: 2200, icon: "◈" },
                ].map(({ platform, limit, icon }) => (
                  <div key={platform} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, fontSize: 12 }}>
                    <span style={{ width: 20, fontWeight: 800, color: "rgba(255,255,255,.4)", fontSize: 11 }}>{icon}</span>
                    <span style={{ flex: 1, color: "rgba(255,255,255,.5)" }}>{platform}</span>
                    <span style={{ color: postText.length > limit ? "#f87171" : postText.length > limit * 0.8 ? "#fbbf24" : "#34d399", fontWeight: 700 }}>
                      {postText.length}/{limit}
                    </span>
                  </div>
                ))}
              </div>

              {/* Tips */}
              <div style={{ marginTop: 12, borderRadius: 12, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.15)", padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", marginBottom: 8 }}>💡 Tips</div>
                <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 11.5, color: "rgba(255,255,255,.4)", lineHeight: 1.7 }}>
                  <li>Add 3–5 relevant hashtags</li>
                  <li>Include a clear call-to-action</li>
                  <li>Images increase engagement 3×</li>
                  <li>Post between 9am–12pm for best reach</li>
                  <li>Instagram requires an image URL</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ══ HISTORY TAB ══ */}
        {tab === "history" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "white" }}>Post History</div>
              <button onClick={loadHistory} style={{ ...s.btn("rgba(99,102,241,.15)"), border: "1px solid rgba(99,102,241,.3)", color: "#a5b4fc" }}>
                ↻ Refresh
              </button>
            </div>

            {histLoading ? (
              <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.3)" }}>Loading…</div>
            ) : posts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,.25)", fontSize: 13 }}>
                No posts yet. Use the Post Composer to create your first post.
              </div>
            ) : posts.map(post => {
              const allSuccess = Object.values(post.results || {}).every(r => r.success);
              const anySuccess = Object.values(post.results || {}).some(r => r.success);
              return (
                <div key={post.id} style={{ ...s.card, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                      {(post.platforms || []).map(p => {
                        const meta = PLATFORMS.find(x => x.id === p);
                        const result = (post.results || {})[p];
                        return (
                          <span key={p} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: result?.success ? `${meta?.color}18` : "rgba(248,113,113,.12)", color: result?.success ? meta?.color : "#f87171" }}>
                            {result?.success ? "✓" : "✗"} {meta?.name || p}
                          </span>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: allSuccess ? "rgba(52,211,153,.1)" : anySuccess ? "rgba(251,191,36,.1)" : "rgba(248,113,113,.1)", color: allSuccess ? "#34d399" : anySuccess ? "#fbbf24" : "#f87171", fontWeight: 700 }}>
                        {allSuccess ? "All Sent" : anySuccess ? "Partial" : "Failed"}
                      </span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>
                        {new Date(post.createdAt).toLocaleDateString()} {new Date(post.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)", lineHeight: 1.6, marginBottom: post.mediaUrl ? 10 : 0, whiteSpace: "pre-wrap" as const }}>
                    {post.text}
                  </div>
                  {post.mediaUrl && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#818cf8" }}>
                      🖼 <a href={post.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8" }}>Media attached</a>
                    </div>
                  )}
                  {/* Error details */}
                  {Object.entries(post.results || {}).filter(([, r]) => !r.success).map(([p, r]) => (
                    <div key={p} style={{ marginTop: 6, fontSize: 11, color: "#f87171" }}>
                      {p}: {r.error}
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
