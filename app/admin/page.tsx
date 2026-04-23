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

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load dashboard");
        }
        if (active) {
          setData(payload);
          setError(null);
        }
      } catch (fetchError: unknown) {
        if (active) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load dashboard");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const cards = [
    {
      title: "Total Companies",
      value: formatNumber(data?.cards.totalCompanies),
      tone: "purple",
      series: data?.overview.map((item) => item.newCompanies) || [],
    },
    {
      title: "Total Users",
      value: formatNumber(data?.cards.totalUsers),
      tone: "blue",
      series: data?.overview.map((item) => item.newUsers) || [],
    },
    {
      title: "Active Subscriptions",
      value: formatNumber(data?.cards.activeSubscriptions),
      tone: "green",
      series: data?.overview.map((item) => item.activeSubscriptions) || [],
    },
    {
      title: "Monthly Revenue",
      value: formatCurrency(data?.cards.monthlyRevenue),
      tone: "orange",
      series: data?.overview.map((item) => item.activeSubscriptions) || [],
    },
  ];

  return (
    <div className="admin-dashboard">
      <style>{dashboardStyles}</style>

      <section className="dash-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your system and platform.</p>
        </div>
        <div className="dash-range">
          <span>Live admin data</span>
        </div>
      </section>

      {error ? (
        <section className="dash-card error-card">
          <h2>Dashboard unavailable</h2>
          <p>{error}</p>
        </section>
      ) : null}

      <section className="stats-grid">
        {cards.map((item) => (
          <article key={item.title} className={`dash-card stat-card tone-${item.tone}`}>
            <div className="stat-row">
              <div className="stat-icon">{item.title.slice(0, 1)}</div>
              <div>
                <div className="stat-title">{item.title}</div>
                <div className="stat-value">{loading ? "..." : item.value}</div>
              </div>
            </div>
            <div className="stat-footer">
              <span>{loading ? "Loading" : "Live data"}</span>
              <MiniLine points={item.series} color={toneColor(item.tone)} />
            </div>
          </article>
        ))}
      </section>

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
            <button type="button" className="chip">Last 7 Days</button>
          </div>
          <OverviewChart rows={data?.overview || []} />
        </article>

        <article className="dash-card system-card">
          <h2>System Health</h2>
          <div className="gauge-wrap">
            <div className="gauge" style={{ background: `conic-gradient(#4ad37a 0 ${(data?.systemHealth.percent || 0) * 3.6}deg, rgba(255,255,255,.08) ${(data?.systemHealth.percent || 0) * 3.6}deg 360deg)` }}>
              <div className="gauge-inner">
                <strong>{loading ? "..." : `${data?.systemHealth.percent || 0}%`}</strong>
                <span>{loading ? "Checking" : "Healthy"}</span>
              </div>
            </div>
          </div>
          <ul className="health-list">
            {(data?.systemHealth.checks || []).map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <span className={item.ok ? "ok-mark" : "warn-mark"}>{item.ok ? "OK" : "Warn"}</span>
              </li>
            ))}
          </ul>
          <div className="system-meta">
            <span>Backup Status: <b>{loading ? "..." : data?.systemHealth.backupStatus || "UNKNOWN"}</b></span>
            <span>Last Backup: <b>{formatDateTime(data?.systemHealth.lastBackupAt)}</b></span>
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="dash-card">
          <div className="card-head">
            <h2>Recent Companies</h2>
            <a href="/admin/companies">View All</a>
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
                </tr>
              </thead>
              <tbody>
                {(data?.recentCompanies || []).map((item) => (
                  <tr key={`${item.company}-${item.createdAt}`}>
                    <td>{item.company}</td>
                    <td>{item.owner}</td>
                    <td>{item.plan}</td>
                    <td><span className={`status-pill ${item.status === "ACTIVE" ? "" : "status-pill--muted"}`}>{item.status}</span></td>
                    <td>{formatDate(item.createdAt)}</td>
                  </tr>
                ))}
                {!loading && !data?.recentCompanies.length ? (
                  <tr>
                    <td colSpan={5} className="empty-cell">No companies found</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="dash-card">
          <div className="card-head">
            <h2>Subscription Overview</h2>
            <a href="/admin/subscriptions">View All</a>
          </div>
          <div className="donut-layout">
            <DonutChart items={data?.subscriptionOverview || []} />
            <div className="donut-list">
              {(data?.subscriptionOverview || []).map((item) => {
                const total = (data?.subscriptionOverview || []).reduce((sum, current) => sum + current.value, 0) || 1;
                const percent = ((item.value / total) * 100).toFixed(1);
                return (
                  <div key={item.label} className="donut-item">
                    <span className="legend-item">
                      <i style={{ background: item.color }} />
                      {item.label}
                    </span>
                    <span>{item.value} ({percent}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </article>

        <article className="dash-card">
          <div className="card-head">
            <h2>Top Active Modules</h2>
            <a href="/admin/business-modules">View All</a>
          </div>
          <div className="progress-list">
            {(data?.topModules || []).map((item) => (
              <div key={item.name} className="progress-item">
                <div className="progress-meta">
                  <span>{item.name}</span>
                  <span>{item.companies} Companies</span>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${item.width}%` }} />
                </div>
              </div>
            ))}
            {!loading && !data?.topModules.length ? <div className="empty-note">No module usage data found.</div> : null}
          </div>
        </article>

        <article className="dash-card">
          <div className="card-head">
            <h2>Recent Activity</h2>
            <a href="/admin/logs">View All</a>
          </div>
          <div className="activity-list">
            {(data?.recentActivity || []).map((item, index) => (
              <div key={`${item.title}-${index}`} className="activity-item">
                <span className={`activity-dot tone-${item.tone}`} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                <span className="activity-time">{timeAgo(item.time)}</span>
              </div>
            ))}
            {!loading && !data?.recentActivity.length ? <div className="empty-note">No recent admin activity found.</div> : null}
          </div>
        </article>
      </section>
    </div>
  );
}

function formatNumber(value?: number) {
  if (value === undefined) return "...";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value?: number) {
  if (value === undefined) return "...";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(value: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function toneColor(tone: string) {
  if (tone === "blue") return "#4f7cff";
  if (tone === "green") return "#22c55e";
  if (tone === "orange") return "#f59e0b";
  return "#8b5cf6";
}

function MiniLine({ points, color }: { points: number[]; color: string }) {
  const safePoints = points.length ? points : [0, 0, 0, 0];
  const width = 76;
  const height = 28;
  const max = Math.max(...safePoints);
  const min = Math.min(...safePoints);
  const d = safePoints
    .map((point, index) => {
      const x = (index / Math.max(1, safePoints.length - 1)) * width;
      const normalized = max === min ? 0.5 : (point - min) / (max - min);
      const y = height - normalized * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mini-line" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function OverviewChart({ rows }: { rows: DashboardPayload["overview"] }) {
  const width = 760;
  const height = 290;
  const padding = 26;
  const max = Math.max(1, ...rows.flatMap((item) => [item.newCompanies, item.newUsers, item.activeSubscriptions]));
  const series = [
    { key: "newCompanies", color: "#9b5cff" },
    { key: "newUsers", color: "#4d8dff" },
    { key: "activeSubscriptions", color: "#4ad37a" },
  ] as const;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="overview-chart" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((line) => {
        const y = padding + ((height - padding * 2) / 4) * line;
        return <line key={line} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,.06)" />;
      })}
      {rows.map((label, index) => {
        const x = padding + ((width - padding * 2) / Math.max(1, rows.length - 1)) * index;
        return (
          <text key={label.label} x={x} y={height - 8} textAnchor="middle" fill="rgba(148,163,184,.72)" fontSize="11">
            {label.label}
          </text>
        );
      })}
      {series.map((seriesItem) => {
        const path = rows
          .map((value, index) => {
            const x = padding + ((width - padding * 2) / Math.max(1, rows.length - 1)) * index;
            const y = height - padding - ((value[seriesItem.key] || 0) / max) * (height - padding * 2);
            return `${index === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ");

        return (
          <g key={seriesItem.key}>
            <path d={path} fill="none" stroke={seriesItem.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {rows.map((value, index) => {
              const x = padding + ((width - padding * 2) / Math.max(1, rows.length - 1)) * index;
              const y = height - padding - ((value[seriesItem.key] || 0) / max) * (height - padding * 2);
              return <circle key={`${seriesItem.key}-${index}`} cx={x} cy={y} r="5" fill={seriesItem.color} stroke="rgba(7,11,22,1)" strokeWidth="3" />;
            })}
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ items }: { items: DashboardPayload["subscriptionOverview"] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const arcs = items.map((item, index) => {
    const previous = items.slice(0, index).reduce((sum, current) => sum + current.value, 0);
    return {
      ...item,
      length: (item.value / total) * 364.42,
      offset: (previous / total) * 364.42,
    };
  });

  return (
    <svg width="190" height="190" viewBox="0 0 190 190" className="donut-svg" aria-hidden="true">
      <circle cx="95" cy="95" r="58" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="22" />
      {arcs.map((item) => (
        <circle
          key={item.label}
          cx="95"
          cy="95"
          r="58"
          fill="none"
          stroke={item.color}
          strokeWidth="22"
          strokeDasharray={`${item.length} ${364.42 - item.length}`}
          strokeDashoffset={-item.offset}
          transform="rotate(-90 95 95)"
          strokeLinecap="round"
        />
      ))}
      <text x="95" y="90" textAnchor="middle" fill="#f8fafc" fontSize="34" fontWeight="800">{items.reduce((sum, item) => sum + item.value, 0)}</text>
      <text x="95" y="116" textAnchor="middle" fill="rgba(148,163,184,.75)" fontSize="14">Total</text>
    </svg>
  );
}

const dashboardStyles = `
.admin-dashboard{
  display:grid;
  gap:18px;
}
.dash-card{
  border-radius:22px;
  border:1px solid rgba(255,255,255,.08);
  background:linear-gradient(180deg, rgba(19,27,46,.98), rgba(15,22,39,.96));
  box-shadow:0 24px 70px rgba(3,6,18,.28);
}
.dash-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
  flex-wrap:wrap;
}
.dash-header h1{
  margin:0;
  font-size:34px;
  font-weight:800;
  letter-spacing:-.05em;
}
.dash-header p{
  margin:6px 0 0;
  color:rgba(203,213,225,.72);
  font-size:14px;
}
.dash-range{
  display:inline-flex;
  align-items:center;
  gap:10px;
  padding:12px 14px;
  border-radius:14px;
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.08);
  color:#e2e8f0;
  font-size:13px;
  font-weight:600;
}
.error-card{
  padding:18px;
}
.error-card h2{
  margin:0 0 8px;
}
.error-card p{
  margin:0;
  color:#fca5a5;
}
.stats-grid{
  display:grid;
  grid-template-columns:repeat(4, minmax(0,1fr));
  gap:16px;
}
.stat-card{
  padding:16px;
}
.stat-row{
  display:flex;
  align-items:flex-start;
  gap:12px;
}
.stat-icon{
  width:38px;
  height:38px;
  border-radius:12px;
  display:grid;
  place-items:center;
  font-size:13px;
  font-weight:800;
  color:#fff;
}
.tone-purple .stat-icon{ background:rgba(139,92,246,.24); color:#c4b5fd; }
.tone-blue .stat-icon{ background:rgba(79,124,255,.22); color:#93c5fd; }
.tone-green .stat-icon{ background:rgba(34,197,94,.22); color:#86efac; }
.tone-orange .stat-icon{ background:rgba(251,146,60,.22); color:#fdba74; }
.stat-title{
  font-size:13px;
  color:rgba(226,232,240,.75);
}
.stat-value{
  margin-top:6px;
  font-size:34px;
  line-height:1;
  font-weight:800;
  letter-spacing:-.05em;
}
.stat-footer{
  margin-top:14px;
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  gap:10px;
  color:#4ad37a;
  font-size:12px;
  font-weight:700;
}
.hero-grid{
  display:grid;
  grid-template-columns:minmax(0, 2.2fr) minmax(280px, .9fr);
  gap:16px;
}
.chart-card,.system-card{
  padding:18px;
}
.card-head{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:12px;
  margin-bottom:16px;
}
.card-head h2{
  margin:0;
  font-size:22px;
  font-weight:700;
  letter-spacing:-.03em;
}
.card-head a{
  color:#bca9ff;
  text-decoration:none;
  font-size:12px;
  font-weight:700;
}
.legend-row{
  margin-top:10px;
  display:flex;
  align-items:center;
  gap:16px;
  flex-wrap:wrap;
}
.legend-item{
  display:inline-flex;
  align-items:center;
  gap:7px;
  color:rgba(226,232,240,.72);
  font-size:12px;
}
.legend-item i{
  width:8px;
  height:8px;
  border-radius:999px;
  display:inline-block;
}
.chip{
  padding:8px 12px;
  border-radius:12px;
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.08);
  color:#e2e8f0;
  font-size:12px;
}
.overview-chart{
  width:100%;
  height:auto;
}
.system-card{
  display:flex;
  flex-direction:column;
}
.gauge-wrap{
  display:flex;
  justify-content:center;
  margin:18px 0;
}
.gauge{
  width:170px;
  height:170px;
  border-radius:50%;
  display:grid;
  place-items:center;
  position:relative;
}
.gauge::after{
  content:"";
  width:126px;
  height:126px;
  border-radius:50%;
  background:#0f1729;
  position:absolute;
}
.gauge-inner{
  position:relative;
  z-index:1;
  display:grid;
  gap:2px;
  text-align:center;
}
.gauge-inner strong{
  font-size:32px;
  line-height:1;
}
.gauge-inner span{
  color:rgba(203,213,225,.72);
  font-size:13px;
}
.health-list{
  list-style:none;
  padding:0;
  margin:0;
  display:grid;
  gap:10px;
}
.health-list li{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  color:rgba(226,232,240,.78);
  font-size:13px;
}
.ok-mark{
  color:#4ad37a;
}
.warn-mark{
  color:#f59e0b;
}
.system-meta{
  margin-top:16px;
  display:grid;
  gap:8px;
  color:rgba(203,213,225,.72);
  font-size:13px;
}
.system-meta b{
  color:#fff;
}
.content-grid{
  display:grid;
  grid-template-columns:1.4fr 1fr;
  gap:16px;
}
.content-grid > .dash-card{
  padding:18px;
}
.table-wrap{
  overflow:auto;
}
table{
  width:100%;
  border-collapse:collapse;
}
th,td{
  text-align:left;
  padding:12px 10px 12px 0;
  border-bottom:1px solid rgba(255,255,255,.06);
  white-space:nowrap;
}
th{
  color:rgba(148,163,184,.7);
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.08em;
}
td{
  color:#e2e8f0;
  font-size:13px;
}
.empty-cell{
  color:rgba(148,163,184,.72);
  text-align:center;
  padding:24px 0;
}
.status-pill{
  display:inline-flex;
  padding:5px 9px;
  border-radius:999px;
  background:rgba(34,197,94,.16);
  color:#86efac;
  font-size:11px;
  font-weight:700;
}
.status-pill--muted{
  background:rgba(148,163,184,.14);
  color:#cbd5e1;
}
.donut-layout{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:18px;
  flex-wrap:wrap;
}
.donut-list{
  flex:1;
  min-width:180px;
  display:grid;
  gap:12px;
}
.donut-item{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  color:rgba(226,232,240,.78);
  font-size:13px;
}
.progress-list{
  display:grid;
  gap:16px;
}
.progress-meta{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  margin-bottom:8px;
  color:#e2e8f0;
  font-size:13px;
}
.progress-meta span:last-child{
  color:rgba(203,213,225,.65);
}
.progress-track{
  height:8px;
  border-radius:999px;
  background:rgba(255,255,255,.06);
  overflow:hidden;
}
.progress-track span{
  display:block;
  height:100%;
  border-radius:999px;
  background:linear-gradient(90deg, #8b5cf6, #4f7cff);
}
.activity-list{
  display:grid;
  gap:14px;
}
.activity-item{
  display:grid;
  grid-template-columns:auto 1fr auto;
  gap:12px;
  align-items:start;
}
.activity-dot{
  width:12px;
  height:12px;
  border-radius:999px;
  margin-top:4px;
}
.activity-dot.tone-purple{ background:#8b5cf6; }
.activity-dot.tone-blue{ background:#4f7cff; }
.activity-dot.tone-green{ background:#22c55e; }
.activity-dot.tone-orange{ background:#fb923c; }
.activity-item strong{
  display:block;
  font-size:13px;
}
.activity-item p{
  margin:4px 0 0;
  color:rgba(203,213,225,.65);
  font-size:12px;
  line-height:1.5;
}
.activity-time{
  color:rgba(148,163,184,.65);
  font-size:11px;
}
.empty-note{
  color:rgba(148,163,184,.72);
  font-size:13px;
}

@media (max-width: 1100px){
  .stats-grid{
    grid-template-columns:repeat(2, minmax(0,1fr));
  }
  .hero-grid,
  .content-grid{
    grid-template-columns:1fr;
  }
}

@media (max-width: 640px){
  .dash-header h1{
    font-size:28px;
  }
  .stats-grid{
    grid-template-columns:1fr;
  }
  .stat-value{
    font-size:30px;
  }
  .card-head{
    flex-direction:column;
    align-items:flex-start;
  }
  th:nth-child(2),td:nth-child(2),
  th:nth-child(3),td:nth-child(3){
    display:none;
  }
}
`;
