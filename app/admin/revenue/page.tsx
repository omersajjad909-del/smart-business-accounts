"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type RevenuePayload = {
  mrrSeries: { label: string; value: number }[];
  planDistribution: { starter: number; pro: number; enterprise: number };
};

type FinancePayload = {
  active: { starter: number; pro: number; enterprise: number };
  mrr: number;
  arr: number;
};

function fmtMoney(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

export default function AdminRevenuePage() {
  const [data, setData]       = useState<RevenuePayload | null>(null);
  const [finance, setFinance] = useState<FinancePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const u = getCurrentUser();
    const headers: Record<string, string> = {};
    if (u?.role) headers["x-user-role"] = u.role;
    if (u?.id)   headers["x-user-id"]   = u.id;
    if (u?.companyId) headers["x-company-id"] = u.companyId;

    Promise.all([
      fetch("/api/admin/web/revenue", { cache: "no-store", headers, credentials: "include" }).then(r => r.ok ? r.json() : null),
      fetch("/api/admin/web/finance", { cache: "no-store", headers, credentials: "include" }).then(r => r.ok ? r.json() : null),
    ]).then(([rev, fin]) => {
      if (!active) return;
      setData(rev ?? { mrrSeries: [], planDistribution: { starter: 0, pro: 0, enterprise: 0 } });
      setFinance(fin ?? { active: { starter: 0, pro: 0, enterprise: 0 }, mrr: 0, arr: 0 });
    }).catch(() => {
      if (!active) return;
      setData({ mrrSeries: [], planDistribution: { starter: 0, pro: 0, enterprise: 0 } });
      setFinance({ active: { starter: 0, pro: 0, enterprise: 0 }, mrr: 0, arr: 0 });
    }).finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  const totalActive = finance
    ? finance.active.starter + finance.active.pro + finance.active.enterprise
    : 0;

  const kpis = [
    { label: "MRR",            val: fmtMoney(finance?.mrr ?? 0),   color: "#34d399", sub: "This month" },
    { label: "ARR",            val: fmtMoney(finance?.arr ?? 0),   color: "#818cf8", sub: "Annualized" },
    { label: "Active Accounts",val: String(totalActive),            color: "#38bdf8", sub: "Paid subscriptions" },
    { label: "Enterprise",     val: String(finance?.active.enterprise ?? 0), color: "#fbbf24", sub: "Top-tier" },
  ];

  const planBars = [
    { label: "Starter",    value: data?.planDistribution.starter    ?? 0, color: "#6d7c97" },
    { label: "Pro",        value: data?.planDistribution.pro        ?? 0, color: "#6b63ff" },
    { label: "Enterprise", value: data?.planDistribution.enterprise ?? 0, color: "#1fa0de" },
  ];
  const maxPlan = Math.max(...planBars.map(b => b.value), 1);

  return (
    <div className="revenue-page">
      <style>{styles}</style>

      <div className="revenue-shell">
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: "#f8fafc" }}>Revenue Analytics</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>Live revenue trends, plan distribution, and billing overview.</p>
        </div>

        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 28 }}>
          {kpis.map(k => (
            <div key={k.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{loading ? "—" : k.val}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.55)", marginTop: 4 }}>{k.label}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="revenue-grid">
          {/* MRR Chart */}
          <section className="revenue-card">
            <h2>MRR Growth (last 6 months)</h2>
            <div className="chart-frame">
              <RevenueLineChart rows={data?.mrrSeries || []} loading={loading} />
            </div>
          </section>

          {/* Plan Distribution */}
          <section className="revenue-card">
            <h2>Plan Distribution (Active)</h2>
            <div className="bars-wrap">
              {planBars.map(item => (
                <div key={item.label} style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: "#fffaf0" }}>{item.label}</span>
                    <span style={{ color: "rgba(255,255,255,.5)", fontWeight: 600 }}>{loading ? "—" : item.value} accounts</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
                    <div style={{
                      width: loading ? "0%" : `${Math.max((item.value / maxPlan) * 100, item.value > 0 ? 8 : 0)}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: item.color,
                      transition: "width .5s ease",
                    }} />
                  </div>
                </div>
              ))}

              {/* Summary totals */}
              <div style={{ marginTop: 24, padding: "14px 16px", background: "rgba(255,255,255,.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,.06)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".07em", marginBottom: 10 }}>TOTAL ACTIVE</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#34d399" }}>{loading ? "—" : totalActive}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 3 }}>paid subscriptions</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function RevenueLineChart({ rows, loading }: { rows: { label: string; value: number }[]; loading: boolean }) {
  const safeRows = rows.length ? rows : [
    { label: "—", value: 0 }, { label: "—", value: 0 }, { label: "—", value: 0 },
    { label: "—", value: 0 }, { label: "—", value: 0 }, { label: "—", value: 0 },
  ];

  const W = 760, H = 260;
  const PX = 28, PT = 20, PB = 36;
  const cH = H - PT - PB, cW = W - PX * 2;
  const max = Math.max(...safeRows.map(r => r.value), 1);

  const points = safeRows.map((r, i) => ({
    x: PX + (i / Math.max(1, safeRows.length - 1)) * cW,
    y: PT + cH - (r.value / max) * (cH * 0.82),
    label: r.label,
    value: r.value,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PT + cH} L ${points[0].x} ${PT + cH} Z`;

  const gradId = "revGrad";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="line-chart" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map(p => {
        const y = PT + cH - p * cH * 0.82;
        return (
          <line key={p} x1={PX} y1={y} x2={W - PX} y2={y} stroke="rgba(255,255,255,.06)" strokeWidth="1" />
        );
      })}

      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradId})`} />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Points + labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4.5" fill="#6366f1" stroke="#0a0f1e" strokeWidth="2" />
          {p.value > 0 && (
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,.7)" fontWeight="700">
              ${p.value.toLocaleString()}
            </text>
          )}
          <text x={p.x} y={H - 8} textAnchor="middle" fontSize="11" fill="rgba(148,163,184,.7)">
            {p.label}
          </text>
        </g>
      ))}

      {loading && (
        <text x={PX + 10} y={PT + 20} fontSize="13" fill="rgba(255,255,255,.4)">Loading…</text>
      )}

      {!loading && max === 1 && (
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="13" fill="rgba(255,255,255,.25)">
          No payment events recorded yet
        </text>
      )}
    </svg>
  );
}

const styles = `
.revenue-page { min-height:100%; font-family:'Outfit','DM Sans',sans-serif; color:white; }
.revenue-shell { max-width:1520px; margin:0 auto; padding:0 0 80px; }
.revenue-grid {
  display:grid;
  grid-template-columns:minmax(0,1.3fr) minmax(0,0.7fr);
  gap:20px;
}
.revenue-card {
  padding:24px;
  border-radius:20px;
  background:linear-gradient(160deg, rgba(22,32,60,.98), rgba(18,26,50,.98));
  border:1px solid rgba(255,255,255,.08);
  box-shadow:0 16px 40px rgba(3,8,21,.28);
}
.revenue-card h2 {
  margin:0 0 20px;
  color:#fffaf0;
  font-size:16px;
  font-weight:800;
  letter-spacing:-.02em;
}
.chart-frame { border-radius:12px; overflow:hidden; }
.line-chart { width:100%; height:auto; display:block; }
.bars-wrap { padding-top:4px; }
@media (max-width:1100px) { .revenue-grid { grid-template-columns:1fr; } }
`;
