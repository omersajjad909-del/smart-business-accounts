"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";

type Company = {
  id: string; name: string; country: string | null; baseCurrency: string | null;
  plan: string | null; activeModules: string | null; subscriptionStatus: string | null;
  stripeCustomerId: string | null; currentPeriodEnd: string | null;
  createdAt: string; businessType: string | null; businessSetupDone: boolean;
};
type User = { id: string; name: string | null; email: string; role: string; joinedAt: string };
type Activity = { action: string; createdAt: string; userId: string | null };
type Payload = {
  company: Company; users: User[]; roleCounts: Record<string, number>;
  lastLogin: string | null; recentActivity: Activity[];
  totalUsers: number; extraSeats: number; effectiveUserLimit: number;
};

const PLANS = ["STARTER", "PRO", "ENTERPRISE", "CUSTOM"];
const STATUSES = ["ACTIVE", "TRIALING", "PAST_DUE", "INACTIVE", "CANCELED"];

const PLAN_COLORS: Record<string, string> = {
  STARTER: "#38bdf8", PRO: "#818cf8", ENTERPRISE: "#c4b5fd", CUSTOM: "#fbbf24",
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: "rgba(34,197,94,.12)", text: "#22c55e" },
  TRIALING: { bg: "rgba(6,182,212,.12)", text: "#06b6d4" },
  PAST_DUE: { bg: "rgba(249,115,22,.12)", text: "#f97316" },
  INACTIVE: { bg: "rgba(100,116,139,.12)", text: "#94a3b8" },
  CANCELED: { bg: "rgba(239,68,68,.12)", text: "#f87171" },
};
const ROLE_COLORS: Record<string, string> = {
  ADMIN: "#818cf8", OWNER: "#c4b5fd", MANAGER: "#38bdf8", ACCOUNTANT: "#34d399", USER: "#64748b",
};

const F = "'Outfit','Inter',sans-serif";
const CARD = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";

