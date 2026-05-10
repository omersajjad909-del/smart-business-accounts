"use client";
import { useEffect, useRef, useState } from "react";
import { useRequirePermission } from "@/lib/useRequirePermission";
import { PERMISSIONS } from "@/lib/permissions";
import Link from "next/link";
import { getCurrentUser, getStoredDemoBusinessPreference } from "@/lib/auth";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/businessModules";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import DemoBusinessShowcase from "./DemoBusinessShowcase";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ── Types ── */
interface DashStats {
  revenue: number;
  expenses: number;
  profit: number;
  cashBalance: number;
  revenueGrowth: number;
  expensesGrowth: number;
  profitGrowth: number;
  overdueAmount: number;
  invoicesPending: number;
  revenueHistory: number[];
  expensesHistory: number[];
  topCustomers: { name: string; revenue: number }[];
  recentActivity: {
    type: string;
    description: string;
    amount: number;
    date: string;
  }[];
}
interface ChartPoint {
  label: string;
  Revenue: number;
  Expenses: number;
  Profit: number;
}
interface ExpSlice {
  name: string;
  value: number;
  color: string;
}

/* ── Sparkline (mobile mini-chart) ── */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div style={{ width: 64, height: 24 }} />;
  const max = Math.max(...data, 1);
  const pts = data
    .map(
      (v, i) =>
        `${Math.round((i / (data.length - 1)) * 64)},${Math.round(24 - (v / max) * 20 - 2)}`,
    )
    .join(" ");
  return (
    <svg width="64" height="24" style={{ overflow: "visible" }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    </svg>
  );
}

