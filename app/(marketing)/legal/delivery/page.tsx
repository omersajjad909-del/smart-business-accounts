"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const LAST_UPDATED = "21 August 2026";
const EMAIL = "support@finovaos.app";
const EMAIL_HREF = `mailto:${EMAIL}`;

const SECTIONS = [
  {
    id: "overview",
    icon: "📦",
    color: "#818cf8",
    dim: "rgba(129,140,248,.08)",
    border: "rgba(129,140,248,.25)",
    title: "Overview",
    content: [
      {
        sub: "What This Policy Covers",
        body: "FinovaOS is a cloud-based accounting and ERP platform delivered entirely over the internet as a Software-as-a-Service (SaaS) subscription. This Service Delivery Policy explains what you receive when you purchase a subscription, how and when that service is delivered to you, and what to do if delivery does not complete as expected.",
      },
      {
        sub: "No Physical Goods",
        body: "FinovaOS does not sell, ship, or dispatch any physical products. There is no courier, no tracking number, no shipping address and no delivery charge at any point. Everything you purchase is a digital service delivered electronically to your FinovaOS account. Any reference to “delivery” in our policies means activation of your online account access.",
      },
      {
        sub: "Who This Applies To",
        body: "This policy applies to every customer who purchases a FinovaOS subscription or add-on directly through our platform, in any country and in any currency. Payments from Pakistan are processed in PKR by Safepay; international payments are processed in USD by LemonSqueezy. The delivery process described below is identical for both.",
      },
    ],
  },
  {
    id: "what-you-receive",
    icon: "🎁",
    color: "#34d399",
    dim: "rgba(52,211,153,.08)",
    border: "rgba(52,211,153,.25)",
    title: "What You Receive",
    content: [
      {
        sub: "Platform Access",
        body: "On successful payment you receive immediate access to the FinovaOS web application at your company workspace, signed in with the email address you registered. FinovaOS runs in any modern web browser — there is nothing to download, install, or license separately.",
      },
      {
        sub: "Modules Included in Your Plan",
        body: "Your subscription unlocks every module included in the plan you purchased — for example invoicing, purchases, inventory, banking, payroll, and financial reporting. The exact module list for Starter, Professional and Enterprise is shown on our Pricing page before you pay, and again on the payment page at the moment of checkout.",
      },
      {
        sub: "Users & Seats",
        body: "Your plan includes a set number of user seats. Additional seats can be purchased at any time from your billing settings and are activated immediately on payment, exactly like a new subscription.",
      },
      {
        sub: "Support & Updates",
        body: "Every paid subscription includes customer support and all platform updates released during your subscription term at no extra cost. You are never charged separately for new features, security patches, or version upgrades.",
      },
    ],
  },
  {
    id: "timeline",
    icon: "⚡",
    color: "#f59e0b",
    dim: "rgba(245,158,11,.08)",
    border: "rgba(245,158,11,.25)",
    title: "Delivery Timeline",
    content: [
      {
        sub: "Immediate Activation",
        body: "Delivery is instant. As soon as your payment is confirmed by Safepay or LemonSqueezy, your plan is activated automatically and you are redirected straight into your FinovaOS dashboard with full access. In the vast majority of cases this happens within a few seconds of completing payment.",
      },
      {
        sub: "Maximum Delivery Window",
        body: "If a payment provider takes longer than usual to confirm a transaction, activation may be delayed. In every case your subscription will be activated within a maximum of 24 hours of the payment being successfully received. You do not need to do anything during this period — activation is automatic.",
      },
      {
        sub: "Bank or Network Delays",
        body: "Occasionally a bank, card issuer, or wallet provider holds a transaction for verification before releasing it to the payment gateway. Delivery begins from the moment the payment is confirmed to us, not from the moment you submitted it. If your bank holds a payment, activation follows immediately once that hold is released.",
      },
      {
        sub: "Renewals",
        body: "For subscription renewals there is no interruption in service. Your access continues uninterrupted through the renewal date, and the new billing period begins automatically without any re-activation step.",
      },
    ],
  },
  {
    id: "confirmation",
    icon: "✅",
    color: "#38bdf8",
    dim: "rgba(56,189,248,.08)",
    border: "rgba(56,189,248,.25)",
    title: "Order Confirmation & Proof of Delivery",
    content: [
      {
        sub: "On-Screen Confirmation",
        body: "Immediately after a successful payment you are returned to your FinovaOS billing dashboard, where a confirmation is displayed showing your newly activated plan, billing cycle, and next renewal date.",
      },
      {
        sub: "Confirmation Email",
        body: "We send a confirmation email to your registered address confirming that your plan has been activated, along with the plan name, the amount charged, and the billing cycle. If you cannot find it, please check your spam or promotions folder before contacting us.",
      },
      {
        sub: "Invoice & Receipt",
        body: "A dated invoice is generated for every payment and is available to download as a PDF at any time from Dashboard → Billing. The invoice shows your company details, the plan purchased, the amount, the currency, and the payment reference from the gateway. This serves as your permanent proof of purchase and delivery.",
      },
      {
        sub: "Verifying Your Active Plan",
        body: "You can confirm your subscription is live at any time by opening Dashboard → Billing, which always displays your current plan, its status, your seat count, and your next renewal date.",
      },
    ],
  },
  {
    id: "requirements",
    icon: "💻",
    color: "#a78bfa",
    dim: "rgba(167,139,250,.08)",
    border: "rgba(167,139,250,.25)",
    title: "What You Need to Access the Service",
    content: [
      {
        sub: "Internet Connection",
        body: "FinovaOS is delivered over the internet and requires an active internet connection to use. A standard broadband or mobile data connection is sufficient — no special bandwidth or hardware is required.",
      },
      {
        sub: "Supported Browsers",
        body: "FinovaOS works on the current and previous major versions of Google Chrome, Microsoft Edge, Mozilla Firefox and Safari, on desktop, tablet and mobile. We recommend keeping your browser updated for the best experience and for security.",
      },
      {
        sub: "No Installation Required",
        body: "There is no software to install and no licence key to enter. Your subscription is tied to your account, so you can sign in from any device, at any location, at any time during your subscription term.",
      },
    ],
  },
  {
    id: "failed-delivery",
    icon: "🛠",
    color: "#f87171",
    dim: "rgba(248,113,113,.08)",
    border: "rgba(248,113,113,.25)",
    title: "If Delivery Does Not Complete",
    content: [
      {
        sub: "Payment Taken but Plan Not Active",
        body: "If your payment was charged but your plan has not activated within 24 hours, contact us immediately at support@finovaos.app with your registered email and the payment reference from your bank or gateway receipt. We treat non-delivery as our highest support priority.",
      },
      {
        sub: "Our Commitment",
        body: "We will either activate your subscription manually or, if we are unable to deliver the service you paid for, refund your payment in full to the original payment method. You will never be charged for a service that was not delivered to you.",
      },
      {
        sub: "Failed or Cancelled Payments",
        body: "If a payment fails or is cancelled at the gateway, no subscription is created and no charge is captured. Any amount that appears as pending on your statement is released by your bank automatically, typically within 3–7 business days. Nothing is owed and nothing is delivered.",
      },
      {
        sub: "Duplicate Charges",
        body: "If you were charged twice for the same subscription period due to a technical or banking error, only one subscription is delivered and the duplicate charge is refunded in full on verification. See our Refund Policy for how to raise this.",
      },
    ],
  },
  {
    id: "interruptions",
    icon: "🔄",
    color: "#06b6d4",
    dim: "rgba(6,182,212,.08)",
    border: "rgba(6,182,212,.25)",
    title: "Continued Delivery & Interruptions",
    content: [
      {
        sub: "Ongoing Availability",
        body: "Once delivered, your subscription remains continuously available for the whole of your billing period. We target high availability for the platform and publish our commitments in our Service Level Agreement.",
      },
      {
        sub: "Planned Maintenance",
        body: "Occasional scheduled maintenance may be required. Where maintenance is expected to affect access, we give advance notice by email and on our status page, and we schedule it outside standard Pakistan business hours wherever possible.",
      },
      {
        sub: "Unplanned Downtime",
        body: "If an unplanned outage prevents you from accessing the platform for an extended and unresolved period, you may be eligible for service credits or a partial refund as described in our Service Level Agreement and Refund Policy.",
      },
      {
        sub: "End of Delivery",
        body: "Delivery of the service ends when your subscription ends — whether through cancellation, non-renewal, or termination. Your data remains available for export during the grace period described in our Terms of Service.",
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
        body: "We may update this Service Delivery Policy from time to time to reflect changes in how the platform is delivered. If we make material changes we will notify you by email at least 14 days before they take effect. The version published on this page at the time of your purchase is the version that applies to that purchase.",
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
        sub: "Delivery & Activation Support",
        body: "For any question about activation, access, or non-delivery, contact support@finovaos.app or message us on WhatsApp at +92 304 7653693. Our team responds within 24 hours, and within 4 hours for Professional and Enterprise customers. FinovaOS is a product of Finova Forge.",
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

export default function ServiceDeliveryPolicyPage() {
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
              <span style={{ fontSize:12, color:"rgba(255,255,255,.45)", fontWeight:500 }}>Service Delivery Policy</span>
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
                  Service Delivery Policy
                  <span style={{ display:"block", fontStyle:"italic",
                    background:"linear-gradient(135deg,#c7d2fe,#818cf8)",
                    WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                    fontSize:"80%" }}>
                    Instant. Digital. Nothing to ship.
                  </span>
                </h1>

                <p style={{
                  fontSize:15, color:"rgba(255,255,255,.4)", lineHeight:1.8, maxWidth:560,
                  opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(12px)",
                  transition:"all .6s ease .16s",
                }}>
                  FinovaOS is delivered online, not in a box. This policy explains exactly what you receive, how quickly it reaches you, and what happens if it does not.
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
                  { icon:"⚡", text:"Activated instantly on payment" },
                  { icon:"🕐", text:"Maximum 24 hours in all cases" },
                  { icon:"🚫", text:"No physical shipment, no delivery fee" },
                  { icon:"🧾", text:"PDF invoice in Dashboard → Billing" },
                  { icon:"🌐", text:"Any modern browser, any device" },
                  { icon:"🛠", text:"Not delivered? Full refund" },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <span style={{ fontSize:15 }}>{icon}</span>
                    <span style={{ fontSize:12.5, color:"rgba(255,255,255,.6)", fontWeight:500 }}>{text}</span>
                  </div>
                ))}
                <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid rgba(255,255,255,.07)" }}>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.22)", lineHeight:1.6 }}>
                    Activation problem? Contact<br/>
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
                Plan Not Activated After Payment?
              </h3>
              <p style={{ fontSize:13, color:"rgba(255,255,255,.4)", lineHeight:1.8, marginBottom:16 }}>
                Email us with your registered address and payment reference — non-delivery is our highest support priority, and we either activate your account or refund you in full.
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
                <Link href="/legal/refund" style={{
                  display:"inline-flex", alignItems:"center", gap:7,
                  padding:"9px 16px", borderRadius:10,
                  background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)",
                  color:"rgba(255,255,255,.55)", fontWeight:600, fontSize:13, textDecoration:"none",
                }}>
                  ↩️ Refund Policy →
                </Link>
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
