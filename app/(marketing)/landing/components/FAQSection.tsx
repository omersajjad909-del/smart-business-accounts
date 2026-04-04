"use client";
import { useEffect, useRef, useState } from "react";

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, vis] as const;
}

const CATEGORIES = [
  { id: "all",           label: "All",             icon: "✦"  },
  { id: "accounting",    label: "Accounting",       icon: "📊" },
  { id: "invoicing",     label: "Invoicing",        icon: "🧾" },
  { id: "inventory",     label: "Inventory",        icon: "📦" },
  { id: "hr",            label: "HR & Payroll",     icon: "👥" },
  { id: "branches",      label: "Multi-Branch",     icon: "🏢" },
  { id: "banking",       label: "Bank & Payments",  icon: "🏦" },
  { id: "billing",       label: "Plans & Billing",  icon: "💳" },
  { id: "security",      label: "Security",         icon: "🔒" },
];

const FAQS = [
  // ── Accounting ──
  {
    cat: "accounting", color: "#818cf8",
    q: "Is FinovaOS a true double-entry accounting system?",
    a: "Yes. Every transaction in FinovaOS posts both a debit and a credit automatically. Your general ledger, trial balance, P&L, and balance sheet are always in sync — no manual journal entries needed for routine transactions.",
  },
  {
    cat: "accounting", color: "#818cf8",
    q: "Can I manage my chart of accounts?",
    a: "Absolutely. FinovaOS auto-generates a chart of accounts based on your industry when you sign up. You can add, rename, or restructure accounts at any time. Full support for assets, liabilities, equity, income, and expense accounts.",
  },
  {
    cat: "accounting", color: "#818cf8",
    q: "Can I lock accounting periods?",
    a: "Yes. Once a period is closed, you can lock it to prevent any backdated changes. This is critical for audit integrity. Admins can reopen a period if corrections are needed — with a full audit trail of who changed what.",
  },
  {
    cat: "accounting", color: "#818cf8",
    q: "What reports does FinovaOS generate?",
    a: "P&L statement, balance sheet, trial balance, cash flow statement, ageing reports (receivables & payables), tax summaries, ledger reports, and custom date-range reports. All exportable as PDF or Excel instantly.",
  },

  // ── Invoicing ──
  {
    cat: "invoicing", color: "#34d399",
    q: "Can I create both sales and purchase invoices?",
    a: "Yes. FinovaOS covers the full billing cycle — sales invoices, purchase invoices, credit notes, debit notes, and advance payments. Every invoice automatically updates your ledger and inventory.",
  },
  {
    cat: "invoicing", color: "#34d399",
    q: "How does payment tracking work?",
    a: "Record full or partial payments against any invoice. FinovaOS automatically calculates outstanding balances, tracks payment history, and generates ageing reports so you always know who owes you and for how long.",
  },
  {
    cat: "invoicing", color: "#34d399",
    q: "Can I generate PDF invoices and send them to clients?",
    a: "Yes. Generate a professional PDF invoice in one click. You can download it, print it, or email it directly to your customer from within FinovaOS. Custom invoice templates are available on Pro and Enterprise plans.",
  },

  // ── Inventory ──
  {
    cat: "inventory", color: "#fbbf24",
    q: "Does inventory sync with invoices automatically?",
    a: "Yes — this is core to how FinovaOS works. When you create a sales invoice, stock is deducted immediately. When you post a goods received note (GRN), stock is added. No manual stock adjustments needed for routine transactions.",
  },
  {
    cat: "inventory", color: "#fbbf24",
    q: "Can I manage multiple warehouses?",
    a: "Yes. Define unlimited warehouses or storage locations. Transfer stock between them with full documentation. Reports show stock levels per warehouse or consolidated across all locations.",
  },
  {
    cat: "inventory", color: "#fbbf24",
    q: "Which inventory valuation methods are supported?",
    a: "FinovaOS supports FIFO (First In First Out), LIFO (Last In First Out), and Weighted Average Cost. The method affects your COGS calculation and is applied automatically to every sale.",
  },
  {
    cat: "inventory", color: "#fbbf24",
    q: "How do low stock alerts work?",
    a: "Set a reorder level for each product. When stock falls at or below that level, FinovaOS flags it on your dashboard and inventory reports. You can action a purchase order directly from the alert.",
  },

  // ── HR & Payroll ──
  {
    cat: "hr", color: "#a78bfa",
    q: "Does FinovaOS handle salary processing?",
    a: "Yes. Define employee salaries, allowances, and deductions. Run monthly payroll in one click — FinovaOS calculates net pay, generates payslips, and automatically posts the payroll entry to your accounting ledger.",
  },
  {
    cat: "hr", color: "#a78bfa",
    q: "How is attendance tracked?",
    a: "Mark attendance daily (present, absent, late, half-day) manually or via bulk import. Attendance records feed into payroll automatically — late arrivals and absences deduct accordingly based on your policy.",
  },
  {
    cat: "hr", color: "#a78bfa",
    q: "Can employees apply for leave through FinovaOS?",
    a: "Yes. Employees can log leave requests which managers approve or reject. Leave balances (annual, sick, casual) are tracked automatically and deducted from payroll when leaves are taken.",
  },

  // ── Multi-Branch ──
  {
    cat: "branches", color: "#06b6d4",
    q: "Can I manage multiple companies from one login?",
    a: "Yes — this is one of FinovaOS's core strengths. Add unlimited companies and branches under one account. Switch between them instantly without logging out. Each company's data is fully isolated.",
  },
  {
    cat: "branches", color: "#06b6d4",
    q: "Can I see consolidated reports across all branches?",
    a: "Yes. FinovaOS generates consolidated P&L, balance sheets, and cash flow across all your companies or branches. You can also drill into individual branch performance at any time.",
  },
  {
    cat: "branches", color: "#06b6d4",
    q: "Can users have different roles in different companies?",
    a: "Absolutely. A user can be an Admin in Company A, a read-only Accountant in Company B, and have no access to Company C. Role and permission assignment is per company.",
  },

  // ── Bank & Payments ──
  {
    cat: "banking", color: "#60a5fa",
    q: "How does bank reconciliation work in FinovaOS?",
    a: "Import your bank statement (CSV or Excel). FinovaOS auto-matches transactions against your ledger entries by amount, date, and reference. Unmatched items are highlighted for your review. Mark the period reconciled when done.",
  },
  {
    cat: "banking", color: "#60a5fa",
    q: "Can I manage multiple bank accounts?",
    a: "Yes. Add unlimited bank accounts in any currency. Each account has its own ledger, statement history, and reconciliation record. Switch between accounts from the bank reconciliation module.",
  },
  {
    cat: "banking", color: "#60a5fa",
    q: "Does FinovaOS support multi-currency transactions?",
    a: "Yes. Transact in any of 150+ currencies. Set exchange rates manually or let FinovaOS fetch live rates. Realized and unrealized forex gains and losses are calculated automatically and posted to your ledger.",
  },

  // ── Plans & Billing ──
  {
    cat: "billing", color: "#f97316",
    q: "What does the 75% discount cover?",
    a: "Your first 3 months are 75% off the regular plan price — on any plan (Starter, Pro, or Enterprise). After 3 months, standard pricing applies. No contracts. Cancel anytime before month 4 if you change your mind.",
  },
  {
    cat: "billing", color: "#f97316",
    q: "What's the difference between monthly and yearly billing?",
    a: "Monthly billing charges you each month at the standard rate. Yearly billing gives you an additional 20% discount on top — you pay for 12 months upfront but save significantly. The 75% first-3-months offer applies to both billing cycles.",
  },
  {
    cat: "billing", color: "#f97316",
    q: "Can I upgrade or downgrade my plan?",
    a: "Yes, at any time. Upgrades take effect immediately. Downgrades apply from your next billing date. If you upgrade mid-cycle, you're only charged the prorated difference.",
  },
  {
    cat: "billing", color: "#f97316",
    q: "What happens to my data if I cancel?",
    a: "Your data stays accessible for 30 days after cancellation so you can export everything. After 30 days, it is securely deleted. We never hold your data hostage — export to Excel or PDF at any time, even while subscribed.",
  },

  // ── Security ──
  {
    cat: "security", color: "#10b981",
    q: "Is my financial data secure?",
    a: "Yes. All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Each company's data is fully isolated — no cross-company data leakage is possible by design. We perform regular security reviews as the platform scales.",
  },
  {
    cat: "security", color: "#10b981",
    q: "Who can see my company's data?",
    a: "Only users you invite to your company, with the roles you assign. Even FinovaOS support staff cannot access your financial data without your explicit permission. Full audit logs record every action taken by every user.",
  },
  {
    cat: "security", color: "#10b981",
    q: "Are there audit logs?",
    a: "Yes. Every create, edit, and delete action is logged with the user's name, timestamp, and the exact change made. Audit logs cannot be edited or deleted — they are your permanent record of who did what and when.",
  },
];

