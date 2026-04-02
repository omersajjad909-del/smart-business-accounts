"use client";
import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

const FONT = "'Outfit','Inter',sans-serif";

interface Summary {
  revenue: number;
  expenses: number;
  profit: number;
  receivables: number;
  payables: number;
  cashBalance: number;
  revenueGrowth: number;
  invoicesPending: number;
  overdueAmount: number;
}

interface TopCustomer { name: string; revenue: number; }
interface RecentActivity { type: string; description: string; amount: number; date: string; }

function Sparkline({ vals, color }: { vals: number[]; color: string }) {
  const W = 80, H = 28, mx = Math.max(...vals, 1), mn = Math.min(...vals);
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - ((v - mn) / (mx - mn + 1)) * H}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function KPICard({ label, value, sub, color, spark, href }: { label: string; value: string; sub?: string; color: string; spark?: number[]; href?: string }) {
  const inner = (
    <div style={{ background: "var(--panel-bg)", border: `1px solid ${color}28`, borderRadius: 14, padding: "18px 20px", cursor: href ? "pointer" : "default", transition: "border-color .2s", height: "100%", boxSizing: "border-box" }}
      onMouseEnter={e => href && ((e.currentTarget as HTMLElement).style.borderColor = `${color}55`)}
      onMouseLeave={e => href && ((e.currentTarget as HTMLElement).style.borderColor = `${color}28`)}
    >
      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>{sub}</div>}
      {spark && <Sparkline vals={spark} color={color} />}
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none" }}>{inner}</Link> : inner;
}

