"use client";

import { useEffect, useState, useMemo } from "react";
import { BUSINESS_TYPES } from "@/lib/businessModules";
import { dashboardFeaturesForBusinessType } from "@/lib/dashboardFeatureRegistry";
import { getCurrentUser } from "@/lib/auth";

const FONT = "'Outfit','Inter',sans-serif";

const PLANS = ["STARTER", "PRO", "ENTERPRISE"] as const;
type Plan = typeof PLANS[number];

const PLAN_META: Record<Plan, { label: string; color: string; bg: string; border: string; desc: string }> = {
  STARTER:    { label: "Starter",    color: "#818cf8", bg: "rgba(129,140,248,0.08)", border: "rgba(129,140,248,0.3)", desc: "Basic features" },
  PRO:        { label: "Pro",        color: "#38bdf8", bg: "rgba(56,189,248,0.08)",  border: "rgba(56,189,248,0.3)",  desc: "Advanced features" },
  ENTERPRISE: { label: "Enterprise", color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.3)", desc: "Full access" },
};

type ConfigMap = Record<string, Record<Plan, string[]>>;
/** Same shape as ConfigMap, but the values are dashboard page ids. */
type PageConfigMap = Record<string, Record<Plan, string[]>>;

/**
 * Business type × plan assignment grid — every module key and every dashboard
 * page, assignable to Starter / Pro / Enterprise.
 *
 * Lives here rather than in a route of its own because it is rendered as the
 * "Pages & Modules" tab of /admin/plans. It used to be a second admin screen at
 * /admin/permissions, which meant two places decided what a plan could see and
 * they disagreed; that route now redirects here.
 */
