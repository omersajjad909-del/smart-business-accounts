"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const FONT = "'Outfit','Inter',sans-serif";

type IntegrationItem = {
  href: string;
  icon: string;
  label: string;
  desc: string;
  color: string;
  badge: string;
  statusKey?: string;
};

const INTEGRATIONS: IntegrationItem[] = [
  {
    href: "/dashboard/integrations/api-access",
    icon: "🔗",
    label: "API Access",
    desc: "Generate REST API keys and connect third-party apps to your FinovaOS data",
    color: "#6366f1",
    badge: "Developer",
    statusKey: "api",
  },
  {
    href: "/dashboard/integrations/bank-accounts",
    icon: "🏦",
    label: "Bank Connect",
    desc: "Link your bank account via Plaid for automatic transaction sync and reconciliation",
    color: "#38bdf8",
    badge: "Finance",
    statusKey: "bank",
  },
  {
    href: "/dashboard/integrations/sso",
    icon: "🔐",
    label: "SSO / SAML",
    desc: "Single Sign-On with Google Workspace, Azure AD, Okta, or custom SAML 2.0",
    color: "#34d399",
    badge: "Security",
    statusKey: "sso",
  },
  {
    href: "/dashboard/notifications",
    icon: "💬",
    label: "Notifications & Messaging",
    desc: "Configure WhatsApp Business, SMS providers, and SMTP email for alerts and invoices",
    color: "#4ade80",
    badge: "Messaging",
    statusKey: "notifications",
  },
  {
    href: "/dashboard/import-wizard",
    icon: "📥",
    label: "Import Wizard",
    desc: "Bulk import customers, vendors, inventory items, and transactions from Excel or CSV",
    color: "#f59e0b",
    badge: "Data",
    statusKey: "import",
  },
  {
    href: "/dashboard/integrations/webhooks",
    icon: "🪝",
    label: "Webhooks",
    desc: "Send real-time event notifications to your own endpoints when invoices, payments, or orders are created",
    color: "#a78bfa",
    badge: "Developer",
    statusKey: "webhooks",
  },
];

