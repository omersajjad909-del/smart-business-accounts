"use client";
import { useEffect, useState } from "react";
import { useRequirePermission } from "@/lib/useRequirePermission";
import { PERMISSIONS } from "@/lib/permissions";
import Link from "next/link";
import SimpleChart from "@/components/SimpleChart";
import { getCurrentUser } from "@/lib/auth";

type ChartPoint = { label: string; value: number; color?: string };

type ChartData = {
  salesTrend?: ChartPoint[];
  topCustomers?: { name: string; total: number }[];
  topItems?: { name: string; amount: number }[];
  purchasesTrend?: ChartPoint[];
} | null;

export default function DashboardContent() {
  const allowed = useRequirePermission(PERMISSIONS.VIEW_DASHBOARD);
  const [subInfo, setSubInfo] = useState<{ plan: string; subscriptionStatus: string } | null>(null);
  const [priceId, setPriceId] = useState("");
  const [stats, setStats] = useState({
    sales: 0,
    purchases: 0,
    profit: 0,
    customers: 0,
    overdueReceivables: 0,
    overdueReceivablesCount: 0,
    lowStockCount: 0,
  });

  const [charts, setCharts] = useState<ChartData>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (allowed !== true) return;

    async function fetchStats() {
      try {
        const user = getCurrentUser();
        const headers: Record<string, string> = {};
        if (user?.role) headers["x-user-role"] = user.role;
        if (user?.id) headers["x-user-id"] = user.id;
        if (user?.companyId) headers["x-company-id"] = user.companyId;

        const [statsRes, chartsRes, subRes] = await Promise.all([
          fetch('/api/reports/dashboard-summary', { headers }),
          fetch('/api/reports/dashboard-charts?period=month', { headers }),
          fetch('/api/me/company', { headers }),
        ]);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats({
            sales: Number(statsData?.sales || 0),
            purchases: Number(statsData?.purchases || 0),
            profit: Number(statsData?.profit || 0),
            customers: Number(statsData?.customers || 0),
            overdueReceivables: Number(statsData?.overdueReceivables || 0),
            overdueReceivablesCount: Number(statsData?.overdueReceivablesCount || 0),
            lowStockCount: Number(statsData?.lowStockCount || 0),
          });
        } else {
          console.error("Stats API Error:", statsRes.status, statsRes.statusText);
          const errText = await statsRes.text();
          console.error("Stats API Response:", errText);
          setStats({ sales: 0, purchases: 0, profit: 0, customers: 0, overdueReceivables: 0, overdueReceivablesCount: 0, lowStockCount: 0 });
        }

        if (chartsRes.ok) {
          const chartsData = await chartsRes.json();
          setCharts(chartsData);
        } else {
          console.error("Charts API Error:", chartsRes.status, chartsRes.statusText);
          const errText = await chartsRes.text();
          console.error("Charts API Response:", errText);
          setCharts(null);
        }

        if (subRes.ok) {
          const s = await subRes.json();
          setSubInfo({ plan: String(s.plan || "STARTER"), subscriptionStatus: String(s.subscriptionStatus || "ACTIVE") });
        }
        const envPrice = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO;
        if (envPrice && typeof envPrice === "string") setPriceId(envPrice);
      } catch (e) {
        console.error("Dashboard Error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [allowed]);

  if (allowed === false) {
    return (
      <div className="p-10 text-center text-red-600 font-bold text-xl">
        Access Denied: You do not have permission to view the dashboard.
      </div>
    );
  }

  if (allowed === null) {
    return (
      <div className="p-10 text-center text-gray-400">
        Checking permissions...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {subInfo && subInfo.plan === "PRO" && subInfo.subscriptionStatus === "ACTIVE" && (
        <div className="mb-4 p-3 rounded border border-green-600 bg-green-50 text-green-800 text-sm">
          Subscription active: PRO plan enabled with advanced features.
        </div>
      )}
      {/* Starter helper card */}
      {stats.sales === 0 && stats.purchases === 0 && stats.customers === 0 && (
        <div className="mb-6 bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[12px] font-black uppercase text-gray-500">Getting Started</p>
          <h2 className="text-xl font-black mt-1">Import Opening Balances</h2>
          <p className="text-sm text-gray-700 mt-2">Set up your accounts and opening balances to begin professional tracking.</p>
          <div className="mt-4 flex gap-3">
            <a href="/dashboard/accounts" className="px-4 py-2 bg-black text-white font-bold">Open Accounts</a>
            <a href="/dashboard/opening-balances" className="px-4 py-2 border-2 border-black font-bold">Import Opening Balances</a>
            <a href="/onboarding/checklist" className="px-4 py-2 border-2 border-black font-bold">Setup Checklist</a>
            <a href="/onboarding/choose-plan" className="px-4 py-2 border-2 border-black font-bold">Upgrade to PRO</a>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b-4 border-black pb-2 gap-4">
        <h1 className="text-2xl md:text-3xl font-black uppercase italic">Admin Command Centre</h1>
        {loading && <span className="animate-spin text-2xl">⏳</span>}
      </div>

      {/* 📊 STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black uppercase text-gray-400">Total Revenue</p>
          <p className="text-3xl font-black">Rs. {stats.sales.toLocaleString()}</p>
        </div>

        <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black uppercase text-gray-400">Total Purchases</p>
          <p className="text-3xl font-black">Rs. {stats.purchases.toLocaleString()}</p>
        </div>

        <div className={`border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${stats.profit >= 0 ? 'bg-green-400' : 'bg-red-400'}`}>
          <p className="text-[10px] font-black uppercase">Net Profit/Loss</p>
          <p className="text-3xl font-black">Rs. {stats.profit.toLocaleString()}</p>
        </div>

        <div className="bg-black text-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]">
          <p className="text-[10px] font-black uppercase opacity-60">Total Customers</p>
          <p className="text-3xl font-black">{stats.customers}</p>
        </div>

        {/* ⚠️ ALERTS ROW */}
        <div className="md:col-span-2 bg-red-50 border-4 border-red-600 p-6 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black uppercase text-red-600">Overdue Receivables ({stats.overdueReceivablesCount})</p>
            <p className="text-3xl font-black text-red-700">Rs. {stats.overdueReceivables.toLocaleString()}</p>
          </div>
          <Link href="/dashboard/reports/ageing" className="bg-red-600 text-white px-4 py-2 font-bold hover:bg-red-800">
            VIEW DETAILS
          </Link>
        </div>

        <div className="md:col-span-2 bg-yellow-50 border-4 border-yellow-500 p-6 shadow-[8px_8px_0px_0px_rgba(234,179,8,1)] flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black uppercase text-yellow-700">Low Stock Items</p>
            <p className="text-3xl font-black text-yellow-800">{stats.lowStockCount}</p>
          </div>
          <Link href="/dashboard/reports/stock/low" className="bg-yellow-500 text-black px-4 py-2 font-bold hover:bg-yellow-600">
            CHECK STOCK
          </Link>
        </div>
      </div>

      {/* 🧾 SUBSCRIPTION STATUS */}
      {subInfo && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-[10px] font-black uppercase text-gray-400">Current Plan</p>
            <p className="text-3xl font-black">{subInfo.plan}</p>
          </div>
          <div className={`p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${subInfo.subscriptionStatus === "ACTIVE" ? "bg-green-100" : "bg-red-100"}`}>
            <p className="text-[10px] font-black uppercase text-gray-400">Subscription Status</p>
            <p className="text-3xl font-black">{subInfo.subscriptionStatus}</p>
          </div>
          <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Upgrade to PRO</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={priceId}
                onChange={(e) => setPriceId(e.target.value)}
                placeholder="Stripe Price ID"
                className="border-2 border-black px-2 py-1 text-sm flex-1"
              />
              <button
                onClick={async () => {
                  if (!priceId) return alert("Enter Stripe Price ID");
                  try {
                    const user = getCurrentUser();
                    const headers: Record<string, string> = { "Content-Type": "application/json" };
                    if (user?.role) headers["x-user-role"] = user.role;
                    if (user?.id) headers["x-user-id"] = user.id;
                    if (user?.companyId) headers["x-company-id"] = user.companyId;
                    const res = await fetch("/api/billing/checkout", {
                      method: "POST",
                      headers,
                      body: JSON.stringify({
                        planCode: "PRO",
                        priceId,
                        successUrl: window.location.origin + "/dashboard",
                        cancelUrl: window.location.origin + "/dashboard",
                      }),
                    });
                    const data = await res.json();
                    if (res.ok && data?.url) {
                      window.location.href = data.url;
                    } else {
                      alert(data?.error || "Stripe checkout failed");
                    }
                  } catch (err) {
                    alert("Checkout error");
                  }
                }}
                className="bg-black text-white px-4 py-2 font-bold text-sm hover:bg-gray-800"
              >
                Upgrade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 QUICK ACTIONS WITH LINKS */}
      <div className="mt-12">
        <h2 className="font-black uppercase text-lg mb-4 italic">Quick Navigation</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <Link href="/dashboard/sales-invoice" className="bg-white border-2 border-black p-4 font-bold text-center hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            ➕ NEW SALE
          </Link>

          <Link href="/dashboard/purchase-invoice" className="bg-white border-2 border-black p-4 font-bold text-center hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            📦 ADD PURCHASE
          </Link>

          <Link href="/dashboard/quotation" className="bg-white border-2 border-black p-4 font-bold text-center hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            📜 QUOTATION
          </Link>

          <Link href="/dashboard/delivery-challan" className="bg-white border-2 border-black p-4 font-bold text-center hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            🚚 CHALLAN
          </Link>

          <Link href="/dashboard/reports/trial-balance" className="bg-white border-2 border-black p-4 font-bold text-center hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            📑 TRIAL BALANCE
          </Link>

          <Link href="/dashboard/accounts" className="bg-white border-2 border-black p-4 font-bold text-center hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            👥 ALL ACCOUNTS
          </Link>

        </div>
      </div>

      {/* 💰 PHASE 1: BANKING & PAYMENT */}
      <div className="mt-12">
        <h2 className="font-black uppercase text-lg mb-4 italic">💰 Banking & Payment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <Link href="/dashboard/bank-reconciliation" className="bg-blue-50 border-2 border-blue-400 p-4 text-center hover:bg-blue-100 transition-all shadow-[4px_4px_0px_0px_rgba(59,130,246,0.3)]">
            <div className="font-bold text-lg mb-1">🏦</div>
            <div className="font-bold">Bank Reconciliation</div>
            <div className="text-xs text-gray-600">Match bank statements</div>
          </Link>

          <Link href="/dashboard/payment-receipts" className="bg-green-50 border-2 border-green-400 p-4 text-center hover:bg-green-100 transition-all shadow-[4px_4px_0px_0px_rgba(34,197,94,0.3)]">
            <div className="font-bold text-lg mb-1">💵</div>
            <div className="font-bold">Payment Receipts</div>
            <div className="text-xs text-gray-600">Record payments</div>
          </Link>

          <Link href="/dashboard/expense-vouchers" className="bg-purple-50 border-2 border-purple-400 p-4 text-center hover:bg-purple-100 transition-all shadow-[4px_4px_0px_0px_rgba(147,51,234,0.3)]">
            <div className="font-bold text-lg mb-1">📋</div>
            <div className="font-bold">Expense Vouchers</div>
            <div className="text-xs text-gray-600">Track expenses</div>
          </Link>

          <Link href="/dashboard/tax-configuration" className="bg-orange-50 border-2 border-orange-400 p-4 text-center hover:bg-orange-100 transition-all shadow-[4px_4px_0px_0px_rgba(249,115,22,0.3)]">
            <div className="font-bold text-lg mb-1">🔧</div>
            <div className="font-bold">Tax Configuration</div>
            <div className="text-xs text-gray-600">Set tax rates</div>
          </Link>

        </div>
      </div>

      {/* 📊 CHARTS */}
      {charts && (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <SimpleChart
              title="Sales Trend (This Month)"
              data={charts.salesTrend || []}
              type="bar"
            />
          </div>
          <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <SimpleChart
              title="Top Customers"
              data={(charts.topCustomers || []).map((c) => ({
                label: c.name,
                value: c.total,
                color: "#3b82f6",
              }))}
              type="bar"
            />
          </div>
          <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <SimpleChart
              title="Top Selling Items"
              data={(charts.topItems || []).map((i) => ({
                label: i.name,
                value: i.amount,
                color: "#10b981",
              }))}
              type="bar"
            />
          </div>
          <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <SimpleChart
              title="Purchases Trend (This Month)"
              data={charts.purchasesTrend || []}
              type="bar"
            />
          </div>
        </div>
      )}

      {/* HELP & GUIDE */}
      <div className="mt-6">
        <Link href="/dashboard/phase1-guide" className="inline-block bg-linear-to-r from-blue-500 to-purple-500 text-white font-bold px-6 py-2 rounded hover:shadow-lg transition-all">
          ℹ️ View Complete Phase 1 Guide
        </Link>
      </div>
    </div>
  );
}
