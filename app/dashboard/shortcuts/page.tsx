"use client";
import { useEffect, useState, useCallback } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useResponsive } from "@/hooks/useResponsive";

type ShortcutItem = {
  id: string;
  keys: string[];
  label: string;
  action: string;
  route?: string;
  enabled: boolean;
};

const ACTION_OPTIONS = [
  { value: "focus_search",   label: "🔍 Focus Search Bar" },
  { value: "toggle_sidebar", label: "◀ Toggle Sidebar" },
  { value: "navigate",       label: "🔗 Navigate to Page" },
];

const MODIFIER_KEYS = ["Ctrl", "Shift", "Alt"];
const DISPLAY_KEY = (k: string) => k;

const BROWSER_RESERVED = new Set([
  "ctrl+n","ctrl+t","ctrl+w","ctrl+p","ctrl+s","ctrl+d","ctrl+r","ctrl+f",
  "ctrl+l","ctrl+k","ctrl+h","ctrl+j","ctrl+u","ctrl+shift+n","ctrl+shift+t",
  "ctrl+shift+w","ctrl+shift+p","ctrl+shift+j","ctrl+tab","ctrl+shift+tab",
  "alt+f4","alt+left","alt+right","f5","f11","f12",
]);

function isBrowserReserved(keys: string[]): boolean {
  return BROWSER_RESERVED.has(keys.join("+").toLowerCase());
}

const card: React.CSSProperties = {
  background: "var(--panel-bg)", border: "1px solid var(--border)",
  borderRadius: 14, padding: isMobile ? "12px 11px" : "22px 24px", marginBottom: 16,
};
const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
  textTransform: "uppercase", letterSpacing: ".07em", display: "block", marginBottom: 6,
};
const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--app-bg)",
  color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box",
};
const btn = (color = "#6366f1", bg = "rgba(99,102,241,0.1)", border = "rgba(99,102,241,0.25)"): React.CSSProperties => ({
  padding: "7px 14px", borderRadius: 8, background: bg,
  border: `1px solid ${border}`, color, fontWeight: 700, fontSize: 12, cursor: "pointer",
});

function KeyRecorder({ value, onChange }: { value: string[]; onChange: (keys: string[]) => void }) {
  const [recording, setRecording] = useState(false);
  const [current, setCurrent] = useState<string[]>(value);

  const start = () => { setRecording(true); setCurrent([]); };

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!recording) return;
    e.preventDefault();
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
    if (e.shiftKey) parts.push("Shift");
    if (e.altKey) parts.push("Alt");
    const key = e.key;
    if (!["Control","Shift","Alt","Meta"].includes(key)) {
      const display = key.length === 1 ? key.toUpperCase() : key;
      parts.push(display);
      setCurrent(parts);
      onChange(parts);
      setRecording(false);
    }
  }, [recording, onChange]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  useEffect(() => { setCurrent(value); }, [value]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        onClick={start}
        style={{
          display: "flex", gap: 4, alignItems: "center", padding: "8px 12px",
          borderRadius: 8, border: recording ? "1.5px solid #6366f1" : "1px solid var(--border)",
          background: recording ? "rgba(99,102,241,0.08)" : "var(--app-bg)",
          cursor: "pointer", minWidth: 140, minHeight: 36,
        }}
      >
        {recording ? (
          <span style={{ fontSize: 12, color: "#818cf8", fontWeight: 600, animation: "pulse 1s infinite" }}>
            🎹 Press keys…
          </span>
        ) : current.length === 0 ? (
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Click to record</span>
        ) : (
          current.map((k, i) => (
            <span key={i}>
              <kbd style={{ padding: "2px 7px", borderRadius: 5, background: "rgba(255,255,255,0.08)", border: "1px solid var(--border)", fontSize: 11, fontWeight: 700, color: "var(--text-primary)", fontFamily: "inherit" }}>
                {DISPLAY_KEY(k)}
              </kbd>
              {i < current.length - 1 && <span style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 2px" }}>+</span>}
            </span>
          ))
        )}
      </div>
      {!recording && (
        <button onClick={start} style={{ ...btn(), padding: "6px 10px", fontSize: 11 }}>Re-record</button>
      )}
    </div>
  );
}