/* ── AI Insight Panel (right sidebar on desktop) ── */
function AIInsightPanel({
  companyId,
  role,
  userId,
}: {
  companyId: string;
  role: string;
  userId: string;
}) {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const h: Record<string, string> = {
      "x-company-id": companyId,
      "x-user-id": userId,
      "x-user-role": role,
    };
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8000);
    Promise.allSettled([
      fetch("/api/ai/alerts", { headers: h, signal: ctrl.signal }).then((r) =>
        r.json(),
      ),
      fetch("/api/ai/insights", { headers: h, signal: ctrl.signal }).then((r) =>
        r.json(),
      ),
    ])
      .then(([ar, ir]) => {
        const alerts = ar.status === "fulfilled" ? ar.value.alerts || [] : [];
        const ctx = ir.status === "fulfilled" ? ir.value.context : null;
        const list: string[] = [];
        if (ctx) {
          const rv = ctx.revenue?.change || 0;
          const ev = ctx.expenses?.change || 0;
          const pr = ctx.profit?.thisMonth || 0;
          const od = ctx.receivables?.overdue || 0;
          const re = ctx.revenue?.thisMonth || 0;
          if (pr !== 0) {
            const dir = pr >= 0 ? "profitable" : "running at a loss";
            const pct = Math.abs(rv).toFixed(1);
            const suffix =
              pr >= 0
                ? ` Revenue is up ${pct}% — keep it up!`
                : " Review your expenses to improve margins.";
            list.push(`Your business is ${dir} this month.${suffix}`);
          }
          if (re > 0) {
            const ratio = Math.round(
              ((ctx.expenses?.thisMonth || 0) / re) * 100,
            );
            if (ratio > 0) {
              const status =
                ratio < 70
                  ? "healthy — well controlled"
                  : ratio < 90
                    ? "moderate — watch closely"
                    : "high — consider cutting costs";
              list.push(
                `Expenses are ${ratio}% of revenue this month — ${status}.`,
              );
            }
          }
          if (rv !== 0 && ev !== 0) {
            if (ev > rv)
              list.push(
                `Expenses grew ${ev.toFixed(1)}% while revenue grew ${rv.toFixed(1)}%. Costs are rising faster than income.`,
              );
            else if (rv > ev && rv > 0)
              list.push(
                `Revenue grew ${rv.toFixed(1)}% vs expenses at ${ev.toFixed(1)}%. Your margins are improving.`,
              );
          }
          if (od > 0)
            list.push(
              `You have overdue receivables worth outstanding. Follow up with customers to improve your cash flow.`,
            );
        }
        const topAlert =
          alerts.find((a: any) => a.severity === "critical") ||
          alerts.find((a: any) => a.severity === "warning") ||
          alerts[0];
        if (topAlert?.description) list.push(topAlert.description);
        if (list.length === 0) {
          list.push(
            "Your business financials look healthy. Keep tracking expenses consistently to maintain profitability.",
          );
          list.push(
            "Tip: Regular invoice follow-ups reduce overdue balances and can improve cash flow significantly.",
          );
          list.push(
            "Review your top expense categories monthly to identify opportunities for cost savings.",
          );
        }
        setInsights(list);
        setLoading(false);
      })
      .catch(() => {
        setInsights([
          "Your business financials look healthy. Keep tracking expenses to maintain profitability.",
        ]);
        setLoading(false);
      })
      .finally(() => clearTimeout(tid));
    return () => {
      clearTimeout(tid);
      ctrl.abort();
    };
  }, [companyId, role, userId]);

  useEffect(() => {
    if (insights.length <= 1) return;
    const t = setInterval(
      () => setActiveSlide((p) => (p + 1) % insights.length),
      5000,
    );
    return () => clearInterval(t);
  }, [insights.length]);

  return (
    <div
      style={{
        borderRadius: 16,
        background: "var(--panel-bg)",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Top spotlight glow */}
      <div style={{
        position: "absolute",
        top: 40,
        left: "50%",
        transform: "translateX(-50%)",
        width: 180,
        height: 180,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139,92,246,.35), transparent 70%)",
        filter: "blur(20px)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 18px 0",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "var(--text-primary)",
            }}
          >
            AI Insights
          </div>
          <span
            style={{
              padding: "1px 7px",
              borderRadius: 20,
              background: "rgba(99,102,241,.2)",
              border: "1px solid rgba(99,102,241,.3)",
              fontSize: 9,
              fontWeight: 700,
              color: "#818cf8",
            }}
          >
            LIVE
          </span>
        </div>
        <Link
          prefetch={false}
          href="/dashboard/ai"
          style={{
            fontSize: 11,
            color: "#818cf8",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          View all →
        </Link>
      </div>

      {/* Holographic Brain */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        padding: "8px 0 4px",
        position: "relative",
        zIndex: 1,
        minHeight: 130,
      }}>
        {/* Deep glow behind brain */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%,-60%)",
          width: 130, height: 130,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,.55) 0%, rgba(99,102,241,.25) 50%, transparent 75%)",
          filter: "blur(18px)",
        }} />
        {/* Sparkles */}
        <span style={{ position:"absolute", top:14, left:"22%", fontSize:13, color:"#c4b5fd", animation:"ai-twinkle 2.2s ease infinite" }}>✦</span>
        <span style={{ position:"absolute", top:22, right:"20%", fontSize:9,  color:"#a78bfa", animation:"ai-twinkle 1.9s ease .4s infinite" }}>✦</span>
        <span style={{ position:"absolute", top:8,  right:"35%", fontSize:11, color:"#818cf8", animation:"ai-twinkle 2.6s ease .2s infinite" }}>✦</span>
        <span style={{ position:"absolute", top:46, left:"15%", fontSize:8,  color:"#c4b5fd", animation:"ai-twinkle 2s ease .7s infinite" }}>✦</span>
        <span style={{ position:"absolute", top:50, right:"12%", fontSize:12, color:"#a78bfa", animation:"ai-twinkle 2.4s ease .1s infinite" }}>✦</span>
        {/* Brain emoji with float */}
        <div style={{
          fontSize: 72,
          lineHeight: 1,
          filter: "drop-shadow(0 0 18px rgba(139,92,246,1)) drop-shadow(0 0 36px rgba(99,102,241,.8)) drop-shadow(0 0 60px rgba(139,92,246,.5))",
          animation: "brain-float 3.5s ease-in-out infinite",
          position: "relative",
          zIndex: 2,
          marginBottom: 8,
          userSelect: "none",
        }}>🧠</div>
        {/* Hologram platform disc */}
        <div style={{
          position: "absolute",
          bottom: 4,
          left: "50%",
          transform: "translateX(-50%)",
          width: 110, height: 18,
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(99,102,241,.75) 0%, rgba(139,92,246,.45) 45%, transparent 70%)",
          filter: "blur(6px)",
          animation: "ai-pulse 3s ease-in-out infinite",
        }} />
      </div>

      {/* Insight card */}
      <div
        style={{
          margin: "0 14px 14px",
          borderRadius: 14,
          background:
            "linear-gradient(135deg, #4f46e5 0%, #6366f1 40%, #7c3aed 100%)",
          boxShadow:
            "0 10px 40px rgba(99,102,241,.35), inset 0 0 60px rgba(139,92,246,.15)",
          border: "1px solid rgba(99,102,241,.22)",
          padding: "14px 16px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13 }}>✨</span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: ".3px",
            }}
          >
            Smart Insight
          </span>
          {!loading && insights.length > 1 && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: 10,
                color: "var(--text-muted)",
                fontWeight: 600,
              }}
            >
              {activeSlide + 1}/{insights.length}
            </span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          {loading ? (
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#6366f1",
                  animation: "ai-dot 1.2s ease 0s infinite",
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#6366f1",
                  animation: "ai-dot 1.2s ease .2s infinite",
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#6366f1",
                  animation: "ai-dot 1.2s ease .4s infinite",
                }}
              />
            </div>
          ) : (
            <>
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: 14.5,
                  color: "rgba(255,255,255,.88)",
                  lineHeight: 1.6,
                }}
              >
                {insights[activeSlide] || insights[0]}
              </p>
              <Link
                prefetch={false}
                href="/dashboard/ai"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "7px 14px",
                  borderRadius: 9,
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  boxShadow: "0 4px 20px rgba(99,102,241,.4)",
                  border: "1px solid rgba(99,102,241,.3)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                View Full Insight →
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Dot indicators */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 5,
          padding: "10px 0 12px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {(loading ? [0, 1, 2] : insights).map((_, i) => (
          <div
            key={i}
            onClick={() => !loading && setActiveSlide(i)}
            style={{
              width: i === activeSlide ? 18 : 6,
              height: 4,
              borderRadius: 3,
              background: i === activeSlide ? "linear-gradient(90deg,#6366f1,#8b5cf6)" : "rgba(99,102,241,.2)",
              transition: "width .3s",
              cursor: loading ? "default" : "pointer",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════════ */
export default function DashboardContent() {
  const allowed = useRequirePermission(PERMISSIONS.VIEW_DASHBOARD);
  const storedUser = getCurrentUser() as {
    businessType?: string | null;
    email?: string | null;
  } | null;
  const initDemo =
    typeof window !== "undefined" &&
    storedUser?.email === "finovaos.app@gmail.com"
      ? (getStoredDemoBusinessPreference() as BusinessType | null)
      : null;

  const [companyInfo, setCompanyInfo] = useState<{
    plan: string;
    subscriptionStatus: string;
    baseCurrency: string;
    name?: string;
    logoUrl?: string | null;
  } | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [todayStats, setTodayStats] = useState<{
    todaySales: number;
    todayOrders: number;
    pendingCount: number;
    lowStockCount: number;
  } | null>(null);
  const [dueData, setDueData] = useState<{
    overdueReceivables: {
      id: string;
      invoiceNo: string;
      party: string;
      amount: number;
      dueDate: string;
      daysOverdue: number;
    }[];
    dueSoon: {
      id: string;
      invoiceNo: string;
      party: string;
      amount: number;
      dueDate: string;
      daysLeft: number;
    }[];
    banks: {
      id: string;
      bankName: string;
      accountName: string;
      balance: number;
    }[];
  } | null>(null);
  const [businessType, setBT] = useState<BusinessType>(
    initDemo || (storedUser?.businessType as BusinessType) || "trading",
  );
  const [stats, setStats] = useState<DashStats>({
    revenue: 0,
    expenses: 0,
    profit: 0,
    cashBalance: 0,
    revenueGrowth: 0,
    expensesGrowth: 0,
    profitGrowth: 0,
    overdueAmount: 0,
    invoicesPending: 0,
    revenueHistory: [],
    expensesHistory: [],
    topCustomers: [],
    recentActivity: [],
  });
  const [chartData, setChart] = useState<ChartPoint[]>([]);
  const [donut, setDonut] = useState<ExpSlice[]>([]);
  const [loading, setLoad] = useState(true);
  const [period, setPeriod] = useState<"month" | "quarter" | "year" | "all">("month");

  useEffect(() => {
    if (allowed !== true) return;
    (async () => {
      try {
        setLoad(true);
        const user = getCurrentUser();
        if (!user?.companyId) {
          setLoad(false);
          return;
        }
        const h: Record<string, string> = {};
        if (user.role) h["x-user-role"] = user.role;
        if (user.id) h["x-user-id"] = user.id;
        if (user.companyId) h["x-company-id"] = user.companyId;

        const [sR, cR, mR, bR, eR, tR] = await Promise.allSettled([
          fetch(`/api/reports/dashboard-summary?period=${period}`, {
            headers: h,
            cache: "no-store",
          }),
          fetch(`/api/reports/dashboard-charts?period=${period}`, {
            headers: h,
            cache: "no-store",
          }),
          fetch("/api/me/company", { cache: "no-store" }),
          fetch("/api/company/business-type", {
            headers: h,
            cache: "no-store",
          }),
          fetch("/api/reports/expense-breakdown?period=month", {
            headers: h,
            cache: "no-store",
          }),
          fetch("/api/reports/today-stats", { headers: h, cache: "no-store" }),
        ]);

        if (sR.status === "fulfilled" && sR.value.ok) {
          const d = await sR.value.json();
          setStats({
            revenue: Number(d.revenue || 0),
            expenses: Number(d.expenses || 0),
            profit: Number(d.profit || 0),
            cashBalance: Number(d.cashBalance || 0),
            revenueGrowth:  Number(d.revenueGrowth  ?? 0),
            expensesGrowth: Number(d.expensesGrowth ?? 0),
            profitGrowth:   Number(d.profitGrowth   ?? 0),
            overdueAmount: Number(d.overdueAmount || 0),
            invoicesPending: Number(d.invoicesPending || 0),
            revenueHistory: Array.isArray(d.revenueHistory)
              ? d.revenueHistory
              : [],
            expensesHistory: Array.isArray(d.expensesHistory)
              ? d.expensesHistory
              : [],
            topCustomers: Array.isArray(d.topCustomers) ? d.topCustomers : [],
            recentActivity: Array.isArray(d.recentActivity)
              ? d.recentActivity
              : [],
          });
        }
        if (cR.status === "fulfilled" && cR.value.ok) {
          const ch = await cR.value.json();
          const sA = ch.salesTrend || [],
            pA = ch.purchasesTrend || [];
          const MN = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];
          const lbls = [
            ...new Set([
              ...sA.map((s: any) => s.label),
              ...pA.map((p: any) => p.label),
            ]),
          ].sort() as string[];
          setChart(
            lbls.map((l) => {
              const rv = sA.find((s: any) => s.label === l)?.value || 0;
              const ex = pA.find((p: any) => p.label === l)?.value || 0;
              let dl = l;
              if (/^\d{4}-\d{2}-\d{2}$/.test(l)) {
                const d = new Date(l + "T00:00:00");
                dl = `${MN[d.getMonth()]} ${d.getDate()}`;
              } else if (/^\d{4}-\d{2}$/.test(l)) {
                const [yr, mo] = l.split("-");
                dl = `${MN[parseInt(mo, 10) - 1]} ${yr}`;
              }
              return { label: dl, Revenue: rv, Expenses: ex, Profit: rv - ex };
            }),
          );
        }
        if (bR.status === "fulfilled" && bR.value.ok) {
          const b = await bR.value.json();
          if (!initDemo && b.businessType)
            setBT(b.businessType as BusinessType);
        }
        if (mR.status === "fulfilled" && mR.value.ok) {
          const s = await mR.value.json();
          if (initDemo) setBT(initDemo);
          else if (s.businessType) setBT(s.businessType as BusinessType);
          setCompanyInfo({
            plan: String(s.plan || "STARTER"),
            subscriptionStatus: String(s.subscriptionStatus || "ACTIVE"),
            baseCurrency:
              CURRENCY_SYMBOL[String(s.baseCurrency || "")] ||
              CURRENCY_SYMBOL["USD"],
            name: String(s.name || s.companyName || ""),
            logoUrl: s.logoUrl || null,
          });
        }
        if (eR.status === "fulfilled" && eR.value.ok) {
          const eb = await eR.value.json();
          const rows = eb.rows || [];
          const EC = ["#ef4444", "#f59e0b", "#6366f1", "#10b981", "#38bdf8"];
          const tot = rows.reduce(
            (a: number, r: any) => a + Number(r.amount || 0),
            0,
          );
          if (tot > 0)
            setDonut(
              rows.slice(0, 5).map((r: any, i: number) => ({
                name: r.category || r.label || "Other",
                value: Number(r.amount || 0),
                color: EC[i],
              })),
            );
        }
        if (tR.status === "fulfilled" && tR.value.ok) {
          const t = await tR.value.json();
          setTodayStats({
            todaySales: Number(t.todaySales || 0),
            todayOrders: Number(t.todayOrders || 0),
            pendingCount: Number(t.pendingCount || 0),
            lowStockCount: Number(t.lowStockCount || 0),
          });
        }
        // due-this-week (non-blocking, best-effort)
        fetch("/api/reports/due-this-week", { headers: h, cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d) setDueData(d);
          })
          .catch(() => {});
        // load avatar from stored user or me API
        const meUser = getCurrentUser() as any;
        if (meUser?.avatar) setUserAvatar(meUser.avatar);
        else {
          fetch("/api/me")
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d?.avatar) setUserAvatar(d.avatar);
            })
            .catch(() => {});
        }
        // load unread notification count
        fetch("/api/admin/notifications")
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.notifications)
              setUnreadNotifs(
                (d.notifications as any[]).filter((n: any) => !n.isRead).length,
              );
          })
          .catch(() => {});
      } catch (e) {
        console.error("Dashboard:", e);
      } finally {
        setLoad(false);
      }
    })();
  }, [allowed, period]);

  useEffect(() => {
    if (storedUser?.email !== "finovaos.app@gmail.com") return;
    const p = getStoredDemoBusinessPreference() as BusinessType | null;
    if (p && p !== businessType) setBT(p);
  }, [storedUser?.email, businessType]);

  if (allowed === false)
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          color: "#f87171",
          fontWeight: 700,
        }}
      >
        Access Denied
      </div>
    );
  if (allowed === null)
    return (
      <div
        style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}
      >
        Checking permissions…
      </div>
    );

  const cu = getCurrentUser();
  if (cu?.email === "finovaos.app@gmail.com")
    return (
      <DemoBusinessShowcase
        businessType={businessType}
        companyInfo={companyInfo}
      />
    );

  const cur = companyInfo?.baseCurrency || "Rs";
  const companyLabel = companyInfo?.name || "Your Business";
  const sub = companyInfo?.subscriptionStatus;
  const hasData = stats.revenue > 0 || stats.expenses > 0;
  const fmt = (n: number) =>
    n >= 1e6
      ? `${(n / 1e6).toFixed(1)}M`
      : n >= 1e3
        ? `${(n / 1e3).toFixed(0)}K`
        : n.toLocaleString();
  const h = new Date().getHours();
  const greeting =
    h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const uName = (cu as any)?.name || "there";
  const userInitials =
    String(uName)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "U";
  const profC = stats.profit >= 0 ? "#10b981" : "#ef4444";
  const grC  = stats.revenueGrowth  >= 0 ? "#10b981" : "#ef4444";
  const expC = stats.expensesGrowth >= 0 ? "#ef4444" : "#10b981"; // expenses up = bad (red)
  const prfC = stats.profitGrowth   >= 0 ? "#10b981" : "#ef4444";
  const MO = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const now = new Date();
  const ws = new Date(now);
  ws.setDate(now.getDate() - 6);
  const dRange = `${MO[ws.getMonth()]} ${ws.getDate()} – ${MO[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  const EC = ["#ef4444", "#f59e0b", "#6366f1", "#10b981", "#38bdf8"];
  const donutData: ExpSlice[] =
    donut.length > 0
      ? donut
      : stats.expenses > 0
        ? [
            { name: "Purchases", value: stats.expenses * 0.56, color: EC[0] },
            { name: "Operating", value: stats.expenses * 0.2, color: EC[1] },
            { name: "Salaries", value: stats.expenses * 0.14, color: EC[2] },
            { name: "Utilities", value: stats.expenses * 0.06, color: EC[3] },
            { name: "Others", value: stats.expenses * 0.04, color: EC[4] },
          ]
        : [];

  const QA = [
    {
      label: "+ Invoice",
      href: "/dashboard/sales-invoice",
      bg: "linear-gradient(135deg,#6366f1,#4f46e5)",
      icon: "📄",
    },
    {
      label: "+ Sale",
      href: "/dashboard/sales-order",
      bg: "linear-gradient(135deg,#38bdf8,#0ea5e9)",
      icon: "🛒",
    },
    {
      label: "+ Expense",
      href: "/dashboard/expense-vouchers",
      bg: "linear-gradient(135deg,#f59e0b,#d97706)",
      icon: "💰",
    },
    {
      label: "+ Product",
      href: "/dashboard/items-new",
      bg: "linear-gradient(135deg,#10b981,#059669)",
      icon: "📦",
    },
  ];

  const TT = {
    contentStyle: {
      background: "#0f1629",
      border: "1px solid rgba(255,255,255,.1)",
      borderRadius: 10,
      fontSize: 12,
    },
    labelStyle: { color: "rgba(255,255,255,.4)", fontWeight: 600 },
  };

  return (
    <div style={{ minHeight: "100vh", background: "transparent", padding: 0 }}>
      <style>{`
        @keyframes db-spin{to{transform:rotate(360deg)}}
        @keyframes db-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ai-pulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}
        @keyframes ai-twinkle{0%,100%{opacity:.3;transform:scale(.8) rotate(-10deg)}50%{opacity:1;transform:scale(1.3) rotate(10deg)}}
        @keyframes ai-dot{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}
        @keyframes brain-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}

        .db-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;}
        @media(max-width:1100px){.db-kpi{grid-template-columns:repeat(2,1fr);}}
        @media(max-width:500px){.db-kpi{grid-template-columns:1fr 1fr;gap:10px;}}

        .db-mid{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:20px;min-height:340px;}
        @media(max-width:960px){.db-mid{grid-template-columns:1fr;}}

        .db-bot{display:grid;grid-template-columns:2fr 1.5fr 1fr;gap:16px;margin-bottom:20px;}
        @media(max-width:1200px){.db-bot{grid-template-columns:1fr 1fr;}}
        @media(max-width:700px){.db-bot{grid-template-columns:1fr;}}
        @media(max-width:1200px){.db-rcol{grid-column:1/-1!important;display:grid;grid-template-columns:1fr 1fr;gap:16px;}}
        @media(max-width:700px){.db-rcol{display:flex!important;flex-direction:column;gap:14px;}}

        .db-mo{display:none!important;}
        @media(max-width:767px){
          .db-mo        {display:block!important;}
          .db-mo-flex   {display:flex!important;}
          .db-mo-grid   {display:grid!important;}
          .db-mo-legacy-head{display:none!important;}
          .db-kpi{display:none!important;}
          .db-mid{display:none!important;}
          .db-bot{display:none!important;}
          .db-deskqa{display:none!important;}
          .db-desk-header{display:none!important;}
        }

        .db-card{transition:transform .15s,box-shadow .15s;}
        .db-card:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.2);}
        .db-row:hover{background:rgba(255,255,255,.03)!important;}
        .db-qa:hover{transform:translateY(-2px);}
        .db-qa{transition:transform .15s;}
      `}</style>

      {/* ── Pending payment banner ── */}
      {sub === "PENDING_PAYMENT" && (
        <div
          style={{
            marginBottom: 20,
            padding: "13px 18px",
            borderRadius: 12,
            background: "rgba(99,102,241,.07)",
            border: "1px solid rgba(99,102,241,.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>💳</span>
            <div style={{ fontWeight: 700, color: "#a5b4fc", fontSize: 13 }}>
              Payment Required —{" "}
              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                Complete payment to unlock all features
              </span>
            </div>
          </div>
          <Link
            prefetch={false}
            href="/billing"
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              background: "#6366f1",
              color: "white",
              fontWeight: 700,
              fontSize: 12,
              textDecoration: "none",
            }}
          >
            Pay Now
          </Link>
        </div>
      )}

      {/* ── Header (desktop only) ── */}
      <div
        className="db-desk-header"
        style={{
          marginBottom: 24,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: "var(--text-primary)",
              margin: "0 0 5px",
              letterSpacing: "-.4px",
            }}
          >
            {greeting}, {uName} 👋
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 8,
                background: "rgba(99,102,241,.07)",
                border: "1px solid rgba(99,102,241,.2)",
              }}
            >
              <div
                style={{
                  width: 11,
                  height: 11,
                  border: "2px solid rgba(99,102,241,.3)",
                  borderTopColor: "#6366f1",
                  borderRadius: "50%",
                  animation: "db-spin .7s linear infinite",
                }}
              />
              <span style={{ fontSize: 11, color: "#818cf8", fontWeight: 600 }}>
                Loading…
              </span>
            </div>
          )}
          {/* Period selector */}
          <div style={{ display: "flex", gap: 4, background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 3 }}>
            {(["month","quarter","year","all"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: "4px 11px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 700, fontFamily: "inherit",
                background: period === p ? "rgba(99,102,241,.25)" : "transparent",
                color: period === p ? "#818cf8" : "var(--text-muted)",
                transition: "all .15s",
              }}>
                {p === "month" ? "This Month" : p === "quarter" ? "Quarter" : p === "year" ? "This Year" : "All Time"}
              </button>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 14px",
              borderRadius: 10,
              background: "var(--panel-bg)",
              border: "1px solid var(--border)",
              fontSize: 12,
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {dRange}
          </div>
        </div>
      </div>

      {/* ── 4 KPI Cards ── */}
      <div className="db-kpi">
        {/* Balance */}
        <div
          className="db-card db-kpi-bal"
          style={{
            borderRadius: 16,
            padding: "20px 22px",
            background:
              "linear-gradient(135deg,rgba(99,102,241,.14),rgba(79,70,229,.07))",
            border: "1px solid rgba(99,102,241,.22)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(99,102,241,.8)",
              }}
            >
              Total Balance
            </span>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: "rgba(99,102,241,.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 17,
              }}
            >
              💳
            </div>
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: "#818cf8",
              letterSpacing: "-1px",
              marginBottom: 8,
            }}
          >
            {cur} {fmt(stats.cashBalance)}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: grC }}>
            {stats.revenueGrowth >= 0 ? "↑" : "↓"}{" "}
            {Math.abs(stats.revenueGrowth).toFixed(1)}%{" "}
            <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
              vs last month
            </span>
          </div>
        </div>
        {/* Revenue */}
        <div
          className="db-card"
          style={{
            borderRadius: 16,
            padding: "20px 22px",
            background: "rgba(16,185,129,.07)",
            border: "1px solid rgba(16,185,129,.2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(16,185,129,.8)",
              }}
            >
              Total Revenue
            </span>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: "rgba(16,185,129,.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 17,
              }}
            >
              📈
            </div>
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: "#10b981",
              letterSpacing: "-1px",
              marginBottom: 8,
            }}
          >
            {cur} {fmt(stats.revenue)}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: grC }}>
            {stats.revenueGrowth >= 0 ? "↑" : "↓"}{" "}
            {Math.abs(stats.revenueGrowth).toFixed(1)}%{" "}
            <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
              vs last month
            </span>
          </div>
        </div>
        {/* Expenses */}
        <div
          className="db-card"
          style={{
            borderRadius: 16,
            padding: "20px 22px",
            background: "rgba(248,113,113,.07)",
            border: "1px solid rgba(248,113,113,.2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(248,113,113,.8)",
              }}
            >
              Total Expenses
            </span>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: "rgba(248,113,113,.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 17,
              }}
            >
              📉
            </div>
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: "#f87171",
              letterSpacing: "-1px",
              marginBottom: 8,
            }}
          >
            {cur} {fmt(stats.expenses)}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: expC }}>
            {stats.expensesGrowth >= 0 ? "↑" : "↓"}{" "}
            {Math.abs(stats.expensesGrowth).toFixed(1)}%{" "}
            <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
              vs last month
            </span>
          </div>
        </div>
        {/* Profit */}
        <div
          className="db-card"
          style={{
            borderRadius: 16,
            padding: "20px 22px",
            background: `${profC}0f`,
            border: `1px solid ${profC}28`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <span
              style={{ fontSize: 12, fontWeight: 600, color: `${profC}cc` }}
            >
              Profit This Month
            </span>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: `${profC}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 17,
              }}
            >
              {stats.profit >= 0 ? "🚀" : "📉"}
            </div>
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: profC,
              letterSpacing: "-1px",
              marginBottom: 8,
            }}
          >
            {cur} {fmt(stats.profit)}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: prfC }}>
            {stats.profitGrowth >= 0 ? "↑" : "↓"}{" "}
            {Math.abs(stats.profitGrowth).toFixed(1)}%{" "}
            <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
              vs last month
            </span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
           MOBILE ONLY — Full redesign
          ════════════════════════════════════════ */}

      {/* ── Greeting + date ── */}
      <div
        className="db-mo db-mo-legacy-head"
        style={{
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: "var(--text-primary)",
              letterSpacing: "-.4px",
            }}
          >
            {greeting}, {uName} 👋
          </div>
          <div
            style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}
          >
            {dRange}
          </div>
        </div>
        {loading && (
          <div
            style={{
              width: 28,
              height: 28,
              border: "2.5px solid rgba(99,102,241,.2)",
              borderTopColor: "#6366f1",
              borderRadius: "50%",
              animation: "db-spin .7s linear infinite",
              flexShrink: 0,
            }}
          />
        )}
      </div>

      {/* ── Mobile Header: Avatar + Name + Notification ── */}
      <div
        className="db-mo db-mo-flex"
        style={{
          marginBottom: 18,
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            minWidth: 0,
          }}
        >
          {/* Avatar — profile photo, then company logo, then initials */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 800,
              color: "#fff",
              flexShrink: 0,
              boxShadow: "0 8px 24px rgba(99,102,241,.28)",
              overflow: "hidden",
            }}
          >
            {userAvatar || companyInfo?.logoUrl ? (
              <img
                src={userAvatar || companyInfo?.logoUrl!}
                alt="avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              userInitials
            )}
          </div>
          <div style={{ minWidth: 0, paddingTop: 2 }}>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 2,
              }}
            >
              {greeting},
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: "var(--text-primary)",
                letterSpacing: "-.45px",
                lineHeight: 1.05,
                marginBottom: 6,
              }}
            >
              {uName} 👋
            </div>
            {/* Company — clickable link */}
            <Link
              prefetch={false}
              href="/dashboard/company-profile"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                textDecoration: "none",
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  flexShrink: 0,
                }}
              >
                Company:
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#a5b4fc",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {companyLabel}
              </span>
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#a5b4fc"
                strokeWidth="2.5"
                style={{ flexShrink: 0 }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </Link>
          </div>
        </div>
        {/* Notification bell — real count, navigates to notifications */}
        <Link
          prefetch={false}
          href="/dashboard/notifications"
          style={{
            position: "relative",
            width: 40,
            height: 40,
            borderRadius: 13,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-primary)",
            flexShrink: 0,
            textDecoration: "none",
          }}
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          {unreadNotifs > 0 && (
            <span
              style={{
                position: "absolute",
                top: 7,
                right: 7,
                minWidth: 8,
                height: 8,
                padding: "0 2px",
                borderRadius: 999,
                background: "#f87171",
                border: "1.5px solid var(--panel-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 7,
                fontWeight: 800,
                color: "#fff",
                lineHeight: 1,
              }}
            >
              {unreadNotifs > 9 ? "9+" : ""}
            </span>
          )}
        </Link>
      </div>

      <div
        className="db-mo"
        style={{
          borderRadius: 22,
          padding: "24px 20px 20px",
          background:
            "linear-gradient(135deg,#1e1b4b 0%,#312e81 35%,#4338ca 70%,#6366f1 100%)",
          marginBottom: 16,
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(99,102,241,.35)",
        }}
      >
        {/* Background circles */}
        <div
          style={{
            position: "absolute",
            top: -30,
            right: -30,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "rgba(255,255,255,.04)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -20,
            left: -20,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "rgba(255,255,255,.03)",
            pointerEvents: "none",
          }}
        />
        {/* Top row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
            position: "relative",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,.55)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                marginBottom: 6,
              }}
            >
              Total Balance
            </div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 900,
                color: "white",
                letterSpacing: "-1.5px",
                lineHeight: 1,
              }}
            >
              {cur} {fmt(stats.cashBalance)}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: stats.revenueGrowth >= 0 ? "#86efac" : "#fca5a5",
                marginTop: 6,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <polyline
                  points={
                    stats.revenueGrowth >= 0
                      ? "23 6 13.5 15.5 8.5 10.5 1 18"
                      : "1 6 10.5 15.5 15.5 10.5 23 18"
                  }
                />
              </svg>
              {Math.abs(stats.revenueGrowth).toFixed(1)}% vs last month
            </div>
          </div>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 15,
              background: "rgba(255,255,255,.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,.2)",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="1" y="4" width="22" height="16" rx="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </div>
        </div>
        {/* Bottom stats row */}
        <div
          className="db-grid-exempt"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            paddingTop: 16,
            borderTop: "1px solid rgba(255,255,255,.12)",
            position: "relative",
          }}
        >
          {[
            { l: "Revenue", v: stats.revenue, c: "#86efac" },
            { l: "Expenses", v: stats.expenses, c: "#fca5a5" },
            {
              l: "Profit",
              v: stats.profit,
              c: profC == "#10b981" ? "#86efac" : "#fca5a5",
            },
          ].map((s, i) => (
            <div key={i}>
              <div
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,.45)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                  marginBottom: 4,
                }}
              >
                {s.l}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: s.c,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {cur} {fmt(s.v)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="db-mo" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "var(--text-primary)",
            }}
          >
            Quick Actions
          </div>
        </div>
        <div
          className="db-grid-exempt"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 10,
          }}
        >
          {[
            {
              label: "+ Invoice",
              href: "/dashboard/sales-invoice",
              bg: "linear-gradient(135deg,#6366f1,#4f46e5)",
              icon: (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              ),
            },
            {
              label: "+ Sale",
              href: "/dashboard/sales-invoice",
              bg: "linear-gradient(135deg,#0ea5e9,#0284c7)",
              icon: (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 001.97 1.61h9.72a2 2 0 001.97-1.61L23 6H6" />
                </svg>
              ),
            },
            {
              label: "+ Expense",
              href: "/dashboard/expense-vouchers",
              bg: "linear-gradient(135deg,#f59e0b,#d97706)",
              icon: (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <rect x="1" y="4" width="22" height="16" rx="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              ),
            },
            {
              label: "+ Product",
              href: "/dashboard/items-new",
              bg: "linear-gradient(135deg,#10b981,#059669)",
              icon: (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              ),
            },
          ].map((q, i) => (
            <Link
              prefetch={false}
              key={i}
              href={q.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 7,
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 18,
                  background: q.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 16px rgba(0,0,0,.25)",
                  flexShrink: 0,
                }}
              >
                {q.icon}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textAlign: "center",
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                }}
              >
                {q.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Business Overview (mobile) ── */}
      <div className="db-mo" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "var(--text-primary)",
            }}
          >
            Business Overview
          </div>
          <Link
            prefetch={false}
            href="/dashboard/reports"
            style={{
              fontSize: 12,
              color: "#818cf8",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Full Report
          </Link>
        </div>
        {/* Mini chart */}
        <div
          style={{
            borderRadius: 16,
            padding: "14px 4px 10px",
            background: "var(--panel-bg)",
            border: "1px solid var(--border)",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 10,
              color: "var(--text-muted)",
              paddingLeft: 14,
              marginBottom: 8,
            }}
          >
            {[
              ["Revenue", "#818cf8"],
              ["Expenses", "#f87171"],
              ["Profit", "#10b981"],
            ].map(([l, c]) => (
              <span
                key={l}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 2.5,
                    borderRadius: 1,
                    background: c,
                  }}
                />
                {l}
              </span>
            ))}
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={148}>
              <AreaChart
                data={chartData}
                margin={{ top: 2, right: 8, left: -24, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="mgRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="mgPro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--text-muted)", fontSize: 9 } as any}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 9 } as any}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={fmt}
                />
                <Tooltip
                  {...TT}
                  formatter={(v?: number, n?: string) => [
                    `${cur} ${(v ?? 0).toLocaleString()}`,
                    n || "",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="Revenue"
                  stroke="#818cf8"
                  strokeWidth={1.5}
                  fill="url(#mgRev)"
                  dot={false}
                  activeDot={{ r: 3, fill: "#818cf8" }}
                />
                <Area
                  type="monotone"
                  dataKey="Expenses"
                  stroke="#f87171"
                  strokeWidth={1.5}
                  fill="none"
                  dot={false}
                  activeDot={{ r: 3, fill: "#f87171" }}
                />
                <Area
                  type="monotone"
                  dataKey="Profit"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  fill="url(#mgPro)"
                  dot={false}
                  activeDot={{ r: 3, fill: "#10b981" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                height: 148,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 28 }}>📊</span>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  textAlign: "center",
                  padding: "0 20px",
                }}
              >
                No data yet. Start adding sales to see your trend.
              </div>
            </div>
          )}
        </div>
        {/* Today's stat tiles — 2×2 grid */}
        <div
          className="db-grid-exempt"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          {[
            {
              l: "Today's Sales",
              v: todayStats ? `${cur} ${fmt(todayStats.todaySales)}` : "—",
              c: "#10b981",
              icon: "🛍️",
            },
            {
              l: "Orders Today",
              v: todayStats ? String(todayStats.todayOrders) : "—",
              c: "#818cf8",
              icon: "📦",
            },
            {
              l: "Pending Invoices",
              v: todayStats ? String(todayStats.pendingCount) : "—",
              c: "#f59e0b",
              icon: "🧾",
            },
            {
              l: "Low Stock Items",
              v: todayStats ? String(todayStats.lowStockCount) : "—",
              c: "#f87171",
              icon: "⚠️",
            },
          ].map((it, i) => (
            <div
              key={i}
              style={{
                borderRadius: 13,
                padding: "12px 14px",
                background: "var(--panel-bg)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>
                {it.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 900,
                    color: it.c,
                    letterSpacing: "-.5px",
                    lineHeight: 1,
                  }}
                >
                  {it.v}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: ".04em",
                    marginTop: 3,
                    lineHeight: 1.2,
                  }}
                >
                  {it.l}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── AI Insight ── */}
      <div className="db-mo" style={{ marginBottom: 20 }}>
        <div
          style={{
            borderRadius: 18,
            background:
              "linear-gradient(135deg,rgba(99,102,241,.12),rgba(139,92,246,.07))",
            border: "1px solid rgba(99,102,241,.25)",
            padding: "18px 16px",
            display: "flex",
            gap: 16,
            alignItems: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -10,
              top: -10,
              width: 80,
              height: 80,
              borderRadius: "50%",
              background:
                "radial-gradient(circle,rgba(99,102,241,.15) 0%,transparent 70%)",
            }}
          />
          {/* Brain */}
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              flexShrink: 0,
              boxShadow: "0 4px 18px rgba(99,102,241,.45)",
            }}
          >
            🧠
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                }}
              >
                AI Insight
              </div>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: "rgba(99,102,241,.25)",
                  border: "1px solid rgba(99,102,241,.35)",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#a5b4fc",
                }}
              >
                NEW
              </span>
            </div>
            <p
              style={{
                margin: "0 0 10px",
                fontSize: 11.5,
                color: "var(--text-muted)",
                lineHeight: 1.65,
              }}
            >
              Track business performance with AI-powered insights and smart
              alerts.
            </p>
            <Link
              prefetch={false}
              href="/dashboard/ai"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 14px",
                borderRadius: 9,
                background: "rgba(99,102,241,.2)",
                border: "1px solid rgba(99,102,241,.3)",
                color: "#c4b5fd",
                fontSize: 11,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              View Details
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Recent Transactions ── */}
      <div className="db-mo" style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "var(--text-primary)",
            }}
          >
            Recent Transactions
          </div>
          <Link
            prefetch={false}
            href="/dashboard/invoices"
            style={{
              fontSize: 12,
              color: "#818cf8",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            View All
          </Link>
        </div>
        <div
          style={{
            borderRadius: 18,
            background: "var(--panel-bg)",
            border: "1px solid var(--border)",
            overflow: "hidden",
          }}
        >
          {stats.recentActivity.length === 0 ? (
            <div style={{ padding: "36px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                No recent activity
              </div>
            </div>
          ) : (
            stats.recentActivity.slice(0, 5).map((tx, i) => {
              const isInv = tx.type === "invoice";
              const isPur = tx.type === "purchase";
              const tc = isInv ? "#10b981" : isPur ? "#818cf8" : "#f59e0b";
              const amt = tx.amount;
              const bg = isInv
                ? "rgba(16,185,129,.1)"
                : isPur
                  ? "rgba(129,140,248,.1)"
                  : "rgba(245,158,11,.1)";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 16px",
                    borderBottom:
                      i < Math.min(stats.recentActivity.length, 5) - 1
                        ? "1px solid var(--border)"
                        : "none",
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 13,
                      background: bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isInv ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={tc}
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    ) : isPur ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={tc}
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={tc}
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <rect x="1" y="4" width="22" height="16" rx="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                    )}
                  </div>
                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tx.description}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {tx.date} ·{" "}
                      <span
                        style={{
                          color: isInv ? "#10b981" : "#f87171",
                          fontWeight: 600,
                        }}
                      >
                        {isInv ? "Received" : "Paid"}
                      </span>
                    </div>
                  </div>
                  {/* Amount */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: isInv ? "#10b981" : "#f87171",
                      }}
                    >
                      {isInv ? "+" : `-`}
                      {cur} {fmt(amt)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ══ DESKTOP/TABLET: Business Overview + AI Insights ══ */}
      <div className="db-mid">
        {/* Business Overview Line Chart */}
        <div
          style={{
            borderRadius: 16,
            padding: "20px 20px 14px",
            background: "var(--panel-bg)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "var(--text-primary)",
              }}
            >
              Business Overview
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              {[
                ["Revenue", "#818cf8"],
                ["Expenses", "#f87171"],
                ["Profit", "#10b981"],
              ].map(([l, c]) => (
                <span
                  key={l}
                  style={{ display: "flex", alignItems: "center", gap: 5 }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 14,
                      height: 2.5,
                      borderRadius: 2,
                      background: c,
                    }}
                  />
                  {l}
                </span>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px",
                borderRadius: 9,
                background: "rgba(255,255,255,.04)",
                border: "1px solid var(--border)",
                fontSize: 12,
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              This Month{" "}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={chartData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--text-muted)", fontSize: 10 } as any}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 10 } as any}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={fmt}
                />
                <Tooltip
                  {...TT}
                  formatter={(v?: number, n?: string) => [
                    `${cur} ${(v ?? 0).toLocaleString()}`,
                    n || "",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="Revenue"
                  stroke="#818cf8"
                  strokeWidth={2}
                  fill="url(#gRev)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#818cf8" }}
                />
                <Area
                  type="monotone"
                  dataKey="Expenses"
                  stroke="#f87171"
                  strokeWidth={2}
                  fill="url(#gExp)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#f87171" }}
                />
                <Area
                  type="monotone"
                  dataKey="Profit"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#gPro)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#10b981" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                height: 240,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 32 }}>📊</span>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                No transaction data yet. Start adding sales to see trends.
              </div>
            </div>
          )}
        </div>
        {/* AI Insights Panel */}
        {cu?.companyId ? (
          <AIInsightPanel
            companyId={cu.companyId}
            role={cu.role || "ADMIN"}
            userId={cu.id || ""}
          />
        ) : (
          <div
            style={{
              borderRadius: 16,
              background: "var(--panel-bg)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              AI unavailable
            </span>
          </div>
        )}
      </div>

      {/* ══ DESKTOP/TABLET Bottom: Transactions + Donut + Quick Actions+Tasks ══ */}
      <div className="db-bot">
        {/* Recent Transactions Table */}
        <div
          style={{
            borderRadius: 16,
            background: "var(--panel-bg)",
            border: "1px solid var(--border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "17px 20px 13px",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "var(--text-primary)",
              }}
            >
              Recent Transactions
            </div>
            <Link
              prefetch={false}
              href="/dashboard/invoices"
              style={{
                fontSize: 12,
                color: "#818cf8",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              View all
            </Link>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr 88px 96px 80px",
              gap: 6,
              padding: "7px 20px",
              borderBottom: "1px solid var(--border)",
              background: "rgba(255,255,255,.02)",
            }}
          >
            {["Type", "Description", "Date", "Amount", "Status"].map((h) => (
              <div
                key={h}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                }}
              >
                {h}
              </div>
            ))}
          </div>
          {stats.recentActivity.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                No recent transactions
              </div>
            </div>
          ) : (
            stats.recentActivity.slice(0, 6).map((tx, i) => {
              const isInv = tx.type === "invoice";
              const tc = isInv
                ? "#10b981"
                : tx.type === "purchase"
                  ? "#818cf8"
                  : "#f59e0b";
              const tl = isInv
                ? "Invoice"
                : tx.type === "purchase"
                  ? "Purchase"
                  : "Expense";
              const ref = tx.description.split(" ").pop() || "—";
              return (
                <div
                  key={i}
                  className="db-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr 88px 96px 80px",
                    gap: 6,
                    padding: "11px 20px",
                    borderBottom:
                      i < Math.min(stats.recentActivity.length, 6) - 1
                        ? "1px solid rgba(255,255,255,.04)"
                        : "none",
                    transition: "background .12s",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 700,
                      background: `${tc}15`,
                      color: tc,
                      display: "inline-block",
                      textAlign: "center",
                    }}
                  >
                    {tl}
                  </span>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ref}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {tx.date}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: isInv ? "#10b981" : "#f87171",
                    }}
                  >
                    {isInv ? "+" : "-"}
                    {cur} {fmt(tx.amount)}
                  </div>
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 700,
                      background: "rgba(16,185,129,.12)",
                      color: "#10b981",
                      display: "inline-block",
                    }}
                  >
                    Paid
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Top Expenses Donut */}
        <div
          style={{
            borderRadius: 16,
            background: "var(--panel-bg)",
            border: "1px solid var(--border)",
            padding: "20px",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "var(--text-primary)",
              marginBottom: 14,
            }}
          >
            Top Expenses
          </div>
          {donutData.length > 0 ? (
            <>
              <div style={{ position: "relative" }}>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {donutData.map((s, i) => (
                        <Cell key={i} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      {...TT}
                      formatter={(v?: number) => [
                        `${cur} ${(v ?? 0).toLocaleString()}`,
                        "",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 900,
                      color: "var(--text-primary)",
                    }}
                  >
                    {cur} {fmt(stats.expenses)}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: ".04em",
                    }}
                  >
                    Expenses
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                  marginTop: 8,
                }}
              >
                {donutData.map((s, i) => {
                  const tot = donutData.reduce((a, b) => a + b.value, 0);
                  const pct = tot > 0 ? Math.round((s.value / tot) * 100) : 0;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: s.color,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{ fontSize: 11, color: "var(--text-muted)" }}
                        >
                          {s.name}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {cur} {fmt(s.value)}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--text-muted)",
                            minWidth: 28,
                            textAlign: "right",
                          }}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💸</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                No expense data
              </div>
            </div>
          )}
        </div>

        {/* Right col: Quick Actions + Upcoming Tasks */}
        <div
          className="db-rcol db-deskqa"
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {/* Quick Actions */}
          <div
            style={{
              borderRadius: 16,
              background: "var(--panel-bg)",
              border: "1px solid var(--border)",
              padding: "17px 18px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 13,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                }}
              >
                Quick Actions
              </div>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,.25)"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
              </svg>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 9,
              }}
            >
              {QA.map((q, i) => (
                <Link
                  prefetch={false}
                  key={i}
                  href={q.href}
                  className="db-qa"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "13px 8px",
                    borderRadius: 13,
                    textDecoration: "none",
                    gap: 7,
                    background: "rgba(255,255,255,.03)",
                    border: "1px solid rgba(255,255,255,.07)",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 13,
                      background: q.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 19,
                    }}
                  >
                    {q.icon}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                    }}
                  >
                    {q.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          {/* Upcoming Tasks */}
          <div
            style={{
              borderRadius: 16,
              background: "var(--panel-bg)",
              border: "1px solid var(--border)",
              padding: "17px 18px",
              flex: 1,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 13,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                }}
              >
                Upcoming Tasks
              </div>
              <Link
                prefetch={false}
                href="/dashboard/sales-invoice"
                style={{
                  fontSize: 11,
                  color: "#818cf8",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                View all
              </Link>
            </div>
            {!dueData ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 44,
                      borderRadius: 10,
                      background: "rgba(255,255,255,.04)",
                      animation: "db-up .6s ease both",
                    }}
                  />
                ))}
              </div>
            ) : dueData.overdueReceivables.length === 0 &&
              dueData.dueSoon.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px 0",
                  color: "var(--text-muted)",
                  fontSize: 12,
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
                All caught up! No tasks due.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {dueData.overdueReceivables.slice(0, 3).map((r) => {
                  const d = new Date(r.dueDate);
                  const ds = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
                  return (
                    <Link
                      prefetch={false}
                      key={r.id}
                      href="/dashboard/sales-invoice"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 11px",
                        borderRadius: 11,
                        background: "rgba(248,113,113,.07)",
                        border: "1px solid rgba(248,113,113,.18)",
                        textDecoration: "none",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          background: "rgba(248,113,113,.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#f87171"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Follow up {r.party}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "#f87171",
                            fontWeight: 600,
                            marginTop: 1,
                          }}
                        >
                          {r.daysOverdue}d overdue · {ds}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: "#f87171",
                          }}
                        >
                          {cur} {fmt(r.amount)}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "rgba(248,113,113,.6)",
                            textTransform: "uppercase",
                            letterSpacing: ".04em",
                          }}
                        >
                          Collect
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {dueData.dueSoon.slice(0, 2).map((r) => {
                  const d = new Date(r.dueDate);
                  const ds = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
                  return (
                    <Link
                      prefetch={false}
                      key={r.id}
                      href="/dashboard/purchase-invoice"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 11px",
                        borderRadius: 11,
                        background: "rgba(245,158,11,.07)",
                        border: "1px solid rgba(245,158,11,.18)",
                        textDecoration: "none",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          background: "rgba(245,158,11,.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Pay {r.party}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "#f59e0b",
                            fontWeight: 600,
                            marginTop: 1,
                          }}
                        >
                          {r.daysLeft === 0 ? "Due today" : `Due ${ds}`}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: "#f59e0b",
                          }}
                        >
                          {cur} {fmt(r.amount)}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "rgba(245,158,11,.6)",
                            textTransform: "uppercase",
                            letterSpacing: ".04em",
                          }}
                        >
                          Pay
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bank Balances (desktop) ── */}
      {dueData?.banks && dueData.banks.length > 0 && (
        <div
          className="db-desk-header"
          style={{
            marginBottom: 20,
            borderRadius: 16,
            background: "var(--panel-bg)",
            border: "1px solid var(--border)",
            padding: "17px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "var(--text-primary)",
              }}
            >
              🏦 Bank Balances
            </div>
            <Link
              prefetch={false}
              href="/dashboard/bank-reconciliation"
              style={{
                fontSize: 12,
                color: "#818cf8",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Reconcile →
            </Link>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(dueData.banks.length, 4)},1fr)`,
              gap: 12,
            }}
          >
            {dueData.banks.map((b) => (
              <div
                key={b.id}
                style={{
                  borderRadius: 12,
                  padding: "14px 16px",
                  background: "rgba(99,102,241,.06)",
                  border: "1px solid rgba(99,102,241,.15)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    marginBottom: 6,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {b.bankName}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    color: "#818cf8",
                    letterSpacing: "-.5px",
                  }}
                >
                  {cur} {fmt(b.balance)}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    marginTop: 3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {b.accountName}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Getting Started ── */}
      {!hasData && !loading && (
        <div
          style={{
            borderRadius: 16,
            padding: "26px 22px",
            background: "rgba(99,102,241,.05)",
            border: "1px solid rgba(99,102,241,.18)",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(99,102,241,.7)",
              textTransform: "uppercase",
              letterSpacing: ".08em",
              marginBottom: 7,
            }}
          >
            Getting Started
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "var(--text-primary)",
              marginBottom: 5,
            }}
          >
            Set up your workspace
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginBottom: 16,
            }}
          >
            Import opening balances to begin tracking your finances
            professionally.
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { href: "/dashboard/accounts", label: "Chart of Accounts" },
              {
                href: "/dashboard/opening-balances",
                label: "Opening Balances",
              },
              { href: "/onboarding/checklist", label: "Setup Checklist" },
            ].map((b, i) => (
              <Link
                prefetch={false}
                key={i}
                href={b.href}
                style={{
                  padding: "7px 16px",
                  borderRadius: 9,
                  background: "rgba(99,102,241,.12)",
                  border: "1px solid rgba(99,102,241,.28)",
                  color: "#a5b4fc",
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                {b.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div
        className="db-desk-header"
        style={{
          borderTop: "1px solid var(--border)",
          marginTop: 8,
          padding: "14px 4px 4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          © 2026 Finova Forge. All rights reserved.
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          FinovaOS is a product of Finova Forge.
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {[
            { href: "/legal/privacy", label: "Privacy Policy" },
            { href: "/security", label: "Security" },
            { href: "/legal/terms", label: "Terms of Service" },
            { href: "/support", label: "Support" },
          ].map((item, index) => (
            <div
              key={item.href}
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              {index > 0 && (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.2)" }}>
                  •
                </span>
              )}
              <Link
                prefetch={false}
                href={item.href}
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  textDecoration: "none",
                }}
              >
                {item.label}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
