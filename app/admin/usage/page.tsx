"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type UsageRow = Record<string, string | number | null>;

export default function AdminUsagePage() {
  const [active, setActive] = useState<UsageRow[] | null>(null);
  const [risk, setRisk] = useState<UsageRow[] | null>(null);
  const [highInvoice, setHighInvoice] = useState<UsageRow[] | null>(null);

  useEffect(() => {
    let activePage = true;

    const load = async () => {
      const u = getCurrentUser();
      const headers: Record<string, string> = {};
      if (u?.role) headers["x-user-role"] = u.role;
      if (u?.id) headers["x-user-id"] = u.id;
      if (u?.companyId) headers["x-company-id"] = u.companyId;

      try {
        const response = await fetch("/api/admin/usage/top-active", {
          cache: "no-store",
          headers,
          credentials: "include" as RequestCredentials,
        });
        const json = await response.json();
        if (activePage) setActive(response.ok ? json.rows : []);
      } catch {
        if (activePage) setActive([]);
      }

      try {
        const response = await fetch("/api/admin/usage/at-risk?days=14", {
          cache: "no-store",
          headers,
          credentials: "include" as RequestCredentials,
        });
        const json = await response.json();
        if (activePage) setRisk(response.ok ? json.rows : []);
      } catch {
        if (activePage) setRisk([]);
      }

      try {
        const response = await fetch("/api/admin/usage/high-invoice", {
          cache: "no-store",
          headers,
          credentials: "include" as RequestCredentials,
        });
        const json = await response.json();
        if (activePage) setHighInvoice(response.ok ? json.rows : []);
      } catch {
        if (activePage) setHighInvoice([]);
      }
    };

    load();
    return () => {
      activePage = false;
    };
  }, []);

  const stats = [
    { label: "Top Active", value: active?.length ?? 0, helper: "Last 7 days" },
    { label: "At Risk", value: risk?.length ?? 0, helper: "No recent usage" },
    { label: "High Invoice", value: highInvoice?.length ?? 0, helper: "30 day leaders" },
  ];

  return (
    <div className="usage-page">
      <style>{styles}</style>

      <div className="usage-header">
        <div>
          <h1>Usage Insights</h1>
          <p>Live activity, risky accounts, and invoice-heavy companies from the current admin data.</p>
        </div>
      </div>

      <div className="usage-stats">
        {stats.map((item) => (
          <article key={item.label} className="usage-stat">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.helper}</small>
          </article>
        ))}
      </div>

      <div className="usage-grid">
        <section className="usage-card">
          <div className="usage-card-head">
            <h2>Top 10 Most Active (7d)</h2>
            <span>Real traces</span>
          </div>
          <UsageTable
            rows={active}
            cols={[
              { k: "name", t: "Company" },
              { k: "country", t: "Country" },
              { k: "activity", t: "Usage", r: true },
              { k: "sessions7d", t: "Sessions", r: true },
            ]}
          />
        </section>

        <section className="usage-card">
          <div className="usage-card-head">
            <h2>At-Risk (no activity &gt;= 14d)</h2>
            <span>Latest seen</span>
          </div>
          <UsageTable
            rows={risk}
            cols={[
              { k: "name", t: "Company" },
              { k: "plan", t: "Plan" },
              { k: "lastLogin", t: "Last Seen", fmt: (v) => (v ? formatDate(v) : "Never") },
            ]}
          />
        </section>

        <section className="usage-card usage-card--wide">
          <div className="usage-card-head">
            <h2>High Invoice Volume (30d)</h2>
            <span>Invoice output</span>
          </div>
          <UsageTable
            rows={highInvoice}
            cols={[
              { k: "name", t: "Company" },
              { k: "country", t: "Country" },
              { k: "invoices", t: "Invoices", r: true },
              { k: "amount", t: "Amount", r: true, fmt: (v) => `$${Number(v || 0).toFixed(0)}` },
            ]}
          />
        </section>
      </div>
    </div>
  );
}

function UsageTable({
  rows,
  cols,
}: {
  rows: UsageRow[] | null;
  cols: Array<{ k: string; t: string; r?: boolean; fmt?: (value: string | number | null) => string }>;
}) {
  if (!rows) return <div className="usage-empty">Loading...</div>;
  if (rows.length === 0) return <div className="usage-empty">No live data found</div>;

  return (
    <div className="usage-table-wrap">
      <table className="usage-table">
        <thead>
          <tr>
            {cols.map((col) => (
              <th key={col.k} className={col.r ? "is-right" : ""}>
                {col.t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${String(row.id || row.name)}-${index}`}>
              {cols.map((col) => (
                <td key={col.k} className={col.r ? "is-right" : ""}>
                  {col.fmt ? col.fmt((row[col.k] as string | number | null) ?? null) : String(row[col.k] ?? "-")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(value: string | number | null) {
  if (!value) return "Never";
  return new Date(String(value)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const styles = `
.usage-page{
  display:grid;
  gap:18px;
}
.usage-header h1{
  margin:0;
  font-size:34px;
  font-weight:800;
  letter-spacing:-.05em;
}
.usage-header p{
  margin:6px 0 0;
  color:rgba(203,213,225,.72);
  font-size:14px;
}
.usage-stats{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:16px;
}
.usage-stat,.usage-card{
  border-radius:22px;
  border:1px solid rgba(255,255,255,.08);
  background:linear-gradient(180deg, rgba(19,27,46,.98), rgba(15,22,39,.96));
  box-shadow:0 24px 70px rgba(3,6,18,.22);
}
.usage-stat{
  padding:18px;
}
.usage-stat span{
  font-size:13px;
  color:rgba(203,213,225,.72);
}
.usage-stat strong{
  display:block;
  margin-top:10px;
  font-size:34px;
  line-height:1;
}
.usage-stat small{
  display:block;
  margin-top:8px;
  color:#86efac;
  font-size:12px;
  font-weight:700;
}
.usage-grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:16px;
}
.usage-card{
  padding:18px;
}
.usage-card--wide{
  grid-column:1 / -1;
}
.usage-card-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  margin-bottom:14px;
}
.usage-card-head h2{
  margin:0;
  font-size:20px;
  font-weight:800;
  letter-spacing:-.03em;
}
.usage-card-head span{
  color:#bca9ff;
  font-size:12px;
  font-weight:700;
}
.usage-table-wrap{
  overflow:auto;
}
.usage-table{
  width:100%;
  min-width:520px;
  border-collapse:collapse;
}
.usage-table th,.usage-table td{
  padding:12px 0;
  border-bottom:1px solid rgba(255,255,255,.06);
  text-align:left;
}
.usage-table th{
  color:rgba(148,163,184,.72);
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.08em;
}
.usage-table td{
  color:#e2e8f0;
  font-size:13px;
}
.usage-table .is-right{
  text-align:right;
}
.usage-empty{
  padding:16px 0;
  color:rgba(148,163,184,.72);
  font-size:13px;
}
@media (max-width: 1100px){
  .usage-stats,
  .usage-grid{
    grid-template-columns:1fr;
  }
  .usage-card--wide{
    grid-column:auto;
  }
}
@media (max-width: 640px){
  .usage-header h1{
    font-size:26px;
  }
  .usage-stat{
    padding:14px;
  }
  .usage-stat strong{
    font-size:28px;
  }
  .usage-card{
    padding:14px;
    border-radius:18px;
  }
  .usage-card-head{
    flex-direction:column;
    align-items:flex-start;
  }
}
`;
