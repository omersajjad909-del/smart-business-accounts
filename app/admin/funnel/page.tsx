"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type FunnelStep = { step: string; count: number; recent: number; color: string; icon: string };
type RefSource  = { source: string; signups: number; paid: number };
type TrendMonth = { month: string; signups: number; active: number; paid: number };

type FunnelData = {
  period: { days: number; since: string };
  funnel: FunnelStep[];
  conversions: {
    visitorToSignup: number;
    signupToActive: number;
    activeToPaid: number;
    overallConversion: number;
  };
  planDistribution: { plan: string; count: number }[];
  referralSources: RefSource[];
  trend: TrendMonth[];
  summary: { totalRevenue: number; cancelled: number; churnRate: number };
};

const PLAN_COLORS: Record<string, string> = {
  STARTER:    "#64748b",
  PRO:        "#6366f1",
  ENTERPRISE: "#38bdf8",
};

export default function AdminFunnelPage() {
  const [data, setData]   = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays]   = useState(30);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const u = getCurrentUser();
    const headers: Record<string, string> = {};
    if (u?.role) headers["x-user-role"] = u.role;
    if (u?.id)   headers["x-user-id"]   = u.id;

    fetch(`/api/admin/funnel?days=${days}`, { headers, credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (alive) setData(d); })
      .catch(() => { if (alive) setData(null); })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [days]);

  const maxCount = data ? Math.max(...data.funnel.map(s => s.count), 1) : 1;

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 80px" }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Funnel Analysis</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
            Visitor → Signup → Subscription → Payment — full journey conversion.
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[7, 30, 60, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} style={{
              padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: days === d ? "rgba(99,102,241,.25)" : "rgba(255,255,255,.05)",
              border: days === d ? "1px solid #6366f1" : "1px solid rgba(255,255,255,.1)",
              color: days === d ? "#818cf8" : "rgba(255,255,255,.4)",
            }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 80, textAlign: "center", color: "rgba(255,255,255,.3)" }}>Loading funnel data…</div>
      ) : !data ? (
        <div style={{ padding: 80, textAlign: "center", color: "rgba(255,255,255,.3)" }}>Failed to load</div>
      ) : (
        <>
          {/* ── Summary KPIs ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 28 }}>
            {[
              { label: "Overall Conversion", val: `${data.conversions.overallConversion}%`, color: "#fbbf24", sub: "Visitor → Paid" },
              { label: "Total Revenue",       val: `$${data.summary.totalRevenue.toLocaleString()}`, color: "#34d399", sub: "All time payments" },
              { label: "Churn Rate",          val: `${data.summary.churnRate}%`, color: "#f87171", sub: `${data.summary.cancelled} cancelled` },
              { label: "Period",              val: `${days} days`, color: "#818cf8", sub: `Since ${new Date(data.period.since).toLocaleDateString("en-GB")}` },
            ].map(k => (
              <div key={k.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "18px 20px" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.val}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.55)", marginTop: 5 }}>{k.label}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", marginTop: 2 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Visual Funnel ── */}
          <div style={card}>
            <div style={cardHead}>Conversion Funnel — All Time</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {data.funnel.map((step, i) => {
                const widthPct = (step.count / maxCount) * 100;
                const prevCount = i > 0 ? data.funnel[i - 1].count : step.count;
                const dropOff   = i > 0 && prevCount > 0
                  ? Math.round((1 - step.count / prevCount) * 100)
                  : null;
                const convRate  = i > 0 && prevCount > 0
                  ? Math.round((step.count / prevCount) * 1000) / 10
                  : null;

                return (
                  <div key={step.step}>
                    {/* Drop-off arrow */}
                    {i > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0 6px 16px" }}>
                        <div style={{ fontSize: 16, color: "rgba(255,255,255,.15)" }}>▼</div>
                        <div style={{ fontSize: 12, color: "#f87171", fontWeight: 700 }}>
                          {dropOff}% dropped
                        </div>
                        <div style={{ fontSize: 12, color: "#34d399", fontWeight: 700 }}>
                          {convRate}% converted
                        </div>
                      </div>
                    )}

                    {/* Step bar */}
                    <div style={{ padding: "10px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 18 }}>{step.icon}</span>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{step.step}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 20, fontWeight: 800, color: step.color }}>{step.count.toLocaleString()}</span>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginLeft: 6 }}>total</span>
                        </div>
                      </div>
                      <div style={{ height: 36, borderRadius: 8, background: "rgba(255,255,255,.05)", overflow: "hidden", position: "relative" }}>
                        <div style={{
                          width: `${widthPct}%`,
                          height: "100%",
                          background: `linear-gradient(90deg, ${step.color}55, ${step.color}99)`,
                          borderRadius: 8,
                          transition: "width .6s ease",
                          position: "relative",
                        }}>
                          <div style={{
                            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                            fontSize: 12, fontWeight: 800, color: "white",
                            opacity: widthPct > 15 ? 1 : 0,
                          }}>
                            {Math.round(widthPct)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Conversion rate summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,.06)" }}>
              {[
                { label: "Visitor → Signup",       val: data.conversions.visitorToSignup  },
                { label: "Signup → Active",         val: data.conversions.signupToActive   },
                { label: "Active → Paid",           val: data.conversions.activeToPaid     },
              ].map(c => (
                <div key={c.label} style={{ textAlign: "center", padding: "12px 8px", background: "rgba(255,255,255,.03)", borderRadius: 10 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: c.val >= 50 ? "#34d399" : c.val >= 20 ? "#fbbf24" : "#f87171" }}>
                    {c.val}%
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 4, fontWeight: 600 }}>{c.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Bottom Grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>

            {/* Monthly Trend */}
            <div style={card}>
              <div style={cardHead}>Monthly Trend (6 months)</div>
              <MonthlyChart trend={data.trend} />
            </div>

            {/* Referral Sources */}
            <div style={card}>
              <div style={cardHead}>Referral Sources — Signup vs Paid</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                {data.referralSources.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,.3)", fontSize: 13 }}>No data yet</div>
                ) : data.referralSources.map(r => {
                  const convPct = r.signups > 0 ? Math.round((r.paid / r.signups) * 100) : 0;
                  return (
                    <div key={r.source}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                        <span style={{ fontWeight: 600, color: "rgba(255,255,255,.8)" }}>{r.source}</span>
                        <div style={{ display: "flex", gap: 10 }}>
                          <span style={{ color: "#818cf8" }}>{r.signups} signups</span>
                          <span style={{ color: "#34d399" }}>{r.paid} paid</span>
                          <span style={{ color: convPct >= 50 ? "#34d399" : "#fbbf24", fontWeight: 700 }}>{convPct}%</span>
                        </div>
                      </div>
                      <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
                        <div style={{
                          width: `${convPct}%`, height: "100%", borderRadius: 99,
                          background: convPct >= 50 ? "#34d399" : "#fbbf24",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Plan Distribution */}
            <div style={{ ...card, gridColumn: "1 / -1" }}>
              <div style={cardHead}>Active Plan Distribution</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {data.planDistribution.length === 0 ? (
                  <div style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>No active plans yet</div>
                ) : data.planDistribution.map(p => {
                  const color = PLAN_COLORS[p.plan] || "#64748b";
                  const total = data.planDistribution.reduce((s, x) => s + x.count, 0);
                  const pct   = total > 0 ? Math.round((p.count / total) * 100) : 0;
                  return (
                    <div key={p.plan} style={{ flex: 1, minWidth: 140, background: "rgba(255,255,255,.03)", border: `1px solid ${color}33`, borderRadius: 14, padding: "16px 18px" }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color }}>{p.count}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.6)", marginTop: 4 }}>{p.plan}</div>
                      <div style={{ marginTop: 10, height: 4, borderRadius: 99, background: "rgba(255,255,255,.07)" }}>
                        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: color }} />
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 5 }}>{pct}% of active</div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

function MonthlyChart({ trend }: { trend: TrendMonth[] }) {
  const maxVal = Math.max(...trend.flatMap(t => [t.signups, t.active, t.paid]), 1);
  const W = 500, H = 160, PX = 20, PT = 16, PB = 28;
  const cH = H - PT - PB, cW = W - PX * 2;

  function toPath(vals: number[], color: string) {
    const pts = vals.map((v, i) => ({
      x: PX + (i / Math.max(1, vals.length - 1)) * cW,
      y: PT + cH - (v / maxVal) * cH * 0.88,
    }));
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    return { d, pts, color };
  }

  const lines = [
    toPath(trend.map(t => t.signups), "#34d399"),
    toPath(trend.map(t => t.active),  "#818cf8"),
    toPath(trend.map(t => t.paid),    "#fbbf24"),
  ];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        {lines.map(({ d, pts, color }) => (
          <g key={color}>
            <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} stroke="#0a0f1e" strokeWidth="1.5" />
            ))}
          </g>
        ))}
        {trend.map((t, i) => {
          const x = PX + (i / Math.max(1, trend.length - 1)) * cW;
          return (
            <text key={t.month} x={x} y={H - 6} textAnchor="middle" fontSize="9" fill="rgba(148,163,184,.6)">
              {t.month.slice(5)}
            </text>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
        {[
          { label: "Signups", color: "#34d399" },
          { label: "Active",  color: "#818cf8" },
          { label: "Paid",    color: "#fbbf24" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,.5)" }}>
            <div style={{ width: 10, height: 3, borderRadius: 99, background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "linear-gradient(160deg, rgba(19,27,50,.98), rgba(15,22,42,.98))",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 20,
  padding: "20px 22px",
  marginBottom: 0,
};

const cardHead: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  marginBottom: 18,
  paddingBottom: 12,
  borderBottom: "1px solid rgba(255,255,255,.06)",
  color: "#f8fafc",
};

const css = `
  button { font-family: inherit; }
`;
