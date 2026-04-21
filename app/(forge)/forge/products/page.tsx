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
            OUR PRODUCTS
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
          FinovaOS
        </h1>

        <p
          style={{
            fontSize: "clamp(16px,2vw,20px)",
            color: "rgba(255,255,255,.4)",
            margin: "0 0 48px",
            lineHeight: 1.7,
          }}
        >
          The accounting software built for businesses in South Asia. Real-time insights, zero complexity.
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
          Open FinovaOS Dashboard →
        </a>
      </div>
    </section>
  );
}

function Features() {
  const [ref, vis] = useInView();
  const features = [
    {
      title: "Expense Vouchers",
      desc: "Record every business expense with full audit trails. Categorize, approve, and reconcile—all in seconds.",
      icon: "📝",
    },
    {
      title: "Bank Reconciliation",
      desc: "Match transactions automatically. Spot discrepancies instantly. Never lose track of cash flow.",
      icon: "🏦",
    },
    {
      title: "Ledgers & Reports",
      desc: "Complete financial visibility. P&L, balance sheets, cash flow statements—generated in real-time.",
      icon: "📊",
    },
    {
      title: "Multi-Account Management",
      desc: "Manage multiple bank accounts, cash accounts, and payment methods from a single dashboard.",
      icon: "💰",
    },
    {
      title: "Role-Based Access",
      desc: "Control who sees what. Assign permissions to your team—CEO, accountant, manager, employee.",
      icon: "🔐",
    },
    {
      title: "Export & Integration",
      desc: "Export data to CSV, PDF, or integrate with your existing tools via our API.",
      icon: "🔗",
    },
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
            Core Features
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,.4)",
              marginTop: 16,
              maxWidth: 600,
              margin: "16px auto 0",
            }}
          >
            Everything you need to manage your business finances with confidence.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          {features.map((feat, i) => (
            <div
              key={i}
              style={{
                padding: "32px 28px",
                borderRadius: 20,
                background: "rgba(255,255,255,.025)",
                border: "1px solid rgba(255,255,255,.07)",
                transition: "all .3s",
                display: "flex",
                flexDirection: "column",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "rgba(245,158,11,.05)";
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(245,158,11,.2)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,.025)";
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,.07)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 14 }}>{feat.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "white", margin: "0 0 10px" }}>
                {feat.title}
              </h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0, lineHeight: 1.6 }}>
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const [ref, vis] = useInView();
  const plans = [
    {
      name: "Starter",
      price: "$29",
      period: "/month",
      desc: "Perfect for freelancers and small teams",
      features: ["Up to 5 accounts", "Basic reporting", "1 user seat", "Email support"],
      cta: "Start Free Trial",
    },
    {
      name: "Professional",
      price: "$79",
      period: "/month",
      desc: "For growing businesses",
      features: ["Unlimited accounts", "Advanced reports", "5 user seats", "Priority support", "API access"],
      cta: "Start Free Trial",
      featured: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      desc: "For large organizations",
      features: ["Everything in Professional", "Unlimited users", "Custom integrations", "Dedicated support", "SLA guarantee"],
      cta: "Contact Sales",
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
              fontSize: "clamp(28px,4vw,44px)",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-1.5px",
              margin: 0,
            }}
          >
            Simple Pricing
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,.4)",
              marginTop: 16,
              maxWidth: 600,
              margin: "16px auto 0",
            }}
          >
            Choose the plan that fits your business. All plans include a free 14-day trial.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {plans.map((plan, i) => (
            <div
              key={i}
              style={{
                padding: "40px 32px",
                borderRadius: 20,
                background: plan.featured
                  ? "linear-gradient(135deg,rgba(245,158,11,.12),rgba(239,68,68,.06))"
                  : "rgba(255,255,255,.025)",
                border: plan.featured
                  ? "1px solid rgba(245,158,11,.3)"
                  : "1px solid rgba(255,255,255,.07)",
                transition: "all .3s",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              }}
            >
              {plan.featured && (
                <div
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    padding: "4px 12px",
                    borderRadius: 20,
                    background: "rgba(245,158,11,.2)",
                    border: "1px solid rgba(245,158,11,.3)",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#fbbf24",
                  }}
                >
                  MOST POPULAR
                </div>
              )}
              <h3 style={{ fontSize: 20, fontWeight: 800, color: "white", margin: "0 0 8px" }}>
                {plan.name}
              </h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: "0 0 20px" }}>
                {plan.desc}
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
                <span style={{ fontSize: 40, fontWeight: 900, color: "white" }}>
                  {plan.price}
                </span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>
                  {plan.period}
                </span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", flex: 1 }}>
                {plan.features.map((feat, j) => (
                  <li
                    key={j}
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,.6)",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ color: "#fbbf24" }}>✓</span>
                    {feat}
                  </li>
                ))}
              </ul>
              <a
                href="https://finovaos.app"
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  background: plan.featured
                    ? "linear-gradient(135deg,#f59e0b,#ef4444)"
                    : "rgba(255,255,255,.08)",
                  border: plan.featured
                    ? "none"
                    : "1px solid rgba(255,255,255,.15)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: "none",
                  textAlign: "center",
                  transition: "all .3s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!plan.featured) {
                    (e.currentTarget as HTMLAnchorElement).style.background = "rgba(245,158,11,.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!plan.featured) {
                    (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,.08)";
                  }
                }}
              >
                {plan.cta} →
              </a>
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
        background: "rgba(255,255,255,.01)",
        borderTop: "1px solid rgba(255,255,255,.05)",
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
          Start Your Free Trial
        </h2>
        <p
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,.5)",
            margin: "0 0 32px",
            lineHeight: 1.7,
          }}
        >
          14 days free. No credit card required. Full access to all features.
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
          Try FinovaOS Now →
        </a>
      </div>
    </section>
  );
}

export default function ProductsPage() {
  return (
    <div style={{ fontFamily: ff, color: "white" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{background:rgb(7,8,15)}
      `}</style>
      <ForgeNav />
      <Hero />
      <Features />
      <Pricing />
      <CTA />
      <ForgeFooter />
    </div>
  );
}
