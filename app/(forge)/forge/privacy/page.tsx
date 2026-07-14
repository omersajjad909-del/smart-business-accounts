"use client";
import { ForgeNav, ForgeFooter, useInView } from "../../components/shared";

const ff = "'Outfit','DM Sans',sans-serif";

const sections = [
  {
    title: "Who We Are & Scope of This Policy",
    body: [
      "Finova Forge is a software company that designs and builds intelligent business software, including FinovaOS.",
      "This Privacy Policy covers data collected solely through the finovaforge.com company website — such as contact form submissions, newsletter sign-ups, and website analytics.",
      "For the FinovaOS software platform (our product), a separate, comprehensive Privacy Policy is available at finovaos.app/legal/privacy. That policy governs all data processed within the FinovaOS platform, including business data, subscriptions, and payment processing.",
    ],
  },
  {
    title: "Information We Collect",
    body: [
      "When you interact with finovaforge.com, we may collect:",
      "• Contact & inquiry data: your name, email address, company name, and message when you submit our contact form or reach out to us directly.",
      "• Newsletter sign-ups: your email address if you subscribe to product or company updates.",
      "• Website analytics: pages visited, session duration, browser type, device type, and approximate location (country/city level) via Google Analytics. This data is aggregated and anonymised.",
      "• Cookies: essential cookies for website security and, with your consent, analytics cookies to understand how visitors use this site.",
    ],
  },
  {
    title: "How We Use Your Information",
    body: [
      "We use the information we collect to:",
      "• Respond to your inquiries, questions, and contact form submissions.",
      "• Send company or product updates if you have subscribed (you may unsubscribe at any time).",
      "• Understand how visitors use our website and improve content, structure, and performance.",
      "• Comply with legal obligations if required.",
      "We do not sell, rent, or trade your personal information to any third party.",
    ],
  },
  {
    title: "No Payment Data",
    body: [
      "finovaforge.com does not process any payments or subscriptions.",
      "All payment processing for FinovaOS subscriptions takes place on finovaos.app, handled by LemonSqueezy (Lemon Squeezy, LLC) as a third-party payment processor. Finova Forge does not store payment card details on any of its systems.",
      "If you are looking for information about how your subscription payment data is handled, please refer to finovaos.app/legal/privacy.",
    ],
  },
  {
    title: "Analytics & Cookies",
    body: [
      "We use Google Analytics to understand website traffic and visitor behaviour on finovaforge.com. Google Analytics collects anonymised data including page views, session duration, and approximate location.",
      "Analytics cookies are only placed with your consent. You may accept or decline analytics cookies using the cookie banner when you first visit this site.",
      "Essential cookies (required for website security and basic functionality) are always active and cannot be disabled.",
      "You can manage or withdraw your cookie consent at any time by clicking the cookie icon in the bottom corner of this website.",
    ],
  },
  {
    title: "Data Sharing",
    body: [
      "We do not sell or share your personal data with advertisers, data brokers, or any third party for commercial purposes.",
      "We may share data with trusted service providers who help us operate this website — currently limited to Google Analytics for website measurement. These providers process data only on our behalf and under strict data processing terms.",
      "We may disclose information if required to do so by law, court order, or to protect the rights and safety of Finova Forge, our users, or the public.",
    ],
  },
  {
    title: "Data Retention",
    body: [
      "Contact form and inquiry data is retained for up to 12 months to allow for follow-up communications, after which it is deleted.",
      "Newsletter subscriber data is retained until you unsubscribe, after which your email is removed promptly.",
      "Website analytics data is retained subject to Google Analytics' standard retention settings (typically 14 months).",
      "You may request deletion of your data at any time by emailing privacy@finovaforge.com.",
    ],
  },
  {
    title: "Your Rights",
    body: [
      "Depending on your location, you may have the right to:",
      "• Access: request a copy of the personal data we hold about you.",
      "• Correction: request that inaccurate data be corrected.",
      "• Deletion: request that your personal data be deleted.",
      "• Withdrawal of consent: withdraw analytics or marketing consent at any time.",
      "To exercise any of these rights, email us at privacy@finovaforge.com. We will respond within 30 days.",
    ],
  },
  {
    title: "Changes to This Policy",
    body: [
      "We may update this Privacy Policy from time to time. When we do, we will update the \"Last updated\" date at the top of this page.",
      "Significant changes will be communicated via a notice on this website. Continued use of finovaforge.com after any changes constitutes acceptance of the updated policy.",
    ],
  },
  {
    title: "Contact Us",
    body: [
      "For privacy-related questions about this website:",
      "Email: privacy@finovaforge.com",
      "General enquiries: hello@finovaforge.com",
      "For FinovaOS platform privacy (our product): legal@finovaos.app",
    ],
  },
];

function Hero() {
  return (
    <section
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
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.35)", margin: "0 0 10px", lineHeight: 1.7 }}>
          Last updated: July 2026 · Finova Forge
        </p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,.25)", margin: 0, lineHeight: 1.7 }}>
          This policy covers the finovaforge.com website only.{" "}
          For FinovaOS platform privacy, visit{" "}
          <a
            href="https://finovaos.app/legal/privacy"
            style={{ color: "#fbbf24", textDecoration: "none", fontWeight: 600 }}
          >
            finovaos.app/legal/privacy
          </a>
          .
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
          style={{
            padding: "clamp(22px,5vw,32px) clamp(20px,5vw,36px)",
            borderRadius: 16,
            background: "rgba(245,158,11,.05)",
            border: "1px solid rgba(245,158,11,.15)",
            marginBottom: 48,
          }}
        >
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.55)", lineHeight: 1.8, margin: 0 }}>
            Finova Forge (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy.
            This policy explains what data we collect through our company website at finovaforge.com, how we use it, and your rights.
            We do not sell your data. We do not process payments on this website.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
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
      `}</style>
      <ForgeNav />
      <Hero />
      <Content />
      <ForgeFooter />
    </div>
  );
}
