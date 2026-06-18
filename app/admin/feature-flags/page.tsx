"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";

type Flag = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rollout: number;
  createdAt: string;
};

const F = "'Outfit','Inter',sans-serif";
const CARD = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";

function adminHdrs(): Record<string, string> {
  const u = getCurrentUser();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (u?.role) h["x-user-role"] = u.role;
  if (u?.id) h["x-user-id"] = u.id;
  return h;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function RolloutBadge({ rollout }: { rollout: number }) {
  const color = rollout === 100 ? "#22c55e" : rollout > 0 ? "#fbbf24" : "#64748b";
  const bg = rollout === 100 ? "rgba(34,197,94,.12)" : rollout > 0 ? "rgba(251,191,36,.12)" : "rgba(100,116,139,.12)";
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, background: bg, color, fontSize: 11, fontWeight: 800 }}>
      {rollout}%
    </span>
  );
}

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      aria-label="Toggle flag"
      style={{
        width: 40, height: 22, borderRadius: 11, flexShrink: 0,
        background: enabled ? "#6366f1" : "rgba(255,255,255,0.12)",
        border: "none", cursor: disabled ? "not-allowed" : "pointer",
        position: "relative", transition: "background 0.2s", opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: enabled ? 20 : 3,
        width: 16, height: 16, borderRadius: "50%", background: "white",
        transition: "left 0.2s", pointerEvents: "none",
      }} />
    </button>
  );
}