export default function IntegrationsPage() {
  const [apiKeyCount, setApiKeyCount] = useState<number | null>(null);
  const [bankCount,   setBankCount]   = useState<number | null>(null);
  const [ssoEnabled,  setSsoEnabled]  = useState<boolean | null>(null);
  const [notifSetup,  setNotifSetup]  = useState<boolean | null>(null);

  useEffect(() => {
    // API keys
    fetch("/api/integrations/api-keys")
      .then(r => r.ok ? r.json() : null)
      .then(d => setApiKeyCount(Array.isArray(d?.keys) ? d.keys.filter((k: any) => k.status === "active").length : 0))
      .catch(() => setApiKeyCount(0));

    // Bank accounts
    fetch("/api/bank-accounts")
      .then(r => r.ok ? r.json() : null)
      .then(d => setBankCount(Array.isArray(d) ? d.length : 0))
      .catch(() => setBankCount(0));

    // SSO config
    fetch("/api/integrations/sso")
      .then(r => r.ok ? r.json() : null)
      .then(d => setSsoEnabled(d?.enabled === true))
      .catch(() => setSsoEnabled(false));

    // Notifications (comms config)
    fetch("/api/company/comms-config")
      .then(r => r.ok ? r.json() : null)
      .then(d => setNotifSetup(!!(d?.email?.host || d?.whatsapp?.phoneNumberId || d?.sms?.apiKey)))
      .catch(() => setNotifSetup(false));
  }, []);

  const getStatus = (item: IntegrationItem): { label: string; color: string; bg: string } => {
    switch (item.statusKey) {
      case "api":
        if (apiKeyCount === null) return { label: "Loading…", color: "#6b7280", bg: "rgba(107,114,128,.1)" };
        return apiKeyCount > 0
          ? { label: `${apiKeyCount} Active Key${apiKeyCount > 1 ? "s" : ""}`, color: "#34d399", bg: "rgba(52,211,153,.1)" }
          : { label: "Not configured", color: "#6b7280", bg: "rgba(107,114,128,.1)" };
      case "bank":
        if (bankCount === null) return { label: "Loading…", color: "#6b7280", bg: "rgba(107,114,128,.1)" };
        return bankCount > 0
          ? { label: `${bankCount} Account${bankCount > 1 ? "s" : ""} linked`, color: "#34d399", bg: "rgba(52,211,153,.1)" }
          : { label: "Not connected", color: "#6b7280", bg: "rgba(107,114,128,.1)" };
      case "sso":
        if (ssoEnabled === null) return { label: "Loading…", color: "#6b7280", bg: "rgba(107,114,128,.1)" };
        return ssoEnabled
          ? { label: "Enabled", color: "#34d399", bg: "rgba(52,211,153,.1)" }
          : { label: "Disabled", color: "#6b7280", bg: "rgba(107,114,128,.1)" };
      case "notifications":
        if (notifSetup === null) return { label: "Loading…", color: "#6b7280", bg: "rgba(107,114,128,.1)" };
        return notifSetup
          ? { label: "Configured", color: "#34d399", bg: "rgba(52,211,153,.1)" }
          : { label: "Not set up", color: "#fbbf24", bg: "rgba(251,191,36,.1)" };
      default:
        return { label: "Configure", color: "#6b7280", bg: "rgba(107,114,128,.1)" };
    }
  };

  const connected = [
    apiKeyCount !== null && apiKeyCount > 0,
    bankCount !== null && bankCount > 0,
    ssoEnabled === true,
    notifSetup === true,
  ].filter(Boolean).length;

  return (
    <div style={{ padding: "32px 28px", fontFamily: FONT, color: "var(--text-primary)", minHeight: "100vh", background: "var(--app-bg)" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px", letterSpacing: -0.5 }}>Integrations</h1>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
          Connect FinovaOS with your bank, messaging providers, and external tools
        </p>
      </div>

      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { icon: "🔌", label: "Connected", value: `${connected} / 4`, color: connected > 0 ? "#34d399" : "#6b7280", bg: connected > 0 ? "rgba(52,211,153,.08)" : "rgba(107,114,128,.06)", border: connected > 0 ? "rgba(52,211,153,.2)" : "rgba(107,114,128,.15)" },
          { icon: "🔗", label: "API Keys Active", value: apiKeyCount === null ? "…" : String(apiKeyCount), color: "#6366f1", bg: "rgba(99,102,241,.08)", border: "rgba(99,102,241,.2)" },
          { icon: "🏦", label: "Bank Accounts Linked", value: bankCount === null ? "…" : String(bankCount), color: "#38bdf8", bg: "rgba(56,189,248,.08)", border: "rgba(56,189,248,.2)" },
        ].map(s => (
          <div key={s.label} style={{ padding: "14px 18px", borderRadius: 12, background: s.bg, border: `1px solid ${s.border}`, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Integration cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {INTEGRATIONS.map(item => {
          const status = getStatus(item);
          return (
            <Link key={item.label} href={item.href} style={{ textDecoration: "none" }}>
              <div
                style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 16, padding: "22px 22px 18px", cursor: "pointer", transition: "border-color .15s, transform .15s, box-shadow .15s", display: "flex", flexDirection: "column", gap: 12, height: "100%", boxSizing: "border-box" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = item.color; el.style.transform = "translateY(-2px)"; el.style.boxShadow = `0 8px 24px ${item.color}20`; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.transform = "translateY(0)"; el.style.boxShadow = "none"; }}
              >
                {/* Icon + badge row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: `${item.color}18`, border: `1px solid ${item.color}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                    {item.icon}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: `${item.color}15`, color: item.color, border: `1px solid ${item.color}30`, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    {item.badge}
                  </span>
                </div>

                {/* Label + description */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 5 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55 }}>{item.desc}</div>
                </div>

                {/* Footer: status + cta */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: status.bg, color: status.color }}>
                    {status.label}
                  </span>
                  <span style={{ fontSize: 12, color: item.color, fontWeight: 600 }}>Configure →</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
