import type { Metadata } from "next";
import { headers } from "next/headers";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common FinovaOS questions — pricing, setup, inventory valuation, FBR compliance, security, and support.",
  openGraph: {
    title: "FinovaOS FAQ — Questions, answered plainly",
    description: "What FinovaOS does, how it is priced, and how it handles your books.",
    url: `${BASE}/faq`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS FAQ" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinovaOS FAQ — Questions, answered plainly",
    description: "What FinovaOS does, how it is priced, and how it handles your books.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/faq` },
};

// Mirrors GROUPS in page.tsx. Kept as a plain duplicate here (rather than a
// shared import) because this file is a Server Component and page.tsx is a
// client component with its own local state — importing the client file's
// data would pull the "use client" boundary in here unnecessarily. If the
// FAQ list changes, update both.
const FAQ_PAIRS: { q: string; a: string }[] = [
  { q: "What exactly is FinovaOS?", a: "A cloud business platform that puts invoicing, inventory, accounting, manufacturing, HR and payroll, CRM and reporting in one place. Instead of running separate tools that never agree with each other, every document you raise — a purchase, a production run, a sale — posts straight into the same ledger." },
  { q: "How long does setup take?", a: "Most businesses are issuing their first invoice the same day. When you pick your business type, FinovaOS seeds a matching chart of accounts, dashboard, and module set — so you are not starting from an empty screen." },
  { q: "Can I import my existing data?", a: "Yes. Customers, suppliers, items, and opening balances can be imported from spreadsheets. For opening stock you can enter quantities and rates directly so your inventory valuation starts from a correct base." },
  { q: "Do you offer a free trial?", a: "No. FinovaOS is a paid product from day one — we would rather charge fairly and support you properly than run a trial funnel. If you want to see it working first, book a demo and we will walk through your actual use case." },
  { q: "How is FinovaOS priced?", a: "By plan, not per user. Adding a colleague does not increase your bill. Full pricing, including regional pricing for Pakistan and the Gulf, is on the pricing page." },
  { q: "Can I pay in PKR?", a: "Yes. Pakistani customers are billed in PKR at local pricing rather than a converted dollar figure." },
  { q: "What happens if I cancel?", a: "Your data stays yours. You can export your ledgers, invoices, and reports before the subscription ends. See the refund policy for the money side." },
  { q: "Can I change plans later?", a: "Yes, in either direction. Upgrades take effect immediately; downgrades apply from your next billing cycle." },
  { q: "How is inventory valued?", a: "At weighted-average cost. Every costed receipt — a purchase or a completed production run — updates the average, and every sale releases stock at that average into Cost of Goods Sold. The stock account and the stock quantity always tell the same story." },
  { q: "Is it double-entry accounting?", a: "Yes. Every document posts a balanced voucher. A sales invoice raises the receivable and the revenue, and separately charges the cost of what was sold against Finished Goods or Stock — so gross profit is real, not just revenue." },
  { q: "Is it FBR compliant?", a: "FinovaOS produces FBR-ready sales tax invoices and the supporting registers. Tax rates and withholding rules are configurable per company." },
  { q: "Can I run multiple companies or branches?", a: "Yes. Multiple companies sit under one login, each with its own books, and branches within a company get their own documents and reporting." },
  { q: "How does production costing work?", a: "You define a Bill of Materials — the finished product, how many units a batch yields, the materials it consumes, and the labour and overhead per batch. Completing a production run issues the material out of stock at weighted-average cost, absorbs the labour and overhead, and receives the finished goods in at the full cost of making them." },
  { q: "What accounts does a production run touch?", a: "Material, labour, and overhead are charged to Work In Progress; the finished goods are then received out of WIP into Finished Goods. When the goods are sold, that cost is released into Cost of Goods Sold." },
  { q: "Can I produce when material is short?", a: "Only deliberately. By default a run is blocked and tells you exactly which material is short and by how much. You can override it, and the shortfall then shows as negative stock so it is visible rather than hidden." },
  { q: "Where is my data stored?", a: "In managed cloud infrastructure with encryption in transit (TLS 1.3) and field-level encryption for sensitive data at rest. See the security page for the current detail, including what is live today and what is still on the roadmap." },
  { q: "Who in my team can see what?", a: "Access is role-based and granular down to the page. Admins assign roles and per-user permissions, and every change is written to an append-only audit trail." },
  { q: "Do you support two-factor authentication?", a: "Yes, TOTP-based 2FA is available per user, alongside login alerts and session controls." },
  { q: "How do I get help?", a: "Through the support centre, the in-app chat, or email. Higher plans include priority response times as set out in the SLA." },
  { q: "Is there documentation?", a: "Yes — product documentation covers day-to-day workflows, and the API docs cover the developer side." },
  { q: "Do you help with migration?", a: "Yes. Tell us what you are moving from and we will scope the import with you before you commit." },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_PAIRS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default async function FaqLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") || undefined;
  return (
    <>
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  );
}
