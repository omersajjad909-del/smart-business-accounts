"use client";
import { ForgeNav, ForgeFooter, useInView } from "../../components/shared";

const ff = "'Outfit','DM Sans',sans-serif";

const sections = [
  {
    title: "About This Website",
    body: [
      "finovaforge.com is the corporate website of Finova Forge — a software company that designs and builds intelligent business software, including FinovaOS.",
      "This website is informational only. It is not a platform where you purchase, subscribe to, or use software products. Product-specific terms for FinovaOS are available at finovaos.app/legal/terms.",
      "By accessing or using this website, you agree to these Terms of Use.",
    ],
  },
  {
    title: "Acceptable Use",
    body: [
      "You may browse, read, and share content from this website for personal and non-commercial informational purposes.",
      "You may not:",
      "• Scrape, copy, or mirror content from this website using automated tools.",
      "• Copy, reproduce, or redistribute our design, branding, copy, or imagery without written permission.",
      "• Attempt to access any administrative systems or infrastructure associated with this website.",
      "• Impersonate Finova Forge or any of its representatives.",
      "• Use this website to transmit harmful, unlawful, or misleading content.",
    ],
  },
  {
    title: "Intellectual Property",
    body: [
      "All content on finovaforge.com — including text, design, visual assets, and branding — is the exclusive intellectual property of Finova Forge. All rights reserved.",
      "\"Finova Forge\", \"FinovaOS\", and all associated logos, marks, and product names are trademarks of Finova Forge and may not be used without prior written consent.",
      "Nothing on this website grants you any rights to our intellectual property beyond the right to view this website in a standard browser.",
    ],
  },
  {
    title: "Disclaimer",
    body: [
      "Content on this website is provided for informational purposes only and does not constitute financial, legal, tax, or technical advice of any kind.",
      "Product descriptions, features, pricing, and availability described on this site refer to our software products and may change without notice. Always refer to the product website (finovaos.app) for current, authoritative product information.",
      "We make reasonable efforts to keep information accurate and up to date, but we make no guarantees regarding the completeness or accuracy of any content on this website.",
    ],
  },
  {
    title: "Third-Party Links",
    body: [
      "This website contains links to third-party websites, including finovaos.app and external resources. These links are provided for convenience and do not constitute an endorsement.",
      "Finova Forge is not responsible for the content, privacy practices, or availability of any linked third-party websites. Your use of any linked site is governed by that site's own terms and policies.",
    ],
  },
  {
    title: "Limitation of Liability",
    body: [
      "To the maximum extent permitted by law, Finova Forge shall not be liable for any direct, indirect, incidental, or consequential damages arising from your use of or inability to use this website.",
      "This website is provided on an \"as is\" and \"as available\" basis. We do not warrant that the website will be uninterrupted, error-free, or free from viruses or other harmful components.",
      "Our total liability for any claims arising from your use of this website shall not exceed £100 (one hundred pounds sterling).",
    ],
  },
  {
    title: "Governing Law",
    body: [
      "These Terms of Use are governed by and construed in accordance with the laws applicable to the jurisdiction in which Finova Forge operates.",
      "Any disputes arising from your use of this website shall be resolved through good-faith negotiation before pursuing formal legal action.",
    ],
  },
  {
    title: "Changes to These Terms",
    body: [
      "We may update these Terms of Use at any time. Changes will be effective immediately upon posting to this page. Continued use of the website after any changes constitutes acceptance of the revised terms.",
      "We recommend reviewing this page periodically.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For questions about these Terms of Use:",
      "Email: hello@finovaforge.com",
      "For FinovaOS product-related legal queries: legal@finovaos.app",
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
          Terms of Use
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.35)", margin: "0 0 10px", lineHeight: 1.7 }}>
          Last updated: July 2026 · Finova Forge
        </p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,.25)", margin: 0, lineHeight: 1.7 }}>
          These terms govern use of the finovaforge.com website only.{" "}
          For FinovaOS product terms, visit{" "}
          <a
            href="https://finovaos.app/legal/terms"
            style={{ color: "#fbbf24", textDecoration: "none", fontWeight: 600 }}
          >
            finovaos.app/legal/terms
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
            These Terms of Use govern your access to and use of the Finova Forge company website at finovaforge.com.
            Finova Forge (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is the software company behind FinovaOS and other business software products.
            These terms apply to this website only — not to any software products or subscriptions.
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

export default function TermsPage() {
  return (
    <div style={{ fontFamily: ff, color: "white" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{background:rgb(7,8,15); overflow-x: hidden;}
        @media (max-width: 600px) {
          .forge-legal-sections { gap: 28px !important; }
        }
      `}</style>
      <ForgeNav />
      <Hero />
      <Content />
      <ForgeFooter />
    </div>
  );
}
