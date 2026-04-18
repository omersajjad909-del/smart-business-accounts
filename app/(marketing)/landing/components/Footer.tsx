"use client";

import Link from "next/link";
import { Facebook, Twitter, Linkedin, Instagram, Mail, Phone, Globe, ArrowRight, Zap } from "lucide-react";
import { useEffect, useState } from "react";

const PRODUCT_LINKS = [
  { label: "Core Features",      href: "/features" },
  { label: "Pricing Plans",      href: "/pricing" },
  { label: "All 61 Industries",  href: "/industries" },
  { label: "Industry Solutions", href: "/solutions" },
  { label: "Data Security",      href: "/security" },
  { label: "Release Notes",      href: "/updates" },
];

const COMPANY_LINKS = [
  { label: "About Us",           href: "/about" },
  { label: "Blog",               href: "/blog" },
  { label: "Careers",            href: "/careers" },
  { label: "Support Center",     href: "/support" },
  { label: "Affiliate Program",  href: "/affiliate" },
  { label: "Privacy Policy",     href: "/legal/privacy" },
  { label: "Terms of Service",   href: "/legal/terms" },
];

const SOCIALS_DEFAULT = [
  { Icon: Facebook,  key: "facebook",  label: "Facebook" },
  { Icon: Twitter,   key: "twitter",   label: "Twitter/X" },
  { Icon: Linkedin,  key: "linkedin",  label: "LinkedIn" },
  { Icon: Instagram, key: "instagram", label: "Instagram" },
];

const BOTTOM_LINKS = [
  { label: "Privacy",  href: "/legal/privacy" },
  { label: "Terms",    href: "/legal/terms" },
  { label: "Security", href: "/security" },
  { label: "Sitemap",  href: "/all-pages" },
  { label: "Status",   href: "/status" },
];

const STATS = [
  { val: "14k+",  label: "Businesses", color: "#818cf8" },
  { val: "4.9/5", label: "Rating",     color: "#fbbf24" },
  { val: "99.9%", label: "Uptime",     color: "#34d399" },
];

