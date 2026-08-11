"use client";
// FILE: app/(marketing)/faq/page.tsx
// Standalone FAQ. The landing page has an FAQ section, but it is buried at the
// bottom of a long scroll and was never linkable on its own — so nobody could
// send someone "the FAQ", and search engines had nothing to index.

import Link from "next/link";
import { useState } from "react";

type QA = { q: string; a: string };
type Group = { title: string; icon: string; color: string; items: QA[] };

const GROUPS: Group[] = [
  {
    title: "Getting Started",
    icon: "🚀",
    color: "#818cf8",
    items: [
      {
        q: "What exactly is FinovaOS?",
        a: "A cloud business platform that puts invoicing, inventory, accounting, manufacturing, HR and payroll, CRM and reporting in one place. Instead of running separate tools that never agree with each other, every document you raise — a purchase, a production run, a sale — posts straight into the same ledger.",
      },
      {
        q: "How long does setup take?",
        a: "Most businesses are issuing their first invoice the same day. When you pick your business type, FinovaOS seeds a matching chart of accounts, dashboard, and module set — so you are not starting from an empty screen.",
      },
      {
        q: "Can I import my existing data?",
        a: "Yes. Customers, suppliers, items, and opening balances can be imported from spreadsheets. For opening stock you can enter quantities and rates directly so your inventory valuation starts from a correct base.",
      },
      {
        q: "Do you offer a free trial?",
        a: "No. FinovaOS is a paid product from day one — we would rather charge fairly and support you properly than run a trial funnel. If you want to see it working first, book a demo and we will walk through your actual use case.",
      },
    ],
  },
  {
    title: "Pricing & Billing",
    icon: "💳",
    color: "#34d399",
    items: [
      {
        q: "How is FinovaOS priced?",
        a: "By plan, not per user. Adding a colleague does not increase your bill. Full pricing, including regional pricing for Pakistan and the Gulf, is on the pricing page.",
      },
      {
        q: "Can I pay in PKR?",
        a: "Yes. Pakistani customers are billed in PKR at local pricing rather than a converted dollar figure.",
      },
      {
        q: "What happens if I cancel?",
        a: "Your data stays yours. You can export your ledgers, invoices, and reports before the subscription ends. See the refund policy for the money side.",
      },
      {
        q: "Can I change plans later?",
        a: "Yes, in either direction. Upgrades take effect immediately; downgrades apply from your next billing cycle.",
      },
    ],
  },
  {
    title: "Accounting & Inventory",
    icon: "📊",
    color: "#fbbf24",
    items: [
      {
        q: "How is inventory valued?",
        a: "At weighted-average cost. Every costed receipt — a purchase or a completed production run — updates the average, and every sale releases stock at that average into Cost of Goods Sold. The stock account and the stock quantity always tell the same story.",
      },
      {
        q: "Is it double-entry accounting?",
        a: "Yes. Every document posts a balanced voucher. A sales invoice raises the receivable and the revenue, and separately charges the cost of what was sold against Finished Goods or Stock — so gross profit is real, not just revenue.",
      },
      {
        q: "Is it FBR compliant?",
        a: "FinovaOS produces FBR-ready sales tax invoices and the supporting registers. Tax rates and withholding rules are configurable per company.",
      },
      {
        q: "Can I run multiple companies or branches?",
        a: "Yes. Multiple companies sit under one login, each with its own books, and branches within a company get their own documents and reporting.",
      },
    ],
  },
  {
    title: "Manufacturing",
    icon: "🏭",
    color: "#f472b6",
    items: [
      {
        q: "How does production costing work?",
        a: "You define a Bill of Materials — the finished product, how many units a batch yields, the materials it consumes, and the labour and overhead per batch. Completing a production run issues the material out of stock at weighted-average cost, absorbs the labour and overhead, and receives the finished goods in at the full cost of making them.",
      },
      {
        q: "What accounts does a production run touch?",
        a: "Material, labour, and overhead are charged to Work In Progress; the finished goods are then received out of WIP into Finished Goods. When the goods are sold, that cost is released into Cost of Goods Sold.",
      },
      {
        q: "Can I produce when material is short?",
        a: "Only deliberately. By default a run is blocked and tells you exactly which material is short and by how much. You can override it, and the shortfall then shows as negative stock so it is visible rather than hidden.",
      },
    ],
  },
  {
    title: "Security & Data",
    icon: "🔐",
    color: "#60a5fa",
    items: [
      {
        q: "Where is my data stored?",
        a: "In managed cloud infrastructure with encryption in transit (TLS 1.3) and field-level encryption for sensitive data at rest. See the security page for the current detail, including what is live today and what is still on the roadmap.",
      },
      {
        q: "Who in my team can see what?",
        a: "Access is role-based and granular down to the page. Admins assign roles and per-user permissions, and every change is written to an append-only audit trail.",
      },
      {
        q: "Do you support two-factor authentication?",
        a: "Yes, TOTP-based 2FA is available per user, alongside login alerts and session controls.",
      },
    ],
  },
  {
    title: "Support",
    icon: "💬",
    color: "#a78bfa",
    items: [
      {
        q: "How do I get help?",
        a: "Through the support centre, the in-app chat, or email. Higher plans include priority response times as set out in the SLA.",
      },
      {
        q: "Is there documentation?",
        a: "Yes — product documentation covers day-to-day workflows, and the API docs cover the developer side.",
      },
      {
        q: "Do you help with migration?",
        a: "Yes. Tell us what you are moving from and we will scope the import with you before you commit.",
      },
    ],
  },
];

