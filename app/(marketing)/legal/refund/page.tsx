"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const LAST_UPDATED = "13 June 2026";
const EMAIL = "legal@finovaos.app";
const EMAIL_HREF = `mailto:${EMAIL}`;

const SECTIONS = [
  {
    id: "overview",
    icon: "↩️",
    color: "#818cf8",
    dim: "rgba(129,140,248,.08)",
    border: "rgba(129,140,248,.25)",
    title: "Overview",
    content: [
      {
        sub: "Our Commitment",
        body: "At FinovaOS, we believe in a fair and transparent relationship with our customers. This Refund Policy explains when you are eligible for a refund, how to request one, and what to expect. We aim to resolve all refund requests fairly and promptly.",
      },
      {
        sub: "Who This Applies To",
        body: "This policy applies to all customers who purchase a FinovaOS subscription directly through our platform. Payments are processed by LemonSqueezy, our trusted third-party payment provider. This policy governs refunds for subscription fees only — it does not apply to any third-party services or integrations you may have purchased separately.",
      },
    ],
  },
  {
    id: "plans",
    icon: "💳",
    color: "#34d399",
    dim: "rgba(52,211,153,.08)",
    border: "rgba(52,211,153,.25)",
    title: "Subscription Plans",
    content: [
      {
        sub: "Monthly Plans",
        body: "Monthly subscriptions are billed every 30 days and auto-renew until cancelled. Due to the short billing cycle and immediate access to the full platform, monthly subscription payments are non-refundable once charged.",
      },
      {
        sub: "Yearly Plans",
        body: "Yearly subscriptions are billed once annually and auto-renew after 12 months unless cancelled before the renewal date. Yearly plans are eligible for a full refund within 14 days of the initial payment date.",
      },
      {
        sub: "Plan Upgrades & Downgrades",
        body: "If you upgrade from a monthly to a yearly plan, the 14-day refund window applies from the date of the yearly payment. Downgrades take effect at the end of the current billing period — the difference is not refunded for the remaining period.",
      },
    ],
  },
  {
    id: "eligibility",
    icon: "✅",
    color: "#f59e0b",
    dim: "rgba(245,158,11,.08)",
    border: "rgba(245,158,11,.25)",
    title: "Refund Eligibility",
    content: [
      {
        sub: "Yearly Plan — 14-Day Window",
        body: "You are eligible for a full refund on a yearly plan if: (1) your refund request is submitted within 14 calendar days of the initial payment date, and (2) you have not violated our Terms of Service or Acceptable Use Policy. Refund requests submitted after the 14-day window will not be approved.",
      },
      {
        sub: "Technical Failures",
        body: "If FinovaOS experiences a significant technical failure that prevents you from accessing the platform for an extended and unresolved period, you may be eligible for a prorated credit or partial refund at our sole discretion, regardless of your plan type. Eligibility is assessed case-by-case based on the nature, duration, and impact of the disruption.",
      },
      {
        sub: "Duplicate Charges",
        body: "If you were charged more than once for the same subscription period due to a billing error, we will refund the duplicate charge in full upon verification. Please contact us immediately at legal@finovaos.app with your receipt details.",
      },
    ],
  },
  {
    id: "non-refundable",
    icon: "🚫",
    color: "#f87171",
    dim: "rgba(248,113,113,.08)",
    border: "rgba(248,113,113,.25)",
    title: "Non-Refundable Situations",
    content: [
      {
        sub: "Monthly Subscriptions",
        body: "All monthly subscription payments are non-refundable. Cancelling a monthly plan stops future renewals but does not entitle you to a refund of the current billing period.",
      },
      {
        sub: "Yearly Plans After 14 Days",
        body: "Yearly subscription payments are not refundable after the 14-day refund window has passed, regardless of whether you continue using the platform for the remainder of the year.",
      },
      {
        sub: "Partial Months & Unused Time",
        body: "We do not issue prorated refunds for partial months of use, unused features, or the remaining portion of a subscription period after cancellation.",
      },
      {
        sub: "Account Violations",
        body: "If your account was suspended or terminated due to a violation of our Terms of Service or Acceptable Use Policy (including fraud, misuse, or prohibited activities), you are not entitled to any refund of subscription fees paid.",
      },
      {
        sub: "Add-Ons & One-Time Fees",
        body: "Any one-time setup fees, professional services, custom onboarding fees, or add-on purchases are non-refundable unless explicitly stated otherwise in a separate written agreement.",
      },
    ],
  },
  {
    id: "how-to-request",
    icon: "📧",
    color: "#a78bfa",
    dim: "rgba(167,139,250,.08)",
    border: "rgba(167,139,250,.25)",
    title: "How to Request a Refund",
    content: [
      {
        sub: "Step 1 — Email Us",
        body: "Send your refund request to legal@finovaos.app from the email address associated with your FinovaOS account. Include your company name, registered email, subscription plan, and the reason for the refund request.",
      },
      {
        sub: "Step 2 — We Review Your Request",
        body: "Our team will review your request within 2–3 business days and verify your eligibility based on this policy. We may ask for additional information to process the request.",
      },
      {
        sub: "Step 3 — Approval & Processing",
        body: "Once approved, we will initiate the refund through LemonSqueezy, our payment processor. Refunds are returned to the original payment method used at the time of purchase.",
      },
      {
        sub: "Step 4 — Bank Processing Time",
        body: "After we initiate the refund, the funds will appear on your statement within 5–10 business days, depending on your bank or card issuer. Total processing time from request to refund typically takes 7–14 business days.",
      },
    ],
  },
  {
    id: "cancellation",
    icon: "🚪",
    color: "#06b6d4",
    dim: "rgba(6,182,212,.08)",
    border: "rgba(6,182,212,.25)",
    title: "Cancellation vs Refund",
    content: [
      {
        sub: "Cancelling Your Subscription",
        body: "Cancellation and refund are two separate actions. Cancelling your subscription stops future automatic renewal charges — your account remains active until the end of the current billing period. Cancelling alone does not trigger a refund for the current period.",
      },
      {
        sub: "Requesting a Refund",
        body: "A refund request is a separate action from cancellation. If you wish to cancel and receive a refund (for eligible yearly plans within 14 days), you must submit both a cancellation and a refund request. We recommend doing both at the same time to avoid being charged for the next renewal.",
      },
      {
        sub: "After Cancellation",
        body: "After cancellation, your account enters a read-only grace period for 30 days. You can log in, view records, and export your data. No new data can be created. After 90 days from cancellation, all data is permanently deleted. See our Terms of Service for full details.",
      },
    ],
  },
  {
    id: "chargebacks",
    icon: "⚠️",
    color: "#f97316",
    dim: "rgba(249,115,22,.08)",
    border: "rgba(249,115,22,.25)",
    title: "Chargebacks & Disputes",
    content: [
      {
        sub: "Contact Us First",
        body: "If you believe you were charged incorrectly, please contact us at legal@finovaos.app before initiating a chargeback with your bank. Most billing issues can be resolved quickly and directly without the need for a dispute.",
      },
      {
        sub: "Chargebacks",
        body: "Filing a chargeback without first contacting us may result in immediate suspension or termination of your FinovaOS account. We take all chargeback attempts seriously and will provide full documentation to your bank or payment provider to contest any unauthorized chargeback claims.",
      },
      {
        sub: "Fraudulent Chargebacks",
        body: "Any chargeback filed fraudulently or in bad faith — where the charge was legitimate and within our policy — will be contested in full. We reserve the right to pursue recovery of the disputed amount through available legal channels.",
      },
    ],
  },
  {
    id: "taxes",
    icon: "🧾",
    color: "#f59e0b",
    dim: "rgba(245,158,11,.08)",
    border: "rgba(245,158,11,.25)",
    title: "Taxes & Regulatory Fees",
    content: [
      {
        sub: "Tax on Payments",
        body: "Applicable taxes, VAT, GST, duties, or other regulatory fees charged at the time of purchase may not be refundable where required by applicable law. Refunds, where approved, will be issued for the subscription amount only — excluding any non-recoverable taxes or fees collected on behalf of the relevant tax authority.",
      },
      {
        sub: "Payment Processor",
        body: "All refunds are processed through LemonSqueezy, our third-party payment provider, and are subject to their processing timelines and policies. FinovaOS initiates refunds promptly upon approval but cannot control the exact timeline of funds clearing your bank, which may vary by card issuer or financial institution.",
      },
    ],
  },
  {
    id: "denial",
    icon: "⛔",
    color: "#f87171",
    dim: "rgba(248,113,113,.08)",
    border: "rgba(248,113,113,.25)",
    title: "Refund Denial",
    content: [
      {
        sub: "Right to Deny",
        body: "We reserve the right to deny any refund request that does not meet the eligibility requirements described in this policy. All refund decisions are made at our sole discretion. If your request is denied, we will communicate the reason clearly and promptly.",
      },
      {
        sub: "No Obligation Beyond This Policy",
        body: "This Refund Policy represents the full extent of our refund obligations. We are not bound by any verbal representations, informal agreements, or promises made outside of this written policy unless confirmed in a separate signed agreement with Finova Forge.",
      },
    ],
  },
  {
    id: "changes",
    icon: "📝",
    color: "#818cf8",
    dim: "rgba(129,140,248,.08)",
    border: "rgba(129,140,248,.25)",
    title: "Changes to This Policy",
    content: [
      {
        sub: "Updates",
        body: "We may update this Refund Policy from time to time. If we make material changes, we will notify you via email at least 14 days before the changes take effect. The updated policy will apply to all purchases made after the effective date. Continued use of FinovaOS after that date constitutes your acceptance of the updated policy.",
      },
    ],
  },
  {
    id: "contact",
    icon: "🤝",
    color: "#34d399",
    dim: "rgba(52,211,153,.08)",
    border: "rgba(52,211,153,.25)",
    title: "Contact Us",
    content: [
      {
        sub: "Refund Requests & Billing Questions",
        body: "For all refund requests, billing inquiries, or questions about this policy, contact us at: legal@finovaos.app — Our team responds within 2–3 business days. FinovaOS is a product of Finova Forge.",
      },
    ],
  },
];

