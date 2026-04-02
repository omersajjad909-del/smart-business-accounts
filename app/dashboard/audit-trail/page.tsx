"use client";
import { useState, useEffect, useCallback } from "react";
import { getCurrentUser } from "@/lib/auth";

const FONT = "'Outfit','Inter',sans-serif";

const ACTION_PALETTE: Record<string, { bg: string; color: string }> = {
  CREATE: { bg: "rgba(34,197,94,0.12)",   color: "#4ade80" },
  UPDATE: { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24" },
  DELETE: { bg: "rgba(239,68,68,0.12)",   color: "#f87171" },
  READ:   { bg: "rgba(99,102,241,0.12)",  color: "#a5b4fc" },
};

interface AuditLog {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  userName: string | null;
  userRole: string | null;
  description: string | null;
  beforeValues: string | null;
  afterValues: string | null;
  createdAt: string;
}

function Badge({ label }: { label: string }) {
  const style = ACTION_PALETTE[label] ?? { bg: "rgba(120,120,120,0.12)", color: "#aaa" };
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: style.bg, color: style.color, letterSpacing: 0.3 }}>
      {label}
    </span>
  );
}

function DiffViewer({ before, after }: { before: string | null; after: string | null }) {
  if (!before && !after) return null;
  let b: Record<string, unknown> = {};
  let a: Record<string, unknown> = {};
  try { if (before) b = JSON.parse(before); } catch {}
  try { if (after) a = JSON.parse(after); } catch {}
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
  return (
    <div style={{ marginTop: 10, background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "12px 14px", fontSize: 11, fontFamily: "monospace" }}>
      {keys.map(k => {
        const bv = b[k], av = a[k];
        const changed = JSON.stringify(bv) !== JSON.stringify(av);
        return (
          <div key={k} style={{ marginBottom: 4, color: changed ? "#fbbf24" : "rgba(255,255,255,0.4)" }}>
            <span style={{ color: "#a5b4fc" }}>{k}</span>:{" "}
            {changed && bv !== undefined && <><span style={{ color: "#f87171", textDecoration: "line-through" }}>{JSON.stringify(bv)}</span>{" → "}</>}
            <span style={{ color: changed ? "#4ade80" : "rgba(255,255,255,0.5)" }}>{JSON.stringify(av ?? bv)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filterEntity, setFilterEntity] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    const user = getCurrentUser();
    if (!user?.companyId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filterEntity) params.set("entity", filterEntity);
      if (filterAction) params.set("action", filterAction);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/audit-trail?${params}`, {
        headers: { "x-company-id": user.companyId, "x-user-id": user.id },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, filterEntity, filterAction, from, to]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const ENTITIES = ["SalesInvoice", "PurchaseInvoice", "PaymentReceipt", "Employee", "Account", "InventoryItem", "JournalVoucher", "User"];
  const ACTIONS  = ["CREATE", "UPDATE", "DELETE", "READ"];

  const th: React.CSSProperties = { padding: "11px 14px", textAlign: "left", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, borderBottom: "1px solid var(--border)", fontWeight: 600 };
  const td: React.CSSProperties = { padding: "12px 14px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text-primary)", verticalAlign: "top" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg)", padding: "32px 28px", fontFamily: FONT, color: "var(--text-primary)" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.5 }}>Audit Trail</h1>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Complete history of all changes made in your account</p>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Events", value: total, color: "#6366f1" },
          { label: "Current Page", value: `${logs.length} shown`, color: "#a5b4fc" },
          { label: "Entities Tracked", value: ENTITIES.length + "+", color: "#10b981" },
          { label: "Retention", value: "90 days", color: "#fbbf24" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select
          value={filterEntity}
          onChange={e => { setFilterEntity(e.target.value); setPage(1); }}
          style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 13px", color: "var(--text-primary)", fontSize: 13, fontFamily: FONT, outline: "none" }}
        >
          <option value="">All Entities</option>
          {ENTITIES.map(e => <option key={e}>{e}</option>)}
        </select>
        <select
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setPage(1); }}
          style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 13px", color: "var(--text-primary)", fontSize: 13, fontFamily: FONT, outline: "none" }}
        >
          <option value="">All Actions</option>
          {ACTIONS.map(a => <option key={a}>{a}</option>)}
        </select>
        <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}
          style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 13px", color: "var(--text-primary)", fontSize: 13, fontFamily: FONT, outline: "none" }} />
        <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}
          style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 13px", color: "var(--text-primary)", fontSize: 13, fontFamily: FONT, outline: "none" }} />
        <button onClick={fetchLogs} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 9, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
          Refresh
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--text-muted)", fontSize: 15 }}>Loading audit logs…</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--text-muted)", fontSize: 15 }}>
            No audit events found. Actions like creating invoices, editing records, and deleting entries will appear here.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Time", "Action", "Entity", "Record", "User", "Description", "Details"].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <>
                  <tr key={log.id} style={{ background: i % 2 === 1 ? "rgba(255,255,255,0.013)" : "transparent" }}>
                    <td style={{ ...td, fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={td}><Badge label={log.action} /></td>
                    <td style={{ ...td, fontSize: 12, color: "#a5b4fc", fontWeight: 600 }}>{log.entity}</td>
                    <td style={{ ...td, fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)" }}>
                      {log.entityId.slice(0, 12)}…
                    </td>
                    <td style={td}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{log.userName || "System"}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{log.userRole || ""}</div>
                    </td>
                    <td style={{ ...td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, color: "var(--text-muted)" }}>
                      {log.description || "—"}
                    </td>
                    <td style={td}>
                      {(log.beforeValues || log.afterValues) && (
                        <button
                          onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                          style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 7, padding: "4px 10px", fontSize: 11, cursor: "pointer", color: "var(--text-muted)", fontFamily: FONT }}
                        >
                          {expanded === log.id ? "Hide" : "View Diff"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === log.id && (
                    <tr key={log.id + "-diff"}>
                      <td colSpan={7} style={{ padding: "0 14px 14px", background: "rgba(0,0,0,0.15)" }}>
                        <DiffViewer before={log.beforeValues} after={log.afterValues} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 16px", fontSize: 13, cursor: "pointer", color: "var(--text-muted)", fontFamily: FONT, opacity: page === 1 ? 0.4 : 1 }}>
            ← Prev
          </button>
          <span style={{ display: "flex", alignItems: "center", fontSize: 13, color: "var(--text-muted)" }}>
            Page {page} of {Math.ceil(total / 50)}
          </span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50)}
            style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 16px", fontSize: 13, cursor: "pointer", color: "var(--text-muted)", fontFamily: FONT, opacity: page >= Math.ceil(total / 50) ? 0.4 : 1 }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
