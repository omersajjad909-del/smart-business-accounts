"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type GdprRequest = {
  id: string;
  companyId: string;
  userId: string;
  type: "EXPORT" | "DELETE" | "RESTRICT" | "PORTABILITY";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED";
  requestedAt: string;
  completedAt?: string | null;
  rejectedAt?: string | null;
  adminNote?: string | null;
  company?: { name: string; country?: string | null; plan?: string | null } | null;
  user?: { name: string; email: string; role: string } | null;
};

const STATUSES = ["PENDING", "PROCESSING", "COMPLETED", "REJECTED", "ALL"] as const;

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING:    { bg: "rgba(251,191,36,.15)",  color: "#fbbf24" },
  PROCESSING: { bg: "rgba(129,140,248,.15)", color: "#818cf8" },
  COMPLETED:  { bg: "rgba(52,211,153,.15)",  color: "#34d399" },
  REJECTED:   { bg: "rgba(248,113,113,.15)", color: "#f87171" },
};

const TYPE_LABEL: Record<string, string> = {
  EXPORT: "Data Export",
  DELETE: "Right to Erasure",
  RESTRICT: "Restrict Processing",
  PORTABILITY: "Data Portability",
};

function authHeaders(): Record<string, string> {
  const u = getCurrentUser();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (u?.role) h["x-user-role"] = u.role;
  if (u?.id) h["x-user-id"] = u.id;
  return h;
}

export default function AdminGdprPage() {
  const [items, setItems] = useState<GdprRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter, limit: "100" });
      const r = await fetch(`/api/admin/gdpr?${params}`, { headers: authHeaders() });
      const d = await r.json();
      setItems(Array.isArray(d.requests) ? d.requests : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function act(requestId: string, action: "APPROVE" | "REJECT") {
    if (action === "APPROVE") {
      const req = items.find(r => r.id === requestId);
      const label = req ? TYPE_LABEL[req.type] || req.type : "this request";
      if (req?.type === "DELETE" && !confirm(`This permanently anonymizes the user's personal data for "${label}". This cannot be undone. Continue?`)) return;
    }
    const adminNote = action === "REJECT" ? (prompt("Reason for rejecting this request (sent to the user):") || "") : undefined;
    if (action === "REJECT" && adminNote === "") return; // cancelled the prompt

    setBusyId(requestId);
    try {
      const r = await fetch("/api/admin/gdpr", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ requestId, action, adminNote }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        alert(d.error || "Failed to process request");
      } else {
        await load();
      }
    } catch {
      alert("Failed to process request");
    } finally {
      setBusyId(null);
    }
  }

  const counts = {
    pending: items.filter(r => r.status === "PENDING").length,
    processing: items.filter(r => r.status === "PROCESSING").length,
  };

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 60px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>GDPR / Data Requests</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
          Right-to-export, right-to-erasure, restriction and portability requests. Approving a Right to Erasure
          request permanently anonymizes the user's personal data — financial and tax records are retained per
          GDPR Art. 17(3).
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Pending",    val: counts.pending,    color: "#fbbf24" },
          { label: "Processing", val: counts.processing, color: "#818cf8" },
        ].map(k => (
          <div key={k.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 4, fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <select className="gdpr-sel" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s === "ALL" ? "All Statuses" : s}</option>)}
        </select>
      </div>

      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, overflowX: "auto", overflowY: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              {["Company","User","Type","Status","Requested","Actions"].map(h => (
                <th key={h} style={th}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={empty}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} style={empty}>No {statusFilter !== "ALL" ? statusFilter.toLowerCase() : ""} GDPR requests</td></tr>
            ) : items.map(r => {
              const st = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
              const actionable = r.status === "PENDING" || r.status === "PROCESSING";
              return (
                <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <td style={{ ...td, fontWeight: 600 }}>{r.company?.name || "—"}</td>
                  <td style={td}>
                    <div>{r.user?.name || "—"}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{r.user?.email}</div>
                  </td>
                  <td style={td}>{TYPE_LABEL[r.type] || r.type}</td>
                  <td style={td}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>{r.status}</span>
                  </td>
                  <td style={{ ...td, color: "rgba(255,255,255,.4)", fontSize: 12 }}>{new Date(r.requestedAt).toLocaleString("en-GB")}</td>
                  <td style={td}>
                    {actionable ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          disabled={busyId === r.id}
                          onClick={() => act(r.id, "APPROVE")}
                          style={{ ...btn, background: "rgba(52,211,153,.15)", color: "#34d399", opacity: busyId === r.id ? 0.5 : 1 }}
                        >{busyId === r.id ? "…" : "Approve"}</button>
                        <button
                          disabled={busyId === r.id}
                          onClick={() => act(r.id, "REJECT")}
                          style={{ ...btn, background: "rgba(248,113,113,.15)", color: "#f87171", opacity: busyId === r.id ? 0.5 : 1 }}
                        >Reject</button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>{r.adminNote || "—"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style>{css}</style>
    </div>
  );
}

const th: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".07em" };
const td: React.CSSProperties = { padding: "13px 16px", fontSize: 13 };
const empty: React.CSSProperties = { padding: 40, textAlign: "center", color: "rgba(255,255,255,.3)" };
const btn: React.CSSProperties = { border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };

const css = `
  .gdpr-sel { background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:10px; padding:8px 14px; color:white; font-family:inherit; font-size:13px; outline:none; }
`;
