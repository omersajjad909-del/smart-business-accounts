"use client";
import Link from "next/link";
import { ForgeNav, ForgeFooter, useInView } from "../../components/shared";

const ff = "'Outfit','DM Sans',sans-serif";

/* ── CHIP ── */
function Chip({ children, color = "#fbbf24", bg = "rgba(245,158,11,.08)", border = "rgba(245,158,11,.2)" }: {
  children: React.ReactNode; color?: string; bg?: string; border?: string;
}) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", padding: "5px 14px", borderRadius: 100, background: bg, border: `1px solid ${border}`, fontSize: 11, fontWeight: 700, color, letterSpacing: ".08em", marginBottom: 20 }}>
      {children}
    </div>
  );
}

/* ── BADGE ── */
function Badge({ label, type }: { label: string; type: "live" | "dev" | "planned" }) {
  const styles = {
    live: { bg: "rgba(34,197,94,.12)", border: "rgba(34,197,94,.25)", color: "#4ade80" },
    dev: { bg: "rgba(99,102,241,.12)", border: "rgba(99,102,241,.25)", color: "#818cf8" },
    planned: { bg: "rgba(255,255,255,.06)", border: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.35)" },
  };
  const s = styles[type];
  return (
    <div style={{ position: "absolute", top: 16, right: 16, padding: "3px 10px", borderRadius: 8, background: s.bg, border: `1px solid ${s.border}`, fontSize: 10, fontWeight: 700, color: s.color, letterSpacing: ".04em" }}>
      {label}
    </div>
  );
}

