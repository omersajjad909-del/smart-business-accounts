"use client";
import Link from "next/link";

const LAST_UPDATED = "15 June 2026";

const SECTIONS = [
  {
    icon: "✅",
    title: "Permitted Uses",
    content: [
      { sub: "Business Operations", body: "You may use FinovaOS for lawful business activities including invoicing, accounting, inventory management, payroll, CRM, and financial reporting for your registered business or sole proprietorship." },
      { sub: "Authorized Users", body: "You may grant access to your employees, contractors, and authorized representatives to use FinovaOS on your behalf, subject to the seat limits of your plan. You are responsible for all activity under your account." },
      { sub: "Data Import & Export", body: "You may import your own business data (customers, suppliers, transactions, inventory) and export it at any time. You must own or have rights to the data you import." },
      { sub: "API & Integrations", body: "Enterprise plan customers may use the FinovaOS API for integrations with other business tools, provided usage stays within documented rate limits and does not disrupt service for other users." },
    ],
  },
  {
    icon: "🚫",
    title: "Prohibited Uses",
    content: [
      { sub: "Illegal Activities", body: "You may not use FinovaOS to facilitate money laundering, tax evasion, fraud, bribery, or any activity that violates applicable laws in Pakistan, the UAE, the UK, or any other jurisdiction where you operate." },
      { sub: "False or Misleading Data", body: "You may not use FinovaOS to generate fraudulent invoices, falsify financial records, or create documents intended to deceive banks, tax authorities, investors, or any third parties." },
      { sub: "Unauthorized Access", body: "You may not attempt to access accounts belonging to other FinovaOS customers, reverse-engineer the platform, probe for security vulnerabilities without written authorization, or circumvent authentication controls." },
      { sub: "Data Harvesting", body: "You may not scrape, crawl, or systematically extract data from FinovaOS using automated tools. You may not sell, resell, or commercially exploit FinovaOS data or functionality without a written reseller agreement." },
      { sub: "Service Disruption", body: "You may not transmit malware, conduct denial-of-service attacks, send spam through FinovaOS communication features, or take any action that unreasonably burdens our infrastructure." },
      { sub: "Prohibited Industries", body: "FinovaOS may not be used by businesses primarily engaged in: weapons manufacturing, gambling services (without applicable licenses), human trafficking, adult content platforms (without age verification), or sanctioned entities." },
    ],
  },
  {
    icon: "👤",
    title: "Account Responsibilities",
    content: [
      { sub: "Account Security", body: "You are responsible for maintaining the security of your login credentials, enabling two-factor authentication (strongly recommended), and promptly notifying us at security@finovaos.app of any unauthorized access or breach." },
      { sub: "Accurate Information", body: "You must provide accurate business information during registration and keep it up to date. Providing false information — including fake business names, addresses, or tax numbers — is grounds for immediate account termination." },
      { sub: "User Management", body: "You are responsible for managing access for all users under your account. When an employee leaves, you must promptly revoke their access. FinovaOS is not liable for data access by former employees whose accounts were not deactivated." },
      { sub: "Plan Limits", body: "You must operate within the limits of your subscribed plan (users, branches, API calls). Using technical workarounds to exceed plan limits without paying for the appropriate tier is a violation of this policy." },
    ],
  },
  {
    icon: "📧",
    title: "Communication Features",
    content: [
      { sub: "WhatsApp & SMS", body: "The WhatsApp and SMS features (available on Professional and Enterprise plans) may only be used to send transactional communications to customers and suppliers who have an existing business relationship with you. Marketing messages require prior consent." },
      { sub: "Anti-Spam", body: "You may not use FinovaOS communication tools to send unsolicited bulk messages, phishing links, or messages designed to deceive recipients. Violations may result in immediate suspension of messaging features." },
      { sub: "Invoice Sharing", body: "Invoices and documents shared via FinovaOS must represent genuine business transactions. Sharing fictitious invoices or using the invoice-sharing feature to impersonate other businesses is strictly prohibited." },
    ],
  },
  {
    icon: "🤖",
    title: "AI Features",
    content: [
      { sub: "Accuracy Responsibility", body: "AI-generated content in FinovaOS (invoice suggestions, financial insights, chat responses) is provided for assistance only. You are responsible for reviewing AI outputs before acting on them. FinovaOS does not guarantee the accuracy of AI-generated financial advice." },
      { sub: "No Automated Decision Reliance", body: "AI features must not be used as the sole basis for significant financial decisions (e.g., credit approvals, investment choices, compliance filings). Always have a qualified professional review important decisions." },
      { sub: "Prompt Abuse", body: "You may not attempt to use AI chat features to extract confidential information about FinovaOS systems, other customers, or to generate content that violates this AUP (e.g., fraudulent documents, misleading reports)." },
    ],
  },
  {
    icon: "⚠️",
    title: "Enforcement",
    content: [
      { sub: "Warnings & Suspension", body: "Minor or first-time violations of this AUP may result in a warning and request to correct the behavior. Repeated or serious violations may result in immediate suspension of features or account access." },
      { sub: "Termination", body: "FinovaOS reserves the right to terminate accounts that engage in illegal activity, cause harm to other users or third parties, or repeatedly violate this policy — without refund of prepaid subscription fees." },
      { sub: "Reporting Violations", body: "If you believe another user is violating this AUP, please report it to abuse@finovaos.app with details of the violation. We take all reports seriously and investigate within 5 business days." },
      { sub: "Cooperation with Authorities", body: "FinovaOS will cooperate with law enforcement agencies and regulatory bodies when legally required to do so. We may disclose account information in response to valid legal process, as described in our Privacy Policy." },
    ],
  },
  {
    icon: "🔄",
    title: "Changes to This Policy",
    content: [
      { sub: "Updates", body: "FinovaOS may update this Acceptable Use Policy from time to time to reflect changes in our services, applicable laws, or to address new types of misuse. We will notify you of material changes via email or an in-app notification at least 14 days before they take effect." },
      { sub: "Continued Use", body: "Your continued use of FinovaOS after the effective date of any update constitutes acceptance of the revised Acceptable Use Policy." },
    ],
  },
];