const CARD = "rgba(255,255,255,.03)";
const BORDER = "rgba(255,255,255,.08)";

export default function FaqPage() {
  const [open, setOpen] = useState<string | null>("0-0");

  return (
    <main style={{
      background: "linear-gradient(180deg,#060919 0%,#0a0e24 40%,#060919 100%)",
      minHeight: "100vh",
      fontFamily: "'Outfit','DM Sans',system-ui,sans-serif",
      color: "white",
    }}>
      {/* Hero */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "110px 24px 48px", textAlign: "center" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px",
          borderRadius: 100, background: "rgba(99,102,241,.1)",
          border: "1px solid rgba(99,102,241,.2)", marginBottom: 22,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", letterSpacing: ".08em", textTransform: "uppercase" }}>
            Frequently Asked
          </span>
        </div>
        <h1 style={{ fontSize: "clamp(30px,5vw,46px)", fontWeight: 800, margin: "0 0 16px", lineHeight: 1.15, letterSpacing: "-.02em" }}>
          Questions, answered plainly
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,.45)", lineHeight: 1.75, margin: "0 auto", maxWidth: 620 }}>
          What FinovaOS does, how it is priced, and how it handles your books. If
          something is not here, ask us — we answer properly.
        </p>
      </section>

      {/* Groups */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 90px", display: "flex", flexDirection: "column", gap: 40 }}>
        {GROUPS.map((group, gi) => (
          <div key={group.title}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>{group.icon}</span>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: group.color, letterSpacing: "-.01em" }}>
                {group.title}
              </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {group.items.map((item, ii) => {
                const id = `${gi}-${ii}`;
                const isOpen = open === id;
                return (
                  <div key={id} style={{
                    background: CARD,
                    border: `1px solid ${isOpen ? `${group.color}44` : BORDER}`,
                    borderRadius: 14,
                    overflow: "hidden",
                    transition: "border-color .2s",
                  }}>
                    <button
                      onClick={() => setOpen(isOpen ? null : id)}
                      aria-expanded={isOpen}
                      style={{
                        width: "100%", textAlign: "left", cursor: "pointer",
                        background: "none", border: "none", padding: "16px 18px",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: 16, color: "white", fontSize: 14.5, fontWeight: 600,
                        fontFamily: "inherit", lineHeight: 1.5,
                      }}
                    >
                      {item.q}
                      <span aria-hidden style={{
                        flexShrink: 0, width: 22, height: 22, borderRadius: 7,
                        background: isOpen ? `${group.color}22` : "rgba(255,255,255,.05)",
                        color: isOpen ? group.color : "rgba(255,255,255,.4)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 15, fontWeight: 400, lineHeight: 1,
                        transition: "all .2s",
                      }}>
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    {isOpen && (
                      <p style={{
                        margin: 0, padding: "0 18px 18px",
                        fontSize: 14, color: "rgba(255,255,255,.5)", lineHeight: 1.8,
                      }}>
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 110px" }}>
        <div style={{
          borderRadius: 20, padding: "40px 32px", textAlign: "center",
          background: "linear-gradient(135deg,rgba(99,102,241,.12),rgba(79,70,229,.05))",
          border: "1px solid rgba(99,102,241,.22)",
        }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 10px" }}>Still have a question?</h2>
          <p style={{ fontSize: 14.5, color: "rgba(255,255,255,.45)", margin: "0 0 24px", lineHeight: 1.7 }}>
            Tell us about your business and we will show you exactly how it would run on FinovaOS.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/demo" style={{
              padding: "12px 24px", borderRadius: 11, textDecoration: "none",
              background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white",
              fontSize: 14, fontWeight: 700,
            }}>Book a Demo →</Link>
            <Link href="/contact" style={{
              padding: "12px 24px", borderRadius: 11, textDecoration: "none",
              background: "rgba(255,255,255,.05)", border: `1px solid ${BORDER}`,
              color: "rgba(255,255,255,.75)", fontSize: 14, fontWeight: 600,
            }}>Contact Us</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
