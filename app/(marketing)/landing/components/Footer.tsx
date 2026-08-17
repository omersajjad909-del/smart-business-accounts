"use client";

import Link from "next/link";
import { Facebook, Instagram, Linkedin, Globe, Zap, Twitter, Youtube, Music2 } from "lucide-react";
import { useEffect, useState } from "react";

// Four balanced columns. The legal links used to sit inside Company, which
// pushed it to 14 entries against Product's 8 and repeated every one of them in
// the bottom bar. Legal now has its own column and the bottom bar keeps only
// the handful a visitor actually looks for down there.
const PRODUCT_LINKS = [
  { label: "Core Features",      href: "/features" },
  { label: "Pricing Plans",      href: "/pricing" },
  { label: "ROI Calculator",     href: "/roi-calculator" },
  { label: "Release Notes",      href: "/updates" },
  { label: "Changelog",          href: "/changelog" },
  { label: "API Docs",           href: "/developers/api" },
];

const SOLUTIONS_LINKS = [
  { label: "All Industries",     href: "/industries" },
  { label: "Industry Solutions", href: "/solutions" },
  { label: "Integrations",       href: "/integrations" },
  // The page compares FinovaOS against Xero, Zoho, Wave and QuickBooks — the
  // old "Compare vs Xero" label undersold it and cost the other three any
  // chance of ranking.
  { label: "Compare Software",   href: "/compare" },
  { label: "Documentation",      href: "/docs" },
  { label: "Book a Demo",        href: "/demo" },
];

