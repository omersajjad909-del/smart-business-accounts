"use client";
import Link from "next/link";

const LAST_UPDATED = "15 June 2026";

const SECTIONS = [
  {
    icon: "📋", title: "Scope and Application",
    content: [
      { sub: "Purpose", body: "This Data Processing Agreement ('DPA') supplements the FinovaOS Terms of Service and governs the processing of personal data by FinovaOS ('Processor') on behalf of the customer ('Controller') in connection with the FinovaOS platform." },
      { sub: "GDPR Compliance", body: "This DPA is intended to comply with the requirements of the EU General Data Protection Regulation (GDPR) Regulation (EU) 2016/679, the UK GDPR, and other applicable data protection laws." },
      { sub: "Who This Applies To", body: "This DPA applies to any customer that: (a) is established in the European Economic Area or United Kingdom; (b) processes personal data of EEA/UK residents; or (c) specifically requests a DPA for compliance purposes." },
    ],
  },
  {
    icon: "🔑", title: "Roles and Responsibilities",
    content: [
      { sub: "Customer as Controller", body: "The customer determines the purposes and means of processing personal data entered into FinovaOS — including employee records, customer contact information, and supplier details. The customer is the 'Data Controller' under GDPR." },
      { sub: "FinovaOS as Processor", body: "FinovaOS processes personal data only on documented instructions from the customer (as expressed through use of the platform and this agreement). FinovaOS is the 'Data Processor'." },
      { sub: "Sub-processors", body: "FinovaOS uses approved sub-processors to deliver the service, including: Supabase (database, EU region), AWS (infrastructure, EU/APAC), SendGrid (transactional email), Stripe/Paddle (payments). A current list is maintained at finovaos.app/legal/sub-processors." },
    ],
  },
  {
    icon: "🛡️", title: "Security Measures",
    content: [
      { sub: "Technical Measures", body: "FinovaOS implements the following technical safeguards: TLS 1.3 encryption in transit, AES-256 encryption at rest, field-level encryption for sensitive data (NTN, CNIC, bank details), role-based access control, multi-factor authentication support, and immutable audit logs." },
      { sub: "Organisational Measures", body: "Access to customer data is restricted to authorized personnel on a need-to-know basis. All staff with data access undergo background checks and sign confidentiality agreements. Security training is conducted annually." },
      { sub: "Incident Notification", body: "FinovaOS will notify the customer without undue delay (and within 72 hours where feasible) upon becoming aware of a personal data breach affecting customer data, including: nature of breach, categories of data affected, likely consequences, and measures taken or proposed." },
    ],
  },
  {
    icon: "🌍", title: "International Data Transfers",
    content: [
      { sub: "Transfer Mechanisms", body: "Where personal data is transferred outside the EEA or UK, FinovaOS relies on Standard Contractual Clauses (SCCs) approved by the European Commission, or an equivalent lawful transfer mechanism, to ensure adequate protection." },
      { sub: "Data Locations", body: "Customer data is stored in: AWS eu-west-1 (Ireland) for EU customers, AWS ap-south-1 (Mumbai) for South Asia, AWS me-south-1 (Bahrain) for Middle East. Customers may request geographic data residency restrictions for Enterprise plans." },
    ],
  },
  {
    icon: "👤", title: "Data Subject Rights",
    content: [
      { sub: "Assisting the Controller", body: "FinovaOS will assist the customer in responding to data subject requests (access, rectification, erasure, portability, restriction, objection) by providing appropriate tools in the platform and technical support where needed." },
      { sub: "Erasure", body: "Upon customer request or account closure, FinovaOS will delete or anonymise all personal data within 90 days, except where retention is required by law. Backup copies are purged within 180 days." },
      { sub: "Data Portability", body: "Customers can export all personal data (contacts, employee records, transaction parties) in CSV format at any time via the dashboard export feature." },
    ],
  },
  {
    icon: "📊", title: "Audit Rights",
    content: [
      { sub: "Audit & Inspection", body: "Upon 30 days written notice, the customer may conduct (or commission a qualified third party to conduct) an audit of FinovaOS data processing activities. FinovaOS will cooperate with audits during normal business hours and may require a non-disclosure agreement before sharing sensitive infrastructure details." },
      { sub: "Compliance Reports", body: "In lieu of an on-site audit, FinovaOS will provide copies of relevant security certifications, penetration test summaries, and compliance reports on request, subject to confidentiality obligations." },
    ],
  },
];

export default function DPAPage() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#04061a 0%,#080c2a 60%,#04061a 100%)", fontFamily: "'Outfit','Inter',sans-serif", color: "#e2e8f0" }}>
      <div style={{ padding: "20px 32px" }}>
        <Link href="/" style={{ color: "#64748b", textDecoration: "none", fontSize: 14 }}>← Back to FinovaOS</Link>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-block", background: "rgba(129,140,248,.12)", border: "1px solid rgba(129,140,248,.3)", color: "#818cf8", padding: "5px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            Legal
          </div>
          <h1 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 800, margin: "0 0 12px" }}>Data Processing Agreement</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>Last updated: {LAST_UPDATED} · GDPR-compliant DPA between FinovaOS and its customers</p>
        </div>

        <div style={{ background: "rgba(129,140,248,.06)", border: "1px solid rgba(129,140,248,.2)", borderRadius: 14, padding: "16px 20px", marginBottom: 40, fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>
          This Data Processing Agreement governs how FinovaOS processes personal data on behalf of customers. By using FinovaOS, you agree to this DPA as a legally binding addendum to the Terms of Service. This DPA is effective from the date you first use the FinovaOS platform.
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
            { label: "Service Level Agreement", href: "/legal/sla" },
            { label: "Acceptable Use Policy", href: "/legal/aup" },
          ].map(l => (
            <Link key={l.href} href={l.href} style={{ color: "#64748b", fontSize: 13, textDecoration: "none" }}>{l.label}</Link>
          ))}
        </div>

        <p style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "#475569" }}>
          To execute a signed DPA for enterprise agreements, contact <a href="mailto:legal@finovaos.app" style={{ color: "#818cf8" }}>legal@finovaos.app</a>
        </p>
      </div>
    </div>
  );
}
