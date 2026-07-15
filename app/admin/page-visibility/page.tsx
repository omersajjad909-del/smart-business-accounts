"use client";
import { useEffect, useState, useMemo } from "react";
import { getCurrentUser } from "@/lib/auth";

type Feature = {
  id: string;
  label: string;
  route: string;
  business: string;
  businessLabel: string;
  section: string;
  businessTypes: string[];
  hidden: boolean;
};

const PHASE1_BUSINESSES = new Set([
  "trading", "retail", "distribution", "wholesale", "trade",
]);
const PHASE1_TYPES = new Set([
  "trading", "retail", "distribution", "wholesale", "wholesale_multistore",
  "import_company", "export_company", "clearing_forwarding",
]);

function isPhase1(f: Feature) {
  return PHASE1_BUSINESSES.has(f.business) || f.businessTypes.some(t => PHASE1_TYPES.has(t));
}

function getHeaders() {
  const u = getCurrentUser();
  return {
    "Content-Type": "application/json",
    "x-user-id":    u?.id        || "",
    "x-user-role":  u?.role      || "",
    "x-company-id": u?.companyId || "",
  };
}

const BIZ_COLORS: Record<string, string> = {
  trading: "#818cf8", retail: "#34d399", distribution: "#f59e0b",
  wholesale: "#06b6d4", trade: "#a78bfa", transport: "#f97316",
  salon: "#f87171", gym: "#60a5fa", pharmacy: "#10b981",
  hotel: "#fbbf24", restaurant: "#ef4444", manufacturing: "#8b5cf6",
  construction: "#d97706", real_estate: "#0ea5e9", school: "#ec4899",
  healthcare: "#14b8a6",
};
function bizColor(b: string) { return BIZ_COLORS[b] || "#94a3b8"; }

function Toggle({ on, loading, onToggle }: { on: boolean; loading: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      title={on ? "Click to hide this page" : "Click to show this page"}
      style={{
        position: "relative", width: 44, height: 24, borderRadius: 99,
        border: "none", cursor: loading ? "not-allowed" : "pointer",
        background: on ? "#34d399" : "rgba(255,255,255,.12)",
        transition: "background .25s",
        flexShrink: 0,
        opacity: loading ? .6 : 1,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: on ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%",
        background: "white",
        boxShadow: "0 1px 4px rgba(0,0,0,.3)",
        transition: "left .25s",
        display: "block",
      }} />
    </button>
  );
}

