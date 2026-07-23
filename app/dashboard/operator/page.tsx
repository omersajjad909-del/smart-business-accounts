"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";
import type { OperatorAction, OperatorDecision, OperatorPayload } from "@/lib/businessOperator";
import type { AnomalyAlert } from "@/lib/finovaAI";
import { useResponsive } from "@/hooks/useResponsive";

/* ── Design tokens ──────────────────────────────────────────────────────── */
const T = {
  bg:      "#070a1c",
  panel:   "rgba(10,13,36,.96)",
  glass:   "rgba(255,255,255,.028)",
  border:  "rgba(255,255,255,.075)",
  borderM: "rgba(255,255,255,.13)",
  text:    "rgba(255,255,255,.96)",
  muted:   "rgba(200,210,240,.72)",
  dim:     "rgba(148,163,184,.58)",
  indigo:  "#6366f1",
  violet:  "#818cf8",
  cyan:    "#22d3ee",
  emerald: "#10b981",
  amber:   "#f59e0b",
  red:     "#ef4444",
};

const PRIO = {
  urgent: { bar:"#ef4444", bg:"rgba(239,68,68,.1)",  border:"rgba(239,68,68,.3)",  text:"#fca5a5", dot:"#ef4444" },
  high:   { bar:"#f59e0b", bg:"rgba(245,158,11,.1)", border:"rgba(245,158,11,.3)", text:"#fde68a", dot:"#f59e0b" },
  medium: { bar:"#6366f1", bg:"rgba(99,102,241,.1)", border:"rgba(99,102,241,.3)", text:"#a5b4fc", dot:"#6366f1" },
  low:    { bar:"#10b981", bg:"rgba(16,185,129,.1)", border:"rgba(16,185,129,.3)", text:"#6ee7b7", dot:"#10b981" },
};

function pr(key: string) { return PRIO[key as keyof typeof PRIO] ?? PRIO.low; }
function money(v: number, currency: string) { return `${currency} ${Math.round(v||0).toLocaleString("en-PK")}`; }
function sevPrio(s: string) { return s==="critical"?"urgent":s==="warning"?"high":"medium"; }

