"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";

/* ── Types ─────────────────────────────────────────────── */
type Company = {
  id: string;
  name: string;
  country?: string | null;
  baseCurrency?: string | null;
  plan?: string | null;
  activeModules?: string[];
  subscriptionStatus?: string | null;
  stripeCustomerId?: string | null;
  currentPeriodEnd?: string | null;
  createdAt: string;
  businessType?: string | null;
  businessSetupDone?: boolean;
};

type CompanyUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
};

type ActivityEntry = {
  action: string;
  createdAt: string;
  userId: string;
};

type PageData = {
  company: Company;
  users: CompanyUser[];
  roleCounts: Record<string, number>;
  lastLogin: string | null;
  recentActivity: ActivityEntry[];
  totalUsers: number;
  extraSeats: number;
  effectiveUserLimit: number;
};

/* ── Constants ─────────────────────────────────────────── */
const PLANS = ["STARTER", "PRO", "ENTERPRISE", "CUSTOM"];

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  STARTER:    { bg: "rgba(56,189,248,.15)",  text: "#38bdf8" },
  PRO:        { bg: "rgba(129,140,248,.15)", text: "#818cf8" },
  ENTERPRISE: { bg: "rgba(196,181,253,.15)", text: "#c4b5fd" },
  CUSTOM:     { bg: "rgba(251,191,36,.15)",  text: "#fbbf24" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE:   { bg: "rgba(34,197,94,.14)",   text: "#22c55e" },
  PAST_DUE: { bg: "rgba(249,115,22,.14)",  text: "#f97316" },
  INACTIVE: { bg: "rgba(148,163,184,.14)", text: "#94a3b8" },
  CANCELED: { bg: "rgba(248,113,113,.14)", text: "#f87171" },
  TRIALING: { bg: "rgba(6,182,212,.14)",   text: "#06b6d4" },
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  ADMIN:      { bg: "rgba(139,92,246,.18)", text: "#c4b5fd" },
  ACCOUNTANT: { bg: "rgba(79,124,255,.18)", text: "#93c5fd" },
  MANAGER:    { bg: "rgba(251,146,60,.18)", text: "#fdba74" },
  VIEWER:     { bg: "rgba(148,163,184,.14)",text: "#94a3b8" },
  USER:       { bg: "rgba(34,197,94,.16)",  text: "#86efac" },
};

const BIZ_LABELS: Record<string, string> = {
  trading: "Trading", wholesale: "Wholesale", distribution: "Distribution",
  restaurant: "Restaurant", retail: "Retail", manufacturing: "Manufacturing",
  hospital: "Hospital", school: "School", hotel: "Hotel", construction: "Construction",
  pharmacy: "Pharmacy", transport: "Transport", real_estate: "Real Estate",
  import_company: "Import Company", export_company: "Export Company",
  clearing_forwarding: "Clearing & Forwarding", service: "Service",
  ngo: "NGO / Non-profit", it: "IT / Software", law_firm: "Law Firm",
  salon: "Salon / Beauty", gym: "Gym / Fitness", ecommerce: "E-commerce",
  agriculture: "Agriculture",
};

/* ── Helpers ───────────────────────────────────────────── */
function adminHeaders(): Record<string, string> {
  const u = getCurrentUser();
  const hdrs: Record<string, string> = { "Content-Type": "application/json" };
  if (u?.role) hdrs["x-user-role"] = u.role;
  if (u?.id)   hdrs["x-user-id"]   = u.id;
  return hdrs;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/* ── Badge components ──────────────────────────────────── */
function PlanBadge({ plan }: { plan?: string | null }) {
  const p = (plan || "STARTER").toUpperCase();
  const c = PLAN_COLORS[p] ?? { bg: "rgba(255,255,255,.08)", text: "#94a3b8" };
  return (
    <span style={{
      padding: "4px 12px", borderRadius: 20,
      background: c.bg, color: c.text,
      fontSize: 11, fontWeight: 800, letterSpacing: ".05em",
    }}>
      {p}
    </span>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status || "ACTIVE").toUpperCase();
  const c = STATUS_COLORS[s] ?? STATUS_COLORS.INACTIVE;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 12px", borderRadius: 20,
      background: c.bg, color: c.text,
      fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.text, flexShrink: 0 }} />
      {s.replace("_", " ")}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const r = (role || "USER").toUpperCase();
  const c = ROLE_COLORS[r] ?? ROLE_COLORS.USER;
  return (
    <span style={{
      display: "inline-flex", padding: "3px 9px", borderRadius: 999,
      background: c.bg, color: c.text, fontSize: 11, fontWeight: 700,
    }}>
      {r}
    </span>
  );
}

