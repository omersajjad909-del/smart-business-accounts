"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useInView } from "./shared";

/**
 * Shared design primitives for the Forge marketing pages.
 *
 * Design direction: dark neutral background (rgb(7,8,15)) with a single
 * warm amber accent (#f59e0b) used ONLY for CTAs, link-hover, and
 * active/highlight states. Everything else is the neutral background plus
 * a small, fixed set of white/off-white text-opacity tiers below. No
 * per-card "rainbow" coloring, no indigo/purple AI-cliche gradients, no
 * emoji icons — real icon components instead.
 */

export const ff = "'Outfit','DM Sans',sans-serif";

export const colors = {
  bg: "rgb(7,8,15)",
  accent: "#f59e0b",
  accentLight: "#fbbf24",
  accentSoftBg: "rgba(245,158,11,.09)",
  accentSoftBorder: "rgba(245,158,11,.24)",
  accentStrongBorder: "rgba(245,158,11,.38)",
  accentGlow: "rgba(245,158,11,.16)",
  // Fixed text-opacity tiers — use these instead of ad-hoc rgba values.
  textPrimary: "rgba(255,255,255,.94)",
  textSecondary: "rgba(255,255,255,.58)",
  textMuted: "rgba(255,255,255,.38)",
  textFaint: "rgba(255,255,255,.22)",
  surface: "rgba(255,255,255,.025)",
  surfaceStrong: "rgba(255,255,255,.045)",
  border: "rgba(255,255,255,.08)",
  borderStrong: "rgba(255,255,255,.16)",
} as const;

/* ── Fade-in-on-scroll wrapper, replaces the repeated useInView+style triplet ── */
export function FadeIn({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [ref, vis] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? "none" : "translateY(26px)",
        transition: "all .65s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Small amber eyebrow label used above every section heading ── */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 14px",
        borderRadius: 100,
        background: colors.accentSoftBg,
        border: `1px solid ${colors.accentSoftBorder}`,
        fontSize: 11,
        fontWeight: 700,
        color: colors.accentLight,
        letterSpacing: ".08em",
        marginBottom: 20,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors.accent, flexShrink: 0 }} />
      {children}
    </div>
  );
}

/* ── Consistent section heading: eyebrow + title + optional description ── */
export function SectionHeading({
  eyebrow,
  title,
  desc,
  align = "center",
  maxWidth = 520,
}: {
  eyebrow: string;
  title: ReactNode;
  desc?: string;
  align?: "center" | "left";
  maxWidth?: number;
}) {
  return (
    <div
      style={{
        marginBottom: 56,
        textAlign: align,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
      }}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        style={{
          fontSize: "clamp(28px,4vw,46px)",
          fontWeight: 900,
          color: colors.textPrimary,
          letterSpacing: "-1.5px",
          margin: "0 0 12px",
          lineHeight: 1.12,
          maxWidth: align === "center" ? maxWidth + 180 : 520,
        }}
      >
        {title}
      </h2>
      {desc && (
        <p style={{ fontSize: 15, color: colors.textMuted, lineHeight: 1.8, maxWidth, margin: 0 }}>{desc}</p>
      )}
    </div>
  );
}

/* ── Icon container: accent tone for active/featured content, neutral otherwise ── */
export function IconBadge({
  icon,
  tone = "accent",
  size = 48,
}: {
  icon: ReactNode;
  tone?: "accent" | "neutral";
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size >= 44 ? 14 : 11,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: tone === "accent" ? "rgba(245,158,11,.12)" : "rgba(255,255,255,.05)",
        border: `1px solid ${tone === "accent" ? colors.accentSoftBorder : colors.border}`,
        color: tone === "accent" ? colors.accentLight : colors.textSecondary,
      }}
    >
      {icon}
    </div>
  );
}

/* ── Status pill for product cards: "live" is a semantic status color (green),
   "dev"/"planned" are neutral — not part of the decorative palette ── */
export function StatusPill({ label, status }: { label: string; status: "live" | "dev" | "planned" }) {
  const styles = {
    live: { bg: "rgba(52,211,153,.12)", border: "rgba(52,211,153,.28)", color: "#34d399" },
    dev: { bg: "rgba(255,255,255,.06)", border: "rgba(255,255,255,.14)", color: "rgba(255,255,255,.55)" },
    planned: { bg: "rgba(255,255,255,.04)", border: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.32)" },
  } as const;
  const s = styles[status];
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        padding: "3px 10px",
        borderRadius: 8,
        background: s.bg,
        border: `1px solid ${s.border}`,
        fontSize: 10,
        fontWeight: 700,
        color: s.color,
        letterSpacing: ".04em",
      }}
    >
      {label}
    </div>
  );
}

/* ── Buttons — hover states handled by CSS classes (.fg-btn-primary / .fg-btn-ghost)
   declared once in the page's shared <style> block, instead of per-instance
   inline onMouseEnter/onMouseLeave handlers ── */
export function PrimaryLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: ReactNode;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="fg-btn fg-btn-primary">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className="fg-btn fg-btn-primary">
      {children}
    </Link>
  );
}

export function GhostLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: ReactNode;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="fg-btn fg-btn-ghost">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className="fg-btn fg-btn-ghost">
      {children}
    </Link>
  );
}

/* ── Plain text link used for "view more" style affordances ── */
export function TextLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: ReactNode;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="fg-link">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className="fg-link">
      {children}
    </Link>
  );
}
