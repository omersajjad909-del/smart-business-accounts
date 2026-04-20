"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const ff = "'Outfit','DM Sans',sans-serif";

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect(); }
    }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, vis] as const;
}

// ── Navbar ─────────────────────────────────────────────────────────────────
function ForgeNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      padding: "0 40px", height: 64,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: scrolled ? "rgba(7,8,15,.92)" : "transparent",
      backdropFilter: scrolled ? "blur(20px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(255,255,255,.06)" : "none",
      transition: "all .3s ease", fontFamily: ff,
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: "linear-gradient(135deg,#f59e0b,#ef4444)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 900, color: "white",
        }}>F</div>
        <span style={{ fontSize: 17, fontWeight: 900, color: "white", letterSpacing: "-.4px" }}>
          FinovaForge
        </span>
      </div>

      {/* Links */}
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {[
          { label: "Products", href: "#products" },
          { label: "Mission",  href: "#mission"  },
          { label: "Team",     href: "#team"      },
          { label: "Contact",  href: "#contact"   },
        ].map(l => (
          <a key={l.href} href={l.href} style={{
            fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.5)",
            textDecoration: "none", transition: "color .2s",
          }}
            onMouseEnter={e => (e.currentTarget.style.color = "white")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.5)")}
          >
            {l.label}
          </a>
        ))}
        <Link href="https://finovaos.app" target="_blank" style={{
          padding: "8px 18px", borderRadius: 9,
          background: "linear-gradient(135deg,#f59e0b,#ef4444)",
          color: "white", fontWeight: 700, fontSize: 13,
          textDecoration: "none", boxShadow: "0 4px 16px rgba(245,158,11,.3)",
        }}>
          Visit FinovaOS →
        </Link>
      </div>
    </nav>
  );
}

// ── Hero ───────────────────────────────────────────────────────────────────
function Hero() {
  const [ref, vis] = useInView(0.01);
  return (
    <section style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "120px 24px 80px", textAlign: "center", position: "relative", overflow: "hidden",
    }}>
      {/* BG */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 800, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(245,158,11,.07),transparent 65%)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 200, background: "linear-gradient(transparent,#07080f)" }} />
      </div>

      <div ref={ref} style={{ maxWidth: 800, position: "relative", opacity: vis?1:0, transform: vis?"translateY(0)":"translateY(32px)", transition: "all .8s cubic-bezier(.22,1,.36,1)" }}>
        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 100, background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.25)", marginBottom: 28 }}>
          <span style={{ fontSize: 12 }}>🔨</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24", letterSpacing: ".08em" }}>SOFTWARE COMPANY</span>
        </div>

        {/* Wordmark */}
        <h1 style={{ fontSize: "clamp(48px,8vw,88px)", fontWeight: 900, letterSpacing: "-3px", lineHeight: 1, margin: "0 0 24px", color: "white" }}>
          Finova
          <span style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Forge
          </span>
        </h1>

        <p style={{ fontSize: "clamp(16px,2.5vw,22px)", color: "rgba(255,255,255,.45)", lineHeight: 1.7, maxWidth: 580, margin: "0 auto 16px" }}>
          We design and build intelligent, industry-specific business software for companies across South Asia and beyond.
        </p>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,.25)", marginBottom: 48 }}>
          Lahore, Pakistan &nbsp;·&nbsp; Est. 2024
        </p>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="#products" style={{
            padding: "14px 32px", borderRadius: 12, textDecoration: "none",
            background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "white",
            fontWeight: 800, fontSize: 15, boxShadow: "0 8px 28px rgba(245,158,11,.3)",
          }}>
            Our Products
          </a>
          <a href="#contact" style={{
            padding: "14px 28px", borderRadius: 12, textDecoration: "none",
            background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)",
            color: "rgba(255,255,255,.75)", fontWeight: 700, fontSize: 15,
          }}>
            Get in Touch
          </a>
        </div>
      </div>
    </section>
  );
}

