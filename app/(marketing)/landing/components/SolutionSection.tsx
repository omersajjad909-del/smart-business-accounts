"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVis(true);
          obs.disconnect();
        }
      },
      { threshold: 0.08 },
    );

    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return [ref, vis] as const;
}

const PAINS = [
  {
    problem: "Month-end takes a week",
    solution: "Books close in hours with auto-reconciliation.",
    icon: "📓",
    color: "#f87171",
  },
  {
    problem: "Spreadsheets are full of mistakes",
    solution: "A structured accounting engine keeps every entry aligned.",
    icon: "📊",
    color: "#fbbf24",
  },
  {
    problem: "Cash flow is impossible to track",
    solution: "Live dashboards update with every sale, purchase, and payment.",
    icon: "💸",
    color: "#f97316",
  },
  {
    problem: "Stock never matches invoices",
    solution: "Inventory moves with real transactions in real time.",
    icon: "📦",
    color: "#fb7185",
  },
  {
    problem: "Payroll and teams run manually",
    solution: "Attendance, payroll, and finance stay connected in one place.",
    icon: "👥",
    color: "#c084fc",
  },
  {
    problem: "Branch performance is unclear",
    solution: "See business-wide and branch-wise control from a single workspace.",
    icon: "🏢",
    color: "#38bdf8",
  },
] as const;

const FOCUSED_INDUSTRIES = [
  {
    icon: "🏪",
    label: "Retail Store",
    slug: "retail",
    color: "#ec4899",
    audience: "For marts, stores, and growing multi-branch retail businesses.",
    desc: "Finova helps retail teams sell faster, track stock branch-wise, run promotions, manage customer loyalty, and print receipts in the right format.",
    modules: ["POS Terminal", "Product Catalog", "Stock Transfer", "Branch Reports"],
    flow: ["Receive stock", "Sell at counter", "Control branches", "Review daily performance"],
  },
  {
    icon: "📦",
    label: "Trading / Wholesale",
    slug: "trading",
    color: "#38bdf8",
    audience: "For wholesalers and trading businesses handling procurement and dispatch.",
    desc: "Run quotations, convert orders, manage procurement, control inventory, and follow outstanding balances from one trading-focused desk.",
    modules: ["Order Desk", "Procurement", "Dispatch Board", "Outstandings"],
    flow: ["Capture inquiry", "Confirm order", "Procure and dispatch", "Recover receivables"],
  },
  {
    icon: "🚚",
    label: "Distribution",
    slug: "distribution",
    color: "#8b5cf6",
    audience: "For route-based distributors delivering into the market every day.",
    desc: "Coordinate warehouse, routes, stock-on-van, deliveries, and collections with a workflow built for market coverage and route discipline.",
    modules: ["Routes", "Delivery Tracking", "Stock On Van", "Collections"],
    flow: ["Plan routes", "Load vans", "Deliver in market", "Collect and reconcile"],
  },
  {
    icon: "🚢",
    label: "Import / Export",
    slug: "trade",
    color: "#14b8a6",
    audience: "For importers, exporters, and international trading companies.",
    desc: "Prepare commercial documents, track shipments, manage LC and TT activity, and keep trade costing and rebate visibility under control.",
    modules: ["Commercial Invoice", "Packing List", "Shipments", "LC / TT"],
    flow: ["Prepare documents", "Track shipment", "Handle banking", "Close trade costing"],
  },
  {
    icon: "🏭",
    label: "Manufacturing",
    slug: "manufacturing",
    color: "#f59e0b",
    audience: "For production businesses converting raw materials into finished goods.",
    desc: "Manage BOMs, production orders, work orders, finished goods, and quality processes with a manufacturing-ready operating flow.",
    modules: ["Bill of Materials", "Production Orders", "Work Orders", "Quality Control"],
    flow: ["Plan BOM", "Launch production", "Run work orders", "Inspect and finish"],
  },
] as const;

