"use client";
import { useState, useEffect, useCallback } from "react";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { useResponsive } from "@/hooks/useResponsive";

const F = "'Outfit','Inter',sans-serif";

const T = {
  indigo:  "#6366f1", violet: "#818cf8", cyan:    "#22d3ee",
  emerald: "#10b981", amber:  "#f59e0b", red:     "#ef4444",
  rose:    "#fb7185", panel:  "rgba(255,255,255,.03)",
  border:  "rgba(255,255,255,.07)", muted: "rgba(255,255,255,.38)",
};

interface SummaryData {
  revenue: number; expenses: number; profit: number;
  receivables: number; payables: number; cashBalance: number;
  revenueGrowth: number; expensesGrowth: number; profitGrowth: number;
  overdueAmount: number; invoicesPending: number;
  revenueHistory: number[]; expensesHistory: number[];
  topCustomers: { name: string; revenue: number }[];
  recentActivity: { type: string; description: string; amount: number; date: string }[];
}

function fmt(n: number, cur = "Rs."): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${cur} ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}${cur} ${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${cur} ${Math.round(abs).toLocaleString()}`;
}

function GrowthBadge({ pct }: { pct: number }) {
  if (!pct && pct !== 0) return null;
  const up = pct >= 0;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
      background: up ? "rgba(16,185,129,.12)" : "rgba(239,68,68,.12)",
      color: up ? T.emerald : T.red,
    }}>
      <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
        {up ? <path d="M12 4l8 16H4z"/> : <path d="M12 20l-8-16h16z"/>}
      </svg>
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function Spark({ data, color }: { data: number[]; color: string }) {
  if (!data?.length) return null;
  const W = 76, H = 26, mx = Math.max(...data, 1), mn = Math.min(...data);
  const pts = data.map((v, i) =>
    `${(i / Math.max(data.length - 1, 1)) * W},${H - ((v - mn) / (mx - mn + 0.01)) * H}`
  ).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HealthArc({ score, label, color }: { score: number; label: string; color: string }) {
  const R = 52, CX = 64, CY = 68;
  const ARC = 2 * Math.PI * R * 0.75;
  const filled = (score / 100) * ARC;
  const off = 2 * Math.PI * R * 0.125;
  return (
    <svg width={128} height={108} viewBox="0 0 128 108">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="11"
        strokeDasharray={`${ARC} ${2 * Math.PI * R}`} strokeDashoffset={off}
        strokeLinecap="round" transform={`rotate(135 ${CX} ${CY})`} />
      {score > 0 && (
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth="11"
          strokeDasharray={`${filled} ${2 * Math.PI * R}`} strokeDashoffset={off}
          strokeLinecap="round" transform={`rotate(135 ${CX} ${CY})`} />
      )}
      <text x={CX} y={CY - 6} textAnchor="middle" fill="white" fontSize="21" fontWeight="800" fontFamily={F}>{score}%</text>
      <text x={CX} y={CY + 12} textAnchor="middle" fill={T.muted} fontSize="8.5" fontFamily={F}>{label}</text>
    </svg>
  );
}

function BarChart({ rev, exp }: { rev: number[]; exp: number[] }) {
  if (!rev.length) return <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontSize: 12 }}>No data yet</div>;
  const H = 72;
  const mx = Math.max(...rev, ...exp, 1);
  const now = new Date();
  const labels = rev.map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (rev.length - 1 - i), 1);
    return d.toLocaleString("default", { month: "short" }).slice(0, 1);
  });
  return (
    <svg width="100%" height={H + 18} viewBox={`0 0 ${rev.length * 14} ${H + 18}`} preserveAspectRatio="none">
      {rev.map((r, i) => {
        const e = exp[i] || 0;
        const rH = Math.max((r / mx) * H, r > 0 ? 2 : 0);
        const eH = Math.max((e / mx) * H, e > 0 ? 2 : 0);
        const x = i * 14;
        return (
          <g key={i}>
            <rect x={x + 0.5} y={H - rH} width={5.5} height={rH} fill={T.indigo} opacity="0.75" rx="1.2" />
            <rect x={x + 7}   y={H - eH} width={5.5} height={eH} fill={T.red}    opacity="0.6"  rx="1.2" />
            <text x={x + 6} y={H + 12} textAnchor="middle" fontSize="5.5" fill={T.muted} fontFamily={F}>{labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Skeleton({ w = "100%", h = 16, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, background: "rgba(255,255,255,.06)", animation: "shimmer 1.4s ease-in-out infinite" }} />
  );
}

const SHIMMER = `@keyframes shimmer{0%,100%{opacity:.5}50%{opacity:1}}`;
const SPIN_CSS = `@keyframes spin{to{transform:rotate(360deg)}}`;

const QUICK = [
  { label: "New Invoice",          href: "/dashboard/sales-invoice",       color: T.indigo,  icon: <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/> },
  { label: "Sales Order",          href: "/dashboard/sales-order",          color: T.emerald, icon: <><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4z"/></> },
  { label: "New Purchase",         href: "/dashboard/purchase-invoice",     color: T.violet,  icon: <><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></> },
  { label: "Customer Statement",   href: "/dashboard/customer-statement",   color: T.amber,   icon: <><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/></> },
  { label: "Payment Follow-up",    href: "/dashboard/payment-followup",     color: T.rose,    icon: <><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></> },
  { label: "Profit & Loss",        href: "/dashboard/reports/profit-loss",  color: T.cyan,    icon: <><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></> },
  { label: "Balance Sheet",        href: "/dashboard/reports/balance-sheet",color: "#a78bfa", icon: <><path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/></> },
  { label: "Trial Balance",        href: "/dashboard/reports/trial-balance",color: T.emerald, icon: <><path d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></> },
];

const ACT_COLORS: Record<string, string> = {
  invoice: T.indigo, purchase: T.violet, payment: T.emerald, order: T.amber, expense: T.red,
};

export default function OwnerDashboardPage() {
  const { isMobile } = useResponsive();
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const [companyName, setCompanyName] = useState("");
  const [cur, setCur] = useState("Rs.");
  const [ownerName, setOwnerName] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    const user = getCurrentUser();
    if (!user) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const h = { "x-user-id": user.id, "x-user-role": user.role, "x-company-id": user.companyId || "" };
    setOwnerName(user.name || user.email || "");
    try {
      const [sum, co] = await Promise.all([
        fetch(`/api/reports/dashboard-summary?period=${period}`, { headers: h }).then(r => r.ok ? r.json() : null),
        fetch("/api/me/company", { headers: h }).then(r => r.ok ? r.json() : null),
      ]);
      if (sum) setData(sum);
      if (co?.name) setCompanyName(co.name);
      if (co?.currency) setCur(co.currency);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const margin    = data?.revenue ? Math.max(0, Math.min(100, Math.round((data.profit / data.revenue) * 100))) : 0;
  const hColor    = margin >= 20 ? T.emerald : margin >= 5 ? T.amber : T.red;
  const hLabel    = margin >= 20 ? "Healthy" : margin >= 5 ? "Moderate" : "Watch";
  const profitPos = (data?.profit ?? 0) >= 0;

  const KPIS = [
    { label: "Revenue",     value: fmt(data?.revenue ?? 0, cur),   growth: data?.revenueGrowth,  color: T.emerald, spark: data?.revenueHistory,  href: "/dashboard/reports/profit-loss" },
    { label: "Expenses",    value: fmt(data?.expenses ?? 0, cur),  growth: data?.expensesGrowth, color: T.red,     spark: data?.expensesHistory, href: "/dashboard/expense-vouchers" },
    { label: "Net Profit",  value: fmt(data?.profit ?? 0, cur),    growth: data?.profitGrowth,   color: profitPos ? T.violet : T.rose, spark: data?.revenueHistory?.map((r, i) => r - (data?.expensesHistory?.[i] || 0)), href: "/dashboard/reports/profit-loss" },
    { label: "Receivables", value: fmt(data?.receivables ?? 0, cur), color: T.amber, href: "/dashboard/customer-statement" },
    { label: "Payables",    value: fmt(data?.payables ?? 0, cur),    color: T.cyan,  href: "/dashboard/supplier-statement" },
    { label: "Cash Balance",value: fmt(data?.cashBalance ?? 0, cur), color: T.emerald, href: "/dashboard/bank-reconciliation" },
  ];

  return (
    <div style={{ minHeight: "100vh", padding: "28px 28px 48px", fontFamily: F, color: "var(--text-primary)" }}>
      <style>{SHIMMER}{SPIN_CSS}</style>

      {/* ── HERO ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>Owner Dashboard</h1>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "rgba(99,102,241,.15)", color: T.violet, border: "1px solid rgba(99,102,241,.25)" }}>
              Executive View
            </span>
          </div>
          <div style={{ fontSize: 13, color: T.muted }}>{ownerName || companyName ? `${companyName}${ownerName ? ` · ${ownerName}` : ""}` : "Loading…"}</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Period tabs */}
          <div style={{ display: "flex", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: 3, gap: 2 }}>
            {(["month", "quarter", "year"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                background: period === p ? T.indigo : "transparent",
                color: period === p ? "#fff" : T.muted,
                border: "none", borderRadius: 7, padding: "5px 14px",
                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: F,
              }}>
                {p === "month" ? "Month" : p === "quarter" ? "Quarter" : "Year"}
              </button>
            ))}
          </div>
          {/* Refresh */}
          <button onClick={() => load(true)} disabled={refreshing} style={{
            width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.border}`,
            background: T.panel, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" fill="none" stroke={T.violet} strokeWidth="2" viewBox="0 0 24 24"
              style={{ animation: refreshing ? "spin .7s linear infinite" : "none" }}>
              <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/>
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 14 }}>
            {Array(6).fill(0).map((_, i) => (
              <div key={i} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: isMobile ? "12px 10px" : "20px 22px" }}>
                <Skeleton w="50%" h={10} /><div style={{ height: 10 }} />
                <Skeleton w="70%" h={24} /><div style={{ height: 8 }} />
                <Skeleton w="40%" h={8} />
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: 16 }}>
            <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 22, height: 200 }}><Skeleton h={160} /></div>
            <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 22, height: 200 }}><Skeleton h={160} /></div>
          </div>
        </div>
      ) : (
        <>
          {/* ── KPI GRID ── */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 14, marginBottom: 16 }}>
            {KPIS.map((k, i) => {
              const inner = (
                <div style={{
                  background: T.panel, border: `1px solid ${T.border}`,
                  borderTop: `3px solid ${k.color}`,
                  borderRadius: 14, padding: isMobile ? "12px 10px" : "18px 20px", height: "100%",
                  boxSizing: "border-box", transition: "border-color .2s",
                  position: "relative", overflow: "hidden",
                }}>
                  {/* glow orb */}
                  <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `${k.color}12`, filter: "blur(20px)", pointerEvents: "none" }} />
                  <div style={{ fontSize: 10.5, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{k.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: k.color, lineHeight: 1, marginBottom: 6 }}>{k.value}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {k.growth !== undefined ? <GrowthBadge pct={k.growth} /> : <span />}
                    {k.spark && <Spark data={k.spark} color={k.color} />}
                  </div>
                </div>
              );
              return k.href ? (
                <Link key={i} prefetch={false} href={k.href} style={{ textDecoration: "none" }}>{inner}</Link>
              ) : <div key={i}>{inner}</div>;
            })}
          </div>

          {/* ── ALERTS ── */}
          {((data?.overdueAmount ?? 0) > 0 || (data?.payables ?? 0) > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: (data?.overdueAmount ?? 0) > 0 && (data?.payables ?? 0) > 0 ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 16 }}>
              {(data?.overdueAmount ?? 0) > 0 && (
                <div style={{ background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.2)", borderLeft: `3px solid ${T.red}`, borderRadius: 12, padding: "13px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <svg width="18" height="18" fill="none" stroke={T.red} strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.red }}>Overdue Receivables</div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{fmt(data?.overdueAmount ?? 0, cur)} across {data?.invoicesPending} invoices</div>
                    </div>
                  </div>
                  <Link prefetch={false} href="/dashboard/payment-followup" style={{ padding: "7px 14px", borderRadius: 8, background: T.red, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>Follow Up</Link>
                </div>
              )}
              {(data?.payables ?? 0) > 0 && (
                <div style={{ background: "rgba(34,211,238,.07)", border: "1px solid rgba(34,211,238,.18)", borderLeft: `3px solid ${T.cyan}`, borderRadius: 12, padding: "13px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <svg width="18" height="18" fill="none" stroke={T.cyan} strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.cyan }}>Supplier Payables</div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{fmt(data?.payables ?? 0, cur)} owed to suppliers</div>
                    </div>
                  </div>
                  <Link prefetch={false} href="/dashboard/supplier-statement" style={{ padding: "7px 14px", borderRadius: 8, background: "rgba(34,211,238,.15)", color: T.cyan, fontSize: 12, fontWeight: 700, textDecoration: "none", border: `1px solid rgba(34,211,238,.3)`, flexShrink: 0 }}>View</Link>
                </div>
              )}
            </div>
          )}

          {/* ── CHART + HEALTH ── */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: 16, marginBottom: 16 }}>

            {/* Bar chart */}
            <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: isMobile ? "12px 11px" : "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>Revenue vs Expenses — 12 Months</div>
                <div style={{ display: "flex", gap: 14, fontSize: 11, color: T.muted }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: T.indigo, display: "inline-block" }}/> Revenue</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: T.red, display: "inline-block" }}/> Expenses</span>
                </div>
              </div>
              <BarChart rev={data?.revenueHistory ?? []} exp={data?.expensesHistory ?? []} />

              {/* Mini P&L waterfall */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 10, marginTop: 18, borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
                {[
                  { label: "Revenue",    value: data?.revenue ?? 0,  color: T.emerald },
                  { label: "Expenses",   value: -(data?.expenses ?? 0), color: T.red },
                  { label: "Gross",      value: (data?.revenue ?? 0) - (data?.expenses ?? 0), color: T.violet },
                  { label: "Net Profit", value: data?.profit ?? 0,   color: profitPos ? T.cyan : T.rose },
                ].map((row, i) => (
                  <div key={i} style={{ textAlign: "center", padding: "10px 8px", borderRadius: 10, background: `${row.color}0c`, border: `1px solid ${row.color}20` }}>
                    <div style={{ fontSize: 10, color: T.muted, marginBottom: 4 }}>{row.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: row.color }}>{fmt(row.value, cur)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Health arc + ratio cards */}
            <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: isMobile ? "12px 10px" : "20px 22px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, alignSelf: "flex-start" }}>Financial Health</div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 16, alignSelf: "flex-start" }}>Based on profit margin</div>
              <HealthArc score={margin} label={hLabel} color={hColor} />
              <div style={{ width: "100%", display: "grid", gap: 8, marginTop: 12 }}>
                {[
                  { label: "Profit Margin",        value: `${margin}%`,                                                     color: hColor },
                  { label: "Receivables Ratio",    value: data?.revenue ? `${Math.round((data.receivables / data.revenue) * 100)}%` : "—", color: T.amber },
                  { label: "Cash vs Receivables",  value: data?.receivables ? `${Math.round((data.cashBalance / (data.receivables || 1)) * 100)}%` : "—", color: T.cyan },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: `${row.color}08`, border: `1px solid ${row.color}18` }}>
                    <span style={{ fontSize: 11, color: T.muted }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── QUICK ACTIONS + TOP CUSTOMERS ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

            {/* Quick actions */}
            <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: isMobile ? "12px 10px" : "20px 22px" }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Quick Actions</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {QUICK.map(q => (
                  <Link key={q.href} prefetch={false} href={q.href} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
                    background: `${q.color}0d`, border: `1px solid ${q.color}22`,
                    borderRadius: 10, textDecoration: "none", color: "var(--text-primary)",
                    fontSize: 12.5, fontWeight: 600, transition: "border-color .18s, background .18s",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${q.color}50`; (e.currentTarget as HTMLElement).style.background = `${q.color}18`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${q.color}22`; (e.currentTarget as HTMLElement).style.background = `${q.color}0d`; }}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: `${q.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="15" height="15" fill="none" stroke={q.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">{q.icon}</svg>
                    </div>
                    {q.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Top Customers */}
            <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: isMobile ? "12px 10px" : "20px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>Top Customers</div>
                <Link prefetch={false} href="/dashboard/customer-statement" style={{ fontSize: 11, color: T.violet, textDecoration: "none" }}>View all →</Link>
              </div>
              {!data?.topCustomers?.length ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: T.muted, fontSize: 13 }}>No sales data for this period.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {data.topCustomers.slice(0, 5).map((c, i) => {
                    const pct = (c.revenue / (data.topCustomers[0]?.revenue || 1)) * 100;
                    const barColor = [T.indigo, T.violet, T.cyan, T.emerald, T.amber][i];
                    return (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: `${barColor}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: barColor }}>
                              {i + 1}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                          </div>
                          <span style={{ fontSize: 12, color: barColor, fontWeight: 700 }}>{fmt(c.revenue, cur)}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,.05)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${barColor},${barColor}99)`, borderRadius: 3, transition: "width .6s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── RECENT ACTIVITY ── */}
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: isMobile ? "12px 11px" : "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Recent Activity</div>
              <span style={{ fontSize: 11, color: T.muted }}>{data?.recentActivity?.length ?? 0} events</span>
            </div>
            {!data?.recentActivity?.length ? (
              <div style={{ textAlign: "center", padding: "28px 0", color: T.muted, fontSize: 13 }}>No recent activity recorded.</div>
            ) : (
              <div>
                {data.recentActivity.slice(0, 8).map((a, i) => {
                  const color = ACT_COLORS[a.type] || T.violet;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 0", borderBottom: i < Math.min(7, (data.recentActivity?.length ?? 0) - 1) ? `1px solid ${T.border}` : "none" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="15" height="15" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                          {a.type === "invoice"  && <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>}
                          {a.type === "purchase" && <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-2 8h14"/>}
                          {a.type === "payment"  && <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>}
                          {a.type === "order"    && <><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4z"/></>}
                          {a.type === "expense"  && <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>}
                          {!["invoice","purchase","payment","order","expense"].includes(a.type) && <circle cx="12" cy="12" r="10"/>}
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.description}</div>
                        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{a.date}</div>
                      </div>
                      {a.amount > 0 && (
                        <div style={{ fontSize: 13, fontWeight: 800, color, flexShrink: 0 }}>{fmt(a.amount, cur)}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
