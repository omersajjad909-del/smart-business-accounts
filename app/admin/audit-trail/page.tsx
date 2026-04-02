"use client";
import { useEffect, useState, useCallback } from "react";

type LogEntry = {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  targetLabel?: string | null;
  companyId?: string | null;
  details?: string | null;
  createdAt: string;
};

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  IMPERSONATE_USER:       { bg: "rgba(245,158,11,.12)",  text: "#f59e0b" },
  CHANGE_PLAN:            { bg: "rgba(99,102,241,.12)",  text: "#818cf8" },
  CANCEL_SUBSCRIPTION:    { bg: "rgba(239,68,68,.12)",   text: "#f87171" },
  ACTIVATE_SUBSCRIPTION:  { bg: "rgba(34,197,94,.12)",   text: "#22c55e" },
  UPDATE_COMPANY:         { bg: "rgba(56,189,248,.12)",  text: "#38bdf8" },
  DELETE_USER:            { bg: "rgba(239,68,68,.15)",   text: "#ef4444" },
  ADMIN_LOGIN:            { bg: "rgba(167,139,250,.12)", text: "#a78bfa" },
};

function ActionBadge({ action }: { action: string }) {
  const c = ACTION_COLORS[action] ?? { bg: "rgba(255,255,255,.08)", text: "#94a3b8" };
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, background: c.bg, color: c.text, fontSize: 11, fontWeight: 800, letterSpacing: ".04em", whiteSpace: "nowrap" }}>
      {action.replace(/_/g, " ")}
    </span>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminAuditTrailPage() {
  const [logs,    setLogs]    = useState<LogEntry[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Filters
  const [filterAction, setFilterAction] = useState("");
  const [filterAdmin,  setFilterAdmin]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (filterAction) params.set("action", filterAction);
      if (filterAdmin)  params.set("adminEmail", filterAdmin);
      const r = await fetch(`/api/admin/audit-trail?${params}`, { credentials: "include" });
      const j = await r.json();
      if (j.pending_migration) { setPending(true); setLogs([]); }
      else { setLogs(j.logs || []); setTotal(j.total || 0); setPages(j.pages || 1); }
    } catch { setLogs([]); }
    setLoading(false);
  }, [page, filterAction, filterAdmin]);

  useEffect(() => { load(); }, [load]);

  const COMMON_ACTIONS = ["IMPERSONATE_USER", "CHANGE_PLAN", "CANCEL_SUBSCRIPTION", "ACTIVATE_SUBSCRIPTION", "UPDATE_COMPANY"];

  return (
    <div style={{ padding: "28px 24px", minHeight: "100vh", background: "#060918" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <a href="/admin/companies" style={{ color: "#475569", textDecoration: "none", fontSize: 13 }}>← Companies</a>
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "white" }}>Admin Audit Trail</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#475569" }}>
            Every action taken by admin team members — {total} total entries
          </p>
        </div>
        <button onClick={load} style={{ padding: "9px 18px", borderRadius: 10, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          ↻ Refresh
        </button>
      </div>

      {pending && (
        <div style={{ padding: "20px 24px", borderRadius: 16, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.25)", marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b", marginBottom: 6 }}>⚠️ Migration Required</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)", lineHeight: 1.7 }}>
            The <code style={{ background: "rgba(255,255,255,.08)", padding: "2px 6px", borderRadius: 4 }}>AdminActionLog</code> table does not exist yet.
            Run the migration at <code style={{ background: "rgba(255,255,255,.08)", padding: "2px 6px", borderRadius: 4 }}>prisma/migrations/manual_admin_action_log.sql</code> in your Supabase SQL editor.
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={filterAdmin} onChange={e => { setFilterAdmin(e.target.value); setPage(1); }}
          placeholder="🔍  Filter by admin email..."
          style={{ flex: 1, minWidth: 200, padding: "9px 14px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "white", fontSize: 13, outline: "none" }} />
        <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}
          style={{ padding: "9px 14px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", fontSize: 13, outline: "none", cursor: "pointer" }}>
          <option value="">All Actions</option>
          {COMMON_ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {/* Log list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#475569", fontSize: 14 }}>Loading audit trail…</div>
      ) : logs.length === 0 && !pending ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#334155", fontSize: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          No audit log entries yet. Actions taken by admin team members will appear here.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {logs.map(log => {
            const isExpanded = expanded === log.id;
            let parsedDetails: any = null;
            try { if (log.details) parsedDetails = JSON.parse(log.details); } catch {}
            return (
              <div key={log.id} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, overflow: "hidden", transition: "border-color .15s" }}>
                {/* Main row */}
                <div
                  style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", cursor: parsedDetails ? "pointer" : "default" }}
                  onClick={() => parsedDetails && setExpanded(isExpanded ? null : log.id)}
                >
                  {/* Action */}
                  <ActionBadge action={log.action} />
                  {/* Target */}
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
                      {log.targetLabel || log.targetId || log.targetType}
                    </div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                      {log.targetType}{log.companyId ? ` · Company ID: ${log.companyId.slice(0, 8)}…` : ""}
                    </div>
                  </div>
                  {/* Admin */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{log.adminEmail}</div>
                    <div style={{ fontSize: 11, color: "#334155", marginTop: 2 }}>{timeAgo(log.createdAt)}</div>
                  </div>
                  {parsedDetails && (
                    <span style={{ color: "#334155", fontSize: 11, transition: "transform .15s", transform: isExpanded ? "rotate(180deg)" : "none" }}>▼</span>
                  )}
                </div>
                {/* Expanded detail */}
                {isExpanded && parsedDetails && (
                  <div style={{ padding: "12px 18px 16px", borderTop: "1px solid rgba(255,255,255,.06)", background: "rgba(0,0,0,.2)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 10, letterSpacing: ".06em" }}>ACTION DETAILS</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                      {Object.entries(parsedDetails).map(([k, v]) => (
                        <div key={k}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", letterSpacing: ".05em", marginBottom: 3 }}>{k.replace(/([A-Z])/g, " $1").toUpperCase()}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8", wordBreak: "break-all" }}>
                            {v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 11, color: "#334155" }}>
                      Log ID: {log.id} · {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 24 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: page <= 1 ? "not-allowed" : "pointer" }}>
            ← Prev
          </button>
          <span style={{ padding: "8px 16px", fontSize: 12, color: "#475569" }}>Page {page} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}
            style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: page >= pages ? "not-allowed" : "pointer" }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
