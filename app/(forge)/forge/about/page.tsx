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
            ABOUT US
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
          Built in Lahore. For South Asia.
        </h1>

        <p
          style={{
            fontSize: "clamp(16px,2vw,20px)",
            color: "rgba(255,255,255,.4)",
            margin: "0 0 48px",
            lineHeight: 1.7,
          }}
        >
          FinovaForge is on a mission to build the software that emerging markets actually need.
        </p>
      </div>
    </section>
  );
}

function Story() {
  const [ref, vis] = useInView();
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
          maxWidth: 900,
          margin: "0 auto",
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(24px)",
          transition: "all .65s ease",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(32px,4vw,48px)",
            fontWeight: 900,
            color: "white",
            letterSpacing: "-1.5px",
            margin: "0 0 32px",
          }}
        >
          Our Story
        </h2>

        <div
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,.6)",
            lineHeight: 2,
          }}
        >
          <p style={{ marginBottom: 24 }}>
            In 2024, Umer Sajjad looked at the accounting software landscape and saw a massive gap. Most enterprise accounting tools were built for Fortune 500 companies in the US and Europe. They were expensive, complex, and required months to implement.
          </p>

          <p style={{ marginBottom: 24 }}>
            Meanwhile, millions of businesses across South Asia—Pakistan, UAE, India—were still running on spreadsheets. They needed something better, but nothing was built for them. They needed software that understood their industries, worked in their regions, and could be set up in minutes, not months.
          </p>

          <p style={{ marginBottom: 24 }}>
            FinovaForge was born to fix this. We're building products for the businesses that legacy software ignores. Industry-first. Simple. Affordable. And built right here in Lahore, Pakistan.
          </p>

          <p>
            Our first product, FinovaOS, makes accounting effortless. No more spreadsheets. No more complex spreadsheets. Just real financial control.
          </p>
        </div>
      </div>
    </section>
  );
}

function Values() {
  const [ref, vis] = useInView();
  const values = [
    {
      icon: "🎯",
      title: "Industry First",
      desc: "We don't build generic tools. Every product is designed around how a specific industry actually operates.",
    },
    {
      icon: "⚡",
      title: "Simplicity at Scale",
      desc: "Powerful features that feel simple. Our goal is a 60-second setup, not a 60-day implementation.",
    },
    {
      icon: "🌍",
      title: "Built for Emerging Markets",
      desc: "Designed for Pakistan, UAE, India — and every market where businesses are underserved by legacy software.",
    },
    {
      icon: "💪",
      title: "Founder-Driven",
      desc: "We're not a faceless startup. You can reach our founder. We care deeply about our customers' success.",
    },
  ];

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
              fontSize: "clamp(32px,4vw,48px)",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-1.5px",
              margin: 0,
            }}
          >
            Our Values
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {values.map((val, i) => (
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
              <div style={{ fontSize: 40, marginBottom: 16 }}>{val.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "white", margin: "0 0 10px" }}>
                {val.title}
              </h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0, lineHeight: 1.7 }}>
                {val.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Team() {
  const [ref, vis] = useInView();
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
          maxWidth: 1100,
          margin: "0 auto",
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(24px)",
          transition: "all .65s ease",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2
            style={{
              fontSize: "clamp(32px,4vw,48px)",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-1.5px",
              margin: 0,
            }}
          >
            The Team
          </h2>
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: 340,
              padding: "36px 32px",
              borderRadius: 24,
              textAlign: "center",
              background: "linear-gradient(145deg,rgba(245,158,11,.08),rgba(239,68,68,.04))",
              border: "1px solid rgba(245,158,11,.2)",
            }}
          >
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                margin: "0 auto 20px",
                background: "linear-gradient(135deg,#f59e0b,#ef4444)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 44,
                fontWeight: 900,
                color: "white",
              }}
            >
              U
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: "white", margin: "0 0 8px" }}>
              Umer Sajjad
            </h3>
            <p style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700, margin: "0 0 14px", letterSpacing: ".04em" }}>
              Founder & CEO
            </p>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,.5)",
                lineHeight: 1.8,
                margin: 0,
              }}
            >
              Building FinovaForge from Lahore, Pakistan. Passionate about making enterprise-grade software accessible to every business.
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: 56,
            padding: "32px",
            borderRadius: 20,
            background: "rgba(255,255,255,.025)",
            border: "1px solid rgba(255,255,255,.07)",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.5)", lineHeight: 1.8, margin: 0 }}>
            We're a small, focused team of builders and thinkers. If you're interested in joining us on this mission,{" "}
            <a
              href="mailto:careers@finovaforge.com"
              style={{
                color: "#f59e0b",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              we'd love to hear from you
            </a>
            .
          </p>
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
          Ready to See FinovaOS in Action?
        </h2>
        <p
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,.5)",
            margin: "0 0 32px",
            lineHeight: 1.7,
          }}
        >
          Learn why thousands of businesses in South Asia trust FinovaOS for their accounting needs.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
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
            Start Free Trial →
          </a>
          <Link
            href="/forge/contact"
            style={{
              display: "inline-block",
              padding: "14px 36px",
              borderRadius: 12,
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.15)",
              color: "white",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              transition: "all .3s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(245,158,11,.1)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(245,158,11,.3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,.08)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,.15)";
            }}
          >
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div style={{ fontFamily: ff, color: "white" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{background:rgb(7,8,15)}
      `}</style>
      <ForgeNav />
      <Hero />
      <Story />
      <Values />
      <Team />
      <CTA />
      <ForgeFooter />
    </div>
  );
}
