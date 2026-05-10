"use client";
import Link from "next/link";
import { ForgeNav, ForgeFooter, useInView } from "../../components/shared";

const ff = "'Outfit','DM Sans',sans-serif";

function Hero() {
  return (
    <section
      style={{
        minHeight: "100vh",
        padding: "120px 40px 80px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        background:
          "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(245,158,11,.15), transparent), radial-gradient(ellipse 60% 60% at 50% 50%, rgba(7,8,15,0), rgba(7,8,15,.5))",
        fontFamily: ff,
      }}
    >
      <div style={{ maxWidth: 820 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: 100,
            background: "rgba(245,158,11,.08)",
            border: "1px solid rgba(245,158,11,.2)",
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24", letterSpacing: ".08em" }}>
            ENTERPRISE ACCOUNTING MADE SIMPLE
          </span>
        </div>

        <h1
          style={{
            fontSize: "clamp(48px,8vw,72px)",
            fontWeight: 900,
            color: "white",
            letterSpacing: "-2px",
            margin: "0 0 24px",
            lineHeight: 1.1,
          }}
        >
          Build Your Business on Solid Numbers
        </h1>

        <p
          style={{
            fontSize: "clamp(16px,2vw,20px)",
            color: "rgba(255,255,255,.4)",
            margin: "0 0 48px",
            lineHeight: 1.7,
          }}
        >
          Finova Forge builds products that help businesses move beyond spreadsheets and into real financial control. Starting with FinovaOS.
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="https://finovaos.app"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "14px 36px",
              borderRadius: 12,
              background: "linear-gradient(135deg,#f59e0b,#ef4444)",
              color: "white",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              boxShadow: "0 8px 24px rgba(245,158,11,.3)",
              transition: "all .3s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 12px 32px rgba(245,158,11,.4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 24px rgba(245,158,11,.3)";
            }}
          >
            Try FinovaOS Free →
          </a>
          <Link
            href="/forge/products"
            style={{
              padding: "14px 36px",
              borderRadius: 12,
              background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.15)",
              color: "white",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              transition: "all .3s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(245,158,11,.08)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(245,158,11,.3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,.04)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,.15)";
            }}
          >
            Explore Our Products
          </Link>
        </div>

        <div style={{ marginTop: 80, display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap", fontSize: 13, color: "rgba(255,255,255,.35)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>✓</span> Founded 2024
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>✓</span> Serving 40+ Countries
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>✓</span> Fast Setup, Simple Use
          </div>
        </div>
      </div>
    </section>
  );
}

function Highlights() {
  const [ref, vis] = useInView();
  const items = [
    { icon: "📊", title: "Real-Time Accounting", desc: "See your exact financial position, instantly. No delayed reports, no guesswork." },
    { icon: "⚙️", title: "Built for Your Industry", desc: "Whether retail, services, or manufacturing — our tools work the way you do." },
    { icon: "🌍", title: "Built for Global Scale", desc: "Multi-currency, 40+ countries, jurisdiction-ready reports. Works everywhere businesses operate." },
    { icon: "🔒", title: "Bank-Level Security", desc: "Your financial data is encrypted and protected with enterprise-grade security." },
  ];

  return (
    <section
      style={{
        padding: "100px 40px",
        background: "rgba(255,255,255,.01)",
        borderTop: "1px solid rgba(255,255,255,.05)",
        fontFamily: ff,
      }}
    >
      <div
        ref={ref}
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(24px)",
          transition: "all .65s ease",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2
            style={{
              fontSize: "clamp(28px,4vw,44px)",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-1.5px",
              margin: 0,
            }}
          >
            Why Businesses Choose FinovaForge
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                padding: "32px 28px",
                borderRadius: 20,
                background: "rgba(255,255,255,.025)",
                border: "1px solid rgba(255,255,255,.07)",
                transition: "all .3s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "rgba(245,158,11,.05)";
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(245,158,11,.2)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,.025)";
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,.07)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 16 }}>{item.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "white", marginBottom: 10 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", lineHeight: 1.7 }}>
                {item.desc}
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
    <section
      style={{
        padding: "100px 40px",
        fontFamily: ff,
      }}
    >
      <div
        ref={ref}
        style={{
          maxWidth: 800,
          margin: "0 auto",
          textAlign: "center",
          padding: "60px 40px",
          borderRadius: 24,
          background: "linear-gradient(135deg,rgba(245,158,11,.08),rgba(239,68,68,.04))",
          border: "1px solid rgba(245,158,11,.2)",
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(24px)",
          transition: "all .65s ease",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(28px,4vw,40px)",
            fontWeight: 900,
            color: "white",
            margin: "0 0 16px",
          }}
        >
          Ready to Transform Your Accounting?
        </h2>
        <p
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,.5)",
            margin: "0 0 32px",
            lineHeight: 1.7,
          }}
        >
          Join growing businesses worldwide already using FinovaOS to manage their finances with confidence.
        </p>
        <a
          href="https://finovaos.app"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-block",
            padding: "14px 36px",
            borderRadius: 12,
            background: "linear-gradient(135deg,#f59e0b,#ef4444)",
            color: "white",
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
            boxShadow: "0 8px 24px rgba(245,158,11,.3)",
            transition: "all .3s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
          }}
        >
          Start Free Trial Now →
        </a>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div style={{ fontFamily: ff, color: "white" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{background:rgb(7,8,15)}
      `}</style>
      <ForgeNav />
      <Hero />
      <Highlights />
      <CTA />
      <ForgeFooter />
    </div>
  );
}
