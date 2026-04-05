"use client";

import Link from "next/link";
import { Facebook, Twitter, Linkedin, Instagram, Mail, Phone, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

const PRODUCT_LINKS = [
  { label: "Core Features",       href: "/features" },
  { label: "Pricing Plans",       href: "/pricing" },
  { label: "Changelog",           href: "/changelog" },
  { label: "Industry Solutions",  href: "/solutions" },
  { label: "Data Security",       href: "/security" },
  { label: "Release Notes",       href: "/updates" },
];

const COMPANY_LINKS = [
  { label: "About Us",          href: "/about" },
  { label: "Blogs",             href: "/blog" },
  { label: "Careers",           href: "/careers" },
  { label: "Support Center",    href: "/support" },
  { label: "Affiliate Program", href: "/affiliate" },
  { label: "Privacy Policy",    href: "/legal/privacy" },
  { label: "Terms of Service",  href: "/legal/terms" },
];

const SOCIALS_DEFAULT = [
  { Icon: Facebook,  key: "facebook",  label: "Facebook",  href: "#" },
  { Icon: Twitter,   key: "twitter",   label: "Twitter/X", href: "#" },
  { Icon: Linkedin,  key: "linkedin",  label: "LinkedIn",  href: "#" },
  { Icon: Instagram, key: "instagram", label: "Instagram", href: "#" },
];

const BOTTOM_LINKS = [
  { label: "Privacy",   href: "/legal/privacy" },
  { label: "Terms",     href: "/legal/terms" },
  { label: "Security",  href: "/security" },
  { label: "Sitemap",   href: "/all-pages" },
  { label: "Status",    href: "/status" },
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
    href: socialLinks[s.key] || s.href,
  }));

  return (
    <footer style={{
      background: "linear-gradient(180deg, #080c1e 0%, #060919 100%)",
      fontFamily: "'Outfit', 'DM Sans', sans-serif",
      position: "relative",
      overflow: "hidden",
      paddingBottom: "max(24px, env(safe-area-inset-bottom))",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Lora:wght@700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes orbDrift {
          0%,100% { transform:translate(0,0) scale(1); }
          50%      { transform:translate(18px,-14px) scale(1.05); }
        }
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:.3} }
        .ft-link {
          font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,.38); text-decoration: none;
          font-family: 'Outfit', sans-serif;
          transition: all .2s; display: flex; align-items: center; gap: 7px;
          padding: 3px 0;
        }
        .ft-link:hover { color: rgba(255,255,255,.88); padding-left: 5px; }
        .ft-social {
          width: 38px; height: 38px; border-radius: 10px;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.09);
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,.5);
          transition: all .25s; cursor: pointer; text-decoration: none;
        }
        .ft-social:hover {
          background: rgba(99,102,241,.2);
          border-color: rgba(99,102,241,.45);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(99,102,241,.25);
        }
        .ft-bot-link {
          font-size: 11.5px; font-weight: 500;
          color: rgba(255,255,255,.22); text-decoration: none;
          transition: color .2s; font-family: 'Outfit', sans-serif;
        }
        .ft-bot-link:hover { color: rgba(255,255,255,.65); }
        @media(max-width:900px){.ft-main-grid{grid-template-columns:1fr 1fr !important; gap:36px !important;}}
        @media(max-width:560px){.ft-main-grid{grid-template-columns:1fr !important;} .ft-bottom{flex-direction:column !important; align-items:flex-start !important; gap:12px !important;}}
      `}</style>

      {/* Background elements */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)",
          backgroundSize:"48px 48px",
        }}/>
        <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.08),transparent 65%)", top:-120, right:-80, animation:"orbDrift 16s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", width:350, height:350, borderRadius:"50%", background:"radial-gradient(circle,rgba(124,58,237,.06),transparent 65%)", bottom:60, left:-60, animation:"orbDrift 20s ease-in-out infinite reverse" }}/>
        {/* Top border */}
        <div style={{ position:"absolute", top:0, left:"10%", right:"10%", height:1, background:"linear-gradient(90deg,transparent,rgba(99,102,241,.5),transparent)" }}/>
      </div>

      {/* â”€â”€ Main grid â”€â”€ */}
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"72px 24px 0", position:"relative" }}>
        <div className="ft-main-grid" style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1.3fr", gap:52, marginBottom:64 }}>

          {/* â”€â”€ Brand column â”€â”€ */}
          <div>
            {/* Logo */}
            <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:10, textDecoration:"none", marginBottom:24 }}>
              <div style={{
                width:38, height:38, borderRadius:10, flexShrink:0,
                background:"linear-gradient(135deg,#4f46e5,#818cf8)",
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"0 4px 14px rgba(99,102,241,.4)",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5" opacity=".7"/>
                  <path d="M2 12l10 5 10-5" opacity=".88"/>
                </svg>
              </div>
              <span style={{ fontFamily:"'Lora',serif", fontSize:20, fontWeight:700, color:"white", letterSpacing:"-.2px" }}>
                FinovaOS
              </span>
            </Link>

            <p style={{ fontSize:13.5, color:"rgba(255,255,255,.38)", lineHeight:1.8, marginBottom:28, maxWidth:300 }}>
              Built for traders, wholesalers, distributors, and import/export businesses that need invoicing, stock control, branch visibility, and shipment-ready finance in one place.
            </p>

            {/* Social icons */}
            <div style={{ display:"flex", gap:9, marginBottom:32 }}>
              {SOCIALS.map(({ Icon, href, label }) => (
                <a key={label} href={href} className="ft-social" aria-label={label}>
                  <Icon size={16}/>
                </a>
              ))}
            </div>

            {/* Mini stats */}
            <div style={{
              display:"inline-flex", borderRadius:14,
              background:"rgba(255,255,255,.03)",
              border:"1px solid rgba(255,255,255,.07)",
              overflow:"hidden",
            }}>
              {[
                { val:"14k+", label:"Businesses", color:"#818cf8" },
                { val:"4.9/5", label:"Rating",     color:"#fbbf24" },
                { val:"99.9%",label:"Uptime",     color:"#34d399" },
              ].map(({ val, label, color }, i) => (
                <div key={label} style={{
                  padding:"10px 16px", textAlign:"center",
                  borderRight: i < 2 ? "1px solid rgba(255,255,255,.06)" : "none",
                }}>
                  <div style={{ fontFamily:"'Lora',serif", fontSize:15, fontWeight:700, color, letterSpacing:"-.2px" }}>{val}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.28)", marginTop:1, fontWeight:500 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* â”€â”€ Product â”€â”€ */}
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:22 }}>
              <div style={{ width:3, height:13, borderRadius:2, background:"#818cf8" }}/>
              <span style={{ fontSize:10, fontWeight:700, color:"#818cf8", letterSpacing:".1em", textTransform:"uppercase" }}>
                Product
              </span>
            </div>
            <ul style={{ listStyle:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:2 }}>
              {PRODUCT_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="ft-link">
                    <svg width="5" height="5" viewBox="0 0 6 6" fill="#818cf8" opacity=".45" style={{ flexShrink:0 }}>
                      <circle cx="3" cy="3" r="3"/>
                    </svg>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* â”€â”€ Company â”€â”€ */}
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:22 }}>
              <div style={{ width:3, height:13, borderRadius:2, background:"#34d399" }}/>
              <span style={{ fontSize:10, fontWeight:700, color:"#34d399", letterSpacing:".1em", textTransform:"uppercase" }}>
                Company
              </span>
            </div>
            <ul style={{ listStyle:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:2 }}>
              {COMPANY_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="ft-link">
                    <svg width="5" height="5" viewBox="0 0 6 6" fill="#34d399" opacity=".45" style={{ flexShrink:0 }}>
                      <circle cx="3" cy="3" r="3"/>
                    </svg>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* â”€â”€ Contact â”€â”€ */}
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:22 }}>
              <div style={{ width:3, height:13, borderRadius:2, background:"#fbbf24" }}/>
              <span style={{ fontSize:10, fontWeight:700, color:"#fbbf24", letterSpacing:".1em", textTransform:"uppercase" }}>
                Get in Touch
              </span>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:26 }}>
              {[
                { Icon:Mail,    text:"finovaos.app@gmail.com",  color:"#818cf8" },
                { Icon:Phone,   text:"+92 304 7653693",     color:"#34d399" },
                { Icon:MapPin,  text:"Global Operations",   color:"#fbbf24" },
              ].map(({ Icon, text, color }) => (
                <div key={text} style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                  <div style={{
                    width:30, height:30, borderRadius:8, flexShrink:0,
                    background:`${color}12`, border:`1px solid ${color}22`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    color,
                  }}>
                    <Icon size={14}/>
                  </div>
                  <span style={{ fontSize:13, color:"rgba(255,255,255,.45)", lineHeight:1.6, paddingTop:5 }}>
                    {text}
                  </span>
                </div>
              ))}
            </div>

            {/* Offer card */}
            <div style={{
              borderRadius:14, padding:"16px",
              background:"linear-gradient(135deg,rgba(239,68,68,.08),rgba(239,68,68,.04))",
              border:"1.5px solid rgba(239,68,68,.22)",
              position:"relative", overflow:"hidden",
            }}>
              <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:"radial-gradient(circle,rgba(239,68,68,.12),transparent 70%)", pointerEvents:"none" }}/>
              <div style={{
                display:"flex", alignItems:"center", gap:6, marginBottom:7,
              }}>
                <span style={{ fontSize:15 }}>Hot</span>
                <span style={{ fontSize:10.5, fontWeight:800, color:"#f87171", letterSpacing:".07em", textTransform:"uppercase" }}>
                  Limited Offer
                </span>
              </div>
              <p style={{ fontSize:13, color:"rgba(255,255,255,.7)", fontWeight:600, margin:"0 0 4px" }}>
                Trade-ready workflows
              </p>
              <p style={{ fontSize:11.5, color:"rgba(255,255,255,.35)", margin:0, lineHeight:1.5 }}>
                For wholesale ops, distribution teams, and import/export businesses
              </p>
              <Link href="/pricing" style={{
                display:"inline-flex", alignItems:"center", gap:5,
                marginTop:12, padding:"8px 14px", borderRadius:9,
                background:"linear-gradient(135deg,#6366f1,#4f46e5)",
                color:"white", fontSize:12, fontWeight:700,
                textDecoration:"none", fontFamily:"inherit",
                boxShadow:"0 3px 12px rgba(99,102,241,.35)",
                transition:"all .2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 6px 18px rgba(99,102,241,.5)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 3px 12px rgba(99,102,241,.35)"; }}
              >
                {"Get Started ->"}
              </Link>
            </div>
          </div>

        </div>

        {/* â”€â”€ Divider â”€â”€ */}
        <div style={{ height:1, background:"linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent)", marginBottom:24 }}/>


        {/* â”€â”€ Bottom bar â”€â”€ */}
        <div className="ft-bottom" style={{
          display:"flex", justifyContent:"space-between",
          alignItems:"center", flexWrap:"wrap", gap:16,
          paddingBottom:8,
        }}>
          {/* Left: copyright */}
          <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            <p style={{ fontSize:11.5, color:"rgba(255,255,255,.22)", margin:0 }}>
              © {new Date().getFullYear()} FinovaOS. All rights reserved.
            </p>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:"#10b981", animation:"blink 2.5s ease infinite", display:"block" }}/>
              <span style={{ fontSize:11, color:"rgba(255,255,255,.2)", fontWeight:600 }}>All systems operational</span>
            </div>
          </div>

          {/* Center: links */}
          <div style={{ display:"flex", gap:20, flexWrap:"wrap", justifyContent:"center" }}>
            {BOTTOM_LINKS.map(({ label, href }) => (
              <Link key={label} href={href} className="ft-bot-link">{label}</Link>
            ))}
          </div>

          {/* Right: Global notice */}
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <span style={{ fontSize:16 }}>GL</span>
            <span style={{ fontSize:11.5, color:"rgba(255,255,255,.22)", fontWeight:600 }}>Global service</span>
          </div>
        </div>
      </div>

    </footer>
  );
}


