"use client";
import { useEffect, useState, useCallback } from "react";
import { getCurrentUser } from "@/lib/auth";

interface AffiliateConversion {
  id: string;
  customerEmail: string;
  customerName: string | null;
  plan: string | null;
  planAmount: number | null;
  commissionAmt: number;
  status: string;
  convertedAt: string;
  paidAt: string | null;
}

interface AffiliatePayout {
  id: string;
  amount: number;
  method: string;
  status: string;
  month: string;
  reference: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface AffiliateProfile {
  id: string;
  name: string;
  email: string;
  status: string;
  tier: string;
  trackingCode: string;
  commissionRate: number;
  payoutMethod: string | null;
  payoutDetails: string | null;
  totalEarned: number;
  totalPaid: number;
  pendingBalance: number;
  totalReferrals: number;
  activeReferrals: number;
  monthEarnings: number;
  lastMonthEarnings: number;
  conversionRate: number;
  referralLink: string;
  approvedAt: string | null;
  conversions: AffiliateConversion[];
  payouts: AffiliatePayout[];
}

const TIER_CONFIG: Record<string, { color: string; icon: string; bg: string }> = {
  STARTER: { color: "#818cf8", icon: "🌱", bg: "rgba(129,140,248,.12)" },
  GROWTH:  { color: "#34d399", icon: "🚀", bg: "rgba(52,211,153,.12)" },
  PRO:     { color: "#fbbf24", icon: "⭐", bg: "rgba(251,191,36,.12)" },
  ELITE:   { color: "#c4b5fd", icon: "💎", bg: "rgba(196,181,253,.12)" },
};

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: "Under Review", color: "#fbbf24", bg: "rgba(251,191,36,.15)" },
  APPROVED:   { label: "Active",       color: "#34d399", bg: "rgba(52,211,153,.12)" },
  REJECTED:   { label: "Rejected",     color: "#f87171", bg: "rgba(248,113,113,.12)" },
  SUSPENDED:  { label: "Suspended",    color: "#94a3b8", bg: "rgba(148,163,184,.12)" },
};

const CONVERSION_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:   { label: "Pending",   color: "#fbbf24" },
  CONFIRMED: { label: "Confirmed", color: "#34d399" },
  PAID:      { label: "Paid",      color: "#818cf8" },
};

const PAYOUT_METHODS = [
  { value: "bank",       label: "Bank Transfer",  icon: "🏦" },
  { value: "paypal",     label: "PayPal",          icon: "💳" },
  { value: "jazzcash",   label: "JazzCash",        icon: "📱" },
  { value: "easypaisa",  label: "EasyPaisa",       icon: "📲" },
  { value: "crypto",     label: "Crypto (USDT)",   icon: "₿" },
];

const MARKETING_ASSETS = [
  { title: "Email Template — Introduction",  desc: "Cold outreach to business owners",  icon: "📧", type: "Email" },
  { title: "Email Template — Follow Up",     desc: "Second touch after no reply",       icon: "📧", type: "Email" },
  { title: "LinkedIn Post — Feature Demo",   desc: "Ready-to-post social content",      icon: "💼", type: "Social" },
  { title: "Instagram Caption — ROI Focus",  desc: "Conversion-focused caption",        icon: "📸", type: "Social" },
  { title: "WhatsApp Message — Quick Pitch", desc: "One paragraph pitch for contacts",  icon: "💬", type: "WhatsApp" },
  { title: "Case Study — Karachi Retailer",  desc: "3-page success story PDF",          icon: "📄", type: "PDF" },
  { title: "Banner Ad 1200×628",             desc: "Facebook/LinkedIn cover image",     icon: "🖼️", type: "Banner" },
  { title: "Banner Ad 300×250",              desc: "Standard display ad",               icon: "🖼️", type: "Banner" },
];

function StatCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#64748b" }}>{sub}</div>}
    </div>
  );
}

function getHeaders(user: ReturnType<typeof getCurrentUser>): Record<string, string> {
  if (!user) return {};
  return { "x-user-id": user.id, "x-company-id": user.companyId || "", "Content-Type": "application/json" };
}

