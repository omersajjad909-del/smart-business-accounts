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

function headers() {
  const u = getCurrentUser();
  return {
    "Content-Type": "application/json",
    "x-user-id":    u?.id        || "",
    "x-user-role":  u?.role      || "",
    "x-company-id": u?.companyId || "",
  };
}

function isPhase1(f: Feature) {
  return PHASE1_BUSINESSES.has(f.business) ||
    f.businessTypes.some(t => PHASE1_TYPES.has(t));
}

const BIZ_COLORS: Record<string, string> = {
  trading:      "#818cf8",
  retail:       "#34d399",
  distribution: "#f59e0b",
  wholesale:    "#06b6d4",
  trade:        "#a78bfa",
  transport:    "#f97316",
  salon:        "#f87171",
  gym:          "#60a5fa",
  pharmacy:     "#10b981",
  hotel:        "#fbbf24",
  restaurant:   "#ef4444",
  manufacturing:"#8b5cf6",
  construction: "#d97706",
  real_estate:  "#0ea5e9",
  school:       "#ec4899",
  healthcare:   "#14b8a6",
};

function bizColor(b: string) { return BIZ_COLORS[b] || "#94a3b8"; }

export default function PageVisibilityPage() {
  const [features, setFeatures]   = useState<Feature[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [bizFilter, setBizFilter] = useState("all");
  const [phase1Only, setPhase1Only] = useState(false);
  const [msg, setMsg]             = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/page-visibility", { credentials: "include", headers: headers() });
      const d = await r.json();
      setFeatures(d.features || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function toggle(id: string, currentHidden: boolean) {
    setSaving(id);
    setMsg("");
    try {
      const r = await fetch("/api/admin/page-visibility", {
        method: "POST", credentials: "include",
        headers: headers(),
        body: JSON.stringify({ action: currentHidden ? "SHOW" : "HIDE", id }),
      });
      if (r.ok) {
        setFeatures(prev => prev.map(f => f.id === id ? { ...f, hidden: !currentHidden } : f));
        setMsg(`${currentHidden ? "✅ Shown" : "⏸ Hidden"}: ${id}`);
        setTimeout(() => setMsg(""), 3000);
      }
    } finally { setSaving(null); }
  }

  async function resetAll() {
    if (!confirm("Show all hidden pages? This will reset all visibility overrides.")) return;
    setSaving("RESET");
    try {
      await fetch("/api/admin/page-visibility", {
        method: "POST", credentials: "include",
        headers: headers(),
        body: JSON.stringify({ action: "RESET_ALL" }),
      });
      await load();
      setMsg("✅ All pages restored to visible");
      setTimeout(() => setMsg(""), 3000);
    } finally { setSaving(null); }
  }

  const allBusinesses = useMemo(() => {
    const seen = new Map<string, string>();
    features.forEach(f => seen.set(f.business, f.businessLabel));
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [features]);

  const filtered = useMemo(() => {
    return features.filter(f => {
      if (phase1Only && !isPhase1(f)) return false;
      if (bizFilter !== "all" && f.business !== bizFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!f.label.toLowerCase().includes(q) &&
            !f.route.toLowerCase().includes(q) &&
            !f.section.toLowerCase().includes(q) &&
            !f.businessLabel.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [features, search, bizFilter, phase1Only]);

  const grouped = useMemo(() => {
    const g: Record<string, { label: string; features: Feature[] }> = {};
    filtered.forEach(f => {
      if (!g[f.business]) g[f.business] = { label: f.businessLabel, features: [] };
      g[f.business].features.push(f);
    });
    return Object.entries(g).sort((a, b) => a[1].label.localeCompare(b[1].label));
  }, [filtered]);

  const hiddenCount = features.filter(f => f.hidden).length;
  const totalCount  = features.length;

  const s = {
    page: { padding: "28px 32px", maxWidth: 1300, margin: "0 auto" } as React.CSSProperties,
    card: { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "18px 20px" } as React.CSSProperties,
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "white", margin: 0 }}>Page Visibility</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginTop: 4 }}>
            Show or hide individual dashboard pages per business module. Hidden pages are removed from all users' navigation globally.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {msg && <span style={{ fontSize: 12, color: "#34d399", fontWeight: 600 }}>{msg}</span>}
          <button onClick={resetAll} disabled={saving === "RESET" || hiddenCount === 0}
            style={{ padding: "9px 18px", borderRadius: 9, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: hiddenCount === 0 ? .4 : 1 }}>
            Show All ({hiddenCount} hidden)
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Pages", val: totalCount, color: "#818cf8" },
          { label: "Visible", val: totalCount - hiddenCount, color: "#34d399" },
          { label: "Hidden", val: hiddenCount, color: "#f87171" },
          { label: "Phase 1 Pages", val: features.filter(isPhase1).length, color: "#f59e0b" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ ...s.card, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "monospace" }}>{val}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ ...s.card, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <input
          placeholder="Search pages, routes, sections..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white", fontSize: 13, outline: "none" }}
        />
        <select value={bizFilter} onChange={e => setBizFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "#1a1f3a", color: "white", fontSize: 13, cursor: "pointer" }}>
          <option value="all">All Modules</option>
          {allBusinesses.map(([biz, label]) => (
            <option key={biz} value={biz}>{label}</option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13, color: phase1Only ? "#f59e0b" : "rgba(255,255,255,.4)", fontWeight: 600, userSelect: "none" }}>
          <input type="checkbox" checked={phase1Only} onChange={e => setPhase1Only(e.target.checked)}
            style={{ accentColor: "#f59e0b", width: 14, height: 14 }} />
          Phase 1 Only
        </label>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>
          {filtered.length} of {totalCount} pages
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.3)", fontSize: 14 }}>Loading...</div>
      ) : grouped.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.3)", fontSize: 14 }}>No pages match your filters.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {grouped.map(([biz, { label, features: bizFeatures }]) => {
            const color = bizColor(biz);
            const hiddenInGroup = bizFeatures.filter(f => f.hidden).length;
            const isP1 = PHASE1_BUSINESSES.has(biz);
            const sections: Record<string, Feature[]> = {};
            bizFeatures.forEach(f => {
              if (!sections[f.section]) sections[f.section] = [];
              sections[f.section].push(f);
            });

            return (
              <div key={biz} style={{ ...s.card, padding: 0, overflow: "hidden" }}>
                {/* Group header */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 20px",
                  borderBottom: "1px solid rgba(255,255,255,.06)",
                  background: `linear-gradient(90deg,${color}0a,transparent)`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 3, height: 20, borderRadius: 2, background: color }} />
                    <span style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{label}</span>
                    {isP1 && (
                      <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.3)", color: "#fbbf24", borderRadius: 5, padding: "2px 7px", letterSpacing: ".06em" }}>
                        PHASE 1
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>{bizFeatures.length} pages</span>
                  </div>
                  {hiddenInGroup > 0 && (
                    <span style={{ fontSize: 11, color: "#f87171", fontWeight: 600 }}>{hiddenInGroup} hidden</span>
                  )}
                </div>

                {/* Sections */}
                <div style={{ padding: "8px 12px 12px" }}>
                  {Object.entries(sections).map(([section, sFeatures]) => (
                    <div key={section} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.25)", letterSpacing: ".1em", textTransform: "uppercase", padding: "8px 8px 4px" }}>
                        {section}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 6 }}>
                        {sFeatures.map(f => (
                          <div key={f.id} style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "10px 14px", borderRadius: 10,
                            background: f.hidden ? "rgba(248,113,113,.04)" : "rgba(255,255,255,.025)",
                            border: `1px solid ${f.hidden ? "rgba(248,113,113,.2)" : "rgba(255,255,255,.06)"}`,
                            gap: 10,
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: f.hidden ? "rgba(248,113,113,.7)" : "rgba(255,255,255,.85)", marginBottom: 2 }}>
                                {f.label}
                              </div>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {f.route}
                              </div>
                            </div>
                            <button
                              onClick={() => toggle(f.id, f.hidden)}
                              disabled={saving === f.id}
                              style={{
                                flexShrink: 0,
                                padding: "5px 14px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer",
                                border: `1px solid ${f.hidden ? "rgba(52,211,153,.3)" : "rgba(248,113,113,.3)"}`,
                                background: f.hidden ? "rgba(52,211,153,.08)" : "rgba(248,113,113,.08)",
                                color: f.hidden ? "#34d399" : "#f87171",
                                opacity: saving === f.id ? .5 : 1,
                                transition: "all .15s",
                              }}
                            >
                              {saving === f.id ? "..." : f.hidden ? "Show" : "Hide"}
                            </button>
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
