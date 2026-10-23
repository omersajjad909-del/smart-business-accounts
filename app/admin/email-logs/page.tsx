"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type EmailLog = {
  id: string;
  to: string;
  from?: string | null;
  subject: string;
  status: string;
  error?: string | null;
  provider?: string | null;
  createdAt: string;
};

const STATUSES = ["sent", "failed", "queued", "bounced"] as const;

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  sent:    { bg: "rgba(52,211,153,.15)",  color: "var(--tx-34d399, #34d399)" },
  failed:  { bg: "rgba(248,113,113,.15)", color: "var(--tx-f87171, #f87171)" },
  queued:  { bg: "rgba(251,191,36,.15)",  color: "var(--tx-fbbf24, #fbbf24)" },
  bounced: { bg: "rgba(244,114,182,.15)", color: "var(--tx-f472b6, #f472b6)" },
};

function authHeaders(): Record<string, string> {
  const u = getCurrentUser();
  const h: Record<string, string> = {};
  if (u?.role) h["x-user-role"] = u.role;
  if (u?.id) h["x-user-id"] = u.id;
  return h;
}

export default function AdminEmailLogsPage() {
  const [items, setItems] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(100);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (statusFilter) params.set("status", statusFilter);
      const r = await fetch(`/api/admin/email-logs?${params}`, { headers: authHeaders() });
      const d = await r.json();
      setItems(Array.isArray(d.logs) ? d.logs : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter, limit]);

  const filtered = search.trim()
    ? items.filter(l => l.to.toLowerCase().includes(search.trim().toLowerCase()) || l.subject.toLowerCase().includes(search.trim().toLowerCase()))
    : items;

  const sent = items.filter(l => l.status === "sent").length;
  const failed = items.filter(l => l.status === "failed").length;

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "var(--ink-solid, white)", padding: "0 0 60px" }}>
      <style>{css}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Email Logs</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(var(--ink),var(--ta-40, .4))" }}>
          Delivery status for all system emails. Filter by status or search recipient.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Logs", val: items.length, color: "var(--tx-818cf8, #818cf8)" },
          { label: "Sent",       val: sent,         color: "var(--tx-34d399, #34d399)" },
          { label: "Failed",     val: failed,       color: "var(--tx-f87171, #f87171)" },
        ].map(k => (
          <div key={k.label} style={{ background: "rgba(var(--ink),.03)", border: "1px solid rgba(var(--ink),.07)", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 12, color: "rgba(var(--ink),var(--ta-40, .4))", marginTop: 4, fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <select className="el-sel" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="el-sel" value={limit} onChange={e => setLimit(Number(e.target.value))}>
          <option value={50}>Last 50</option>
          <option value={100}>Last 100</option>
          <option value={500}>Last 500</option>
          <option value={1000}>Last 1000</option>
        </select>
        <input className="el-inp" placeholder="Search recipient or subject…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ background: "rgba(var(--ink),.02)", border: "1px solid rgba(var(--ink),.07)", borderRadius: 16, overflowX: "auto", overflowY: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(var(--ink),.07)" }}>
              {["Recipient","Subject","Status","Provider","Sent At"].map(h => (
                <th key={h} style={th}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={empty}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={empty}>No email logs found</td></tr>
            ) : filtered.map(l => {
              const st = STATUS_STYLE[l.status] || STATUS_STYLE.sent;
              const isExpanded = expanded === l.id;
              return (
                <>
                  <tr key={l.id} style={{ borderBottom: "1px solid rgba(var(--ink),.04)", cursor: l.error ? "pointer" : "default" }}
                    onClick={() => l.error && setExpanded(isExpanded ? null : l.id)}>
                    <td style={{ ...td, fontWeight: 600 }}>{l.to}</td>
                    <td style={{ ...td, maxWidth: 340, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.subject}</td>
                    <td style={td}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>{l.status}</span>
                    </td>
                    <td style={{ ...td, color: "rgba(var(--ink),var(--ta-50, .5))" }}>{l.provider || "—"}</td>
                    <td style={{ ...td, color: "rgba(var(--ink),var(--ta-40, .4))", fontSize: 12 }}>{new Date(l.createdAt).toLocaleString("en-GB")}</td>
                  </tr>
                  {isExpanded && l.error && (
                    <tr key={`${l.id}-err`} style={{ borderBottom: "1px solid rgba(var(--ink),.04)" }}>
                      <td colSpan={5} style={{ padding: "10px 20px", background: "rgba(248,113,113,.05)", fontSize: 12, fontFamily: "monospace", color: "var(--tx-f87171, #f87171)", whiteSpace: "pre-wrap" }}>
                        {l.error}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "rgba(var(--ink),var(--ta-35, .35))", letterSpacing: ".07em" };
const td: React.CSSProperties = { padding: "13px 16px", fontSize: 13 };
const empty: React.CSSProperties = { padding: 40, textAlign: "center", color: "rgba(var(--ink),var(--ta-30, .3))" };

const css = `
  .el-sel, .el-inp { background:rgba(var(--ink),.04); border:1.5px solid rgba(var(--ink),.1); border-radius:10px; padding:8px 14px; color:var(--ink-solid, white); font-family:inherit; font-size:13px; outline:none; }
  .el-inp { min-width:260px; }
`;
