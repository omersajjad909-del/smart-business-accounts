"use client";
import Link from "next/link";

const LAST_UPDATED = "9 July 2026";

type Processor = {
  name: string;
  purpose: string;
  location: string;
  dataCategories: string;
  website: string;
};

const PROCESSORS: Processor[] = [
  {
    name: "Vercel Inc.",
    purpose: "Application hosting, serverless functions, edge network delivery",
    location: "United States (multi-region)",
    dataCategories: "Application traffic, request metadata, IP addresses, session cookies",
    website: "https://vercel.com/legal/privacy-policy",
  },
  {
    name: "Supabase Inc.",
    purpose: "Primary database (PostgreSQL), file storage, authentication backend",
    location: "United States / EU (per project region)",
    dataCategories: "All customer-entered business data (invoices, ledger, employees, contacts, inventory), user credentials",
    website: "https://supabase.com/privacy",
  },
  {
    name: "LemonSqueezy (Paddle Inc.)",
    purpose: "Payments processing, checkout, subscription billing, tax handling",
    location: "United States / European Union",
    dataCategories: "Billing name, email, payment method (tokenized), transaction history, IP address, VAT/tax ID (if provided)",
    website: "https://www.lemonsqueezy.com/privacy",
  },
  {
    name: "SMTP Email Provider (Gmail / SendGrid / configured provider)",
    purpose: "Transactional email delivery (invoices, receipts, reminders, notifications)",
    location: "United States",
    dataCategories: "Recipient email address, email subject and body, sender identity",
    website: "https://policies.google.com/privacy",
  },
  {
    name: "Twilio Inc.",
    purpose: "SMS notification delivery (payment reminders, alerts, 2FA)",
    location: "United States",
    dataCategories: "Recipient phone number, message content, delivery status",
    website: "https://www.twilio.com/en-us/legal/privacy",
  },
  {
    name: "BulkSMS / Local SMS Providers",
    purpose: "Regional SMS delivery for Pakistan and South Asia",
    location: "Pakistan / South Asia",
    dataCategories: "Recipient phone number, message content",
    website: "https://www.bulksms.com/company/legal/privacy.htm",
  },
  {
    name: "Anthropic PBC (Claude)",
    purpose: "AI-powered assistance for reports, summaries, and workflow suggestions (optional, opt-in)",
    location: "United States",
    dataCategories: "Prompts submitted through AI features (never used to train shared models)",
    website: "https://www.anthropic.com/legal/privacy",
  },
  {
    name: "Google LLC (Analytics / Maps, if enabled)",
    purpose: "Optional website analytics and map rendering",
    location: "United States",
    dataCategories: "Anonymized page views, device metadata, approximate location",
    website: "https://policies.google.com/privacy",
  },
];

export default function SubProcessorsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#04061a 0%,#080c2a 60%,#04061a 100%)", fontFamily: "'Outfit','Inter',sans-serif", color: "#e2e8f0" }}>
      <div style={{ padding: "20px 32px" }}>
        <Link href="/" style={{ color: "#64748b", textDecoration: "none", fontSize: 14 }}>← Back to FinovaOS</Link>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-block", background: "rgba(129,140,248,.12)", border: "1px solid rgba(129,140,248,.3)", color: "#818cf8", padding: "5px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            Legal
          </div>
          <h1 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 800, margin: "0 0 12px" }}>Sub-processors</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>Last updated: {LAST_UPDATED} · Third-party services that process customer data on behalf of FinovaOS</p>
        </div>

        <div style={{ background: "rgba(129,140,248,.06)", border: "1px solid rgba(129,140,248,.2)", borderRadius: 14, padding: "16px 20px", marginBottom: 40, fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>
          This page lists all sub-processors currently engaged by FinovaOS to deliver the platform. Each provider is bound by a Data Processing Agreement (or equivalent contractual safeguard) requiring them to process personal data only on our documented instructions and to maintain security measures aligned with our Privacy Policy. We update this list whenever a sub-processor is added or replaced.
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          {PROCESSORS.map((p, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#e2e8f0" }}>{p.name}</h2>
                <a href={p.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#818cf8", textDecoration: "none", background: "rgba(129,140,248,.1)", padding: "4px 12px", borderRadius: 12 }}>Privacy Policy ↗</a>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <Row label="Purpose" value={p.purpose} />
                <Row label="Location" value={p.location} />
                <Row label="Data Categories" value={p.dataCategories} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "20px 24px" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px", color: "#e2e8f0" }}>How we notify you of changes</h3>
          <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, margin: 0 }}>
            We will update this page whenever we add or replace a sub-processor. Enterprise customers may subscribe to sub-processor notifications by emailing <a href="mailto:legal@finovaos.app" style={{ color: "#818cf8" }}>legal@finovaos.app</a>. You will be notified at least 30 days before a new sub-processor begins processing customer data, giving you time to object if needed.
          </p>
        </div>

        <div style={{ marginTop: 40, borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 32, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { label: "Privacy Policy", href: "/legal/privacy" },
            { label: "Data Processing Agreement", href: "/legal/dpa" },
            { label: "Terms of Service", href: "/legal/terms" },
            { label: "Security", href: "/legal/security" },
          ].map(l => (
            <Link key={l.href} href={l.href} style={{ color: "#64748b", fontSize: 13, textDecoration: "none" }}>{l.label}</Link>
          ))}
        </div>

        <p style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "#475569" }}>
          Questions about our sub-processors? Contact <a href="mailto:legal@finovaos.app" style={{ color: "#818cf8" }}>legal@finovaos.app</a>
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, alignItems: "start" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
      <div style={{ fontSize: 13.5, color: "#94a3b8", lineHeight: 1.6 }}>{value}</div>
    </div>
  );
}