export default function BusinessPlanMatrix({ embedded = false, scope = "WORLD" }: { embedded?: boolean; scope?: "WORLD" | "PKR" }) {
  // WORLD and PKR are two separate saved configs behind the same grid, so the
  // Pakistan audience can have a different set of dashboard pages per plan.
  const scopeQuery = scope === "PKR" ? "?scope=PKR" : "";
  const [user]       = useState(() => getCurrentUser());
  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState<typeof BUSINESS_TYPES[0] | null>(null);
  const [config,     setConfig]     = useState<ConfigMap>({});
  const [pageConfig, setPageConfig] = useState<PageConfigMap>({});
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [enabledIds,      setEnabledIds]      = useState<Set<string> | null>(null);
  const [expandedGroups,  setExpandedGroups]  = useState<Set<string>>(new Set(["core","vouchers","banking","reports","sales","purchases","inventory","hr"]));

  const getHeaders = () => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (user) { h["x-user-id"] = user.id; h["x-user-role"] = user.role; }
    return h;
  };

  // Business types that are enabled but have no entry in BUSINESS_TYPES. These
  // used to disappear without trace: the header counts what /business-modules
  // reports, while the grid renders BUSINESS_TYPES filtered by those ids — so a
  // type live in one list and missing from the other showed in the count and
  // nowhere else. Surfaced now instead of silently dropped.
  const [orphanIds, setOrphanIds] = useState<string[]>([]);

  // Load saved config + enabled business types
  useEffect(() => {
    // no-store on both: this grid is opened straight after toggling a type on
    // in Modules, and a cached response makes the change look like it failed.
    fetch(`/api/admin/business-plan-modules${scopeQuery}`, { headers: getHeaders(), cache: "no-store" })
      .then(r => r.ok ? r.json() : { config: {}, pageConfig: {} })
      .then(d => { setConfig(d.config || {}); setPageConfig(d.pageConfig || {}); })
      .catch(() => {});

    fetch("/api/admin/business-modules", { headers: getHeaders(), cache: "no-store" })
      .then(r => r.ok ? r.json() : { modules: [] })
      .then(d => {
        const ids = new Set<string>(
          (d.modules || []).filter((m: any) => m.enabled).map((m: any) => m.id as string)
        );
        setEnabledIds(ids);
        const known = new Set<string>(BUSINESS_TYPES.map(b => b.id as string));
        setOrphanIds([...ids].filter(id => !known.has(id)));
      })
      .catch(() => setEnabledIds(new Set()));
  }, []);

  // Every dashboard page this business type owns, grouped the way the sidebar
  // groups them — all 24 AI tools, the industry control centres, everything.
  const pageFeatures = useMemo(
    () => (selected ? dashboardFeaturesForBusinessType(selected.id) : []),
    [selected]
  );

  const pageGroups = useMemo(() => {
    const bySection = new Map<string, { id: string; label: string }[]>();
    for (const f of pageFeatures) {
      const section = `${f.businessLabel} · ${f.section}`;
      if (!bySection.has(section)) bySection.set(section, []);
      bySection.get(section)!.push({ id: f.id, label: f.label });
    }
    return Array.from(bySection.entries()).map(([label, items]) => ({
      id: `page:${label}`,
      label,
      items,
    }));
  }, [pageFeatures]);

  // No saved override means "everything on" — a business type should not lose
  // its pages just because nobody has opened this screen yet.
  const planPages = useMemo((): Record<Plan, string[]> => {
    const allIds = pageFeatures.map(f => f.id);
    const saved = selected ? pageConfig[selected.id] : undefined;
    if (!saved) return { STARTER: allIds, PRO: allIds, ENTERPRISE: allIds };
    return {
      STARTER:    saved.STARTER    ?? allIds,
      PRO:        saved.PRO        ?? allIds,
      ENTERPRISE: saved.ENTERPRISE ?? allIds,
    };
  }, [selected, pageConfig, pageFeatures]);

  function setPlanPages(plan: Plan, ids: string[]) {
    if (!selected) return;
    setPageConfig(prev => ({
      ...prev,
      [selected.id]: { ...planPages, [plan]: ids },
    }));
  }

  function togglePage(plan: Plan, featureId: string) {
    const current = planPages[plan];
    setPlanPages(
      plan,
      current.includes(featureId)
        ? current.filter(id => id !== featureId)
        : [...current, featureId]
    );
  }

  function applyPreset(preset: "all" | "default" | "min") {
    if (!selected) return;
    const allPages = pageFeatures.map(f => f.id);
    if (preset === "all") {
      setPageConfig(prev => ({ ...prev, [selected.id]: { STARTER: allPages, PRO: allPages, ENTERPRISE: allPages } }));
    } else if (preset === "default") {
      setPageConfig(prev => { const n = { ...prev }; delete n[selected.id]; return n; });
    } else {
      // Recommended tiering: Starter gets the control centre of each section,
      // Pro gets everything except the AI tools, Enterprise gets all.
      const firstOfEachSection = new Set<string>();
      const seenSections = new Set<string>();
      for (const f of pageFeatures) {
        const key = `${f.businessLabel} · ${f.section}`;
        if (!seenSections.has(key)) { seenSections.add(key); firstOfEachSection.add(f.id); }
      }
      const aiIds = new Set(pageFeatures.filter(f => f.businessLabel === "AI Intelligence").map(f => f.id));
      setPageConfig(prev => ({
        ...prev,
        [selected.id]: {
          STARTER:    allPages.filter(id => firstOfEachSection.has(id) && !aiIds.has(id)),
          PRO:        allPages.filter(id => !aiIds.has(id)),
          ENTERPRISE: allPages,
        },
      }));
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/business-plan-modules${scopeQuery}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ config, pageConfig }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    } finally { setSaving(false); }
  }

  // Only show business types that are currently enabled in Business Modules admin
  const filtered = useMemo(() => {
    const businesses = enabledIds
      ? BUSINESS_TYPES.filter(b => enabledIds.has(b.id))
      : BUSINESS_TYPES;
    const q = search.toLowerCase();
    return businesses.filter(b =>
      !q || b.label.toLowerCase().includes(q) || b.id.toLowerCase().includes(q)
    );
  }, [search, enabledIds]);

  return (
    <div style={embedded
      ? { fontFamily: FONT, color: "white" }
      : { minHeight: "100vh", background: "var(--app-bg, #0f1117)", padding: "32px 28px", fontFamily: FONT, color: "white" }}>

      {/* Header — the host page supplies its own when embedded */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          {!embedded && (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "white" }}>Plan Permissions</h1>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                Select a business type → assign every module and every page to Starter / Pro / Enterprise
              </p>
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {saved && (
            <span style={{ fontSize: 13, fontWeight: 600, color: "#34d399", padding: "8px 14px", borderRadius: 8, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)" }}>
              ✓ Saved
            </span>
          )}
          <button
            onClick={save}
            disabled={saving}
            style={{
              background: saving ? "rgba(99,102,241,0.4)" : "#6366f1",
              color: "#fff", border: "none", borderRadius: 10,
              padding: "10px 24px", fontSize: 14, fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer", fontFamily: FONT,
            }}
          >
            {saving ? "Saving…" : "Save All Changes"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "280px 1fr" : "1fr", gap: 20, alignItems: "start" }}>

        {/* ── LEFT: Business Types ── */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
              {enabledIds ? `${filtered.length} of ${enabledIds.size} Enabled` : "Loading…"} Business Types
            </div>
            {orphanIds.length > 0 && (
              <div style={{
                fontSize: 11, lineHeight: 1.6, color: "#fbbf24", marginBottom: 10,
                background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.25)",
                borderRadius: 8, padding: "8px 10px",
              }}>
                Enabled but not configurable here: <strong>{orphanIds.join(", ")}</strong>.
                These are live in Modules but have no entry in the business catalogue,
                so their pages cannot be assigned.
              </div>
            )}
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search business..."
              style={{
                width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "8px 12px", color: "white", fontSize: 13,
                fontFamily: FONT, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ maxHeight: selected ? "calc(100vh - 200px)" : "auto", overflowY: "auto" }}>
            {enabledIds === null && (
              <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Loading…</div>
            )}
            {enabledIds !== null && filtered.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No enabled business types found.</div>
            )}
            {enabledIds !== null && !selected && (
              // Grid view when nothing selected
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, padding: 14 }}>
                {filtered.map(b => {
                  const hasCustom = !!config[b.id];
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelected(b)}
                      style={{
                        padding: "14px 12px", borderRadius: 12, cursor: "pointer",
                        background: "rgba(255,255,255,0.03)",
                        border: `1px solid ${hasCustom ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)"}`,
                        transition: "all .15s", textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 24, marginBottom: 6 }}>{b.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "white", marginBottom: 2 }}>{b.label}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{(b.modules as string[]).length} modules</div>
                      {hasCustom && (
                        <div style={{ marginTop: 6, fontSize: 9, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: 0.5 }}>
                          Customized
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {enabledIds !== null && selected && (
              // List view when something is selected
              filtered.map(b => {
                const isActive = selected.id === b.id;
                const hasCustom = !!config[b.id];
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelected(b)}
                    style={{
                      padding: "11px 16px", cursor: "pointer",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      background: isActive ? "rgba(99,102,241,0.12)" : "transparent",
                      borderLeft: `3px solid ${isActive ? "#6366f1" : "transparent"}`,
                      display: "flex", alignItems: "center", gap: 10,
                      transition: "background .15s",
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{b.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: "white" }}>{b.label}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{(b.modules as string[]).length} modules</div>
                    </div>
                    {hasCustom && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", background: "rgba(99,102,241,0.15)", padding: "1px 5px", borderRadius: 4 }}>Custom</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: Plan columns ── */}
        {selected && (
          <div>
            {/* Business header */}
            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14, padding: "16px 20px", marginBottom: 16,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 32 }}>{selected.icon}</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "white" }}>{selected.label}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                    {(selected.modules as string[]).length} total modules available
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => applyPreset("default")} style={presetBtn}>Reset to Defaults</button>
                <button onClick={() => applyPreset("min")}     style={presetBtn}>Recommended</button>
                <button onClick={() => applyPreset("all")}     style={presetBtn}>All ON</button>
                <button onClick={() => setSelected(null)} style={{ ...presetBtn, color: "rgba(255,255,255,0.4)" }}>← Back</button>
              </div>
            </div>

            {/* Plan header bar */}
            {(() => {
              const allMods = selected.modules as string[];
              return (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 170px 170px 170px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
                    <div style={{ padding: "12px 18px", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,.3)", fontWeight: 600 }}>{allMods.length} modules total</span>
                    </div>
                    {PLANS.map(plan => {
                      const meta = PLAN_META[plan];
                      const count = allMods.filter(m => planModules[plan].includes(m)).length;
                      return (
                        <div key={plan} style={{ padding: "10px 14px", borderRight: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.label}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginBottom: 7 }}>{count}/{allMods.length} enabled</div>
                          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                            <button onClick={() => setConfig(prev => ({ ...prev, [selected.id]: { ...planModules, [plan]: allMods } }))}
                              style={{ padding: "3px 8px", borderRadius: 5, border: `1px solid ${meta.border}`, background: "transparent", color: meta.color, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>All ON</button>
                            <button onClick={() => setConfig(prev => ({ ...prev, [selected.id]: { ...planModules, [plan]: allMods.filter(m => ALWAYS_ON.has(m)) } }))}
                              style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "rgba(255,255,255,.4)", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Core</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Grouped module table */}
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                    {MODULE_GROUPS.map((group, gi) => {
                      // Modules whose screen is listed under Pages are dropped:
                      // the sidebar link is gated by the page flag, so the module
                      // switch changed nothing while appearing to. Keeping both
                      // let the two be set to opposite values, which is what made
                      // the grid look like it had duplicate rows.
                      const groupMods = group.keys.filter(k => allMods.includes(k) && !pageShadowMap.has(k));
                      if (groupMods.length === 0) return null;
                      const isExpanded = expandedGroups.has(group.id);
                      const isLast = gi === MODULE_GROUPS.length - 1;

                      return (
                        <div key={group.id} style={{ borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)" }}>
                          {/* Group header */}
                          <div
                            onClick={() => setExpandedGroups(prev => { const n = new Set(prev); n.has(group.id) ? n.delete(group.id) : n.add(group.id); return n; })}
                            style={{ display: "grid", gridTemplateColumns: "1fr 170px 170px 170px", padding: "9px 16px", background: "rgba(255,255,255,0.035)", cursor: "pointer", userSelect: "none" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <span style={{ fontSize: 10, color: "rgba(255,255,255,.4)", width: 10, flexShrink: 0 }}>{isExpanded ? "▼" : "▶"}</span>
                              <span style={{ fontSize: 13 }}>{group.icon}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>{group.label}</span>
                              <span style={{ fontSize: 10, color: "rgba(255,255,255,.25)" }}>({groupMods.length})</span>
                            </div>
                            {PLANS.map(plan => {
                              const meta = PLAN_META[plan];
                              const onCount = groupMods.filter(m => planModules[plan].includes(m)).length;
                              const allOn = onCount === groupMods.length;
                              const nonLocked = groupMods.filter(m => !ALWAYS_ON.has(m));
                              return (
                                <div key={plan} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }} onClick={e => e.stopPropagation()}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: allOn ? meta.color : "rgba(255,255,255,.3)", minWidth: 28, textAlign: "right" }}>
                                    {onCount}/{groupMods.length}
                                  </span>
                                  {nonLocked.length > 0 && (
                                    <button
                                      onClick={() => setConfig(prev => {
                                        const cur = new Set(planModules[plan]);
                                        if (allOn) nonLocked.forEach(m => cur.delete(m));
                                        else nonLocked.forEach(m => cur.add(m));
                                        return { ...prev, [selected.id]: { ...planModules, [plan]: Array.from(cur) } };
                                      })}
                                      style={{ padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer", border: `1px solid ${allOn ? "rgba(248,113,113,.4)" : meta.border}`, background: "transparent", color: allOn ? "#f87171" : meta.color, fontFamily: FONT }}
                                    >
                                      {allOn ? "All OFF" : "All ON"}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Module rows */}
                          {isExpanded && groupMods.map((mod, mi) => {
                            const locked = ALWAYS_ON.has(mod);
                            return (
                              <div key={mod} style={{ display: "grid", gridTemplateColumns: "1fr 170px 170px 170px", padding: "7px 16px 7px 40px", borderTop: "1px solid rgba(255,255,255,0.03)", background: mi % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>{MODULE_LABELS[mod] || mod}</span>
                                  {locked && <span style={{ fontSize: 9, color: "rgba(255,255,255,.2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>core</span>}
                                </div>
                                {PLANS.map(plan => {
                                  const meta = PLAN_META[plan];
                                  const isOn = planModules[plan].includes(mod);
                                  return (
                                    <div key={plan} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                      <div onClick={() => !locked && toggleModule(plan, mod)}
                                        style={{ width: 34, height: 19, borderRadius: 10, position: "relative", transition: "background .2s", background: isOn ? meta.color : "rgba(255,255,255,0.1)", cursor: locked ? "default" : "pointer", opacity: locked ? 0.7 : 1, flexShrink: 0 }}>
                                        <div style={{ position: "absolute", top: 2.5, left: isOn ? 17 : 2.5, width: 14, height: 14, borderRadius: "50%", background: "white", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }}/>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {/* ── Pages: every screen this business type owns ────────── */}
                  {pageGroups.length > 0 && (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 170px 170px 170px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden", margin: "18px 0 10px" }}>
                        <div style={{ padding: "12px 18px", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>Pages ({pageFeatures.length})</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 2 }}>
                            Every screen in the sidebar for this business type
                          </div>
                        </div>
                        {PLANS.map(plan => {
                          const meta = PLAN_META[plan];
                          const count = planPages[plan].length;
                          return (
                            <div key={plan} style={{ padding: "10px 14px", borderRight: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.label}</div>
                              <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginBottom: 7 }}>{count}/{pageFeatures.length} enabled</div>
                              <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                                <button onClick={() => setPlanPages(plan, pageFeatures.map(f => f.id))}
                                  style={{ padding: "3px 8px", borderRadius: 5, border: `1px solid ${meta.border}`, background: "transparent", color: meta.color, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>All ON</button>
                                <button onClick={() => setPlanPages(plan, [])}
                                  style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "rgba(255,255,255,.4)", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>None</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                        {pageGroups.map((group, gi) => {
                          const isExpanded = expandedGroups.has(group.id);
                          const isLast = gi === pageGroups.length - 1;
                          const ids = group.items.map(i => i.id);

                          return (
                            <div key={group.id} style={{ borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)" }}>
                              <div
                                onClick={() => setExpandedGroups(prev => { const n = new Set(prev); n.has(group.id) ? n.delete(group.id) : n.add(group.id); return n; })}
                                style={{ display: "grid", gridTemplateColumns: "1fr 170px 170px 170px", padding: "9px 16px", background: "rgba(255,255,255,0.035)", cursor: "pointer", userSelect: "none" }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                  <span style={{ fontSize: 10, color: "rgba(255,255,255,.4)", width: 10, flexShrink: 0 }}>{isExpanded ? "▼" : "▶"}</span>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>{group.label}</span>
                                  <span style={{ fontSize: 10, color: "rgba(255,255,255,.25)" }}>({group.items.length})</span>
                                </div>
                                {PLANS.map(plan => {
                                  const meta = PLAN_META[plan];
                                  const onCount = ids.filter(id => planPages[plan].includes(id)).length;
                                  const allOn = onCount === ids.length;
                                  return (
                                    <div key={plan} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }} onClick={e => e.stopPropagation()}>
                                      <span style={{ fontSize: 10, fontWeight: 700, color: allOn ? meta.color : "rgba(255,255,255,.3)", minWidth: 28, textAlign: "right" }}>
                                        {onCount}/{ids.length}
                                      </span>
                                      <button
                                        onClick={() => {
                                          const cur = new Set(planPages[plan]);
                                          if (allOn) ids.forEach(id => cur.delete(id));
                                          else ids.forEach(id => cur.add(id));
                                          setPlanPages(plan, Array.from(cur));
                                        }}
                                        style={{ padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer", border: `1px solid ${allOn ? "rgba(248,113,113,.4)" : meta.border}`, background: "transparent", color: allOn ? "#f87171" : meta.color, fontFamily: FONT }}
                                      >
                                        {allOn ? "All OFF" : "All ON"}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>

                              {isExpanded && group.items.map((item, ii) => (
                                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 170px 170px 170px", padding: "7px 16px 7px 40px", borderTop: "1px solid rgba(255,255,255,0.03)", background: ii % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>{item.label}</span>
                                  </div>
                                  {PLANS.map(plan => {
                                    const meta = PLAN_META[plan];
                                    const isOn = planPages[plan].includes(item.id);
                                    return (
                                      <div key={plan} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                        <div onClick={() => togglePage(plan, item.id)}
                                          style={{ width: 34, height: 19, borderRadius: 10, position: "relative", transition: "background .2s", background: isOn ? meta.color : "rgba(255,255,255,0.1)", cursor: "pointer", flexShrink: 0 }}>
                                          <div style={{ position: "absolute", top: 2.5, left: isOn ? 17 : 2.5, width: 14, height: 14, borderRadius: "50%", background: "white", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }}/>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              );
            })()}

            {/* Save */}
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              {saved && (
                <span style={{ fontSize: 13, fontWeight: 600, color: "#34d399", alignSelf: "center" }}>✓ Saved</span>
              )}
              <button
                onClick={save} disabled={saving}
                style={{
                  background: saving ? "rgba(99,102,241,0.4)" : "#6366f1",
                  color: "#fff", border: "none", borderRadius: 10,
                  padding: "11px 32px", fontSize: 14, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer", fontFamily: FONT,
                }}
              >
                {saving ? "Saving…" : "💾 Save Changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const presetBtn: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)",
  fontSize: 12, fontWeight: 600, cursor: "pointer",
};
