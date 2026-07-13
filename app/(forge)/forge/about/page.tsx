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
        minHeight: "70vh",
        padding: "clamp(90px,15vw,140px) clamp(20px,4vw,48px) clamp(48px,8vw,80px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,158,11,.18), transparent)",
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
      <div style={{ maxWidth: 800, position: "relative", zIndex: 1 }}>
        <Chip>ABOUT US</Chip>
        <h1
          style={{
            fontSize: "clamp(40px,7vw,72px)",
            fontWeight: 900,
            color: "white",
            letterSpacing: "-2.5px",
            margin: "0 0 24px",
            lineHeight: 1.08,
          }}
        >
          Purpose-built software.
          <br />
          <span
            style={{
              background: "linear-gradient(135deg,#f59e0b,#ef4444)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Global reach.
          </span>
        </h1>
        <p
          style={{
            fontSize: "clamp(15px,2vw,18px)",
            color: "rgba(255,255,255,.4)",
            lineHeight: 1.8,
            maxWidth: 560,
            margin: "0 auto",
          }}
        >
          Finova Forge is on a mission to build software that works the way real businesses actually operate —
          wherever they are in the world.
        </p>
      </div>
    </section>
  );
}

function Story() {
  const [ref, vis] = useInView();
  const chapters = [
    {
      year: "2024",
      title: "The Problem Worth Solving",
      body: "Umer Sajjad looked at the accounting software landscape and saw a massive gap. Enterprise tools were expensive and complex — requiring months to implement. Simple tools lacked the depth growing businesses needed. Millions of companies were still running on spreadsheets and paying the price for it.",
    },
    {
      year: "The Vision",
      title: "Industry-First Software",
      body: "The insight was clear: businesses don't just need accounting software. They need tools that understand their industry, adapt to how they work, and can be set up in minutes, not months. Finova Forge was founded to build exactly that.",
    },
    {
      year: "Today",
      title: "FinovaOS — Our First Answer",
      body: "FinovaOS is our flagship product — a full business management platform covering accounting, inventory, HR, invoicing, and more. It's used by growing companies worldwide. And this is just the beginning.",
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
          maxWidth: 900,
          margin: "0 auto",
          opacity: vis ? 1 : 0,
          transform: vis ? "none" : "translateY(28px)",
          transition: "all .65s ease",
        }}
      >
        <Chip>OUR STORY</Chip>
        <h2
          style={{
            fontSize: "clamp(28px,4vw,44px)",
            fontWeight: 900,
            color: "white",
            letterSpacing: "-1.5px",
            margin: "0 0 56px",
            maxWidth: 440,
          }}
        >
          Why Finova Forge exists
        </h2>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {chapters.map((ch, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                gap: "0 40px",
                paddingBottom: 48,
                position: "relative",
              }}
            >
              {i < chapters.length - 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: 57,
                    top: 28,
                    bottom: 0,
                    width: 1,
                    background: "rgba(245,158,11,.15)",
                  }}
                />
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  paddingTop: 4,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    marginBottom: 8,
                    background: "linear-gradient(135deg,#f59e0b,#ef4444)",
                    boxShadow: "0 0 12px rgba(245,158,11,.4)",
                    alignSelf: "flex-end",
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "rgba(245,158,11,.6)",
                    letterSpacing: ".04em",
                    textAlign: "right",
                  }}
                >
                  {ch.year}
                </span>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "white",
                    margin: "0 0 12px",
                    letterSpacing: "-.4px",
                  }}
                >
                  {ch.title}
                </h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", lineHeight: 1.85, margin: 0 }}>
                  {ch.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Values() {
  const [ref, vis] = useInView();
  const vals = [
    {
      icon: "🎯",
      title: "Industry First",
      body: "Generic tools serve nobody well. We build specifically for how each industry actually operates — so the software fits from day one.",
    },
    {
      icon: "⚡",
      title: "Zero Complexity",
      body: "Powerful doesn't have to mean complicated. Our goal is a 60-second setup, not a 60-day implementation.",
    },
    {
      icon: "🌍",
      title: "Built for Real Businesses",
      body: "We build for businesses underserved by legacy software — wherever they operate in the world.",
    },
    {
      icon: "💪",
      title: "Founder-Driven",
      body: "We're not a faceless startup. You can reach our founder. We care deeply about every customer's success.",
    },
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
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <Chip>OUR VALUES</Chip>
          <h2
            style={{
              fontSize: "clamp(28px,4vw,48px)",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-1.5px",
              margin: 0,
            }}
          >
            What we believe in
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
          {vals.map((v, i) => (
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
              <div style={{ fontSize: 36, marginBottom: 16 }}>{v.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "white", margin: "0 0 10px" }}>{v.title}</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0, lineHeight: 1.75 }}>{v.body}</p>
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
        padding: "100px clamp(20px,4vw,48px)",
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
          transform: vis ? "none" : "translateY(28px)",
          transition: "all .65s ease",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <Chip>THE TEAM</Chip>
          <h2
            style={{
              fontSize: "clamp(28px,4vw,48px)",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-1.5px",
              margin: 0,
            }}
          >
            The people behind the product
          </h2>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
          {/* Founder card */}
          <div
            style={{
              width: 320,
              padding: "36px 32px",
              borderRadius: 24,
              textAlign: "center",
              background: "linear-gradient(145deg,rgba(245,158,11,.08),rgba(239,68,68,.04))",
              border: "1px solid rgba(245,158,11,.2)",
            }}
          >
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: "50%",
                margin: "0 auto 20px",
                background: "linear-gradient(135deg,#f59e0b,#ef4444)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                fontWeight: 900,
                color: "white",
                boxShadow: "0 8px 28px rgba(245,158,11,.25)",
              }}
            >
              U
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 900, color: "white", margin: "0 0 6px" }}>Umer Sajjad</h3>
            <p
              style={{
                fontSize: 12,
                color: "#f59e0b",
                fontWeight: 700,
                margin: "0 0 14px",
                letterSpacing: ".05em",
                textTransform: "uppercase",
              }}
            >
              Founder & CEO
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", lineHeight: 1.8, margin: 0 }}>
              Passionate about building software that fits how real businesses work — without the enterprise complexity.
            </p>
          </div>

          {/* Hiring card */}
          <div
            style={{
              width: 320,
              padding: "36px 32px",
              borderRadius: 24,
              textAlign: "center",
              background: "rgba(255,255,255,.02)",
              border: "1px dashed rgba(255,255,255,.1)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.3 }}>+</div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,.4)", margin: "0 0 8px" }}>
              We&apos;re Hiring
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,.25)",
                margin: "0 0 20px",
                lineHeight: 1.7,
              }}
            >
              Join a focused team building software the world actually needs.
            </p>
            <a
              href="mailto:careers@finovaforge.com"
              style={{
                fontSize: 12,
                color: "rgba(245,158,11,.6)",
                fontWeight: 700,
                textDecoration: "none",
                transition: "color .2s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#f59e0b")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(245,158,11,.6)")}
            >
              careers@finovaforge.com →
            </a>
          </div>
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
          Ready to see FinovaOS in action?
        </h2>
        <p
          style={{
            fontSize: 15,
            color: "rgba(255,255,255,.45)",
            margin: "0 0 32px",
            lineHeight: 1.75,
          }}
        >
          The product built by Finova Forge — for businesses worldwide.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
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
            href="/forge/contact"
            style={{
              padding: "13px 28px",
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