function FAQItem({ faq, open, onToggle, i, vis }: {
  faq: typeof FAQS[0];
  open: boolean;
  onToggle: () => void;
  i: number;
  vis: boolean;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        borderRadius: 14, overflow: "hidden",
        border: `1px solid ${open ? faq.color + "40" : "rgba(255,255,255,.07)"}`,
        background: open ? `${faq.color}08` : "rgba(255,255,255,.03)",
        cursor: "pointer",
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(12px)",
        transition: `opacity .45s ease ${i * 40}ms, transform .45s ease ${i * 40}ms, border .2s, background .2s`,
      }}
    >
      {/* Question row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: open ? faq.color : "rgba(255,255,255,.2)",
            transition: "background .2s",
            boxShadow: open ? `0 0 8px ${faq.color}` : "none",
          }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: open ? "white" : "rgba(255,255,255,.75)", lineHeight: 1.4, transition: "color .2s" }}>
            {faq.q}
          </span>
        </div>
        <div style={{
          width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
          background: open ? `${faq.color}20` : "rgba(255,255,255,.06)",
          border: `1px solid ${open ? faq.color + "40" : "rgba(255,255,255,.1)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all .25s",
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={open ? faq.color : "rgba(255,255,255,.4)"} strokeWidth="2.5"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .25s" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Answer */}
      <div style={{
        maxHeight: open ? 300 : 0,
        overflow: "hidden",
        transition: "max-height .35s cubic-bezier(.22,1,.36,1)",
      }}>
        <p style={{
          fontSize: 13.5, color: "rgba(255,255,255,.5)",
          lineHeight: 1.8, margin: 0,
          padding: "0 18px 18px 34px",
        }}>
          {faq.a}
        </p>
      </div>
    </div>
  );
}

