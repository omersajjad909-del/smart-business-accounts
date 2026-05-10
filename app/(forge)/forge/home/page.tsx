"use client";
import Link from "next/link";
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
        minHeight: "100vh",
        padding: "140px clamp(20px,4vw,48px) 100px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        background: `
          radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,158,11,.18), transparent),
          radial-gradient(ellipse 50% 80% at 80% 50%, rgba(239,68,68,.06), transparent)
        `,
        fontFamily: ff,
        position: "relative",
      }}
    >
      {/* Subtle grid */}
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

      <div style={{ maxWidth: 860, position: "relative", zIndex: 1 }}>
        <Chip>SOFTWARE COMPANY</Chip>

        <h1
          style={{
            fontSize: "clamp(44px,8vw,80px)",
            fontWeight: 900,
            color: "white",
            letterSpacing: "-3px",
            margin: "0 0 28px",
            lineHeight: 1.05,
          }}
        >
          We Build Software
          <br />
          <span
            style={{
              background: "linear-gradient(135deg,#f59e0b,#ef4444)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Businesses Run On
          </span>
        </h1>

        <p
          style={{
            fontSize: "clamp(15px,2vw,19px)",
            color: "rgba(255,255,255,.45)",
            margin: "0 auto 48px",
            lineHeight: 1.75,
            maxWidth: 640,
          }}
        >
          Finova Forge creates intelligent, industry-specific tools for growing companies. Our flagship product, FinovaOS,
          replaces spreadsheets and legacy systems for businesses worldwide.
        </p>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="https://finovaos.app"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "14px 32px",
              borderRadius: 12,
              background: "linear-gradient(135deg,#f59e0b,#ef4444)",
              color: "white",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              boxShadow: "0 8px 28px rgba(245,158,11,.3)",
              transition: "all .25s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.transform = "translateY(-2px)";
              el.style.boxShadow = "0 12px 36px rgba(245,158,11,.45)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.transform = "translateY(0)";
              el.style.boxShadow = "0 8px 28px rgba(245,158,11,.3)";
            }}
          >
            Explore FinovaOS →
          </a>
          <Link
            href="/forge/about"
            style={{
              padding: "14px 32px",
              borderRadius: 12,
              background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.12)",
              color: "rgba(255,255,255,.8)",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              transition: "all .25s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = "rgba(245,158,11,.08)";
              el.style.borderColor = "rgba(245,158,11,.25)";
              el.style.color = "white";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = "rgba(255,255,255,.04)";
              el.style.borderColor = "rgba(255,255,255,.12)";
              el.style.color = "rgba(255,255,255,.8)";
            }}
          >
            Our Story
          </Link>
        </div>

        <div
          style={{
            marginTop: 72,
            display: "flex",
            gap: 48,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "Founded", value: "2024" },
            { label: "Countries Served", value: "40+" },
            { label: "Flagship Product", value: "FinovaOS" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "clamp(22px,3vw,32px)",
                  fontWeight: 900,
                  color: "white",
                  letterSpacing: "-1px",
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,.3)",
                  fontWeight: 600,
                  letterSpacing: ".04em",
                  marginTop: 5,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductSpotlight() {
  const [ref, vis] = useInView();
  const features = [
    { icon: "📊", label: "Real-Time Accounting" },
    { icon: "🏦", label: "Bank Reconciliation" },
    { icon: "📝", label: "Expense Vouchers" },
    { icon: "💰", label: "Multi-Account Mgmt" },
    { icon: "🔐", label: "Role-Based Access" },
    { icon: "📈", label: "Reports & Analytics" },
    { icon: "🧾", label: "Invoicing & Billing" },
    { icon: "🔗", label: "API & Integrations" },
  ];

  return (
    <section style={{ padding: "100px clamp(20px,4vw,48px)", fontFamily: ff }}>
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
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <Chip>OUR FLAGSHIP PRODUCT</Chip>
          <h2
            style={{
              fontSize: "clamp(32px,5vw,56px)",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-2px",
              margin: "0 0 16px",
              lineHeight: 1.08,
            }}
          >
            Introducing FinovaOS
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,.4)",
              maxWidth: 560,
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            The all-in-one business management platform built for growing companies. Real-time insights, zero enterprise
            complexity.
          </p>
        </div>

        <div
          style={{
            borderRadius: 24,
            background: "linear-gradient(145deg,rgba(245,158,11,.07),rgba(239,68,68,.04),rgba(0,0,0,.2))",
            border: "1px solid rgba(245,158,11,.18)",
            padding: "clamp(28px,4vw,48px)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
              gap: 48,
              alignItems: "center",
            }}
          >
            {/* Copy */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 13,
                    background: "linear-gradient(135deg,#f59e0b,#ef4444)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 900,
                    color: "white",
                    boxShadow: "0 6px 20px rgba(245,158,11,.3)",
                  }}
                >
                  OS
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "white" }}>FinovaOS</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", fontWeight: 600 }}>
                    Business Management Platform
                  </div>
                </div>
              </div>
              <p
                style={{
                  fontSize: 14.5,
                  color: "rgba(255,255,255,.5)",
                  lineHeight: 1.85,
                  margin: "0 0 28px",
                }}
              >
                Replace your spreadsheets and fragmented tools with a single, intelligent platform. From accounting to
                inventory, invoicing to payroll — FinovaOS covers it all with industry-specific workflows built for the
                way you actually work.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a
                  href="https://finovaos.app"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: "11px 22px",
                    borderRadius: 10,
                    background: "linear-gradient(135deg,#f59e0b,#ef4444)",
                    color: "white",
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: "none",
                    boxShadow: "0 4px 16px rgba(245,158,11,.3)",
                    transition: "all .2s",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)")}
                >
                  Launch FinovaOS →
                </a>
                <Link
                  href="/forge/products"
                  style={{
                    padding: "11px 22px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.12)",
                    color: "rgba(255,255,255,.7)",
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: "none",
                    transition: "all .2s",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = "rgba(255,255,255,.1)";
                    el.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = "rgba(255,255,255,.06)";
                    el.style.color = "rgba(255,255,255,.7)";
                  }}
                >
                  View Details
                </Link>
              </div>
            </div>

            {/* Feature grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {features.map((f, i) => (
                <div
                  key={i}
                  style={{
                    padding: "13px 15px",
                    borderRadius: 11,
                    background: "rgba(255,255,255,.03)",
                    border: "1px solid rgba(255,255,255,.06)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "all .2s",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.background = "rgba(245,158,11,.06)";
                    el.style.borderColor = "rgba(245,158,11,.18)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.background = "rgba(255,255,255,.03)";
                    el.style.borderColor = "rgba(255,255,255,.06)";
                  }}
                >
                  <span style={{ fontSize: 18 }}>{f.icon}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,.6)" }}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Principles() {
  const [ref, vis] = useInView();
  const pillars = [
    {
      number: "01",
      title: "Industry First",
      body: "We don't build generic tools. Every product is shaped around how a specific industry actually operates — so there's no six-month customization project before you can get to work.",
    },
    {
      number: "02",
      title: "Zero Complexity",
      body: "Enterprise-grade power without the enterprise overhead. Setup in minutes, not months. Your team should be productive from the very first day.",
    },
    {
      number: "03",
      title: "Built to Scale",
      body: "Start with one user, grow to a full organization. Our architecture scales with your ambition — no painful migrations, no hitting ceilings.",
    },
  ];

  return (
    <section
      style={{
        padding: "100px clamp(20px,4vw,48px)",
        background: "rgba(255,255,255,.015)",
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
        <div style={{ marginBottom: 64 }}>
          <Chip>HOW WE BUILD</Chip>
          <h2
            style={{
              fontSize: "clamp(28px,4vw,48px)",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-1.5px",
              margin: 0,
              maxWidth: 480,
            }}
          >
            Three principles we never compromise on
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24 }}>
          {pillars.map((p, i) => (
            <div
              key={i}
              style={{
                padding: "36px 32px",
                borderRadius: 20,
                background: "rgba(255,255,255,.025)",
                border: "1px solid rgba(255,255,255,.07)",
                transition: "all .3s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = "rgba(245,158,11,.04)";
                el.style.borderColor = "rgba(245,158,11,.18)";
                el.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = "rgba(255,255,255,.025)";
                el.style.borderColor = "rgba(255,255,255,.07)";
                el.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: "rgba(245,158,11,.4)",
                  letterSpacing: ".04em",
                  marginBottom: 16,
                }}
              >
                {p.number}
              </div>
              <h3
                style={{
                  fontSize: 19,
                  fontWeight: 900,
                  color: "white",
                  margin: "0 0 14px",
                  letterSpacing: "-.5px",
                }}
              >
                {p.title}
              </h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0, lineHeight: 1.75 }}>{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutSnippet() {
  const [ref, vis] = useInView();
  return (
    <section style={{ padding: "100px clamp(20px,4vw,48px)", fontFamily: ff }}>
      <div
        ref={ref}
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
          gap: 64,
          alignItems: "center",
          opacity: vis ? 1 : 0,
          transform: vis ? "none" : "translateY(28px)",
          transition: "all .65s ease",
        }}
      >
        <div>
          <Chip>WHO WE ARE</Chip>
          <h2
            style={{
              fontSize: "clamp(28px,4vw,48px)",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-1.5px",
              margin: "0 0 20px",
              lineHeight: 1.1,
            }}
          >
            A focused team building software the world actually needs
          </h2>
          <p
            style={{
              fontSize: 14.5,
              color: "rgba(255,255,255,.45)",
              lineHeight: 1.85,
              margin: "0 0 24px",
            }}
          >
            Founded in 2024, Finova Forge started with a simple observation: the best software for growing businesses
            didn't exist. Enterprise tools were too complex and expensive. Simple tools lacked depth.
          </p>
          <p
            style={{
              fontSize: 14.5,
              color: "rgba(255,255,255,.45)",
              lineHeight: 1.85,
              margin: "0 0 32px",
            }}
          >
            We set out to close that gap. FinovaOS is our first answer — and we're just getting started.
          </p>
          <Link
            href="/forge/about"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "rgba(255,255,255,.55)",
              textDecoration: "none",
              transition: "color .2s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "white")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,.55)")}
          >
            Read our full story →
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { val: "2024", label: "Year Founded" },
            { val: "40+", label: "Countries Served" },
            { val: "1", label: "Flagship Product" },
            { val: "∞", label: "Ambition" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                padding: "28px 24px",
                borderRadius: 16,
                background: "rgba(255,255,255,.025)",
                border: "1px solid rgba(255,255,255,.07)",
                textAlign: "center",
                transition: "all .3s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = "rgba(245,158,11,.04)";
                el.style.borderColor = "rgba(245,158,11,.18)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = "rgba(255,255,255,.025)";
                el.style.borderColor = "rgba(255,255,255,.07)";
              }}
            >
              <div
                style={{
                  fontSize: "clamp(28px,3vw,40px)",
                  fontWeight: 900,
                  color: "white",
                  letterSpacing: "-1.5px",
                  marginBottom: 6,
                }}
              >
                {s.val}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", fontWeight: 600, letterSpacing: ".04em" }}>
                {s.label}
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
    <section style={{ padding: "100px clamp(20px,4vw,48px) 120px", fontFamily: ff }}>
      <div
        ref={ref}
        style={{
          maxWidth: 860,
          margin: "0 auto",
          textAlign: "center",
          padding: "clamp(48px,6vw,72px) clamp(28px,5vw,56px)",
          borderRadius: 28,
          background: "linear-gradient(135deg,rgba(245,158,11,.09),rgba(239,68,68,.05))",
          border: "1px solid rgba(245,158,11,.2)",
          position: "relative",
          overflow: "hidden",
          opacity: vis ? 1 : 0,
          transform: vis ? "none" : "translateY(28px)",
          transition: "all .65s ease",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle,rgba(245,158,11,.14),transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <Chip>GET STARTED</Chip>
        <h2
          style={{
            fontSize: "clamp(28px,4vw,44px)",
            fontWeight: 900,
            color: "white",
            margin: "0 0 16px",
            letterSpacing: "-1.5px",
          }}
        >
          Ready to see FinovaOS in action?
        </h2>
        <p
          style={{
            fontSize: 15,
            color: "rgba(255,255,255,.45)",
            margin: "0 0 36px",
            lineHeight: 1.75,
          }}
        >
          See FinovaOS in action — the all-in-one business management platform.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="https://finovaos.app"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "14px 32px",
              borderRadius: 12,
              background: "linear-gradient(135deg,#f59e0b,#ef4444)",
              color: "white",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              boxShadow: "0 8px 28px rgba(245,158,11,.3)",
              transition: "all .25s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.transform = "translateY(-2px)";
              el.style.boxShadow = "0 12px 36px rgba(245,158,11,.45)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.transform = "translateY(0)";
              el.style.boxShadow = "0 8px 28px rgba(245,158,11,.3)";
            }}
          >
            Open FinovaOS →
          </a>
          <Link
            href="/forge/products"
            style={{
              padding: "14px 32px",
              borderRadius: 12,
              background: "rgba(255,255,255,.06)",
              border: "1px solid rgba(255,255,255,.12)",
              color: "rgba(255,255,255,.8)",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              transition: "all .25s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = "rgba(255,255,255,.1)";
              el.style.color = "white";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = "rgba(255,255,255,.06)";
              el.style.color = "rgba(255,255,255,.8)";
            }}
          >
            View Products
          </Link>
        </div>
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
      <ProductSpotlight />
      <Principles />
      <AboutSnippet />
      <CTA />
      <ForgeFooter />
    </div>
  );
}