// ── Products ───────────────────────────────────────────────────────────────
function Products() {
  const [ref, vis] = useInView();
  return (
    <section id="products" style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div ref={ref} style={{ opacity: vis?1:0, transform: vis?"translateY(0)":"translateY(24px)", transition: "all .65s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 100, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", marginBottom: 18 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24", letterSpacing: ".08em" }}>OUR PRODUCTS</span>
          </div>
          <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, color: "white", letterSpacing: "-1.5px", margin: 0 }}>
            What we build
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, alignItems: "stretch" }}>

          {/* FinovaOS — main product */}
          <div style={{
            borderRadius: 24, padding: "40px 40px",
            background: "linear-gradient(145deg,rgba(99,102,241,.12),rgba(79,70,229,.06))",
            border: "1.5px solid rgba(99,102,241,.3)",
            boxShadow: "0 0 60px rgba(99,102,241,.08)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#6366f1,#818cf8,#a78bfa)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🧠</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "white", letterSpacing: "-.4px" }}>FinovaOS</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 2 }}>finovaos.app</div>
              </div>
              <span style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 20, background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.35)", color: "#34d399", fontSize: 11, fontWeight: 800 }}>
                🟢 Live
              </span>
            </div>

            <p style={{ fontSize: 15, color: "rgba(255,255,255,.55)", lineHeight: 1.75, marginBottom: 28 }}>
              A full-stack cloud business management platform for SMEs. Covers accounting, invoicing, inventory, HR & payroll, CRM, bank reconciliation, multi-branch management, and AI-powered automation — all in one place.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 32 }}>
              {["Accounting & Finance","Invoicing & Sales","Inventory Management","HR & Payroll","CRM","Bank Reconciliation"].map(f => (
                <div key={f} style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", fontSize: 11, color: "rgba(255,255,255,.5)", fontWeight: 600 }}>
                  {f}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <Link href="https://finovaos.app" target="_blank" style={{
                padding: "11px 24px", borderRadius: 10, textDecoration: "none",
                background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white",
                fontWeight: 700, fontSize: 13, boxShadow: "0 4px 16px rgba(99,102,241,.35)",
              }}>
                Visit Product →
              </Link>
              <Link href="https://finovaos.app/pricing" target="_blank" style={{
                padding: "11px 20px", borderRadius: 10, textDecoration: "none",
                background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
                color: "rgba(255,255,255,.6)", fontWeight: 600, fontSize: 13,
              }}>
                View Pricing
              </Link>
            </div>
          </div>

          {/* Coming Soon */}
          <div style={{
            borderRadius: 24, padding: "36px 32px",
            background: "rgba(255,255,255,.02)", border: "1px dashed rgba(255,255,255,.1)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            textAlign: "center", gap: 16,
          }}>
            <div style={{ fontSize: 40 }}>🔧</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,.4)", marginBottom: 8 }}>Next Product</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.2)", lineHeight: 1.6 }}>
                We&apos;re building our next product. Stay tuned.
              </div>
            </div>
            <span style={{ padding: "4px 14px", borderRadius: 20, background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.2)", color: "#fbbf24", fontSize: 11, fontWeight: 700 }}>
              Coming Soon
            </span>
          </div>

        </div>
      </div>
    </section>
  );
}

