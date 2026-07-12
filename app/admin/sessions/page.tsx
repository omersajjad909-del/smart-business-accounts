"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type SessionRow = {
  userId: string;
  name: string;
  email: string;
  role: string;
  lastLogin: string;
  ip: string;
  userAgent: string;
};

function authHeaders(): Record<string, string> {
  const u = getCurrentUser();
  const h: Record<string, string> = {};
  if (u?.role) h["x-user-role"] = u.role;
  if (u?.id) h["x-user-id"] = u.id;
  if (u?.companyId) h["x-company-id"] = u.companyId;
  return h;
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function parseBrowser(ua: string): string {
  if (!ua) return "—";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  return "Other";
}

export default function AdminSessionsPage() {
  const [items, setItems] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/admin/sessions", { headers: authHeaders() })
      .then(r => r.ok ? r.json() : { sessions: [] })
      .then(d => { if (!cancelled) setItems(Array.isArray(d?.sessions) ? d.sessions : []); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = search.trim()
    ? items.filter(s => {
        const q = search.trim().toLowerCase();
        return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.ip.toLowerCase().includes(q);
      })
    : items;

  const day = 24 * 3600 * 1000;
  const active24h = items.filter(s => Date.now() - new Date(s.lastLogin).getTime() < day).length;
  const active7d  = items.filter(s => Date.now() - new Date(s.lastLogin).getTime() < 7 * day).length;

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 60px" }}>
      <style>{css}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>User Sessions</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
          Latest login per user for your company. IP address and device where applicable.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Users",     val: items.length, color: "#818cf8" },
          { label: "Active (24h)",    val: active24h,    color: "#34d399" },
          { label: "Active (7 days)", val: active7d,     color: "#fbbf24" },
        ].map(k => (
          <div key={k.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 4, fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input className="ss-inp" placeholder="Search name, email, IP…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              {["User","Role","Last Login","IP","Browser"].map(h => (
                <th key={h} style={th}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={empty}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={empty}>No sessions yet</td></tr>
            ) : filtered.map(s => (
              <tr key={s.userId} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                <td style={td}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name || "—"}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{s.email}</div>
                </td>
                <td style={td}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(129,140,248,.15)", color: "#818cf8" }}>{s.role}</span>
                </td>
                <td style={td}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{timeAgo(s.lastLogin)}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{new Date(s.lastLogin).toLocaleString("en-GB")}</div>
                </td>
                <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{s.ip || "—"}</td>
                <td style={td}>{parseBrowser(s.userAgent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".07em" };
const td: React.CSSProperties = { padding: "13px 16px", fontSize: 13 };
const empty: React.CSSProperties = { padding: 40, textAlign: "center", color: "rgba(255,255,255,.3)" };

const css = `
  .ss-inp { background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:10px; padding:8px 14px; color:white; font-family:inherit; font-size:13px; outline:none; min-width:280px; }
`;
