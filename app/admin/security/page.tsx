"use client";

/**
 * Admin Security — put an extra password on chosen console pages.
 *
 * Signing in gets you into the console; this decides which pages still ask for
 * a second password once you are inside. Whoever knows that password can open
 * them, for 30 minutes at a time. Enforced server-side in lib/adminAuth, so a
 * locked page is refused at the API, not merely hidden in the sidebar.
 */

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ADMIN_NAV_GROUP_ORDER } from "@/app/admin/admin-nav";

type LockablePage = { id: string; label: string; group: string; superAdminOnly: boolean };

type Config = {
  enabled: boolean;
  pages: string[];
  passwordSet: boolean;
  updatedAt: string | null;
  updatedByEmail: string | null;
  lockablePages: LockablePage[];
};

export default function AdminSecurityPage() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [pages, setPages] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/security", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not load");
      setCfg(d);
      setEnabled(d.enabled);
      setPages(d.pages || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const items = cfg?.lockablePages || [];
    return ADMIN_NAV_GROUP_ORDER.map((group) => ({
      group,
      items: items.filter((i) => i.group === group),
    })).filter((g) => g.items.length > 0);
  }, [cfg]);

  const toggle = (id: string) =>
    setPages((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  async function save() {
    if (password && password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password && password !== confirmPassword) {
      toast.error("The two passwords do not match");
      return;
    }
    if (enabled && !password && !cfg?.passwordSet) {
      toast.error("Set a password first");
      return;
    }
    if (enabled && pages.length === 0) {
      toast.error("Pick at least one page to lock");
      return;
    }

    setSaving(true);
    try {
      const r = await fetch("/api/admin/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, pages, password: password || undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save failed");
      toast.success("Saved. Everyone must enter the password again.");
      setPassword("");
      setConfirmPassword("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeLock() {
    if (!window.confirm("Remove the page lock completely? The password will be deleted.")) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/security", { method: "DELETE" });
      if (!r.ok) throw new Error("Remove failed");
      toast.success("Page lock removed");
      setPassword("");
      setConfirmPassword("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setSaving(false);
    }
  }

  async function relockNow() {
    await fetch("/api/admin/security/unlock", { method: "DELETE" });
    toast.success("Locked. The password will be asked for again.");
  }

  if (loading) {
    return <div style={{ padding: 40, color: "rgba(255,255,255,.4)" }}>Loading…</div>;
  }

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 60px" }}>
      <style>{css}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Admin Security</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)", maxWidth: 680, lineHeight: 1.6 }}>
          A second password, inside the console — like an app lock on a phone. Tick the
          pages that should ask for it: even an admin who is already signed in has to type
          it before those pages open, and they lock again the moment the page is left or
          the tab is closed. Each page is unlocked on its own.
        </p>
      </div>

      {/* ── Status ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: cfg?.enabled ? "rgba(52,211,153,.08)" : "rgba(255,255,255,.03)",
          border: `1px solid ${cfg?.enabled ? "rgba(52,211,153,.25)" : "rgba(255,255,255,.07)"}`,
          borderRadius: 16,
          padding: "18px 22px",
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: cfg?.enabled ? "#34d399" : "rgba(255,255,255,.75)" }}>
            {cfg?.enabled ? `Lock is ON — ${cfg.pages.length} page${cfg.pages.length === 1 ? "" : "s"} protected` : "Lock is OFF"}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 4 }}>
            {cfg?.passwordSet ? "A password is set." : "No password set yet."}
            {cfg?.updatedByEmail ? ` Last changed by ${cfg.updatedByEmail}.` : ""}
          </div>
        </div>
        {cfg?.enabled && (
          <button className="as-btn" onClick={relockNow} style={{ background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.7)" }}>
            Lock now
          </button>
        )}
      </div>

      {/* ── Password ───────────────────────────────────────────────────── */}
      <div style={card}>
        <h3 style={cardTitle}>{cfg?.passwordSet ? "Change the page password" : "Set the page password"}</h3>
        <p style={hint}>
          {cfg?.passwordSet
            ? "Leave both boxes empty to keep the current password."
            : "Anyone who should reach the locked pages needs this. At least 6 characters."}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 14 }}>
          <div>
            <label style={label}>New password</label>
            <input
              className="as-inp"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={cfg?.passwordSet ? "•••••• (unchanged)" : "••••••"}
            />
          </div>
          <div>
            <label style={label}>Repeat password</label>
            <input
              className="as-inp"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••"
            />
          </div>
        </div>
      </div>

      {/* ── Pages ──────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h3 style={cardTitle}>Pages that need the password</h3>
            <p style={hint}>{pages.length} selected</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="as-btn-sm" style={pick} onClick={() => setPages((cfg?.lockablePages || []).map((i) => i.id))}>
              Select all
            </button>
            <button className="as-btn-sm" style={pick} onClick={() => setPages([])}>
              Clear
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 16, marginTop: 16 }}>
          {grouped.map(({ group, items }) => (
            <div key={group}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", color: "rgba(255,255,255,.3)", marginBottom: 6 }}>
                {group.toUpperCase()}
              </div>
              {items.map((item) => (
                <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={pages.includes(item.id)} onChange={() => toggle(item.id)} />
                  <span style={{ color: pages.includes(item.id) ? "white" : "rgba(255,255,255,.5)" }}>{item.label}</span>
                </label>
              ))}
            </div>
          ))}
        </div>

        <p style={{ ...hint, marginTop: 14 }}>
          This page itself can never be locked — it is the way back in if the password is
          forgotten.
        </p>
      </div>

      {/* ── Turn on / save ─────────────────────────────────────────────── */}
      <div style={card}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span style={{ fontSize: 14, fontWeight: 700 }}>Turn the page lock on</span>
        </label>
        <p style={{ ...hint, marginTop: 8 }}>
          Saving closes every page anyone currently has open, including your own — the
          password will be asked for again on the next locked page.
        </p>

        <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="as-btn"
            onClick={save}
            disabled={saving}
            style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white" }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {cfg?.passwordSet && (
            <button className="as-btn" onClick={removeLock} disabled={saving} style={{ background: "rgba(248,113,113,.15)", color: "#f87171" }}>
              Remove lock &amp; password
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "rgba(255,255,255,.02)",
  border: "1px solid rgba(255,255,255,.07)",
  borderRadius: 16,
  padding: 22,
  marginBottom: 18,
};
const cardTitle: React.CSSProperties = { margin: "0 0 4px", fontSize: 16, fontWeight: 700 };
const hint: React.CSSProperties = { margin: 0, fontSize: 12, color: "rgba(255,255,255,.35)", lineHeight: 1.6 };
const label: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "rgba(255,255,255,.35)",
  display: "block",
  marginBottom: 6,
};
const pick: React.CSSProperties = { background: "rgba(129,140,248,.15)", color: "#a5b4fc" };

const css = `
  .as-inp { width:100%; background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:10px; padding:10px 12px; color:white; font-family:inherit; font-size:13px; outline:none; box-sizing:border-box; }
  .as-inp:focus { border-color:rgba(129,140,248,.5); }
  .as-btn { border:none; border-radius:10px; padding:10px 22px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; transition:opacity .2s; }
  .as-btn:disabled { opacity:.4; cursor:not-allowed; }
  .as-btn:hover:not(:disabled) { opacity:.85; }
  .as-btn-sm { border:none; border-radius:6px; padding:5px 12px; font-family:inherit; font-size:11px; font-weight:700; cursor:pointer; }
  .as-btn-sm:hover { opacity:.75; }
`;
