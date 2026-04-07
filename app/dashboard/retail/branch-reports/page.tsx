"use client";

import { useEffect, useMemo, useState } from "react";

type BranchReport = {
  id: string;
  code: string;
  name: string;
  city: string | null;
  isActive: boolean;
  sales: number;
  purchases: number;
  expenses: number;
  profit: number;
  transactions: number;
  customers: number;
  topItems: string[];
};

type ApiPayload = {
  branches: BranchReport[];
  summary: {
    sales: number;
    purchases: number;
    expenses: number;
    profit: number;
    transactions: number;
    customers: number;
  };
};

const periods = [
  { id: "today", name: "Today" },
  { id: "this_week", name: "This Week" },
  { id: "this_month", name: "This Month" },
  { id: "last_month", name: "Last Month" },
  { id: "this_year", name: "This Year" },
];

export default function BranchReportsPage() {
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [period, setPeriod] = useState("this_month");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiPayload>({
    branches: [],
    summary: { sales: 0, purchases: 0, expenses: 0, profit: 0, transactions: 0, customers: 0 },
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/retail/branch-reports?period=${period}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: ApiPayload | null) => {
        if (!active || !payload) return;
        setData(payload);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period]);

  const branches = data.branches;
  const branchOptions = [{ id: "all", name: "All Branches" }, ...branches.map((branch) => ({ id: branch.id, name: `${branch.code} - ${branch.name}` }))];
  const selectedRows = selectedBranch === "all" ? branches : branches.filter((branch) => branch.id === selectedBranch);

  const combined = useMemo(
    () =>
      selectedRows.reduce(
        (acc, row) => ({
          sales: acc.sales + row.sales,
          purchases: acc.purchases + row.purchases,
          expenses: acc.expenses + row.expenses,
          profit: acc.profit + row.profit,
          transactions: acc.transactions + row.transactions,
          customers: acc.customers + row.customers,
        }),
        { sales: 0, purchases: 0, expenses: 0, profit: 0, transactions: 0, customers: 0 },
      ),
    [selectedRows],
  );

  const lowMarginBranches = selectedRows.filter((row) => row.sales > 0 && (row.profit / row.sales) * 100 < 18).length;
  const lowTrafficBranches = selectedRows.filter((row) => row.transactions < 25).length;
  const topPerformingBranch = selectedRows.reduce<BranchReport | null>((best, row) => (!best || row.profit > best.profit ? row : best), null);

  const s = { fontFamily: "'Outfit','Inter',sans-serif" };

  return (
    <div style={{ ...s, minHeight: "100vh", background: "var(--app-bg)", padding: "28px 24px", color: "var(--text-primary)" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Branch Reports</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Live branch sales, purchases, expenses, and profitability by location.</p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} style={{ padding: "9px 14px", background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13 }}>
          {branchOptions.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ padding: "9px 14px", background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13 }}>
          {periods.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Sales", val: `Rs ${combined.sales.toLocaleString()}`, color: "#10b981" },
          { label: "Total Purchases", val: `Rs ${combined.purchases.toLocaleString()}`, color: "#818cf8" },
          { label: "Gross Profit", val: `Rs ${combined.profit.toLocaleString()}`, color: "#f59e0b" },
          { label: "Expenses", val: `Rs ${combined.expenses.toLocaleString()}`, color: "#ef4444" },
          { label: "Transactions", val: combined.transactions.toLocaleString(), color: "#6366f1" },
          { label: "Customers Served", val: combined.customers.toLocaleString(), color: "#34d399" },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color }}>{loading ? "..." : kpi.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Enterprise Summary</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
            {[
              { label: "Top Profit Branch", value: topPerformingBranch?.name || "N/A", color: "#34d399" },
              { label: "Low Margin Branches", value: String(lowMarginBranches), color: lowMarginBranches ? "#f59e0b" : "#22c55e" },
              { label: "Low Traffic Branches", value: String(lowTrafficBranches), color: lowTrafficBranches ? "#f97316" : "#22c55e" },
              { label: "Active Branches", value: String(selectedRows.filter((row) => row.isActive).length), color: "#818cf8" },
            ].map((item) => (
              <div key={item.label} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", background: "rgba(255,255,255,.02)" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{item.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{loading ? "..." : item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Action Watchlist</div>
          <div style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text-muted)" }}>
            Profit Risk: <span style={{ color: lowMarginBranches ? "#f59e0b" : "#22c55e" }}>{loading ? "..." : `${lowMarginBranches} branch(es)`}</span>
            <br />
            Traffic Risk: <span style={{ color: lowTrafficBranches ? "#f97316" : "#22c55e" }}>{loading ? "..." : `${lowTrafficBranches} branch(es)`}</span>
            <br />
            Best Performer: <span style={{ color: "#34d399" }}>{loading ? "..." : topPerformingBranch?.name || "N/A"}</span>
            <br />
            Focus Area: <span style={{ color: "#c4b5fd" }}>{selectedBranch === "all" ? "Cross-branch comparison" : branchOptions.find((entry) => entry.id === selectedBranch)?.name || "Selected branch"}</span>
          </div>
        </div>
      </div>

      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 24, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", fontSize: 14, fontWeight: 600 }}>Branch Comparison</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "rgba(99,102,241,.06)" }}>
              {["Branch", "Sales", "Purchases", "Expenses", "Profit", "Margin", "Transactions"].map((header) => (
                <th key={header} style={{ padding: "10px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: 36, textAlign: "center", color: "var(--text-muted)" }}>
                  Loading branch metrics...
                </td>
              </tr>
            ) : selectedRows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 36, textAlign: "center", color: "var(--text-muted)" }}>
                  No branch records yet.
                </td>
              </tr>
            ) : (
              selectedRows.map((row, index) => {
                const margin = row.sales > 0 ? ((row.profit / row.sales) * 100).toFixed(1) : "0.0";
                return (
                  <tr key={row.id} style={{ borderTop: "1px solid var(--border)", background: index % 2 === 0 ? "transparent" : "rgba(99,102,241,.02)" }}>
                    <td style={{ padding: "11px 16px", fontWeight: 600 }}>{row.name}</td>
                    <td style={{ padding: "11px 16px", color: "#10b981", fontWeight: 600 }}>Rs {row.sales.toLocaleString()}</td>
                    <td style={{ padding: "11px 16px", color: "#818cf8" }}>Rs {row.purchases.toLocaleString()}</td>
                    <td style={{ padding: "11px 16px", color: "#ef4444" }}>Rs {row.expenses.toLocaleString()}</td>
                    <td style={{ padding: "11px 16px", color: "#f59e0b", fontWeight: 600 }}>Rs {row.profit.toLocaleString()}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ background: "rgba(16,185,129,.1)", color: "#10b981", padding: "2px 8px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{margin}%</span>
                    </td>
                    <td style={{ padding: "11px 16px" }}>{row.transactions}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {selectedRows.map((row) => (
          <div key={row.id} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Top Items - {row.name}</div>
            {row.topItems.length ? (
              row.topItems.map((item, rank) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: rank === 0 ? "#f59e0b" : rank === 1 ? "#94a3b8" : "#b45309", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#0f172a", flexShrink: 0 }}>{rank + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item}</div>
                    <div style={{ height: 4, background: "var(--border)", borderRadius: 4, marginTop: 4 }}>
                      <div style={{ height: 4, background: rank === 0 ? "#f59e0b" : "#6366f1", borderRadius: 4, width: `${100 - rank * 22}%` }} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No top-selling items yet for this period.</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
