"use client";
import Link from "next/link";

const FONT = "'Outfit','Inter',sans-serif";

const INTEGRATIONS = [
  {
    href: "/dashboard/integrations/api-access",
    icon: "🔗",
    label: "API Access",
    desc: "REST API keys, webhooks, and third-party integrations",
    color: "#6366f1",
    badge: "Developer",
  },
  {
    href: "/dashboard/integrations/bank-accounts",
    icon: "🏦",
    label: "Bank Connect (Plaid)",
    desc: "Link your bank account for automatic transaction sync",
    color: "#38bdf8",
    badge: "Finance",
  },
  {
    href: "/dashboard/integrations/sso",
    icon: "🔐",
    label: "SSO / SAML",
    desc: "Single Sign-On with Google, Azure AD, Okta, or SAML 2.0",
    color: "#34d399",
    badge: "Security",
  },
  {
    href: "/dashboard/notifications",
    icon: "📱",
    label: "WhatsApp & SMS",
    desc: "Send invoices, reminders, and alerts via WhatsApp/SMS",
    color: "#4ade80",
    badge: "Messaging",
  },
  {
    href: "/dashboard/email-settings",
    icon: "📧",
    label: "Email Settings",
    desc: "Configure SMTP, email templates, and sending rules",
    color: "#fbbf24",
    badge: "Email",
  },
  {
    href: "/dashboard/import-wizard",
    icon: "📥",
    label: "Import Wizard",
    desc: "Bulk import customers, items, and transactions from Excel/CSV",
    color: "#f59e0b",
    badge: "Data",
  },
];

export default function IntegrationsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg)", padding: "32px 28px", fontFamily: FONT, color: "var(--text-primary)" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px", letterSpacing: -0.5 }}>Integrations</h1>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Connect Finova with your bank, payment gateway, and external tools</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {INTEGRATIONS.map(item => (
          <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
            <div style={{
              background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 16,
              padding: "22px 24px", cursor: "pointer", transition: "border-color .15s, transform .15s, box-shadow .15s",
              display: "flex", flexDirection: "column", gap: 12, height: "100%", boxSizing: "border-box",
            }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = item.color;
                el.style.transform = "translateY(-3px)";
                el.style.boxShadow = `0 8px 24px ${item.color}20`;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "var(--border)";
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ width: 48, height: 48, borderRadius: 13, background: `${item.color}18`, border: `1px solid ${item.color}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: `${item.color}15`, color: item.color, border: `1px solid ${item.color}30`, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  {item.badge}
                </span>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 5 }}>{item.label}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{item.desc}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: item.color, fontWeight: 600, marginTop: "auto" }}>
                Configure →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