export default function Footer() {
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/public/social-links")
      .then(r => r.json())
      .then(d => { if (d.links) setSocialLinks(d.links); })
      .catch(() => {});
  }, []);

  const SOCIALS = SOCIALS_DEFAULT.map(s => ({
    ...s,
    href: socialLinks[s.key] || "#",
  }));

  return (
    <footer style={{
      background: "linear-gradient(180deg, #0a0e24 0%, #060919 60%, #040714 100%)",
      fontFamily: "'Outfit', 'DM Sans', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Lora:ital,wght@0,700;1,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        @keyframes ft-orb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,-16px) scale(1.06)} }
        @keyframes ft-orb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-14px,18px) scale(1.04)} }
        @keyframes ft-blink { 0%,100%{opacity:1} 50%{opacity:.25} }

        .ft-link {
          font-size: 13px; font-weight: 400;
          color: rgba(255,255,255,.35); text-decoration: none;
          transition: color .2s, padding-left .2s;
          display: flex; align-items: center; gap: 8px;
          padding: 4px 0; line-height: 1.4;
        }
        .ft-link:hover { color: rgba(255,255,255,.85); padding-left: 4px; }

        .ft-social {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,.4);
          transition: all .22s; cursor: pointer; text-decoration: none;
          flex-shrink: 0;
        }
        .ft-social:hover {
          background: rgba(99,102,241,.18);
          border-color: rgba(99,102,241,.4);
          color: #a5b4fc;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(99,102,241,.2);
        }

        .ft-bot-link {
          font-size: 11.5px; font-weight: 500;
          color: rgba(255,255,255,.22); text-decoration: none;
          transition: color .18s; white-space: nowrap;
        }
        .ft-bot-link:hover { color: rgba(255,255,255,.6); }

        .ft-cta-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 16px; border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white; font-size: 12.5px; font-weight: 700;
          text-decoration: none; font-family: 'Outfit', sans-serif;
          box-shadow: 0 4px 14px rgba(99,102,241,.3);
          transition: all .22s; border: none; cursor: pointer;
        }
        .ft-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(99,102,241,.45);
          background: linear-gradient(135deg, #818cf8, #6366f1);
        }

        .ft-contact-item:hover .ft-contact-icon { transform: scale(1.1); }
        .ft-contact-icon { transition: transform .2s; }

        @media (max-width: 960px) {
          .ft-grid { grid-template-columns: 1fr 1fr !important; }
          .ft-brand { grid-column: 1 / -1; }
        }
        @media (max-width: 600px) {
          .ft-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .ft-brand { grid-column: auto; }
          .ft-bottom-inner { flex-direction: column !important; align-items: flex-start !important; gap: 14px !important; }
          .ft-bottom-links { justify-content: flex-start !important; flex-wrap: wrap; }
          .ft-stats-row { justify-content: flex-start !important; }
        }
        @media (max-width: 380px) {
          .ft-stats-box { padding: 8px 10px !important; }
        }
      `}</style>

      {/* Background layer */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        {/* Grid texture */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(99,102,241,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.035) 1px,transparent 1px)",
          backgroundSize: "52px 52px",
        }}/>
        {/* Orbs */}
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.07) 0%,transparent 65%)", top: -200, right: -150, animation: "ft-orb1 18s ease-in-out infinite" }}/>
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(124,58,237,.05) 0%,transparent 65%)", bottom: 80, left: -100, animation: "ft-orb2 22s ease-in-out infinite" }}/>
        {/* Top accent line */}
        <div style={{ position: "absolute", top: 0, left: "8%", right: "8%", height: 1, background: "linear-gradient(90deg,transparent,rgba(99,102,241,.55),transparent)" }}/>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1220, margin: "0 auto", padding: "80px 24px 0", position: "relative", zIndex: 1 }}>

        {/* Top headline strip */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 56, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 100, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.2)" }}>
            <Zap size={12} color="#818cf8"/>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", letterSpacing: ".08em", textTransform: "uppercase" }}>Business OS</span>
          </div>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,.25)" }}>— All-in-one platform for modern businesses</span>
        </div>

        {/* Main 4-column grid */}
        <div className="ft-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.35fr", gap: "48px 52px", marginBottom: 64 }}>

          {/* Brand column */}
          <div className="ft-brand">
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 20 }}>
              <div style={{ width: 96, height: 96, borderRadius: 20, overflow: "hidden", flexShrink: 0, border: "1px solid rgba(99,102,241,.24)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(99,102,241,.18)", boxShadow: "0 12px 30px rgba(99,102,241,.12)" }}>
                <img src="/logo-icon.svg" alt="FinovaOS" width={56} height={56} style={{ objectFit: "contain" }}/>
              </div>
              <div>
                <div style={{ fontFamily: "'Lora', serif", fontSize: 18, fontWeight: 700, color: "white", letterSpacing: "-.2px", lineHeight: 1.1 }}>
                  FinovaOS
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.28)", fontWeight: 500, letterSpacing: ".04em", marginTop: 1 }}>
                  by Finova Forge
                </div>
              </div>
            </Link>

            <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.36)", lineHeight: 1.85, marginBottom: 28, maxWidth: 310 }}>
              Invoicing, inventory, accounting, payroll, and more — unified in one platform built for businesses of every size.
            </p>

            {/* Social row */}
            <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
              {SOCIALS.map(({ Icon, href, label }) => (
                <a key={label} href={href} className="ft-social" aria-label={label} target="_blank" rel="noopener noreferrer">
                  <Icon size={15}/>
                </a>
              ))}
            </div>

            {/* Stats bar */}
            <div className="ft-stats-row" style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {STATS.map(({ val, label, color }, i) => (
                <div key={label} className="ft-stats-box" style={{
                  padding: "10px 18px", textAlign: "center",
                  background: "rgba(255,255,255,.025)",
                  border: "1px solid rgba(255,255,255,.06)",
                  borderRadius: i === 0 ? "12px 0 0 12px" : i === STATS.length - 1 ? "0 12px 12px 0" : 0,
                  borderLeft: i > 0 ? "none" : undefined,
                }}>
                  <div style={{ fontFamily: "'Lora', serif", fontSize: 15, fontWeight: 700, color, letterSpacing: "-.2px" }}>{val}</div>
                  <div style={{ fontSize: 9.5, color: "rgba(255,255,255,.25)", marginTop: 2, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Product column */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <div style={{ width: 3, height: 14, borderRadius: 2, background: "linear-gradient(180deg,#818cf8,#6366f1)" }}/>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#818cf8", letterSpacing: ".12em", textTransform: "uppercase" }}>Product</span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {PRODUCT_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="ft-link">
                    <svg width="4" height="4" viewBox="0 0 4 4" style={{ flexShrink: 0, opacity: .45 }}>
                      <circle cx="2" cy="2" r="2" fill="#818cf8"/>
                    </svg>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company column */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <div style={{ width: 3, height: 14, borderRadius: 2, background: "linear-gradient(180deg,#34d399,#10b981)" }}/>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#34d399", letterSpacing: ".12em", textTransform: "uppercase" }}>Company</span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {COMPANY_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="ft-link">
                    <svg width="4" height="4" viewBox="0 0 4 4" style={{ flexShrink: 0, opacity: .45 }}>
                      <circle cx="2" cy="2" r="2" fill="#34d399"/>
                    </svg>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + CTA column */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <div style={{ width: 3, height: 14, borderRadius: 2, background: "linear-gradient(180deg,#fbbf24,#f59e0b)" }}/>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fbbf24", letterSpacing: ".12em", textTransform: "uppercase" }}>Get in Touch</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
              {[
                { Icon: Mail,  text: "finovaos.app@gmail.com", color: "#818cf8", href: "mailto:finovaos.app@gmail.com" },
                { Icon: Phone, text: "+92 304-7653693",        color: "#34d399", href: "https://wa.me/923047653693" },
                { Icon: Globe, text: "Pakistan 🇵🇰",           color: "#fbbf24", href: "#" },
              ].map(({ Icon, text, color, href }) => (
                <a key={text} href={href} className="ft-contact-item" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                  <div className="ft-contact-icon" style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: `${color}14`, border: `1px solid ${color}28`,
                    display: "flex", alignItems: "center", justifyContent: "center", color,
                  }}>
                    <Icon size={13}/>
                  </div>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,.42)", lineHeight: 1.4 }}>{text}</span>
                </a>
              ))}
            </div>

            {/* CTA card */}
            <div style={{
              borderRadius: 14, padding: "18px",
              background: "linear-gradient(135deg,rgba(99,102,241,.1),rgba(79,70,229,.06))",
              border: "1px solid rgba(99,102,241,.2)",
              position: "relative", overflow: "hidden",
            }}>
              <div aria-hidden style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.14),transparent 70%)", pointerEvents: "none" }}/>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 14 }}>🚀</span>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: "#a5b4fc", letterSpacing: ".08em", textTransform: "uppercase" }}>Get Started</span>
              </div>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.75)", fontWeight: 600, margin: "0 0 5px", lineHeight: 1.3 }}>
                Take Control of Your Business Today
              </p>
              <p style={{ fontSize: 11.5, color: "rgba(255,255,255,.32)", margin: "0 0 14px", lineHeight: 1.55 }}>
                Stop wasting time on spreadsheets. Automate invoicing, payments, and reporting. Get real-time insights with AI-powered analytics. Scale with confidence.
              </p>
              <Link href="/pricing" className="ft-cta-btn">
                Get Started <ArrowRight size={13}/>
              </Link>
            </div>
          </div>

        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,.07) 0%,rgba(255,255,255,.07) 100%,transparent)", marginBottom: 22, width: "100%" }}/>

        {/* Bottom bar */}
        <div className="ft-bottom-inner" style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 14, paddingBottom: "max(28px, env(safe-area-inset-bottom))",
        }}>
          {/* Left */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
  <p style={{ fontSize: 11.5, color: "rgba(255,255,255,.22)", margin: 0 }}>
    © {new Date().getFullYear()}{" "}
    <span style={{ color: "rgba(255,255,255,.4)", fontWeight: 700 }}>
      Finova Forge
    </span>. All rights reserved.
  </p>

  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <div
      style={{
        width: 16,
        height: 1,
        background: "rgba(255,255,255,.1)",
        borderRadius: 1,
      }}
    />
    <p style={{ fontSize: 10.5, color: "rgba(255,255,255,.15)", margin: 0 }}>
      <span style={{ color: "rgba(255,255,255,.32)", fontWeight: 600 }}>
        FinovaOS™
      </span>{" "}
      is a product of{" "}
      <span style={{ color: "rgba(255,255,255,.32)", fontWeight: 600 }}>
        Finova Forge
      </span>
    </p>
  </div>
</div>

          {/* Center: links */}
          <div className="ft-bottom-links" style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center" }}>
            {BOTTOM_LINKS.map(({ label, href }) => (
              <Link key={label} href={href} className="ft-bot-link">{label}</Link>
            ))}
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "block", animation: "ft-blink 2.8s ease infinite", flexShrink: 0 }}/>
            <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.2)", fontWeight: 500 }}>All systems operational</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
