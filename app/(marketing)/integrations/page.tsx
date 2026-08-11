"use client";
// FILE: app/(marketing)/integrations/page.tsx
// The footer pointed at "Integrations" with nowhere to land. Everything listed
// here is either shipped or explicitly marked as planned — nothing is claimed
// as available when it is not.

import Link from "next/link";
import { useState } from "react";

type Status = "live" | "planned";
type Integration = {
  name: string;
  desc: string;
  icon: string;
  status: Status;
};
type Category = {
  title: string;
  blurb: string;
  color: string;
  items: Integration[];
};

const CATEGORIES: Category[] = [
  {
    title: "Payments",
    blurb: "Take money the way your customers already pay.",
    color: "#34d399",
    items: [
      { name: "Safepay", desc: "Card and wallet payments for Pakistani customers, settled in PKR.", icon: "💳", status: "live" },
      { name: "LemonSqueezy", desc: "International card payments and subscription billing.", icon: "🍋", status: "live" },
      { name: "Bank Transfer / IBFT", desc: "Record manual transfers against invoices and reconcile them to the bank.", icon: "🏦", status: "live" },
      { name: "Stripe", desc: "Global card processing for businesses billing outside Pakistan.", icon: "🌐", status: "planned" },
    ],
  },
  {
    title: "Banking",
    blurb: "Get the statement in without typing it in.",
    color: "#818cf8",
    items: [
      { name: "Statement Import", desc: "Import CSV and Excel bank statements and match them to vouchers.", icon: "📄", status: "live" },
      { name: "Smart Reconciliation", desc: "Suggested matches between statement lines and your ledger, with a confidence score.", icon: "🧮", status: "live" },
      { name: "Plaid", desc: "Direct bank feeds for supported institutions.", icon: "🔗", status: "planned" },
    ],
  },
  {
    title: "Messaging",
    blurb: "Invoices and reminders where people actually read them.",
    color: "#fbbf24",
    items: [
      { name: "WhatsApp", desc: "Send invoices, statements, and payment reminders straight to a customer's WhatsApp.", icon: "💬", status: "live" },
      { name: "Email (SMTP)", desc: "Transactional email for invoices, receipts, and alerts from your own domain.", icon: "✉️", status: "live" },
      { name: "SMS", desc: "Short payment reminders and OTP delivery over SMS.", icon: "📱", status: "live" },
    ],
  },
  {
    title: "Identity & Access",
    blurb: "Sign in the way your organisation already does.",
    color: "#60a5fa",
    items: [
      { name: "Google Sign-In", desc: "One-click sign-in with a Google Workspace or Gmail account.", icon: "🔵", status: "live" },
      { name: "SAML / OIDC SSO", desc: "Single sign-on against your own identity provider, configurable per company.", icon: "🔐", status: "live" },
      { name: "TOTP 2FA", desc: "Authenticator-app two-factor for any user account.", icon: "🔑", status: "live" },
    ],
  },
  {
    title: "Compliance & Tax",
    blurb: "The paperwork regulators expect, generated for you.",
    color: "#f472b6",
    items: [
      { name: "FBR Sales Tax", desc: "FBR-ready sales tax invoices and the supporting registers.", icon: "🧾", status: "live" },
      { name: "Withholding Tax", desc: "Configurable withholding rules applied at voucher level.", icon: "📌", status: "live" },
      { name: "Multi-Currency", desc: "Transact and report in more than one currency with exchange-rate tracking.", icon: "💱", status: "live" },
    ],
  },
  {
    title: "Developer",
    blurb: "Build on top of your own data.",
    color: "#a78bfa",
    items: [
      { name: "REST API", desc: "Programmatic access to customers, items, invoices, and vouchers.", icon: "⚙️", status: "live" },
      { name: "API Keys", desc: "Scoped keys per integration, revocable at any time.", icon: "🗝️", status: "live" },
      { name: "Webhooks", desc: "Get notified when documents are created or updated in your books.", icon: "📡", status: "live" },
    ],
  },
];

const BORDER = "rgba(255,255,255,.08)";