/* ── 1. HERO ── */
function Hero() {
  return (
    <section style={{
      minHeight: "100vh", padding: "clamp(90px,15vw,140px) clamp(16px,3vw,48px) clamp(56px,10vw,100px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      textAlign: "center", position: "relative", fontFamily: ff,
      background: `
        radial-gradient(ellipse 80% 50% at 50% -5%, rgba(245,158,11,.18), transparent),
        radial-gradient(ellipse 50% 70% at 80% 60%, rgba(239,68,68,.07), transparent)
      `
    }}>
      {/* Grid pattern */}
      <div style={{ position: "absolute", inset: 0, opacity: .04, backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />

      <div style={{ maxWidth: 900, position: "relative", zIndex: 1 }}>
        <Chip>AI-DRIVEN SOFTWARE COMPANY</Chip>

        <h1 style={{ fontSize: "clamp(42px,8vw,84px)", fontWeight: 900, color: "white", letterSpacing: "-3px", margin: "0 0 28px", lineHeight: 1.02 }}>
          Building intelligent systems
          <br />
          <span style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            for modern businesses
          </span>
        </h1>

        <p style={{ fontSize: "clamp(15px,2vw,19px)", color: "rgba(255,255,255,.45)", margin: "0 auto 48px", lineHeight: 1.8, maxWidth: 660 }}>
          Finova Forge develops AI-powered business platforms, automation systems,
          and scalable digital infrastructure for modern operations.
        </p>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/products"
            style={{ padding: "15px 34px", borderRadius: 12, background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "white", fontWeight: 700, fontSize: 14, textDecoration: "none", boxShadow: "0 8px 28px rgba(245,158,11,.3)", transition: "all .25s", letterSpacing: ".02em" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 14px 40px rgba(245,158,11,.45)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(0)"; el.style.boxShadow = "0 8px 28px rgba(245,158,11,.3)"; }}>
            Explore Products →
          </Link>
          <Link href="/contact"
            style={{ padding: "15px 34px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.8)", fontWeight: 700, fontSize: 14, textDecoration: "none", transition: "all .25s" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(245,158,11,.08)"; el.style.borderColor = "rgba(245,158,11,.25)"; el.style.color = "white"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(255,255,255,.04)"; el.style.borderColor = "rgba(255,255,255,.12)"; el.style.color = "rgba(255,255,255,.8)"; }}>
            Contact Us
          </Link>
        </div>

        {/* Stats */}
        <div className="forge-hero-stats" style={{ marginTop: "clamp(48px,8vw,80px)", display: "flex", gap: "clamp(24px,5vw,56px)", justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { v: "2024", l: "Founded" },
            { v: "40+", l: "Countries" },
            { v: "1", l: "Live Product" },
            { v: "∞", l: "Ambition" },
          ].map(s => (
            <div key={s.l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 900, color: "white", letterSpacing: "-1px" }}>{s.v}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", fontWeight: 600, letterSpacing: ".06em", marginTop: 6, textTransform: "uppercase" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 2. COMPANY INTRO ── */
function CompanyIntro() {
  const [ref, vis] = useInView();
  return (
    <section style={{ padding: "clamp(64px,10vw,100px) clamp(16px,3vw,48px)", background: "rgba(255,255,255,.015)", borderTop: "1px solid rgba(255,255,255,.05)", fontFamily: ff }}>
      <div ref={ref} className="forge-intro-grid" style={{
        maxWidth: 1200, margin: "0 auto",
        display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "clamp(32px,5vw,64px)", alignItems: "center",
        opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(28px)", transition: "all .65s ease"
      }}>
        <div>
          <Chip>WHO WE ARE</Chip>
          <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, color: "white", letterSpacing: "-1.5px", margin: "0 0 20px", lineHeight: 1.1 }}>
            We don&apos;t just build software.<br />We build operations.
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.45)", lineHeight: 1.85, margin: "0 0 18px" }}>
            Finova Forge is a software company focused on building intelligent, modular systems
            that replace fragmented tools and manual processes for growing businesses.
          </p>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.45)", lineHeight: 1.85, margin: "0 0 32px" }}>
            Our flagship product, FinovaOS, is a full ERP platform — and it&apos;s just the beginning.
            We&apos;re building an ecosystem of AI-powered business tools designed to scale with you.
          </p>
          <Link href="/about"
            style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.4)", textDecoration: "none", transition: "color .2s", letterSpacing: ".02em" }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = "white")}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,.4)")}>
            Our full story →
          </Link>
        </div>

        <div className="forge-intro-cards" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { icon: "🏗️", title: "We Build", body: "SaaS platforms, ERP systems, AI tools, and business automation infrastructure." },
            { icon: "🎯", title: "We Focus", body: "Industry-specific solutions, not generic tools. Built for how your business actually works." },
            { icon: "🤖", title: "We Automate", body: "AI-driven workflows that replace manual, repetitive processes across your operations." },
            { icon: "🌍", title: "We Scale", body: "Systems designed for global operations — multi-currency, multi-branch, multi-company." },
          ].map((c, i) => (
            <div key={i}
              style={{ padding: "24px 20px", borderRadius: 16, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", transition: "all .3s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(245,158,11,.04)"; el.style.borderColor = "rgba(245,158,11,.18)"; el.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,255,255,.025)"; el.style.borderColor = "rgba(255,255,255,.07)"; el.style.transform = "translateY(0)"; }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{c.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "white", marginBottom: 6 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", lineHeight: 1.7 }}>{c.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 3. PRODUCTS ── */
function Products() {
  const [ref, vis] = useInView();
  return (
    <section style={{ padding: "clamp(64px,10vw,100px) clamp(16px,3vw,48px)", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 1200, margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(28px)", transition: "all .65s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <Chip>OUR PRODUCTS</Chip>
          <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, color: "white", letterSpacing: "-1.5px", margin: "0 0 12px" }}>
            What we&apos;ve built — and what&apos;s coming
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.35)", maxWidth: 500, margin: "0 auto" }}>
            Each product targets a specific gap in how modern businesses operate.
          </p>
        </div>

        <div className="forge-products-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>

          {/* FinovaOS — LIVE */}
          <div style={{ padding: "36px 32px", borderRadius: 22, background: "linear-gradient(145deg,rgba(245,158,11,.08),rgba(239,68,68,.04))", border: "1px solid rgba(245,158,11,.22)", position: "relative" }}>
            <Badge label="LIVE" type="live" />
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#f59e0b,#ef4444)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "white", marginBottom: 20, boxShadow: "0 6px 20px rgba(245,158,11,.3)" }}>OS</div>
            <h3 style={{ fontSize: 22, fontWeight: 900, color: "white", margin: "0 0 4px", letterSpacing: "-.5px" }}>FinovaOS</h3>
            <p style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700, margin: "0 0 16px", letterSpacing: ".04em", textTransform: "uppercase" }}>AI-Powered ERP Platform</p>
            <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.5)", lineHeight: 1.8, margin: "0 0 24px" }}>
              A modular, full-stack ERP system covering accounting, inventory, payroll, invoicing,
              HR, CRM, and more. Built for industry-specific workflows — from retail to manufacturing.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
              {["Accounting", "Inventory", "Invoicing", "Payroll", "CRM", "Reports"].map(t => (
                <span key={t} style={{ padding: "4px 10px", borderRadius: 7, background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.2)", fontSize: 11, fontWeight: 600, color: "rgba(245,158,11,.8)" }}>{t}</span>
              ))}
            </div>
            <a href="https://finovaos.app" target="_blank" rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 24px", borderRadius: 10, background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "white", fontWeight: 700, fontSize: 13, textDecoration: "none", boxShadow: "0 4px 16px rgba(245,158,11,.3)", transition: "all .2s" }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)")}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)")}>
              Open FinovaOS →
            </a>
          </div>

          {/* FinovaAI — In Development */}
          <div style={{ padding: "36px 32px", borderRadius: 22, background: "rgba(255,255,255,.02)", border: "1px dashed rgba(255,255,255,.09)", position: "relative", transition: "all .3s" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,255,255,.04)"; el.style.borderColor = "rgba(255,255,255,.14)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,255,255,.02)"; el.style.borderColor = "rgba(255,255,255,.09)"; }}>
            <Badge label="IN DEVELOPMENT" type="dev" />
            <div style={{ fontSize: 44, marginBottom: 20, opacity: .5 }}>🤖</div>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: "rgba(255,255,255,.5)", margin: "0 0 4px", letterSpacing: "-.4px" }}>FinovaAI</h3>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.25)", fontWeight: 700, margin: "0 0 16px", letterSpacing: ".04em", textTransform: "uppercase" }}>Business Intelligence Layer</p>
            <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.28)", lineHeight: 1.8, margin: 0 }}>
              AI-powered analytics, demand forecasting, anomaly detection, and natural-language
              reporting across all your business data.
            </p>
          </div>

          {/* FinovaPOS — Planned */}
          <div style={{ padding: "36px 32px", borderRadius: 22, background: "rgba(255,255,255,.02)", border: "1px dashed rgba(255,255,255,.09)", position: "relative", transition: "all .3s" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,255,255,.04)"; el.style.borderColor = "rgba(255,255,255,.14)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,255,255,.02)"; el.style.borderColor = "rgba(255,255,255,.09)"; }}>
            <Badge label="PLANNED" type="planned" />
            <div style={{ fontSize: 44, marginBottom: 20, opacity: .5 }}>🖥️</div>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: "rgba(255,255,255,.5)", margin: "0 0 4px", letterSpacing: "-.4px" }}>FinovaPOS</h3>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.25)", fontWeight: 700, margin: "0 0 16px", letterSpacing: ".04em", textTransform: "uppercase" }}>Point of Sale System</p>
            <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.28)", lineHeight: 1.8, margin: 0 }}>
              A standalone POS built for retail, F&B, and multi-branch operations — integrated
              directly with FinovaOS inventory and accounting.
            </p>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 28 }}>
          <Link href="/products"
            style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.3)", textDecoration: "none", transition: "color .2s" }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,.7)")}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,.3)")}>
            View full product roadmap →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── 4. SERVICES ── */
