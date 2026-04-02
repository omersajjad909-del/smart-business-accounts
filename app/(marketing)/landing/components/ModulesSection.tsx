"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, vis] as const;
}

const CATEGORIES = [
  {
    label: "Core Accounting",
    icon: "📒",
    color: "#818cf8",
    modules: [
      "Chart of Accounts",
      "Journal Vouchers (JV)",
      "Cash Payment / Receipt",
      "Opening Balances",
      "Financial Year Close",
      "Ledger & Trial Balance",
    ],
  },
  {
    label: "Invoicing & Billing",
    icon: "🧾",
    color: "#34d399",
    modules: [
      "Sales Invoices",
      "Purchase Invoices",
      "Quotations",
      "Credit & Debit Notes",
      "Delivery Challans",
      "Sale Returns",
    ],
  },
  {
    label: "Inventory",
    icon: "📦",
    color: "#fbbf24",
    modules: [
      "Multi-Warehouse Stock",
      "GRN (Goods Receipt)",
      "Purchase Orders",
      "Outward Register",
      "Barcode Scanner",
      "Low Stock Alerts",
      "FIFO / LIFO Valuation",
    ],
  },
  {
    label: "Banking & Payments",
    icon: "🏦",
    color: "#06b6d4",
    modules: [
      "Bank Reconciliation",
      "Payment Receipts",
      "Expense Vouchers",
      "Advance Payments",
      "Petty Cash",
      "Multi-Currency",
    ],
  },
  {
    label: "HR & Payroll",
    icon: "👥",
    color: "#a78bfa",
    modules: [
      "Employee Management",
      "Attendance Tracking",
      "Payroll Processing",
      "Payslip Generation",
      "Department Budgets",
      "Cost Centers",
    ],
  },
  {
    label: "CRM & Sales",
    icon: "🎯",
    color: "#f97316",
    modules: [
      "Contacts & Parties",
      "Opportunities Pipeline",
      "Interaction Logs",
      "Quotation to Invoice",
      "Recurring Transactions",
      "Ageing Report",
    ],
  },
  {
    label: "Reports & Analytics",
    icon: "📊",
    color: "#ec4899",
    modules: [
      "Profit & Loss",
      "Balance Sheet",
      "Cash Flow Statement",
      "Tax Summary",
      "Inventory Reports",
      "Sales Analytics",
      "Annual Statements",
    ],
  },
  {
    label: "Multi-Branch & Scale",
    icon: "🌍",
    color: "#10b981",
    modules: [
      "Unlimited Branches",
      "Multi-Company Login",
      "Consolidated Reports",
      "Branch-Level Permissions",
      "Backup & Restore",
      "Import Wizard (Excel/CSV)",
    ],
  },
];

export default function ModulesSection() {
  const [hRef, hVis] = useInView();
  const [active, setActive] = useState<string | null>(null);

  return (
    <section style={{
      background: "linear-gradient(180deg,#080c22 0%,#060818 100%)",
      padding: "100px 24px",
      fontFamily: "'Outfit',sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Lora:wght@600;700&display=swap');
        @keyframes orb-mod{0%,100%{transform:translate(0,0)}50%{transform:translate(-20px,15px)}}
      `}</style>

      {/* BG */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px)", backgroundSize: "52px 52px" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", bottom: -80, right: 80, background: "radial-gradient(circle,rgba(124,58,237,.08),transparent 65%)", animation: "orb-mod 18s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg,transparent,rgba(99,102,241,.2),transparent)" }} />
        <div style={{ position: "absolute", bottom: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg,transparent,rgba(99,102,241,.1),transparent)" }} />
      </div>

      <div style={{ maxWidth: 1160, margin: "0 auto", position: "relative" }}>

        {/* Header */}
        <div ref={hRef} style={{
          textAlign: "center", marginBottom: 72,
          opacity: hVis ? 1 : 0, transform: hVis ? "translateY(0)" : "translateY(24px)",
          transition: "all .6s cubic-bezier(.22,1,.36,1)",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 100, marginBottom: 20,
            background: "rgba(99,102,241,.1)", border: "1.5px solid rgba(99,102,241,.22)",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", letterSpacing: ".08em" }}>EVERYTHING INCLUDED</span>
          </div>
          <h2 style={{
            fontFamily: "'Lora',serif",
            fontSize: "clamp(28px,4vw,48px)",
            fontWeight: 700, color: "white",
            letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 16,
          }}>
            50+ modules. One platform.{" "}
            <span style={{ background: "linear-gradient(135deg,#818cf8,#6366f1,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Zero add-ons.
            </span>
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,.4)", lineHeight: 1.8, maxWidth: 520, margin: "0 auto" }}>
            Unlike competitors that charge extra for each module, Finova gives you everything — accounting, inventory, HR, CRM, banking, and reports — all in one subscription.
          </p>
        </div>

        {/* Module grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
          gap: 16,
        }}>
          {CATEGORIES.map((cat, ci) => (
            <ModuleCard key={cat.label} cat={cat} i={ci} active={active} setActive={setActive} hVis={hVis} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{
          marginTop: 60, textAlign: "center",
          opacity: hVis ? 1 : 0, transition: "opacity .6s ease .4s",
        }}>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.35)", marginBottom: 20 }}>
            Need something specific? All modules are available on every plan.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/pricing" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "13px 28px", borderRadius: 12,
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              color: "white", fontWeight: 700, fontSize: 14, textDecoration: "none",
              boxShadow: "0 4px 20px rgba(99,102,241,.4)",
            }}>
              View All Plans →
            </Link>
            <Link href="/features" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 22px", borderRadius: 12,
              border: "1.5px solid rgba(255,255,255,.12)",
              background: "rgba(255,255,255,.04)",
              color: "rgba(255,255,255,.7)", fontWeight: 600, fontSize: 14, textDecoration: "none",
            }}>
              Explore Features
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function ModuleCard({
  cat, i, active, setActive, hVis,
}: {
  cat: typeof CATEGORIES[0]; i: number;
  active: string | null; setActive: (s: string | null) => void;
  hVis: boolean;
}) {
  const isOpen = active === cat.label;

  return (
    <div
      onClick={() => setActive(isOpen ? null : cat.label)}
      style={{
        borderRadius: 16, padding: "20px 22px",
        background: isOpen ? `${cat.color}0d` : "rgba(255,255,255,.03)",
        border: `1.5px solid ${isOpen ? cat.color + "40" : "rgba(255,255,255,.07)"}`,
        cursor: "pointer", transition: "all .25s",
        opacity: hVis ? 1 : 0,
        transform: hVis ? "translateY(0)" : "translateY(20px)",
        transitionDelay: `${i * 40}ms`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: isOpen ? 16 : 0 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: `${cat.color}18`, border: `1px solid ${cat.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>
          {cat.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{cat.label}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 1 }}>{cat.modules.length} features</div>
        </div>
        <div style={{
          width: 20, height: 20, borderRadius: "50%",
          background: "rgba(255,255,255,.06)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, color: "rgba(255,255,255,.4)", flexShrink: 0,
          transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .25s",
        }}>
          ↓
        </div>
      </div>

      {isOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {cat.modules.map(m => (
            <div key={m} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "5px 0",
              borderBottom: "1px solid rgba(255,255,255,.04)",
              fontSize: 13, color: "rgba(255,255,255,.65)",
            }}>
              <span style={{ color: cat.color, fontSize: 10 }}>✓</span>
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
