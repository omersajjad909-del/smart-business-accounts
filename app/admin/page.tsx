"use client";

const stats = [
  { title: "Total Companies", value: "61", delta: "+12.5%", tone: "purple", points: [42, 38, 44, 36, 46, 41, 49] },
  { title: "Total Users", value: "248", delta: "+8.3%", tone: "blue", points: [18, 16, 21, 17, 23, 22, 27] },
  { title: "Active Subscriptions", value: "41", delta: "+15.2%", tone: "green", points: [6, 7, 5, 9, 8, 11, 13] },
  { title: "Monthly Revenue", value: "$12,750", delta: "+18.7%", tone: "orange", points: [12, 15, 16, 15, 19, 18, 22] },
];

const chartLabels = ["May 20", "May 21", "May 22", "May 23", "May 24", "May 25", "May 26"];
const overviewSeries = [
  { name: "New Companies", color: "#9b5cff", values: [38, 36, 42, 35, 45, 39, 47] },
  { name: "New Users", color: "#4d8dff", values: [18, 16, 20, 17, 22, 21, 25] },
  { name: "Active Subscriptions", color: "#4ad37a", values: [4, 3, 6, 2, 7, 5, 8] },
];

const recentCompanies = [
  { company: "Al Noor Traders", owner: "Usman Ali", plan: "Premium", status: "Active", createdAt: "May 26, 2024" },
  { company: "Zain Enterprises", owner: "Zain Khan", plan: "Premium", status: "Active", createdAt: "May 25, 2024" },
  { company: "Umar & Sons", owner: "Umar Farooq", plan: "Standard", status: "Active", createdAt: "May 25, 2024" },
  { company: "Hassan Traders", owner: "Hassan Ali", plan: "Standard", status: "Active", createdAt: "May 24, 2024" },
  { company: "Khan Distributors", owner: "Ali Khan", plan: "Basic", status: "Active", createdAt: "May 24, 2024" },
];

const subscriptionOverview = [
  { label: "Premium", value: 20, color: "#8b5cf6" },
  { label: "Standard", value: 25, color: "#4f7cff" },
  { label: "Basic", value: 16, color: "#fb923c" },
];

const activeModules = [
  { name: "Accounting", companies: 61, width: 100 },
  { name: "Inventory", companies: 57, width: 93 },
  { name: "Sales", companies: 49, width: 80 },
  { name: "CRM", companies: 32, width: 52 },
  { name: "HRM", companies: 21, width: 34 },
];

const recentActivity = [
  { title: "New company registered", detail: "Al Noor Traders", time: "2 min ago", tone: "purple" },
  { title: "New user added", detail: "Zain Khan added by Usman Ali", time: "15 min ago", tone: "blue" },
  { title: "Subscription updated", detail: "Zain Enterprises - Plan upgraded", time: "1 hour ago", tone: "green" },
  { title: "Payment received", detail: "Payment of $199 received from & Sons", time: "2 hours ago", tone: "orange" },
];

