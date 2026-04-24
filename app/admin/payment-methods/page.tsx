"use client";

import { useEffect, useState } from "react";

type PaymentConfig = {
  provider: string;
  managedExternally: boolean;
  paymentMethods: Array<{ id?: string; label?: string; type?: string; isDefault?: boolean }>;
  defaultId: string | null;
  note: string;
};

const PROVIDER_META: Record<string, { label: string; color: string; bgColor: string; description: string; icon: string }> = {
  LEMON_SQUEEZY: {
    label: "Lemon Squeezy",
    color: "#fbbf24",
    bgColor: "rgba(251,191,36,.14)",
    description: "Payment collection is fully managed by Lemon Squeezy. Customers are redirected to a secure Lemon Squeezy checkout to complete their purchase. Card, PayPal, and regional payment methods are supported.",
    icon: "🍋",
  },
  INTERNAL: {
    label: "Internal / Manual",
    color: "#94a3b8",
    bgColor: "rgba(148,163,184,.12)",
    description: "No payment provider is configured. This workspace is using manual or offline payment collection. Configure a payment provider in your billing settings to enable automated checkout.",
    icon: "🏦",
  },
};

const FEATURE_ROWS = [
  { feature: "Automated Checkout", lemon: true,  internal: false },
  { feature: "Card Payments",      lemon: true,  internal: false },
  { feature: "PayPal",             lemon: true,  internal: false },
  { feature: "Recurring Billing",  lemon: true,  internal: false },
  { feature: "Refund Management",  lemon: true,  internal: false },
  { feature: "Invoice Generation", lemon: true,  internal: true  },
  { feature: "Manual Collection",  lemon: false, internal: true  },
];