export default function PageVisibilityPage() {
  const [features, setFeatures]     = useState<Feature[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [bizFilter, setBizFilter]   = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "visible" | "hidden">("all");
  const [phase1Only, setPhase1Only] = useState(false);
  const [toast, setToast]           = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/page-visibility", { credentials: "include", headers: getHeaders() });
      const d = await r.json();
      setFeatures(d.features || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function toggle(id: string, currentHidden: boolean) {
    setSaving(id);
    try {
      const r = await fetch("/api/admin/page-visibility", {
        method: "POST", credentials: "include",
        headers: getHeaders(),
        body: JSON.stringify({ action: currentHidden ? "SHOW" : "HIDE", id }),
      });
      if (r.ok) {
        setFeatures(prev => prev.map(f => f.id === id ? { ...f, hidden: !currentHidden } : f));
        const feat = features.find(f => f.id === id);
        showToast(currentHidden ? `Shown: ${feat?.label}` : `Hidden: ${feat?.label}`);
      }
    } finally { setSaving(null); }
  }

  async function resetAll() {
    if (!confirm("Restore all hidden pages to visible? This resets all overrides.")) return;
    setSaving("RESET");
    try {
      await fetch("/api/admin/page-visibility", {
        method: "POST", credentials: "include",
        headers: getHeaders(),
        body: JSON.stringify({ action: "RESET_ALL" }),
      });
      await load();
      showToast("All pages restored to visible");
    } finally { setSaving(null); }
  }

  const allBusinesses = useMemo(() => {
    const seen = new Map<string, string>();
    features.forEach(f => seen.set(f.business, f.businessLabel));
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [features]);

  const filtered = useMemo(() => features.filter(f => {
    if (phase1Only && !isPhase1(f)) return false;
    if (bizFilter !== "all" && f.business !== bizFilter) return false;
    if (statusFilter === "visible" && f.hidden)  return false;
    if (statusFilter === "hidden"  && !f.hidden) return false;
    if (search) {
      const q = search.toLowerCase();
      if (![f.label, f.route, f.section, f.businessLabel].some(v => v.toLowerCase().includes(q))) return false;
    }
    return true;
  }), [features, search, bizFilter, phase1Only, statusFilter]);

  const grouped = useMemo(() => {
    const g: Record<string, { label: string; color: string; features: Feature[] }> = {};
    filtered.forEach(f => {
      if (!g[f.business]) g[f.business] = { label: f.businessLabel, color: bizColor(f.business), features: [] };
      g[f.business].features.push(f);
    });
    return Object.entries(g).sort((a, b) => a[1].label.localeCompare(b[1].label));
  }, [filtered]);

  const hiddenCount   = features.filter(f => f.hidden).length;
  const visibleCount  = features.length - hiddenCount;

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 80px" }}>
      <style>{css}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 24, zIndex: 9999,
          background: "rgba(20,30,60,.97)", border: "1px solid rgba(52,211,153,.4)",
          color: "#34d399", fontSize: 13, fontWeight: 700,
          padding: "10px 20px", borderRadius: 12,
          boxShadow: "0 8px 30px rgba(0,0,0,.4)",
          animation: "slideIn .2s ease",
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Page Visibility</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)", maxWidth: 560 }}>
            Toggle any dashboard page on or off globally. Hidden pages disappear from all users' navigation instantly — no code change needed.
          </p>
        </div>
        <button
          onClick={resetAll}
          disabled={saving === "RESET" || hiddenCount === 0}
          style={{
            padding: "9px 18px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: hiddenCount === 0 ? "not-allowed" : "pointer",
            border: "1px solid rgba(248,113,113,.3)", background: "rgba(248,113,113,.08)", color: "#f87171",
            opacity: hiddenCount === 0 ? .4 : 1, transition: "opacity .2s",
          }}
        >
          {saving === "RESET" ? "Restoring…" : `Restore All (${hiddenCount} hidden)`}
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Pages",   val: features.length, color: "#818cf8" },
          { label: "Visible",       val: visibleCount,    color: "#34d399" },
          { label: "Hidden",        val: hiddenCount,     color: "#f87171" },
          { label: "Phase 1 Pages", val: features.filter(isPhase1).length, color: "#fbbf24" },
        ].map(k => (
          <div key={k.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.38)", marginTop: 5, letterSpacing: ".05em" }}>{k.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Warning banner */}
      {hiddenCount > 0 && (
        <div style={{ marginBottom: 20, padding: "12px 18px", borderRadius: 12, background: "rgba(248,113,113,.06)", border: "1px solid rgba(248,113,113,.25)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>
            <strong style={{ color: "#f87171" }}>{hiddenCount} page{hiddenCount > 1 ? "s" : ""}</strong> are currently hidden from all users' dashboards.
          </span>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Search pages, routes, sections…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220, padding: "9px 14px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "white", fontSize: 13, outline: "none", fontFamily: "inherit" }}
        />
        <select value={bizFilter} onChange={e => setBizFilter(e.target.value)}
          style={{ padding: "9px 14px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,.1)", background: "#0f1628", color: "white", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          <option value="all">All Modules</option>
          {allBusinesses.map(([biz, label]) => <option key={biz} value={biz}>{label}</option>)}
        </select>
        <div style={{ display: "flex", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, overflow: "hidden" }}>
          {(["all", "visible", "hidden"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{
                padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none",
                background: statusFilter === s ? "rgba(99,102,241,.3)" : "transparent",
                color: statusFilter === s ? "#818cf8" : "rgba(255,255,255,.4)",
                transition: "all .15s", fontFamily: "inherit",
              }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13, color: phase1Only ? "#fbbf24" : "rgba(255,255,255,.4)", fontWeight: 600, userSelect: "none" }}>
          <input type="checkbox" checked={phase1Only} onChange={e => setPhase1Only(e.target.checked)} style={{ accentColor: "#fbbf24", width: 14, height: 14 }} />
          Phase 1 Only
        </label>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,.28)", whiteSpace: "nowrap" }}>
          {filtered.length} / {features.length}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: "rgba(255,255,255,.25)" }}>Loading pages…</div>
      ) : grouped.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80, color: "rgba(255,255,255,.25)" }}>No pages match your filters.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {grouped.map(([biz, { label, color, features: bizFeatures }]) => {
            const hiddenInGroup = bizFeatures.filter(f => f.hidden).length;
            const sections: Record<string, Feature[]> = {};
            bizFeatures.forEach(f => {
              if (!sections[f.section]) sections[f.section] = [];
              sections[f.section].push(f);
            });

            return (
              <div key={biz} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 18, overflow: "hidden" }}>
                {/* Module header */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.06)",
                  background: `linear-gradient(90deg,${color}14,transparent)`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 4, height: 22, borderRadius: 99, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 15, fontWeight: 800, color: "white" }}>{label}</span>
                    {PHASE1_BUSINESSES.has(biz) && (
                      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".06em", background: "rgba(251,191,36,.12)", border: "1px solid rgba(251,191,36,.3)", color: "#fbbf24", borderRadius: 6, padding: "2px 8px" }}>
                        PHASE 1
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,.28)" }}>{bizFeatures.length} pages</span>
                  </div>
                  {hiddenInGroup > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#f87171", background: "rgba(248,113,113,.1)", padding: "3px 10px", borderRadius: 20 }}>
                      {hiddenInGroup} hidden
                    </span>
                  )}
                </div>

                {/* Sections */}
                <div style={{ padding: "12px 16px 16px" }}>
                  {Object.entries(sections).map(([section, sFeatures]) => (
                    <div key={section} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.22)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 4 }}>
                        {section}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 6 }}>
                        {sFeatures.map(f => (
                          <div key={f.id} className="pv-item" style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "10px 14px", borderRadius: 12, gap: 12,
                            background: f.hidden ? "rgba(248,113,113,.05)" : "rgba(255,255,255,.03)",
                            border: `1px solid ${f.hidden ? "rgba(248,113,113,.18)" : "rgba(255,255,255,.06)"}`,
                            transition: "border-color .2s, background .2s",
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: f.hidden ? "rgba(248,113,113,.65)" : "rgba(255,255,255,.88)", marginBottom: 2, display: "flex", alignItems: "center", gap: 7 }}>
                                {f.hidden && <span style={{ fontSize: 10 }}>🚫</span>}
                                {f.label}
                              </div>
                              <div style={{ fontSize: 10, color: "rgba(255,255,255,.22)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {f.route}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: f.hidden ? "#f87171" : "#34d399" }}>
                                {f.hidden ? "OFF" : "ON"}
                              </span>
                              <Toggle on={!f.hidden} loading={saving === f.id} onToggle={() => toggle(f.id, f.hidden)} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const css = `
  @keyframes slideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
  .pv-item:hover { border-color: rgba(255,255,255,.12) !important; }
  button { font-family: inherit; }
  select option { background: #0f1628; }
`;