function PlanBadge({ plan }: { plan?: string | null }) {
  const p = (plan || "STARTER").toUpperCase();
  const c = PLAN_COLORS[p] ?? "#94a3b8";
  return <span style={{ padding: "3px 10px", borderRadius: 20, background: `${c}18`, color: c, fontSize: 11, fontWeight: 800 }}>{p}</span>;
}
function StatusBadge({ status }: { status?: string | null }) {
  const s = (status || "ACTIVE").toUpperCase();
  const c = STATUS_COLORS[s] ?? STATUS_COLORS.INACTIVE;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: c.bg, color: c.text, fontSize: 11, fontWeight: 700 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.text }} />
      {s.replace(/_/g, " ")}
    </span>
  );
}
function RoleBadge({ role }: { role: string }) {
  const r = role.toUpperCase();
  const c = ROLE_COLORS[r] ?? "#64748b";
  return <span style={{ padding: "2px 8px", borderRadius: 12, background: `${c}18`, color: c, fontSize: 11, fontWeight: 700 }}>{r}</span>;
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function adminHdrs(json = false): Record<string, string> {
  const u = getCurrentUser();
  const h: Record<string, string> = {};
  if (json) h["Content-Type"] = "application/json";
  if (u?.role) h["x-user-role"] = u.role;
  if (u?.id) h["x-user-id"] = u.id;
  return h;
}

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.3)", letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 13, color: mono ? "#38bdf8" : "#cbd5e1", fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-all" }}>{value || "—"}</span>
    </div>
  );
}

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/admin/companies/${id}`, { headers: adminHdrs(), cache: "no-store" });
        if (!r.ok) { setError("Company not found"); return; }
        const d = await r.json();
        setData(d);
        setNewPlan((d.company.plan || "STARTER").toUpperCase());
        setNewStatus((d.company.subscriptionStatus || "ACTIVE").toUpperCase());
      } catch { setError("Failed to load company"); }
      finally { setLoading(false); }
    })();
  }, [id]);

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/companies/${id}`, {
        method: "PATCH",
        headers: adminHdrs(true),
        body: JSON.stringify({ plan: newPlan, subscriptionStatus: newStatus }),
      });
      if (!r.ok) throw new Error();
      setData(prev => prev ? { ...prev, company: { ...prev.company, plan: newPlan, subscriptionStatus: newStatus } } : prev);
      toast.success("Company updated");
    } catch { toast.error("Failed to update company"); }
    finally { setSaving(false); }
  }

  const sel: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${BORDER}`,
    background: "rgba(255,255,255,.06)", color: "#e2e8f0", fontSize: 13, outline: "none", cursor: "pointer", fontFamily: F,
  };

  if (loading) return (
    <div style={{ fontFamily: F, paddingBottom: 40 }}>
      <button onClick={() => router.push("/admin/companies")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", cursor: "pointer", fontSize: 13, padding: "0 0 20px", display: "flex", alignItems: "center", gap: 6 }}>← Companies</button>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[60, 100, 200, 160].map((w, i) => (
          <div key={i} style={{ height: 14, borderRadius: 7, background: "rgba(255,255,255,.06)", width: w, animation: "pulse 1.5s ease-in-out infinite" }} />
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}`}</style>
    </div>
  );

  if (error || !data) return (
    <div style={{ fontFamily: F, paddingBottom: 40 }}>
      <button onClick={() => router.push("/admin/companies")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", cursor: "pointer", fontSize: 13, padding: "0 0 20px", display: "flex", alignItems: "center", gap: 6 }}>← Companies</button>
      <div style={{ color: "#f87171", fontSize: 14 }}>{error || "Company not found"}</div>
    </div>
  );

  const { company, users, roleCounts, lastLogin, recentActivity, totalUsers, extraSeats, effectiveUserLimit } = data;

  const kpiCard = (label: string, value: React.ReactNode, sub?: React.ReactNode) => (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", color: "rgba(255,255,255,.3)", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0", marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ fontFamily: F, paddingBottom: 40 }}>
      {/* Back */}
      <button onClick={() => router.push("/admin/companies")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", cursor: "pointer", fontSize: 13, padding: "0 0 18px", display: "flex", alignItems: "center", gap: 6 }}
        onMouseEnter={e => (e.currentTarget.style.color = "#e2e8f0")} onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.4)")}>
        ← Companies
      </button>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#e2e8f0" }}>{company.name}</h1>
          <PlanBadge plan={company.plan} />
          <StatusBadge status={company.subscriptionStatus} />
          {company.businessType && (
            <span style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.5)", fontSize: 11 }}>
              {company.businessType.replace(/_/g, " ")}
            </span>
          )}
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,.3)" }}>
          ID: <span style={{ fontFamily: "monospace", color: "rgba(255,255,255,.4)" }}>{company.id}</span>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {kpiCard("Total Users", totalUsers,
          <span>
            {Object.entries(roleCounts).map(([r, n]) => (
              <span key={r} style={{ display: "inline-block", marginRight: 8 }}><RoleBadge role={r} /> {n}</span>
            ))}
          </span>
        )}
        {kpiCard("User Limit", effectiveUserLimit, extraSeats > 0 ? `Includes ${extraSeats} extra seat${extraSeats > 1 ? "s" : ""}` : "Base plan limit")}
        {kpiCard("Last Login", lastLogin ? timeAgo(lastLogin) : "Never", lastLogin ? new Date(lastLogin).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : undefined)}
        {kpiCard("Member Since", timeAgo(company.createdAt), new Date(company.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }))}
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, alignItems: "start" }}>
        {/* Left */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Company Info */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px 22px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 18 }}>Company Info</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
              <InfoRow label="Name" value={company.name} />
              <InfoRow label="Country" value={company.country} />
              <InfoRow label="Currency" value={company.baseCurrency} />
              <InfoRow label="Business Type" value={company.businessType?.replace(/_/g, " ")} />
              <InfoRow label="Setup Complete" value={company.businessSetupDone ? "✅ Yes" : "⏳ No"} />
              <InfoRow label="Renewal Date" value={company.currentPeriodEnd ? new Date(company.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null} />
              <InfoRow label="Stripe Customer ID" value={company.stripeCustomerId} mono />
              <InfoRow label="Active Modules" value={company.activeModules || "Default"} />
            </div>
          </div>

          {/* Users table */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px 22px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 16 }}>Users ({users.length})</div>
            {users.length === 0 ? (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)", textAlign: "center", padding: "24px 0" }}>No users found.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
                  <thead>
                    <tr>
                      {["Email", "Name", "Role", "Joined"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 800, letterSpacing: ".08em", color: "rgba(255,255,255,.3)", textTransform: "uppercase", borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: `1px solid ${BORDER}` }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.03)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "12px 12px", fontSize: 12, color: "#38bdf8", fontFamily: "monospace" }}>{u.email}</td>
                        <td style={{ padding: "12px 12px", fontSize: 13, color: "#cbd5e1" }}>{u.name || "—"}</td>
                        <td style={{ padding: "12px 12px" }}><RoleBadge role={u.role} /></td>
                        <td style={{ padding: "12px 12px", fontSize: 12, color: "rgba(255,255,255,.35)" }}>{timeAgo(u.joinedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Quick Actions */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px 22px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 16 }}>Quick Actions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", display: "block", marginBottom: 6, letterSpacing: ".06em" }}>PLAN</label>
                <select value={newPlan} onChange={e => setNewPlan(e.target.value)} style={sel}>
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", display: "block", marginBottom: 6, letterSpacing: ".06em" }}>STATUS</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={sel}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.2)", fontSize: 11, color: "#fbbf24", lineHeight: 1.5 }}>
                ⚠️ Changes plan in DB immediately. Stripe billing not affected.
              </div>
              <button onClick={handleSave} disabled={saving} style={{ padding: "11px", borderRadius: 12, border: "none", cursor: saving ? "wait" : "pointer", background: saving ? "#4338ca" : "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "white", fontSize: 13, fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px 22px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 16 }}>Recent Activity</div>
            {recentActivity.length === 0 ? (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)", textAlign: "center", padding: "24px 0" }}>No activity yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recentActivity.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#6366f1", marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, color: "#cbd5e1", fontFamily: "monospace" }}>{a.action}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2 }}>{timeAgo(a.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
