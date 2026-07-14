"use client";
import { ForgeNav, ForgeFooter, useInView } from "../../components/shared";

const ff = "'Outfit','DM Sans',sans-serif";

const sections = [
  {
    title: "Information We Collect",
    body: [
      "When you use FinovaOS or visit finovaforge.com, we may collect the following information:",
      "• Account information: name, email address, company name, and password when you register.",
      "• Usage data: pages visited, features used, and actions taken within the platform.",
      "• Payment information: processed securely through LemonSqueezy (Lemon Squeezy, LLC), our third-party payment provider. We do not store full card numbers, CVV codes, or other sensitive cardholder data on our servers.",
      "• Device data: browser type, IP address, and operating system for security and analytics purposes.",
    ],
  },
  {
    title: "How We Use Your Information",
    body: [
      "We use the information we collect to:",
      "• Provide, maintain, and improve our products and services.",
      "• Process transactions and send related information including purchase confirmations.",
      "• Send service-related communications such as updates, security alerts, and support messages.",
      "• Respond to your comments and questions.",
      "• Monitor and analyze usage trends to improve user experience.",
    ],
  },
  {
    title: "Data Sharing",
    body: [
      "We do not sell, trade, or rent your personal information to third parties.",
      "We share data with trusted service providers who assist in operating our platform — including cloud hosting providers and LemonSqueezy (our payment processor) — under strict confidentiality agreements. These providers may only process your data as directed by us.",
      "We may disclose information if required by law or to protect the rights, property, or safety of Finova Forge, our users, or the public.",
    ],
  },
  {
    title: "Data Security",
    body: [
      "We implement industry-standard security measures to protect your data, including:",
      "• Encryption of data in transit (TLS/SSL) and at rest.",
      "• Regular security audits and vulnerability assessments.",
      "• Access controls limiting who can access your data within our organization.",
      "While we take every reasonable precaution, no method of transmission over the internet is 100% secure.",
    ],
  },
  {
    title: "Data Retention",
    body: [
      "We retain your data for as long as your account is active or as needed to provide services.",
      "You may request deletion of your account and associated data at any time by contacting us at privacy@finovaforge.com.",
      "Certain data may be retained for legal or regulatory compliance purposes after account deletion.",
    ],
  },
  {
    title: "Your Rights",
    body: [
      "Depending on your location, you may have rights including:",
      "• Access: request a copy of the personal data we hold about you.",
      "• Correction: request correction of inaccurate data.",
      "• Deletion: request deletion of your personal data.",
      "• Portability: request your data in a portable format.",
      "To exercise these rights, contact us at privacy@finovaforge.com.",
    ],
  },
  {
    title: "Cookies",
    body: [
      "We use cookies and similar tracking technologies to enhance your experience on our platform.",
      "Essential cookies are required for the platform to function.",
      "Analytics cookies help us understand how users interact with our product. You may opt out through your browser settings.",
    ],
  },
  {
    title: "Changes to This Policy",
    body: [
      "We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through a notice on our platform.",
      "Continued use of our services after changes constitutes acceptance of the updated policy.",
    ],
  },
  {
    title: "Contact Us",
    body: [
      "For privacy-related questions or requests, contact us at:",
      "Email: privacy@finovaforge.com",
      "General: hello@finovaforge.com",
    ],
  },
];

function Hero() {
  return (
    <section
      className="forge-priv-hero"
      style={{
        padding: "clamp(90px,15vw,140px) clamp(16px,3vw,48px) clamp(40px,7vw,60px)",
        fontFamily: ff,
      }}
    >
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
          Privacy Policy
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.35)", margin: 0, lineHeight: 1.7 }}>
          Last updated: July 2026 · Finova Forge
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
            Finova Forge (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy.
            This policy explains how we collect, use, and safeguard your information when you use our products and
            services, including FinovaOS and finovaforge.com.
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

export default function PrivacyPage() {
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
