"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";

type Affiliate = {
  id: string;
  code: string;
  name?: string | null;
  email?: string | null;
  status: string;
  tier: string;
  commissionRate: number;
  totalEarned?: number | null;
  createdAt: string;
  approvedAt?: string | null;
  _count?: { conversions: number; payouts: number };
};

const TIERS = ["STARTE", "GROWTH", "PRO", "ELITE"] as const;
const STATUSES = ["PENDING", "APPROVED", "SUSPENDED", "REJECTED"] as const;

function authHeaders(): Record<string, string> {
  const u = getCurrentUser();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (u?.role) h["x-user-role"] = u.role;
  if (u?.id) h["x-user-id"] = u.id;
  return h;
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING:   { bg: "rgba(251,191,36,.15)", color: "#fbbf24" },
  APPROVED:  { bg: "rgba(52,211,153,.15)", color: "#34d399" },
  SUSPENDED: { bg: "rgba(148,163,184,.15)", color: "#94a3b8" },
  REJECTED:  { bg: "rgba(248,113,113,.15)", color: "#f87171" },
};

export default function AdminAffiliatesPage() {
  const [items, setItems] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const url = statusFilter ? `/api/admin/affiliates?status=${statusFilter}` : "/api/admin/affiliates";
      const r = await fetch(url, { headers: authHeaders() });
      const d = await r.json();
      setItems(Array.isArray(d.affiliates) ? d.affiliates : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function updateAffiliate(id: string, patch: Partial<Affiliate>) {
    try {
      const r = await fetch("/api/admin/affiliates", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ id, ...patch }),
      });
      if (!r.ok) throw new Error("Update failed");
      toast.success("Affiliate updated");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  const filtered = search.trim()
    ? items.filter(a => {
        const q = search.trim().toLowerCase();
        return (a.name || "").toLowerCase().includes(q)
            || (a.email || "").toLowerCase().includes(q)
            || (a.code || "").toLowerCase().includes(q);
      })
    : items;

  const kpis = {
    total:     items.length,
    approved:  items.filter(a => a.status === "APPROVED").length,
    pending:   items.filter(a => a.status === "PENDING").length,
    earnings:  items.reduce((s, a) => s + (a.totalEarned || 0), 0),
  };

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 60px" }}>
      <style>{css}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Affiliates</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
          Review affiliate applications, adjust tiers, and manage commission rates.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Affiliates", val: kpis.total, color: "#818cf8" },
          { label: "Approved",         val: kpis.approved, color: "#34d399" },
          { label: "Pending Review",   val: kpis.pending, color: "#fbbf24" },
          { label: "Total Earnings",   val: `$${kpis.earnings.toFixed(2)}`, color: "#f472b6" },
        ].map(k => (
          <div key={k.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 4, fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <select className="af-sel" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="af-inp" placeholder="Search name, email, code…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              {["Affiliate","Code","Status","Tier","Rate","Conversions","Payouts","Actions"].map(h => (
                <th key={h} style={th}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={empty}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={empty}>No affiliates found</td></tr>
            ) : filtered.map(a => {
              const st = STATUS_STYLE[a.status] || STATUS_STYLE.PENDING;
              return (
                <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <td style={td}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{a.name || "—"}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{a.email || "—"}</div>
                  </td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{a.code}</td>
                  <td style={td}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>{a.status}</span>
                  </td>
                  <td style={td}>
                    <select className="af-sel-sm" value={a.tier} onChange={e => updateAffiliate(a.id, { tier: e.target.value })}>
                      {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td style={{ ...td, fontFamily: "monospace" }}>{(a.commissionRate * 100).toFixed(0)}%</td>
                  <td style={td}>{a._count?.conversions ?? 0}</td>
                  <td style={td}>{a._count?.payouts ?? 0}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {a.status !== "APPROVED" && (
                        <button className="af-btn" onClick={() => updateAffiliate(a.id, { status: "APPROVED" })} style={{ background: "rgba(52,211,153,.15)", color: "#34d399" }}>Approve</button>
                      )}
                      {a.status !== "SUSPENDED" && (
                        <button className="af-btn" onClick={() => updateAffiliate(a.id, { status: "SUSPENDED" })} style={{ background: "rgba(148,163,184,.15)", color: "#94a3b8" }}>Suspend</button>
                      )}
                      {a.status !== "REJECTED" && (
                        <button className="af-btn" onClick={() => updateAffiliate(a.id, { status: "REJECTED" })} style={{ background: "rgba(248,113,113,.15)", color: "#f87171" }}>Reject</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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
  .af-sel, .af-sel-sm { background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:10px; padding:8px 14px; color:white; font-family:inherit; font-size:13px; outline:none; }
  .af-sel-sm { padding:5px 8px; font-size:12px; border-radius:6px; }
  .af-inp { background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:10px; padding:8px 14px; color:white; font-family:inherit; font-size:13px; outline:none; min-width:260px; }
  .af-btn { border:none; border-radius:6px; padding:5px 12px; font-family:inherit; font-size:11px; font-weight:700; cursor:pointer; transition:opacity .2s; }
  .af-btn:hover { opacity:.75; }
`;