/* ── SVG Icons ──────────────────────────────────────────────────────────── */
const Ico = {
  cash:(
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  ),
  box:(
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  check:(
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  trend:(
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  refresh:(
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-.02-8.36L23 10"/>
    </svg>
  ),
  alert:(
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  info:(
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  link:(
    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
};

/* ── Health Score Arc ───────────────────────────────────────────────────── */
function HealthArc({ score }: { score: number }) {
  const R = 50;
  const circ = 2 * Math.PI * R;
  const arcFrac = 0.75;
  const arcLen = circ * arcFrac;
  const fillLen = Math.min(Math.max(score / 100, 0), 1) * arcLen;
  const color = score >= 70 ? T.emerald : score >= 45 ? T.amber : T.red;
  const label = score >= 70 ? "Healthy" : score >= 45 ? "Watch" : "Critical";

  return (
    <div style={{ textAlign: "center" }}>
      <svg width="130" height="100" viewBox="0 0 130 100" overflow="visible">
        <defs>
          <filter id="op-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle cx="65" cy="72" r={R} fill="none"
          stroke="rgba(255,255,255,.07)" strokeWidth="9"
          strokeDasharray={`${arcLen} ${circ - arcLen}`}
          strokeLinecap="round" transform="rotate(135 65 72)"
        />
        {/* Fill */}
        <circle cx="65" cy="72" r={R} fill="none"
          stroke={color} strokeWidth="9"
          strokeDasharray={`${fillLen} ${circ - fillLen}`}
          strokeLinecap="round" transform="rotate(135 65 72)"
          filter="url(#op-glow)"
        />
        <text x="65" y="74" textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize="28" fontWeight="900" fontFamily="Outfit,sans-serif">
          {score}
        </text>
        <text x="65" y="92" textAnchor="middle"
          fill="rgba(148,163,184,.6)" fontSize="11" fontFamily="Outfit,sans-serif">
          / 100
        </text>
      </svg>
      <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: ".06em", marginTop: -4 }}>{label}</div>
    </div>
  );
}

/* ── Stat Card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, note, accent, icon }: { label: string; value: string; note: string; accent: string; icon: React.ReactNode }) {
  return (
    <div style={{
      position: "relative", overflow: "hidden",
      background: T.panel, borderRadius: 20,
      border: `1px solid ${T.border}`,
      borderTop: `3px solid ${accent}`,
      padding: isMobile ? "12px 10px" : "20px 22px",
      boxShadow: "0 8px 28px rgba(0,0,0,.2)",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 80, background: `radial-gradient(ellipse at top, ${accent}14, transparent 75%)`, pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ fontSize: 10.5, color: T.dim, textTransform: "uppercase", letterSpacing: ".13em", fontWeight: 700 }}>{label}</div>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `${accent}18`, border: `1px solid ${accent}26`, display: "flex", alignItems: "center", justifyContent: "center", color: accent, flexShrink: 0 }}>{icon}</div>
        </div>
        <div style={{ marginTop: 14, fontSize: 26, fontWeight: 900, letterSpacing: "-.04em", color: T.text }}>{value}</div>
        <div style={{ marginTop: 8, fontSize: 12.5, color: T.muted, lineHeight: 1.55 }}>{note}</div>
      </div>
    </div>
  );
}

/* ── Section Header ─────────────────────────────────────────────────────── */
function SectionHead({ eyebrow, title, count, note }: { eyebrow: string; title: string; count?: number; note?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
        <span style={{ fontSize: 10.5, color: T.violet, textTransform: "uppercase", letterSpacing: ".16em", fontWeight: 800 }}>{eyebrow}</span>
        {count !== undefined && (
          <span style={{ padding: "1px 8px", borderRadius: 99, background: "rgba(99,102,241,.14)", border: "1px solid rgba(99,102,241,.24)", fontSize: 11, fontWeight: 800, color: T.violet }}>{count}</span>
        )}
      </div>
      <div style={{ fontSize: 19, fontWeight: 800, color: T.text, letterSpacing: "-.025em" }}>{title}</div>
      {note && <div style={{ marginTop: 5, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>{note}</div>}
    </div>
  );
}

/* ── Decision Card ──────────────────────────────────────────────────────── */
function DecisionCard({ decision, queueingId, onQueue }: {
  decision: OperatorDecision; queueingId: string | null; onQueue: (d: OperatorDecision) => void;
}) {
  const tone = pr(decision.priority);
  const busy = queueingId === decision.id;

  return (
    <div style={{
      position: "relative", overflow: "hidden",
      background: T.glass, border: `1px solid ${T.border}`,
      borderLeft: `3px solid ${tone.bar}`,
      borderRadius: 18, padding: isMobile ? "12px 10px" : "18px 20px",
    }}>
      <div style={{ position: "absolute", top: -40, right: -20, width: 130, height: 130, background: `radial-gradient(circle, ${tone.bar}14, transparent 65%)`, pointerEvents: "none" }} />
      <div style={{ position: "relative", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 230 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 10px", borderRadius: 99,
              background: tone.bg, border: `1px solid ${tone.border}`,
              color: tone.text, fontSize: 10.5, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: ".1em",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: tone.dot, flexShrink: 0 }} />
              {decision.priority}
            </span>
            <span style={{ fontSize: 11, color: T.dim }}>Impact: {decision.impact}</span>
            <span style={{ fontSize: 11, color: T.dim }}>· {decision.category}</span>
          </div>
          <div style={{ marginTop: 11, fontSize: 17, fontWeight: 800, color: T.text, letterSpacing: "-.02em", lineHeight: 1.35 }}>{decision.title}</div>
          <div style={{ marginTop: 7, fontSize: 13.5, color: T.muted, lineHeight: 1.72 }}>{decision.reason}</div>
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 12, background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.14)" }}>
            <div style={{ fontSize: 9.5, color: T.dim, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 700, marginBottom: 5 }}>Recommended Next Action</div>
            <div style={{ fontSize: 13.5, color: T.text, lineHeight: 1.65 }}>{decision.action}</div>
          </div>
          <div style={{ marginTop: 9, fontSize: 11, color: T.dim }}>Source: {decision.source}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 128, flexShrink: 0, alignSelf: "flex-start" }}>
          {decision.href && (
            <Link prefetch={false} href={decision.href} style={{
              textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 14px", borderRadius: 12,
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              color: "white", fontWeight: 700, fontSize: 13,
              boxShadow: "0 6px 18px rgba(99,102,241,.35)",
            }}>
              Open {Ico.link}
            </Link>
          )}
          <button onClick={() => onQueue(decision)} disabled={busy} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "10px 14px", borderRadius: 12, fontSize: 13,
            background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.62)",
            border: `1px solid ${T.borderM}`, cursor: busy ? "wait" : "pointer",
            fontWeight: 600, fontFamily: "inherit",
            opacity: busy ? 0.6 : 1,
          }}>
            {busy ? "Queueing…" : "Queue"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Problem Card ───────────────────────────────────────────────────────── */
function ProblemCard({ problem }: { problem: AnomalyAlert }) {
  const tone = pr(sevPrio(problem.severity));
  const icon = problem.severity === "info" ? Ico.info : Ico.alert;

  return (
    <div style={{
      borderRadius: 14, padding: "13px 15px",
      background: tone.bg, border: `1px solid ${tone.border}`,
      borderLeft: `3px solid ${tone.bar}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ color: tone.dot, flexShrink: 0 }}>{icon}</span>
        <div style={{ fontSize: 13, fontWeight: 800, color: tone.text, lineHeight: 1.3 }}>{problem.title}</div>
      </div>
      <div style={{ marginTop: 6, fontSize: 12.5, color: "rgba(255,255,255,.76)", lineHeight: 1.65 }}>{problem.description}</div>
      {problem.action && <div style={{ marginTop: 6, fontSize: 12, color: T.dim, fontStyle: "italic" }}>→ {problem.action}</div>}
      {problem.link && (
        <Link prefetch={false} href={problem.link} style={{ display: "inline-block", marginTop: 6, fontSize: 11.5, color: T.violet, textDecoration: "none", fontWeight: 700 }}>
          View details →
        </Link>
      )}
    </div>
  );
}

/* ── Playbook Card ──────────────────────────────────────────────────────── */
function PlaybookCard({ playbook }: { playbook: { title: string; summary: string; steps: { label: string; description: string; href?: string }[] } }) {
  return (
    <div style={{ borderRadius: 18, padding: isMobile ? "12px 10px" : "18px 20px", background: T.glass, border: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{playbook.title}</div>
      <div style={{ marginTop: 5, fontSize: 12.5, color: T.muted, lineHeight: 1.6 }}>{playbook.summary}</div>
      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {playbook.steps.map((step, i) => (
          <div key={step.label} style={{ display: "grid", gridTemplateColumns: "26px 1fr", gap: 12, alignItems: "start" }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
              background: "rgba(99,102,241,.14)", border: "1px solid rgba(99,102,241,.26)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: T.violet, fontSize: 11, fontWeight: 800, flexShrink: 0,
            }}>{i + 1}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{step.label}</div>
              <div style={{ marginTop: 3, fontSize: 12, color: T.muted, lineHeight: 1.62 }}>{step.description}</div>
              {step.href && (
                <Link prefetch={false} href={step.href} style={{ display: "inline-block", marginTop: 5, fontSize: 11, color: T.violet, textDecoration: "none", fontWeight: 700 }}>
                  Open →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Action Card ────────────────────────────────────────────────────────── */
function ActionCard({ action, queueingId, buttonLabel, onQueue }: {
  action: OperatorAction; queueingId: string | null; buttonLabel: string; onQueue: (a: OperatorAction) => void;
}) {
  const tone = pr(action.priority);
  const watchOnly = action.state === "watch";
  const busy = queueingId === action.id;

  return (
    <div style={{
      background: T.glass, border: `1px solid ${T.border}`,
      borderLeft: `3px solid ${tone.bar}`,
      borderRadius: 16, padding: isMobile ? "12px 10px" : "16px 18px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ padding: "2px 9px", borderRadius: 99, background: tone.bg, border: `1px solid ${tone.border}`, color: tone.text, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em" }}>{action.priority}</span>
        <span style={{ fontSize: 10.5, color: T.dim, background: "rgba(255,255,255,.045)", border: `1px solid ${T.border}`, padding: "2px 9px", borderRadius: 99 }}>{action.automationLevel}</span>
      </div>
      <div style={{ marginTop: 9, fontSize: 15, fontWeight: 800, color: T.text }}>{action.title}</div>
      <div style={{ marginTop: 5, fontSize: 12.5, color: T.muted, lineHeight: 1.65 }}>{action.description}</div>
      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {action.href && (
          <Link prefetch={false} href={action.href} style={{
            textDecoration: "none", padding: "8px 14px", borderRadius: 10,
            background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.22)",
            color: T.violet, fontWeight: 700, fontSize: 12.5, display: "flex", alignItems: "center", gap: 5,
          }}>
            {action.actionLabel} {Ico.link}
          </Link>
        )}
        <button onClick={() => onQueue(action)} disabled={busy || watchOnly} style={{
          padding: "8px 14px", borderRadius: 10, fontSize: 12.5,
          background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.58)",
          border: `1px solid ${T.borderM}`, fontFamily: "inherit",
          cursor: watchOnly || busy ? "not-allowed" : "pointer", fontWeight: 600,
          opacity: watchOnly ? 0.38 : busy ? 0.6 : 1,
        }}>
          {busy ? "Queueing…" : buttonLabel}
        </button>
      </div>
    </div>
  );
}

/* ── Skeleton Loader ────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div style={{ padding: 24, minHeight: "100vh", color: "white", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <style>{`@keyframes sk{0%,100%{opacity:.35}50%{opacity:.7}} .sk{background:rgba(255,255,255,.07);border-radius:12px;animation:sk 1.7s ease infinite}`}</style>
      <div className="sk" style={{ height: 190, borderRadius: 24, marginBottom: 18 }} />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
        {[0,1,2,3].map(i => <div key={i} className="sk" style={{ height: 120, borderRadius: 20 }} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <div className="sk" style={{ height: 420, borderRadius: 24 }} />
        <div style={{ display: "grid", gap: 18 }}>
          <div className="sk" style={{ height: 200, borderRadius: 24 }} />
          <div className="sk" style={{ height: 210, borderRadius: 24 }} />
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────────── */
export default function BusinessOperatorPage() {
  const { isMobile } = useResponsive();
  const [data,       setData]       = useState<OperatorPayload | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queueingId, setQueueingId] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    const user      = getCurrentUser() as any;
    const companyId = user?.companyId || user?.user?.companyId;
    const userId    = user?.id        || user?.user?.id;
    const role      = user?.role      || user?.user?.role || "USER";
    if (!companyId) { setLoading(false); return; }

    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch("/api/ai/operator", {
        headers: { "x-company-id": companyId, "x-user-id": userId || "", "x-user-role": role },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load");
      setData(json);
      if (isRefresh) toast.success("Operator data refreshed");
    } catch (err: any) {
      toast.error(err?.message || "Unable to load Business Operator");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function queueAction(action: OperatorAction | OperatorDecision) {
    const user      = getCurrentUser() as any;
    const companyId = user?.companyId || user?.user?.companyId;
    const userId    = user?.id        || user?.user?.id;
    const role      = user?.role      || user?.user?.role || "USER";
    if (!companyId) { toast.error("Company session not found."); return; }

    try {
      setQueueingId(action.id);
      const res = await fetch("/api/ai/operator", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-company-id": companyId, "x-user-id": userId || "", "x-user-role": role },
        body: JSON.stringify({
          actionId: action.id,
          title: action.title,
          description: "Review this item from the operator queue.",
          href: "href" in action ? action.href : "/dashboard/operator",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to queue");
      toast.success(json?.message || "Action queued");
    } catch (err: any) {
      toast.error(err?.message || "Unable to queue action");
    } finally {
      setQueueingId(null);
    }
  }

  if (loading) return <Skeleton />;

  if (!data) {
    return (
      <div style={{ padding: 24, minHeight: "100vh", color: "white", fontFamily: "'Outfit','Inter',sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Operator Unavailable</div>
          <div style={{ marginTop: 8, fontSize: 14, color: T.muted }}>Could not load your operator workspace. This usually resolves within a minute.</div>
          <button onClick={() => loadData()} style={{ marginTop: 20, padding: "10px 24px", borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", fontWeight: 700, border: "none", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const healthColor = data.overview.healthScore >= 70 ? T.emerald : data.overview.healthScore >= 45 ? T.amber : T.red;

  return (
    <div style={{ minHeight: "100vh", padding: isMobile ? "12px" : "24px", color: "white", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        @keyframes live-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
        @keyframes spin-ccw   { to{transform:rotate(-360deg)} }
        .op-spin { animation: spin-ccw .8s linear infinite; }
        .op-grid-4   { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px }
        .op-main     { display:grid; grid-template-columns:minmax(0,1.42fr) minmax(300px,.95fr); gap:18px; align-items:start }
        .op-bottom   { display:grid; grid-template-columns:1fr 1fr; gap:18px }
        .op-shell    {
          background: linear-gradient(180deg,rgba(255,255,255,.032),rgba(255,255,255,.012)), rgba(10,13,36,.96);
          border: 1px solid rgba(255,255,255,.075);
          border-radius: 24px;
          box-shadow: 0 20px 55px rgba(0,0,0,.28);
        }
        .op-btn:hover { background:rgba(99,102,241,.18) !important; border-color:rgba(99,102,241,.4) !important; }
        @media (max-width:1200px) {
          .op-grid-4 { grid-template-columns:repeat(2,minmax(0,1fr)) }
          .op-main,.op-bottom { grid-template-columns:1fr }
        }
        @media (max-width:640px) {
          .op-grid-4 { grid-template-columns:1fr }
        }
      `}</style>

      {/* ── Hero ── */}
      <div style={{
        position: "relative", overflow: "hidden",
        borderRadius: 24, marginBottom: 18,
        background: "linear-gradient(135deg, rgba(12,16,44,.98) 0%, rgba(8,10,28,.96) 58%)",
        border: `1px solid ${T.border}`,
        boxShadow: "0 24px 64px rgba(0,0,0,.35)",
      }}>
        {/* Grid texture */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(99,102,241,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.04) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "linear-gradient(180deg, rgba(255,255,255,.5), transparent)",
          pointerEvents: "none",
        }} />
        {/* Top-right glow */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, background: "radial-gradient(circle, rgba(99,102,241,.18), transparent 65%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "stretch", gap: 24, flexWrap: "wrap", padding: 28 }}>
          {/* Left */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 99, background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.22)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.indigo, boxShadow: "0 0 10px rgba(99,102,241,.8)", animation: "live-pulse 2s ease infinite" }} />
                <span style={{ fontSize: 11, color: "#bfdbfe", textTransform: "uppercase", letterSpacing: ".16em", fontWeight: 800 }}>Business Operator</span>
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 99, background: "rgba(52,211,153,.09)", border: "1px solid rgba(52,211,153,.2)", fontSize: 11, fontWeight: 700, color: "#6ee7b7" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.emerald, animation: "live-pulse 2s ease infinite .5s" }} />
                LIVE
              </div>
            </div>
            <div style={{ marginTop: 18, fontSize: "clamp(28px,3.5vw,50px)", lineHeight: 1.04, fontWeight: 900, letterSpacing: "-.05em", maxWidth: 760 }}>
              Today&apos;s decisions<br />
              <span style={{ color: T.violet }}>for {data.company.name}</span>
            </div>
            <div style={{ marginTop: 14, maxWidth: 700, fontSize: 14.5, lineHeight: 1.8, color: T.muted }}>
              A live operating layer for your {data.company.businessLabel.toLowerCase()} business. It watches cash, inventory, pending documents, and active workflows, then turns them into ranked actions instead of passive dashboards.
            </div>

            {/* Meta tags */}
            <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 10 }}>
              {[
                { label: "Business", value: data.company.businessLabel },
                { label: "Plan",     value: data.company.plan },
              ].map(m => (
                <div key={m.label} style={{ padding: "8px 14px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: `1px solid ${T.border}`, fontSize: 13, color: T.muted }}>
                  {m.label}: <strong style={{ color: T.text }}>{m.value}</strong>
                </div>
              ))}
              <div style={{ padding: "8px 14px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: `1px solid ${T.border}`, fontSize: 13, color: T.muted }}>
                Updated: <strong style={{ color: T.text }}>{new Date(data.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
              </div>
              <button onClick={() => loadData(true)} disabled={refreshing} style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "8px 14px", borderRadius: 12, fontSize: 13,
                background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.25)",
                color: T.violet, fontWeight: 700, cursor: refreshing ? "wait" : "pointer", fontFamily: "inherit",
              }}>
                <span className={refreshing ? "op-spin" : ""}>{Ico.refresh}</span>
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>

          {/* Right: Health card */}
          <div style={{
            width: 310, maxWidth: "100%", borderRadius: 20,
            background: "rgba(255,255,255,.04)", border: `1px solid ${T.border}`,
            padding: isMobile ? "12px 11px" : "22px 24px",
            display: "flex", flexDirection: "column", gap: 0,
          }}>
            <div style={{ fontSize: 11, color: T.dim, textTransform: "uppercase", letterSpacing: ".15em", fontWeight: 700, marginBottom: 16 }}>Operator Health</div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
              <HealthArc score={data.overview.healthScore} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.65 }}>
                  Revenue <strong style={{ color: data.overview.revenueChange >= 0 ? T.emerald : T.red }}>
                    {data.overview.revenueChange >= 0 ? "+" : ""}{data.overview.revenueChange}%
                  </strong> vs last month
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: T.muted }}>
                  <strong style={{ color: T.red }}>{money(data.overview.overdueReceivables, data.company.currency)}</strong> overdue
                </div>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, display: "grid", gap: 11 }}>
              {[
                { label: "Cash Position",     value: money(data.overview.cashPosition, data.company.currency), warn: data.overview.cashPosition < 0 },
                { label: "Pending GRN Bills", value: String(data.overview.goodsReceivedPendingInvoice), warn: data.overview.goodsReceivedPendingInvoice > 0 },
                { label: "Low Stock Items",   value: String(data.overview.lowStockItems), warn: data.overview.lowStockItems > 0 },
                { label: "Open PO Queue",     value: String(data.overview.openPurchaseOrders), warn: false },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12.5, color: T.dim }}>{r.label}</span>
                  <strong style={{ fontSize: 13, color: r.warn ? T.amber : T.text }}>{r.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 Stat Cards ── */}
      <div className="op-grid-4" style={{ marginBottom: 18 }}>
        <StatCard label="Cash Position"    value={money(data.overview.cashPosition, data.company.currency)} note={`${money(data.overview.overdueReceivables, data.company.currency)} overdue receivables need attention`} accent={T.indigo}  icon={Ico.cash}  />
        <StatCard label="Inventory Pressure" value={String(data.overview.lowStockItems)} note={`${data.overview.goodsReceivedPendingInvoice} GRN receipt(s) waiting for supplier invoice`} accent={T.cyan}    icon={Ico.box}   />
        <StatCard label="Operational Queue" value={String(data.overview.openBusinessRecords)} note={`${data.overview.openPurchaseOrders} active purchase orders still in flow`} accent={T.amber}   icon={Ico.check} />
        <StatCard label="Month Momentum"   value={`${data.overview.revenueChange >= 0 ? "+" : ""}${data.overview.revenueChange}%`} note={`Profit ${data.overview.profitChange >= 0 ? "+" : ""}${data.overview.profitChange}% vs last month`} accent={T.emerald} icon={Ico.trend}  />
      </div>

      {/* ── Main Grid ── */}
      <div className="op-main" style={{ marginBottom: 18 }}>
        {/* Left: Decisions */}
        <section className="op-shell" style={{ padding: 22 }}>
          <SectionHead eyebrow="Execution Queue" title="Today's Decisions" count={data.todaysDecisions.length} note="Ranked by urgency and business impact. Act on these before end of day." />
          <div style={{ display: "grid", gap: 14 }}>
            {data.todaysDecisions.map(d => (
              <DecisionCard key={d.id} decision={d} queueingId={queueingId} onQueue={queueAction} />
            ))}
            {data.todaysDecisions.length === 0 && (
              <div style={{ textAlign: "center", padding: isMobile ? "22px 10px" : "40px 20px", color: T.dim, fontSize: 14 }}>
                No urgent decisions today. Your business is running smoothly! ✓
              </div>
            )}
          </div>
        </section>

        {/* Right column */}
        <div style={{ display: "grid", gap: 18 }}>
          {/* Detected Problems */}
          <section className="op-shell" style={{ padding: 22 }}>
            <SectionHead eyebrow="Live Watch" title="Detected Problems" count={data.detectedProblems.length} note="Real-time signals pulled from your actual business data." />
            <div style={{ display: "grid", gap: 10 }}>
              {data.detectedProblems.slice(0, 6).map((prob, i) => (
                <ProblemCard key={`${prob.title}-${i}`} problem={prob} />
              ))}
              {data.detectedProblems.length === 0 && (
                <div style={{ textAlign: "center", padding: isMobile ? "17px 10px" : "30px 16px", color: T.dim, fontSize: 13 }}>
                  No anomalies detected. Everything looks normal. ✓
                </div>
              )}
            </div>
          </section>

          {/* Playbook */}
          <section className="op-shell" style={{ padding: 22 }}>
            <SectionHead eyebrow="Business Rhythm" title="Operator Playbook" note={`Your practical operating routine for ${data.company.businessLabel.toLowerCase()}.`} />
            <div style={{ display: "grid", gap: 14 }}>
              {data.playbook.map(pb => <PlaybookCard key={pb.title} playbook={pb} />)}
            </div>
          </section>
        </div>
      </div>

      {/* ── Bottom Grid ── */}
      <div className="op-bottom">
        <section className="op-shell" style={{ padding: 22 }}>
          <SectionHead eyebrow="Action Layer" title="Recommended Actions" count={data.recommendedActions.length} note="Review, open, or queue these right away." />
          <div style={{ display: "grid", gap: 12 }}>
            {data.recommendedActions.map(a => (
              <ActionCard key={a.id} action={a} queueingId={queueingId} buttonLabel="Queue Action" onQueue={queueAction} />
            ))}
          </div>
        </section>

        <section className="op-shell" style={{ padding: 22 }}>
          <SectionHead eyebrow="Automation Layer" title="Auto-Run Suggestions" count={data.autoRunSuggestions.length} note="Safe flows that can become your daily operating assistant." />
          <div style={{ display: "grid", gap: 12 }}>
            {data.autoRunSuggestions.map(a => (
              <ActionCard key={a.id} action={a} queueingId={queueingId} buttonLabel="Enable Flow" onQueue={queueAction} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
