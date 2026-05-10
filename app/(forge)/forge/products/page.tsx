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
        <Chip>OUR PRODUCTS</Chip>
        <h1
          style={{
            fontSize: "clamp(40px,7vw,70px)",
            fontWeight: 900,
            color: "white",
            letterSpacing: "-2.5px",
            margin: "0 0 20px",
            lineHeight: 1.08,
          }}
        >
          Software built to
          <br />
          <span
            style={{
              background: "linear-gradient(135deg,#f59e0b,#ef4444)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            move your business forward
          </span>
        </h1>
        <p
          style={{
            fontSize: "clamp(14px,2vw,17px)",
            color: "rgba(255,255,255,.4)",
            lineHeight: 1.8,
            margin: 0,
          }}
        >
          Purpose-built tools for growing businesses. We start with the hardest problem — financial management —
          and go from there.
        </p>
      </div>
    </section>
  );
}

function FinovaOSSection() {
  const [ref, vis] = useInView();
  const modules = [
    { icon: "📊", title: "Accounting", desc: "Full double-entry accounting, chart of accounts, journal entries" },
    { icon: "🏦", title: "Bank Reconciliation", desc: "Auto-match transactions, spot discrepancies instantly" },
    { icon: "📝", title: "Expense Vouchers", desc: "Record, categorize, and approve every business expense" },
    { icon: "🧾", title: "Invoicing", desc: "Professional invoices, payment tracking, auto reminders" },
    { icon: "📦", title: "Inventory", desc: "Stock management, purchase orders, GRN tracking" },
    { icon: "💰", title: "Payroll", desc: "Salary processing, deductions, and payslip generation" },
    { icon: "📈", title: "Reports & Analytics", desc: "P&L, balance sheet, cash flow — all real-time" },
    { icon: "🔐", title: "Role-Based Access", desc: "Granular permission control for every team member" },
    { icon: "🌍", title: "Multi-Currency", desc: "40+ currencies with automatic exchange rates" },
    { icon: "👥", title: "HR Management", desc: "Employee records, attendance, and leave tracking" },
    { icon: "🤝", title: "CRM", desc: "Customer relationships, follow-ups, sales pipeline" },
    { icon: "🔗", title: "API Access", desc: "Connect your existing tools and third-party systems" },
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
        {/* Header row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 48,
            flexWrap: "wrap",
            gap: 24,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "linear-gradient(135deg,#f59e0b,#ef4444)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 900,
                  color: "white",
                  boxShadow: "0 8px 24px rgba(245,158,11,.3)",
                }}
              >
                OS
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "white", letterSpacing: "-.6px" }}>FinovaOS</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)", fontWeight: 600 }}>
                  Business Management Platform
                </div>
              </div>
              <div
                style={{
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: "rgba(34,197,94,.12)",
                  border: "1px solid rgba(34,197,94,.25)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#4ade80",
                }}
              >
                LIVE
              </div>
            </div>
            <p
              style={{
                fontSize: 14.5,
                color: "rgba(255,255,255,.45)",
                lineHeight: 1.8,
                maxWidth: 580,
                margin: 0,
              }}
            >
              Replace your spreadsheets and fragmented tools with a single intelligent system — built for the way
              your industry actually works. From the first transaction to your year-end report, FinovaOS has you
              covered.
            </p>
          </div>
          <a
            href="https://finovaos.app"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "13px 28px",
              borderRadius: 12,
              background: "linear-gradient(135deg,#f59e0b,#ef4444)",
              color: "white",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              boxShadow: "0 8px 24px rgba(245,158,11,.3)",
              transition: "all .25s",
              flexShrink: 0,
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
            Launch FinovaOS →
          </a>
        </div>

        {/* Modules grid */}
        <div
          style={{
            borderRadius: 24,
            background: "linear-gradient(145deg,rgba(245,158,11,.05),rgba(239,68,68,.03))",
            border: "1px solid rgba(245,158,11,.14)",
            padding: "36px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(255,255,255,.25)",
              textTransform: "uppercase",
              letterSpacing: ".1em",
              marginBottom: 24,
            }}
          >
            Included Modules
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
              gap: 12,
            }}
          >
            {modules.map((m, i) => (
              <div
                key={i}
                style={{
                  padding: "16px 18px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,.03)",
                  border: "1px solid rgba(255,255,255,.06)",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  transition: "all .2s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = "rgba(245,158,11,.06)";
                  el.style.borderColor = "rgba(245,158,11,.16)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = "rgba(255,255,255,.03)";
                  el.style.borderColor = "rgba(255,255,255,.06)";
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>{m.icon}</span>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "rgba(255,255,255,.8)",
                      marginBottom: 3,
                    }}
                  >
                    {m.title}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", lineHeight: 1.6 }}>{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Roadmap() {
  const [ref, vis] = useInView();
  const upcoming = [
    {
      icon: "🏥",
      name: "FinovaHealth",
      desc: "Practice management for clinics, hospitals, and healthcare providers. Patient records, billing, appointments.",
      tag: "Coming Soon",
    },
    {
      icon: "🏗️",
      name: "FinovaConstruct",
      desc: "Project costing, contractor management, material tracking, and billing for construction businesses.",
      tag: "Coming Soon",
    },
    {
      icon: "🎓",
      name: "FinovaEdu",
      desc: "Student enrollment, fee collection, academic reporting, and HR for schools and training institutes.",
      tag: "Planned",
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
        <Chip>WHAT&apos;S NEXT</Chip>
        <h2
          style={{
            fontSize: "clamp(28px,4vw,44px)",
            fontWeight: 900,
            color: "white",
            letterSpacing: "-1.5px",
            margin: "0 0 12px",
          }}
        >
          The Product Roadmap
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,.35)",
            marginBottom: 48,
            maxWidth: 520,
          }}
        >
          FinovaOS is the first in a family of industry-specific products. Here&apos;s what we&apos;re building next.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
          {upcoming.map((p, i) => (
            <div
              key={i}
              style={{
                padding: "32px 28px",
                borderRadius: 20,
                background: "rgba(255,255,255,.018)",
                border: "1px solid rgba(255,255,255,.07)",
                transition: "all .3s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = "rgba(255,255,255,.03)";
                el.style.borderColor = "rgba(255,255,255,.12)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = "rgba(255,255,255,.018)";
                el.style.borderColor = "rgba(255,255,255,.07)";
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 36 }}>{p.icon}</span>
                <span
                  style={{
                    padding: "3px 9px",
                    borderRadius: 6,
                    background: "rgba(255,255,255,.06)",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "rgba(255,255,255,.3)",
                    letterSpacing: ".06em",
                  }}
                >
                  {p.tag}
                </span>
              </div>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: "rgba(255,255,255,.5)",
                  margin: "0 0 10px",
                }}
              >
                {p.name}
              </h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.28)", margin: 0, lineHeight: 1.7 }}>{p.desc}</p>
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
      desc: "For freelancers and small teams",
      features: ["Up to 5 bank accounts", "Basic reporting", "1 user seat", "Email support"],
      featured: false,
    },
    {
      name: "Professional",
      price: "$79",
      period: "/month",
      desc: "For growing businesses",
      features: ["Unlimited accounts", "Advanced reports", "5 user seats", "Priority support", "API access"],
      featured: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      desc: "For large organizations",
      features: ["Everything in Professional", "Unlimited users", "Custom integrations", "Dedicated support", "SLA guarantee"],
      featured: false,
    },
  ];

  return (
    <section style={{ padding: "100px clamp(20px,4vw,48px)", fontFamily: ff }}>
      <div
        ref={ref}
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          opacity: vis ? 1 : 0,
          transform: vis ? "none" : "translateY(28px)",
          transition: "all .65s ease",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <Chip>PRICING</Chip>
          <h2
            style={{
              fontSize: "clamp(28px,4vw,48px)",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-1.5px",
              margin: "0 0 12px",
            }}
          >
            Simple, transparent pricing
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.35)", margin: 0 }}>
            Choose the plan that fits your business.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
          {plans.map((plan, i) => (
            <div
              key={i}
              style={{
                padding: "36px 28px",
                borderRadius: 20,
                background: plan.featured
                  ? "linear-gradient(145deg,rgba(245,158,11,.1),rgba(239,68,68,.06))"
                  : "rgba(255,255,255,.025)",
                border: plan.featured ? "1px solid rgba(245,158,11,.28)" : "1px solid rgba(255,255,255,.07)",
                position: "relative",
                transition: "all .3s",
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
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    padding: "4px 16px",
                    borderRadius: 20,
                    background: "linear-gradient(135deg,#f59e0b,#ef4444)",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "white",
                    whiteSpace: "nowrap",
                  }}
                >
                  MOST POPULAR
                </div>
              )}
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "white", margin: "0 0 6px" }}>{plan.name}</h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)", margin: "0 0 20px" }}>{plan.desc}</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
                <span style={{ fontSize: 40, fontWeight: 900, color: "white", letterSpacing: "-2px" }}>
                  {plan.price}
                </span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>{plan.period}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px" }}>
                {plan.features.map((f, j) => (
                  <li
                    key={j}
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,.55)",
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ color: "#f59e0b", fontSize: 12 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="https://finovaos.app"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "11px 20px",
                  borderRadius: 10,
                  background: plan.featured ? "linear-gradient(135deg,#f59e0b,#ef4444)" : "rgba(255,255,255,.07)",
                  border: plan.featured ? "none" : "1px solid rgba(255,255,255,.12)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: "none",
                  transition: "all .25s",
                }}
                onMouseEnter={(e) => {
                  if (!plan.featured)
                    (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,.12)";
                }}
                onMouseLeave={(e) => {
                  if (!plan.featured)
                    (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,.07)";
                }}
              >
                {plan.name === "Enterprise" ? "Contact Sales" : "Get Started"} →
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
    <section style={{ padding: "100px clamp(20px,4vw,48px) 120px", fontFamily: ff }}>
      <div
        ref={ref}
        style={{
          maxWidth: 800,
          margin: "0 auto",
          textAlign: "center",
          padding: "clamp(48px,6vw,68px) clamp(28px,5vw,48px)",
          borderRadius: 28,
          background: "linear-gradient(135deg,rgba(245,158,11,.09),rgba(239,68,68,.05))",
          border: "1px solid rgba(245,158,11,.2)",
          opacity: vis ? 1 : 0,
          transform: vis ? "none" : "translateY(28px)",
          transition: "all .65s ease",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(26px,4vw,40px)",
            fontWeight: 900,
            color: "white",
            margin: "0 0 16px",
            letterSpacing: "-1.5px",
          }}
        >
          Ready to get started with FinovaOS?
        </h2>
        <p
          style={{
            fontSize: 15,
            color: "rgba(255,255,255,.45)",
            margin: "0 0 32px",
            lineHeight: 1.75,
          }}
        >
          The all-in-one business management platform for growing companies worldwide.
        </p>
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
            display: "inline-block",
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
      <FinovaOSSection />
      <Roadmap />
      <Pricing />
      <CTA />
      <ForgeFooter />
    </div>
  );
}
