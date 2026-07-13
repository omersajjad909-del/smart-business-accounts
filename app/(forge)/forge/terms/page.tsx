"use client";
import { ForgeNav, ForgeFooter, useInView } from "../../components/shared";

const ff = "'Outfit','DM Sans',sans-serif";

const sections = [
  {
    title: "Acceptance of Terms",
    body: [
      "By accessing or using any Finova Forge products or services — including FinovaOS and finovaforge.com — you agree to be bound by these Terms of Service.",
      "If you do not agree to these terms, you may not use our services. Use of our services constitutes acceptance of these terms.",
    ],
  },
  {
    title: "Description of Services",
    body: [
      "Finova Forge provides business management software, including FinovaOS — an all-in-one platform for accounting, inventory, invoicing, HR, and related business operations.",
      "We reserve the right to modify, suspend, or discontinue any part of our services at any time with reasonable notice.",
    ],
  },
  {
    title: "User Accounts",
    body: [
      "You must create an account to use most of our services. You are responsible for:",
      "• Providing accurate and complete registration information.",
      "• Maintaining the security of your account credentials.",
      "• All activity that occurs under your account.",
      "You must notify us immediately of any unauthorized use of your account at hello@finovaforge.com.",
    ],
  },
  {
    title: "Acceptable Use",
    body: [
      "You agree not to use our services to:",
      "• Violate any applicable laws or regulations.",
      "• Transmit any harmful, fraudulent, or misleading content.",
      "• Attempt to gain unauthorized access to our systems or other users' accounts.",
      "• Reverse engineer, decompile, or attempt to extract source code from our software.",
      "• Resell or sublicense our services without prior written authorization.",
      "We reserve the right to suspend or terminate accounts that violate these terms.",
    ],
  },
  {
    title: "Payment and Billing",
    body: [
      "Paid plans are billed in advance on a monthly or annual basis depending on your selected plan.",
      "All fees are non-refundable except where required by law.",
      "We reserve the right to change pricing with 30 days' notice to existing subscribers.",
      "Failure to pay may result in suspension or termination of your account.",
    ],
  },
  {
    title: "Data Ownership",
    body: [
      "You retain full ownership of all data you input into our platform.",
      "By using our services, you grant Finova Forge a limited license to process your data solely to provide the services.",
      "We will not use your business data for any purpose other than operating and improving the platform.",
      "Upon account termination, you may request an export of your data within 30 days.",
    ],
  },
  {
    title: "Intellectual Property",
    body: [
      "All software, design, content, and trademarks associated with Finova Forge and FinovaOS are the exclusive property of Finova Forge.",
      "You may not copy, reproduce, modify, or distribute any part of our products without prior written consent.",
      "Nothing in these terms grants you any rights to our intellectual property beyond the limited right to use our services.",
    ],
  },
  {
    title: "Limitation of Liability",
    body: [
      "To the maximum extent permitted by law, Finova Forge shall not be liable for any indirect, incidental, special, consequential, or punitive damages.",
      "Our total liability for any claims arising under these terms shall not exceed the amount you paid us in the twelve months preceding the claim.",
      "We do not warrant that our services will be uninterrupted, error-free, or free of viruses or other harmful components.",
    ],
  },
  {
    title: "Termination",
    body: [
      "You may cancel your account at any time through your account settings or by contacting us.",
      "We may terminate or suspend your account immediately if you violate these terms.",
      "Upon termination, your right to use the services ceases immediately. Data export requests must be made within 30 days of termination.",
    ],
  },
  {
    title: "Changes to Terms",
    body: [
      "We may update these Terms of Service at any time. We will notify you of material changes by email or through a notice within the platform.",
      "Continued use of our services after changes become effective constitutes acceptance of the revised terms.",
    ],
  },
  {
    title: "Governing Law",
    body: [
      "These terms are governed by and construed in accordance with applicable law.",
      "Any disputes arising from these terms or use of our services shall be resolved through good-faith negotiation before pursuing formal legal action.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For questions about these Terms of Service, contact us at:",
      "Email: hello@finovaforge.com",
    ],
  },
];

function Hero() {
  return (
    <section className="forge-terms-hero" style={{ padding: "clamp(90px,15vw,140px) clamp(16px,3vw,48px) clamp(40px,7vw,60px)", fontFamily: ff }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
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
          LEGAL
        </div>
        <h1
          style={{
            fontSize: "clamp(32px,5vw,52px)",
            fontWeight: 900,
            color: "white",
            letterSpacing: "-2px",
            margin: "0 0 16px",
            lineHeight: 1.1,
          }}
        >
          Terms of Service
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.35)", margin: 0, lineHeight: 1.7 }}>
          Last updated: May 2026 · Finova Forge
        </p>
      </div>
    </section>
  );
}

function Content() {
  const [ref, vis] = useInView(0.05);
  return (
    <section style={{ padding: "0 clamp(16px,3vw,48px) clamp(72px,12vw,120px)", fontFamily: ff }}>
      <div
        ref={ref}
        style={{
          maxWidth: 800,
          margin: "0 auto",
          opacity: vis ? 1 : 0,
          transform: vis ? "none" : "translateY(20px)",
          transition: "all .5s ease",
        }}
      >
        <div
          className="forge-legal-callout"
          style={{
            padding: "clamp(22px,5vw,32px) clamp(20px,5vw,36px)",
            borderRadius: 16,
            background: "rgba(245,158,11,.05)",
            border: "1px solid rgba(245,158,11,.15)",
            marginBottom: 48,
          }}
        >
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.55)", lineHeight: 1.8, margin: 0 }}>
            These Terms of Service (&quot;Terms&quot;) govern your use of Finova Forge products and services. Please
            read them carefully before using our platform. By using our services, you agree to these Terms.
          </p>
        </div>

        <div className="forge-legal-sections" style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {sections.map((s, i) => (
            <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,.05)", paddingBottom: 40 }}>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "white",
                  margin: "0 0 16px",
                  letterSpacing: "-.4px",
                }}
              >
                {i + 1}. {s.title}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {s.body.map((line, j) => (
                  <p
                    key={j}
                    className="forge-legal-p"
                    style={{
                      fontSize: 14,
                      color: line.startsWith("•") ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.4)",
                      lineHeight: 1.8,
                      margin: 0,
                      paddingLeft: line.startsWith("•") ? 8 : 0,
                    }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div style={{ fontFamily: ff, color: "white" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{background:rgb(7,8,15); overflow-x: hidden;}
        @media (max-width: 600px) {
          .forge-legal-callout { padding: 22px 20px !important; margin-bottom: 32px !important; }
          .forge-legal-sections { gap: 28px !important; }
          .forge-legal-sections > div { padding-bottom: 28px !important; }
          .forge-legal-p { font-size: 14px !important; }
        }
      `}</style>
      <ForgeNav />
      <Hero />
      <Content />
      <ForgeFooter />
    </div>
  );
}
