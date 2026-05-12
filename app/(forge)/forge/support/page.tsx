"use client";
import Link from "next/link";
import { useState } from "react";
import { ForgeNav, ForgeFooter, useInView } from "../../components/shared";

const ff = "'Outfit','DM Sans',sans-serif";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", padding: "5px 14px", borderRadius: 100, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", fontSize: 11, fontWeight: 700, color: "#fbbf24", letterSpacing: ".08em", marginBottom: 20 }}>
      {children}
    </div>
  );
}

const faqs = [
  {
    category: "Getting Started",
    color: "#f59e0b",
    items: [
      { q: "How do I create my first business on FinovaOS?", a: "After signing up, go to Settings → Business Setup. Enter your business name, type, and fiscal year. You can add multiple businesses under one account." },
      { q: "How do I invite team members?", a: "Go to Settings → Team Members → Invite User. Assign a role (Admin, Accountant, Manager, Staff) to control what each person can access." },
      { q: "Can I import data from my previous system?", a: "Yes. FinovaOS supports CSV import for products, customers, suppliers, and opening balances. Go to Settings → Import Data for templates." },
    ],
  },
  {
    category: "Billing & Accounts",
    color: "#34d399",
    items: [
      { q: "What happens when my trial ends?", a: "You'll be prompted to choose a plan. Your data is preserved. You can export everything before making a decision." },
      { q: "Can I change my plan at any time?", a: "Yes. Upgrades take effect immediately. Downgrades take effect at the start of the next billing cycle." },
      { q: "Do you offer refunds?", a: "We don't offer refunds for completed billing periods, but you can cancel before your next renewal to avoid future charges." },
    ],
  },
  {
    category: "Features & Usage",
    color: "#818cf8",
    items: [
      { q: "How does bank reconciliation work?", a: "Connect your bank feed or upload a CSV statement. FinovaOS auto-matches transactions against your ledger entries. Unmatched items are flagged for review." },
      { q: "Can I use FinovaOS for multiple branches?", a: "Yes. Each branch is isolated with its own inventory and P&L, but you get a consolidated view at the company level. Branch-level permissions control staff access." },
      { q: "How do I set up reorder alerts?", a: "In Products, set a Reorder Level for each item. When stock drops to or below that level, you get an alert and optionally auto-generate a purchase order." },
    ],
  },
  {
    category: "Security & Privacy",
    color: "#06b6d4",
    items: [
      { q: "Who can see my business data?", a: "Only you and the team members you invite. Finova Forge staff do not access customer data except when explicitly required for support and with your permission." },
      { q: "How is my data backed up?", a: "Data is backed up daily with point-in-time recovery. Backups are stored in a separate availability zone." },
      { q: "Can I export all my data?", a: "Yes. Go to Settings → Export Data to download your full business data including transactions, contacts, and documents." },
    ],
  },
];