/* ── Shared styles ─────────────────────────────────────── */
const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  padding: "20px 22px",
};

const label: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)",
  letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 5,
};

const value: React.CSSProperties = {
  fontSize: 13, color: "#e2e8f0", wordBreak: "break-all",
};

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)",
  color: "white", fontSize: 13, outline: "none", cursor: "pointer",
  fontFamily: "'Outfit','Inter',sans-serif",
};

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [data,    setData]    = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  /* quick-actions state */
  const [newPlan,    setNewPlan]    = useState("STARTER");
  const [suspended,  setSuspended]  = useState(false);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/companies/${id}`, {
        headers: adminHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const j: PageData = await r.json();
      setData(j);
      setNewPlan((j.company.plan || "STARTER").toUpperCase());
      setSuspended((j.company.subscriptionStatus || "").toUpperCase() === "INACTIVE");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load company");
    } finally {
      setLoading(false);
    }
  }

  async function saveActions() {
    if (!data) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        plan: newPlan,
        subscriptionStatus: suspended ? "INACTIVE" : "ACTIVE",
      };
      const r = await fetch(`/api/admin/companies/${id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        credentials: "include",
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Update failed");
      toast.success("Company updated successfully");
      /* optimistically update local state */
      setData(prev => prev ? {
        ...prev,
        company: {
          ...prev.company,
          plan: newPlan,
          subscriptionStatus: suspended ? "INACTIVE" : "ACTIVE",
        },
      } : null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  /* ── Loading / Error states ─────────────────────────── */
  if (loading) return (
    <div style={{ padding: "60px 24px", textAlign: "center", color: "rgba(255,255,255,0.4)", fontFamily: "'Outfit','Inter',sans-serif" }}>
      Loading company details…
    </div>
  );

  if (error || !data) return (
    <div style={{ padding: "60px 24px", textAlign: "center", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <div style={{ color: "#f87171", marginBottom: 16, fontSize: 15 }}>{error || "Company not found"}</div>
      <button onClick={() => router.push("/admin/companies")}
        style={{ padding: "9px 20px", borderRadius: 10, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        ← Back to Companies
      </button>
    </div>
  );

  const { company, users, lastLogin, recentActivity, totalUsers, extraSeats, effectiveUserLimit } = data;

  return (
    <div style={{ padding: "28px 24px", minHeight: "100vh", background: "#060918", fontFamily: "'Outfit','Inter',sans-serif", color: "#e2e8f0" }}>
      <style>{`
        select option { background: #0f172a; color: white; }
        .cd-tr:hover td { background: rgba(255,255,255,.025) !important; }
      `}</style>

      {/* ── Back button ───────────────────────────────── */}
      <button
        onClick={() => router.push("/admin/companies")}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 14px", borderRadius: 10,
          background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
          color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600,
          cursor: "pointer", marginBottom: 22, transition: "color .15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "#e2e8f0")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
      >
        ← Companies
      </button>

      {/* ── Header ────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "white", letterSpacing: "-.03em" }}>
            {company.name}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <PlanBadge plan={company.plan} />
            <StatusBadge status={company.subscriptionStatus} />
            {company.businessType && (
              <span style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(56,189,248,.1)", border: "1px solid rgba(56,189,248,.18)", color: "#7dd3fc", fontSize: 11, fontWeight: 700 }}>
                {BIZ_LABELS[company.businessType] || company.businessType}
              </span>
            )}
          </div>
        </div>
        <button onClick={loadData}
          style={{ padding: "9px 18px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)", color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          ↻ Refresh
        </button>
      </div>

      {/* ── KPI Cards row ─────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
        {/* Total Users */}
        <div style={{ ...card }}>
          <div style={label}>Total Users</div>
          <div style={{ fontSize: 34, fontWeight: 900, color: "#818cf8", lineHeight: 1 }}>{totalUsers}</div>
          {Object.keys(data.roleCounts).length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(data.roleCounts).map(([role, count]) => (
                <span key={role} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.45)", fontWeight: 700 }}>
                  {role}: {count}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* User Limit */}
        <div style={{ ...card }}>
          <div style={label}>User Limit</div>
          <div style={{ fontSize: 34, fontWeight: 900, color: "#22c55e", lineHeight: 1 }}>{effectiveUserLimit}</div>
          {extraSeats > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,.35)" }}>
              +{extraSeats} extra {extraSeats === 1 ? "seat" : "seats"}
            </div>
          )}
          <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,.35)" }}>
            {totalUsers}/{effectiveUserLimit} used
          </div>
        </div>

        {/* Last Login */}
        <div style={{ ...card }}>
          <div style={label}>Last Login</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: lastLogin ? "#e2e8f0" : "rgba(255,255,255,.3)", lineHeight: 1.4, marginTop: 4 }}>
            {fmtDateTime(lastLogin)}
          </div>
          {lastLogin && (
            <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,.35)" }}>
              {timeAgo(lastLogin)}
            </div>
          )}
        </div>

        {/* Joined Date */}
        <div style={{ ...card }}>
          <div style={label}>Joined Date</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", lineHeight: 1.4, marginTop: 4 }}>
            {fmtDate(company.createdAt)}
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,.35)" }}>
            {timeAgo(company.createdAt)} ago
          </div>
        </div>
      </div>

      {/* ── Main two-column grid ───────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>

          {/* ── LEFT COLUMN ──────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>

            {/* Company Info card */}
            <div style={{ ...card }}>
              <div style={{ marginBottom: 18, fontSize: 13, fontWeight: 800, color: "white", letterSpacing: "-.01em" }}>
                Company Information
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                <InfoField label="Company Name"   val={company.name} />
                <InfoField label="Country"        val={company.country} />
                <InfoField label="Base Currency"  val={company.baseCurrency} />
                <InfoField label="Business Type"  val={BIZ_LABELS[company.businessType || ""] || company.businessType} />
                <InfoField label="Setup Complete" val={company.businessSetupDone ? "Yes" : "No"} highlight={!company.businessSetupDone} />
                <InfoField label="Renewal Date"   val={fmtDate(company.currentPeriodEnd)} />
                <InfoField label="Stripe ID"      val={company.stripeCustomerId} mono />
                {company.activeModules && company.activeModules.length > 0 && (
                  <div>
                    <div style={label}>Active Modules</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                      {company.activeModules.map(mod => (
                        <span key={mod} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 999, background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.3)", color: "#a5b4fc", fontWeight: 700 }}>
                          {mod}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Users table */}
            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "18px 22px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "white" }}>Users</div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)", fontWeight: 600 }}>{totalUsers} total</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,.025)" }}>
                      {["Email", "Name", "Role", "Joined"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,.35)", letterSpacing: ".07em", borderBottom: "1px solid rgba(255,255,255,.06)", whiteSpace: "nowrap" }}>
                          {h.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: "36px 16px", textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: 13 }}>
                          No users found
                        </td>
                      </tr>
                    ) : users.map(u => (
                      <tr key={u.id} className="cd-tr">
                        <td style={{ padding: "12px 16px", fontSize: 12, color: "#7dd3fc", fontFamily: "monospace", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{u.email}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#e2e8f0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{u.name}</td>
                        <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}><RoleBadge role={u.role} /></td>
                        <td style={{ padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.4)", whiteSpace: "nowrap", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{fmtDate(u.joinedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ─────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>

            {/* Quick Actions card */}
            <div style={{ ...card }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "white", marginBottom: 18 }}>Quick Actions</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Change Plan dropdown */}
                <div>
                  <label style={{ ...label, display: "block", marginBottom: 7 }}>Change Plan</label>
                  <select value={newPlan} onChange={e => setNewPlan(e.target.value)} style={selectStyle}>
                    {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Suspend toggle */}
                <div>
                  <label style={{ ...label, display: "block", marginBottom: 7 }}>Account Status</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setSuspended(false)}
                      style={{
                        flex: 1, padding: "9px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                        background: !suspended ? "rgba(34,197,94,.15)" : "rgba(255,255,255,.04)",
                        border: !suspended ? "1px solid rgba(34,197,94,.35)" : "1px solid rgba(255,255,255,.08)",
                        color: !suspended ? "#22c55e" : "rgba(255,255,255,.35)",
                        transition: "all .15s",
                      }}
                    >
                      Active
                    </button>
                    <button
                      onClick={() => setSuspended(true)}
                      style={{
                        flex: 1, padding: "9px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                        background: suspended ? "rgba(249,115,22,.15)" : "rgba(255,255,255,.04)",
                        border: suspended ? "1px solid rgba(249,115,22,.35)" : "1px solid rgba(255,255,255,.08)",
                        color: suspended ? "#f97316" : "rgba(255,255,255,.35)",
                        transition: "all .15s",
                      }}
                    >
                      Suspend
                    </button>
                  </div>
                </div>

                {/* Save button */}
                <button
                  onClick={saveActions}
                  disabled={saving}
                  style={{
                    width: "100%", padding: "12px", borderRadius: 12, border: "none",
                    background: saving ? "#4338ca" : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    color: "white", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer",
                    opacity: saving ? .75 : 1, transition: "opacity .15s",
                    fontFamily: "'Outfit','Inter',sans-serif",
                  }}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>

                {/* Warning note */}
                <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.18)", fontSize: 11, color: "#fbbf24", lineHeight: 1.6 }}>
                  Plan changes take effect immediately. Stripe billing is not affected — manage billing separately.
                </div>
              </div>
            </div>

            {/* Recent Activity card */}
            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "white" }}>Recent Activity</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 3 }}>Last 10 events</div>
              </div>
              <div style={{ padding: "8px 0" }}>
                {recentActivity.length === 0 ? (
                  <div style={{ padding: "28px 22px", textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: 12 }}>
                    No recent activity
                  </div>
                ) : recentActivity.slice(0, 10).map((entry, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                    gap: 12, padding: "10px 22px",
                    borderBottom: i < Math.min(recentActivity.length, 10) - 1 ? "1px solid rgba(255,255,255,.04)" : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%", background: "#6366f1",
                        flexShrink: 0, marginTop: 5,
                      }} />
                      <span style={{ fontSize: 12, color: "#e2e8f0", lineHeight: 1.5, wordBreak: "break-word" }}>
                        {entry.action}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)", whiteSpace: "nowrap", flexShrink: 0, marginTop: 2 }}>
                      {timeAgo(entry.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── InfoField sub-component ───────────────────────────── */
function InfoField({
  label: lbl, val, mono = false, highlight = false,
}: {
  label: string;
  val?: string | null;
  mono?: boolean;
  highlight?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (!val || val === "—") return;
    navigator.clipboard.writeText(val).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase",
        color: "rgba(255,255,255,0.35)", marginBottom: 5,
      }}>
        {lbl}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          fontSize: 13,
          color: highlight ? "#f97316" : mono ? "#7dd3fc" : "#e2e8f0",
          fontFamily: mono ? "monospace" : "'Outfit','Inter',sans-serif",
          wordBreak: "break-all",
        }}>
          {val || "—"}
        </span>
        {val && val !== "—" && mono && (
          <button
            onClick={copy}
            style={{ background: "none", border: "none", cursor: "pointer", color: copied ? "#22c55e" : "rgba(255,255,255,.25)", fontSize: 11, padding: "2px 4px", flexShrink: 0 }}
            title="Copy"
          >
            {copied ? "✓" : "⎘"}
          </button>
        )}
      </div>
    </div>
  );
}
