"use client";
import { fmtDate } from "@/lib/dateUtils";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Referral = {
  id: string;
  refereeEmail: string;
  status: "pending" | "signed_up" | "converted";
  reward: number | null;
  createdAt: string;
  convertedAt: string | null;
};

type Stats = {
  total: number;
  signed_up: number;
  converted: number;
  rewards: number;
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: "Invited",   color: "#818cf8" },
  signed_up: { label: "Signed Up", color: "#fbbf24" },
  converted: { label: "Converted", color: "#34d399" },
};

export default function ReferralsPage() {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [stats,        setStats]        = useState<Stats | null>(null);
  const [referrals,    setReferrals]    = useState<Referral[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [copied,       setCopied]       = useState(false);

  const headers = () => {
    const user = getCurrentUser();
    const h: Record<string, string> = {};
    if (user?.id)        h["x-user-id"]    = user.id;
    if (user?.role)      h["x-user-role"]  = user.role;
    if (user?.companyId) h["x-company-id"] = user.companyId;
    return h;
  };

  useEffect(() => {
    fetch("/api/referrals/my-link", { headers: headers() })
      .then(r => r.json())
      .then(d => {
        setReferralCode(d.referralCode || null);
        setStats(d.stats || null);
        setReferrals(d.referrals || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const referralLink = referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/onboarding/signup/starter?ref=${referralCode}`
    : "";

  function copyLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) return (
    <div style={{ padding: 40, color: "rgba(255,255,255,.4)", fontFamily: "inherit" }}>Loading…</div>
  );

  return (
    <div style={{ padding: "32px 28px", maxWidth: 700, fontFamily: "'Outfit','DM Sans',sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "white", margin: "0 0 6px" }}>
          Refer & Earn
        </h1>
        <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.4)", margin: 0 }}>
          Share your unique link. When someone signs up, you earn rewards.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total Invited",  value: stats?.total     ?? 0, color: "#818cf8" },
          { label: "Signed Up",      value: stats?.signed_up ?? 0, color: "#fbbf24" },
          { label: "Converted",      value: stats?.converted ?? 0, color: "#34d399" },
          { label: "Rewards ($)",    value: `$${(stats?.rewards ?? 0).toFixed(0)}`, color: "#f472b6" },
        ].map(s => (
          <div key={s.label} style={{ borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", padding: "16px 18px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 6, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div style={{ borderRadius: 16, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.2)", padding: "24px 24px", marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 14 }}>Your Referral Link</div>

        {referralCode ? (
          <>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1, padding: "11px 14px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", fontSize: 12.5, color: "rgba(255,255,255,.7)", fontFamily: "monospace", wordBreak: "break-all" }}>
                {referralLink}
              </div>
              <button
                onClick={copyLink}
                style={{ padding: "11px 18px", borderRadius: 10, background: copied ? "rgba(52,211,153,.15)" : "linear-gradient(135deg,#6366f1,#4f46e5)", border: copied ? "1px solid rgba(52,211,153,.3)" : "none", color: copied ? "#34d399" : "white", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all .2s" }}
              >
                {copied ? "✓ Copied!" : "Copy Link"}
              </button>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 20 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
                Your code: <span style={{ color: "#818cf8", fontFamily: "monospace", fontWeight: 700, letterSpacing: "1px" }}>{referralCode}</span>
              </span>
            </div>

            {/* How it works */}
            <div style={{ marginTop: 18, borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 12 }}>How it works</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { step: "1", text: "Share your link with a business owner" },
                  { step: "2", text: "They sign up using your referral link" },
                  { step: "3", text: "When they upgrade to a paid plan, you earn a reward" },
                ].map(s => (
                  <div key={s.step} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "rgba(255,255,255,.5)" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 700, color: "#818cf8" }}>{s.step}</div>
                    {s.text}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: "rgba(255,255,255,.35)", fontSize: 13 }}>Failed to load referral code. Please refresh.</div>
        )}
      </div>

      {/* Referral history */}
      <div style={{ borderRadius: 14, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.06)", fontSize: 13, fontWeight: 700, color: "white" }}>
          Referral History
        </div>
        {referrals.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: 13 }}>
            No referrals yet. Share your link to get started!
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                {["Email", "Status", "Reward", "Date"].map(h => (
                  <th key={h} style={{ padding: "10px 20px", textAlign: "left", color: "rgba(255,255,255,.35)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {referrals.map(r => {
                const sm = STATUS_LABEL[r.status] || STATUS_LABEL.pending;
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <td style={{ padding: "12px 20px", color: "rgba(255,255,255,.7)" }}>{r.refereeEmail}</td>
                    <td style={{ padding: "12px 20px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, background: `${sm.color}18`, color: sm.color, fontSize: 11, fontWeight: 700 }}>{sm.label}</span>
                    </td>
                    <td style={{ padding: "12px 20px", color: r.reward ? "#34d399" : "rgba(255,255,255,.25)" }}>
                      {r.reward ? `$${r.reward}` : "—"}
                    </td>
                    <td style={{ padding: "12px 20px", color: "rgba(255,255,255,.35)" }}>
                      {fmtDate(r.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}