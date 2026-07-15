"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Row = {
  userId: string;
  name: string;
  email: string;
  role: string;
  companyId: string | null;
  companyName: string;
  lastLogin: string;
  ip: string;
  userAgent: string;
};

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function isOnline(d: string) {
  return Date.now() - new Date(d).getTime() < 15 * 60 * 1000;
}

function parseBrowser(ua: string) {
  if (!ua) return "—";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg/"))    return "Edge";
  if (ua.includes("Chrome"))  return "Chrome";
  if (ua.includes("Safari"))  return "Safari";
  return "Other";
}

function parseOS(ua: string) {
  if (!ua) return "—";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS"))  return "macOS";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Linux"))   return "Linux";
  return "Other";
}

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  ADMIN:     { bg: "rgba(239,68,68,.15)",   color: "#f87171" },
  CASHIER:   { bg: "rgba(56,189,248,.15)",  color: "#38bdf8" },
  MANAGER:   { bg: "rgba(251,191,36,.15)",  color: "#fbbf24" },
  STAFF:     { bg: "rgba(34,197,94,.12)",   color: "#4ade80" },
  VIEWER:    { bg: "rgba(148,163,184,.12)", color: "#94a3b8" },
};

export default function WebUsersPage() {
  const [rows, setRows]       = useState<Row[] | null>(null);
  const [search, setSearch]   = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  useEffect(() => {
    const u = getCurrentUser();
    const headers: Record<string, string> = {};
    if (u?.role) headers["x-user-role"] = u.role;
    if (u?.id)   headers["x-user-id"]   = u.id;

    fetch("/api/admin/web/sessions", { cache: "no-store", headers, credentials: "include" })
      .then(r => r.ok ? r.json() : { sessions: [] })
      .then(j => setRows(j.sessions || []))
      .catch(() => setRows([]));
  }, []);

  const allRoles = rows ? [...new Set(rows.map(r => r.role).filter(Boolean))] : [];

  const filtered = (rows || []).filter(r => {
    const q = search.trim().toLowerCase();
    const matchQ = !q || [r.name, r.email, r.companyName, r.ip].some(v => v.toLowerCase().includes(q));
    const matchRole = roleFilter === "ALL" || r.role === roleFilter;
    return matchQ && matchRole;
  });

  const onlineCount  = (rows || []).filter(r => isOnline(r.lastLogin)).length;
  const adminCount   = (rows || []).filter(r => r.role === "ADMIN").length;
  const day          = 86400 * 1000;
  const active24h    = (rows || []).filter(r => Date.now() - new Date(r.lastLogin).getTime() < day).length;

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 80px" }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Website Users</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
            Latest login per user across all companies.
          </p>
        </div>
        <a href="/admin/web" style={{ fontSize: 12, color: "rgba(255,255,255,.35)", textDecoration: "none", padding: "7px 14px", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10 }}>
          ← Web Metrics
        </a>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Users",   val: rows?.length ?? "—",  color: "#818cf8" },
          { label: "Online Now",    val: onlineCount,           color: "#34d399", dot: true },
          { label: "Active (24h)",  val: active24h,             color: "#38bdf8" },
          { label: "Admins",        val: adminCount,            color: "#f87171" },
        ].map(k => (
          <div key={k.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.val}</span>
              {k.dot && (k.val as number) > 0 && (
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399", display: "inline-block", animation: "pulse 2s infinite" }} />
              )}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.4)", marginTop: 5 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, company, IP…"
          style={{ flex: 1, minWidth: 260, background: "rgba(255,255,255,.04)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "9px 14px", color: "white", fontSize: 13, outline: "none", fontFamily: "inherit" }}
        />
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          style={{ background: "rgba(255,255,255,.04)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "9px 14px", color: "rgba(255,255,255,.7)", fontSize: 13, outline: "none", cursor: "pointer", fontFamily: "inherit" }}
        >
          <option value="ALL">All Roles</option>
          {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              {["User", "Company", "Role", "Last Login", "IP", "Browser / OS"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.3)", letterSpacing: ".08em" }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!rows ? (
              <tr><td colSpan={6} style={empty}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={empty}>No users found</td></tr>
            ) : filtered.map(r => {
              const online = isOnline(r.lastLogin);
              const roleStyle = ROLE_STYLE[r.role] ?? { bg: "rgba(255,255,255,.08)", color: "#94a3b8" };
              return (
                <tr key={r.userId} className="wu-row" style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  {/* User */}
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{
                        width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                        background: online ? "#34d399" : "rgba(255,255,255,.15)",
                        boxShadow: online ? "0 0 6px #34d399" : "none",
                      }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{r.name || "—"}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)" }}>{r.email}</div>
                      </div>
                    </div>
                  </td>
                  {/* Company */}
                  <td style={{ padding: "13px 16px" }}>
                    {r.companyName && r.companyId ? (
                      <a href={`/admin/companies/${r.companyId}`} className="wu-link" style={{ color: "#818cf8", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                        {r.companyName}
                      </a>
                    ) : (
                      <span style={{ color: "rgba(255,255,255,.25)", fontSize: 12 }}>—</span>
                    )}
                  </td>
                  {/* Role */}
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: ".05em", background: roleStyle.bg, color: roleStyle.color }}>
                      {r.role || "—"}
                    </span>
                  </td>
                  {/* Last Login */}
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{timeAgo(r.lastLogin)}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>
                      {new Date(r.lastLogin).toLocaleString("en-GB")}
                    </div>
                  </td>
                  {/* IP */}
                  <td style={{ padding: "13px 16px", fontFamily: "monospace", fontSize: 12, color: "rgba(255,255,255,.5)" }}>
                    {r.ip || "—"}
                  </td>
                  {/* Browser / OS */}
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{parseBrowser(r.userAgent)}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>{parseOS(r.userAgent)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows && filtered.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,.28)", textAlign: "right" }}>
          Showing {filtered.length} of {rows.length} users
        </div>
      )}
    </div>
  );
}

const empty: React.CSSProperties = { padding: 48, textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: 13 };

const css = `
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
  .wu-row:hover { background: rgba(255,255,255,.025); }
  .wu-link:hover { text-decoration: underline !important; }
`;
