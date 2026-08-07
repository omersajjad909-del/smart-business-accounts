"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const F = "'Outfit','Inter',sans-serif";

// ─── ROI Calculator data ──────────────────────────────────────────────────────
function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, vis] as const;
}

// ─── Features — operational business-process automation only. No marketing,
// no customer outreach/campaigns, no lead capture or social posting. ─────────
const FEATURES = [
  {
    icon: "🔔",
    title: "Overdue Invoice Reminders",
    color: "#22c55e",
    glow: "rgba(34,197,94,.15)",
    border: "rgba(34,197,94,.25)",
    tagline: "Never chase a late payment by hand again",
    description: "FinovaOS automatically scans your sales invoices for overdue due dates and gives you a ready-to-send reminder queue. Review the list, send with one click — no spreadsheets, no manual follow-up tracking.",
    bullets: [
      "Auto-detected from your invoice due dates",
      "One-click reminder email to the customer on file",
      "Aging view: how many days overdue, per invoice",
      "You stay in control — nothing sends without your review",
      "Full send history logged in your dashboard",
    ],
    roi: "Businesses that follow up on overdue invoices within a week recover payment far more often than those who wait a month.",
    value: "Cuts the hours your team spends manually tracking who owes what",
  },
  {
    icon: "📦",
    title: "Low Stock Reorder Alerts",
    color: "#38bdf8",
    glow: "rgba(56,189,248,.15)",
    border: "rgba(56,189,248,.25)",
    tagline: "Know the moment stock runs low — not after it's gone",
    description: "Set a reorder threshold per item once. FinovaOS watches your live inventory and flags anything that drops below it, so you reorder before you're out — not after a customer asks for something you don't have.",
    bullets: [
      "Per-item reorder threshold, set once",
      "Live dashboard list of everything below threshold",
      "Email alert when an item crosses the line",
      "Works across every warehouse/branch you track",
      "No manual stock-count spreadsheets needed",
    ],
    roi: "Stockouts cost sales on the spot. Reorder alerts catch the gap before a customer ever notices.",
    value: "Replaces manual stock-count checklists and spreadsheet trackers",
  },
  {
    icon: "📊",
    title: "Scheduled Financial Reports",
    color: "#a78bfa",
    glow: "rgba(167,139,250,.15)",
    border: "rgba(167,139,250,.25)",
    tagline: "Your P&L in your inbox — without asking anyone",
    description: "Pick the reports you want (P&L, Balance Sheet, Trial Balance, Cash Flow), pick who should get them, pick the schedule. FinovaOS generates and delivers them automatically — every week, every month, on autopilot.",
    bullets: [
      "P&L, Balance Sheet, Trial Balance, Cash Flow",
      "Weekly or monthly delivery",
      "Send to owner, accountant, or any recipient list",
      "Same report data as your live Reports section",
      "Pause or change the schedule anytime",
    ],
    roi: "No more asking your accountant for numbers or manually exporting reports every month.",
    value: "Keeps leadership informed without anyone having to remember to run a report",
  },
  {
    icon: "✅",
    title: "Approval Workflow Automation",
    color: "#fb923c",
    glow: "rgba(251,146,60,.15)",
    border: "rgba(251,146,60,.25)",
    tagline: "Spending controls that enforce themselves",
    description: "Set a threshold — any Purchase Order or expense voucher above it automatically routes for manager approval before it goes through. No more surprise spending, no more chasing sign-offs over WhatsApp.",
    bullets: [
      "Set your own approval threshold per document type",
      "Purchase Orders and expense vouchers covered",
      "Automatic routing — no manual escalation needed",
      "Full approval trail for audits",
      "Approve or reject right from your dashboard",
    ],
    roi: "Uncontrolled spending is one of the most common ways SMEs lose money silently. Threshold-based approval closes that gap.",
    value: "Replaces informal 'ask before you spend' policies nobody actually follows",
  },
  {
    icon: "🗄️",
    title: "Automated Backups",
    color: "#f472b6",
    glow: "rgba(244,114,182,.15)",
    border: "rgba(244,114,182,.25)",
    tagline: "Your business data, backed up without thinking about it",
    description: "Set a backup schedule once — daily or weekly — and FinovaOS takes care of the rest. Your company's financial and operational data is automatically snapshotted, so a mistake or outage never means starting over.",
    bullets: [
      "Daily or weekly automatic backups",
      "No manual export-and-save routine",
      "Restore points available from your dashboard",
      "Runs quietly in the background",
      "One less thing your team has to remember",
    ],
    roi: "Data loss from a single mistake can cost days of rework. Automated backups make that risk disappear.",
    value: "Peace of mind that doesn't depend on someone remembering to do it",
  },
  {
    icon: "🔗",
    title: "Zapier / Make Webhooks",
    color: "#34d399",
    glow: "rgba(52,211,153,.15)",
    border: "rgba(52,211,153,.25)",
    tagline: "Connect FinovaOS to 5,000+ business apps — no code needed",
    description: "Send data OUT to Zapier, Make, or n8n when business events happen in FinovaOS — an invoice gets paid, stock crosses a threshold, a PO is approved. Receive data IN from any app via secure inbound webhook tokens. Build cross-tool automations without writing code.",
    bullets: [
      "Outbound: trigger Zapier/Make on any FinovaOS event",
      "Inbound: receive data from any connected app",
      "HMAC-SHA256 signed for security",
      "Connect Google Forms, Sheets, ERPs & more",
      "Build multi-step business workflows across tools",
    ],
    roi: "Manual data re-entry between business tools costs staff hours every week. Webhooks eliminate it entirely.",
    value: "Ties FinovaOS into whatever else runs your business",
  },
  {
    icon: "📈",
    title: "Google Sheets Sync",
    color: "#fbbf24",
    glow: "rgba(251,191,36,.15)",
    border: "rgba(251,191,36,.25)",
    tagline: "Your operational data in Google Sheets — always current",
    description: "Connect a Google Spreadsheet and sync your FinovaOS business data with one click — invoices, inventory, ledger entries. Always up to date, ready to share with your accountant, partners, or investors.",
    bullets: [
      "One-click sync of invoices, inventory & ledger data",
      "Custom column mapping",
      "Works with a Google Service Account (no login sharing needed)",
      "Auto-append — never overwrites existing data",
      "Share instantly with your team or stakeholders",
    ],
    roi: "Finance teams spend hours a week manually copying numbers into spreadsheets for outside review.",
    value: "Keeps everyone working from the same live numbers",
  },
];

