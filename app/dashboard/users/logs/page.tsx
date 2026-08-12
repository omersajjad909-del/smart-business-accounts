"use client";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/hasPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { useResponsive } from "@/hooks/useResponsive";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";
import { fmtDate } from "@/lib/dateUtils";

/**
 * This screen was the last Tailwind page left in the dashboard, and it was
 * written for a white background — bg-white cards, text-gray-900 headings,
 * a gray-50 table head — so on the dark shell it rendered as pale boxes with
 * near-invisible text. It also used two `<input type="date">`, which show the
 * browser's mm/dd/yyyy, and printed raw JSON into a right-aligned cell that
 * pushed the columns off screen.
 *
 * Rebuilt on the same inline-style + CSS-variable system every other dashboard
 * page uses, with DateInput for dd-mm-yyyy and a details cell that stays inside
 * its column.
 */

const ff = "'Outfit','Inter',sans-serif";

type Log = {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  user?: { name?: string | null; email?: string | null } | null;
};

/** Colour the badge by what the action does, not by which module it came from. */
function actionTone(action: string): { color: string; bg: string } {
  const a = action.toUpperCase();
  if (a.includes("DELETE") || a.includes("REMOVE") || a.includes("REJECT")) return { color: "#f87171", bg: "rgba(248,113,113,.12)" };
  if (a.includes("CREATE") || a.includes("ADD") || a.includes("ACTIVATED") || a.includes("APPROVE")) return { color: "#34d399", bg: "rgba(52,211,153,.12)" };
  if (a.includes("UPDATE") || a.includes("EDIT") || a.includes("CONFIG")) return { color: "#fbbf24", bg: "rgba(251,191,36,.12)" };
  if (a.includes("LOGIN") || a.includes("LOGOUT") || a.includes("AUTH")) return { color: "#38bdf8", bg: "rgba(56,189,248,.12)" };
  return { color: "#818cf8", bg: "rgba(129,140,248,.12)" };
}

/** Activity details are stored as a JSON blob. Show it as readable pairs. */
function DetailsCell({ details }: { details: string | null }) {
  const [open, setOpen] = useState(false);

  const pairs = useMemo(() => {
    if (!details) return null;
    try {
      const parsed = JSON.parse(details);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      return Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [
        k,
        v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v),
      ]) as [string, string][];
    } catch {
      return null;
    }
  }, [details]);

  if (!details) return <span style={{ color: "var(--text-muted)" }}>—</span>;

  if (!pairs) {
    return (
      <span style={{ fontSize: 12.5, color: "var(--text-muted)", wordBreak: "break-word" }}>{details}</span>
    );
  }

  const shown = open ? pairs : pairs.slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {shown.map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: 6, fontSize: 12, lineHeight: 1.5 }}>
          <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{k}:</span>
          <span style={{ color: "var(--text-primary)", wordBreak: "break-word" }}>{v}</span>
        </div>
      ))}
      {pairs.length > 3 && (
        <button
          onClick={() => setOpen(o => !o)}
          style={{ alignSelf: "flex-start", marginTop: 2, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: ff, fontSize: 11.5, fontWeight: 600, color: "#818cf8" }}>
          {open ? "Show less" : `+${pairs.length - 3} more`}
        </button>
      )}
    </div>
  );
}

