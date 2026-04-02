"use client";
import { useState } from "react";

const BRANCHES = [
  { id: "all", name: "All Branches" },
  { id: "b1", name: "Main Store - Lahore" },
  { id: "b2", name: "Branch - Karachi" },
  { id: "b3", name: "Branch - Islamabad" },
];

const BRANCH_DATA = {
  b1: { sales: 385000, purchases: 210000, expenses: 45000, profit: 130000, transactions: 842, customers: 124, topItems: ["Basmati Rice", "Cooking Oil", "Sugar"] },
  b2: { sales: 228000, purchases: 145000, expenses: 32000, profit: 51000, transactions: 521, customers: 89, topItems: ["Cooking Oil", "Flour", "Tea"] },
  b3: { sales: 142000, purchases: 98000, expenses: 21000, profit: 23000, transactions: 318, customers: 56, topItems: ["Sugar", "Flour", "Rice"] },
};

type BranchId = keyof typeof BRANCH_DATA;
type BranchMetrics = typeof BRANCH_DATA[BranchId];

export default function BranchReportsPage() {
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [period, setPeriod] = useState("this_month");

  const branchIds = (selectedBranch === "all" ? ["b1", "b2", "b3"] : [selectedBranch]) as BranchId[];
  const combined = branchIds.reduce((acc, id) => {
    const d = BRANCH_DATA[id];
    if (!d) return acc;
    return { sales: acc.sales + d.sales, purchases: acc.purchases + d.purchases, expenses: acc.expenses + d.expenses, profit: acc.profit + d.profit, transactions: acc.transactions + d.transactions, customers: acc.customers + d.customers };
  }, { sales: 0, purchases: 0, expenses: 0, profit: 0, transactions: 0, customers: 0 });
  const branchSnapshots = branchIds
    .map((id) => ({ id, branch: BRANCHES.find((entry) => entry.id === id), metrics: BRANCH_DATA[id] as BranchMetrics }))
    .filter((entry): entry is { id: BranchId; branch: { id: string; name: string } | undefined; metrics: BranchMetrics } => Boolean(entry.metrics));
  const lowMarginBranches = branchSnapshots.filter((entry) => (entry.metrics.profit / entry.metrics.sales) * 100 < 18).length;
  const lowTrafficBranches = branchSnapshots.filter((entry) => entry.metrics.transactions < 400).length;
  const topPerformingBranch = branchSnapshots.reduce<{ id: BranchId; branch: { id: string; name: string } | undefined; metrics: BranchMetrics } | null>(
    (best, entry) => (!best || entry.metrics.profit > best.metrics.profit ? entry : best),
    null,
  );

  const s = { fontFamily: "'Outfit','Inter',sans-serif" };

  return (
    <div style={{ ...s, minHeight: "100vh", background: "var(--app-bg)", padding: "28px 24px", color: "var(--text-primary)" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>📊 Branch Reports</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Sales, profit & performance by branch</p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} style={{ padding: "9px 14px", background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13 }}>
          {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={period} onChange={e => setPeriod(e.target.value)} style={{ padding: "9px 14px", background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13 }}>
          <option value="today">Today</option>
          <option value="this_week">This Week</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_year">This Year</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Sales", val: `Rs ${combined.sales.toLocaleString()}`, color: "#10b981", icon: "📈" },
          { label: "Total Purchases", val: `Rs ${combined.purchases.toLocaleString()}`, color: "#818cf8", icon: "🛒" },
          { label: "Gross Profit", val: `Rs ${combined.profit.toLocaleString()}`, color: "#f59e0b", icon: "💰" },
          { label: "Expenses", val: `Rs ${combined.expenses.toLocaleString()}`, color: "#ef4444", icon: "💸" },
          { label: "Transactions", val: combined.transactions.toLocaleString(), color: "#6366f1", icon: "🧾" },
          { label: "Customers Served", val: combined.customers.toLocaleString(), color: "#34d399", icon: "👥" },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{kpi.icon} {kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color }}>{kpi.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Enterprise Summary</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
            {[
              { label: "Top Profit Branch", value: topPerformingBranch?.branch?.name || "N/A", color: "#34d399" },
              { label: "Low Margin Branches", value: String(lowMarginBranches), color: lowMarginBranches ? "#f59e0b" : "#22c55e" },
              { label: "Low Traffic Branches", value: String(lowTrafficBranches), color: lowTrafficBranches ? "#f97316" : "#22c55e" },
              { label: "Period", value: period.replaceAll("_", " "), color: "#818cf8" },
            ].map((item) => (
              <div key={item.label} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", background: "rgba(255,255,255,.02)" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{item.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Action Watchlist</div>
          <div style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text-muted)" }}>
            Profit Risk: <span style={{ color: lowMarginBranches ? "#f59e0b" : "#22c55e" }}>{lowMarginBranches} branch(es)</span>
            <br />
            Traffic Risk: <span style={{ color: lowTrafficBranches ? "#f97316" : "#22c55e" }}>{lowTrafficBranches} branch(es)</span>
            <br />
            Best Performer: <span style={{ color: "#34d399" }}>{topPerformingBranch?.branch?.name || "N/A"}</span>
            <br />
            Focus Area: <span style={{ color: "#c4b5fd" }}>{selectedBranch === "all" ? "Cross-branch comparison" : BRANCHES.find((entry) => entry.id === selectedBranch)?.name || "Selected branch"}</span>
          </div>
        </div>
      </div>

      {/* Branch Comparison Table */}
      {selectedBranch === "all" && (
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 24, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", fontSize: 14, fontWeight: 600 }}>
            📊 Branch Comparison
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(99,102,241,.06)" }}>
                {["Branch","Sales","Purchases","Profit","Margin","Transactions"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["b1", "b2", "b3"] as BranchId[]).map((id, i) => {
                const d = BRANCH_DATA[id];
                const branch = BRANCHES.find(b => b.id === id);
                const margin = ((d.profit / d.sales) * 100).toFixed(1);
                return (
                  <tr key={id} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(99,102,241,.02)" }}>
                    <td style={{ padding: "11px 16px", fontWeight: 600 }}>{branch?.name}</td>
                    <td style={{ padding: "11px 16px", color: "#10b981", fontWeight: 600 }}>Rs {d.sales.toLocaleString()}</td>
                    <td style={{ padding: "11px 16px", color: "#818cf8" }}>Rs {d.purchases.toLocaleString()}</td>
                    <td style={{ padding: "11px 16px", color: "#f59e0b", fontWeight: 600 }}>Rs {d.profit.toLocaleString()}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ background: "rgba(16,185,129,.1)", color: "#10b981", padding: "2px 8px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{margin}%</span>
                    </td>
                    <td style={{ padding: "11px 16px" }}>{d.transactions}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Top Items per Branch */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {branchIds.map((id) => {
          const d = BRANCH_DATA[id];
          const branch = BRANCHES.find(b => b.id === id);
          if (!d) return null;
          return (
            <div key={id} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>🏆 Top Items — {branch?.name?.split(" - ")[0]}</div>
              {d.topItems.map((item: string, rank: number) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: rank === 0 ? "#f59e0b" : rank === 1 ? "#94a3b8" : "#b45309", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#0f172a", flexShrink: 0 }}>{rank + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item}</div>
                    <div style={{ height: 4, background: "var(--border)", borderRadius: 4, marginTop: 4 }}>
                      <div style={{ height: 4, background: rank === 0 ? "#f59e0b" : "#6366f1", borderRadius: 4, width: `${100 - rank * 22}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