function ShortcutRow({
  sc, onUpdate, onDelete, onToggle, conflict, browserReserved,
}: {
  sc: ShortcutItem;
  onUpdate: (id: string, patch: Partial<ShortcutItem>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  conflict: boolean;
  browserReserved: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ borderRadius: 10, border: `1px solid ${conflict ? "rgba(248,113,113,0.4)" : "var(--border)"}`, marginBottom: 8, overflow: "hidden" }}>
      {/* Row summary */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: sc.enabled ? "transparent" : "rgba(255,255,255,0.02)" }}>
        {/* Toggle */}
        <div
          onClick={() => onToggle(sc.id)}
          style={{ width: 36, height: 20, borderRadius: 10, background: sc.enabled ? "#6366f1" : "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}
        >
          <div style={{ position: "absolute", top: 2, left: sc.enabled ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
        </div>

        {/* Key combo */}
        <div style={{ display: "flex", gap: 3, alignItems: "center", minWidth: 140 }}>
          {sc.keys.map((k, i) => (
            <span key={i}>
              <kbd style={{ padding: "2px 7px", borderRadius: 5, background: sc.enabled ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.05)", border: "1px solid var(--border)", fontSize: 11, fontWeight: 700, color: sc.enabled ? "#818cf8" : "var(--text-muted)", fontFamily: "inherit", opacity: sc.enabled ? 1 : 0.5 }}>
                {k}
              </kbd>
              {i < sc.keys.length - 1 && <span style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 1px" }}>+</span>}
            </span>
          ))}
        </div>

        {/* Label */}
        <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: sc.enabled ? "var(--text-primary)" : "var(--text-muted)" }}>
          {sc.label}
          {sc.action === "navigate" && sc.route && (
            <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 8, fontWeight: 400 }}>{sc.route}</span>
          )}
        </div>

        {conflict && (
          <span style={{ fontSize: 10, color: "#f87171", fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>
            ⚠ Conflict
          </span>
        )}
        {browserReserved && !conflict && (
          <span title="This key combo is reserved by the browser and may not work" style={{ fontSize: 10, color: "#fb923c", fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.25)" }}>
            🌐 Browser Key
          </span>
        )}

        {/* Edit / Delete */}
        <button onClick={() => setExpanded(v => !v)} style={{ ...btn(), padding: "5px 10px", fontSize: 11 }}>
          {expanded ? "Close" : "Edit"}
        </button>
        <button
          onClick={() => onDelete(sc.id)}
          style={{ ...btn("#f87171", "rgba(248,113,113,0.08)", "rgba(248,113,113,0.2)"), padding: "5px 10px", fontSize: 11 }}
        >
          Delete
        </button>
      </div>

      {/* Edit panel */}
      {expanded && (
        <div style={{ padding: "16px", borderTop: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Label / Name</label>
              <input
                style={inp}
                value={sc.label}
                onChange={e => onUpdate(sc.id, { label: e.target.value })}
                placeholder="e.g. New Purchase Order"
              />
            </div>
            <div>
              <label style={lbl}>Action</label>
              <select style={{ ...inp, paddingRight: 32 }} value={sc.action} onChange={e => onUpdate(sc.id, { action: e.target.value })}>
                {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {sc.action === "navigate" && (
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Page Route</label>
              <input
                style={inp}
                value={sc.route || ""}
                onChange={e => onUpdate(sc.id, { route: e.target.value })}
                placeholder="/dashboard/sales-invoice"
              />
            </div>
          )}

          <div>
            <label style={lbl}>Key Combination — click to record</label>
            <KeyRecorder value={sc.keys} onChange={keys => onUpdate(sc.id, { keys })} />
          </div>
        </div>
      )}
    </div>
  );
}

let _idCounter = Date.now();
function genId() { return `sc_${++_idCounter}`; }

export default function ShortcutsPage() {
  const { isMobile } = useResponsive();
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";

  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/company/shortcuts")
      .then(r => r.json())
      .then(d => { if (d.shortcuts) setShortcuts(d.shortcuts); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function update(id: string, patch: Partial<ShortcutItem>) {
    setShortcuts(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }

  function toggle(id: string) {
    setShortcuts(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  }

  function remove(id: string) {
    setShortcuts(prev => prev.filter(s => s.id !== id));
  }

  function addNew() {
    setShortcuts(prev => [...prev, {
      id: genId(), keys: [], label: "New Shortcut",
      action: "navigate", route: "/dashboard", enabled: true,
    }]);
  }

  function getConflicts(): Set<string> {
    const seen = new Map<string, string>();
    const conflicts = new Set<string>();
    shortcuts.filter(s => s.enabled).forEach(s => {
      const key = s.keys.join("+").toLowerCase();
      if (!key) return;
      if (seen.has(key)) {
        conflicts.add(seen.get(key)!);
        conflicts.add(s.id);
      } else {
        seen.set(key, s.id);
      }
    });
    return conflicts;
  }

  async function save() {
    const conflicts = getConflicts();
    if (conflicts.size > 0) {
      setMsg({ text: "Fix key conflicts before saving", ok: false });
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/company/shortcuts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortcuts }),
      });
      if (r.ok) {
        setMsg({ text: "Shortcuts saved — active immediately", ok: true });
        setTimeout(() => setMsg(null), 3000);
      } else {
        const d = await r.json().catch(() => ({}));
        setMsg({ text: d.error || "Save failed", ok: false });
        setTimeout(() => setMsg(null), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  const conflicts = getConflicts();

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <div style={{ width: 28, height: 28, border: "3px solid var(--border)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 820, padding: "32px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            ⌨️ Keyboard Shortcuts
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Customize shortcuts for your business — each company has its own set
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={addNew} style={btn()}>+ Add Shortcut</button>
            <button
              onClick={save}
              disabled={saving}
              style={{
                ...btn("#fff", saving ? "var(--border)" : "linear-gradient(135deg,#6366f1,#4f46e5)", "transparent"),
                background: saving ? "var(--border)" : "linear-gradient(135deg,#6366f1,#4f46e5)",
                boxShadow: saving ? "none" : "0 2px 10px rgba(99,102,241,0.4)",
              }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {/* Save message */}
      {msg && (
        <div style={{ marginBottom: 16, padding: "11px 16px", borderRadius: 10, background: msg.ok ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${msg.ok ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`, fontSize: 13, color: msg.ok ? "#34d399" : "#f87171", fontWeight: 600 }}>
          {msg.ok ? "✓ " : "✗ "}{msg.text}
        </div>
      )}

      {/* How to use */}
      <div style={{ ...card, background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.2)", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            <strong style={{ color: "#818cf8" }}>How it works:</strong> Toggle ON/OFF any shortcut. Click <strong>Edit</strong> to change the key combo or action. Click a key field then press your desired keys to record. Changes are saved per company.
          </div>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11, color: "var(--text-muted)" }}>
          <span>🔍 <strong>Focus Search</strong> — opens search bar</span>
          <span>◀ <strong>Toggle Sidebar</strong> — collapse/expand sidebar</span>
          <span>🔗 <strong>Navigate</strong> — go to any page</span>
          <span>🌐 <strong style={{ color: "#fb923c" }}>Browser Key</strong> — reserved by browser (Ctrl+N, Ctrl+P etc.) — use Alt+key instead</span>
        </div>
      </div>

      {/* Built-in Voucher Shortcuts */}
      <div style={{ ...card, background: "rgba(20,184,166,0.04)", border: "1px solid rgba(20,184,166,0.2)", marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#14b8a6", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>
          Built-in Voucher Query Shortcuts (Oracle F7/F8 Mode)
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 14px" }}>
          These shortcuts are built into every voucher form — CRV, CPV, JV, Contra, Expense Voucher, Advance Payment, Sales Invoice, Purchase Invoice. They cannot be customized.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
          {[
            { key: "F7",       desc: "Enter Query Mode",          detail: "Clears form — type search criteria" },
            { key: "F8",       desc: "Execute Query",             detail: "Finds matching records" },
            { key: "PageDown", desc: "Next Record",               detail: "Browse to next result" },
            { key: "PageUp",   desc: "Previous Record",           detail: "Browse to previous result" },
            { key: "Escape",   desc: "Cancel / Exit Query Mode",  detail: "Returns to normal entry mode" },
          ].map(({ key, desc, detail }) => (
            <div key={key} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 8, background: "var(--app-bg)", border: "1px solid var(--border)" }}>
              <kbd style={{ padding: "3px 9px", borderRadius: 6, background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.3)", fontSize: 11, fontWeight: 800, color: "#14b8a6", fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap" }}>
                {key}
              </kbd>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{desc}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shortcuts list */}
      {!isAdmin && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", fontSize: 13, color: "#fbbf24", marginBottom: 16 }}>
          ⚠ Only Admins can edit shortcuts. You can view the current shortcuts below.
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 14 }}>
          {shortcuts.filter(s => s.enabled).length} active · {shortcuts.length} total
        </div>

        {shortcuts.length === 0 ? (
          <div style={{ textAlign: "center", padding: isMobile ? "18px 10px" : "32px 16px", color: "var(--text-muted)", fontSize: 13 }}>
            No shortcuts configured.{isAdmin && <> <button onClick={addNew} style={{ ...btn(), display: "inline", marginLeft: 8 }}>Add one</button></>}
          </div>
        ) : (
          shortcuts.map(sc => (
            <ShortcutRow
              key={sc.id}
              sc={sc}
              onUpdate={isAdmin ? update : () => {}}
              onDelete={isAdmin ? remove : () => {}}
              onToggle={isAdmin ? toggle : () => {}}
              conflict={conflicts.has(sc.id)}
              browserReserved={isBrowserReserved(sc.keys)}
            />
          ))
        )}
      </div>

      {/* Active shortcuts preview */}
      {shortcuts.filter(s => s.enabled && s.keys.length > 0).length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 14 }}>Active Shortcuts Preview</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
            {shortcuts.filter(s => s.enabled && s.keys.length > 0).map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "var(--app-bg)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.label}</span>
                <div style={{ display: "flex", gap: 3 }}>
                  {s.keys.map((k, i) => (
                    <span key={i}>
                      <kbd style={{ padding: "2px 6px", borderRadius: 4, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", fontSize: 10, fontWeight: 700, color: "#818cf8", fontFamily: "inherit" }}>{k}</kbd>
                      {i < s.keys.length - 1 && <span style={{ fontSize: 9, color: "var(--text-muted)", margin: "0 1px" }}>+</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
