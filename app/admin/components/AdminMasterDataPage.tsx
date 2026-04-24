"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Column<T> = {
  key: string;
  label: string;
  render: (item: T) => React.ReactNode;
};

type AdminMasterDataPageProps<T> = {
  title: string;
  subtitle: string;
  endpoint: string;
  metricLabel: string;
  emptyTitle: string;
  emptyHint: string;
  columns: Column<T>[];
};

function getHeaders() {
  const user = getCurrentUser();
  return {
    "Content-Type": "application/json",
    "x-user-id": user?.id || "",
    "x-user-role": user?.role || "",
    "x-company-id": user?.companyId || "",
  };
}

export default function AdminMasterDataPage<T>({
  title,
  subtitle,
  endpoint,
  metricLabel,
  emptyTitle,
  emptyHint,
  columns,
}: AdminMasterDataPageProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(endpoint, {
          credentials: "include",
          headers: getHeaders(),
          cache: "no-store",
        });
        const data = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(data?.error || "Unable to load this section.");
        }

        if (!active) return;
        setItems(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load this section.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [endpoint]);

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "var(--text)", paddingBottom: 40 }}>
      <style>{masterStyles}</style>

      <div style={{ marginBottom: 26 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "var(--text)" }}>{title}</h1>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{subtitle}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 20 }}>
        <div className="master-metric-card">
          <div className="master-metric-label">{metricLabel}</div>
          <div className="master-metric-value">
            {loading ? "..." : items.length}
          </div>
        </div>
      </div>

      <div className="master-table-wrap">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
            <thead>
              <tr className="master-thead-row">
                {columns.map((column) => (
                  <th key={column.key} className="master-th">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="master-state-cell">
                    <span className="master-loading-dots">Loading</span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={columns.length} className="master-state-cell master-error-cell">
                    {error}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="master-state-cell">
                    <div className="master-empty-title">{emptyTitle}</div>
                    <div className="master-empty-hint">{emptyHint}</div>
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={index} className={`master-row${index === items.length - 1 ? " master-row--last" : ""}`}>
                    {columns.map((column) => (
                      <td key={column.key} className="master-td">
                        {column.render(item)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const masterStyles = `
.master-metric-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 20px 22px;
}
.master-metric-label {
  font-size: 11px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 700;
}
.master-metric-value {
  margin-top: 8px;
  font-size: 34px;
  font-weight: 800;
  color: #a78bfa;
}
.master-table-wrap {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
}
.master-thead-row {
  border-bottom: 1px solid var(--border);
}
.master-th {
  padding: 14px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
}
.master-row {
  border-bottom: 1px solid var(--border);
  transition: background .12s ease;
}
.master-row:hover {
  background: var(--bg-soft);
}
.master-row--last {
  border-bottom: none;
}
.master-td {
  padding: 14px 16px;
  font-size: 13px;
  color: var(--text-soft);
  white-space: nowrap;
}
.master-state-cell {
  padding: 44px 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
.master-error-cell {
  color: #fda4af;
}
.master-empty-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-soft);
  margin-bottom: 6px;
}
.master-empty-hint {
  font-size: 12px;
  color: var(--text-muted);
}
.master-loading-dots::after {
  content: '...';
  animation: masterDots 1.2s steps(3, end) infinite;
}
@keyframes masterDots {
  0%   { content: '.'; }
  33%  { content: '..'; }
  66%  { content: '...'; }
}
`;
