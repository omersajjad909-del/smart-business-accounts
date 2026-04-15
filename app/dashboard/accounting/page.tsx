"use client";
import Link from "next/link";

const FONT = "'Outfit','Inter',sans-serif";

const MODULES = [
  { href: "/dashboard/accounts",        icon: "📒", label: "Chart of Accounts",   desc: "Manage your full account hierarchy", color: "#6366f1" },
  { href: "/dashboard/cpv",             icon: "💸", label: "CPV",                 desc: "Cash Payment Voucher",               color: "#f87171" },
  { href: "/dashboard/crv",             icon: "💰", label: "CRV",                 desc: "Cash Receipt Voucher",               color: "#34d399" },
  { href: "/dashboard/jv",              icon: "📝", label: "Journal Voucher",      desc: "Manual journal entries (JV)",        color: "#818cf8" },
  { href: "/dashboard/opening-balances",icon: "⚖️", label: "Opening Balances",    desc: "Set balances for new financial year", color: "#fbbf24" },
  { href: "/dashboard/advance-payment", icon: "📤", label: "Advance Payment",      desc: "Track advance payments to vendors",  color: "#38bdf8" },
  { href: "/dashboard/contra",          icon: "🔄", label: "Contra Entry",         desc: "Bank to cash & vice versa",          color: "#a78bfa" },
  { href: "/dashboard/credit-note",     icon: "🔻", label: "Credit Notes",         desc: "Issue credit to customers",          color: "#f59e0b" },
  { href: "/dashboard/debit-note",      icon: "🔺", label: "Debit Notes",          desc: "Raise debit against vendors",        color: "#fb923c" },
  { href: "/dashboard/petty-cash",      icon: "🪙", label: "Petty Cash",           desc: "Manage small day-to-day expenses",   color: "#4ade80" },
  { href: "/dashboard/loans",           icon: "🏦", label: "Loans",                desc: "Track loans payable & receivable",   color: "#60a5fa" },
  { href: "/dashboard/fixed-assets",    icon: "🏗️", label: "Fixed Assets",         desc: "Asset register & depreciation",      color: "#e879f9" },
  { href: "/dashboard/currencies",      icon: "💱", label: "Currencies",           desc: "Multi-currency exchange rates",      color: "#2dd4bf" },
  { href: "/dashboard/recurring-transactions", icon: "🔁", label: "Recurring Transactions", desc: "Auto-post repeating entries", color: "#94a3b8" },
];

export default function AccountingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg)", padding: "32px 28px", fontFamily: FONT, color: "var(--text-primary)" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px", letterSpacing: -0.5 }}>Accounting</h1>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Full double-entry bookkeeping — vouchers, journals, balances, assets</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {MODULES.map(m => (
          <Link prefetch={false} key={m.href} href={m.href} style={{ textDecoration: "none" }}>
            <div style={{
              background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14,
              padding: "18px 20px", cursor: "pointer", transition: "border-color .15s, transform .15s",
              display: "flex", alignItems: "flex-start", gap: 14,
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = m.color; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${m.color}18`, border: `1px solid ${m.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                {m.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 3 }}>{m.label}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>{m.desc}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