export default function AdminDashboardPage() {
  return (
    <div className="admin-dashboard">
      <style>{dashboardStyles}</style>

      <section className="dash-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your system and platform.</p>
        </div>
        <button type="button" className="dash-range">
          <span>May 20 - May 26, 2024</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      </section>

      <section className="stats-grid">
        {stats.map((item) => (
          <article key={item.title} className={`dash-card stat-card tone-${item.tone}`}>
            <div className="stat-row">
              <div className="stat-icon">{item.title.slice(0, 1)}</div>
              <div>
                <div className="stat-title">{item.title}</div>
                <div className="stat-value">{item.value}</div>
              </div>
            </div>
            <div className="stat-footer">
              <span>{item.delta} vs last month</span>
              <MiniLine points={item.points} color={toneColor(item.tone)} />
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
                {overviewSeries.map((series) => (
                  <span key={series.name} className="legend-item">
                    <i style={{ background: series.color }} />
                    {series.name}
                  </span>
                ))}
              </div>
            </div>
            <button type="button" className="chip">This Week</button>
          </div>
          <OverviewChart />
        </article>

        <article className="dash-card system-card">
          <h2>System Health</h2>
          <div className="gauge-wrap">
            <div className="gauge">
              <div className="gauge-inner">
                <strong>98%</strong>
                <span>Healthy</span>
              </div>
            </div>
          </div>
          <ul className="health-list">
            {["Server Status", "Database", "Queue Workers", "Storage", "Backup Status"].map((item) => (
              <li key={item}>
                <span>{item}</span>
                <span className="ok-mark">OK</span>
              </li>
            ))}
          </ul>
          <button type="button" className="panel-button">View System Health</button>
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
                {recentCompanies.map((item) => (
                  <tr key={item.company}>
                    <td>{item.company}</td>
                    <td>{item.owner}</td>
                    <td>{item.plan}</td>
                    <td><span className="status-pill">{item.status}</span></td>
                    <td>{item.createdAt}</td>
                  </tr>
                ))}
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
            <DonutChart />
            <div className="donut-list">
              {subscriptionOverview.map((item) => {
                const total = subscriptionOverview.reduce((sum, current) => sum + current.value, 0);
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
            {activeModules.map((item) => (
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
          </div>
        </article>

        <article className="dash-card">
          <div className="card-head">
            <h2>Recent Activity</h2>
            <a href="/admin/logs">View All</a>
          </div>
          <div className="activity-list">
            {recentActivity.map((item) => (
              <div key={item.title} className="activity-item">
                <span className={`activity-dot tone-${item.tone}`} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                <span className="activity-time">{item.time}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="dash-card">
          <div className="card-head">
            <h2>Storage Usage</h2>
            <a href="/admin/settings">View All</a>
          </div>
          <div className="storage-box">
            <div className="storage-ring">
              <div>
                <strong>65%</strong>
                <span>Used</span>
              </div>
            </div>
            <div className="storage-meta">
              <span>Total Storage <b>100 GB</b></span>
              <span>Used Storage <b>65 GB</b></span>
              <span>Free Storage <b>35 GB</b></span>
            </div>
          </div>
          <button type="button" className="panel-button">Manage Storage</button>
        </article>
      </section>
    </div>
  );
}

function toneColor(tone: string) {
  if (tone === "blue") return "#4f7cff";
  if (tone === "green") return "#22c55e";
  if (tone === "orange") return "#f59e0b";
  return "#8b5cf6";
}

function MiniLine({ points, color }: { points: number[]; color: string }) {
  const width = 76;
  const height = 28;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const d = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
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

function OverviewChart() {
  const width = 760;
  const height = 290;
  const padding = 26;
  const max = 60;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="overview-chart" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((line) => {
        const y = padding + ((height - padding * 2) / 4) * line;
        return <line key={line} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,.06)" />;
      })}
      {chartLabels.map((label, index) => {
        const x = padding + ((width - padding * 2) / (chartLabels.length - 1)) * index;
        return (
          <text key={label} x={x} y={height - 8} textAnchor="middle" fill="rgba(148,163,184,.72)" fontSize="11">
            {label}
          </text>
        );
      })}
      {overviewSeries.map((series) => {
        const path = series.values
          .map((value, index) => {
            const x = padding + ((width - padding * 2) / (series.values.length - 1)) * index;
            const y = height - padding - (value / max) * (height - padding * 2);
            return `${index === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ");

        return (
          <g key={series.name}>
            <path d={path} fill="none" stroke={series.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {series.values.map((value, index) => {
              const x = padding + ((width - padding * 2) / (series.values.length - 1)) * index;
              const y = height - padding - (value / max) * (height - padding * 2);
              return <circle key={`${series.name}-${index}`} cx={x} cy={y} r="5" fill={series.color} stroke="rgba(7,11,22,1)" strokeWidth="3" />;
            })}
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart() {
  const total = subscriptionOverview.reduce((sum, item) => sum + item.value, 0);
  const arcs = subscriptionOverview.map((item, index) => {
    const previous = subscriptionOverview.slice(0, index).reduce((sum, current) => sum + current.value, 0);
    return {
      ...item,
      length: (item.value / total) * 364.42,
      offset: (previous / total) * 364.42,
    };
  });

  return (
    <svg width="190" height="190" viewBox="0 0 190 190" className="donut-svg" aria-hidden="true">
      <circle cx="95" cy="95" r="58" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="22" />
      {arcs.map((item) => {
        return (
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
        );
      })}
      <text x="95" y="90" textAnchor="middle" fill="#f8fafc" fontSize="34" fontWeight="800">61</text>
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
.dash-range,.chip,.panel-button{
  border:none;
  cursor:pointer;
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
  font:inherit;
  font-size:13px;
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
  font:inherit;
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
  background:conic-gradient(#4ad37a 0 176deg, rgba(255,255,255,.08) 176deg 360deg);
  display:grid;
  place-items:center;
}
.gauge::after{
  content:"";
  width:126px;
  height:126px;
  border-radius:50%;
  background:#0f1729;
  position:absolute;
}
.gauge{
  position:relative;
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
.panel-button{
  margin-top:auto;
  padding:13px 16px;
  border-radius:14px;
  background:rgba(124,58,237,.24);
  color:#fff;
  font:inherit;
  font-size:13px;
  font-weight:700;
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
.status-pill{
  display:inline-flex;
  padding:5px 9px;
  border-radius:999px;
  background:rgba(34,197,94,.16);
  color:#86efac;
  font-size:11px;
  font-weight:700;
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
.storage-box{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:18px;
  flex-wrap:wrap;
}
.storage-ring{
  width:164px;
  height:164px;
  border-radius:50%;
  background:conic-gradient(#8b5cf6 0 234deg, rgba(255,255,255,.08) 234deg 360deg);
  display:grid;
  place-items:center;
}
.storage-ring::after{
  content:"";
  width:118px;
  height:118px;
  border-radius:50%;
  background:#0f1729;
  position:absolute;
}
.storage-ring{
  position:relative;
}
.storage-ring > div{
  position:relative;
  z-index:1;
  text-align:center;
}
.storage-ring strong{
  display:block;
  font-size:30px;
  line-height:1;
}
.storage-ring span{
  color:rgba(203,213,225,.7);
  font-size:13px;
}
.storage-meta{
  flex:1;
  min-width:180px;
  display:grid;
  gap:12px;
  color:rgba(203,213,225,.74);
  font-size:13px;
}
.storage-meta b{
  color:#fff;
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
