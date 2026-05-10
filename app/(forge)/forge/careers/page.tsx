"use client";
import { ForgeNav, ForgeFooter, useInView } from "../../components/shared";

const ff = "'Outfit','DM Sans',sans-serif";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 14px",
        borderRadius: 100,
        background: "rgba(245,158,11,.08)",
        border: "1px solid rgba(245,158,11,.2)",
        fontSize: 11,
        fontWeight: 700,
        color: "#fbbf24",
        letterSpacing: ".08em",
        marginBottom: 20,
      }}
    >
      {children}
    </div>
  );
}

function Hero() {
  return (
    <section
      style={{
        minHeight: "60vh",
        padding: "140px clamp(20px,4vw,48px) 80px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,158,11,.16), transparent)",
        fontFamily: ff,
        position: "relative",
      }}
    >
      <div
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
      <div style={{ maxWidth: 720, position: "relative", zIndex: 1 }}>
        <Chip>CAREERS</Chip>
        <h1
          style={{
            fontSize: "clamp(40px,7vw,68px)",
            fontWeight: 900,
            color: "white",
            letterSpacing: "-2.5px",
            margin: "0 0 24px",
            lineHeight: 1.08,
          }}
        >
          Build something
          <br />
          <span
            style={{
              background: "linear-gradient(135deg,#f59e0b,#ef4444)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            that matters.
          </span>
        </h1>
        <p
          style={{
            fontSize: "clamp(14px,2vw,17px)",
            color: "rgba(255,255,255,.4)",
            lineHeight: 1.8,
            margin: 0,
            maxWidth: 520,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          We&apos;re a small, focused team building software that real businesses depend on. If that excites you,
          we&apos;d love to hear from you.
        </p>
      </div>
    </section>
  );
}

function WhyUs() {
  const [ref, vis] = useInView();
  const perks = [
    {
      icon: "🚀",
      title: "High Impact Work",
      body: "Small team means your work ships fast and reaches real customers quickly. No bureaucracy, no committees.",
    },
    {
      icon: "🧠",
      title: "Ownership Mindset",
      body: "We trust you to own your work end-to-end. You build it, you ship it, you support it.",
    },
    {
      icon: "🌍",
      title: "Global Reach",
      body: "Our software is used by businesses across 40+ countries. The scale is real, the mission is global.",
    },
    {
      icon: "💪",
      title: "Founder Access",
      body: "Work directly with the founder. No layers, no politics. Just good work and honest feedback.",
    },
  ];

  return (
    <section
      style={{
        padding: "100px clamp(20px,4vw,48px)",
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
          transform: vis ? "none" : "translateY(28px)",
          transition: "all .65s ease",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <Chip>WHY FINOVA FORGE</Chip>
          <h2
            style={{
              fontSize: "clamp(28px,4vw,44px)",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-1.5px",
              margin: 0,
            }}
          >
            What it&apos;s like to work here
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
          {perks.map((p, i) => (
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
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = "rgba(245,158,11,.05)";
                el.style.borderColor = "rgba(245,158,11,.2)";
                el.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = "rgba(255,255,255,.025)";
                el.style.borderColor = "rgba(255,255,255,.07)";
                el.style.transform = "translateY(0)";
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 16 }}>{p.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "white", margin: "0 0 10px" }}>{p.title}</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0, lineHeight: 1.75 }}>{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OpenRoles() {
  const [ref, vis] = useInView();
  return (
    <section style={{ padding: "100px clamp(20px,4vw,48px)", fontFamily: ff }}>
      <div
        ref={ref}
        style={{
          maxWidth: 900,
          margin: "0 auto",
          opacity: vis ? 1 : 0,
          transform: vis ? "none" : "translateY(28px)",
          transition: "all .65s ease",
        }}
      >
        <Chip>OPEN ROLES</Chip>
        <h2
          style={{
            fontSize: "clamp(28px,4vw,44px)",
            fontWeight: 900,
            color: "white",
            letterSpacing: "-1.5px",
            margin: "0 0 48px",
          }}
        >
          Current openings
        </h2>

        {/* No roles state */}
        <div
          style={{
            padding: "56px 40px",
            borderRadius: 20,
            background: "rgba(255,255,255,.02)",
            border: "1px dashed rgba(255,255,255,.1)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.4 }}>📭</div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: "rgba(255,255,255,.45)", margin: "0 0 10px" }}>
            No open roles right now
          </h3>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.28)", margin: "0 0 24px", lineHeight: 1.7, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
            We don&apos;t have any open positions at the moment, but we&apos;re always interested in meeting
            talented people. Send us your details and we&apos;ll keep you in mind.
          </p>
          <a
            href="mailto:careers@finovaforge.com"
            style={{
              display: "inline-block",
              padding: "11px 24px",
              borderRadius: 10,
              background: "linear-gradient(135deg,#f59e0b,#ef4444)",
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              textDecoration: "none",
              transition: "all .2s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)")}
          >
            Send Your CV →
          </a>
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
        padding: "60px clamp(20px,4vw,48px) 120px",
        fontFamily: ff,
      }}
    >
      <div
        ref={ref}
        style={{
          maxWidth: 800,
          margin: "0 auto",
          textAlign: "center",
          padding: "56px 40px",
          borderRadius: 24,
          background: "linear-gradient(135deg,rgba(245,158,11,.08),rgba(239,68,68,.04))",
          border: "1px solid rgba(245,158,11,.2)",
          opacity: vis ? 1 : 0,
          transform: vis ? "none" : "translateY(28px)",
          transition: "all .65s ease",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(24px,4vw,36px)",
            fontWeight: 900,
            color: "white",
            margin: "0 0 14px",
            letterSpacing: "-1.5px",
          }}
        >
          Don&apos;t see a fit? Reach out anyway.
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,.45)",
            margin: "0 0 28px",
            lineHeight: 1.75,
          }}
        >
          If you believe you can contribute to what we&apos;re building, we want to hear from you.
        </p>
        <a
          href="mailto:careers@finovaforge.com"
          style={{
            display: "inline-block",
            padding: "13px 28px",
            borderRadius: 11,
            background: "linear-gradient(135deg,#f59e0b,#ef4444)",
            color: "white",
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
            boxShadow: "0 8px 24px rgba(245,158,11,.3)",
            transition: "all .25s",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.transform = "translateY(-2px)";
            el.style.boxShadow = "0 12px 32px rgba(245,158,11,.45)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.transform = "translateY(0)";
            el.style.boxShadow = "0 8px 24px rgba(245,158,11,.3)";
          }}
        >
          careers@finovaforge.com
        </a>
      </div>
    </section>
  );
}

export default function CareersPage() {
  return (
    <div style={{ fontFamily: ff, color: "white" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{background:rgb(7,8,15)}
      `}</style>
      <ForgeNav />
      <Hero />
      <WhyUs />
      <OpenRoles />
      <CTA />
      <ForgeFooter />
    </div>
  );
}
