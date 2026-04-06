"use client";
import { useEffect, useRef, useState } from "react";
import { useRequirePermission } from "@/lib/useRequirePermission";
import { PERMISSIONS } from "@/lib/permissions";
import Link from "next/link";
import type { CSSProperties } from "react";
import { getCurrentUser, getStoredDemoBusinessPreference } from "@/lib/auth";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/businessModules";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import DemoBusinessShowcase from "./DemoBusinessShowcase";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";

type ChartPoint = { label: string; value: number; color?: string };
type ChartData = {
  salesTrend?: ChartPoint[];
  topCustomers?: { name: string; total: number }[];
  topItems?: { name: string; amount: number }[];
  purchasesTrend?: ChartPoint[];
} | null;

/* ── Tooltip Styles ───────────────────────────────────────── */
const TooltipStyle = {
  contentStyle: {
    background: "rgba(15,17,40,0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
  },
  labelStyle: { color: "rgba(255,255,255,0.45)", fontWeight: 600, marginBottom: 4 },
  cursor: { fill: "rgba(255,255,255,0.03)" },
};

/* ── Section header helper ────────────────────────────────── */
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ── Chart card wrapper ───────────────────────────────────── */
function ChartCard({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      borderRadius: 16, padding: "20px 20px 14px",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── AI Widget Types ──────────────────────────────────────────────────────────
interface AIAlert { severity: "critical" | "warning" | "info"; title: string; description: string; link?: string }
interface AIWidgetData {
  healthScore: number;
  revenueChange: number;
  expenseChange: number;
  profitChange: number;
  cashRisk: "low" | "medium" | "high";
  alerts: AIAlert[];
  topRec: string;
}

// ─── AI Widget (lazy loads, non-blocking) ─────────────────────────────────────
function AIWidget({ companyId, role, userId }: { companyId: string; role: string; userId: string }) {
  const [data, setData] = useState<AIWidgetData | null>(null);
  const [widgetLoading, setWidgetLoading] = useState(true);
  const [widgetFailed, setWidgetFailed] = useState(false);
  const [chat, setChat] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatReply, setChatReply] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const headers: Record<string, string> = {
      "x-company-id": companyId, "x-user-id": userId, "x-user-role": role,
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    // Load alerts (fast) + insights (for health score)
    Promise.allSettled([
      fetch("/api/ai/alerts", { headers, signal: controller.signal }).then(r => r.json()),
      fetch("/api/ai/insights", { headers, signal: controller.signal }).then(r => r.json()),
    ]).then(([alertsRes, insightsRes]) => {
      const alerts = alertsRes.status === "fulfilled" ? (alertsRes.value.alerts || []) : [];
      const ctx = insightsRes.status === "fulfilled" ? insightsRes.value.context : null;
      if (!ctx) {
        setWidgetFailed(true);
        setWidgetLoading(false);
        return;
      }

      const revChange = ctx.revenue?.change || 0;
      const expChange = ctx.expenses?.change || 0;
      const profitChange = ctx.profit?.change || 0;
      const profit = ctx.profit?.thisMonth || 0;
      const overdue = ctx.receivables?.overdue || 0;
      const rev = ctx.revenue?.thisMonth || 0;

      // Calculate health score
      let score = 60;
      if (revChange > 0) score += Math.min(revChange, 15);
      if (revChange < 0) score += Math.max(revChange, -15);
      if (expChange < revChange) score += 10;
      if (expChange > 20) score -= 10;
      if (profit > 0) score += 10;
      if (profit < 0) score -= 20;
      if (overdue > rev * 0.3) score -= 8;
      score = Math.max(20, Math.min(100, Math.round(score)));

      const cashRisk: "low" | "medium" | "high" = profit < 0 ? "high" : overdue > rev * 0.25 ? "medium" : "low";

      // Top recommendation from alerts
      const critical = alerts.find((a: AIAlert) => a.severity === "critical");
      const warning  = alerts.find((a: AIAlert) => a.severity === "warning");
      const topRec = critical?.title || warning?.title || (alerts[0]?.title) || "All systems healthy ✓";

      setData({ healthScore: score, revenueChange: revChange, expenseChange: expChange, profitChange, cashRisk, alerts: alerts.slice(0, 3), topRec });
      setWidgetFailed(false);
      setWidgetLoading(false);
    }).catch(() => {
      setWidgetFailed(true);
      setWidgetLoading(false);
    }).finally(() => {
      clearTimeout(timeoutId);
    });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [companyId, role, userId]);

  async function quickChat() {
    if (!chat.trim() || chatLoading) return;
    const msg = chat.trim();
    setChat("");
    setChatLoading(true);
    setChatReply("");
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-company-id": companyId, "x-user-id": userId, "x-user-role": role },
        body: JSON.stringify({ message: msg, history: [] }),
      });
      if (!res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setChatReply(accumulated);
      }
    } catch { setChatReply("Error — please try again."); }
    finally { setChatLoading(false); }
  }

  if (widgetLoading && !data) return (
    <div style={{ borderRadius: 16, padding: "18px 20px", background: "rgba(99,102,241,.05)", border: "1px solid rgba(99,102,241,.15)", marginBottom: 18, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 16, height: 16, border: "2px solid rgba(99,102,241,.3)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>AI Financial Intelligence loading…</span>
    </div>
  );

  if (widgetFailed || !data) return (
    <div style={{ borderRadius: 16, padding: "16px 20px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.78)", marginBottom: 4 }}>AI Financial Intelligence</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>The AI-summary has not been loaded yet. You can view the data from the full AI-center..</div>
      </div>
      <Link href="/dashboard/ai" style={{ padding: "8px 14px", borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", fontSize: 11, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
        Open AI →
      </Link>
    </div>
  );

  const scoreColor = data.healthScore >= 75 ? "#10b981" : data.healthScore >= 55 ? "#f59e0b" : "#ef4444";
  const riskColor  = data.cashRisk === "high" ? "#ef4444" : data.cashRisk === "medium" ? "#f59e0b" : "#10b981";
  const sign = (n: number) => (n >= 0 ? "+" : "") + n + "%";

  return (
    <div style={{ marginBottom: 18 }}>
      {/* AI Banner strip */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(99,102,241,.22)", background: "linear-gradient(135deg, rgba(99,102,241,.08) 0%, rgba(79,70,229,.05) 100%)", overflow: "hidden" }}>

        {/* Top row — 5 metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr auto", gap: 0, borderBottom: "1px solid rgba(255,255,255,.06)" }}>

          {/* Health Score */}
          <div style={{ padding: "14px 20px", borderRight: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", width: 46, height: 46, flexShrink: 0 }}>
              <svg width="46" height="46" viewBox="0 0 46 46">
                <circle cx="23" cy="23" r="18" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="4" />
                <circle cx="23" cy="23" r="18" fill="none" stroke={scoreColor} strokeWidth="4"
                  strokeDasharray={`${(data.healthScore / 100) * 113} 113`}
                  strokeLinecap="round" transform="rotate(-90 23 23)" />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: scoreColor }}>{data.healthScore}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>AI Health</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: scoreColor }}>{data.healthScore >= 75 ? "Good" : data.healthScore >= 55 ? "Fair" : "Poor"}</div>
            </div>
          </div>

          {/* Revenue Trend */}
          <div style={{ padding: "14px 18px", borderRight: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>Revenue</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: data.revenueChange >= 0 ? "#10b981" : "#ef4444" }}>
              {data.revenueChange >= 0 ? "▲" : "▼"} {sign(data.revenueChange)}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>vs last month</div>
          </div>

          {/* Expense Trend */}
          <div style={{ padding: "14px 18px", borderRight: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>Expenses</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: data.expenseChange <= 0 ? "#10b981" : data.expenseChange > 20 ? "#ef4444" : "#f59e0b" }}>
              {data.expenseChange >= 0 ? "▲" : "▼"} {sign(data.expenseChange)}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>vs last month</div>
          </div>

          {/* Cash Risk */}
          <div style={{ padding: "14px 18px", borderRight: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>Cash Risk</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: riskColor, textTransform: "capitalize" }}>
              {data.cashRisk === "high" ? "🔴" : data.cashRisk === "medium" ? "🟡" : "🟢"} {data.cashRisk}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>30-day outlook</div>
          </div>

          {/* CTA */}
          <div style={{ padding: "14px 20px", display: "flex", alignItems: "center" }}>
            <Link href="/dashboard/ai" style={{ padding: "8px 16px", borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", fontSize: 11, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(99,102,241,.35)" }}>
              AI Dashboard →
            </Link>
          </div>
        </div>

        {/* Bottom row — alerts + top rec + quick chat */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 0 }}>

          {/* Left: alerts strip + top rec */}
          <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {data.alerts.length > 0 ? (
              <>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", flexShrink: 0 }}>🔔 Alerts:</span>
                {data.alerts.map((a, i) => (
                  <Link key={i} href={a.link || "/dashboard/ai"} style={{
                    padding: "4px 10px", borderRadius: 20, textDecoration: "none", fontSize: 11, fontWeight: 600,
                    background: a.severity === "critical" ? "rgba(239,68,68,.12)" : a.severity === "warning" ? "rgba(245,158,11,.1)" : "rgba(99,102,241,.1)",
                    border: `1px solid ${a.severity === "critical" ? "rgba(239,68,68,.3)" : a.severity === "warning" ? "rgba(245,158,11,.3)" : "rgba(99,102,241,.25)"}`,
                    color: a.severity === "critical" ? "#fca5a5" : a.severity === "warning" ? "#fcd34d" : "#a5b4fc",
                  }}>
                    {a.severity === "critical" ? "🚨" : a.severity === "warning" ? "⚠️" : "ℹ️"} {a.title}
                  </Link>
                ))}
              </>
            ) : (
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>✅ No active alerts — financials look healthy</span>
            )}
          </div>

          {/* Right: mini chat toggle */}
          <div style={{ padding: "10px 20px", borderLeft: "1px solid rgba(255,255,255,.06)" }}>
            <button onClick={() => { setChatOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#a5b4fc", fontSize: 12, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
              💬 Ask AI {chatOpen ? "▲" : "▼"}
            </button>
          </div>
        </div>

        {/* Inline quick-chat (collapsible) */}
        {chatOpen && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "12px 20px" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: chatReply ? 10 : 0 }}>
              <input ref={inputRef} value={chat} onChange={e => setChat(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") quickChat(); }}
                placeholder="Ask a quick question… e.g. What is my profit this month?"
                style={{ flex: 1, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 9, padding: "8px 14px", color: "white", fontSize: 12, fontFamily: "inherit", outline: "none" }} />
              <button onClick={quickChat} disabled={!chat.trim() || chatLoading}
                style={{ padding: "8px 16px", borderRadius: 9, background: chat.trim() && !chatLoading ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.08)", border: "none", color: "white", fontSize: 12, fontWeight: 700, cursor: chat.trim() && !chatLoading ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                {chatLoading ? "…" : "Ask"}
              </button>
              <Link href="/dashboard/ai?tab=chat" style={{ padding: "8px 14px", borderRadius: 9, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.5)", fontSize: 11, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center" }}>
                Full AI
              </Link>
            </div>
            {chatReply && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", fontSize: 12, color: "rgba(255,255,255,.75)", lineHeight: 1.7, maxHeight: 120, overflowY: "auto" }}>
                {chatLoading && <span style={{ display: "inline-block", width: 2, height: 12, background: "#6366f1", animation: "spin .8s linear infinite", marginRight: 4 }} />}
                {chatReply}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardContent() {
  const allowed = useRequirePermission(PERMISSIONS.VIEW_DASHBOARD);
  const storedUser = getCurrentUser() as { businessType?: string | null; email?: string | null } | null;
  const initialDemoBusiness =
    typeof window !== "undefined" && storedUser?.email === "finovaos.app@gmail.com"
      ? (getStoredDemoBusinessPreference() as BusinessType | null)
      : null;
  const [companyInfo, setCompanyInfo] = useState<{ plan: string; subscriptionStatus: string; baseCurrency: string } | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType>(initialDemoBusiness || (storedUser?.businessType as BusinessType) || "trading");
  const [stats, setStats] = useState({
    sales: 0, purchases: 0, profit: 0, customers: 0,
    overdueReceivables: 0, overdueReceivablesCount: 0, lowStockCount: 0,
  });
  const [charts, setCharts] = useState<ChartData>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (allowed !== true) return;
    async function fetchStats() {
      try {
        const user = getCurrentUser();
        if (!user?.companyId) { setLoading(false); return; }
        const headers: Record<string, string> = {};
        if (user?.role)      headers["x-user-role"]  = user.role;
        if (user?.id)        headers["x-user-id"]    = user.id;
        if (user?.companyId) headers["x-company-id"] = user.companyId;

        const results = await Promise.allSettled([
          fetch("/api/reports/dashboard-summary", { headers, cache: "no-store" }),
          fetch("/api/reports/dashboard-charts?period=month", { headers, cache: "no-store" }),
          fetch("/api/me/company", { headers, cache: "no-store" }),
          fetch("/api/company/business-type", { headers, cache: "no-store" }),
        ]);
        const [sR, cR, mR, bR] = results;
        const statsRes  = sR.status === "fulfilled" ? sR.value : null;
        const chartsRes = cR.status === "fulfilled" ? cR.value : null;
        const subRes    = mR.status === "fulfilled" ? mR.value : null;
        const btRes     = bR.status === "fulfilled" ? bR.value : null;

        if (statsRes?.ok) {
          const d = await statsRes.json();
          setStats({
            sales: Number(d?.sales || 0), purchases: Number(d?.purchases || 0),
            profit: Number(d?.profit || 0), customers: Number(d?.customers || 0),
            overdueReceivables: Number(d?.overdueReceivables || 0),
            overdueReceivablesCount: Number(d?.overdueReceivablesCount || 0),
            lowStockCount: Number(d?.lowStockCount || 0),
          });
        }
        if (chartsRes?.ok) setCharts(await chartsRes.json());
        if (btRes?.ok) {
          const b = await btRes.json();
          if (initialDemoBusiness) {
            setBusinessType(initialDemoBusiness);
          } else if (b.businessType) {
            setBusinessType(b.businessType as BusinessType);
          }
        }
        if (subRes?.ok) {
          const s = await subRes.json();
          if (initialDemoBusiness) {
            setBusinessType(initialDemoBusiness);
          } else if (s.businessType) {
            setBusinessType(s.businessType as BusinessType);
          }
          setCompanyInfo({
            plan: String(s.plan || "STARTER"),
            subscriptionStatus: String(s.subscriptionStatus || "ACTIVE"),
            baseCurrency: CURRENCY_SYMBOL[String(s.baseCurrency || "")] || CURRENCY_SYMBOL["USD"],
          });
        }
      } catch (e) {
        console.error("Dashboard Error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [allowed]);

  useEffect(() => {
    if (storedUser?.email !== "finovaos.app@gmail.com") return;
    const preferredDemoBusiness = getStoredDemoBusinessPreference() as BusinessType | null;
    if (preferredDemoBusiness && preferredDemoBusiness !== businessType) {
      setBusinessType(preferredDemoBusiness);
    }
  }, [storedUser?.email, businessType]);

  if (allowed === false) return <div style={{ padding: 40, textAlign: "center", color: "#f87171", fontWeight: 700, fontSize: 18 }}>Access Denied</div>;
  if (allowed === null) return <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.35)" }}>Checking permissions…</div>;

  const currentUser = getCurrentUser();
  const isDemoUser = currentUser?.email === "finovaos.app@gmail.com";
  const cur = companyInfo?.baseCurrency || "Rs";
  const btMeta = BUSINESS_TYPES.find(b => b.id === businessType);

  if (isDemoUser) {
    return <DemoBusinessShowcase businessType={businessType} companyInfo={companyInfo} />;
  }

  /* ── Build trend data ── */
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  // Merge sales + purchases trend into one array for the AreaChart
  const salesArr = charts?.salesTrend || [];
  const purchArr = charts?.purchasesTrend || [];

  // If no API data, build a 7-point zero array for last 7 days labels
  const trendData: { label: string; Sales: number; Purchases: number }[] = (() => {
    if (salesArr.length > 0 || purchArr.length > 0) {
      const labels = [...new Set([...salesArr.map(s => s.label), ...purchArr.map(p => p.label)])].sort();
      return labels.map(lbl => ({
        label: lbl,
        Sales: salesArr.find(s => s.label === lbl)?.value || 0,
        Purchases: purchArr.find(p => p.label === lbl)?.value || 0,
      }));
    }
    // fallback — last 7 days
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { label: `${d.getDate()} ${MONTHS[d.getMonth()]}`, Sales: 0, Purchases: 0 };
    });
  })();

  const topCustomers = (charts?.topCustomers || []).slice(0, 6).map(c => ({ name: c.name.length > 14 ? c.name.slice(0, 14) + "…" : c.name, value: c.total }));
  const topItems     = (charts?.topItems     || []).slice(0, 6).map(i => ({ name: i.name.length > 14 ? i.name.slice(0, 14) + "…" : i.name, value: i.amount }));

  const hasData = stats.sales > 0 || stats.purchases > 0;

  const COLORS = ["#6366f1","#34d399","#f59e0b","#f87171","#38bdf8","#a78bfa"];

  return (
    <div style={{ minHeight: "100vh", background: "transparent", padding: 0, fontFamily: "inherit" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .recharts-tooltip-cursor { fill: rgba(255,255,255,0.04) !important }
        @media(max-width:980px){
          .dashboard-alert-grid,
          .dashboard-chart-grid{
            grid-template-columns:1fr !important;
          }
        }
        @media(max-width:720px){
          .dashboard-header{
            flex-direction:column !important;
            align-items:flex-start !important;
          }
          .dashboard-business-banner{
            align-items:flex-start !important;
          }
          .dashboard-business-banner-kpis{
            width:100%;
            flex-wrap:wrap !important;
          }
        }
      `}</style>

      {/* ── Payment alerts ── */}
      {companyInfo?.subscriptionStatus === "PENDING_PAYMENT" && (
        <div style={{ marginBottom: 20, padding: "14px 20px", borderRadius: 12, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>💳</span>
            <div>
              <div style={{ fontWeight: 700, color: "#a5b4fc", fontSize: 13 }}>Payment Required</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Complete your payment to unlock all features.</div>
            </div>
          </div>
          <Link href="/billing" style={{ padding: "8px 18px", borderRadius: 8, background: "#6366f1", color: "white", fontWeight: 700, fontSize: 12, textDecoration: "none" }}>Pay Now</Link>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="dashboard-header" style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "white", margin: 0, letterSpacing: "-.3px" }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Business overview & key metrics</p>
        </div>
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 8, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <div style={{ width: 14, height: 14, border: "2px solid rgba(99,102,241,0.3)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
            <span style={{ fontSize: 11, color: "#818cf8", fontWeight: 600 }}>Loading…</span>
          </div>
        )}
      </div>

      {/* ── Business type banner ── */}
      {btMeta && btMeta.id !== "trading" && (
          <div className="dashboard-business-banner" style={{ marginBottom: 16, padding: "12px 18px", borderRadius: 12, background: `${btMeta.color}08`, border: `1px solid ${btMeta.color}20`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 20 }}>{btMeta.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: btMeta.color }}>{btMeta.label} Dashboard</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 1 }}>{btMeta.tagline}</div>
          </div>
          <div className="dashboard-business-banner-kpis" style={{ display: "flex", gap: 8 }}>
            {btMeta.kpis.slice(0, 4).map(kpi => (
              <div key={kpi.key} style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)", textAlign: "center" }}>
                <div style={{ fontSize: 14 }}>{kpi.icon}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", fontWeight: 600, marginTop: 2 }}>{kpi.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Total Revenue",    value: `${cur} ${stats.sales.toLocaleString()}`,      icon: "📈", color: "#34d399", bg: "rgba(52,211,153,0.08)",   border: "rgba(52,211,153,0.2)" },
          { label: "Total Purchases",  value: `${cur} ${stats.purchases.toLocaleString()}`,  icon: "📦", color: "#818cf8", bg: "rgba(129,140,248,0.08)",  border: "rgba(129,140,248,0.2)" },
          { label: "Net Profit",       value: `${cur} ${stats.profit.toLocaleString()}`,     icon: stats.profit >= 0 ? "💰" : "📉", color: stats.profit >= 0 ? "#34d399" : "#f87171", bg: stats.profit >= 0 ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)", border: stats.profit >= 0 ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)" },
          { label: "Customers",        value: stats.customers.toString(),                    icon: "👥", color: "#fbbf24", bg: "rgba(251,191,36,0.08)",   border: "rgba(251,191,36,0.2)" },
        ].map((card, i) => (
          <div key={i} style={{ borderRadius: 14, padding: "18px 20px", background: card.bg, border: `1px solid ${card.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>{card.label}</span>
              <span style={{ fontSize: 20 }}>{card.icon}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color, letterSpacing: "-.5px" }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* ── AI Intelligence Widget ── */}
      {currentUser?.companyId && !isDemoUser && (
        <AIWidget
          companyId={currentUser.companyId}
          role={currentUser.role || "ADMIN"}
          userId={currentUser.id || ""}
        />
      )}

      {/* ── Alert Row ── */}
      <div className="dashboard-alert-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <div style={{ borderRadius: 14, padding: "16px 20px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(248,113,113,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Overdue Receivables ({stats.overdueReceivablesCount})</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f87171" }}>{cur} {stats.overdueReceivables.toLocaleString()}</div>
          </div>
          <Link href="/dashboard/reports/ageing" style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>View →</Link>
        </div>
        <div style={{ borderRadius: 14, padding: "16px 20px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(251,191,36,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Low Stock Items</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fbbf24" }}>{stats.lowStockCount} items</div>
          </div>
          <Link href="/dashboard/reports/stock/low" style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>Check →</Link>
        </div>
      </div>

      {/* ── Subscription row — ADMIN only ── */}
      {companyInfo && currentUser?.role === "ADMIN" && (
        <div style={{
          borderRadius: 14, padding: "14px 20px", marginBottom: 24,
          display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" as const,
          background: companyInfo.subscriptionStatus === "TRIALING"
            ? "rgba(251,191,36,0.06)"
            : "rgba(255,255,255,0.03)",
          border: companyInfo.subscriptionStatus === "TRIALING"
            ? "1px solid rgba(251,191,36,0.25)"
            : "1px solid rgba(255,255,255,0.07)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: companyInfo.subscriptionStatus === "ACTIVE" ? "#34d399" : "#f59e0b" }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Plan: <strong style={{ color: "#a5b4fc" }}>{companyInfo.plan}</strong></span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            Status: <strong style={{ color: companyInfo.subscriptionStatus === "ACTIVE" ? "#34d399" : "#f59e0b" }}>{companyInfo.subscriptionStatus}</strong>
          </div>
          {companyInfo.subscriptionStatus === "TRIALING" && (
            <span style={{ fontSize: 11, color: "rgba(251,191,36,0.7)" }}>
              ⚠️ Trial active — activate karo full access ke liye
            </span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {companyInfo.subscriptionStatus === "TRIALING" && (
              <Link href="/dashboard/billing" style={{
                padding: "7px 18px", borderRadius: 8,
                background: "linear-gradient(135deg,#f59e0b,#d97706)",
                color: "white", fontSize: 12, fontWeight: 700,
                textDecoration: "none", whiteSpace: "nowrap" as const,
                boxShadow: "0 4px 12px rgba(245,158,11,0.35)",
              }}>
                🚀 Activate Now →
              </Link>
            )}
            {companyInfo.plan !== "ENTERPRISE" && companyInfo.subscriptionStatus !== "TRIALING" && (
              <Link href="/dashboard/billing" style={{
                padding: "6px 16px", borderRadius: 8,
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.3)",
                color: "#a5b4fc", fontSize: 11, fontWeight: 700,
                textDecoration: "none",
              }}>
                Upgrade Plan →
              </Link>
            )}
            {companyInfo.subscriptionStatus === "ACTIVE" && companyInfo.plan !== "ENTERPRISE" && (
              <Link href="/dashboard/billing" style={{
                padding: "6px 16px", borderRadius: 8,
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.3)",
                color: "#a5b4fc", fontSize: 11, fontWeight: 700,
                textDecoration: "none",
              }}>
                Upgrade Plan →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          CHARTS SECTION
      ══════════════════════════════════════════════════════════ */}
      <div className="dashboard-chart-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>

        {/* ── 1. Revenue vs Purchases Trend (Area) ── */}
        <ChartCard style={{ gridColumn: "1 / -1" }}>
          <SectionHeader title="Revenue vs Purchases — This Month" sub={hasData ? undefined : "No transactions yet — start adding sales to see trends"} />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPurch" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TooltipStyle} formatter={(v?: number) => [`${cur} ${(v ?? 0).toLocaleString()}`, ""]} />
              <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.45)", paddingTop: 8 }} />
              <Area type="monotone" dataKey="Sales"     stroke="#34d399" strokeWidth={2} fill="url(#gSales)" dot={false} activeDot={{ r: 4, fill: "#34d399" }} />
              <Area type="monotone" dataKey="Purchases" stroke="#6366f1" strokeWidth={2} fill="url(#gPurch)" dot={false} activeDot={{ r: 4, fill: "#6366f1" }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ── 2. Top Customers (Horizontal Bar) ── */}
        <ChartCard>
          <SectionHeader title="Top Customers" sub="By total revenue" />
          {topCustomers.length === 0 ? (
            <div style={{ height: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ fontSize: 32 }}>👥</span>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>No customer sales yet</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topCustomers} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...TooltipStyle} formatter={(v?: number) => [`${cur} ${(v ?? 0).toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={18}>
                  {topCustomers.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* ── 3. Top Items (Vertical Bar) ── */}
        <ChartCard>
          <SectionHeader title="Top Selling Items" sub="By revenue this month" />
          {topItems.length === 0 ? (
            <div style={{ height: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ fontSize: 32 }}>📦</span>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>No items sold yet</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topItems} margin={{ top: 4, right: 4, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...TooltipStyle} formatter={(v?: number) => [`${cur} ${(v ?? 0).toLocaleString()}`, "Amount"]} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={32}>
                  {topItems.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

      </div>

      {/* ── Quick Actions ── */}
      {(() => {
        const actions = btMeta?.quickActions || [];
        const accentColor = btMeta?.color || "#6366f1";
        if (actions.length === 0) return null;
        return (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: ".08em" }}>Quick Actions</div>
              {btMeta && (
                <div style={{ fontSize: 10, padding: "2px 10px", borderRadius: 20, background: `${accentColor}15`, border: `1px solid ${accentColor}25`, color: accentColor, fontWeight: 700 }}>
                  {btMeta.icon} {btMeta.label}
                </div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10 }}>
              {actions.map((a, i) => (
                <Link key={i} href={a.href} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px 10px", borderRadius: 12, textDecoration: "none", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", transition: "all .2s", textAlign: "center" }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${a.color}12`; e.currentTarget.style.borderColor = `${a.color}35`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <span style={{ fontSize: 22 }}>{a.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Getting started (only when truly empty) ── */}
      {!hasData && !loading && (
        <div style={{ borderRadius: 14, padding: "24px", background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(99,102,241,0.7)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Getting Started</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 6 }}>Set up your workspace</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 16 }}>Import opening balances to begin tracking your finances professionally.</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { href: "/dashboard/accounts", label: "Chart of Accounts" },
              { href: "/dashboard/opening-balances", label: "Opening Balances" },
              { href: "/onboarding/checklist", label: "Setup Checklist" },
            ].map((btn, i) => (
              <Link key={i} href={btn.href} style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>{btn.label}</Link>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
