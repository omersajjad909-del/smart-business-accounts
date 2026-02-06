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
  const [stats, setStats] = useState({
    sales: 0,
    purchases: 0,
    profit: 0,
    customers: 0,
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

        const [statsRes, chartsRes] = await Promise.all([
          fetch('/api/reports/dashboard-summary', { headers }),
          fetch('/api/reports/dashboard-charts?period=month', { headers })
        ]);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats({
            sales: Number(statsData?.sales || 0),
            purchases: Number(statsData?.purchases || 0),
            profit: Number(statsData?.profit || 0),
            customers: Number(statsData?.customers || 0),
          });
        } else {
          setStats({ sales: 0, purchases: 0, profit: 0, customers: 0 });
        }

        if (chartsRes.ok) {
          const chartsData = await chartsRes.json();
          setCharts(chartsData);
        } else {
          setCharts(null);
        }
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
      </div>

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
