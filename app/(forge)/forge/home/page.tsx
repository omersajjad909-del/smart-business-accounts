"use client";
import Link from "next/link";
import {
  Hammer,
  Target,
  Bot,
  Globe,
  Building2,
  Cpu,
  Cloud,
  ShieldCheck,
  Zap,
  Lock,
  TrendingUp,
  Calendar,
  Rocket,
  Infinity as InfinityIcon,
  ArrowRight,
  ShoppingCart,
} from "lucide-react";
import { ForgeNav, ForgeFooter } from "../../components/shared";
import {
  ff,
  colors,
  FadeIn,
  Eyebrow,
  SectionHeading,
  IconBadge,
  StatusPill,
  PrimaryLink,
  GhostLink,
  TextLink,
} from "../../components/ui";

/* ── 1. HERO ──
   Real hierarchy instead of centered-text-and-gradient: a left column that
   carries the message and CTAs, and a right-hand "snapshot" panel that gives
   the real company stats visual weight instead of a flat centered row. */
function Hero() {
  const stats = [
    { icon: <Calendar size={18} />, v: "2025", l: "Founded" },
    { icon: <Globe size={18} />, v: "40+", l: "Countries" },
    { icon: <Rocket size={18} />, v: "1", l: "Live Product" },
    { icon: <InfinityIcon size={18} />, v: "∞", l: "Ambition" },
  ];

  return (
    <section
      style={{
        minHeight: "100vh",
        padding: "clamp(100px,14vw,150px) clamp(16px,3vw,48px) clamp(64px,10vw,100px)",
        display: "flex",
        alignItems: "center",
        position: "relative",
        fontFamily: ff,
        background: `radial-gradient(ellipse 70% 55% at 85% -10%, ${colors.accentGlow}, transparent)`,
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.04,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />

      <div
        className="hero-grid"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "1.15fr .85fr",
          gap: "clamp(32px,5vw,64px)",
          alignItems: "center",
          width: "100%",
        }}
      >
        {/* Left — message */}
        <div className="hero-left">
          <Eyebrow>AI-DRIVEN SOFTWARE COMPANY</Eyebrow>

          <h1
            style={{
              fontSize: "clamp(38px,6vw,68px)",
              fontWeight: 900,
              color: colors.textPrimary,
              letterSpacing: "-2.5px",
              margin: "0 0 24px",
              lineHeight: 1.06,
            }}
          >
            Building intelligent systems{" "}
            <span style={{ color: colors.accent }}>for modern businesses</span>
          </h1>

          <p
            style={{
              fontSize: "clamp(15px,1.6vw,18px)",
              color: colors.textSecondary,
              margin: "0 0 40px",
              lineHeight: 1.8,
              maxWidth: 520,
            }}
          >
            Finova Forge develops AI-powered business platforms, automation systems, and scalable
            digital infrastructure for modern operations.
          </p>

          <div className="hero-ctas" style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
            <PrimaryLink href="/products">
              Explore Products <ArrowRight size={15} />
            </PrimaryLink>
            <GhostLink href="/contact">Contact Us</GhostLink>
          </div>
        </div>

        {/* Right — company snapshot panel */}
        <div className="hero-right">
          <div
            style={{
              borderRadius: 22,
              background: "rgba(255,255,255,.03)",
              border: `1px solid ${colors.border}`,
              boxShadow: "0 32px 90px rgba(0,0,0,.5)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: `1px solid ${colors.border}`,
                background: "rgba(255,255,255,.02)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors.accent }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.textSecondary, letterSpacing: ".03em" }}>
                Finova Forge — Snapshot
              </span>
            </div>
            <div
              style={{
                padding: "clamp(20px,3vw,28px)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {stats.map((s) => (
                <div
                  key={s.l}
                  style={{
                    padding: "18px 16px",
                    borderRadius: 14,
                    background: "rgba(255,255,255,.025)",
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <IconBadge icon={s.icon} size={34} />
                  <div style={{ fontSize: 26, fontWeight: 900, color: colors.textPrimary, letterSpacing: "-1px", marginTop: 14 }}>
                    {s.v}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: colors.textFaint,
                      fontWeight: 600,
                      letterSpacing: ".06em",
                      marginTop: 4,
                      textTransform: "uppercase",
                    }}
                  >
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 2. COMPANY INTRO ── */
function CompanyIntro() {
  const pillars = [
    { icon: <Hammer size={22} />, title: "We Build", body: "SaaS platforms, ERP systems, AI tools, and business automation infrastructure." },
    { icon: <Target size={22} />, title: "We Focus", body: "Industry-specific solutions, not generic tools. Built for how your business actually works." },
    { icon: <Bot size={22} />, title: "We Automate", body: "AI-driven workflows that replace manual, repetitive processes across your operations." },
    { icon: <Globe size={22} />, title: "We Scale", body: "Systems designed for global operations — multi-currency, multi-branch, multi-company." },
  ];

  return (
    <section
      style={{
        padding: "clamp(64px,10vw,100px) clamp(16px,3vw,48px)",
        background: "rgba(255,255,255,.015)",
        borderTop: `1px solid ${colors.border}`,
        fontFamily: ff,
      }}
    >
      <FadeIn
        className="forge-intro-grid"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
          gap: "clamp(32px,5vw,64px)",
          alignItems: "center",
        }}
      >
        <div>
          <Eyebrow>WHO WE ARE</Eyebrow>
          <h2
            style={{
              fontSize: "clamp(28px,4vw,46px)",
              fontWeight: 900,
              color: colors.textPrimary,
              letterSpacing: "-1.5px",
              margin: "0 0 20px",
              lineHeight: 1.12,
            }}
          >
            We don&apos;t just build software.
            <br />
            We build operations.
          </h2>
          <p style={{ fontSize: 15, color: colors.textSecondary, lineHeight: 1.85, margin: "0 0 18px" }}>
            Finova Forge is a software company focused on building intelligent, modular systems that
            replace fragmented tools and manual processes for growing businesses.
          </p>
          <p style={{ fontSize: 15, color: colors.textSecondary, lineHeight: 1.85, margin: "0 0 32px" }}>
            Our flagship product, FinovaOS, is a full ERP platform — and it&apos;s just the beginning.
            We&apos;re building an ecosystem of AI-powered business tools designed to scale with you.
          </p>
          <TextLink href="/about">Our full story &rarr;</TextLink>
        </div>

        <div className="forge-intro-cards" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {pillars.map((c) => (
            <div key={c.title} className="fg-card" style={{ padding: "24px 20px", borderRadius: 16 }}>
              <IconBadge icon={c.icon} size={40} />
              <div style={{ fontSize: 14, fontWeight: 800, color: colors.textPrimary, margin: "14px 0 6px" }}>
                {c.title}
              </div>
              <div style={{ fontSize: 12.5, color: colors.textMuted, lineHeight: 1.7 }}>{c.body}</div>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}

/* ── 3. PRODUCTS ── */
function Products() {
  return (
    <section style={{ padding: "clamp(64px,10vw,100px) clamp(16px,3vw,48px)", fontFamily: ff }}>
      <FadeIn style={{ maxWidth: 1200, margin: "0 auto" }}>
        <SectionHeading
          eyebrow="OUR PRODUCTS"
          title="What we've built — and what's coming"
          desc="Each product targets a specific gap in how modern businesses operate."
        />

        <div className="forge-products-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
          {/* FinovaOS — LIVE */}
          <div className="fg-card fg-card--featured" style={{ padding: "36px 32px", borderRadius: 22, position: "relative" }}>
            <StatusPill label="LIVE" status="live" />
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: colors.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 900,
                color: "#1a1206",
                marginBottom: 20,
              }}
            >
              OS
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 900, color: colors.textPrimary, margin: "0 0 4px", letterSpacing: "-.5px" }}>
              FinovaOS
            </h3>
            <p style={{ fontSize: 12, color: colors.accentLight, fontWeight: 700, margin: "0 0 16px", letterSpacing: ".04em", textTransform: "uppercase" }}>
              AI-Powered ERP Platform
            </p>
            <p style={{ fontSize: 13.5, color: colors.textSecondary, lineHeight: 1.8, margin: "0 0 24px" }}>
              A modular, full-stack ERP system covering accounting, inventory, payroll, invoicing, HR,
              CRM, and more. Built for industry-specific workflows — from retail to manufacturing.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
              {["Accounting", "Inventory", "Invoicing", "Payroll", "CRM", "Reports"].map((t) => (
                <span
                  key={t}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 7,
                    background: colors.accentSoftBg,
                    border: `1px solid ${colors.accentSoftBorder}`,
                    fontSize: 11,
                    fontWeight: 600,
                    color: colors.accentLight,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
            <PrimaryLink href="https://finovaos.app" external>
              Open FinovaOS <ArrowRight size={14} />
            </PrimaryLink>
          </div>

          {/* FinovaAI — In Development */}
          <div className="fg-card fg-card--dashed" style={{ padding: "36px 32px", borderRadius: 22, position: "relative" }}>
            <StatusPill label="IN DEVELOPMENT" status="dev" />
            <IconBadge icon={<Bot size={22} />} tone="neutral" size={48} />
            <h3 style={{ fontSize: 20, fontWeight: 900, color: colors.textSecondary, margin: "20px 0 4px", letterSpacing: "-.4px" }}>
              FinovaAI
            </h3>
            <p style={{ fontSize: 12, color: colors.textFaint, fontWeight: 700, margin: "0 0 16px", letterSpacing: ".04em", textTransform: "uppercase" }}>
              Business Intelligence Layer
            </p>
            <p style={{ fontSize: 13.5, color: colors.textFaint, lineHeight: 1.8, margin: 0 }}>
              AI-powered analytics, demand forecasting, anomaly detection, and natural-language
              reporting across all your business data.
            </p>
          </div>

          {/* FinovaPOS — Planned */}
          <div className="fg-card fg-card--dashed" style={{ padding: "36px 32px", borderRadius: 22, position: "relative" }}>
            <StatusPill label="PLANNED" status="planned" />
            <IconBadge icon={<ShoppingCart size={22} />} tone="neutral" size={48} />
            <h3 style={{ fontSize: 20, fontWeight: 900, color: colors.textSecondary, margin: "20px 0 4px", letterSpacing: "-.4px" }}>
              FinovaPOS
            </h3>
            <p style={{ fontSize: 12, color: colors.textFaint, fontWeight: 700, margin: "0 0 16px", letterSpacing: ".04em", textTransform: "uppercase" }}>
              Point of Sale System
            </p>
            <p style={{ fontSize: 13.5, color: colors.textFaint, lineHeight: 1.8, margin: 0 }}>
              A standalone POS built for retail, F&amp;B, and multi-branch operations — integrated
              directly with FinovaOS inventory and accounting.
            </p>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 28 }}>
          <TextLink href="/products">View full product roadmap &rarr;</TextLink>
        </div>
      </FadeIn>
    </section>
  );
}

/* ── 4. SERVICES ── */
function Services() {
  const services = [
    { icon: <Building2 size={26} />, title: "ERP & Business Software", desc: "End-to-end ERP systems covering accounting, inventory, HR, invoicing, and operations. Industry-specific, not generic." },
    { icon: <Cpu size={26} />, title: "AI Automation", desc: "Intelligent workflows that automate repetitive tasks — from purchase approvals to financial reconciliation to demand forecasting." },
    { icon: <Cloud size={26} />, title: "SaaS Development", desc: "Scalable, multi-tenant SaaS platforms from architecture to deployment — with real-time data, role-based access, and API-first design." },
    { icon: <ShieldCheck size={26} />, title: "Business Infrastructure", desc: "Cloud infrastructure, data pipelines, monitoring, and security systems that form the backbone of modern business operations." },
  ];

  return (
    <section
      style={{
        padding: "clamp(64px,10vw,100px) clamp(16px,3vw,48px)",
        background: "rgba(255,255,255,.015)",
        borderTop: `1px solid ${colors.border}`,
        fontFamily: ff,
      }}
    >
      <FadeIn style={{ maxWidth: 1200, margin: "0 auto" }}>
        <SectionHeading eyebrow="WHAT WE BUILD" title="Our capabilities" align="left" />
        <div className="forge-services-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20 }}>
          {services.map((s) => (
            <div key={s.title} className="fg-card fg-card--accent" style={{ padding: "32px 28px", borderRadius: 20 }}>
              <IconBadge icon={s.icon} size={52} />
              <h3 style={{ fontSize: 16, fontWeight: 800, color: colors.textPrimary, margin: "18px 0 12px" }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: colors.textMuted, margin: 0, lineHeight: 1.8 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}

/* ── 5. TECH STACK ── */
function TechStack() {
  const stack = [
    { label: "Next.js", cat: "Frontend" },
    { label: "Node.js", cat: "Backend" },
    { label: "PostgreSQL", cat: "Database" },
    { label: "Supabase", cat: "Platform" },
    { label: "FinovaOS AI", cat: "AI" },
    { label: "Vercel", cat: "Cloud" },
    { label: "TypeScript", cat: "Language" },
    { label: "AES-256", cat: "Security" },
  ];
  const features = [
    { icon: <Zap size={16} />, label: "Realtime data sync" },
    { icon: <Lock size={16} />, label: "End-to-end encryption" },
    { icon: <Globe size={16} />, label: "Multi-region ready" },
    { icon: <TrendingUp size={16} />, label: "Scales to millions of records" },
  ];

  return (
    <section style={{ padding: "clamp(64px,10vw,100px) clamp(16px,3vw,48px)", fontFamily: ff }}>
      <FadeIn style={{ maxWidth: 1200, margin: "0 auto" }}>
        <SectionHeading
          eyebrow="TECHNOLOGY"
          title="Built on solid foundations"
          desc="Modern, proven technologies — chosen for reliability, scalability, and developer velocity."
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          {stack.map((t) => (
            <div
              key={t.label}
              className="fg-card"
              style={{
                padding: "14px 22px",
                borderRadius: 14,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                minWidth: 110,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 800, color: colors.textPrimary }}>{t.label}</span>
              <span style={{ fontSize: 10, color: colors.textFaint, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>
                {t.cat}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 48,
            padding: "clamp(20px,3vw,28px) clamp(20px,3vw,32px)",
            borderRadius: 16,
            background: colors.accentSoftBg,
            border: `1px solid ${colors.accentSoftBorder}`,
            display: "flex",
            gap: "clamp(16px,3vw,32px)",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {features.map((f) => (
            <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: colors.textSecondary, fontWeight: 600 }}>
              <span style={{ color: colors.accentLight, display: "flex" }}>{f.icon}</span>
              {f.label}
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}

/* ── 6. VISION ── */
function Vision() {
  return (
    <section
      style={{
        padding: "clamp(64px,10vw,100px) clamp(16px,3vw,48px)",
        background: "rgba(255,255,255,.015)",
        borderTop: `1px solid ${colors.border}`,
        fontFamily: ff,
      }}
    >
      <FadeIn style={{ maxWidth: 900, margin: "0 auto" }}>
        <Eyebrow>OUR VISION</Eyebrow>
        <blockquote
          style={{
            fontSize: "clamp(22px,3.5vw,38px)",
            fontWeight: 900,
            color: colors.textPrimary,
            letterSpacing: "-1.5px",
            lineHeight: 1.25,
            margin: "0 0 32px",
            borderLeft: `3px solid ${colors.accentStrongBorder}`,
            paddingLeft: "clamp(20px,3vw,32px)",
          }}
        >
          &ldquo;Every modern business deserves intelligent operations. We&apos;re building the
          infrastructure to make that possible.&rdquo;
        </blockquote>
        <p style={{ fontSize: 15, color: colors.textSecondary, lineHeight: 1.85, margin: "0 0 16px" }}>
          The world runs on businesses — millions of them operating daily on spreadsheets,
          disconnected software, and manual processes. The tools exist to automate all of it.
          They&apos;re just not accessible enough.
        </p>
        <p style={{ fontSize: 15, color: colors.textSecondary, lineHeight: 1.85 }}>
          Finova Forge is building that access layer — starting with FinovaOS, expanding into AI
          automation, and eventually covering every operational need a modern business has. Industry
          by industry. System by system.
        </p>
      </FadeIn>
    </section>
  );
}

/* ── 7. CTA ── */
function CTA() {
  return (
    <section style={{ padding: "clamp(64px,10vw,100px) clamp(16px,3vw,48px) clamp(72px,12vw,120px)", fontFamily: ff }}>
      <FadeIn
        style={{
          maxWidth: 900,
          margin: "0 auto",
          textAlign: "center",
          padding: "clamp(48px,8vw,80px) clamp(24px,5vw,72px)",
          borderRadius: 28,
          background: "linear-gradient(135deg, rgba(245,158,11,.1), rgba(245,158,11,.03))",
          border: `1px solid ${colors.accentSoftBorder}`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${colors.accentGlow}, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        <Eyebrow>GET STARTED</Eyebrow>
        <h2 style={{ fontSize: "clamp(26px,4vw,46px)", fontWeight: 900, color: colors.textPrimary, margin: "0 0 16px", letterSpacing: "-1.5px" }}>
          Build smarter operations
          <br />
          with Finova Forge
        </h2>
        <p style={{ fontSize: 15, color: colors.textSecondary, margin: "0 auto 40px", lineHeight: 1.8, maxWidth: 540 }}>
          Whether you&apos;re replacing spreadsheets, scaling your operations, or building the next
          generation of your business — we have the tools.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <PrimaryLink href="https://finovaos.app" external>
            Open FinovaOS <ArrowRight size={15} />
          </PrimaryLink>
          <GhostLink href="/contact">Talk to Us</GhostLink>
        </div>
      </FadeIn>
    </section>
  );
}

/* ── ROOT ── */
export default function HomePage() {
  return (
    <div style={{ fontFamily: ff, color: colors.textPrimary }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: ${colors.bg}; }

        /* ── Shared interactive primitives ── */
        .fg-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 15px 34px; border-radius: 12px;
          font-weight: 700; font-size: 14px; letter-spacing: .02em;
          text-decoration: none; transition: all .22s ease;
        }
        .fg-btn-primary {
          background: ${colors.accent}; color: #1a1206;
          box-shadow: 0 8px 26px rgba(245,158,11,.28);
        }
        .fg-btn-primary:hover {
          background: ${colors.accentLight};
          transform: translateY(-2px);
          box-shadow: 0 14px 38px rgba(245,158,11,.4);
        }
        .fg-btn-ghost {
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.14);
          color: rgba(255,255,255,.8);
        }
        .fg-btn-ghost:hover {
          background: ${colors.accentSoftBg};
          border-color: ${colors.accentSoftBorder};
          color: #fff;
        }
        .fg-link {
          color: rgba(255,255,255,.42);
          text-decoration: none; font-weight: 700; font-size: 13px;
          transition: color .2s ease;
        }
        .fg-link:hover { color: ${colors.accentLight}; }

        .fg-card {
          background: ${colors.surface};
          border: 1px solid ${colors.border};
          transition: all .3s ease;
        }
        .fg-card:hover {
          background: ${colors.surfaceStrong};
          border-color: ${colors.borderStrong};
          transform: translateY(-3px);
        }
        .fg-card--accent:hover {
          background: ${colors.accentSoftBg};
          border-color: ${colors.accentSoftBorder};
          transform: translateY(-4px);
        }
        .fg-card--featured {
          background: linear-gradient(145deg, rgba(245,158,11,.1), rgba(245,158,11,.025));
          border: 1px solid ${colors.accentSoftBorder};
        }
        .fg-card--dashed {
          background: rgba(255,255,255,.02);
          border: 1px dashed rgba(255,255,255,.1);
        }
        .fg-card--dashed:hover {
          background: rgba(255,255,255,.04);
          border-color: rgba(255,255,255,.18);
          transform: none;
        }

        /* ── Responsive grids ── */
        @media (max-width: 1024px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-right { max-width: 480px; margin: 0 auto; width: 100%; }
          .hero-left { text-align: center; }
          .hero-left h1, .hero-left p { margin-left: auto; margin-right: auto; }
          .hero-ctas { justify-content: center; }
        }
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