const COMPANY_LINKS = [
  { label: "About Us",           href: "/about" },
  { label: "Careers",            href: "/careers" },
  { label: "Case Studies",       href: "/case-studies" },
  { label: "Blog",               href: "/blog" },
  { label: "Support Center",     href: "/support" },
  { label: "Contact Us",         href: "/contact" },
  { label: "Affiliate Program",  href: "/affiliate" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy",     href: "/legal/privacy" },
  { label: "Terms of Service",   href: "/legal/terms" },
  { label: "Refund Policy",      href: "/legal/refund" },
  { label: "Cookie Policy",      href: "/legal/cookies" },
  { label: "SLA",                href: "/legal/sla" },
  { label: "DPA",                href: "/legal/dpa" },
  { label: "Acceptable Use",     href: "/legal/aup" },
  { label: "Data Security",      href: "/security" },
  { label: "FAQ",                href: "/faq" },
];

const SOCIALS_DEFAULT = [
  {
    Icon: Facebook,
    key: "facebook",
    label: "Facebook",
    href: "https://www.facebook.com/Finovaos",
  },
  {
    Icon: Instagram,
    key: "instagram",
    label: "Instagram",
    href: "https://instagram.com/finovaos",
  },
  {
    Icon: Twitter,
    key: "twitter",
    label: "X / Twitter",
    href: "https://x.com/finovaos",
  },
  {
    Icon: Linkedin,
    key: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/umer-sajjad-657936417",
  },
  {
    Icon: Music2,
    key: "tiktok",
    label: "TikTok",
    href: "https://tiktok.com/@finovaos",
  },
  {
    Icon: Youtube,
    key: "youtube",
    label: "YouTube",
    href: "https://youtube.com/@finovaos",
  },
];

const BOTTOM_LINKS = [
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Terms",   href: "/legal/terms" },
  { label: "Cookies", href: "/legal/cookies" },
  { label: "Sitemap", href: "/all-pages" },
  { label: "Status",  href: "/status" },
];

// Kept to what the product can show. The old "99.9% Uptime" implied an SLA
// that has not actually been signed with anyone.
/** One footer link column — four of these replace the two long lists. */
function LinkColumn({
  title,
  color,
  links,
}: {
  title: string;
  color: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: `linear-gradient(180deg, ${color}, ${color}cc)` }}/>
        <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: ".12em", textTransform: "uppercase" }}>{title}</span>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {links.map(({ label, href }) => (
          <li key={label}>
            <Link href={href} className="ft-link">
              <svg width="4" height="4" viewBox="0 0 4 4" style={{ flexShrink: 0, opacity: .45 }}>
                <circle cx="2" cy="2" r="2" fill={color}/>
              </svg>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/public/social-links")
      .then(r => r.json())
      .then(d => { if (d.links) setSocialLinks(d.links); })
      .catch(() => {});
  }, []);

  const SOCIALS = SOCIALS_DEFAULT.map((s) => ({
    ...s,
    href: socialLinks[s.key] || s.href,
  })).filter((social) => Boolean(social.href));

  return (
    <footer style={{
      background: "linear-gradient(180deg, #0a0e24 0%, #060919 60%, #040714 100%)",
      fontFamily: "'Outfit', 'DM Sans', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        
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

        /* Five columns only fit on a wide screen; below that the brand block
           takes a full row and the four link columns wrap under it. */
        @media (max-width: 1100px) {
          .ft-grid { grid-template-columns: repeat(4, 1fr) !important; }
          .ft-brand { grid-column: 1 / -1; }
        }
        @media (max-width: 960px) {
          .ft-grid { grid-template-columns: 1fr 1fr !important; }
          .ft-brand { grid-column: 1 / -1; }
        }
        @media (max-width: 600px) {
          .ft-grid { grid-template-columns: 1fr 1fr !important; gap: 28px 20px !important; }
          .ft-brand { grid-column: 1 / -1; }
          .ft-bottom-inner { flex-direction: column !important; align-items: center !important; gap: 12px !important; text-align: center; }
          .ft-bottom-links { justify-content: center !important; flex-wrap: wrap; gap: 10px 16px !important; }
          .ft-main-pad { padding: 48px 16px 0 !important; }
          .ft-top-strip { margin-bottom: 32px !important; }
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
      {/* 80px of footer padding stacked on top of the CTA section's own 80px
          bottom padding, with only a one-line pill between them — which read as
          a large empty band above the links. Tightened on both counts. */}
      <div className="ft-main-pad" style={{ maxWidth: 1220, margin: "0 auto", padding: "52px 24px 0", position: "relative", zIndex: 1 }}>

        {/* Top headline strip */}
        <div className="ft-top-strip" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 34, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 100, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.2)" }}>
            <Zap size={12} color="#818cf8"/>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", letterSpacing: ".08em", textTransform: "uppercase" }}>Business OS</span>
          </div>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,.25)" }}>— All-in-one platform for modern businesses</span>
        </div>

        {/* Brand + four link columns, all five given equal width. The brand
            column used to carry a stats bar, contact details and a CTA card,
            which made it run several times taller than the link columns and
            left a large empty block across the rest of the row. */}
        <div className="ft-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr", gap: "48px 40px", marginBottom: 64 }}>

          {/* Brand column */}
          <div className="ft-brand">
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 20 }}>
              <img src="/icon.png" alt="FinovaOS" width={100} height={100} style={{ objectFit: "contain", flexShrink: 0 }}/>
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

            {/* Social row — six 36px icons plus their gaps need ~256px, so this
                stays on one line only while the brand column is wider than the
                link columns. That is why the grid above is not a flat 1fr each:
                equal fifths left the column at ~202px and wrapped the row. */}
            <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "nowrap" }}>
              {SOCIALS.map(({ Icon, href, label }) => (
                <a key={label} href={href} className="ft-social" aria-label={label} target="_blank" rel="noopener noreferrer">
                  <Icon size={15}/>
                </a>
              ))}
            </div>

          </div>

          <LinkColumn title="Product"   color="#818cf8" links={PRODUCT_LINKS} />
          <LinkColumn title="Solutions" color="#34d399" links={SOLUTIONS_LINKS} />
          <LinkColumn title="Company"   color="#fbbf24" links={COMPANY_LINKS} />
          <LinkColumn title="Legal"     color="#f472b6" links={LEGAL_LINKS} />

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
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <div style={{ width: 16, height: 1, background: "rgba(255,255,255,.1)", borderRadius: 1 }} />
    <p style={{ fontSize: 10.5, color: "rgba(255,255,255,.15)", margin: 0 }}>
      <span style={{ color: "rgba(52,211,153,.55)", fontWeight: 600 }}>PSEB</span>{" "}
      Registered IT Exporter{" · "}
      <span style={{ color: "rgba(255,255,255,.28)", fontWeight: 600 }}>FBR</span>{" "}
      Registered
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
