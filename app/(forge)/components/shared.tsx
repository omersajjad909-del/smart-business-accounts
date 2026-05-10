"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ff = "'Outfit','DM Sans',sans-serif";

export function ForgeNav() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { label: "Home", href: "/forge/home" },
    { label: "Products", href: "/forge/products" },
    { label: "About", href: "/forge/about" },
    { label: "Contact", href: "/forge/contact" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "0 clamp(20px,4vw,48px)",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: scrolled ? "rgba(7,8,15,.92)" : "transparent",
        backdropFilter: scrolled ? "blur(24px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,.06)" : "none",
        transition: "all .3s ease",
        fontFamily: ff,
      }}
    >
      <Link href="/forge/home" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(135deg,#f59e0b,#ef4444)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 900,
            color: "white",
            letterSpacing: "-.5px",
            boxShadow: "0 4px 14px rgba(245,158,11,.3)",
          }}
        >
          FF
        </div>
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: "white", letterSpacing: "-.5px" }}>Finova Forge</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.28)", letterSpacing: ".1em", textTransform: "uppercase", marginTop: 2 }}>
            Software Co.
          </div>
        </div>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: active ? "white" : "rgba(255,255,255,.42)",
                textDecoration: "none",
                transition: "color .2s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "white")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = active ? "white" : "rgba(255,255,255,.42)")}
            >
              {l.label}
            </Link>
          );
        })}
        <a
          href="https://finovaos.app"
          target="_blank"
          rel="noreferrer"
          style={{
            padding: "8px 18px",
            borderRadius: 9,
            background: "linear-gradient(135deg,#f59e0b,#ef4444)",
            color: "white",
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
            boxShadow: "0 4px 14px rgba(245,158,11,.25)",
            transition: "all .2s",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.transform = "translateY(-1px)";
            el.style.boxShadow = "0 6px 20px rgba(245,158,11,.4)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.transform = "translateY(0)";
            el.style.boxShadow = "0 4px 14px rgba(245,158,11,.25)";
          }}
        >
          Visit FinovaOS →
        </a>
      </div>
    </nav>
  );
}

export function ForgeFooter() {
  const yr = new Date().getFullYear();

  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,.06)",
        padding: "56px clamp(20px,4vw,48px) 32px",
        fontFamily: ff,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
            gap: "0 48px",
            marginBottom: 48,
          }}
        >
          {/* Brand */}
          <div>
            <Link
              href="/forge/home"
              style={{ display: "inline-flex", alignItems: "center", gap: 9, textDecoration: "none", marginBottom: 14 }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: "linear-gradient(135deg,#f59e0b,#ef4444)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 900,
                  color: "white",
                }}
              >
                FF
              </div>
              <span style={{ fontSize: 14, fontWeight: 900, color: "white" }}>Finova Forge</span>
            </Link>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.28)", lineHeight: 1.85, maxWidth: 240, margin: "0 0 20px" }}>
              Building intelligent software for growing businesses worldwide.
            </p>
            <a
              href="mailto:hello@finovaforge.com"
              style={{ fontSize: 12, color: "rgba(245,158,11,.65)", textDecoration: "none", fontWeight: 600, transition: "color .2s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#f59e0b")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(245,158,11,.65)")}
            >
              hello@finovaforge.com
            </a>
          </div>

          {/* Products */}
          <div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: "rgba(255,255,255,.25)",
                textTransform: "uppercase",
                letterSpacing: ".1em",
                marginBottom: 16,
              }}
            >
              Products
            </div>
            {[
              { l: "FinovaOS", h: "https://finovaos.app", ext: true },
              { l: "Features", h: "https://finovaos.app/features", ext: true },
              { l: "Pricing", h: "https://finovaos.app/pricing", ext: true },
              { l: "Updates", h: "https://finovaos.app/updates", ext: true },
            ].map(({ l, h, ext }) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <a
                  href={h}
                  target={ext ? "_blank" : undefined}
                  rel={ext ? "noreferrer" : undefined}
                  style={{ fontSize: 13, color: "rgba(255,255,255,.38)", textDecoration: "none", fontWeight: 500, transition: "color .2s" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,.85)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,.38)")}
                >
                  {l}
                </a>
              </div>
            ))}
          </div>

          {/* Company */}
          <div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: "rgba(255,255,255,.25)",
                textTransform: "uppercase",
                letterSpacing: ".1em",
                marginBottom: 16,
              }}
            >
              Company
            </div>
            {[
              { l: "About", h: "/forge/about" },
              { l: "Products", h: "/forge/products" },
              { l: "Contact", h: "/forge/contact" },
              { l: "Careers", h: "/careers" },
            ].map(({ l, h }) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <Link
                  href={h}
                  style={{ fontSize: 13, color: "rgba(255,255,255,.38)", textDecoration: "none", fontWeight: 500, transition: "color .2s" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,.85)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,.38)")}
                >
                  {l}
                </Link>
              </div>
            ))}
          </div>

          {/* Legal */}
          <div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: "rgba(255,255,255,.25)",
                textTransform: "uppercase",
                letterSpacing: ".1em",
                marginBottom: 16,
              }}
            >
              Legal
            </div>
            {[
              { l: "Privacy Policy", h: "/privacy" },
              { l: "Terms of Service", h: "/terms" },
            ].map(({ l, h }) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <Link
                  href={h}
                  style={{ fontSize: 13, color: "rgba(255,255,255,.38)", textDecoration: "none", fontWeight: 500, transition: "color .2s" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,.85)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,.38)")}
                >
                  {l}
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,.05)",
            paddingTop: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.18)", fontWeight: 500 }}>
            © {yr} Finova Forge. All rights reserved.
          </span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.18)" }}>Built with purpose. Shipped with care.</span>
        </div>
      </div>
    </footer>
  );
}

export function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVis(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, vis] as const;
}
