"use client";

import Link from "next/link";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/businessModules";

type CompanyInfo = {
  plan: string;
  subscriptionStatus: string;
  baseCurrency: string;
} | null;

function prettifyModuleLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function DemoBusinessShowcase({
  businessType,
  companyInfo,
}: {
  businessType: BusinessType;
  companyInfo: CompanyInfo;
}) {
  const businessMeta = BUSINESS_TYPES.find((entry) => entry.id === businessType) || BUSINESS_TYPES[0];
  const visibleModules = businessMeta.modules.slice(0, 12);
  const flowMap: Partial<Record<BusinessType, string[]>> = {
    retail: ["Walk-in customer", "Fast POS billing", "Stock moves instantly", "Repeat sales and loyalty"],
    distribution: ["Warehouse loading", "Route planning", "Delivery or van sales", "Collections and reconciliation"],
    trading: ["Inquiry and quotation", "Procurement and stock", "Dispatch and invoicing", "Receivables follow-up"],
    manufacturing: ["BOM planning", "Production order", "Quality checks", "Finished goods handoff"],
    service: ["Client brief", "Project delivery", "Time billing", "Milestone closure"],
    restaurant: ["Reservations or dine-in", "Order to kitchen", "Billing", "Table turnaround"],
    hospital: ["Patient registration", "Appointment and consultation", "Prescription or lab", "Billing and follow-up"],
    clinic: ["Patient registration", "Consultation", "Prescription or lab", "Billing and follow-up"],
    pharmacy: ["Purchase medicines", "Batch and expiry control", "Prescription or counter sale", "Restock alerts"],
    real_estate: ["Property setup", "Tenant onboarding", "Lease tracking", "Rent collection"],
    construction: ["Project planning", "BOQ and materials", "Progress billing", "Contractor settlement"],
    school: ["Admissions", "Classes and attendance", "Fee collection", "Exam reporting"],
    hotel: ["Reservation", "Check-in", "Room service and housekeeping", "Checkout folio"],
    transport: ["Trip dispatch", "Driver assignment", "Fuel and expense capture", "Trip closure"],
    import_company: ["Commercial documents", "Shipment tracking", "Customs and costing", "Remittance matching"],
    export_company: ["Buyer quotation", "Commercial invoice", "Packing and shipment", "Rebate and collection"],
  };
  const businessFlow = flowMap[businessMeta.id] || [
    "Business setup",
    "Operational control",
    "Financial tracking",
    "Reporting and growth",
  ];
  const planComparison = [
    {
      name: "Starter",
      accent: "#818cf8",
      note: "Best for a single team getting started fast.",
      points: ["Essential modules only", "Simple daily operations", "Good for smaller teams"],
    },
    {
      name: "Professional",
      accent: "#34d399",
      note: "Best for growing operations with stronger control.",
      points: ["Advanced reporting", "More automation depth", "Better multi-user control"],
    },
    {
      name: "Enterprise",
      accent: "#fbbf24",
      note: "Best for branches, scale, and full oversight.",
      points: ["Full business coverage", "Deep admin permissions", "Best for larger teams"],
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "transparent", padding: 0, fontFamily: "inherit" }}>
      <div
        style={{
          marginBottom: 18,
          padding: "14px 18px",
          borderRadius: 14,
          background: "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(99,102,241,0.12))",
          border: "1px solid rgba(251,191,36,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#fbbf24" }}>Live Demo Experience</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
            This preview is tailored for {businessMeta.label}. Explore the business flow here, then open the owner dashboard for a live operational view.
          </div>
        </div>
        <Link prefetch={false}
          href="/dashboard/owner-dashboard"
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "rgba(99,102,241,0.18)",
            border: "1px solid rgba(99,102,241,0.28)",
            color: "#c7d2fe",
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          Open Owner Dashboard
        </Link>
      </div>

      <div
        style={{
          marginBottom: 18,
          padding: "28px",
          borderRadius: 22,
          background: "radial-gradient(circle at top left, rgba(99,102,241,0.18), rgba(8,10,24,0.94) 55%)",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 0.9fr)",
          gap: 20,
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 999,
              background: `${businessMeta.color}18`,
              border: `1px solid ${businessMeta.color}30`,
              color: businessMeta.color,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            <span>{businessMeta.icon}</span>
            <span>{businessMeta.label} Demo</span>
          </div>
          <h1 style={{ margin: 0, color: "white", fontSize: 34, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            {businessMeta.label} operations, explained beautifully.
          </h1>
          <p style={{ margin: "12px 0 0", color: "rgba(255,255,255,0.62)", fontSize: 15, maxWidth: 760, lineHeight: 1.7 }}>
            {businessMeta.description} This demo shows how FinovaOS fits the flow, reporting style, and decisions that matter for this business.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            {businessFlow.map((step, index) => (
              <div
                key={step}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.78)",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {index + 1}. {step}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            borderRadius: 18,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: 20,
          }}
        >
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>
            Demo Summary
          </div>
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Selected business</span>
              <span style={{ color: "white", fontSize: 12, fontWeight: 800 }}>{businessMeta.label}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Demo plan</span>
              <span style={{ color: "#a5b4fc", fontSize: 12, fontWeight: 800 }}>{companyInfo?.plan || "Professional"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Status</span>
              <span style={{ color: "#34d399", fontSize: 12, fontWeight: 800 }}>{companyInfo?.subscriptionStatus || "ACTIVE"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Modules previewed</span>
              <span style={{ color: "white", fontSize: 12, fontWeight: 800 }}>{visibleModules.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18, marginBottom: 18 }}>
        <div
          style={{
            borderRadius: 18,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            padding: 22,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 14 }}>
            Core Modules
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
            {visibleModules.map((moduleName, index) => (
              <div
                key={moduleName}
                style={{
                  borderRadius: 14,
                  padding: "14px 14px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ color: businessMeta.color, fontSize: 11, fontWeight: 800, marginBottom: 6 }}>Module {index + 1}</div>
                <div style={{ color: "white", fontSize: 13, fontWeight: 700 }}>{prettifyModuleLabel(moduleName)}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            borderRadius: 18,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            padding: 22,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 14 }}>
            Why It Fits
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              {
                title: "Operational clarity",
                body: `Track the exact flow from ${businessFlow[0]?.toLowerCase() || "planning"} to ${businessFlow[businessFlow.length - 1]?.toLowerCase() || "closure"}.`,
              },
              {
                title: "Commercial control",
                body: "Compare pricing, margins, receivables, and execution without jumping between tools.",
              },
              {
                title: "Scalable team usage",
                body: "Branches, permissions, and business-specific workflows can grow from Starter to Enterprise.",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  borderRadius: 14,
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ color: "white", fontSize: 14, fontWeight: 800 }}>{item.title}</div>
                <div style={{ color: "rgba(255,255,255,0.58)", fontSize: 12, lineHeight: 1.7, marginTop: 6 }}>{item.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          borderRadius: 18,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          padding: 22,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: ".08em" }}>
              3-Plan Comparison
            </div>
            <div style={{ color: "white", fontSize: 24, fontWeight: 800, marginTop: 6 }}>Choose the growth path that matches this business</div>
          </div>
          <Link prefetch={false}
            href="/pricing"
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: "rgba(99,102,241,0.14)",
              border: "1px solid rgba(99,102,241,0.25)",
              color: "#c7d2fe",
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Compare Full Pricing
          </Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {planComparison.map((plan) => (
            <div
              key={plan.name}
              style={{
                borderRadius: 16,
                padding: 18,
                background: "rgba(255,255,255,0.025)",
                border: `1px solid ${plan.accent}30`,
                boxShadow: `inset 0 1px 0 ${plan.accent}15`,
              }}
            >
              <div style={{ color: plan.accent, fontSize: 13, fontWeight: 800 }}>{plan.name}</div>
              <div style={{ color: "rgba(255,255,255,0.58)", fontSize: 12, lineHeight: 1.7, marginTop: 8 }}>{plan.note}</div>
              <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                {plan.points.map((point) => (
                  <div key={point} style={{ color: "white", fontSize: 12, fontWeight: 700 }}>
                    • {point}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
