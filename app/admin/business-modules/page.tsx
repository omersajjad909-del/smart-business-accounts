"use client";`r`nimport { confirmToast, alertToast } from "@/lib/toast-feedback";`r`nimport { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Module = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  category: string;
  phase: 1 | 2 | 3 | 4;
  defaultStatus: string;
  status: string;
  enabled: boolean;
  adminOverride: boolean;
};

const PHASE_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "Phase 1 â€” Live",        color: "#34d399", bg: "rgba(52,211,153,.12)"  },
  2: { label: "Phase 2 â€” Commerce+",   color: "#60a5fa", bg: "rgba(96,165,250,.12)"  },
  3: { label: "Phase 3 â€” Services",    color: "#a78bfa", bg: "rgba(167,139,250,.12)" },
  4: { label: "Phase 4 â€” Specialised", color: "#f59e0b", bg: "rgba(245,158,11,.12)"  },
};

function headers() {
  const u = getCurrentUser();
  return {
    "Content-Type": "application/json",
    "x-user-id":    u?.id        || "",
    "x-user-role":  u?.role      || "",
    "x-company-id": u?.companyId || "",
  };
}

export default function BusinessModulesPage() {
  const [modules, setModules]   = useState<Module[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState<string | null>(null);
  const [filter, setFilter]     = useState<"all" | "live" | "coming_soon">("all");
  const [search, setSearch]     = useState("");
  const [msg, setMsg]           = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/business-modules", { credentials: "include", headers: headers() });
      const d = await r.json();
      setModules(d.modules || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggle(id: string, currentEnabled: boolean) {
    setSaving(id);
    setMsg("");
    try {
      const r = await fetch("/api/admin/business-modules", {
        method: "POST", credentials: "include",
        headers: headers(),
        body: JSON.stringify({ action: "TOGGLE", id, enabled: !currentEnabled }),
      });
      if (r.ok) {
        setModules(prev => prev.map(m => m.id === id ? { ...m, enabled: !currentEnabled, status: !currentEnabled ? "live" : "coming_soon", adminOverride: true } : m));
        setMsg(`${!currentEnabled ? "âœ… Enabled" : "â¸ Disabled"}: ${id}`);
      }
    } finally {
      setSaving(null);
    }
  }

  async function resetOverride(id: string) {
    setSaving(id + "_reset");
    try {
      await fetch("/api/admin/business-modules", {
        method: "POST", credentials: "include",
        headers: headers(),
        body: JSON.stringify({ action: "RESET", id }),
      });
      await load();
      setMsg(`Reset to default: ${id}`);
    } finally {
      setSaving(null);
    }
  }

  async function resetAll() {
    if (!await confirmToast("Reset all business module overrides to default phase settings?")) return;
    await fetch("/api/admin/business-modules", {
      method: "POST", credentials: "include",
      headers: headers(),
      body: JSON.stringify({ action: "RESET_ALL" }),
    });
    await load();
    setMsg("All overrides reset to defaults");
  }

  const displayed = modules.filter(m => {
    if (filter === "live"        && !m.enabled)  return false;
    if (filter === "coming_soon" &&  m.enabled)  return false;
    if (search && !m.label.toLowerCase().includes(search.toLowerCase()) &&
                  !m.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const byPhase: Record<number, Module[]> = { 1:[], 2:[], 3:[], 4:[] };
  displayed.forEach(m => byPhase[m.phase]?.push(m));

  const totalLive = modules.filter(m => m.enabled).length;

  const s = {
    page:   { padding: "28px 32px", maxWidth: 1200, margin: "0 auto" } as React.CSSProperties,
    card:   { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "18px 20px" } as React.CSSProperties,
    th:     { padding: "10px 14px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase" as const, letterSpacing: ".06em", borderBottom: "1px solid rgba(255,255,255,.07)" },
    td:     { padding: "13px 14px", fontSize: 13, color: "rgba(255,255,255,.8)", borderBottom: "1px solid rgba(255,255,255,.05)" } as React.CSSProperties,
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "white", margin: 0 }}>Business Modules</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginTop: 4 }}>
            Enable or disable business types globally. Enabled types appear live on the website & unlock dashboard modules.
          </p>
        </div>
        <button
          onClick={resetAll}
          style={{ padding: "9px 18px", borderRadius: 9, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          Reset All Overrides
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Types",   val: modules.length,                          color: "#818cf8" },
          { label: "Live",          val: totalLive,                               color: "#34d399" },
          { label: "Coming Soon",   val: modules.length - totalLive,              color: "#fbbf24" },
          { label: "Admin Overrides", val: modules.filter(m=>m.adminOverride).length, color: "#f87171" },
        ].map(k => (
          <div key={k.label} style={s.card}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color, marginTop: 6 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search business type..."
          style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white", fontSize: 13, outline: "none", width: 220 }}
        />
        {(["all","live","coming_soon"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "8px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid",
            borderColor: filter === f ? "#6366f1" : "rgba(255,255,255,.1)",
            background:  filter === f ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.04)",
            color:       filter === f ? "#a5b4fc" : "rgba(255,255,255,.4)",
          }}>
            {f === "all" ? "All" : f === "live" ? "ðŸŸ¢ Live" : "â³ Coming Soon"}
          </button>
        ))}
        {msg && <span style={{ fontSize: 12, color: "#34d399", fontWeight: 600, marginLeft: 8 }}>{msg}</span>}
      </div>

      {/* Tables per phase */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "rgba(255,255,255,.3)" }}>Loadingâ€¦</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {([1,2,3,4] as const).map(phase => {
            const rows = byPhase[phase];
            if (!rows?.length) return null;
            const ph = PHASE_LABELS[phase];
            return (
              <div key={phase}>
                {/* Phase header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: ph.bg, color: ph.color, border: `1px solid ${ph.color}30` }}>
                    {ph.label}
                  </span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.25)" }}>
                    {rows.filter(r=>r.enabled).length}/{rows.length} enabled
                  </span>
                </div>

                {/* Table */}
                <div style={{ border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["","Business Type","Category","Status","Phase Default","Admin Override","Action"].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(m => (
                        <tr key={m.id}
                          style={{ background: m.enabled ? "rgba(52,211,153,.02)" : "transparent" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.025)")}
                          onMouseLeave={e => (e.currentTarget.style.background = m.enabled ? "rgba(52,211,153,.02)" : "transparent")}
                        >
                          <td style={{ ...s.td, fontSize: 22, width: 48 }}>{m.emoji}</td>
                          <td style={s.td}>
                            <div style={{ fontWeight: 700, color: "white" }}>{m.label}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2 }}>{m.description}</div>
                          </td>
                          <td style={{ ...s.td, color: "rgba(255,255,255,.45)", fontSize: 12 }}>{m.category}</td>
                          <td style={s.td}>
                            <span style={{
                              padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                              background: m.enabled ? "rgba(52,211,153,.15)" : "rgba(251,191,36,.1)",
                              color:      m.enabled ? "#34d399"              : "#fbbf24",
                              border:     `1px solid ${m.enabled ? "rgba(52,211,153,.3)" : "rgba(251,191,36,.25)"}`,
                            }}>
                              {m.enabled ? "ðŸŸ¢ Live" : "â³ Coming Soon"}
                            </span>
                          </td>
                          <td style={{ ...s.td, fontSize: 12, color: "rgba(255,255,255,.35)" }}>
                            {m.defaultStatus === "live" ? "ðŸŸ¢ Live" : "â³ Coming Soon"}
                          </td>
                          <td style={{ ...s.td, fontSize: 12 }}>
                            {m.adminOverride ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ color: "#f87171", fontWeight: 600 }}>Modified</span>
                                <button
                                  onClick={() => resetOverride(m.id)}
                                  disabled={saving === m.id + "_reset"}
                                  style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(248,113,113,.3)", background: "transparent", color: "#f87171", cursor: "pointer" }}
                                >
                                  Reset
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: "rgba(255,255,255,.2)" }}>â€”</span>
                            )}
                          </td>
                          <td style={s.td}>
                            {/* Toggle switch */}
                            <button
                              onClick={() => toggle(m.id, m.enabled)}
                              disabled={saving === m.id}
                              style={{
                                width: 48, height: 26, borderRadius: 13,
                                border: "none", cursor: saving === m.id ? "not-allowed" : "pointer",
                                background: m.enabled ? "#10b981" : "rgba(255,255,255,.1)",
                                position: "relative", transition: "background .2s",
                                opacity: saving === m.id ? .6 : 1,
                              }}
                              title={m.enabled ? "Disable this business type" : "Enable this business type"}
                            >
                              <span style={{
                                position: "absolute", top: 3, left: m.enabled ? 25 : 3,
                                width: 20, height: 20, borderRadius: "50%",
                                background: "white", transition: "left .2s",
                                display: "block",
                              }}/>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop: 32, padding: "16px 20px", borderRadius: 12, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.15)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc", marginBottom: 8 }}>How it works</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", lineHeight: 1.7 }}>
          â€¢ <strong style={{ color: "rgba(255,255,255,.65)" }}>Toggle ON</strong> â†’ Business type appears as "Live" on the website. Companies of this type see all their dashboard modules.<br/>
          â€¢ <strong style={{ color: "rgba(255,255,255,.65)" }}>Toggle OFF</strong> â†’ Shows "Coming Soon" on website. Dashboard still works for existing companies but won't be marketed.<br/>
          â€¢ <strong style={{ color: "rgba(255,255,255,.65)" }}>Reset</strong> â†’ Removes admin override and goes back to the default phase setting from the codebase.<br/>
          â€¢ To enable specific modules for a company â†’ go to <strong style={{ color: "#a5b4fc" }}>Companies</strong> page and change their Business Type.
        </div>
      </div>
    </div>
  );
}
