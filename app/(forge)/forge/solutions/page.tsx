"use client";
import Link from "next/link";
import { ForgeNav, ForgeFooter, useInView } from "../../components/shared";

const ff = "'Outfit','DM Sans',sans-serif";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", padding: "5px 14px", borderRadius: 100, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", fontSize: 11, fontWeight: 700, color: "#fbbf24", letterSpacing: ".08em", marginBottom: 20 }}>
      {children}
    </div>
  );
}

const solutions = [
  {
    icon: "🔄",
    color: "#818cf8",
    title: "Business Automation",
    problem: "Your team is spending hours on tasks that should take minutes — data entry, approvals, reconciliations, report generation.",
    how: "FinovaOS automates repetitive workflows end-to-end. Purchase approvals route automatically. Bank reconciliations match in seconds. Reports generate themselves.",
    modules: ["Approval Workflows", "Auto Reconciliation", "Scheduled Reports", "Smart Alerts"],
  },
  {
    icon: "📦",
    color: "#34d399",
    title: "Inventory Control",
    problem: "Stock discrepancies, overbuying, stockouts, and no real-time visibility across locations or warehouses.",
    how: "Real-time stock tracking with automated reorder points, multi-warehouse support, and full purchase-to-sale traceability. Know exactly what you have, where, and why.",
    modules: ["Multi-Warehouse", "Reorder Alerts", "GRN Tracking", "Stock Valuation"],
  },
  {
    icon: "🧾",
    color: "#f59e0b",
    title: "Financial Operations",
    problem: "Disconnected accounting, manual bank reconciliation, delayed reporting — you never know your real financial position.",
    how: "A full double-entry accounting engine with real-time P&L, balance sheets, and cash flow statements. Bank reconciliation that matches transactions automatically.",
    modules: ["Double-Entry Ledger", "Bank Reconciliation", "P&L Reports", "Cash Flow"],
  },
  {
    icon: "🏪",
    color: "#f87171",
    title: "Multi-Store Management",
    problem: "Running multiple branches or stores with no unified view — each location is a data silo.",
    how: "One platform for all your locations. Centralized reporting, branch-level permissions, inter-branch transfers, and consolidated financial statements across all stores.",
    modules: ["Branch Isolation", "Consolidated Reports", "Inter-Branch Transfers", "Location Permissions"],
  },
  {
    icon: "🤖",
    color: "#a78bfa",
    title: "AI-Powered Operations",
    problem: "You have data but no intelligence. Decisions are made on gut feel because insights are buried in spreadsheets.",
    how: "AI layers on top of your operational data — demand forecasting, anomaly detection, spend analysis, and natural-language reporting that answers business questions instantly.",
    modules: ["Demand Forecasting", "Anomaly Detection", "Spend Analysis", "NL Reporting"],
  },
  {
    icon: "🔗",
    color: "#06b6d4",
    title: "Workflow Automation",
    problem: "Business processes involve too many manual steps, handoffs, and approvals that slow everything down.",
    how: "Design and automate your exact business workflows — from purchase requisition to payment, from sales order to delivery. Every step tracked, every approval routed.",
    modules: ["Custom Workflows", "Approval Chains", "Notifications", "Audit Trails"],
  },
];

function Hero() {
  return (
    <section style={{ minHeight: "55vh", padding: "clamp(90px,15vw,140px) clamp(16px,3vw,48px) clamp(48px,8vw,80px)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,158,11,.16), transparent)", fontFamily: ff, position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, opacity: .04, backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
      <div style={{ maxWidth: 760, position: "relative", zIndex: 1 }}>
        <Chip>SOLUTIONS</Chip>
        <h1 style={{ fontSize: "clamp(38px,7vw,68px)", fontWeight: 900, color: "white", letterSpacing: "-2.5px", margin: "0 0 20px", lineHeight: 1.08 }}>
          Real problems.
          <br />
          <span style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Real solutions.
          </span>
        </h1>
        <p style={{ fontSize: "clamp(14px,2vw,17px)", color: "rgba(255,255,255,.4)", lineHeight: 1.8, margin: 0 }}>
          Every business has operational pain points. We&apos;ve mapped the most common ones — and built systems that solve them completely.
        </p>
      </div>
    </section>
  );
}

function SolutionGrid() {
  const [ref, vis] = useInView(0.05);
  return (
    <section style={{ padding: "clamp(48px,8vw,80px) clamp(16px,3vw,48px) clamp(72px,12vw,120px)", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 1200, margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(28px)", transition: "all .65s ease" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {solutions.map((s, i) => (
            <div key={i} className="forge-sol-card" style={{ padding: "clamp(24px,4vw,36px) clamp(20px,3vw,32px)", borderRadius: 20, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 32, transition: "all .3s" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.background = `${s.color}06`; el.style.borderColor = `${s.color}20`; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,255,255,.02)"; el.style.borderColor = "rgba(255,255,255,.07)"; }}>
              {/* Left */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 13, background: `${s.color}18`, border: `1px solid ${s.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{s.icon}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: "white", margin: 0, letterSpacing: "-.4px" }}>{s.title}</h3>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>The Problem</div>
                  <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.4)", lineHeight: 1.75, margin: 0 }}>{s.problem}</p>
                </div>
              </div>
              {/* Right */}
              <div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>How We Solve It</div>
                  <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.5)", lineHeight: 1.75, margin: 0 }}>{s.how}</p>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {s.modules.map(m => (
                    <span key={m} style={{ padding: "4px 10px", borderRadius: 7, background: `${s.color}12`, border: `1px solid ${s.color}25`, fontSize: 11, fontWeight: 600, color: s.color }}>{m}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const [ref, vis] = useInView();
  return (
    <section style={{ padding: "0 clamp(16px,3vw,48px) clamp(72px,12vw,120px)", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", padding: "clamp(40px,7vw,64px) clamp(20px,4vw,40px)", borderRadius: 24, background: "linear-gradient(135deg,rgba(245,158,11,.09),rgba(239,68,68,.05))", border: "1px solid rgba(245,158,11,.2)", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(28px)", transition: "all .65s ease" }}>
        <h2 style={{ fontSize: "clamp(24px,4vw,38px)", fontWeight: 900, color: "white", margin: "0 0 14px", letterSpacing: "-1.5px" }}>
          See these solutions in action
        </h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", margin: "0 0 28px", lineHeight: 1.75 }}>FinovaOS brings all of these together in one platform.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="https://finovaos.app" target="_blank" rel="noreferrer" style={{ padding: "13px 28px", borderRadius: 11, background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "white", fontWeight: 700, fontSize: 13, textDecoration: "none", boxShadow: "0 6px 20px rgba(245,158,11,.3)", transition: "all .25s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)")}>
            Open FinovaOS →
          </a>
          <Link href="/forge/contact" style={{ padding: "13px 28px", borderRadius: 11, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.8)", fontWeight: 700, fontSize: 13, textDecoration: "none", transition: "all .25s" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(255,255,255,.1)"; el.style.color = "white"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(255,255,255,.06)"; el.style.color = "rgba(255,255,255,.8)"; }}>
            Talk to Us
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function SolutionsPage() {
  return (
    <div style={{ fontFamily: ff, color: "white" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{background:rgb(7,8,15)}
        @media (max-width: 600px) {
          .forge-sol-card { grid-template-columns: 1fr !important; gap: 20px !important; }
        }
      `}</style>
      <ForgeNav />
      <Hero />
      <SolutionGrid />
      <CTA />
      <ForgeFooter />
    </div>
  );
}