export default function FAQSection() {
  const [ref, vis]   = useInView();
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState<number | null>(null);

  const filtered = cat === "all" ? FAQS : FAQS.filter(f => f.cat === cat);

  // Reset open when category changes
  useEffect(() => { setOpen(null); }, [cat]);

  return (
    <section style={{
      background: "linear-gradient(180deg,#0a0d28 0%,#080c22 60%,#070a1e 100%)",
      padding: "100px 24px",
      fontFamily: "'Outfit', sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Lora:wght@600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes orb{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-15px)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
      `}</style>

      {/* BG */}
      <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)",backgroundSize:"52px 52px"}}/>
        <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",bottom:-100,right:-80,background:"radial-gradient(circle,rgba(99,102,241,.1),transparent 65%)",animation:"orb 16s ease-in-out infinite"}}/>
        <div style={{position:"absolute",top:0,left:"10%",right:"10%",height:1,background:"linear-gradient(90deg,transparent,rgba(99,102,241,.3),transparent)"}}/>
        <div style={{position:"absolute",bottom:0,left:"10%",right:"10%",height:1,background:"linear-gradient(90deg,transparent,rgba(99,102,241,.15),transparent)"}}/>
      </div>

      <div ref={ref} style={{maxWidth:860,margin:"0 auto",position:"relative"}}>

        {/* Header */}
        <div style={{
          textAlign:"center", marginBottom:48,
          opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(24px)",
          transition:"all .6s cubic-bezier(.22,1,.36,1)",
        }}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 16px",borderRadius:100,marginBottom:20,background:"rgba(99,102,241,.1)",border:"1.5px solid rgba(99,102,241,.22)"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#6366f1",display:"inline-block",animation:"blink 2s ease infinite"}}/>
            <span style={{fontSize:11,fontWeight:700,color:"#a5b4fc",letterSpacing:".08em"}}>FREQUENTLY ASKED</span>
          </div>
          <h2 style={{fontFamily:"'Lora',serif",fontSize:"clamp(30px,4vw,50px)",fontWeight:700,color:"white",letterSpacing:"-1.5px",lineHeight:1.1,marginBottom:14}}>
            Got questions?{" "}
            <span style={{background:"linear-gradient(135deg,#818cf8,#6366f1,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              We've got answers.
            </span>
          </h2>
          <p style={{fontSize:15,color:"rgba(255,255,255,.4)",lineHeight:1.8,maxWidth:480,margin:"0 auto"}}>
            Everything you need to know about FinovaOS — from accounting to payroll to security.
          </p>
        </div>

        {/* Category filter */}
        <div style={{
          display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center",
          marginBottom:36,
          opacity:vis?1:0, transition:"opacity .6s ease .2s",
        }}>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)} style={{
              display:"inline-flex", alignItems:"center", gap:6,
              padding:"7px 14px", borderRadius:24, fontSize:12, fontWeight:600, cursor:"pointer",
              background: cat===c.id ? "rgba(99,102,241,.22)" : "rgba(255,255,255,.04)",
              color: cat===c.id ? "#a5b4fc" : "rgba(255,255,255,.45)",
              border: `1px solid ${cat===c.id ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.08)"}`,
              transition:"all .2s", fontFamily:"inherit",
            }}>
              <span>{c.icon}</span>
              <span>{c.label}</span>
              <span style={{fontSize:10,opacity:.6}}>
                {c.id==="all" ? FAQS.length : FAQS.filter(f=>f.cat===c.id).length}
              </span>
            </button>
          ))}
        </div>

        {/* FAQ list */}
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:56}}>
          {filtered.map((faq, i) => (
            <FAQItem
              key={`${cat}-${i}`}
              faq={faq}
              i={i}
              vis={vis}
              open={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{
          textAlign:"center",
          opacity:vis?1:0, transition:"opacity .6s ease .5s",
        }}>
          <p style={{fontSize:14,color:"rgba(255,255,255,.35)",marginBottom:16}}>
            Still have questions? Our team is happy to help.
          </p>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <a href="/support" style={{
              display:"inline-flex",alignItems:"center",gap:8,
              padding:"11px 24px",borderRadius:11,fontSize:13,fontWeight:700,
              background:"linear-gradient(135deg,#6366f1,#4f46e5)",
              color:"white",textDecoration:"none",
              boxShadow:"0 4px 16px rgba(99,102,241,.35)",
            }}>
              💬 Chat with Support
            </a>
            <a href="/docs" style={{
              display:"inline-flex",alignItems:"center",gap:8,
              padding:"10px 22px",borderRadius:11,fontSize:13,fontWeight:600,
              border:"1.5px solid rgba(255,255,255,.12)",
              background:"rgba(255,255,255,.04)",
              color:"rgba(255,255,255,.65)",textDecoration:"none",
            }}>
              📖 Browse Documentation
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}