export default function AUPPage() {
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
          <h1 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 800, margin: "0 0 12px" }}>Acceptable Use Policy</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>Last updated: {LAST_UPDATED} · Governs how FinovaOS may and may not be used</p>
        </div>

        <div style={{ background: "rgba(129,140,248,.06)", border: "1px solid rgba(129,140,248,.2)", borderRadius: 14, padding: "16px 20px", marginBottom: 40, fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>
          This Acceptable Use Policy ("AUP") sets out the rules for using FinovaOS products and services. It applies to all customers, users, and anyone who accesses FinovaOS. Violations may result in suspension or termination of your account. By using FinovaOS, you agree to comply with this policy.
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

        <div style={{ marginTop: 40, padding: "20px 24px", background: "rgba(248,113,113,.06)", border: "1px solid rgba(248,113,113,.2)", borderRadius: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fca5a5", marginBottom: 6 }}>Questions or Reports?</div>
          <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>
            To report a suspected AUP violation, contact <a href="mailto:abuse@finovaos.app" style={{ color: "#818cf8" }}>abuse@finovaos.app</a>.
            For general legal questions, contact <a href="mailto:legal@finovaos.app" style={{ color: "#818cf8" }}>legal@finovaos.app</a>.
          </div>
        </div>

        <div style={{ marginTop: 32, borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 32, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { label: "Privacy Policy", href: "/legal/privacy" },
            { label: "Terms of Service", href: "/legal/terms" },
            { label: "Service Level Agreement", href: "/legal/sla" },
            { label: "Data Processing Agreement", href: "/legal/dpa" },
          ].map(l => (
            <Link key={l.href} href={l.href} style={{ color: "#64748b", fontSize: 13, textDecoration: "none" }}>{l.label}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
