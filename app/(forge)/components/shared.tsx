"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const ff = "'Outfit','DM Sans',sans-serif";

export function ForgeNav({ transparent = false }: { transparent?: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const nav = [
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
        padding: "0 40px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: !transparent && scrolled ? "rgba(7,8,15,.92)" : transparent ? "transparent" : scrolled ? "rgba(7,8,15,.92)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,.06)" : "none",
        transition: "all .3s ease",
        fontFamily: ff,
      }}
    >
      {/* Logo */}
      <Link href="/forge/home" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "linear-gradient(135deg,#f59e0b,#ef4444)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 900,
            color: "white",
          }}
        >
          F
        </div>
        <span style={{ fontSize: 17, fontWeight: 900, color: "white", letterSpacing: "-.4px" }}>
          FinovaForge
        </span>
      </Link>

      {/* Links */}
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {nav.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255,255,255,.5)",
              textDecoration: "none",
              transition: "color .2s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "white")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,.5)")}
          >
            {l.label}
          </Link>
        ))}
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
            boxShadow: "0 4px 16px rgba(245,158,11,.3)",
          }}
        >
          Visit FinovaOS →
        </a>
      </div>
    </nav>
  );
}

export function ForgeFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,.06)",
        padding: "32px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
        fontFamily: ff,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            background: "linear-gradient(135deg,#f59e0b,#ef4444)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 900,
            color: "white",
          }}
        >
          F
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.35)" }}>
          © {new Date().getFullYear()} FinovaForge. All rights reserved.
        </span>
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        {[
          { label: "Privacy", href: "/privacy" },
          { label: "Terms", href: "/terms" },
        ].map((l) => (
          <Link
            key={l.label}
            href={l.href}
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,.25)",
              textDecoration: "none",
              fontWeight: 600,
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,.6)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,.25)")}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}

export function useInView(threshold = 0.1) {
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

import { useRef } from "react";
