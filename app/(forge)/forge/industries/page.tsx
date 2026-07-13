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

const industries = [
  {
    icon: "🏪",
    color: "#f59e0b",
    title: "Retail & Multi-Store",
    description: "Manage multiple branches from a single platform. Track inventory per location, consolidate financials, and control staff access by store.",
    painPoints: ["No unified view across branches", "Manual stock reconciliation", "Inconsistent pricing"],
    capabilities: ["Branch-level isolation", "Consolidated P&L", "Centralized inventory", "Role-based access"],
    badge: "Most Popular",
  },
  {
    icon: "🚚",
    color: "#34d399",
    title: "Trading & Distribution",
    description: "End-to-end traceability from purchase order to delivery. Track supplier payments, manage credit limits, and automate reorder cycles.",
    painPoints: ["Supplier payment chaos", "Unclear stock levels", "Manual order tracking"],
    capabilities: ["Purchase order tracking", "Supplier ledgers", "Credit management", "Reorder automation"],
    badge: null,
  },
  {
    icon: "🏭",
    color: "#818cf8",
    title: "Manufacturing",
    description: "Track raw materials, manage bill of materials, and monitor production costs. Know your exact cost of goods sold at all times.",
    painPoints: ["Inaccurate production costs", "Raw material shortages", "No BOM tracking"],
    capabilities: ["Bill of materials", "Raw material tracking", "Production costing", "Waste management"],
    badge: null,
  },
  {
    icon: "🌐",
    color: "#06b6d4",
    title: "Import & Export",
    description: "Manage multi-currency transactions, landed costs, and customs documentation. Track shipments from order to warehouse receipt.",
    painPoints: ["Multi-currency confusion", "Landed cost tracking", "Shipment visibility"],
    capabilities: ["Multi-currency ledger", "Landed cost allocation", "Shipment tracking", "Forex management"],
    badge: null,
  },
  {
    icon: "🏢",
    color: "#f87171",
    title: "Service Businesses",
    description: "Invoice clients, track project costs, manage recurring contracts, and monitor team utilization — all in one place.",
    painPoints: ["Manual client invoicing", "Untracked project costs", "Late payments"],
    capabilities: ["Project-based billing", "Recurring invoices", "Time tracking", "Payment reminders"],
    badge: null,
  },
];

function Hero() {
  return (
    <section style={{ minHeight: "55vh", padding: "clamp(90px,15vw,140px) clamp(16px,3vw,48px) clamp(48px,8vw,80px)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,158,11,.14), transparent)", fontFamily: ff, position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, opacity: .04, backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
      <div style={{ maxWidth: 760, position: "relative", zIndex: 1 }}>
        <Chip>INDUSTRIES</Chip>
        <h1 style={{ fontSize: "clamp(38px,7vw,68px)", fontWeight: 900, color: "white", letterSpacing: "-2.5px", margin: "0 0 20px", lineHeight: 1.08 }}>
          Built for the way
          <br />
          <span style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            you actually work.
          </span>
        </h1>
        <p style={{ fontSize: "clamp(14px,2vw,17px)", color: "rgba(255,255,255,.4)", lineHeight: 1.8, margin: 0 }}>
          FinovaOS adapts to your industry — not the other way around. Here&apos;s how different business types use it.
        </p>
      </div>
    </section>
  );
}

function IndustryGrid() {
  const [ref, vis] = useInView(0.05);
  return (
    <section style={{ padding: "clamp(24px,5vw,40px) clamp(16px,3vw,48px) clamp(72px,12vw,120px)", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 1200, margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(28px)", transition: "all .65s ease" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {industries.map((ind, i) => (
            <div key={i} className="forge-industry-card"
              style={{ padding: "36px 32px", borderRadius: 20, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 32, transition: "all .3s", position: "relative" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.background = `${ind.color}06`; el.style.borderColor = `${ind.color}20`; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,255,255,.02)"; el.style.borderColor = "rgba(255,255,255,.07)"; }}>
              {ind.badge && (
                <div style={{ position: "absolute", top: 20, right: 24, padding: "3px 10px", borderRadius: 100, background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.3)", fontSize: 10, fontWeight: 700, color: "#f59e0b", letterSpacing: ".08em" }}>
                  {ind.badge}
                </div>
              )}
              {/* Left: Identity + pain points */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 13, background: `${ind.color}18`, border: `1px solid ${ind.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{ind.icon}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: "white", margin: 0, letterSpacing: "-.4px" }}>{ind.title}</h3>
                </div>
                <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.42)", lineHeight: 1.75, margin: "0 0 20px" }}>{ind.description}</p>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Common Pain Points</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {ind.painPoints.map(p => (
                      <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "rgba(255,255,255,.35)" }}>
                        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#f87171", flexShrink: 0 }} />
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Right: capabilities */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: ind.color, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 14 }}>What FinovaOS Handles</div>
                <div className="forge-caps-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {ind.capabilities.map(cap => (
                    <div key={cap} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 18, height: 18, borderRadius: 5, background: `${ind.color}18`, border: `1px solid ${ind.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, flexShrink: 0 }}>✓</div>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)", fontWeight: 500 }}>{cap}</span>
                    </div>
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

function NotListed() {
  const [ref, vis] = useInView();
  return (
    <section style={{ padding: "0 clamp(16px,3vw,48px) clamp(48px,8vw,80px)", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", padding: "clamp(36px,6vw,52px) clamp(20px,4vw,40px)", borderRadius: 20, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(24px)", transition: "all .6s ease" }}>
        <div style={{ fontSize: 36, marginBottom: 14 }}>🤔</div>
        <h2 style={{ fontSize: "clamp(20px,3vw,26px)", fontWeight: 800, color: "white", margin: "0 0 12px", letterSpacing: "-.5px" }}>Your industry not listed?</h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", margin: "0 0 24px", lineHeight: 1.75, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
          FinovaOS is built to be flexible. If your business has unique operational needs, talk to us — we likely support it or can configure it.
        </p>
        <Link href="/forge/contact" style={{ display: "inline-block", padding: "12px 24px", borderRadius: 10, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.8)", fontWeight: 700, fontSize: 13, textDecoration: "none", transition: "all .25s" }}
          onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(255,255,255,.1)"; el.style.color = "white"; }}
          onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(255,255,255,.06)"; el.style.color = "rgba(255,255,255,.8)"; }}>
          Talk to Us →
        </Link>
      </div>
    </section>
  );
}

function CTA() {
  const [ref, vis] = useInView();
  return (
    <section style={{ padding: "0 clamp(16px,3vw,48px) 120px", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", padding: "64px 40px", borderRadius: 24, background: "linear-gradient(135deg,rgba(245,158,11,.09),rgba(239,68,68,.05))", border: "1px solid rgba(245,158,11,.2)", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(28px)", transition: "all .65s ease" }}>
        <h2 style={{ fontSize: "clamp(24px,4vw,38px)", fontWeight: 900, color: "white", margin: "0 0 14px", letterSpacing: "-1.5px" }}>
          Ready to see it in action?
        </h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", margin: "0 0 28px", lineHeight: 1.75 }}>FinovaOS is live and running for businesses across these industries.</p>
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

export default function IndustriesPage() {
  return (
    <div style={{ fontFamily: ff, color: "white" }}>
      <style>{`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{background:rgb(7,8,15)}`}</style>
      <ForgeNav />
      <Hero />
      <IndustryGrid />
      <NotListed />
      <CTA />
      <ForgeFooter />
    </div>
  );
}