// ── Mission ────────────────────────────────────────────────────────────────
function Mission() {
  const [ref, vis] = useInView();
  const values = [
    { icon: "🎯", title: "Industry First",    desc: "We don't build generic tools. Every product is designed around how a specific industry actually operates." },
    { icon: "⚡", title: "Simplicity at Scale", desc: "Powerful features that feel simple. Our goal is a 60-second setup, not a 60-day implementation." },
    { icon: "🌍", title: "Built for Emerging Markets", desc: "Designed for Pakistan, UAE, India — and every market where businesses are underserved by legacy software." },
  ];
  return (
    <section id="mission" style={{ padding: "100px 24px", background: "rgba(255,255,255,.01)", borderTop: "1px solid rgba(255,255,255,.05)", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
      <div ref={ref} style={{ maxWidth: 1100, margin: "0 auto", opacity: vis?1:0, transform: vis?"translateY(0)":"translateY(24px)", transition: "all .65s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 100, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", marginBottom: 18 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24", letterSpacing: ".08em" }}>OUR MISSION</span>
          </div>
          <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, color: "white", letterSpacing: "-1.5px", margin: "0 0 16px" }}>
            Why FinovaForge exists
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,.38)", maxWidth: 560, margin: "0 auto", lineHeight: 1.75 }}>
            Millions of businesses across South Asia run on spreadsheets or outdated software. We&apos;re fixing that — one industry at a time.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {values.map((v, i) => (
            <div key={i} style={{
              padding: "32px 28px", borderRadius: 20,
              background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)",
              transition: "background .2s, border .2s, transform .2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(245,158,11,.05)"; e.currentTarget.style.borderColor="rgba(245,158,11,.2)"; e.currentTarget.style.transform="translateY(-3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,.025)"; e.currentTarget.style.borderColor="rgba(255,255,255,.07)"; e.currentTarget.style.transform="translateY(0)"; }}
            >
              <div style={{ fontSize: 32, marginBottom: 16 }}>{v.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "white", marginBottom: 10 }}>{v.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", lineHeight: 1.7 }}>{v.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Team ───────────────────────────────────────────────────────────────────
function Team() {
  const [ref, vis] = useInView();
  return (
    <section id="team" style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div ref={ref} style={{ opacity: vis?1:0, transform: vis?"translateY(0)":"translateY(24px)", transition: "all .65s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 100, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", marginBottom: 18 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24", letterSpacing: ".08em" }}>THE TEAM</span>
          </div>
          <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, color: "white", letterSpacing: "-1.5px", margin: 0 }}>
            Who&apos;s building this
          </h2>
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{
            width: 340, padding: "36px 32px", borderRadius: 24, textAlign: "center",
            background: "linear-gradient(145deg,rgba(245,158,11,.08),rgba(239,68,68,.04))",
            border: "1px solid rgba(245,158,11,.2)",
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%", margin: "0 auto 20px",
              background: "linear-gradient(135deg,#f59e0b,#ef4444)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, fontWeight: 900, color: "white",
            }}>U</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "white", marginBottom: 4 }}>Umer Sajjad</div>
            <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700, marginBottom: 14, letterSpacing: ".04em" }}>Founder & CEO</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.38)", lineHeight: 1.7 }}>
              Building FinovaForge from Lahore, Pakistan. Passionate about making enterprise-grade software accessible to every business.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Contact ────────────────────────────────────────────────────────────────
function Contact() {
  const [ref, vis] = useInView();
  const links = [
    { icon: "✉️", label: "Email",    value: "hello@finovaforge.com", href: "mailto:hello@finovaforge.com" },
    { icon: "🐦", label: "Twitter",  value: "@finovaforge",          href: "https://twitter.com/finovaforge" },
    { icon: "💼", label: "LinkedIn", value: "finovaforge",           href: "https://linkedin.com/company/finovaforge" },
  ];
  return (
    <section id="contact" style={{ padding: "100px 24px", background: "rgba(255,255,255,.01)", borderTop: "1px solid rgba(255,255,255,.05)" }}>
      <div ref={ref} style={{ maxWidth: 680, margin: "0 auto", textAlign: "center", opacity: vis?1:0, transform: vis?"translateY(0)":"translateY(24px)", transition: "all .65s ease" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 100, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", marginBottom: 18 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24", letterSpacing: ".08em" }}>GET IN TOUCH</span>
        </div>
        <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, color: "white", letterSpacing: "-1.5px", margin: "0 0 16px" }}>
          Let&apos;s talk
        </h2>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,.38)", lineHeight: 1.75, marginBottom: 48 }}>
          Partnerships, press inquiries, investor relations, or just want to say hello — we&apos;d love to hear from you.
        </p>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          {links.map(l => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer" style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "14px 22px", borderRadius: 12, textDecoration: "none",
              background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)",
              color: "rgba(255,255,255,.65)", fontWeight: 600, fontSize: 14,
              transition: "all .2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(245,158,11,.08)"; e.currentTarget.style.borderColor="rgba(245,158,11,.3)"; e.currentTarget.style.color="white"; }}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,.04)"; e.currentTarget.style.borderColor="rgba(255,255,255,.1)"; e.currentTarget.style.color="rgba(255,255,255,.65)"; }}
            >
              <span>{l.icon}</span>
              <span>{l.value}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────
function ForgeFooter() {
  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "32px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, fontFamily: ff }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg,#f59e0b,#ef4444)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "white" }}>F</div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.35)" }}>
          © {new Date().getFullYear()} FinovaForge. All rights reserved.
        </span>
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        {[
          { label: "FinovaOS", href: "https://finovaos.app" },
          { label: "Privacy",  href: "/privacy" },
          { label: "Terms",    href: "/terms" },
        ].map(l => (
          <Link key={l.label} href={l.href} style={{ fontSize: 12, color: "rgba(255,255,255,.25)", textDecoration: "none", fontWeight: 600 }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.6)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.25)")}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function ForgePage() {
  return (
    <div style={{ fontFamily: ff, color: "white" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        @media(max-width:768px){
          nav a:not(:last-child){display:none}
        }
      `}</style>
      <ForgeNav />
      <Hero />
      <Products />
      <Mission />
      <Team />
      <Contact />
      <ForgeFooter />
    </div>
  );
}
