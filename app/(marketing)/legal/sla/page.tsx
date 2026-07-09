"use client";
import Link from "next/link";

const LAST_UPDATED = "15 June 2026";

const SECTIONS = [
  {
    icon: "⏱️", title: "Service Availability (Uptime)",
    content: [
      { sub: "Uptime Commitment", body: "FinovaOS commits to a monthly uptime of 99.9% for all paid plans, measured on a rolling 30-day basis. This excludes scheduled maintenance windows and force majeure events." },
      { sub: "Measurement", body: "Uptime is calculated as: (Total minutes in month − Downtime minutes) / Total minutes × 100. Our status page at /status provides real-time and historical uptime data." },
      { sub: "Scheduled Maintenance", body: "Planned maintenance will be announced at least 48 hours in advance via email and the status page. Maintenance windows are typically between 02:00–04:00 UTC on weekends and do not count toward downtime." },
    ],
  },
  {
    icon: "📊", title: "Service Credits (SLA Breach Remedies)",
    content: [
      { sub: "Credit Calculation", body: "If monthly uptime falls below 99.9%, affected customers on paid plans are entitled to service credits applied to their next billing cycle." },
      { sub: "Credit Table", body: "99.0%–99.9% uptime → 5% credit | 95.0%–99.0% → 10% credit | Below 95.0% → 25% credit. Credits are capped at 25% of the monthly subscription fee." },
      { sub: "Claiming Credits", body: "Credits must be requested within 30 days of the incident by emailing support@finovaos.app with the subject 'SLA Credit Request'. Credits are not paid in cash and cannot be transferred." },
    ],
  },
  {
    icon: "🎧", title: "Support Response Times",
    content: [
      { sub: "Starter Plan", body: "Email support only. Target first response: 72 business hours. Scope: product questions, billing, and account issues." },
      { sub: "Professional Plan", body: "Email + live chat support. Target first response: 24 business hours. Priority handling for critical issues affecting core accounting functions." },
      { sub: "Enterprise Plan", body: "Email + live chat + dedicated account manager. Target first response: 4 business hours. Critical production issues: 2-hour target. After-hours escalation available." },
      { sub: "Business Hours", body: "Support business hours are Monday–Friday 09:00–18:00 PKT (UTC+5). Enterprise critical support operates 24/7 for P1 issues." },
    ],
  },
  {
    icon: "🔧", title: "Incident Classification",
    content: [
      { sub: "P1 — Critical", body: "Complete service unavailability or data loss. Examples: login failure for all users, invoice data inaccessible. Response target: 1 hour. Resolution target: 4 hours." },
      { sub: "P2 — High", body: "Core feature degraded, workaround available. Examples: slow report generation, payment gateway timeout. Response: 4 hours. Resolution: 24 hours." },
      { sub: "P3 — Medium", body: "Non-critical feature impacted. Examples: PDF export delay, filter bug. Response: 24 hours. Resolution: 5 business days." },
      { sub: "P4 — Low", body: "Minor cosmetic issues or feature requests. Response: 72 hours. Resolution: next release cycle." },
    ],
  },
  {
    icon: "🛡️", title: "Data Backup & Recovery",
    content: [
      { sub: "Backup Frequency", body: "Automated daily snapshots of all customer data are taken and retained for 30 days. Companies on Pro and Enterprise plans may schedule additional on-demand backups via the Backup & Restore dashboard. Backup infrastructure is provided by our primary database provider with point-in-time recovery available on eligible plans." },
      { sub: "Recovery Point Objective (RPO)", body: "In the event of data loss, maximum data loss is limited to 24 hours (the automated backup interval). Customers on eligible plans may reduce this window by scheduling more frequent backups." },
      { sub: "Recovery Time Objective (RTO)", body: "In the event of a full disaster requiring database restore, target recovery time is 24 hours for critical systems. Point-in-time recovery on eligible plans can reduce RTO to 4 hours." },
      { sub: "Data Export", body: "Customers can export all their data (invoices, ledger, contacts, inventory) in CSV/PDF format at any time from the dashboard. Data export is available for 90 days after account closure." },
    ],
  },
  {
    icon: "❌", title: "SLA Exclusions",
    content: [
      { sub: "Excluded Events", body: "The following are excluded from SLA calculations: force majeure events (natural disasters, war, government actions), internet or network issues outside FinovaOS infrastructure, customer-caused outages (incorrect configuration, API abuse), third-party service failures (payment gateways, SMS providers, email deliverability), and scheduled maintenance announced 48+ hours in advance." },
      { sub: "Fair Use", body: "SLA protections apply to customers using the service within fair use limits. Accounts identified as abusing the platform (bulk data scraping, excessive API calls) may have SLA protections suspended pending review." },
    ],
  },
];

export default function SLAPage() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#04061a 0%,#080c2a 60%,#04061a 100%)", fontFamily: "'Outfit','Inter',sans-serif", color: "#e2e8f0" }}>
      <div style={{ padding: "20px 32px" }}>
        <Link href="/" style={{ color: "#64748b", textDecoration: "none", fontSize: 14 }}>← Back to FinovaOS</Link>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-block", background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", padding: "5px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            Legal
          </div>
          <h1 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 800, margin: "0 0 12px" }}>Service Level Agreement</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>Last updated: {LAST_UPDATED} · Applies to all paid FinovaOS plans</p>
        </div>

        <div style={{ background: "rgba(52,211,153,.06)", border: "1px solid rgba(52,211,153,.2)", borderRadius: 14, padding: "16px 20px", marginBottom: 40, fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>
          This Service Level Agreement ("SLA") is incorporated into and forms part of the FinovaOS Terms of Service. It defines the service standards, uptime commitments, and support response times that FinovaOS ("we", "us") commits to providing to customers on paid plans.
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          {SECTIONS.map((sec, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 28 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10 }}>
                <span>{sec.icon}</span> {sec.title}
              </h2>
              <div style={{ display: "grid", gap: 16 }}>
                {sec.content.map((item, j) => (
                  <div key={j}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#818cf8", marginBottom: 6 }}>{item.sub}</div>
                    <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>{item.body}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40, borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 32, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { label: "Privacy Policy", href: "/legal/privacy" },
            { label: "Terms of Service", href: "/legal/terms" },
            { label: "Refund Policy", href: "/legal/refund" },
            { label: "Data Processing Agreement", href: "/legal/dpa" },
            { label: "Acceptable Use Policy", href: "/legal/aup" },
          ].map(l => (
            <Link key={l.href} href={l.href} style={{ color: "#64748b", fontSize: 13, textDecoration: "none" }}>{l.label}</Link>
          ))}
        </div>

        <p style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "#475569" }}>
          Questions about this SLA? Email us at <a href="mailto:legal@finovaos.app" style={{ color: "#818cf8" }}>legal@finovaos.app</a>
        </p>
      </div>
    </div>
  );
}