const COMPARE_TOOLS = [
  { tool: "Invoice reminder / AR automation tools", price: "$20–60/mo" },
  { tool: "Inventory reorder alert add-ons", price: "$15–49/mo" },
  { tool: "Scheduled reporting tools", price: "$29–99/mo" },
  { tool: "Approval workflow software", price: "$25–79/mo" },
  { tool: "Automated backup services", price: "$10–39/mo" },
  { tool: "Zapier Pro", price: "$49–799/mo" },
  { tool: "Sheet-sync tools (Coupler.io)", price: "$19–49/mo" },
];

const FAQS = [
  { q: "Can I buy only the Automation add-on without a main plan?", a: "The Automation add-on is available with any active FinovaOS plan: Starter, Professional, or Enterprise. You need an active base plan first." },
  { q: "Is anything sent automatically without my approval?", a: "Overdue invoice reminders are queued for your review — you send them with one click, nothing goes out on its own. Scheduled reports and low-stock/backup alerts run on the schedule you set, and you can pause or change it anytime." },
  { q: "Does this include any marketing or customer outreach tools?", a: "No. This add-on is purely internal business-process automation — invoice reminders, stock alerts, reporting, approvals, backups, and data integrations. It does not include email/SMS marketing campaigns, social media posting, or lead-generation tools." },
  { q: "What is required to set up the approval workflow?", a: "Just set your approval threshold amount in the dashboard — no external accounts or integrations needed. It works immediately for Purchase Orders and expense vouchers." },
  { q: "Can I connect this to tools outside FinovaOS?", a: "Yes — via the Zapier/Make webhooks and Google Sheets sync, you can connect FinovaOS events and data to thousands of other business apps." },
  { q: "Is a demo available?", a: "Yes — reach out via live chat or the contact form and we'll walk you through the add-on for your business." },
];

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function AutomationLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [heroRef, heroVis] = useInView();

  return (
    <div style={{ fontFamily: F, background: "#050812", color: "#e2e8f0", overflowX: "hidden" }}>

      {/* ── HERO ── */}
      <div ref={heroRef} style={{
        minHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "80px 24px 60px",
        background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,58,237,.18) 0%, transparent 70%)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Grid bg */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)", backgroundSize: "50px 50px", zIndex: 0 }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 820 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(124,58,237,.15)", border: "1px solid rgba(124,58,237,.3)", borderRadius: 100, padding: "6px 16px", fontSize: 13, color: "#a78bfa", marginBottom: 28, fontWeight: 600 }}>
            ⚡ Add-On · $79/month · Works with any plan
          </div>

          <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)", fontWeight: 900, margin: "0 0 20px", lineHeight: 1.15 }}>
            <span style={{ background: "linear-gradient(135deg,#a78bfa,#38bdf8,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Business Automation
            </span>
            <br />
            <span style={{ color: "#fff" }}>that runs your operations</span>
          </h1>

          <p style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)", color: "rgba(255,255,255,.6)", maxWidth: 620, margin: "0 auto 36px", lineHeight: 1.7 }}>
            Overdue invoice reminders, low-stock alerts, scheduled reports, approval workflows, automated backups, and business-app integrations — all for <strong style={{ color: "#fff" }}>$79/month</strong>.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/get-started" style={{
              padding: "14px 32px", borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#2563eb)",
              color: "#fff", textDecoration: "none", fontSize: 15, fontWeight: 700,
              boxShadow: "0 0 30px rgba(124,58,237,.4)",
            }}>
              Get Started →
            </Link>
            <Link href="/pricing" style={{
              padding: "14px 28px", borderRadius: 12, border: "1px solid rgba(255,255,255,.15)",
              color: "rgba(255,255,255,.8)", textDecoration: "none", fontSize: 15, fontWeight: 600,
              background: "rgba(255,255,255,.04)",
            }}>
              View All Plans
            </Link>
          </div>

          {/* Mini feature pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 40 }}>
            {["🔔 Invoice Reminders", "📦 Low Stock Alerts", "📊 Scheduled Reports", "✅ Approval Workflows", "🗄️ Auto Backups", "🔗 Webhooks", "📈 Sheets Sync"].map(f => (
              <span key={f} style={{ padding: "5px 14px", borderRadius: 100, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", fontSize: 13, color: "rgba(255,255,255,.65)" }}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── VS COMPETITORS ── */}
      <div style={{ padding: "80px 24px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, margin: "0 0 12px" }}>
            Buying all these tools separately costs much more
          </h2>
          <p style={{ color: "rgba(255,255,255,.5)", fontSize: 15 }}>
            You would pay <strong style={{ color: "#f87171" }}>$150-$1,100/month</strong> for equivalent tools combined -<br />
            or just <strong style={{ color: "#34d399" }}>$79/month</strong> with FinovaOS Automation.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {COMPARE_TOOLS.map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderRadius: 12, background: "rgba(248,113,113,.06)", border: "1px solid rgba(248,113,113,.15)" }}>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,.65)" }}>{t.tool}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#f87171", whiteSpace: "nowrap" }}>{t.price}</span>
            </div>
          ))}
        </div>

        {/* Arrow */}
        <div style={{ textAlign: "center", margin: "30px 0 20px", fontSize: 28 }}>↓</div>

        <div style={{ padding: "24px 32px", borderRadius: 16, background: "linear-gradient(135deg,rgba(34,197,94,.1),rgba(52,211,153,.05))", border: "2px solid rgba(34,197,94,.3)", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 600, marginBottom: 8 }}>FinovaOS Automation Add-On</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#34d399" }}>$79 <span style={{ fontSize: "1rem", color: "rgba(255,255,255,.5)", fontWeight: 400 }}>/month</span></div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginTop: 4 }}>All 7 features. One price. Cancel anytime.</div>
        </div>
      </div>

      {/* ── FEATURES DEEP DIVE ── */}
      <div style={{ padding: "20px 24px 80px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, margin: "0 0 12px" }}>
            Detailed breakdown of every feature
          </h2>
          <p style={{ color: "rgba(255,255,255,.5)", fontSize: 15 }}>So you can confidently evaluate how much value this add-on delivers.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {FEATURES.map((f, i) => (
            <FeatureCard key={i} feature={f} index={i} />
          ))}
        </div>
      </div>

      {/* ── WHAT'S INCLUDED ── */}
      <div style={{ padding: "80px 24px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, margin: "0 0 10px" }}>
            What is included in $79/month
          </h2>
          <p style={{ color: "rgba(255,255,255,.5)", fontSize: 15 }}>No hidden fees. No per-action charges. One flat rate.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            { icon: "🔔", text: "Overdue invoice reminder queue — unlimited" },
            { icon: "📦", text: "Low stock alerts — unlimited items & branches" },
            { icon: "📊", text: "Scheduled reports — unlimited recipients" },
            { icon: "✅", text: "Approval workflows — POs & expense vouchers" },
            { icon: "🗄️", text: "Automated backups — daily or weekly" },
            { icon: "🔗", text: "Webhooks — unlimited outbound & inbound tokens" },
            { icon: "📈", text: "Google Sheets sync — unlimited syncs" },
            { icon: "🔒", text: "HMAC-signed webhooks for security" },
            { icon: "📞", text: "Priority support for add-on issues" },
            { icon: "🔄", text: "Cancel anytime, no lock-in" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,.75)", lineHeight: 1.5 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQs ── */}
      <div style={{ padding: "20px 24px 80px", maxWidth: 700, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(1.4rem, 2.5vw, 2rem)", fontWeight: 800, marginBottom: 36 }}>Frequently Asked Questions</h2>
        {FAQS.map((faq, i) => (
          <div key={i} style={{ marginBottom: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", overflow: "hidden" }}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
              width: "100%", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
              background: openFaq === i ? "rgba(124,58,237,.1)" : "rgba(255,255,255,.03)",
              border: "none", cursor: "pointer", color: "#e2e8f0", fontSize: 14, fontWeight: 600, fontFamily: F, textAlign: "left",
            }}>
              {faq.q}
              <span style={{ fontSize: 18, color: "rgba(255,255,255,.4)", flexShrink: 0, marginLeft: 16 }}>{openFaq === i ? "−" : "+"}</span>
            </button>
            {openFaq === i && (
              <div style={{ padding: "14px 20px 18px", fontSize: 14, color: "rgba(255,255,255,.6)", lineHeight: 1.7, background: "rgba(124,58,237,.06)" }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── CTA ── */}
      <div style={{ padding: "80px 24px", textAlign: "center", background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(124,58,237,.2) 0%, transparent 70%)" }}>
        <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: 900, margin: "0 0 16px" }}>
          Ready to run your business on autopilot?
        </h2>
        <p style={{ color: "rgba(255,255,255,.5)", fontSize: 16, marginBottom: 36 }}>
          No hidden fees. Cancel anytime. Full access to all automation features.
        </p>
        <Link href="/get-started" style={{
          display: "inline-block", padding: "16px 40px", borderRadius: 14,
          background: "linear-gradient(135deg,#7c3aed,#2563eb)", color: "#fff",
          textDecoration: "none", fontSize: 16, fontWeight: 700,
          boxShadow: "0 0 40px rgba(124,58,237,.4)",
        }}>
          Add to My Plan — $79/month
        </Link>
        <div style={{ marginTop: 20, fontSize: 13, color: "rgba(255,255,255,.35)" }}>
          Requires an active FinovaOS plan · Works with Starter, Professional, and Enterprise
        </div>
      </div>

    </div>
  );
}

// ─── Feature Card Component ───────────────────────────────────────────────────
function FeatureCard({ feature: f, index }: { feature: typeof FEATURES[0]; index: number }) {
  const [ref, vis] = useInView();
  const isEven = index % 2 === 0;

  return (
    <div ref={ref} style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0,
      borderRadius: 20, overflow: "hidden",
      border: `1px solid ${f.border}`,
      background: "rgba(255,255,255,.02)",
      opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(20px)",
      transition: "opacity .5s, transform .5s",
    }}>
      {/* Left: Info */}
      <div style={{ padding: "36px 36px", order: isEven ? 0 : 1 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>{f.icon}</div>
        <h3 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px", color: f.color }}>{f.title}</h3>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", margin: "0 0 16px", fontStyle: "italic" }}>{f.tagline}</p>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.65)", lineHeight: 1.7, margin: "0 0 20px" }}>{f.description}</p>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {f.bullets.map((b, i) => (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "rgba(255,255,255,.7)" }}>
              <span style={{ color: f.color, flexShrink: 0, marginTop: 1 }}>✓</span> {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Right: ROI box */}
      <div style={{ padding: "36px 32px", background: `${f.glow}`, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20, order: isEven ? 1 : 0 }}>
        <div style={{ padding: "20px", borderRadius: 14, background: "rgba(0,0,0,.3)", border: `1px solid ${f.border}` }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Why it pays for itself</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)", lineHeight: 1.6 }}>{f.roi}</div>
        </div>
        <div style={{ padding: "20px", borderRadius: 14, background: "rgba(0,0,0,.3)", border: `1px solid ${f.border}` }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>What it replaces</div>
          <div style={{ fontSize: 13, color: f.color, fontWeight: 600, lineHeight: 1.6 }}>{f.value}</div>
        </div>
      </div>
    </div>
  );
}
