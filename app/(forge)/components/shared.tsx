"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const ff = "'Outfit','DM Sans',sans-serif";
const forgeLogoMark = "/FinovaForge_Profile_OrangeBG_WhiteF.png?v=2";
const forgeLogoWordmark = "/FinovaForge.png?v=2";

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
    { label: "Solutions", href: "/forge/solutions" },
    { label: "Industries", href: "/forge/industries" },
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
        padding: "0 clamp(16px,3vw,40px)",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: scrolled ? "rgba(7,8,15,.93)" : "transparent",
        backdropFilter: scrolled ? "blur(24px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,.06)" : "none",
        transition: "all .3s ease",
        fontFamily: ff,
      }}
    >
      <Link href="/forge/home" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", flexShrink: 0 }}>
        <Image
          src={forgeLogoMark}
          alt="Finova Forge logo"
          width={36}
          height={36}
          priority
          unoptimized
          style={{ width: 36, height: 36, borderRadius: 10, boxShadow: "0 4px 14px rgba(245,158,11,.3)" }}
        />
        <div style={{ lineHeight: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          <Image
            src={forgeLogoWordmark}
            alt="Finova Forge"
            width={144}
            height={28}
            priority
            unoptimized
            style={{ width: "auto", height: 22 }}
          />
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.28)", letterSpacing: ".1em", textTransform: "uppercase" }}>
            Software Co.
          </div>
        </div>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: active ? "white" : "rgba(255,255,255,.4)",
                textDecoration: "none",
                transition: "color .2s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "white")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = active ? "white" : "rgba(255,255,255,.4)")}
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
            padding: "8px 16px",
            borderRadius: 9,
            background: "linear-gradient(135deg,#f59e0b,#ef4444)",
            color: "white",
            fontWeight: 700,
            fontSize: 12.5,
            textDecoration: "none",
            boxShadow: "0 4px 14px rgba(245,158,11,.25)",
            transition: "all .2s",
            whiteSpace: "nowrap",
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
          Visit FinovaOS {"\u2192"}
        </a>
      </div>
    </nav>
  );
}

export function ForgeFooter() {
  const yr = new Date().getFullYear();

  const cols = [
    {
      title: "Products",
      links: [
        { l: "FinovaOS", h: "https://finovaos.app", ext: true },
        { l: "Features", h: "https://finovaos.app/features", ext: true },
        { l: "Pricing", h: "https://finovaos.app/pricing", ext: true },
        { l: "Product Roadmap", h: "/forge/products" },
      ],
    },
    {
      title: "Company",
      links: [
        { l: "About", h: "/forge/about" },
        { l: "Careers", h: "/forge/careers" },
        { l: "Blog", h: "/forge/blog" },
        { l: "Contact", h: "/forge/contact" },
      ],
    },
    {
      title: "Solutions",
      links: [
        { l: "Solutions", h: "/forge/solutions" },
        { l: "Industries", h: "/forge/industries" },
        { l: "Security", h: "/forge/security" },
        { l: "Status", h: "/forge/status" },
      ],
    },
    {
      title: "Support & Legal",
      links: [
        { l: "Help & Support", h: "/forge/support" },
        { l: "Privacy Policy", h: "/forge/privacy" },
        { l: "Terms of Service", h: "/forge/terms" },
      ],
    },
  ];

  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "56px clamp(16px,3vw,40px) 32px", fontFamily: ff }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: "0 40px", marginBottom: 48 }}>
          <div>
            <Link href="/forge/home" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 14 }}>
              <Image
                src={forgeLogoMark}
                alt="Finova Forge logo"
                width={30}
                height={30}
                unoptimized
                style={{ width: 30, height: 30, borderRadius: 9 }}
              />
              <Image
                src={forgeLogoWordmark}
                alt="Finova Forge"
                width={126}
                height={24}
                unoptimized
                style={{ width: "auto", height: 20 }}
              />
            </Link>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.28)", lineHeight: 1.85, maxWidth: 240, margin: "0 0 16px" }}>
              Building intelligent systems for modern businesses.
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

          {cols.map((col) => (
            <div key={col.title}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,.25)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 16 }}>
                {col.title}
              </div>
              {col.links.map(({ l, h, ext }: { l: string; h: string; ext?: boolean }) => (
                <div key={l} style={{ marginBottom: 10 }}>
                  {ext ? (
                    <a
                      href={h}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 13, color: "rgba(255,255,255,.38)", textDecoration: "none", fontWeight: 500, transition: "color .2s" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,.85)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,.38)")}
                    >
                      {l}
                    </a>
                  ) : (
                    <Link
                      href={h}
                      style={{ fontSize: 13, color: "rgba(255,255,255,.38)", textDecoration: "none", fontWeight: 500, transition: "color .2s" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,.85)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,.38)")}
                    >
                      {l}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,.05)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.18)", fontWeight: 500 }}>
            {"\u00A9"} {yr} Finova Forge. All rights reserved.
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
      { threshold },
    );

    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, vis] as const;
}
