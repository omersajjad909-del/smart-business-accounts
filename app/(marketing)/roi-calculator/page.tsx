"use client";
import Link from "next/link";
import { useState } from "react";

const PLANS = [
  { name: "Starter",      price: 49,  label: "$49/mo" },
  { name: "Professional", price: 99,  label: "$99/mo" },
  { name: "Enterprise",   price: 249, label: "$249/mo" },
];

function Slider({ label, value, min, max, step = 1, onChange, format }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: "#94a3b8" }}>{label}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#818cf8" }}>{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#6366f1", height: 4, cursor: "pointer" }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 11, color: "#475569" }}>{format(min)}</span>
        <span style={{ fontSize: 11, color: "#475569" }}>{format(max)}</span>
      </div>
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="roi-card" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: 28, ...style }}>
      {children}
    </div>
  );
}

export default function ROICalculatorPage() {
  const [accountingHrs, setAccountingHrs] = useState(10);
  const [hourlyRate,    setHourlyRate]    = useState(15);
  const [employees,     setEmployees]     = useState(3);
  const [invoices,      setInvoices]      = useState(50);
  const [latePayPct,    setLatePayPct]    = useState(30);
  const [avgInvoice,    setAvgInvoice]    = useState(500);
  const [currency,      setCurrency]      = useState<"USD" | "PKR">("USD");
  const [plan,          setPlan]          = useState(PLANS[1]);

  const fx = currency === "PKR" ? 280 : 1;
  const sym = currency === "PKR" ? "Rs." : "$";
  const fmt = (n: number) => `${sym} ${Math.round(n * fx).toLocaleString()}`;

  // Savings calculations
  const accountingTimeSaved  = accountingHrs * 0.75; // 75% reduction
  const accountingMonthlySave = accountingTimeSaved * 4.33 * hourlyRate;

  const payrollTimeSavedHrs  = employees > 0 ? Math.min(employees * 0.5, 8) : 0;
  const payrollMonthlySave   = payrollTimeSavedHrs * hourlyRate;

  const latePayAmount        = invoices * avgInvoice * (latePayPct / 100);
  const collectionImprovement = latePayAmount * 0.65; // collect 65% of late amount faster
  const collectionMonthlySave = collectionImprovement * 0.02; // 2% value of faster collection

  const errorReductionSave   = invoices * 0.05 * avgInvoice * 0.01; // 5% error rate, 1% avg value

  const totalMonthlySavings  = accountingMonthlySave + payrollMonthlySave + collectionMonthlySave + errorReductionSave;
  const totalAnnualSavings   = totalMonthlySavings * 12;
  const planCost             = plan.price;
  const annualPlanCost       = planCost * 12;
  const netAnnualROI         = totalAnnualSavings - annualPlanCost;
  const roiMultiple          = annualPlanCost > 0 ? Math.round(totalAnnualSavings / annualPlanCost) : 0;
  const paybackMonths        = totalMonthlySavings > 0 ? Math.ceil(planCost / totalMonthlySavings) : 0;

  const breakdownItems = [
    { label: "Accounting time saved",       value: accountingMonthlySave,   desc: `${Math.round(accountingTimeSaved)} hrs/week saved @ ${fmt(hourlyRate)}/hr` },
    { label: "Payroll automation",          value: payrollMonthlySave,      desc: `${Math.round(payrollTimeSavedHrs)} hrs saved per payroll run` },
    { label: "Faster payment collection",   value: collectionMonthlySave,   desc: `${latePayPct}% late invoices collected 15+ days sooner` },
    { label: "Error & rework reduction",    value: errorReductionSave,      desc: "Fewer invoice errors and manual corrections" },
  ];

  const s = {
    page: { minHeight: "100vh", background: "linear-gradient(160deg,#04061a 0%,#080c2a 60%,#04061a 100%)", fontFamily: "'Outfit','Inter',sans-serif", color: "#e2e8f0" } as React.CSSProperties,
  };

  return (
    <div style={s.page}>
      <style>{`
        @media (max-width: 900px) {
          .roi-grid { grid-template-columns: 1fr !important; }
          .roi-results { position: static !important; top: auto !important; }
        }
        @media (max-width: 600px) {
          .roi-topbar { padding: 16px 16px !important; }
          .roi-hero { padding: 32px 16px 24px !important; }
          .roi-main { padding: 0 14px 60px !important; gap: 16px !important; }
          .roi-card { padding: 18px !important; border-radius: 16px !important; }
          .roi-summary-num { font-size: 32px !important; }
          .roi-stats { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
          .roi-stat-cell { padding: 10px !important; }
          .roi-stat-value { font-size: 16px !important; }
          .roi-plan-grid { gap: 6px !important; }
          .roi-plan-btn { padding: 8px 4px !important; }
        }
        @media (max-width: 380px) {
          .roi-stats { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div className="roi-topbar" style={{ padding: "20px 32px" }}>
        <Link href="/" style={{ color: "#64748b", textDecoration: "none", fontSize: 14 }}>← Back to FinovaOS</Link>
      </div>

      {/* Hero */}
      <div className="roi-hero" style={{ textAlign: "center", padding: "60px 24px 40px", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "inline-block", background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", padding: "5px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
          ROI Calculator
        </div>
        <h1 style={{ fontSize: "clamp(26px,5vw,48px)", fontWeight: 800, margin: "0 0 14px", lineHeight: 1.2 }}>
          How much will FinovaOS<br /><span style={{ background: "linear-gradient(135deg,#34d399,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>save your business?</span>
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 15, margin: 0 }}>Adjust the sliders to match your business. See your personalised ROI in real time.</p>
      </div>

      {/* Main layout */}
      <div className="roi-grid roi-main" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>

        {/* LEFT: Inputs */}
        <div style={{ display: "grid", gap: 20 }}>

          {/* Currency + Plan */}
          <Card>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Plan & Currency</h3>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 10 }}>Currency</div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["USD", "PKR"] as const).map(c => (
                  <button key={c} onClick={() => setCurrency(c)}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${currency === c ? "rgba(99,102,241,.5)" : "rgba(255,255,255,.1)"}`, background: currency === c ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.03)", color: currency === c ? "#818cf8" : "#64748b", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                    {c === "USD" ? "$ USD" : "₨ PKR"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 10 }}>FinovaOS Plan</div>
              <div className="roi-plan-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {PLANS.map(p => (
                  <button key={p.name} onClick={() => setPlan(p)} className="roi-plan-btn"
                    style={{ padding: "10px 8px", borderRadius: 10, border: `1px solid ${plan.name === p.name ? "rgba(99,102,241,.5)" : "rgba(255,255,255,.1)"}`, background: plan.name === p.name ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.03)", color: plan.name === p.name ? "#818cf8" : "#64748b", cursor: "pointer", textAlign: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 13, color: plan.name === p.name ? "#818cf8" : "#94a3b8", fontWeight: 600 }}>{fmt(p.price)}/mo</div>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Time & Staff */}
          <Card>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Time & Staff</h3>
            <Slider label="Hours per week on accounting/admin" value={accountingHrs} min={2} max={40} onChange={setAccountingHrs} format={v => `${v} hrs`} />
            <Slider label="Average hourly rate / labour cost" value={hourlyRate} min={5} max={100} onChange={setHourlyRate} format={v => fmt(v)} />
            <Slider label="Number of employees on payroll" value={employees} min={0} max={200} onChange={setEmployees} format={v => `${v} employees`} />
          </Card>

          {/* Invoicing */}
          <Card>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Invoicing & Collections</h3>
            <Slider label="Invoices per month" value={invoices} min={5} max={500} onChange={setInvoices} format={v => `${v} invoices`} />
            <Slider label="Average invoice value" value={avgInvoice} min={50} max={50000} step={50} onChange={setAvgInvoice} format={v => fmt(v)} />
            <Slider label="% of invoices that are late / uncollected" value={latePayPct} min={5} max={80} onChange={setLatePayPct} format={v => `${v}%`} />
          </Card>
        </div>

        {/* RIGHT: Results */}
        <div className="roi-results" style={{ position: "sticky", top: 24 }}>

          {/* ROI Summary */}
          <Card style={{ background: "linear-gradient(135deg,rgba(99,102,241,.15),rgba(52,211,153,.08))", border: "1px solid rgba(99,102,241,.3)", marginBottom: 16 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Annual Net Savings</div>
              <div className="roi-summary-num" style={{ fontSize: 42, fontWeight: 800, color: "#34d399", lineHeight: 1, wordBreak: "break-word" }}>{fmt(netAnnualROI)}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>after FinovaOS subscription cost</div>
            </div>

            <div className="roi-stats" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Monthly savings", value: fmt(totalMonthlySavings), color: "#818cf8" },
                { label: "ROI multiple",    value: `${roiMultiple}x`,         color: "#34d399" },
                { label: "Payback period",  value: `${paybackMonths} months`, color: "#fbbf24" },
                { label: "Plan cost/yr",    value: fmt(annualPlanCost),        color: "#94a3b8" },
              ].map(i => (
                <div key={i.label} className="roi-stat-cell" style={{ background: "rgba(0,0,0,.2)", borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
                  <div className="roi-stat-value" style={{ fontSize: 18, fontWeight: 800, color: i.color, wordBreak: "break-word" }}>{i.value}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{i.label}</div>
                </div>
              ))}
            </div>

            <Link href="/get-started"
              style={{ display: "block", textAlign: "center", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", padding: "13px 0", borderRadius: 12, fontWeight: 700, textDecoration: "none", fontSize: 15 }}>
              Start Saving Today →
            </Link>
          </Card>

          {/* Breakdown */}
          <Card>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".04em" }}>Savings Breakdown</h3>
            {breakdownItems.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 0", borderBottom: i < breakdownItems.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{item.desc}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#34d399", flexShrink: 0 }}>{fmt(item.value)}<span style={{ fontSize: 10, color: "#64748b" }}>/mo</span></div>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.1)" }}>
              <span style={{ fontWeight: 700 }}>Total per month</span>
              <span style={{ fontWeight: 800, color: "#818cf8" }}>{fmt(totalMonthlySavings)}</span>
            </div>
          </Card>

          <div style={{ marginTop: 12, fontSize: 11, color: "#475569", textAlign: "center", lineHeight: 1.6 }}>
            Estimates based on industry benchmarks. Actual results may vary by business size and usage.
          </div>
        </div>
      </div>
    </div>
  );
}