export default function AdminPaymentMethodsPage() {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/billing/payment-methods", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setConfig(d))
      .catch(() => setError("Unable to load payment configuration."))
      .finally(() => setLoading(false));
  }, []);

  const meta = config ? (PROVIDER_META[config.provider] || PROVIDER_META.INTERNAL) : null;

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "var(--text)", paddingBottom: 48 }}>
      <style>{pageStyles}</style>

      <div className="pm-header">
        <div>
          <h1 className="pm-title">Payment Methods</h1>
          <p className="pm-subtitle">Payment provider configuration and billing method overview for this workspace.</p>
        </div>
        <a href="/admin/settings" className="pm-settings-link">
          <SettingsIcon /> Configure in Settings
        </a>
      </div>

      {loading ? (
        <div className="pm-loading">Loading payment configuration…</div>
      ) : error ? (
        <div className="pm-error">{error}</div>
      ) : config && meta ? (
        <>
          {/* Provider status card */}
          <div className="pm-provider-card">
            <div className="pm-provider-left">
              <div className="pm-provider-icon" style={{ background: meta.bgColor }}>
                {meta.icon}
              </div>
              <div>
                <div className="pm-provider-label">Active Payment Provider</div>
                <div className="pm-provider-name" style={{ color: meta.color }}>{meta.label}</div>
                <div className="pm-provider-desc">{meta.description}</div>
              </div>
            </div>
            <div className="pm-provider-badge-wrap">
              <span className="pm-badge" style={{ background: meta.bgColor, color: meta.color }}>
                {config.managedExternally ? "Externally Managed" : "Internal"}
              </span>
              <span className={`pm-status-dot${config.managedExternally ? " pm-status-dot--live" : " pm-status-dot--idle"}`} />
              <span className="pm-status-text">{config.managedExternally ? "Live & Active" : "Not Configured"}</span>
            </div>
          </div>

          {/* Note banner */}
          {config.note && (
            <div className="pm-note-banner">
              <InfoIcon />
              <span>{config.note}</span>
            </div>
          )}

          {/* Stat row */}
          <div className="pm-stats">
            <div className="pm-stat-card">
              <div className="pm-stat-label">Provider</div>
              <div className="pm-stat-value" style={{ color: meta.color }}>{meta.label}</div>
            </div>
            <div className="pm-stat-card">
              <div className="pm-stat-label">Management</div>
              <div className="pm-stat-value">{config.managedExternally ? "External" : "Internal"}</div>
            </div>
            <div className="pm-stat-card">
              <div className="pm-stat-label">Configured Methods</div>
              <div className="pm-stat-value">{config.paymentMethods.length || (config.managedExternally ? "Auto" : "None")}</div>
            </div>
            <div className="pm-stat-card">
              <div className="pm-stat-label">Default ID</div>
              <div className="pm-stat-value pm-stat-value--mono">{config.defaultId || "—"}</div>
            </div>
          </div>

          {/* Feature comparison */}
          <div className="pm-card">
            <div className="pm-card-head">
              <h2 className="pm-section-title">Provider Capabilities</h2>
              <span className="pm-active-tag" style={{ color: meta.color, background: meta.bgColor }}>
                Current: {meta.label}
              </span>
            </div>
            <div className="pm-table-wrap">
              <table className="pm-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Lemon Squeezy</th>
                    <th>Internal / Manual</th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_ROWS.map((row) => (
                    <tr key={row.feature} className={`pm-row${config.provider === "LEMON_SQUEEZY" && row.lemon ? " pm-row--highlight" : config.provider !== "LEMON_SQUEEZY" && row.internal ? " pm-row--highlight" : ""}`}>
                      <td className="pm-feature-name">{row.feature}</td>
                      <td><StatusDot active={row.lemon} /></td>
                      <td><StatusDot active={row.internal} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Configured methods list (if any) */}
          {config.paymentMethods.length > 0 && (
            <div className="pm-card">
              <h2 className="pm-section-title" style={{ marginBottom: 16 }}>Configured Methods</h2>
              <div className="pm-methods-list">
                {config.paymentMethods.map((m, i) => (
                  <div key={m.id || i} className="pm-method-row">
                    <div className="pm-method-left">
                      <div className="pm-method-name">{m.label || m.type || "Payment Method"}</div>
                      {m.type && m.type !== m.label && <div className="pm-method-type">{m.type}</div>}
                    </div>
                    <div className="pm-method-right">
                      {m.isDefault && <span className="pm-default-badge">Default</span>}
                      {m.id && <code className="pm-method-id">{m.id}</code>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA for changing provider */}
          <div className="pm-cta-card">
            <div className="pm-cta-left">
              <div className="pm-cta-title">Want to change your payment provider?</div>
              <div className="pm-cta-desc">Go to Settings → Billing to configure or switch your payment provider. All subscription and billing settings are managed there.</div>
            </div>
            <a href="/admin/settings" className="pm-cta-btn">Go to Settings</a>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`pm-feature-dot${active ? " pm-feature-dot--yes" : " pm-feature-dot--no"}`}>
      {active ? "✓" : "✗"}
    </span>
  );
}

function SettingsIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
function InfoIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>; }

const pageStyles = `
.pm-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:22px;}
.pm-title{margin:0 0 6px;font-size:24px;font-weight:800;color:var(--text);}
.pm-subtitle{margin:0;font-size:13px;color:var(--text-muted);}
.pm-settings-link{
  display:inline-flex;align-items:center;gap:7px;
  padding:10px 16px;border-radius:13px;border:1px solid var(--border);
  background:var(--panel);color:var(--text-soft);text-decoration:none;
  font-size:13px;font-weight:700;white-space:nowrap;flex-shrink:0;
  transition:border-color .14s;
}
.pm-settings-link:hover{border-color:#8b5cf6;color:var(--text);}
.pm-loading{padding:48px;text-align:center;color:var(--text-muted);font-size:13px;}
.pm-error{padding:14px 16px;border-radius:14px;background:rgba(244,63,94,.1);color:#f87171;font-size:13px;margin-bottom:16px;}
.pm-provider-card{
  background:var(--panel);border:1px solid var(--border);border-radius:22px;
  padding:22px 24px;margin-bottom:14px;
  display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap;
}
.pm-provider-left{display:flex;align-items:flex-start;gap:16px;}
.pm-provider-icon{
  width:56px;height:56px;border-radius:18px;display:grid;place-items:center;
  font-size:26px;flex-shrink:0;
}
.pm-provider-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px;}
.pm-provider-name{font-size:22px;font-weight:800;margin-bottom:6px;}
.pm-provider-desc{font-size:13px;color:var(--text-muted);line-height:1.55;max-width:480px;}
.pm-provider-badge-wrap{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.pm-badge{padding:6px 12px;border-radius:999px;font-size:12px;font-weight:700;}
.pm-status-dot{width:9px;height:9px;border-radius:50%;}
.pm-status-dot--live{background:#22c55e;box-shadow:0 0 8px rgba(34,197,94,.5);}
.pm-status-dot--idle{background:rgba(148,163,184,.4);}
.pm-status-text{font-size:12px;font-weight:700;color:var(--text-muted);}
.pm-note-banner{
  display:flex;align-items:flex-start;gap:10px;padding:13px 16px;
  border-radius:14px;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.2);
  color:#a5b4fc;font-size:13px;margin-bottom:14px;
}
.pm-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px;}
.pm-stat-card{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:16px 18px;}
.pm-stat-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;}
.pm-stat-value{font-size:20px;font-weight:800;color:var(--text);}
.pm-stat-value--mono{font-family:monospace;font-size:14px;}
.pm-card{background:var(--panel);border:1px solid var(--border);border-radius:20px;padding:20px;margin-bottom:14px;}
.pm-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;}
.pm-section-title{margin:0;font-size:16px;font-weight:700;color:var(--text);}
.pm-active-tag{padding:5px 12px;border-radius:999px;font-size:12px;font-weight:700;}
.pm-table-wrap{overflow-x:auto;}
.pm-table{width:100%;border-collapse:collapse;min-width:440px;}
.pm-table th{padding:12px 14px;text-align:left;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border);}
.pm-table td{padding:13px 14px;font-size:13px;border-bottom:1px solid var(--border);}
.pm-row:last-child td{border-bottom:none;}
.pm-row--highlight{background:rgba(139,92,246,.06);}
.pm-feature-name{color:var(--text-soft);font-weight:600;}
.pm-feature-dot{display:inline-flex;width:24px;height:24px;border-radius:8px;align-items:center;justify-content:center;font-size:12px;font-weight:800;}
.pm-feature-dot--yes{background:rgba(34,197,94,.14);color:#4ade80;}
.pm-feature-dot--no{background:rgba(248,113,113,.1);color:#f87171;}
.pm-methods-list{display:grid;gap:10px;}
.pm-method-row{
  display:flex;align-items:center;justify-content:space-between;gap:14px;
  padding:13px 14px;border-radius:14px;border:1px solid var(--border);background:var(--bg-soft,rgba(255,255,255,.02));
}
.pm-method-name{font-weight:700;color:var(--text);font-size:14px;}
.pm-method-type{font-size:11px;color:var(--text-muted);margin-top:2px;}
.pm-method-right{display:flex;align-items:center;gap:8px;}
.pm-default-badge{padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;background:rgba(139,92,246,.14);color:#c4b5fd;}
.pm-method-id{font-family:monospace;font-size:11px;color:var(--text-muted);background:rgba(255,255,255,.04);padding:3px 8px;border-radius:7px;}
.pm-cta-card{
  display:flex;align-items:center;justify-content:space-between;gap:18px;
  padding:20px 22px;border-radius:20px;
  background:linear-gradient(135deg,rgba(109,40,217,.14),rgba(79,124,255,.08));
  border:1px solid rgba(109,40,217,.22);flex-wrap:wrap;
}
.pm-cta-title{font-size:15px;font-weight:700;color:var(--text);margin-bottom:5px;}
.pm-cta-desc{font-size:13px;color:var(--text-muted);}
.pm-cta-btn{
  padding:11px 20px;border-radius:14px;
  background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:#fff;
  text-decoration:none;font-size:13px;font-weight:700;
  box-shadow:0 6px 20px rgba(109,40,217,.28);white-space:nowrap;flex-shrink:0;
}
@media(max-width:768px){
  .pm-stats{grid-template-columns:repeat(2,1fr);}
  .pm-provider-card{flex-direction:column;}
}
@media(max-width:480px){
  .pm-stats{grid-template-columns:1fr;}
  .pm-cta-card{flex-direction:column;align-items:flex-start;}
}
`;
