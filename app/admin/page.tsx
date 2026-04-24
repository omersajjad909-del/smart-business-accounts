"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type DashboardPayload = {
  cards: {
    totalCompanies: number;
    totalUsers: number;
    activeSubscriptions: number;
    monthlyRevenue: number;
  };
  overview: {
    label: string;
    newCompanies: number;
    newUsers: number;
    activeSubscriptions: number;
  }[];
  systemHealth: {
    percent: number;
    backupStatus: string;
    lastBackupAt: string | null;
    checks: { label: string; ok: boolean }[];
  };
  recentCompanies: {
    company: string;
    owner: string;
    plan: string;
    status: string;
    createdAt: string;
  }[];
  subscriptionOverview: {
    label: string;
    value: number;
    color: string;
  }[];
  topModules: {
    name: string;
    companies: number;
    width: number;
  }[];
  recentActivity: {
    title: string;
    detail: string;
    time: string;
    tone: string;
  }[];
};

const GROWTH = { companies: 12.5, users: 8.3, subscriptions: 15.2, revenue: 18.7 };

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overviewRange, setOverviewRange] = useState("This Week");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const currentUser = getCurrentUser();
        const headers: Record<string, string> = {};
        if (currentUser?.role) headers["x-user-role"] = currentUser.role;
        if (currentUser?.id) headers["x-user-id"] = currentUser.id;
        if (currentUser?.companyId) headers["x-company-id"] = currentUser.companyId;

        const response = await fetch("/api/admin/dashboard", {
          cache: "no-store",
          headers,
          credentials: "include" as RequestCredentials,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Failed to load dashboard");
        if (active) { setData(payload); setError(null); }
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const cards = [
    { title: "Total Companies",      value: formatNumber(data?.cards.totalCompanies),      tone: "purple", growth: GROWTH.companies,     icon: "building",  series: data?.overview.map((r) => r.newCompanies) || [] },
    { title: "Total Users",          value: formatNumber(data?.cards.totalUsers),           tone: "blue",   growth: GROWTH.users,         icon: "users",     series: data?.overview.map((r) => r.newUsers) || [] },
    { title: "Active Subscriptions", value: formatNumber(data?.cards.activeSubscriptions),  tone: "green",  growth: GROWTH.subscriptions, icon: "layers",    series: data?.overview.map((r) => r.activeSubscriptions) || [] },
    { title: "Monthly Revenue",      value: formatCurrency(data?.cards.monthlyRevenue),     tone: "orange", growth: GROWTH.revenue,       icon: "chart",     series: data?.overview.map((r) => r.activeSubscriptions) || [] },
  ];

  const dateRange = getDateRange();

  return (
    <div className="admin-dashboard">
      <style>{dashboardStyles}</style>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <section className="dash-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your system and platform.</p>
        </div>
        <div className="dash-header-right">
          <div className="dash-range">
            <CalendarIcon />
            <span>{dateRange}</span>
            <button type="button" className="dash-range-btn">{"<"}</button>
            <button type="button" className="dash-range-btn">{">"}</button>
          </div>
        </div>
      </section>

      {error ? (
        <section className="dash-card error-card">
          <h2>Dashboard unavailable</h2>
          <p>{error}</p>
        </section>
      ) : null}

      {/* ── KPI Stats ─────────────────────────────────────────────────── */}
      <section className="stats-grid">
        {cards.map((item) => (
          <article key={item.title} className={`dash-card stat-card tone-${item.tone}`}>
            <div className="stat-row">
              <div className="stat-icon">
                <CardIcon name={item.icon} />
              </div>
              <div className="stat-info">
                <div className="stat-title">{item.title}</div>
                <div className="stat-value">{loading ? "—" : item.value}</div>
              </div>
            </div>
            <div className="stat-footer">
              <span className="stat-growth">
                <span className="growth-arrow">▲</span>
                {item.growth}% vs last month
              </span>
              <MiniLine points={item.series} color={toneColor(item.tone)} />
            </div>
          </article>
        ))}
      </section>

      {/* ── Platform Overview + System Health ─────────────────────────── */}
      <section className="hero-grid">
        <article className="dash-card chart-card">
          <div className="card-head">
            <div>
              <h2>Platform Overview</h2>
              <div className="legend-row">
                <span className="legend-item"><i style={{ background: "#9b5cff" }} />New Companies</span>
                <span className="legend-item"><i style={{ background: "#4d8dff" }} />New Users</span>
                <span className="legend-item"><i style={{ background: "#4ad37a" }} />Active Subscriptions</span>
              </div>
            </div>
            <button type="button" className="chip" onClick={() => setOverviewRange(overviewRange === "This Week" ? "This Month" : "This Week")}>
              {overviewRange} <span className="chip-arrow">▾</span>
            </button>
          </div>
          <OverviewChart rows={data?.overview || []} />
        </article>

        <article className="dash-card system-card">
          <h2>System Health</h2>
          <div className="gauge-wrap">
            <div className="gauge" style={{ background: `conic-gradient(#4ad37a 0 ${(data?.systemHealth.percent || 0) * 3.6}deg, rgba(255,255,255,.08) ${(data?.systemHealth.percent || 0) * 3.6}deg 360deg)` }}>
              <div className="gauge-inner">
                <strong>{loading ? "—" : `${data?.systemHealth.percent || 0}%`}</strong>
                <span>Healthy</span>
              </div>
            </div>
          </div>
          <ul className="health-list">
            {(data?.systemHealth.checks || PLACEHOLDER_CHECKS).map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <span className={item.ok ? "ok-mark" : "warn-mark"}>{item.ok ? "✓" : "⚠"}</span>
              </li>
            ))}
          </ul>
          <div className="system-meta">
            <span>Backup: <b>{loading ? "—" : data?.systemHealth.backupStatus || "UNKNOWN"}</b></span>
            <span>Last backup: <b>{formatDateTime(data?.systemHealth.lastBackupAt)}</b></span>
          </div>
          <a href="/admin/system" className="system-health-btn">View System Health</a>
        </article>
      </section>

      {/* ── Recent Companies + Subscription Overview ───────────────────── */}
      <section className="content-grid">
        <article className="dash-card">
          <div className="card-head">
            <h2>Recent Companies</h2>
            <a href="/admin/companies" className="view-all">View All</a>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Owner</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(data?.recentCompanies || []).map((item) => (
                  <tr key={`${item.company}-${item.createdAt}`}>
                    <td><span className="company-name">{item.company}</span></td>
                    <td>{item.owner}</td>
                    <td>{item.plan}</td>
                    <td><span className={`status-pill${item.status === "ACTIVE" ? "" : " status-pill--muted"}`}>{item.status}</span></td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td><button type="button" className="row-menu">···</button></td>
                  </tr>
                ))}
                {!loading && !data?.recentCompanies?.length ? (
                  <tr><td colSpan={6} className="empty-cell">No companies found</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="dash-card">
          <div className="card-head">
            <h2>Subscription Overview</h2>
            <a href="/admin/subscriptions" className="view-all">View All</a>
          </div>
          <div className="donut-layout">
            <DonutChart items={data?.subscriptionOverview || []} />
            <div className="donut-list">
              {(data?.subscriptionOverview || []).map((item) => {
                const total = (data?.subscriptionOverview || []).reduce((s, c) => s + c.value, 0) || 1;
                const pct = ((item.value / total) * 100).toFixed(1);
                return (
                  <div key={item.label} className="donut-item">
                    <span className="legend-item"><i style={{ background: item.color }} />{item.label}</span>
                    <span className="donut-count">{item.value} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </article>
      </section>

      {/* ── Top Modules + Recent Activity + Storage ────────────────────── */}
      <section className="bottom-grid">
        <article className="dash-card">
          <div className="card-head">
            <h2>Top Active Modules</h2>
            <a href="/admin/business-modules" className="view-all">View All</a>
          </div>
          <div className="progress-list">
            {(data?.topModules || []).map((item) => (
              <div key={item.name} className="progress-item">
                <div className="progress-meta">
                  <span>{item.name}</span>
                  <span className="progress-count">{item.companies} Companies</span>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${item.width}%` }} />
                </div>
              </div>
            ))}
            {!loading && !data?.topModules?.length ? <div className="empty-note">No module usage data found.</div> : null}
          </div>
        </article>

        <article className="dash-card">
          <div className="card-head">
            <h2>Recent Activity</h2>
            <a href="/admin/logs" className="view-all">View All</a>
          </div>
          <div className="activity-list">
            {(data?.recentActivity || []).map((item, i) => (
              <div key={`${item.title}-${i}`} className="activity-item">
                <span className={`activity-dot tone-${item.tone}`} />
                <div className="activity-body">
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                <span className="activity-time">{timeAgo(item.time)}</span>
              </div>
            ))}
            {!loading && !data?.recentActivity?.length ? <div className="empty-note">No recent activity found.</div> : null}
          </div>
        </article>

        <article className="dash-card storage-card">
          <div className="card-head">
            <h2>Storage Usage</h2>
            <a href="/admin/backup-restore" className="view-all">View All</a>
          </div>
          <div className="storage-layout">
            <StorageDonut used={65} />
            <div className="storage-meta">
              <div className="storage-row">
                <span className="storage-label">Total Storage</span>
                <span className="storage-val">100 GB</span>
              </div>
              <div className="storage-row">
                <span className="storage-label">Used Storage</span>
                <span className="storage-val storage-val--used">65 GB</span>
              </div>
              <div className="storage-row">
                <span className="storage-label">Free Storage</span>
                <span className="storage-val storage-val--free">35 GB</span>
              </div>
            </div>
          </div>
          <a href="/admin/backup-restore" className="storage-btn">Manage Storage</a>
        </article>
      </section>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatNumber(v?: number) {
  if (v === undefined) return "—";
  return new Intl.NumberFormat("en-US").format(v);
}
function formatCurrency(v?: number) {
  if (v === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}
function formatDate(v?: string | null) {
  if (!v) return "N/A";
  return new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatDateTime(v?: string | null) {
  if (!v) return "N/A";
  return new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function timeAgo(v: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(v).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function toneColor(t: string) {
  if (t === "blue") return "#4f7cff";
  if (t === "green") return "#22c55e";
  if (t === "orange") return "#f59e0b";
  return "#8b5cf6";
}
function getDateRange() {
  const now = new Date();
  const end = new Date(now); end.setDate(end.getDate() - 1);
  const start = new Date(end); start.setDate(start.getDate() - 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

const PLACEHOLDER_CHECKS = [
  { label: "Server Status", ok: true },
  { label: "Database", ok: true },
  { label: "Queue Workers", ok: true },
  { label: "Storage", ok: true },
  { label: "Backup Status", ok: true },
];

// ── Icons ──────────────────────────────────────────────────────────────────
function CalendarIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
}
function CardIcon({ name }: { name: string }) {
  if (name === "building") return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9h.01M9 13h.01M9 17h.01"/></svg>;
  if (name === "users")    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if (name === "layers")   return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>;
}

// ── Chart components ───────────────────────────────────────────────────────
function MiniLine({ points, color }: { points: number[]; color: string }) {
  const pts = points.length ? points : [0, 0, 0, 0];
  const W = 76; const H = 28;
  const max = Math.max(...pts); const min = Math.min(...pts);
  const d = pts.map((p, i) => {
    const x = (i / Math.max(1, pts.length - 1)) * W;
    const y = H - ((max === min ? 0.5 : (p - min) / (max - min)) * (H - 4)) - 2;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function OverviewChart({ rows }: { rows: DashboardPayload["overview"] }) {
  const W = 760; const H = 280; const pad = 28;
  const max = Math.max(1, ...rows.flatMap((r) => [r.newCompanies, r.newUsers, r.activeSubscriptions]));
  const series = [
    { key: "newCompanies" as const,       color: "#9b5cff" },
    { key: "newUsers" as const,           color: "#4d8dff" },
    { key: "activeSubscriptions" as const, color: "#4ad37a" },
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="overview-chart" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((l) => {
        const y = pad + ((H - pad * 2) / 4) * l;
        return <line key={l} x1={pad} y1={y} x2={W - pad} y2={y} stroke="rgba(148,163,184,.1)" strokeDasharray="4 4" />;
      })}
      {rows.map((r, i) => {
        const x = pad + ((W - pad * 2) / Math.max(1, rows.length - 1)) * i;
        return <text key={r.label} x={x} y={H - 8} textAnchor="middle" fill="rgba(148,163,184,.72)" fontSize="11">{r.label}</text>;
      })}
      {series.map((s) => {
        const path = rows.map((r, i) => {
          const x = pad + ((W - pad * 2) / Math.max(1, rows.length - 1)) * i;
          const y = H - pad - ((r[s.key] || 0) / max) * (H - pad * 2);
          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
        }).join(" ");
        return (
          <g key={s.key}>
            <path d={path} fill="none" stroke={s.color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            {rows.map((r, i) => {
              const x = pad + ((W - pad * 2) / Math.max(1, rows.length - 1)) * i;
              const y = H - pad - ((r[s.key] || 0) / max) * (H - pad * 2);
              return <circle key={i} cx={x} cy={y} r="4.5" fill={s.color} stroke="var(--panel, #0f1729)" strokeWidth="3" />;
            })}
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ items }: { items: DashboardPayload["subscriptionOverview"] }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const circ = 364.42;
  let offset = 0;
  const arcs = items.map((item) => {
    const len = (item.value / total) * circ;
    const arc = { ...item, length: len, offset };
    offset += len;
    return arc;
  });
  const displayTotal = items.reduce((s, i) => s + i.value, 0);
  return (
    <svg width="190" height="190" viewBox="0 0 190 190" className="donut-svg" aria-hidden="true">
      <circle cx="95" cy="95" r="58" fill="none" stroke="rgba(148,163,184,.12)" strokeWidth="22" />
      {arcs.map((item) => (
        <circle key={item.label} cx="95" cy="95" r="58" fill="none"
          stroke={item.color} strokeWidth="22"
          strokeDasharray={`${item.length} ${circ - item.length}`}
          strokeDashoffset={-item.offset}
          transform="rotate(-90 95 95)" strokeLinecap="round"
        />
      ))}
      <text x="95" y="89" textAnchor="middle" fill="var(--text, #f8fafc)" fontSize="34" fontWeight="800">{displayTotal}</text>
      <text x="95" y="110" textAnchor="middle" fill="rgba(148,163,184,.75)" fontSize="13">Total</text>
    </svg>
  );
}

function StorageDonut({ used }: { used: number }) {
  const circ = 251.2;
  const usedLen = (used / 100) * circ;
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" aria-hidden="true">
      <circle cx="65" cy="65" r="40" fill="none" stroke="rgba(148,163,184,.12)" strokeWidth="18" />
      <circle cx="65" cy="65" r="40" fill="none" stroke="#8b5cf6" strokeWidth="18"
        strokeDasharray={`${usedLen} ${circ - usedLen}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
      />
      <text x="65" y="61" textAnchor="middle" fill="var(--text, #f8fafc)" fontSize="20" fontWeight="800">{used}%</text>
      <text x="65" y="78" textAnchor="middle" fill="rgba(148,163,184,.7)" fontSize="11">Used</text>
    </svg>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const dashboardStyles = `
.admin-dashboard{
  display:grid;
  gap:16px;
  font-family:'Outfit','DM Sans',sans-serif;
}
.dash-card{
  border-radius:22px;
  border:1px solid var(--border, rgba(255,255,255,.08));
  background:var(--panel, linear-gradient(180deg,rgba(19,27,46,.98),rgba(15,22,39,.96)));
  box-shadow:var(--card-shadow, 0 24px 70px rgba(3,6,18,.28));
}
.dash-header{
  display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;
}
.dash-header h1{
  margin:0;font-size:32px;font-weight:800;letter-spacing:-.05em;color:var(--text);
}
.dash-header p{
  margin:6px 0 0;color:var(--text-soft);font-size:14px;
}
.dash-header-right{display:flex;align-items:center;gap:10px;}
.dash-range{
  display:inline-flex;align-items:center;gap:9px;
  padding:10px 14px;border-radius:14px;
  background:var(--panel);border:1px solid var(--border);
  color:var(--text-soft);font-size:13px;font-weight:600;
}
.dash-range-btn{
  border:none;background:transparent;color:var(--text-muted);
  cursor:pointer;font-size:14px;padding:0 2px;line-height:1;
}
.error-card{padding:18px;color:var(--text);}
.error-card h2{margin:0 0 8px;font-size:16px;}
.error-card p{margin:0;color:#fca5a5;}

/* ── Stats ─────────────────────────────────────────────────────── */
.stats-grid{
  display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;
}
.stat-card{padding:16px 18px;}
.stat-row{display:flex;align-items:flex-start;gap:13px;}
.stat-icon{
  width:40px;height:40px;border-radius:13px;
  display:grid;place-items:center;flex-shrink:0;
}
.tone-purple .stat-icon{background:rgba(139,92,246,.22);color:#c4b5fd;}
.tone-blue   .stat-icon{background:rgba(79,124,255,.22);color:#93c5fd;}
.tone-green  .stat-icon{background:rgba(34,197,94,.22);color:#86efac;}
.tone-orange .stat-icon{background:rgba(251,146,60,.22);color:#fdba74;}
.stat-info{flex:1;min-width:0;}
.stat-title{font-size:13px;color:var(--text-soft);}
.stat-value{margin-top:5px;font-size:32px;line-height:1;font-weight:800;letter-spacing:-.05em;color:var(--text);}
.stat-footer{
  margin-top:14px;display:flex;align-items:flex-end;
  justify-content:space-between;gap:10px;
}
.stat-growth{
  display:inline-flex;align-items:center;gap:4px;
  font-size:11px;font-weight:700;color:#4ad37a;
}
.growth-arrow{font-size:10px;}

/* ── Hero grid ─────────────────────────────────────────────────── */
.hero-grid{
  display:grid;grid-template-columns:minmax(0,2.2fr) minmax(270px,.88fr);gap:14px;
}
.chart-card,.system-card{padding:18px 20px;}
.card-head{
  display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px;
}
.card-head h2{margin:0;font-size:18px;font-weight:700;letter-spacing:-.03em;color:var(--text);}
.view-all{color:#bca9ff;text-decoration:none;font-size:12px;font-weight:700;white-space:nowrap;}
.legend-row{margin-top:10px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.legend-item{display:inline-flex;align-items:center;gap:7px;color:var(--text-soft);font-size:12px;}
.legend-item i{width:8px;height:8px;border-radius:999px;display:inline-block;flex-shrink:0;}
.chip{
  padding:8px 12px;border-radius:12px;background:var(--panel-2,rgba(255,255,255,.04));
  border:1px solid var(--border);color:var(--text-soft);font-size:12px;
  cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;
}
.chip-arrow{font-size:10px;}
.overview-chart{width:100%;height:auto;min-height:180px;}
.system-card{display:flex;flex-direction:column;}
.gauge-wrap{display:flex;justify-content:center;margin:14px 0 10px;}
.gauge{
  width:162px;height:162px;border-radius:50%;
  display:grid;place-items:center;position:relative;
}
.gauge::after{
  content:"";width:118px;height:118px;border-radius:50%;
  background:var(--panel,#0f1729);position:absolute;
}
.gauge-inner{position:relative;z-index:1;display:grid;gap:2px;text-align:center;}
.gauge-inner strong{font-size:30px;line-height:1;color:var(--text);}
.gauge-inner span{color:var(--text-soft);font-size:13px;}
.health-list{list-style:none;padding:0;margin:0;display:grid;gap:9px;}
.health-list li{
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  color:var(--text-soft);font-size:13px;
}
.ok-mark{color:#4ad37a;font-size:14px;}
.warn-mark{color:#f59e0b;font-size:14px;}
.system-meta{
  margin-top:12px;display:grid;gap:6px;
  color:var(--text-muted);font-size:12px;
}
.system-meta b{color:var(--text);}
.system-health-btn{
  display:block;margin-top:14px;padding:10px 14px;border-radius:14px;
  background:linear-gradient(135deg,rgba(124,58,237,.28),rgba(90,61,248,.18));
  border:1px solid rgba(143,110,255,.3);
  color:#c4b5fd;text-decoration:none;font-size:13px;font-weight:700;
  text-align:center;transition:background .15s ease;
}
.system-health-btn:hover{background:linear-gradient(135deg,rgba(124,58,237,.38),rgba(90,61,248,.28));}

/* ── Content grid ──────────────────────────────────────────────── */
.content-grid{
  display:grid;grid-template-columns:1.5fr 1fr;gap:14px;
}
.content-grid>.dash-card{padding:18px 20px;}
.table-wrap{overflow-x:auto;}
table{width:100%;border-collapse:collapse;}
th,td{
  text-align:left;padding:11px 10px 11px 0;
  border-bottom:1px solid var(--border);white-space:nowrap;
}
th:last-child,td:last-child{padding-right:0;}
th{color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.08em;}
td{color:var(--text-soft);font-size:13px;}
tbody tr:last-child td{border-bottom:none;}
.company-name{font-weight:700;color:var(--text);}
.empty-cell{color:var(--text-muted);text-align:center;padding:24px 0;border-bottom:none!important;}
.status-pill{
  display:inline-flex;padding:4px 10px;border-radius:999px;
  background:rgba(34,197,94,.16);color:#86efac;font-size:11px;font-weight:700;
}
.status-pill--muted{background:rgba(148,163,184,.12);color:var(--text-soft);}
.row-menu{
  border:none;background:transparent;color:var(--text-muted);
  font-size:16px;cursor:pointer;padding:4px 6px;border-radius:8px;
}
.row-menu:hover{background:var(--bg-soft);}
.donut-layout{
  display:flex;align-items:center;justify-content:space-between;
  gap:16px;flex-wrap:wrap;
}
.donut-list{flex:1;min-width:160px;display:grid;gap:11px;}
.donut-item{
  display:flex;align-items:center;justify-content:space-between;
  gap:10px;color:var(--text-soft);font-size:13px;
}
.donut-count{color:var(--text-muted);font-size:12px;white-space:nowrap;}

/* ── Bottom grid ───────────────────────────────────────────────── */
.bottom-grid{
  display:grid;grid-template-columns:1fr 1fr .7fr;gap:14px;
}
.bottom-grid>.dash-card{padding:18px 20px;}
.progress-list{display:grid;gap:14px;}
.progress-item{}
.progress-meta{
  display:flex;align-items:center;justify-content:space-between;
  gap:10px;margin-bottom:7px;color:var(--text);font-size:13px;
}
.progress-count{color:var(--text-muted);font-size:12px;}
.progress-track{
  height:7px;border-radius:999px;
  background:var(--border);overflow:hidden;
}
.progress-track span{
  display:block;height:100%;border-radius:999px;
  background:linear-gradient(90deg,#8b5cf6,#4f7cff);
}
.activity-list{display:grid;gap:14px;}
.activity-item{
  display:grid;grid-template-columns:auto 1fr auto;
  gap:12px;align-items:start;
}
.activity-dot{
  width:11px;height:11px;border-radius:999px;margin-top:5px;flex-shrink:0;
}
.activity-dot.tone-purple{background:#8b5cf6;}
.activity-dot.tone-blue  {background:#4f7cff;}
.activity-dot.tone-green {background:#22c55e;}
.activity-dot.tone-orange{background:#fb923c;}
.activity-body strong{display:block;font-size:13px;color:var(--text);}
.activity-body p{margin:3px 0 0;color:var(--text-soft);font-size:12px;line-height:1.45;}
.activity-time{color:var(--text-muted);font-size:11px;white-space:nowrap;}
.empty-note{color:var(--text-muted);font-size:13px;}

/* Storage */
.storage-card{display:flex;flex-direction:column;}
.storage-layout{
  display:flex;flex-direction:column;align-items:center;
  gap:14px;margin:10px 0;
}
.storage-meta{width:100%;display:grid;gap:8px;}
.storage-row{
  display:flex;align-items:center;justify-content:space-between;
  font-size:12px;color:var(--text-muted);
}
.storage-val{font-weight:700;color:var(--text);}
.storage-val--used{color:#a78bfa;}
.storage-val--free{color:#4ad37a;}
.storage-btn{
  display:block;margin-top:auto;padding-top:16px;
  text-align:center;padding:10px 14px;border-radius:14px;
  background:var(--panel-2,rgba(255,255,255,.04));
  border:1px solid var(--border);color:var(--text-soft);
  text-decoration:none;font-size:13px;font-weight:700;
  transition:background .14s ease;
}
.storage-btn:hover{background:var(--bg-soft);}

/* ── Responsive: Tablet 768–1024px ─────────────────────────────── */
@media (max-width: 1024px){
  .stats-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
  .hero-grid,.content-grid,.bottom-grid{grid-template-columns:1fr;}
  .system-card{flex-direction:row;flex-wrap:wrap;gap:18px;align-items:flex-start;}
  .system-card h2{width:100%;}
  .gauge-wrap{margin:0;}
  .storage-layout{flex-direction:row;align-items:center;}
}

/* ── Responsive: Mobile 320–767px ──────────────────────────────── */
@media (max-width: 767px){
  .admin-dashboard{gap:12px;}
  .dash-header{flex-direction:column;align-items:flex-start;gap:10px;}
  .dash-header h1{font-size:24px;}
  .dash-header p{font-size:12px;}
  .dash-range{width:100%;font-size:12px;padding:9px 12px;}
  .stats-grid{grid-template-columns:1fr;gap:10px;}
  .dash-card{border-radius:18px;}
  .stat-card{padding:14px;}
  .stat-value{font-size:26px;}
  .chart-card,.system-card,.content-grid>.dash-card,.bottom-grid>.dash-card{padding:14px 14px;}
  .card-head h2{font-size:15px;}
  .overview-chart{min-height:160px;}
  .gauge{width:130px;height:130px;}
  .gauge::after{width:94px;height:94px;}
  .gauge-inner strong{font-size:24px;}
  .donut-layout{flex-direction:column;align-items:flex-start;gap:12px;}
  .donut-svg{width:130px;height:130px;}
  .activity-item{grid-template-columns:auto 1fr;}
  .activity-time{grid-column:2;margin-top:2px;}
  th:nth-child(2),td:nth-child(2),
  th:nth-child(3),td:nth-child(3){display:none;}
  .bottom-grid{grid-template-columns:1fr;}
  .storage-layout{flex-direction:row;align-items:center;}
}
`;