export default function SolutionSection() {
  const [painRef, painVis] = useInView();
  const [indRef, indVis] = useInView();
  const [hovPain, setHovPain] = useState<number | null>(null);
  const [activeIndustry, setActiveIndustry] = useState<string>(FOCUSED_INDUSTRIES[0].slug);

  const selectedIndustry =
    FOCUSED_INDUSTRIES.find((industry) => industry.slug === activeIndustry) ?? FOCUSED_INDUSTRIES[0];

  return (
    <section
      style={{
        background: "linear-gradient(180deg,#080c22 0%,#0a0d28 60%,#070a1e 100%)",
        padding: "100px 24px",
        fontFamily: "'Outfit', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Lora:wght@600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes orb{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-15px)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
        @media(max-width:860px){
          .sol-detail-grid{grid-template-columns:1fr !important;}
          .sol-stats-grid{grid-template-columns:1fr !important;}
        }
      `}</style>

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            top: -80,
            left: -80,
            background: "radial-gradient(circle,rgba(99,102,241,.1),transparent 65%)",
            animation: "orb 14s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            bottom: -60,
            right: -60,
            background: "radial-gradient(circle,rgba(124,58,237,.08),transparent 65%)",
            animation: "orb 18s ease-in-out infinite reverse",
          }}
        />
      </div>

      <div style={{ maxWidth: 1160, margin: "0 auto", position: "relative" }}>
        <div ref={painRef}>
          <div
            style={{
              textAlign: "center",
              marginBottom: 56,
              opacity: painVis ? 1 : 0,
              transform: painVis ? "translateY(0)" : "translateY(24px)",
              transition: "all .6s cubic-bezier(.22,1,.36,1)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 16px",
                borderRadius: 100,
                marginBottom: 20,
                background: "rgba(248,113,113,.1)",
                border: "1.5px solid rgba(248,113,113,.22)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#f87171",
                  display: "inline-block",
                  animation: "blink 2s ease infinite",
                }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#f87171", letterSpacing: ".08em" }}>
                THE PROBLEM
              </span>
            </div>
            <h2
              style={{
                fontFamily: "'Lora',serif",
                fontSize: "clamp(30px,4vw,50px)",
                fontWeight: 700,
                color: "white",
                letterSpacing: "-1.5px",
                lineHeight: 1.1,
                marginBottom: 16,
              }}
            >
              Sound familiar?
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,.4)", lineHeight: 1.8, maxWidth: 500, margin: "0 auto" }}>
              These are the operating problems growing businesses hit first. Finova is designed to remove them.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(330px,1fr))",
              gap: 12,
              marginBottom: 100,
            }}
          >
            {PAINS.map((pain, index) => (
              <div
                key={pain.problem}
                onMouseEnter={() => setHovPain(index)}
                onMouseLeave={() => setHovPain(null)}
                style={{
                  borderRadius: 16,
                  padding: "22px",
                  background: hovPain === index ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.03)",
                  border: `1px solid ${hovPain === index ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.06)"}`,
                  opacity: painVis ? 1 : 0,
                  transform: painVis ? "translateY(0)" : "translateY(20px)",
                  transition: `opacity .5s ease ${index * 60}ms, transform .5s ease ${index * 60}ms, background .2s, border .2s`,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      flexShrink: 0,
                      background: "rgba(248,113,113,.1)",
                      border: "1px solid rgba(248,113,113,.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ❌
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#f87171", letterSpacing: ".06em", marginBottom: 4 }}>
                      BEFORE FINOVA
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,.55)", lineHeight: 1.4 }}>
                      {pain.problem}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.06)" }} />
                  <div
                    style={{
                      fontSize: 12,
                      color: pain.color,
                      fontWeight: 700,
                      padding: "2px 10px",
                      borderRadius: 20,
                      background: `${pain.color}12`,
                      border: `1px solid ${pain.color}25`,
                    }}
                  >
                    ↓ Finova fixes this
                  </div>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.06)" }} />
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      flexShrink: 0,
                      background: `${pain.color}12`,
                      border: `1px solid ${pain.color}25`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {pain.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: pain.color, letterSpacing: ".06em", marginBottom: 4 }}>
                      WITH FINOVA
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,.8)", lineHeight: 1.4 }}>
                      {pain.solution}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div ref={indRef}>
          <div
            style={{
              textAlign: "center",
              marginBottom: 56,
              opacity: indVis ? 1 : 0,
              transform: indVis ? "translateY(0)" : "translateY(24px)",
              transition: "all .6s cubic-bezier(.22,1,.36,1)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 16px",
                borderRadius: 100,
                marginBottom: 20,
                background: "rgba(99,102,241,.1)",
                border: "1.5px solid rgba(99,102,241,.22)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#6366f1",
                  display: "inline-block",
                  animation: "blink 2s ease infinite",
                }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", letterSpacing: ".08em" }}>
                FOCUSED INDUSTRIES
              </span>
            </div>
            <h2
              style={{
                fontFamily: "'Lora',serif",
                fontSize: "clamp(28px,3.5vw,46px)",
                fontWeight: 700,
                color: "white",
                letterSpacing: "-1.2px",
                lineHeight: 1.1,
                marginBottom: 16,
              }}
            >
              Finova is currently optimized for{" "}
              <span
                style={{
                  background: "linear-gradient(135deg,#818cf8,#6366f1,#a78bfa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                these core business models.
              </span>
            </h2>
            <p style={{ fontSize: 15.5, color: "rgba(255,255,255,.4)", lineHeight: 1.8, maxWidth: 560, margin: "0 auto" }}>
              Instead of listing dozens of industries here, we are targeting the business types that need strong operations,
              stock, finance, and execution workflows from day one.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 14,
              flexWrap: "wrap",
              marginBottom: 44,
              opacity: indVis ? 1 : 0,
              transition: "opacity .6s ease .2s",
            }}
          >
            {[
              { value: "05", label: "Focused Businesses", color: "#818cf8" },
              { value: "4-8", label: "Core Modules Each", color: "#34d399" },
              { value: "100%", label: "Workflow Guided", color: "#fbbf24" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  textAlign: "center",
                  padding: "14px 28px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,.03)",
                  border: "1px solid rgba(255,255,255,.07)",
                }}
              >
                <div style={{ fontSize: 26, fontWeight: 900, color: stat.color, lineHeight: 1, letterSpacing: "-1px" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", fontWeight: 600, marginTop: 4, letterSpacing: ".04em" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div
            className="sol-detail-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,360px) minmax(0,1fr)",
              gap: 18,
              alignItems: "stretch",
              marginBottom: 48,
            }}
          >
            <div
              style={{
                display: "grid",
                gap: 10,
                opacity: indVis ? 1 : 0,
                transform: indVis ? "translateY(0)" : "translateY(12px)",
                transition: "all .45s ease .2s",
              }}
            >
              {FOCUSED_INDUSTRIES.map((industry, index) => {
                const isActive = selectedIndustry.slug === industry.slug;
                return (
                  <button
                    key={industry.slug}
                    onClick={() => setActiveIndustry(industry.slug)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "16px 18px",
                      borderRadius: 18,
                      border: `1px solid ${isActive ? `${industry.color}55` : "rgba(255,255,255,.08)"}`,
                      background: isActive ? `${industry.color}12` : "rgba(255,255,255,.03)",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: `all .22s ease ${index * 20}ms`,
                    }}
                  >
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        background: isActive ? `${industry.color}18` : "rgba(255,255,255,.05)",
                        border: `1px solid ${isActive ? `${industry.color}40` : "rgba(255,255,255,.08)"}`,
                        flexShrink: 0,
                      }}
                    >
                      {industry.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: isActive ? "white" : "rgba(255,255,255,.78)" }}>
                        {industry.label}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          lineHeight: 1.5,
                          color: isActive ? "rgba(255,255,255,.72)" : "rgba(255,255,255,.42)",
                          marginTop: 4,
                        }}
                      >
                        {industry.audience}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                borderRadius: 24,
                padding: "28px 28px 26px",
                background: "linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.025))",
                border: `1.5px solid ${selectedIndustry.color}30`,
                boxShadow: `0 20px 60px ${selectedIndustry.color}12`,
                opacity: indVis ? 1 : 0,
                transform: indVis ? "translateY(0)" : "translateY(12px)",
                transition: "all .5s ease .28s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 18,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  marginBottom: 22,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 14px",
                      borderRadius: 999,
                      background: `${selectedIndustry.color}12`,
                      border: `1px solid ${selectedIndustry.color}35`,
                      color: selectedIndustry.color,
                      fontSize: 12,
                      fontWeight: 700,
                      marginBottom: 16,
                    }}
                  >
                    <span>{selectedIndustry.icon}</span>
                    Target Business
                  </div>
                  <h3
                    style={{
                      fontFamily: "'Lora',serif",
                      fontSize: "clamp(24px,3vw,34px)",
                      lineHeight: 1.08,
                      color: "white",
                      marginBottom: 12,
                    }}
                  >
                    {selectedIndustry.label}
                  </h3>
                  <p style={{ fontSize: 15.5, lineHeight: 1.8, color: "rgba(255,255,255,.54)", maxWidth: 620 }}>
                    {selectedIndustry.desc}
                  </p>
                </div>
                <Link
                  href={`/solutions#${selectedIndustry.slug}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "11px 18px",
                    borderRadius: 12,
                    background: `${selectedIndustry.color}14`,
                    border: `1px solid ${selectedIndustry.color}35`,
                    color: selectedIndustry.color,
                    fontWeight: 700,
                    fontSize: 13.5,
                    textDecoration: "none",
                  }}
                >
                  View solution
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
              </div>

              <div className="sol-stats-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr .9fr", gap: 18 }}>
                <div
                  style={{
                    borderRadius: 18,
                    padding: "20px 20px 18px",
                    background: "rgba(255,255,255,.03)",
                    border: "1px solid rgba(255,255,255,.08)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: ".08em",
                      color: selectedIndustry.color,
                      marginBottom: 14,
                    }}
                  >
                    CORE MODULES
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {selectedIndustry.modules.map((module) => (
                      <div
                        key={module}
                        style={{
                          padding: "9px 12px",
                          borderRadius: 999,
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: "rgba(255,255,255,.86)",
                          background: `${selectedIndustry.color}10`,
                          border: `1px solid ${selectedIndustry.color}25`,
                        }}
                      >
                        {module}
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 18,
                    padding: "20px 20px 18px",
                    background: "rgba(255,255,255,.03)",
                    border: "1px solid rgba(255,255,255,.08)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: ".08em",
                      color: selectedIndustry.color,
                      marginBottom: 14,
                    }}
                  >
                    TYPICAL FLOW
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {selectedIndustry.flow.map((step, index) => (
                      <div key={step} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: `${selectedIndustry.color}14`,
                            border: `1px solid ${selectedIndustry.color}30`,
                            color: selectedIndustry.color,
                            fontSize: 11,
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {index + 1}
                        </div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: "rgba(255,255,255,.78)" }}>{step}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginBottom: 80 }}>
            <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.28)", marginBottom: 20, lineHeight: 1.7 }}>
              Need a different industry setup later?{" "}
              <Link href="/contact?subject=custom-industry" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 600 }}>
                Request a custom setup
              </Link>{" "}
              and we&apos;ll extend it with the same Finova structure.
            </p>
            <Link
              href="/solutions"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 24px",
                borderRadius: 12,
                background: "rgba(99,102,241,.1)",
                border: "1px solid rgba(99,102,241,.25)",
                fontSize: 13.5,
                fontWeight: 700,
                color: "#a5b4fc",
                textDecoration: "none",
              }}
            >
              Explore solution details
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>

        <div
          style={{
            borderRadius: 20,
            padding: "36px 44px",
            background: "rgba(99,102,241,.07)",
            border: "1.5px solid rgba(99,102,241,.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 24,
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 0 80px rgba(99,102,241,.05)",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -60,
              top: "50%",
              transform: "translateY(-50%)",
              width: 300,
              height: 300,
              borderRadius: "50%",
              background: "radial-gradient(circle,rgba(99,102,241,.13),transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "4px 12px",
                borderRadius: 100,
                marginBottom: 12,
                background: "rgba(251,191,36,.1)",
                border: "1px solid rgba(251,191,36,.25)",
                fontSize: 11,
                fontWeight: 700,
                color: "#fbbf24",
              }}
            >
              LIMITED OFFER - 75% OFF FIRST 3 MONTHS
            </div>
            <h3 style={{ fontFamily: "'Lora',serif", fontSize: "clamp(18px,2.5vw,26px)", fontWeight: 700, color: "white", letterSpacing: "-.4px", marginBottom: 6 }}>
              Stop patching. Start running.
            </h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", margin: 0 }}>
              One platform for traders, retailers, distributors, manufacturers, and import-export teams.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", position: "relative" }}>
            <Link
              href="/pricing"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "13px 28px",
                borderRadius: 12,
                background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                color: "white",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                boxShadow: "0 4px 20px rgba(99,102,241,.4)",
              }}
            >
              Get Started →
            </Link>
            <Link
              href="/demo"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 22px",
                borderRadius: 12,
                border: "1.5px solid rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.04)",
                color: "rgba(255,255,255,.7)",
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Try Live Demo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