function Services() {
  const [ref, vis] = useInView();
  const services = [
    { icon: "🏗️", title: "ERP & Business Software", color: "#f59e0b", desc: "End-to-end ERP systems covering accounting, inventory, HR, invoicing, and operations. Industry-specific, not generic." },
    { icon: "🤖", title: "AI Automation", color: "#818cf8", desc: "Intelligent workflows that automate repetitive tasks — from purchase approvals to financial reconciliation to demand forecasting." },
    { icon: "☁️", title: "SaaS Development", color: "#34d399", desc: "Scalable, multi-tenant SaaS platforms from architecture to deployment — with real-time data, role-based access, and API-first design." },
    { icon: "🔧", title: "Business Infrastructure", color: "#f87171", desc: "Cloud infrastructure, data pipelines, monitoring, and security systems that form the backbone of modern business operations." },
  ];
  return (
    <section style={{ padding: "clamp(64px,10vw,100px) clamp(16px,3vw,48px)", background: "rgba(255,255,255,.015)", borderTop: "1px solid rgba(255,255,255,.05)", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 1200, margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(28px)", transition: "all .65s ease" }}>
        <div style={{ marginBottom: 56 }}>
          <Chip>WHAT WE BUILD</Chip>
          <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, color: "white", letterSpacing: "-1.5px", margin: 0, maxWidth: 500 }}>
            Our capabilities
          </h2>
        </div>
        <div className="forge-services-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20 }}>
          {services.map((s, i) => (
            <div key={i}
              style={{ padding: "32px 28px", borderRadius: 20, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", transition: "all .3s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = `${s.color}0a`; el.style.borderColor = `${s.color}30`; el.style.transform = "translateY(-4px)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,255,255,.025)"; el.style.borderColor = "rgba(255,255,255,.07)"; el.style.transform = "translateY(0)"; }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>{s.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "white", margin: "0 0 12px" }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0, lineHeight: 1.8 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 5. TECH STACK ── */
function TechStack() {
  const [ref, vis] = useInView();
  const stack = [
    { label: "Next.js", cat: "Frontend", color: "rgba(255,255,255,.8)" },
    { label: "Node.js", cat: "Backend", color: "#68a063" },
    { label: "PostgreSQL", cat: "Database", color: "#336791" },
    { label: "Supabase", cat: "Platform", color: "#3ecf8e" },
    { label: "FinovaOS AI", cat: "AI", color: "#a78bfa" },
    { label: "Vercel", cat: "Cloud", color: "rgba(255,255,255,.7)" },
    { label: "TypeScript", cat: "Language", color: "#3178c6" },
    { label: "AES-256", cat: "Security", color: "#f87171" },
  ];
  return (
    <section style={{ padding: "clamp(64px,10vw,100px) clamp(16px,3vw,48px)", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 1200, margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(28px)", transition: "all .65s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <Chip>TECHNOLOGY</Chip>
          <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, color: "white", letterSpacing: "-1.5px", margin: "0 0 12px" }}>
            Built on solid foundations
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.35)", maxWidth: 460, margin: "0 auto" }}>
            Modern, proven technologies — chosen for reliability, scalability, and developer velocity.
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          {stack.map((t, i) => (
            <div key={i}
              style={{ padding: "14px 22px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 110, transition: "all .25s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,255,255,.07)"; el.style.borderColor = "rgba(255,255,255,.16)"; el.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,255,255,.03)"; el.style.borderColor = "rgba(255,255,255,.08)"; el.style.transform = "translateY(0)"; }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: t.color }}>{t.label}</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,.25)", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>{t.cat}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, padding: "clamp(20px,3vw,28px) clamp(20px,3vw,32px)", borderRadius: 16, background: "rgba(245,158,11,.04)", border: "1px solid rgba(245,158,11,.12)", display: "flex", gap: "clamp(16px,3vw,32px)", flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { icon: "⚡", label: "Realtime data sync" },
            { icon: "🔐", label: "End-to-end encryption" },
            { icon: "🌍", label: "Multi-region ready" },
            { icon: "📈", label: "Scales to millions of records" },
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,.45)", fontWeight: 600 }}>
              <span style={{ fontSize: 16 }}>{f.icon}</span>{f.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 6. VISION ── */
function Vision() {
  const [ref, vis] = useInView();
  return (
    <section style={{ padding: "clamp(64px,10vw,100px) clamp(16px,3vw,48px)", background: "rgba(255,255,255,.015)", borderTop: "1px solid rgba(255,255,255,.05)", fontFamily: ff }}>
      <div ref={ref} style={{ maxWidth: 900, margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(28px)", transition: "all .65s ease" }}>
        <Chip>OUR VISION</Chip>
        <blockquote style={{ fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 900, color: "white", letterSpacing: "-1.5px", lineHeight: 1.25, margin: "0 0 32px", borderLeft: "3px solid rgba(245,158,11,.4)", paddingLeft: "clamp(20px,3vw,32px)" }}>
          &ldquo;Every modern business deserves intelligent operations. We&apos;re building the infrastructure to make that possible.&rdquo;
        </blockquote>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,.45)", lineHeight: 1.85, margin: "0 0 16px" }}>
          The world runs on businesses — millions of them operating daily on spreadsheets,
          disconnected software, and manual processes. The tools exist to automate all of it.
          They&apos;re just not accessible enough.
        </p>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,.45)", lineHeight: 1.85 }}>
          Finova Forge is building that access layer — starting with FinovaOS, expanding into
          AI automation, and eventually covering every operational need a modern business has.
          Industry by industry. System by system.
        </p>
      </div>
    </section>
  );
}

/* ── 7. CTA ── */
function CTA() {
  const [ref, vis] = useInView();
  return (
    <section style={{ padding: "clamp(64px,10vw,100px) clamp(16px,3vw,48px) clamp(72px,12vw,120px)", fontFamily: ff }}>
      <div ref={ref} style={{
        maxWidth: 900, margin: "0 auto", textAlign: "center",
        padding: "clamp(48px,8vw,80px) clamp(24px,5vw,72px)",
        borderRadius: 28,
        background: "linear-gradient(135deg,rgba(245,158,11,.09),rgba(239,68,68,.05))",
        border: "1px solid rgba(245,158,11,.2)",
        position: "relative", overflow: "hidden",
        opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(28px)", transition: "all .65s ease"
      }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(245,158,11,.14),transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle,rgba(239,68,68,.1),transparent 70%)", pointerEvents: "none" }} />
        <Chip>GET STARTED</Chip>
        <h2 style={{ fontSize: "clamp(26px,4vw,46px)", fontWeight: 900, color: "white", margin: "0 0 16px", letterSpacing: "-1.5px" }}>
          Build smarter operations<br />with Finova Forge
        </h2>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,.45)", margin: "0 auto 40px", lineHeight: 1.8, maxWidth: 540 }}>
          Whether you&apos;re replacing spreadsheets, scaling your operations, or building the next
          generation of your business — we have the tools.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="https://finovaos.app" target="_blank" rel="noreferrer"
            style={{ padding: "15px 34px", borderRadius: 12, background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "white", fontWeight: 700, fontSize: 14, textDecoration: "none", boxShadow: "0 8px 28px rgba(245,158,11,.3)", transition: "all .25s" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 14px 40px rgba(245,158,11,.45)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(0)"; el.style.boxShadow = "0 8px 28px rgba(245,158,11,.3)"; }}>
            Open FinovaOS →
          </a>
          <Link href="/contact"
            style={{ padding: "15px 34px", borderRadius: 12, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.8)", fontWeight: 700, fontSize: 14, textDecoration: "none", transition: "all .25s" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(255,255,255,.1)"; el.style.color = "white"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(255,255,255,.06)"; el.style.color = "rgba(255,255,255,.8)"; }}>
            Talk to Us
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── ROOT ── */
export default function HomePage() {
  return (
    <div style={{ fontFamily: ff, color: "white" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: rgb(7,8,15); }
        @media (max-width: 600px) {
          .forge-intro-cards { grid-template-columns: 1fr !important; }
          .forge-products-grid { grid-template-columns: 1fr !important; }
          .forge-services-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 900px) {
          .forge-services-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .forge-services-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <ForgeNav />
      <Hero />
      <CompanyIntro />
      <Products />
      <Services />
      <TechStack />
      <Vision />
      <CTA />
      <ForgeFooter />
    </div>
  );
}