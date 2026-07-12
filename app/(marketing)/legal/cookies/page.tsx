"use client";

import Link from "next/link";

const LAST_UPDATED = "12 July 2026";

const SECTIONS = [
  {
    title: "What Are Cookies?",
    icon: "🍪",
    color: "#818cf8",
    body:
      "Cookies are small text files stored in your browser. FinovaOS uses them to keep the site secure, remember your preferences, measure performance, and understand how visitors interact with our pages.",
  },
  {
    title: "Essential Cookies",
    icon: "🔐",
    color: "#34d399",
    body:
      "These cookies are necessary for core functionality such as session management, login state, security controls, and fraud prevention. Without them, important parts of the site may not work properly.",
  },
  {
    title: "Analytics Cookies",
    icon: "📈",
    color: "#fbbf24",
    body:
      "We currently use Google Analytics to understand traffic, page performance, and visitor journeys. This helps us improve content quality, landing page structure, and user experience over time.",
  },
  {
    title: "Preference Cookies",
    icon: "🎛️",
    color: "#38bdf8",
    body:
      "These cookies remember choices like theme, consent preferences, or visitor prompts so that the site feels consistent across visits.",
  },
  {
    title: "Third-Party Services",
    icon: "🌐",
    color: "#a78bfa",
    body:
      "Some functionality may rely on trusted third-party services such as analytics, embedded content, payment providers, or support tools. Those services may place their own cookies under their own policies.",
  },
  {
    title: "How To Manage Cookies",
    icon: "⚙️",
    color: "#f87171",
    body:
      "You can control or delete cookies through your browser settings. If you block all cookies, some areas of FinovaOS may not function as expected, especially sign-in, consent handling, and personalization.",
  },
];

export default function CookiePolicyPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#070a1d 0%,#0a1029 45%,#070a1d 100%)",
        color: "white",
        fontFamily: "'Outfit','DM Sans',sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Lora:wght@700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
      `}</style>

      <section style={{ maxWidth: 980, margin: "0 auto", padding: "108px 24px 84px" }}>
        <div style={{ maxWidth: 760, marginBottom: 34 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 14px",
              borderRadius: 999,
              background: "rgba(99,102,241,.1)",
              border: "1px solid rgba(99,102,241,.2)",
              color: "#a5b4fc",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            Legal
          </div>
          <h1 style={{ fontFamily: "'Lora',serif", fontSize: "clamp(34px,5vw,58px)", lineHeight: 1.08, letterSpacing: "-.04em", margin: "0 0 14px" }}>
            Cookie Policy
          </h1>
          <p style={{ margin: "0 0 10px", fontSize: 16.5, color: "rgba(255,255,255,.56)", lineHeight: 1.85 }}>
            This page explains what cookies and similar browser storage technologies FinovaOS uses, why we use them,
            and what control you have over them.
          </p>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.34)" }}>Last updated: {LAST_UPDATED}</div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {SECTIONS.map((section) => (
            <article
              key={section.title}
              style={{
                borderRadius: 22,
                padding: 24,
                background: "rgba(255,255,255,.03)",
                border: "1px solid rgba(255,255,255,.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    background: `${section.color}18`,
                    border: `1px solid ${section.color}2f`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {section.icon}
                </div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{section.title}</h2>
              </div>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.85, color: "rgba(255,255,255,.66)" }}>{section.body}</p>
            </article>
          ))}
        </div>

        <div
          style={{
            marginTop: 24,
            borderRadius: 22,
            padding: 22,
            background: "linear-gradient(135deg,rgba(99,102,241,.08),rgba(124,58,237,.06))",
            border: "1px solid rgba(99,102,241,.18)",
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>Questions about cookies or tracking?</div>
          <p style={{ margin: "0 0 12px", color: "rgba(255,255,255,.58)", lineHeight: 1.75, fontSize: 14 }}>
            You can contact us for privacy and compliance questions any time. For broader data handling details, also review our privacy policy.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/contact" style={{ textDecoration: "none", color: "white", background: "linear-gradient(135deg,#818cf8,#6366f1)", padding: "11px 18px", borderRadius: 12, fontSize: 13, fontWeight: 800 }}>
              Contact Us
            </Link>
            <Link href="/legal/privacy" style={{ textDecoration: "none", color: "#c4b5fd", border: "1px solid rgba(196,181,253,.25)", background: "rgba(255,255,255,.03)", padding: "11px 18px", borderRadius: 12, fontSize: 13, fontWeight: 800 }}>
              View Privacy Policy
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
