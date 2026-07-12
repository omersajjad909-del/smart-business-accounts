"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";

type Referral = {
  id: string;
  referrerId: string;
  refereeEmail: string;
  status: string;
  reward?: number | null;
  createdAt: string;
  rewardedAt?: string | null;
};

const STATUSES = ["pending", "converted", "rewarded", "expired"] as const;

function authHeaders(): Record<string, string> {
  const u = getCurrentUser();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (u?.role) h["x-user-role"] = u.role;
  if (u?.id) h["x-user-id"] = u.id;
  return h;
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:   { bg: "rgba(251,191,36,.15)", color: "#fbbf24" },
  converted: { bg: "rgba(129,140,248,.15)", color: "#818cf8" },
  rewarded:  { bg: "rgba(52,211,153,.15)",  color: "#34d399" },
  expired:   { bg: "rgba(148,163,184,.15)", color: "#94a3b8" },
};

export default function AdminReferralsPage() {
  const [items, setItems] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rewardVal, setRewardVal] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/referrals", { headers: authHeaders() });
      const d = await r.json();
      setItems(Array.isArray(d.referrals) ? d.referrals : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function updateReferral(id: string, patch: { status?: string; reward?: number }) {
    try {
      const r = await fetch("/api/admin/referrals", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ id, ...patch }),
      });
      if (!r.ok) throw new Error("Update failed");
      toast.success("Referral updated");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  function saveReward(id: string) {
    const val = Number(rewardVal);
    if (!Number.isFinite(val) || val < 0) {
      toast.error("Enter a valid reward amount");
      return;
    }
    updateReferral(id, { reward: val });
    setEditingId(null);
    setRewardVal("");
  }

  const filtered = items.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return r.refereeEmail.toLowerCase().includes(q) || r.referrerId.toLowerCase().includes(q);
    }
    return true;
  });

  const kpis = {
    total:     items.length,
    converted: items.filter(r => r.status === "converted").length,
    rewarded:  items.filter(r => r.status === "rewarded").length,
    pending:   items.filter(r => r.status === "pending").length,
  };

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 60px" }}>
      <style>{css}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Referrals</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
          Track referral invitations, mark conversions, and issue rewards.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Referrals", val: kpis.total,     color: "#818cf8" },
          { label: "Converted",       val: kpis.converted, color: "#818cf8" },
          { label: "Rewarded",        val: kpis.rewarded,  color: "#34d399" },
          { label: "Pending",         val: kpis.pending,   color: "#fbbf24" },
        ].map(k => (
          <div key={k.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 4, fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <select className="rf-sel" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="rf-inp" placeholder="Search email or referrer ID…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              {["Referee Email","Referrer ID","Status","Reward","Referred","Actions"].map(h => (
                <th key={h} style={th}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={empty}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={empty}>No referrals found</td></tr>
            ) : filtered.map(r => {
              const st = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
              return (
                <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <td style={{ ...td, fontWeight: 700 }}>{r.refereeEmail}</td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 12, color: "rgba(255,255,255,.5)" }}>{r.referrerId.slice(0, 12)}…</td>
                  <td style={td}>
                    <select className="rf-sel-sm" value={r.status} onChange={e => updateReferral(r.id, { status: e.target.value })} style={{ background: st.bg, color: st.color, borderColor: "transparent" }}>
                      {STATUSES.map(s => <option key={s} value={s} style={{ background: "#0f1629", color: "white" }}>{s}</option>)}
                    </select>
                  </td>
                  <td style={td}>
                    {editingId === r.id ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <input className="rf-inp-sm" type="number" value={rewardVal} onChange={e => setRewardVal(e.target.value)} placeholder="0.00" />
                        <button className="rf-btn" onClick={() => saveReward(r.id)} style={{ background: "rgba(52,211,153,.15)", color: "#34d399" }}>Save</button>
                        <button className="rf-btn" onClick={() => { setEditingId(null); setRewardVal(""); }} style={{ background: "rgba(148,163,184,.15)", color: "#94a3b8" }}>Cancel</button>
                      </div>
                    ) : (
                      <button className="rf-btn" onClick={() => { setEditingId(r.id); setRewardVal(String(r.reward ?? "")); }} style={{ background: "rgba(255,255,255,.05)", color: "rgba(255,255,255,.6)" }}>
                        {r.reward ? `$${Number(r.reward).toFixed(2)}` : "Set reward"}
                      </button>
                    )}
                  </td>
                  <td style={{ ...td, color: "rgba(255,255,255,.4)", fontSize: 12 }}>{new Date(r.createdAt).toLocaleDateString("en-GB")}</td>
                  <td style={td}>
                    {r.status !== "rewarded" && (
                      <button className="rf-btn" onClick={() => updateReferral(r.id, { status: "rewarded" })} style={{ background: "rgba(52,211,153,.15)", color: "#34d399" }}>Mark Rewarded</button>
                    )}
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
  .rf-sel, .rf-inp, .rf-sel-sm, .rf-inp-sm { background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:10px; padding:8px 14px; color:white; font-family:inherit; font-size:13px; outline:none; }
  .rf-inp { min-width:260px; }
  .rf-sel-sm { padding:5px 10px; font-size:11px; font-weight:700; border-radius:20px; }
  .rf-inp-sm { padding:5px 8px; font-size:12px; border-radius:6px; width:70px; }
  .rf-btn { border:none; border-radius:6px; padding:5px 12px; font-family:inherit; font-size:11px; font-weight:700; cursor:pointer; transition:opacity .2s; }
  .rf-btn:hover { opacity:.75; }
`;