export default function IntegrationsPage() {
  const [filter, setFilter] = useState<"all" | Status>("all");

  const visible = CATEGORIES
    .map((c) => ({ ...c, items: c.items.filter((i) => filter === "all" || i.status === filter) }))
    .filter((c) => c.items.length > 0);

  const liveCount = CATEGORIES.reduce((n, c) => n + c.items.filter((i) => i.status === "live").length, 0);

  return (
    <main style={{
      background: "linear-gradient(180deg,#060919 0%,#0a0e24 40%,#060919 100%)",
      minHeight: "100vh",
      fontFamily: "'Outfit','DM Sans',system-ui,sans-serif",
      color: "white",
    }}>
      {/* Hero */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "110px 24px 40px", textAlign: "center" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px",
          borderRadius: 100, background: "rgba(52,211,153,.1)",
          border: "1px solid rgba(52,211,153,.2)", marginBottom: 22,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399", letterSpacing: ".08em", textTransform: "uppercase" }}>
            {liveCount} live integrations
          </span>
        </div>
        <h1 style={{ fontSize: "clamp(30px,5vw,46px)", fontWeight: 800, margin: "0 0 16px", lineHeight: 1.15, letterSpacing: "-.02em" }}>
          Connects to what you already use
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,.45)", lineHeight: 1.75, margin: "0 auto 28px", maxWidth: 620 }}>
          Payments, banking, messaging, identity, and tax — wired into the same
          ledger, so nothing has to be re-entered by hand.
        </p>

        {/* Filter */}
        <div style={{ display: "inline-flex", gap: 6, padding: 5, borderRadius: 12, background: "rgba(255,255,255,.04)", border: `1px solid ${BORDER}` }}>
          {([
            { id: "all",     label: "All" },
            { id: "live",    label: "Available now" },
            { id: "planned", label: "Planned" },
          ] as const).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              style={{
                padding: "8px 16px", borderRadius: 9, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                background: filter === opt.id ? "rgba(99,102,241,.22)" : "transparent",
                color: filter === opt.id ? "#a5b4fc" : "rgba(255,255,255,.45)",
                transition: "all .18s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 24px 90px", display: "flex", flexDirection: "column", gap: 44 }}>
        {visible.map((cat) => (
          <div key={cat.title}>
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                <div style={{ width: 3, height: 15, borderRadius: 2, background: cat.color }}/>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: cat.color, letterSpacing: "-.01em" }}>{cat.title}</h2>
              </div>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.34)", margin: 0, paddingLeft: 13 }}>{cat.blurb}</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 12 }}>
              {cat.items.map((item) => (
                <div key={item.name} style={{
                  background: "rgba(255,255,255,.03)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 14, padding: "18px 18px 16px",
                  display: "flex", flexDirection: "column", gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
                    <span style={{
                      fontSize: 9.5, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase",
                      padding: "3px 8px", borderRadius: 100, whiteSpace: "nowrap",
                      background: item.status === "live" ? "rgba(52,211,153,.12)" : "rgba(255,255,255,.05)",
                      color: item.status === "live" ? "#34d399" : "rgba(255,255,255,.32)",
                      border: `1px solid ${item.status === "live" ? "rgba(52,211,153,.25)" : BORDER}`,
                    }}>
                      {item.status === "live" ? "Available" : "Planned"}
                    </span>
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: "white" }}>{item.name}</div>
                  <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.4)", margin: 0, lineHeight: 1.7 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px 110px" }}>
        <div style={{
          borderRadius: 20, padding: "40px 32px", textAlign: "center",
          background: "linear-gradient(135deg,rgba(99,102,241,.12),rgba(79,70,229,.05))",
          border: "1px solid rgba(99,102,241,.22)",
        }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 10px" }}>Need something that isn&apos;t listed?</h2>
          <p style={{ fontSize: 14.5, color: "rgba(255,255,255,.45)", margin: "0 0 24px", lineHeight: 1.7 }}>
            The REST API and webhooks cover most cases. Tell us what you need to
            connect and we will point you at the right approach.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/developers/api" style={{
              padding: "12px 24px", borderRadius: 11, textDecoration: "none",
              background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white",
              fontSize: 14, fontWeight: 700,
            }}>Read the API Docs →</Link>
            <Link href="/contact" style={{
              padding: "12px 24px", borderRadius: 11, textDecoration: "none",
              background: "rgba(255,255,255,.05)", border: `1px solid ${BORDER}`,
              color: "rgba(255,255,255,.75)", fontSize: 14, fontWeight: 600,
            }}>Talk to Us</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