export default function AffiliateDashboardPage() {
  const [affiliate, setAffiliate] = useState<AffiliateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "conversions" | "payouts" | "assets" | "settings">("overview");
  const [copied, setCopied] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState("");
  const [payoutDetails, setPayoutDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const user = getCurrentUser();

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/affiliates/me", { headers: getHeaders(user) });
      const data = await res.json();
      if (data.affiliate) {
        setAffiliate(data.affiliate);
        setPayoutMethod(data.affiliate.payoutMethod || "");
        setPayoutDetails(data.affiliate.payoutDetails || "");
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const copyLink = () => {
    if (!affiliate) return;
    navigator.clipboard.writeText(affiliate.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveSettings = async () => {
    if (!user || !affiliate) return;
    setSaving(true);
    try {
      await fetch("/api/affiliates/me", {
        method: "PUT",
        headers: getHeaders(user),
        body: JSON.stringify({ payoutMethod, payoutDetails }),
      });
      setSaveMsg("Saved!");
      setTimeout(() => setSaveMsg(""), 2000);
    } finally {
      setSaving(false);
    }
  };

  const tierCfg = affiliate ? TIER_CONFIG[affiliate.tier] || TIER_CONFIG.STARTER : TIER_CONFIG.STARTER;
  const statusCfg = affiliate ? STATUS_BADGE[affiliate.status] || STATUS_BADGE.PENDING : STATUS_BADGE.PENDING;

  const s: React.CSSProperties = {
    minHeight: "100vh",
    background: "linear-gradient(135deg,#080c1e 0%,#0d1035 60%,#080c1e 100%)",
    fontFamily: "'Outfit','Inter',sans-serif",
    color: "#e2e8f0",
    padding: "32px",
  };

  if (loading) return (
    <div style={{ ...s, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40 }}>🤝</div>
        <div style={{ marginTop: 12, color: "#818cf8" }}>Loading affiliate data…</div>
      </div>
    </div>
  );

  if (!affiliate) return (
    <div style={{ ...s, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🤝</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>You are not an affiliate yet</h2>
        <p style={{ color: "#94a3b8", marginBottom: 24 }}>Join the FinovaOS affiliate program and earn 20–35% recurring commission on every referral.</p>
        <a href="/affiliate" style={{ display: "inline-block", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", padding: "12px 28px", borderRadius: 10, fontWeight: 600, textDecoration: "none" }}>
          Apply Now →
        </a>
      </div>
    </div>
  );

  const TABS = [
    { key: "overview",    label: "Overview",    icon: "📊" },
    { key: "conversions", label: "Conversions", icon: "🔄" },
    { key: "payouts",     label: "Payouts",     icon: "💸" },
    { key: "assets",      label: "Marketing",   icon: "📣" },
    { key: "settings",    label: "Settings",    icon: "⚙️" },
  ] as const;

  return (
    <div style={s}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 28 }}>🤝</span>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Affiliate Dashboard</h1>
          </div>
          <div style={{ color: "#64748b", fontSize: 14 }}>Welcome back, {affiliate.name}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ background: tierCfg.bg, border: `1px solid ${tierCfg.color}33`, color: tierCfg.color, padding: "5px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
            {tierCfg.icon} {affiliate.tier}
          </span>
          <span style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.color}44`, color: statusCfg.color, padding: "5px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Referral Link Bar */}
      {affiliate.status === "APPROVED" && (
        <div style={{ background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.25)", borderRadius: 12, padding: "14px 20px", marginBottom: 28, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, color: "#94a3b8", flexShrink: 0 }}>Your referral link:</span>
          <code style={{ flex: 1, color: "#818cf8", fontSize: 13, background: "rgba(99,102,241,.1)", padding: "4px 10px", borderRadius: 6, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {affiliate.referralLink}
          </code>
          <button onClick={copyLink} style={{ background: copied ? "rgba(52,211,153,.15)" : "rgba(99,102,241,.2)", border: `1px solid ${copied ? "#34d399" : "#6366f1"}44`, color: copied ? "#34d399" : "#818cf8", padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            {copied ? "✓ Copied!" : "Copy Link"}
          </button>
        </div>
      )}

      {/* Pending banner */}
      {affiliate.status === "PENDING" && (
        <div style={{ background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.25)", borderRadius: 12, padding: "14px 20px", marginBottom: 28, color: "#fbbf24", fontSize: 14 }}>
          ⏳ Your application is under review. We approve within 1-2 business days. You will receive an email when approved.
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,.08)", marginBottom: 28, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: "10px 18px", background: "none", border: "none", color: tab === t.key ? "#818cf8" : "#64748b", borderBottom: tab === t.key ? "2px solid #818cf8" : "2px solid transparent", cursor: "pointer", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", transition: "color .2s" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
            <StatCard label="Total Earned"     value={`$${affiliate.totalEarned.toLocaleString()}`}     sub="All time"                            color="#818cf8" icon="💰" />
            <StatCard label="This Month"       value={`$${affiliate.monthEarnings.toLocaleString()}`}   sub={`Last month: $${affiliate.lastMonthEarnings}`} color="#34d399" icon="📈" />
            <StatCard label="Pending Balance"  value={`$${affiliate.pendingBalance.toLocaleString()}`}  sub="Next payout on 1st"                  color="#fbbf24" icon="⏳" />
            <StatCard label="Total Paid Out"   value={`$${affiliate.totalPaid.toLocaleString()}`}       sub="Lifetime paid"                       color="#c4b5fd" icon="✅" />
            <StatCard label="Referrals"        value={String(affiliate.totalReferrals)}                 sub={`${affiliate.activeReferrals} active`} color="#38bdf8" icon="👥" />
            <StatCard label="Conversion Rate"  value={`${affiliate.conversionRate}%`}                   sub="Referral → paid"                     color="#fb923c" icon="🎯" />
          </div>

          {/* Commission Tier Progress */}
          <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 24, marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Commission Tier</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {[
                { tier: "STARTER", refs: "1–5",    rate: "20%", icon: "🌱", color: "#818cf8" },
                { tier: "GROWTH",  refs: "6–20",   rate: "25%", icon: "🚀", color: "#34d399" },
                { tier: "PRO",     refs: "21–50",  rate: "30%", icon: "⭐", color: "#fbbf24" },
                { tier: "ELITE",   refs: "50+",    rate: "35%", icon: "💎", color: "#c4b5fd" },
              ].map(t => {
                const active = affiliate.tier === t.tier;
                return (
                  <div key={t.tier} style={{ background: active ? `rgba(${t.color === "#818cf8" ? "129,140,248" : t.color === "#34d399" ? "52,211,153" : t.color === "#fbbf24" ? "251,191,36" : "196,181,253"},.12)` : "rgba(255,255,255,.02)", border: `1px solid ${active ? t.color + "44" : "rgba(255,255,255,.06)"}`, borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{t.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? t.color : "#94a3b8" }}>{t.tier}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: active ? t.color : "#64748b", marginTop: 4 }}>{t.rate}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{t.refs} referrals</div>
                    {active && <div style={{ fontSize: 10, color: t.color, marginTop: 6, fontWeight: 600 }}>● CURRENT</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Conversions preview */}
          {affiliate.conversions.length > 0 && (
            <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Recent Conversions</h3>
                <button onClick={() => setTab("conversions")} style={{ background: "none", border: "none", color: "#818cf8", cursor: "pointer", fontSize: 13 }}>View all →</button>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: "#64748b", fontSize: 12, textAlign: "left" }}>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Customer</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Plan</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Commission</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Status</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {affiliate.conversions.slice(0, 5).map(c => {
                    const st = CONVERSION_STATUS[c.status] || { label: c.status, color: "#94a3b8" };
                    return (
                      <tr key={c.id} style={{ borderTop: "1px solid rgba(255,255,255,.05)" }}>
                        <td style={{ padding: "10px 12px", fontSize: 14 }}>{c.customerName || c.customerEmail}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: "#94a3b8" }}>{c.plan || "—"}</td>
                        <td style={{ padding: "10px 12px", fontSize: 14, color: "#34d399", fontWeight: 600 }}>${c.commissionAmt.toFixed(2)}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ color: st.color, fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 12, color: "#64748b" }}>{new Date(c.convertedAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {affiliate.conversions.length === 0 && affiliate.status === "APPROVED" && (
            <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔗</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Share your referral link to start earning</div>
              <div style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>Copy your link above and share with business owners, accountants, and consultants.</div>
              <button onClick={() => setTab("assets")} style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>
                Get Marketing Assets →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── CONVERSIONS ── */}
      {tab === "conversions" && (
        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 24 }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>All Conversions ({affiliate.conversions.length})</h3>
          {affiliate.conversions.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>No conversions yet. Share your link to get started!</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "#64748b", fontSize: 12, textAlign: "left" }}>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>Customer</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>Email</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>Plan</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>Plan Value</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>Commission</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {affiliate.conversions.map(c => {
                  const st = CONVERSION_STATUS[c.status] || { label: c.status, color: "#94a3b8" };
                  return (
                    <tr key={c.id} style={{ borderTop: "1px solid rgba(255,255,255,.05)" }}>
                      <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 500 }}>{c.customerName || "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 13, color: "#94a3b8" }}>{c.customerEmail}</td>
                      <td style={{ padding: "10px 12px", fontSize: 13, color: "#94a3b8" }}>{c.plan || "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 13 }}>{c.planAmount ? `$${c.planAmount}` : "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 14, color: "#34d399", fontWeight: 700 }}>${c.commissionAmt.toFixed(2)}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ background: `${st.color}18`, border: `1px solid ${st.color}44`, color: st.color, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{st.label}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#64748b" }}>{new Date(c.convertedAt).toLocaleDateString("en-GB")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── PAYOUTS ── */}
      {tab === "payouts" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
            <StatCard label="Pending Balance" value={`$${affiliate.pendingBalance.toFixed(2)}`} sub="Paid on 1st of month" color="#fbbf24" icon="⏳" />
            <StatCard label="Total Paid"       value={`$${affiliate.totalPaid.toFixed(2)}`}       sub="All time"            color="#34d399" icon="✅" />
            <StatCard label="Total Earned"     value={`$${affiliate.totalEarned.toFixed(2)}`}     sub="Lifetime"            color="#818cf8" icon="💰" />
          </div>

          <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 24 }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Payout History</h3>
            {affiliate.payouts.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>💸</div>
                <div>No payouts yet. Payouts are processed on the 1st of every month.</div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: "#64748b", fontSize: 12, textAlign: "left" }}>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Month</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Amount</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Method</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Reference</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Status</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Paid On</th>
                  </tr>
                </thead>
                <tbody>
                  {affiliate.payouts.map(p => (
                    <tr key={p.id} style={{ borderTop: "1px solid rgba(255,255,255,.05)" }}>
                      <td style={{ padding: "10px 12px", fontSize: 14 }}>{p.month}</td>
                      <td style={{ padding: "10px 12px", fontSize: 14, color: "#34d399", fontWeight: 700 }}>${p.amount.toFixed(2)}</td>
                      <td style={{ padding: "10px 12px", fontSize: 13, color: "#94a3b8", textTransform: "capitalize" }}>{p.method}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#64748b" }}>{p.reference || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ color: p.status === "PAID" ? "#34d399" : p.status === "PROCESSING" ? "#fbbf24" : "#94a3b8", fontSize: 12, fontWeight: 600 }}>{p.status}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#64748b" }}>{p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-GB") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── MARKETING ASSETS ── */}
      {tab === "assets" && (
        <div>
          <div style={{ marginBottom: 20, color: "#94a3b8", fontSize: 14 }}>
            Ready-made content to promote FinovaOS. Copy, customise, and share.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
            {MARKETING_ASSETS.map((a, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{a.icon}</span>
                  <span style={{ fontSize: 11, background: "rgba(99,102,241,.15)", color: "#818cf8", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{a.type}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{a.desc}</div>
                <button style={{ marginTop: 4, background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.3)", color: "#818cf8", padding: "7px 0", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                  Download / Copy
                </button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, background: "rgba(52,211,153,.06)", border: "1px solid rgba(52,211,153,.2)", borderRadius: 12, padding: 16, color: "#94a3b8", fontSize: 13 }}>
            💡 <strong style={{ color: "#34d399" }}>Pro tip:</strong> WhatsApp messages convert best in Pakistan. Send personalised pitches to business owners you know personally.
          </div>
        </div>
      )}

      {/* ── SETTINGS ── */}
      {tab === "settings" && (
        <div style={{ maxWidth: 560 }}>
          <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 24, marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Account Info</h3>
            <div style={{ display: "grid", gap: 14 }}>
              {[
                { label: "Name",           value: affiliate.name },
                { label: "Email",          value: affiliate.email },
                { label: "Tracking Code",  value: affiliate.trackingCode },
                { label: "Commission Rate",value: `${(affiliate.commissionRate * 100).toFixed(0)}%` },
                { label: "Member Since",   value: new Date(affiliate.approvedAt || "").toLocaleDateString("en-GB") },
              ].map(f => (
                <div key={f.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,.05)", paddingBottom: 12 }}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>{f.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{f.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 24 }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Payout Settings</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 8 }}>Preferred Payout Method</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8 }}>
                {PAYOUT_METHODS.map(m => (
                  <button key={m.value} onClick={() => setPayoutMethod(m.value)}
                    style={{ padding: "10px 12px", background: payoutMethod === m.value ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.04)", border: `1px solid ${payoutMethod === m.value ? "rgba(99,102,241,.5)" : "rgba(255,255,255,.08)"}`, borderRadius: 10, color: payoutMethod === m.value ? "#818cf8" : "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
                    <div style={{ fontSize: 18, marginBottom: 2 }}>{m.icon}</div>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 8 }}>Account / Wallet Details</label>
              <textarea
                value={payoutDetails}
                onChange={e => setPayoutDetails(e.target.value)}
                placeholder={payoutMethod === "bank" ? "Bank name, account #, IBAN…" : payoutMethod === "jazzcash" || payoutMethod === "easypaisa" ? "Mobile number…" : payoutMethod === "paypal" ? "PayPal email…" : payoutMethod === "crypto" ? "USDT TRC20 / ERC20 wallet address…" : "Payout details…"}
                rows={3}
                style={{ width: "100%", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, color: "#e2e8f0", padding: "10px 14px", fontSize: 13, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={saveSettings} disabled={saving}
                style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 10, cursor: saving ? "wait" : "pointer", fontWeight: 600, fontSize: 14 }}>
                {saving ? "Saving…" : "Save Settings"}
              </button>
              {saveMsg && <span style={{ color: "#34d399", fontSize: 13 }}>✓ {saveMsg}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
