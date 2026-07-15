"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type UsageRow = Record<string, string | number | null>;

function formatDate(value: string | number | null) {
  if (!value) return "Never";
  return new Date(String(value)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMoney(v: string | number | null) {
  return `$${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    STARTER:    { bg: "rgba(100,116,139,.2)", text: "#94a3b8" },
    PRO:        { bg: "rgba(99,102,241,.2)",  text: "#818cf8" },
    ENTERPRISE: { bg: "rgba(56,189,248,.18)", text: "#38bdf8" },
  };
  const c = colors[String(plan || "").toUpperCase()] ?? { bg: "rgba(255,255,255,.08)", text: "#94a3b8" };
  return (
    <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: ".05em", background: c.bg, color: c.text }}>
      {plan || "—"}
    </span>
  );
}

export default function AdminUsagePage() {
  const [active,      setActive]      = useState<UsageRow[] | null>(null);
  const [risk,        setRisk]        = useState<UsageRow[] | null>(null);
  const [highInvoice, setHighInvoice] = useState<UsageRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    const u = getCurrentUser();
    const headers: Record<string, string> = {};
    if (u?.role)      headers["x-user-role"]   = u.role;
    if (u?.id)        headers["x-user-id"]      = u.id;
    if (u?.companyId) headers["x-company-id"]   = u.companyId;
    const opts = { cache: "no-store" as const, headers, credentials: "include" as const };

    Promise.all([
      fetch("/api/admin/usage/top-active",  opts).then(r => r.ok ? r.json() : { rows: [] }),
      fetch("/api/admin/usage/at-risk?days=14", opts).then(r => r.ok ? r.json() : { rows: [] }),
      fetch("/api/admin/usage/high-invoice", opts).then(r => r.ok ? r.json() : { rows: [] }),
    ]).then(([a, r, h]) => {
      if (!alive) return;
      setActive(a?.rows ?? []);
      setRisk(r?.rows ?? []);
      setHighInvoice(h?.rows ?? []);
    }).catch(() => {
      if (!alive) return;
      setActive([]); setRisk([]); setHighInvoice([]);
    });

    return () => { alive = false; };
  }, []);

  const stats = [
    { label: "Top Active",   value: active?.length       ?? 0, color: "#34d399", sub: "Last 7 days" },
    { label: "At Risk",      value: risk?.length         ?? 0, color: "#f87171", sub: "No activity 14+ days" },
    { label: "High Invoice", value: highInvoice?.length  ?? 0, color: "#fbbf24", sub: "30-day volume leaders" },
  ];

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 80px" }}>
      <style>{css}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Usage Insights</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
          Live activity, risky accounts, and invoice-heavy companies.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.65)", marginTop: 6 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 3 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Top 2 in a grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Top Active */}
        <div style={card}>
          <div style={cardHead}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>Top 10 Most Active (7d)</span>
            <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700 }}>REAL TRACES</span>
          </div>
          {!active ? (
            <div style={emptyState}>Loading…</div>
          ) : active.length === 0 ? (
            <div style={emptyState}>No activity in last 7 days</div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>{["#", "Company", "Country", "Usage", "Sessions"].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {active.map((row, i) => (
                  <tr key={String(row.id || i)} className="u-row">
                    <td style={{ ...tdStyle, color: "rgba(255,255,255,.3)", fontSize: 12, width: 28 }}>{i + 1}</td>
                    <td style={tdStyle}>
                      <a href={`/admin/companies/${row.id}`} style={{ color: "#818cf8", fontWeight: 700, fontSize: 13, textDecoration: "none" }} className="u-link">
                        {String(row.name || "—")}
                      </a>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: "rgba(255,255,255,.5)" }}>{String(row.country || "—")}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#34d399" }}>{String(row.activity ?? "—")}</td>
                    <td style={{ ...tdStyle, textAlign: "right", color: "rgba(255,255,255,.5)" }}>{String(row.sessions7d ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* At Risk */}
        <div style={card}>
          <div style={cardHead}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>At-Risk (no activity ≥ 14d)</span>
            <span style={{ fontSize: 11, color: "#f87171", fontWeight: 700 }}>NEEDS ATTENTION</span>
          </div>
          {!risk ? (
            <div style={emptyState}>Loading…</div>
          ) : risk.length === 0 ? (
            <div style={emptyState}>No at-risk accounts</div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>{["Company", "Plan", "Last Seen"].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {risk.map((row, i) => (
                  <tr key={String(row.id || i)} className="u-row">
                    <td style={tdStyle}>
                      <a href={`/admin/companies/${row.id}`} style={{ color: "#f87171", fontWeight: 700, fontSize: 13, textDecoration: "none" }} className="u-link">
                        {String(row.name || "—")}
                      </a>
                    </td>
                    <td style={tdStyle}><PlanBadge plan={String(row.plan || "")} /></td>
                    <td style={{ ...tdStyle, fontSize: 12, color: "rgba(255,255,255,.45)" }}>
                      {formatDate(row.lastLogin as string | null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* High Invoice — full width */}
      <div style={card}>
        <div style={cardHead}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>High Invoice Volume (30d)</span>
          <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700 }}>BILLING LEADERS</span>
        </div>
        {!highInvoice ? (
          <div style={emptyState}>Loading…</div>
        ) : highInvoice.length === 0 ? (
          <div style={emptyState}>No invoices in last 30 days</div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>{["Company", "Country", "Invoices", "Amount"].map(h => (
                <th key={h} style={h === "Amount" || h === "Invoices" ? { ...thStyle, textAlign: "right" } : thStyle}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {highInvoice.map((row, i) => (
                <tr key={String(row.id || i)} className="u-row">
                  <td style={tdStyle}>
                    <a href={`/admin/companies/${row.id}`} style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13, textDecoration: "none" }} className="u-link">
                      {String(row.name || "—")}
                    </a>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: "rgba(255,255,255,.5)" }}>{String(row.country || "—")}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{String(row.invoices ?? "—")}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#34d399" }}>
                    {formatMoney(row.amount as number | null)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "linear-gradient(160deg, rgba(19,27,50,.98), rgba(15,22,42,.98))",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 20,
  padding: "20px 22px",
  boxShadow: "0 16px 40px rgba(3,8,21,.22)",
};

const cardHead: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 16,
  paddingBottom: 12,
  borderBottom: "1px solid rgba(255,255,255,.06)",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  padding: "0 0 10px",
  fontSize: 10,
  fontWeight: 700,
  color: "rgba(148,163,184,.6)",
  textTransform: "uppercase",
  letterSpacing: ".08em",
  textAlign: "left",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 0",
  fontSize: 13,
  borderBottom: "1px solid rgba(255,255,255,.05)",
};

const emptyState: React.CSSProperties = {
  padding: "24px 0",
  textAlign: "center",
  color: "rgba(255,255,255,.3)",
  fontSize: 13,
};

const css = `
  .u-row:hover td { background:rgba(255,255,255,.02); }
  .u-link:hover { text-decoration:underline !important; }
  @media(max-width:900px){ .u-grid { grid-template-columns:1fr !important; } }
`;