export default function OwnerDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [recent, setRecent] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const [companyName, setCompanyName] = useState("Your Business");

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;
    const h = { "x-user-id": user.id, "x-user-role": user.role, "x-company-id": user.companyId || "" };

    setLoading(true);
    Promise.all([
      fetch(`/api/reports/dashboard-summary?period=${period}`, { headers: h }).then(r => r.ok ? r.json() : null),
      fetch("/api/me/company", { headers: h }).then(r => r.ok ? r.json() : null),
    ]).then(([sum, co]) => {
      if (sum) {
        setSummary({
          revenue:        sum.revenue        || 0,
          expenses:       sum.expenses       || 0,
          profit:         (sum.revenue || 0) - (sum.expenses || 0),
          receivables:    sum.receivables    || 0,
          payables:       sum.payables       || 0,
          cashBalance:    sum.cashBalance    || 0,
          revenueGrowth:  sum.revenueGrowth  || 0,
          invoicesPending: sum.invoicesPending || 0,
          overdueAmount:  sum.overdueAmount  || 0,
        });
        setTopCustomers(sum.topCustomers || []);
        setRecent(sum.recentActivity || []);
      }
      if (co?.name) setCompanyName(co.name);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [period]);

  const fmt = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
  const fmtFull = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const MOCK_SPARK = [42, 58, 51, 73, 68, 82, 75, 91, 85, 100, 95, 112];

  const QUICK_LINKS = [
    { label: "New Invoice",       href: "/dashboard/sales-invoice",   icon: "🧾", color: "#6366f1" },
    { label: "New Sales Order",   href: "/dashboard/sales-order",     icon: "📋", color: "#10b981" },
    { label: "Customer Statement",href: "/dashboard/customer-statement", icon: "📊", color: "#f59e0b" },
    { label: "Payment Follow-up", href: "/dashboard/payment-followup", icon: "⏰", color: "#f87171" },
    { label: "Audit Trail",       href: "/dashboard/audit-trail",     icon: "🔍", color: "#a5b4fc" },
    { label: "Trial Balance",     href: "/dashboard/reports/trial-balance", icon: "⚖️", color: "#34d399" },
  ];

  const ACTIVITY_ICONS: Record<string, string> = {
    invoice: "🧾", payment: "💰", purchase: "🏭", order: "📋", expense: "💸",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg)", padding: "32px 28px", fontFamily: FONT, color: "var(--text-primary)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 4px", letterSpacing: -0.5 }}>
            Owner Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{companyName} — Executive overview</p>
        </div>
        {/* Period tabs */}
        <div style={{ display: "flex", background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 3, gap: 2 }}>
          {(["month", "quarter", "year"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              background: period === p ? "#6366f1" : "transparent",
              color: period === p ? "#fff" : "var(--text-muted)",
              border: "none", borderRadius: 7, padding: "6px 16px", fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: FONT, textTransform: "capitalize",
            }}>{p === "month" ? "This Month" : p === "quarter" ? "This Quarter" : "This Year"}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>Loading dashboard…</div>
      ) : (
        <>
          {/* Primary KPI row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 16 }}>
            <KPICard label="Revenue" value={fmt(summary?.revenue ?? 0)} sub={summary?.revenueGrowth ? `${summary.revenueGrowth > 0 ? "+" : ""}${summary.revenueGrowth.toFixed(1)}% vs last period` : undefined} color="#10b981" spark={MOCK_SPARK} href="/dashboard/reports/profit-loss" />
            <KPICard label="Expenses" value={fmt(summary?.expenses ?? 0)} color="#f87171" spark={[38,48,42,55,50,58,52,60,55,62,58,65]} href="/dashboard/expense-vouchers" />
            <KPICard label="Net Profit" value={fmt(summary?.profit ?? 0)} sub={summary ? `${((summary.profit / (summary.revenue || 1)) * 100).toFixed(1)}% margin` : undefined} color="#a5b4fc" spark={[20,28,22,36,30,40,34,44,38,50,45,55]} href="/dashboard/reports/profit-loss" />
          </div>

          {/* Secondary KPI row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
            <KPICard label="Receivables" value={fmt(summary?.receivables ?? 0)} sub="Outstanding from customers" color="#f59e0b" href="/dashboard/customer-statement" />
            <KPICard label="Payables" value={fmt(summary?.payables ?? 0)} sub="Owed to suppliers" color="#06b6d4" href="/dashboard/supplier-statement" />
            <KPICard label="Cash Balance" value={fmt(summary?.cashBalance ?? 0)} sub="Across all accounts" color="#34d399" href="/dashboard/bank-reconciliation" />
          </div>

          {/* Alert strip */}
          {(summary?.overdueAmount ?? 0) > 0 && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#f87171" }}>Overdue Receivables</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{fmtFull(summary?.overdueAmount ?? 0)} overdue across {summary?.invoicesPending ?? 0} invoices</div>
                </div>
              </div>
              <Link href="/dashboard/payment-followup" style={{ background: "#f87171", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                Follow Up
              </Link>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

            {/* Quick Links */}
            <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 22px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Quick Actions</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {QUICK_LINKS.map(q => (
                  <Link key={q.href} href={q.href} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    background: `${q.color}10`, border: `1px solid ${q.color}25`,
                    borderRadius: 10, textDecoration: "none",
                    color: "var(--text-primary)", fontSize: 13, fontWeight: 600,
                    transition: "border-color .2s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = `${q.color}55`)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = `${q.color}25`)}
                  >
                    <span style={{ fontSize: 16 }}>{q.icon}</span>
                    {q.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Top Customers */}
            <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 22px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Top Customers</div>
              {topCustomers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)", fontSize: 13 }}>No data yet for this period.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {topCustomers.slice(0, 5).map((c, i) => {
                    const maxRev = topCustomers[0]?.revenue || 1;
                    const pct = (c.revenue / maxRev) * 100;
                    return (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                          <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>{fmt(c.revenue)}</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#6366f1,#10b981)", borderRadius: 2 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 22px" }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Recent Activity</div>
            {recent.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)", fontSize: 13 }}>No recent activity.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {recent.slice(0, 8).map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 0", borderBottom: i < recent.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                      {ACTIVITY_ICONS[a.type] || "📄"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.description}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{a.date}</div>
                    </div>
                    {a.amount > 0 && (
                      <div style={{ fontSize: 13, fontWeight: 700, color: a.type === "payment" ? "#10b981" : "#a5b4fc", flexShrink: 0 }}>
                        {fmt(a.amount)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
