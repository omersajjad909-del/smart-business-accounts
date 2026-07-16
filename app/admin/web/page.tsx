"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Metrics  = { logins24h: number; users30d: number; companies7d: number };
type Finance  = { mrr: number; arr: number; active: { starter: number; pro: number; enterprise: number } };
type Visitors = { stats: { totalVisits: number; uniqueVisitors: number; countries: number; deviceBreakdown: { mobile: number; desktop: number; tablet: number }; topPages: { page: string; visits: number }[] } };

function fmt(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000)    return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

const QUICK_LINKS = [
  { href: "/admin/web/users",     icon: "👥", label: "Website Users",    desc: "Active sessions & logins" },
  { href: "/admin/geo",           icon: "🗺️", label: "Geo Analytics",    desc: "World map of visitors" },
  { href: "/admin/funnel",        icon: "📊", label: "Funnel Analysis",  desc: "Visitor → Signup → Paid" },
  { href: "/admin/signup-analytics", icon: "📈", label: "Signups",       desc: "New user breakdown" },
  { href: "/admin/revenue",       icon: "💰", label: "Revenue",          desc: "MRR / ARR charts" },
  { href: "/admin/audit-trail",   icon: "📋", label: "Audit Trail",      desc: "All admin actions" },
  { href: "/admin/social",        icon: "📣", label: "Social Media",     desc: "Posts & scheduling" },
  { href: "/admin/plans",         icon: "⚡", label: "Plans & Features", desc: "Starter / Pro / Enterprise" },
];