function useVisible(threshold = 0.08) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, v] as const;
}

function Section({ s, index }: { s: typeof SECTIONS[0]; index: number }) {
  const [ref, visible] = useVisible();
  return (
    <div ref={ref} id={s.id} style={{
      padding:"40px 0",
      borderTop:"1px solid rgba(255,255,255,.06)",
      opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(20px)",
      transition:"all .6s cubic-bezier(.22,1,.36,1)",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:24 }}>
        <div style={{
          width:44, height:44, borderRadius:13, flexShrink:0,
          background:s.dim, border:`1.5px solid ${s.border}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:22,
        }}>
          {s.icon}
        </div>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
            <div style={{ width:20, height:2, borderRadius:1, background:s.color }}/>
            <span style={{ fontSize:10, fontWeight:700, color:s.color, letterSpacing:".1em", textTransform:"uppercase" }}>
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>
          <h2 style={{
            fontFamily:"'Lora',serif",
            fontSize:"clamp(17px,2.5vw,22px)",
            fontWeight:700, color:"white",
            letterSpacing:"-.4px", lineHeight:1.2, margin:0,
          }}>
            {s.title}
          </h2>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:12, paddingLeft:58 }}>
        {s.content.map((c) => (
          <div key={c.sub} style={{
            padding:"16px 20px", borderRadius:14,
            background:"rgba(255,255,255,.03)",
            border:"1px solid rgba(255,255,255,.07)",
            borderLeft:`3px solid ${s.color}`,
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,.055)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,.03)"; }}
          >
            <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.45)", marginBottom:5, textTransform:"uppercase", letterSpacing:".06em" }}>{c.sub}</div>
            <div style={{ fontSize:13.5, color:"rgba(255,255,255,.55)", lineHeight:1.8 }}>{c.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RefundPolicyPage() {
  const [heroRef, heroVisible] = useVisible(0.2);
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); });
    }, { threshold: 0.35 });
    SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(180deg,#080c1e 0%,#0c0f2e 30%,#080c1e 100%)",
      color:"white",
      fontFamily:"'Outfit','DM Sans',sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Lora:ital,wght@0,700;1,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes orbDrift{0%,100%{transform:translate(0,0)}50%{transform:translate(16px,-14px)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        .toc-btn{
          display:flex;align-items:center;gap:9px;
          padding:7px 12px;border-radius:10px;
          font-size:11.5px;font-weight:600;
          color:rgba(255,255,255,.35);
          cursor:pointer;transition:all .2s;
          border:1px solid transparent;
          text-align:left;background:none;
          font-family:inherit;width:100%;
        }
        .toc-btn:hover{color:rgba(255,255,255,.7);background:rgba(255,255,255,.04);}
        .toc-btn.active{color:white;background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.3);}
        @media(max-width:1000px){
          .layout-grid{grid-template-columns:1fr!important;}
          .toc-sidebar{display:none!important;}
        }
      `}</style>

      {/* BG */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
        <div style={{ position:"absolute", inset:0,
          backgroundImage:"linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px)",
          backgroundSize:"48px 48px" }}/>
        <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%",
          background:"radial-gradient(circle,rgba(99,102,241,.1),transparent 65%)",
          top:-120, right:-80, animation:"orbDrift 14s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", top:0, left:"10%", right:"10%", height:1,
          background:"linear-gradient(90deg,transparent,rgba(99,102,241,.4),transparent)" }}/>
      </div>

      <div style={{ position:"relative", zIndex:1 }}>
        {/* HERO */}
        <section style={{ padding:"80px 24px 48px", maxWidth:1100, margin:"0 auto" }}>
          <div ref={heroRef}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:28,
              opacity:heroVisible?1:0, transition:"opacity .5s" }}>
              <Link href="/" style={{ fontSize:12, color:"rgba(255,255,255,.28)", textDecoration:"none", fontWeight:500 }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.6)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.28)")}>
                Home
              </Link>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              <span style={{ fontSize:12, color:"rgba(255,255,255,.45)", fontWeight:500 }}>Refund Policy</span>
            </div>

            <div style={{ display:"flex", alignItems:"flex-start", gap:20, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:280 }}>
                <div style={{
                  display:"inline-flex", alignItems:"center", gap:7,
                  padding:"5px 14px", borderRadius:22,
                  background:"rgba(129,140,248,.1)", border:"1.5px solid rgba(129,140,248,.28)",
                  fontSize:10.5, fontWeight:700, color:"#c7d2fe",
                  letterSpacing:".09em", textTransform:"uppercase", marginBottom:18,
                  opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(12px)",
                  transition:"all .5s ease .06s",
                }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:"#818cf8", animation:"blink 2s ease infinite" }}/>
                  Legal Document · Last Updated {LAST_UPDATED}
                </div>

                <h1 style={{
                  fontFamily:"'Lora',serif",
                  fontSize:"clamp(32px,4.5vw,52px)",
                  fontWeight:700, color:"white",
                  letterSpacing:"-1.5px", lineHeight:1.1, marginBottom:14,
                  opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(16px)",
                  transition:"all .6s ease .1s",
                }}>
                  Refund Policy
                  <span style={{ display:"block", fontStyle:"italic",
                    background:"linear-gradient(135deg,#c7d2fe,#818cf8)",
                    WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                    fontSize:"80%" }}>
                    Honest. Clear. No surprises.
                  </span>
                </h1>

                <p style={{
                  fontSize:15, color:"rgba(255,255,255,.4)", lineHeight:1.8, maxWidth:560,
                  opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(12px)",
                  transition:"all .6s ease .16s",
                }}>
                  We want you to feel confident choosing FinovaOS. This policy explains exactly when refunds apply and how to request one.
                </p>
              </div>

              {/* Summary card */}
              <div style={{
                borderRadius:20, padding:"24px 28px", minWidth:250,
                background:"rgba(255,255,255,.04)",
                border:"1.5px solid rgba(255,255,255,.09)",
                backdropFilter:"blur(20px)",
                boxShadow:"0 16px 48px rgba(0,0,0,.3)",
                opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(16px)",
                transition:"all .6s ease .22s",
                position:"relative", overflow:"hidden",
              }}>
                <div style={{ position:"absolute", top:0, left:"15%", right:"15%", height:1,
                  background:"linear-gradient(90deg,transparent,rgba(129,140,248,.5),transparent)" }}/>
                <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:14 }}>
                  Quick Summary
                </div>
                {[
                  { icon:"🚫", text:"Monthly plans — non-refundable" },
                  { icon:"✅", text:"Yearly plans — 14-day refund window" },
                  { icon:"⚡", text:"Processed in 7–14 business days" },
                  { icon:"📧", text:"Request via legal@finovaos.app" },
                  { icon:"💳", text:"Refunded to original payment method" },
                  { icon:"🔒", text:"No chargebacks without contacting us" },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <span style={{ fontSize:15 }}>{icon}</span>
                    <span style={{ fontSize:12.5, color:"rgba(255,255,255,.6)", fontWeight:500 }}>{text}</span>
                  </div>
                ))}
                <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid rgba(255,255,255,.07)" }}>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.22)", lineHeight:1.6 }}>
                    Questions? Contact us at<br/>
                    <a href={EMAIL_HREF} rel="noopener noreferrer" style={{ color:"#818cf8", textDecoration:"none", fontWeight:600 }}>{EMAIL}</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN LAYOUT */}
        <div className="layout-grid" style={{
          maxWidth:1100, margin:"0 auto", padding:"0 24px 80px",
          display:"grid", gridTemplateColumns:"220px 1fr", gap:48, alignItems:"start",
        }}>
          {/* Sticky TOC */}
          <aside className="toc-sidebar" style={{ position:"sticky", top:40 }}>
            <div style={{
              borderRadius:16, padding:"14px 10px",
              background:"rgba(255,255,255,.03)",
              border:"1px solid rgba(255,255,255,.07)",
              backdropFilter:"blur(16px)",
            }}>
              <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.25)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:10, paddingLeft:12 }}>
                Contents
              </div>
              {SECTIONS.map(s => (
                <button key={s.id} className={`toc-btn${activeSection === s.id ? " active" : ""}`}
                  onClick={() => scrollTo(s.id)}>
                  <span style={{ fontSize:13 }}>{s.icon}</span>
                  <span style={{ lineHeight:1.3 }}>{s.title}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Content */}
          <div>
            {SECTIONS.map((s, i) => <Section key={s.id} s={s} index={i} />)}

            {/* Footer contact */}
            <div style={{
              marginTop:40, padding:"28px 32px", borderRadius:20,
              background:"rgba(255,255,255,.03)",
              border:"1.5px solid rgba(255,255,255,.08)",
              backdropFilter:"blur(16px)",
              position:"relative", overflow:"hidden",
            }}>
              <div style={{ position:"absolute", top:0, left:"20%", right:"20%", height:1,
                background:"linear-gradient(90deg,transparent,rgba(129,140,248,.4),transparent)" }}/>
              <h3 style={{ fontFamily:"'Lora',serif", fontSize:18, fontWeight:700, color:"white", marginBottom:8 }}>
                Need a Refund or Have a Question?
              </h3>
              <p style={{ fontSize:13, color:"rgba(255,255,255,.4)", lineHeight:1.8, marginBottom:16 }}>
                Email us directly — we respond within 2–3 business days and handle all refund requests personally.
              </p>
              <a href={EMAIL_HREF} rel="noopener noreferrer" style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"10px 18px", borderRadius:12,
                background:"rgba(129,140,248,.08)", border:"1px solid rgba(129,140,248,.25)",
                color:"#c7d2fe", textDecoration:"none", fontSize:13, fontWeight:600,
                marginBottom:18,
              }}>
                📧 {EMAIL}
              </a>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <Link href="/legal/terms" style={{
                  display:"inline-flex", alignItems:"center", gap:7,
                  padding:"9px 16px", borderRadius:10,
                  background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)",
                  color:"rgba(255,255,255,.55)", fontWeight:600, fontSize:13, textDecoration:"none",
                }}>
                  📋 Terms of Service →
                </Link>
                <Link href="/legal/privacy" style={{
                  display:"inline-flex", alignItems:"center", gap:7,
                  padding:"9px 16px", borderRadius:10,
                  background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)",
                  color:"rgba(255,255,255,.55)", fontWeight:600, fontSize:13, textDecoration:"none",
                }}>
                  🔏 Privacy Policy →
                </Link>
              </div>
            </div>

            <div style={{ marginTop:20, padding:"14px 18px", borderRadius:12,
              background:"rgba(129,140,248,.05)", border:"1px solid rgba(129,140,248,.15)" }}>
              <p style={{ fontSize:12, color:"rgba(255,255,255,.3)", lineHeight:1.7, margin:0 }}>
                <span style={{ fontWeight:700, color:"rgba(129,140,248,.6)" }}>Note: </span>
                This document should be reviewed by a qualified legal professional licensed in your jurisdiction before the platform goes live in production.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