export default function AdminFeatureFlagsPage() {
  const [flags, setFlags] = useState<Flag[] | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", enabled: true, rollout: 100 });
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const r = await fetch("/api/admin/feature-flags", { headers: adminHdrs(), cache: "no-store" });
      if (!r.ok) throw new Error("Failed to load");
      const j = await r.json();
      setFlags(j.flags ?? []);
    } catch { toast.error("Could not load feature flags"); }
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(flag: Flag) {
    setToggling(flag.id);
    try {
      const r = await fetch("/api/admin/feature-flags", {
        method: "POST", headers: adminHdrs(),
        body: JSON.stringify({ action: "TOGGLE", id: flag.id, enabled: !flag.enabled }),
      });
      if (!r.ok) throw new Error();
      setFlags(prev => prev ? prev.map(f => f.id === flag.id ? { ...f, enabled: !f.enabled } : f) : prev);
      toast.success(`${flag.name} ${!flag.enabled ? "enabled" : "disabled"}`);
    } catch { toast.error("Failed to toggle flag"); }
    finally { setToggling(null); }
  }

  async function handleDelete(flag: Flag) {
    if (!confirm(`Delete flag "${flag.name}"?`)) return;
    setDeleting(flag.id);
    try {
      const r = await fetch("/api/admin/feature-flags", {
        method: "POST", headers: adminHdrs(),
        body: JSON.stringify({ action: "DELETE", id: flag.id }),
      });
      if (!r.ok) throw new Error();
      setFlags(prev => prev ? prev.filter(f => f.id !== flag.id) : prev);
      toast.success(`Flag "${flag.name}" deleted`);
    } catch { toast.error("Failed to delete flag"); }
    finally { setDeleting(null); }
  }

  async function handleCreate() {
    if (!form.name.trim()) { toast.error("Flag name is required"); return; }
    setCreating(true);
    try {
      const r = await fetch("/api/admin/feature-flags", {
        method: "POST", headers: adminHdrs(),
        body: JSON.stringify({ action: "CREATE", ...form }),
      });
      if (!r.ok) throw new Error();
      const j = await r.json();
      setFlags(prev => prev ? [j.flag, ...prev] : [j.flag]);
      setForm({ name: "", description: "", enabled: true, rollout: 100 });
      setShowCreate(false);
      toast.success(`Flag "${form.name}" created`);
    } catch { toast.error("Failed to create flag"); }
    finally { setCreating(false); }
  }

  const enabled = flags?.filter(f => f.enabled).length ?? 0;
  const disabled = flags?.filter(f => !f.enabled).length ?? 0;

  const statCard = (label: string, val: string | number, color = "#e2e8f0") => (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "rgba(255,255,255,.4)", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{flags === null ? "—" : val}</div>
    </div>
  );

  return (
    <div style={{ fontFamily: F, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "#e2e8f0" }}>Feature Flags</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>Enable or disable features globally or per rollout percentage.</p>
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          style={{ padding: "10px 18px", borderRadius: 12, border: "none", cursor: "pointer", background: showCreate ? "rgba(99,102,241,.2)" : "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "white", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}
        >
          {showCreate ? "✕ Cancel" : "+ New Flag"}
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 16 }}>
        {statCard("Total Flags", flags?.length ?? "—")}
        {statCard("Enabled", enabled, "#22c55e")}
        {statCard("Disabled", disabled, "#64748b")}
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: CARD, border: `1px solid rgba(99,102,241,.3)`, borderRadius: 14, padding: "20px 22px", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 16 }}>New Feature Flag</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", display: "block", marginBottom: 6 }}>FLAG NAME *</label>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value.replace(/\s+/g, "_").toLowerCase() }))}
                placeholder="e.g. new_dashboard"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,.06)", color: "#e2e8f0", fontSize: 13, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", display: "block", marginBottom: 6 }}>ROLLOUT %</label>
              <input
                type="number" min={0} max={100}
                value={form.rollout}
                onChange={e => setForm(p => ({ ...p, rollout: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,.06)", color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", display: "block", marginBottom: 6 }}>DESCRIPTION</label>
            <input
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="What does this flag control?"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,.06)", color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Toggle enabled={form.enabled} onChange={() => setForm(p => ({ ...p, enabled: !p.enabled }))} />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,.6)" }}>Enabled by default</span>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              style={{ padding: "10px 22px", borderRadius: 10, border: "none", cursor: creating ? "wait" : "pointer", background: "#4f46e5", color: "white", fontSize: 13, fontWeight: 700, opacity: creating ? 0.7 : 1 }}
            >
              {creating ? "Creating…" : "Create Flag"}
            </button>
          </div>
        </div>
      )}

      {/* Flags list */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr 90px 80px 120px 80px", gap: 14, padding: "12px 18px", borderBottom: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "rgba(255,255,255,.3)", textTransform: "uppercase" }}>
          <span>Flag Name</span><span>Description</span><span>Enabled</span><span>Rollout</span><span>Created</span><span></span>
        </div>

        {/* Loading skeleton */}
        {flags === null && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 3fr 90px 80px 120px 80px", gap: 14, padding: "16px 18px", borderBottom: `1px solid ${BORDER}`, alignItems: "center" }}>
            {[120, 200, 40, 40, 90, 60].map((w, j) => (
              <div key={j} style={{ height: 12, borderRadius: 6, background: "rgba(255,255,255,.06)", width: w, animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ))}

        {/* Empty state */}
        {flags !== null && flags.length === 0 && (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 14 }}>
            No feature flags yet — create one above.
          </div>
        )}

        {/* Flag rows */}
        {flags?.map((flag, i) => (
          <div key={flag.id} style={{ display: "grid", gridTemplateColumns: "2fr 3fr 90px 80px 120px 80px", gap: 14, padding: "16px 18px", borderBottom: i < flags.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center" }}>
            <span style={{ fontFamily: "monospace", fontSize: 13, color: "#e2e8f0", fontWeight: 600, wordBreak: "break-all" }}>{flag.name}</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.45)", fontStyle: flag.description ? "normal" : "italic" }}>{flag.description || "No description"}</span>
            <div>
              <Toggle enabled={flag.enabled} onChange={() => handleToggle(flag)} disabled={toggling === flag.id} />
            </div>
            <div><RolloutBadge rollout={flag.rollout} /></div>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>{formatDate(flag.createdAt)}</span>
            <button
              onClick={() => handleDelete(flag)}
              disabled={deleting === flag.id}
              style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,.3)", background: "rgba(239,68,68,.08)", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: deleting === flag.id ? "wait" : "pointer", opacity: deleting === flag.id ? 0.5 : 1 }}
            >
              {deleting === flag.id ? "…" : "Delete"}
            </button>
          </div>
        ))}
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}`}</style>
    </div>
  );
}