export default function ActivityLogsPage() {
  const { isMobile } = useResponsive();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Typing used to fire one request per keystroke against /api/logs.
  const [debounced, setDebounced] = useState({ search: "", actionFilter: "", userFilter: "" });
  useEffect(() => {
    const t = setTimeout(() => setDebounced({ search, actionFilter, userFilter }), 350);
    return () => clearTimeout(t);
  }, [search, actionFilter, userFilter]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debounced.actionFilter) params.set("action", debounced.actionFilter);
    if (debounced.userFilter) params.set("userId", debounced.userFilter);
    if (debounced.search) params.set("q", debounced.search);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    return params.toString();
  }, [debounced, fromDate, toDate]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const u = getCurrentUser();
        if (!u || !hasPermission(u, PERMISSIONS.VIEW_LOGS)) {
          setError("Access Denied: Logs permission required.");
          setLoading(false);
          return;
        }

        setLoading(true);
        const response = await fetch(`/api/logs?${queryString}`, {
          headers: { "x-user-role": u.role, "x-user-id": u.id },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to load data");
        }
        const data = await response.json();
        if (!cancelled) {
          setLogs(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Error loading logs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [queryString]);

  const inp: React.CSSProperties = {
    background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 9,
    padding: "9px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 12.5, outline: "none", width: "100%",
  };
  const th: React.CSSProperties = {
    padding: "11px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 800,
    letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)",
    borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = { padding: "13px 14px", verticalAlign: "top", fontSize: 12.5 };

  if (error) {
    return (
      <div style={{ padding: isMobile ? "13px" : "24px 28px", fontFamily: ff }}>
        <div style={{ maxWidth: 560, margin: "40px auto", padding: "18px 20px", borderRadius: 14, background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.25)", color: "#f87171", display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? "13px" : "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1180 }}>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px", display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 19 }}>🕘</span> System Activity Logs
          </h1>
          <p style={{ margin: "5px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
            Every recorded action across this company
          </p>
        </div>
        <div style={{ padding: "9px 16px", borderRadius: 11, background: "var(--panel-bg)", border: "1px solid var(--border)", textAlign: "right" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-muted)" }}>Total entries</div>
          <div style={{ fontSize: 19, fontWeight: 900, color: "#818cf8", lineHeight: 1.2 }}>{logs.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.6fr 1fr 1fr 1fr 1fr", gap: 10 }}>
          <input style={inp} placeholder="Search details…" value={search} onChange={e => setSearch(e.target.value)} />
          <input style={inp} placeholder="Action (e.g. CREATE)" value={actionFilter} onChange={e => setActionFilter(e.target.value)} />
          <input style={inp} placeholder="User ID" value={userFilter} onChange={e => setUserFilter(e.target.value)} />
          <DateInput value={fromDate} onChange={setFromDate} style={inp} />
          <DateInput value={toDate} onChange={setToDate} style={inp} />
        </div>
        <div style={{ display: "flex", gap: 9, marginTop: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => window.open(`/api/logs?${queryString}${queryString ? "&" : ""}format=csv`, "_blank")}
            style={{ padding: "9px 16px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: ff, fontSize: 12.5, fontWeight: 700, color: "white", background: "linear-gradient(135deg,#6366f1,#4f46e5)", boxShadow: "0 4px 12px rgba(99,102,241,.28)" }}>
            Export CSV
          </button>
          {(search || actionFilter || userFilter || fromDate || toDate) && (
            <button
              onClick={() => { setSearch(""); setActionFilter(""); setUserFilter(""); setFromDate(""); setToDate(""); }}
              style={{ padding: "9px 16px", borderRadius: 9, border: "1px solid var(--border)", cursor: "pointer", fontFamily: ff, fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", background: "none" }}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 210 }}>Action</th>
                <th style={th}>Details</th>
                <th style={{ ...th, width: 190 }}>User</th>
                <th style={{ ...th, width: 150 }}>Date &amp; time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading activity…</td></tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: 30, marginBottom: 8 }}>🕘</div>
                    <div style={{ fontSize: 13 }}>No activity found for these filters</div>
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => {
                  const tone = actionTone(log.action || "");
                  const at = new Date(log.createdAt);
                  return (
                    <tr key={log.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                      <td style={td}>
                        <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 20, fontSize: 10.5, fontWeight: 800, letterSpacing: ".03em", background: tone.bg, color: tone.color, wordBreak: "break-word" }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ ...td, maxWidth: 420 }}><DetailsCell details={log.details} /></td>
                      <td style={td}>
                        <div style={{ fontWeight: 700, fontSize: 12.5 }}>{log.user?.name || "System"}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", wordBreak: "break-word" }}>{log.user?.email || "Auto-generated"}</div>
                      </td>
                      <td style={{ ...td, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 12.5 }}>{fmtDate(log.createdAt)}</div>
                        <div style={{ fontSize: 11 }}>
                          {isNaN(at.getTime()) ? "" : at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
