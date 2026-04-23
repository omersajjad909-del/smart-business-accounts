"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type RevenuePayload = {
  mrrSeries: { label: string; value: number }[];
  planDistribution: { starter: number; pro: number; enterprise: number };
};

export default function AdminRevenuePage() {
  const [data, setData] = useState<RevenuePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const u = getCurrentUser();
        const headers: Record<string, string> = {};
        if (u?.role) headers["x-user-role"] = u.role;
        if (u?.id) headers["x-user-id"] = u.id;
        if (u?.companyId) headers["x-company-id"] = u.companyId;

        const r = await fetch("/api/admin/web/revenue", {
          cache: "no-store",
          headers,
          credentials: "include" as RequestCredentials,
        });

        if (!active) return;

        if (r.ok) {
          setData(await r.json());
        } else {
          setData({
            mrrSeries: [],
            planDistribution: { starter: 0, pro: 0, enterprise: 0 },
          });
        }
      } catch {
        if (!active) return;
        setData({
          mrrSeries: [],
          planDistribution: { starter: 0, pro: 0, enterprise: 0 },
        });
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const planBars = [
    { label: "Starter", value: data?.planDistribution.starter ?? 0, color: "#6d7c97" },
    { label: "Pro", value: data?.planDistribution.pro ?? 0, color: "#6b63ff" },
    { label: "Enterprise", value: data?.planDistribution.enterprise ?? 0, color: "#1fa0de" },
  ];

  return (
    <div className="revenue-page">
      <style>{styles}</style>

      <div className="revenue-shell">
        <div className="revenue-header">
          <h1>Revenue Analytics</h1>
        </div>

        <div className="revenue-grid">
          <section className="revenue-card">
            <h2>MRR Growth (last 6 months)</h2>
            <div className="chart-frame">
              <RevenueLineChart rows={data?.mrrSeries || []} loading={loading} />
            </div>
          </section>

          <section className="revenue-card">
            <h2>Plan Distribution (Active)</h2>
            <div className="bars-wrap">
              {planBars.map((item) => (
                <div key={item.label} className="bar-row">
                  <div className="bar-label">{item.label}</div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${computePercent(item.value, planBars)}%`,
                        background: item.color,
                      }}
                    >
                      <span>{loading ? "..." : item.value}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function computePercent(value: number, all: { value: number }[]) {
  const max = Math.max(...all.map((item) => item.value), 1);
  return Math.max(16, (value / max) * 100);
}

function RevenueLineChart({ rows, loading }: { rows: RevenuePayload["mrrSeries"]; loading: boolean }) {
  const safeRows = rows.length
    ? rows
    : [
        { label: "2025-11", value: 0 },
        { label: "2025-12", value: 0 },
        { label: "2026-01", value: 0 },
        { label: "2026-02", value: 0 },
        { label: "2026-03", value: 0 },
        { label: "2026-04", value: 0 },
      ];

  const width = 760;
  const height = 290;
  const paddingX = 20;
  const paddingTop = 24;
  const paddingBottom = 38;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingX * 2;
  const max = Math.max(...safeRows.map((row) => row.value), 1);

  const points = safeRows.map((row, index) => {
    const x = paddingX + (index / Math.max(1, safeRows.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (row.value / max) * (chartHeight * 0.78 + 1);
    return { x, y, label: row.label, value: row.value };
  });

  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="line-chart" aria-hidden="true">
      <rect x="1" y="1" width={width - 2} height={height - 2} rx="8" fill="none" stroke="rgba(255,255,255,.85)" />
      <path d={path} fill="none" stroke="#1f2eff" strokeWidth="3" strokeLinecap="round" />
      {points.map((point) => (
        <g key={point.label}>
          <circle cx={point.x} cy={point.y} r="5" fill="#1f2eff" />
          <text x={point.x} y={height - 12} textAnchor="middle" fontSize="13" fill="rgba(166,176,197,.8)">
            {point.label}
          </text>
        </g>
      ))}
      {loading ? (
        <text x={paddingX + 8} y={paddingTop + 18} fontSize="14" fill="rgba(255,255,255,.74)">
          Loading...
        </text>
      ) : null}
    </svg>
  );
}

const styles = `
.revenue-page{
  min-height:100%;
}
.revenue-shell{
  background:linear-gradient(180deg, rgba(255,255,255,.96), rgba(247,249,252,.98));
  border-radius:0;
  padding:52px 30px 220px;
}
.revenue-header{
  margin-bottom:30px;
}
.revenue-header h1{
  margin:0;
  color:#f8f7ef;
  font-size:38px;
  line-height:1;
  font-weight:800;
  letter-spacing:-.05em;
}
.revenue-grid{
  display:grid;
  grid-template-columns:minmax(0, 1fr) minmax(0, 1fr);
  gap:30px;
}
.revenue-card{
  min-height:365px;
  padding:22px 20px 18px;
  border-radius:22px;
  background:#1b2748;
  box-shadow:0 10px 18px rgba(11,18,38,.18);
}
.revenue-card h2{
  margin:0 0 18px;
  color:#fffaf0;
  font-size:20px;
  font-weight:800;
  letter-spacing:-.03em;
}
.chart-frame{
  border-radius:10px;
  overflow:hidden;
}
.line-chart{
  width:100%;
  height:auto;
  display:block;
}
.bars-wrap{
  display:grid;
  gap:16px;
  margin-top:30px;
}
.bar-row{
  display:grid;
  grid-template-columns:120px minmax(0,1fr);
  align-items:center;
  gap:16px;
}
.bar-label{
  color:#fffaf0;
  font-size:16px;
  font-weight:800;
}
.bar-track{
  height:30px;
  border-radius:999px;
  background:#d8dbe2;
  overflow:hidden;
}
.bar-fill{
  height:100%;
  min-width:66px;
  border-radius:999px;
  display:flex;
  align-items:center;
  justify-content:flex-end;
  padding-right:12px;
  transition:width .3s ease;
}
.bar-fill span{
  color:white;
  font-size:14px;
  font-weight:800;
}
@media (max-width: 1100px){
  .revenue-grid{
    grid-template-columns:1fr;
  }
}
@media (max-width: 640px){
  .revenue-shell{
    padding:18px 14px 140px;
    border-radius:18px;
  }
  .revenue-header{
    margin-bottom:16px;
  }
  .revenue-header h1{
    font-size:28px;
    color:#1d2848;
  }
  .revenue-grid{
    gap:14px;
  }
  .revenue-card{
    min-height:auto;
    padding:16px 14px;
    border-radius:18px;
  }
  .revenue-card h2{
    font-size:17px;
  }
  .bars-wrap{
    gap:14px;
    margin-top:10px;
  }
  .bar-row{
    grid-template-columns:1fr;
    gap:8px;
  }
  .bar-label{
    font-size:14px;
  }
  .bar-track{
    height:28px;
  }
}
`;