export default function WebMetricsPage() {
  const [metrics,  setMetrics]  = useState<Metrics | null>(null);
  const [finance,  setFinance]  = useState<Finance | null>(null);
  const [visitors, setVisitors] = useState<Visitors["stats"] | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    const h: Record<string, string> = {};
    if (u?.role)      h["x-user-role"]    = u.role;
    if (u?.id)        h["x-user-id"]      = u.id;
    if (u?.companyId) h["x-company-id"]   = u.companyId;
    const opts = { cache: "no-store" as const, headers: h, credentials: "include" as const };

    fetch("/api/admin/web/metrics",   opts).then(r => r.ok ? r.json() : null).then(d => d && setMetrics(d));
    fetch("/api/admin/web/finance",   opts).then(r => r.ok ? r.json() : null).then(d => d && setFinance(d));
    fetch("/api/admin/visitors?range=7d", opts).then(r => r.ok ? r.json() : null).then(d => d?.stats && setVisitors(d.stats));
  }, []);

  const activePaid = finance ? finance.active.pro + finance.active.enterprise : null;

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 80px" }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, letterSpacing: "-.02em" }}>Web Metrics</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
          Live overview of traffic, signups, and revenue across finovaos.app
        </p>
      </div>

      {/* ── Traffic KPIs ── */}
      <div style={sectionLabel}>Website Traffic — 7 days</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 28 }}>
        <KpiCard label="Total Visits"      val={visitors?.totalVisits ?? null}   color="#818cf8" icon="👁️" />
        <KpiCard label="Unique Visitors"   val={visitors?.uniqueVisitors ?? null} color="#34d399" icon="🧑" />
        <KpiCard label="Countries Reached" val={visitors?.countries ?? null}      color="#38bdf8" icon="🌍" />
      </div>

      {/* ── Business KPIs ── */}
      <div style={sectionLabel}>User Activity</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 28 }}>
        <KpiCard label="Logins (24h)"      val={metrics?.logins24h ?? null}    color="#fbbf24" icon="🔐" />
        <KpiCard label="Active Users (30d)" val={metrics?.users30d ?? null}    color="#a78bfa" icon="⚡" />
        <KpiCard label="New Companies (7d)" val={metrics?.companies7d ?? null} color="#f472b6" icon="🏢" />
      </div>

      {/* ── Revenue KPIs ── */}
      <div style={sectionLabel}>Revenue</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 32 }}>
        <KpiCard label="MRR (est.)"          val={finance?.mrr ?? null}    color="#34d399" icon="💵" isCurrency />
        <KpiCard label="ARR (est.)"          val={finance?.arr ?? null}    color="#fbbf24" icon="📈" isCurrency />
        <KpiCard label="Active Paid"         val={activePaid}              color="#f87171" icon="💳" />
      </div>

      {/* ── Bottom 2-col ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>

        {/* Quick Links */}
        <div style={card}>
          <div style={cardHead}>Quick Navigation</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {QUICK_LINKS.map(l => (
              <a key={l.href} href={l.href} className="wm-link" style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "13px 14px", borderRadius: 12,
                background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)",
                textDecoration: "none", transition: "background .15s",
              }}>
                <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{l.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.9)" }}>{l.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{l.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Device Breakdown */}
          <div style={card}>
            <div style={cardHead}>Device Breakdown (7d)</div>
            {visitors ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Desktop", val: visitors.deviceBreakdown.desktop, color: "#818cf8", icon: "🖥️" },
                  { label: "Mobile",  val: visitors.deviceBreakdown.mobile,  color: "#34d399", icon: "📱" },
                  { label: "Tablet",  val: visitors.deviceBreakdown.tablet,  color: "#fbbf24", icon: "📟" },
                ].map(d => (
                  <div key={d.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                      <span style={{ color: "rgba(255,255,255,.7)", fontWeight: 600 }}>{d.icon} {d.label}</span>
                      <span style={{ color: d.color, fontWeight: 800 }}>{d.val}%</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,.06)" }}>
                      <div style={{ width: `${d.val}%`, height: "100%", borderRadius: 99, background: d.color, transition: "width .6s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "rgba(255,255,255,.25)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Loading…</div>
            )}
          </div>

          {/* Top Pages */}
          <div style={card}>
            <div style={cardHead}>Top Pages (7d)</div>
            {visitors?.topPages && visitors.topPages.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {visitors.topPages.slice(0, 6).map((p, i) => (
                  <div key={p.page} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,.2)", width: 14, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1, fontSize: 11, color: "rgba(255,255,255,.6)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.page}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", flexShrink: 0 }}>{p.visits}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "rgba(255,255,255,.25)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
                {visitors ? "No data yet" : "Loading…"}
              </div>
            )}
          </div>

          {/* Plan Split */}
          {finance && (
            <div style={card}>
              <div style={cardHead}>Plan Distribution</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "Starter",    val: finance.active.starter,    color: "#64748b" },
                  { label: "Pro",        val: finance.active.pro,        color: "#6366f1" },
                  { label: "Enterprise", val: finance.active.enterprise,  color: "#38bdf8" },
                ].map(p => {
                  const total = finance.active.starter + finance.active.pro + finance.active.enterprise || 1;
                  const pct = Math.round((p.val / total) * 100);
                  return (
                    <div key={p.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                        <span style={{ color: "rgba(255,255,255,.7)", fontWeight: 600 }}>{p.label}</span>
                        <span style={{ color: "rgba(255,255,255,.4)" }}>{p.val} <span style={{ color: p.color, fontWeight: 700 }}>({pct}%)</span></span>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,.06)" }}>
                        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: p.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, val, color, icon, isCurrency }: {
  label: string; val: number | null; color: string; icon: string; isCurrency?: boolean;
}) {
  const display = val === null ? "—" : isCurrency ? fmt(val) : val.toLocaleString();
  return (
    <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>
        {val === null ? <span style={{ fontSize: 20, color: "rgba(255,255,255,.15)" }}>—</span> : display}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.38)", marginTop: 6, letterSpacing: ".03em" }}>{label.toUpperCase()}</div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "linear-gradient(160deg,rgba(19,27,50,.98),rgba(15,22,42,.98))",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 20,
  padding: "20px 22px",
};

const cardHead: React.CSSProperties = {
  fontSize: 14, fontWeight: 800, color: "#f8fafc",
  marginBottom: 16, paddingBottom: 12,
  borderBottom: "1px solid rgba(255,255,255,.06)",
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: ".1em",
  color: "rgba(255,255,255,.3)", marginBottom: 10, textTransform: "uppercase",
};

const css = `
  .wm-link:hover { background: rgba(255,255,255,.06) !important; border-color: rgba(255,255,255,.12) !important; }
`;