function Hero() {
  return (
    <section style={{ padding: "140px clamp(16px,3vw,48px) 80px", fontFamily: ff, textAlign: "center", background: "radial-gradient(ellipse 60% 40% at 50% -5%, rgba(245,158,11,.12), transparent)", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, opacity: .04, backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
      <div style={{ maxWidth: 680, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <Chip>HELP & SUPPORT</Chip>
        <h1 style={{ fontSize: "clamp(36px,6vw,60px)", fontWeight: 900, color: "white", letterSpacing: "-2px", margin: "0 0 16px", lineHeight: 1.1 }}>
          How can we help?
        </h1>
        <p style={{ fontSize: "clamp(14px,1.8vw,16px)", color: "rgba(255,255,255,.4)", lineHeight: 1.8, margin: "0 0 36px" }}>
          Find answers to common questions or reach our team directly.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="mailto:hello@finovaforge.com" style={{ padding: "12px 22px", borderRadius: 10, background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "white", fontWeight: 700, fontSize: 13, textDecoration: "none", boxShadow: "0 6px 20px rgba(245,158,11,.25)" }}>
            Email Support
          </a>
          <a href="https://finovaos.app" target="_blank" rel="noreferrer" style={{ padding: "12px 22px", borderRadius: 10, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.8)", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
            Open FinovaOS →
          </a>
        </div>
      </div>
    </section>
  );
}

function QuickLinks() {
  const [ref, vis] = useInView(0.05);
  const cards = [
    { icon: "🚀", title: "Getting Started", desc: "Set up your business, invite your team, and run your first transaction.", color: "#f59e0b" },
    { icon: "📊", title: "Accounting Basics", desc: "Understand how the double-entry ledger, P&L, and reconciliation work.", color: "#34d399" },
    { icon: "📦", title: "Inventory Setup", desc: "Add products, set reorder levels, and manage multi-warehouse stock.", color: "#818cf8" },
    { icon: "👥", title: "Team & Permissions", desc: "Invite staff, assign roles, and control access per branch or module.", color: "#06b6d4" },
  ];
  return (
    <section style={{ padding: "0 clamp(16px,3vw,48px) 80px", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 1100, margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(24px)", transition: "all .6s ease" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
          {cards.map(c => (
            <div key={c.title} style={{ padding: "24px 22px", borderRadius: 16, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", cursor: "default", transition: "all .3s" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.background = `${c.color}08`; el.style.borderColor = `${c.color}25`; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,255,255,.02)"; el.style.borderColor = "rgba(255,255,255,.07)"; }}>
              <div style={{ fontSize: 26, marginBottom: 12 }}>{c.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "white", marginBottom: 8 }}>{c.title}</div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.38)", lineHeight: 1.7 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [open, setOpen] = useState<string | null>(null);
  const [ref, vis] = useInView(0.05);
  return (
    <section style={{ padding: "0 clamp(16px,3vw,48px) 80px", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 860, margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(24px)", transition: "all .6s ease" }}>
        <h2 style={{ fontSize: "clamp(22px,3.5vw,32px)", fontWeight: 900, color: "white", letterSpacing: "-1px", marginBottom: 40, textAlign: "center" }}>Frequently Asked Questions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {faqs.map(cat => (
            <div key={cat.category}>
              <div style={{ fontSize: 11, fontWeight: 700, color: cat.color, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${cat.color}20` }}>
                {cat.category}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {cat.items.map(item => {
                  const key = `${cat.category}-${item.q}`;
                  const isOpen = open === key;
                  return (
                    <div key={item.q} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.06)", background: isOpen ? "rgba(255,255,255,.03)" : "transparent", transition: "all .25s" }}>
                      <button onClick={() => setOpen(isOpen ? null : key)} style={{ width: "100%", padding: "16px 18px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, textAlign: "left" }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,.8)" }}>{item.q}</span>
                        <span style={{ color: cat.color, fontSize: 18, flexShrink: 0, transform: isOpen ? "rotate(45deg)" : "none", transition: "transform .2s" }}>+</span>
                      </button>
                      {isOpen && (
                        <div style={{ padding: "0 18px 16px" }}>
                          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.45)", lineHeight: 1.8, margin: 0 }}>{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactBanner() {
  const [ref, vis] = useInView();
  return (
    <section style={{ padding: "0 clamp(16px,3vw,48px) 120px", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", padding: "52px 40px", borderRadius: 20, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(24px)", transition: "all .6s ease" }}>
        <h2 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, color: "white", margin: "0 0 12px", letterSpacing: "-.5px" }}>Still need help?</h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", margin: "0 0 24px", lineHeight: 1.75 }}>
          Our team responds within one business day. For urgent issues, include &quot;URGENT&quot; in your subject line.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="mailto:hello@finovaforge.com" style={{ padding: "12px 22px", borderRadius: 10, background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "white", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
            hello@finovaforge.com
          </a>
          <Link href="/forge/contact" style={{ padding: "12px 22px", borderRadius: 10, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.8)", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
            Contact Form →
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function SupportPage() {
  return (
    <div style={{ fontFamily: ff, color: "white" }}>
      <style>{`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{background:rgb(7,8,15)}`}</style>
      <ForgeNav />
      <Hero />
      <QuickLinks />
      <FAQSection />
      <ContactBanner />
      <ForgeFooter />
    </div>
  );
}
