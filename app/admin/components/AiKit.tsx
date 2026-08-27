"use client";

/**
 * app/admin/components/AiKit.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The pieces every AI console page is built from.
 *
 * Fifteen pages arrived at once. Written independently they would have drifted
 * into fifteen slightly different cards, five spellings of "Analysing…" and four
 * shades of red for "high risk" — which is exactly how an admin console stops
 * being readable at a glance. Everything visual that more than one AI page needs
 * lives here, so a page file contains only what makes that page different.
 *
 * The look matches the existing console (see /admin/funnel): dark card on a
 * gradient, Outfit, inline styles rather than Tailwind.
 */

import { CSSProperties, ReactNode, useCallback, useEffect, useState } from "react";

/* ── shared surfaces ─────────────────────────────────────────────────────── */

export const card: CSSProperties = {
  background: "linear-gradient(160deg, rgba(19,27,50,.98), rgba(15,22,42,.98))",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 20,
  padding: "20px 22px",
};

export const cardHead: CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  marginBottom: 18,
  paddingBottom: 12,
  borderBottom: "1px solid rgba(255,255,255,.06)",
  color: "#f8fafc",
};

export const pageStyle: CSSProperties = {
  fontFamily: "'Outfit','DM Sans',sans-serif",
  color: "white",
  padding: "0 0 80px",
};

export const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(255,255,255,.1)",
  color: "white",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
};

export const aiKitCss = `
  button { font-family: inherit; }
  input, textarea, select { font-family: inherit; }
  input::placeholder, textarea::placeholder { color: rgba(255,255,255,.25); }
  .ai-row:hover { background: rgba(255,255,255,.03); }
  @keyframes ai-spin { to { transform: rotate(360deg); } }

  /* Two-column layouts (an answer beside the figures it came from). Inline
     styles cannot carry a media query, and the admin console is used on a
     phone, so the split lives here and stacks below 1000px. */
  .ai-split {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    gap: 18px;
    align-items: start;
  }
  @media (max-width: 1000px) {
    .ai-split { grid-template-columns: minmax(0, 1fr); }
  }

  /* A pair of form fields side by side, stacking on a narrow screen. */
  .ai-two {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 12px;
  }
  @media (max-width: 720px) {
    .ai-two { grid-template-columns: minmax(0, 1fr); }
  }

  /* The churn/queue row: name, band, wait, score, chevron. Below 820px the
     fixed columns no longer fit and the row would scroll the whole page
     sideways, so it becomes a stack. */
  .ai-listrow {
    display: grid;
    grid-template-columns: minmax(140px, 2fr) 92px 92px 140px auto;
    gap: 14px;
    align-items: center;
    padding: 14px 20px;
    cursor: pointer;
  }
  @media (max-width: 820px) {
    .ai-listrow {
      grid-template-columns: minmax(0, 1fr) auto;
      row-gap: 9px;
    }
  }
`;

/* ── fetch ───────────────────────────────────────────────────────────────── */

/**
 * Every admin API call from these pages.
 *
 * `credentials: include` is what carries the httpOnly `sb_admin` cookie that
 * `requireAdmin` checks, and `no-store` stops Next caching an analysis run.
 */
export function adminApi(path: string, init?: RequestInit) {
  return fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "include" as RequestCredentials,
    headers: { "Content-Type": "application/json", "x-user-role": "ADMIN", ...(init?.headers || {}) },
  });
}

/** POST JSON, return parsed body, throw the server message on failure. */
export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await adminApi(path, { method: "POST", body: JSON.stringify(body ?? {}) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any)?.error || `Request failed (${res.status})`);
  return json as T;
}

/** GET JSON, return parsed body, throw the server message on failure. */
export async function getJson<T>(path: string): Promise<T> {
  const res = await adminApi(path);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any)?.error || `Request failed (${res.status})`);
  return json as T;
}

/* ── header ──────────────────────────────────────────────────────────────── */

export function PageHeader({
  title, subtitle, right,
}: { title: string; subtitle: string; right?: ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      marginBottom: 24, flexWrap: "wrap", gap: 12,
    }}>
      <div style={{ maxWidth: 680 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>{title}</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)", lineHeight: 1.55 }}>{subtitle}</p>
      </div>
      {right ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{right}</div> : null}
    </div>
  );
}

/* ── buttons ─────────────────────────────────────────────────────────────── */

export function Button({
  children, onClick, busy, disabled, tone = "primary", type = "button", title,
}: {
  children: ReactNode;
  onClick?: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: "primary" | "ghost" | "danger" | "good";
  type?: "button" | "submit";
  title?: string;
}) {
  const tones: Record<string, CSSProperties> = {
    primary: { background: "rgba(99,102,241,.25)", border: "1px solid #6366f1", color: "#c7d2fe" },
    good: { background: "rgba(52,211,153,.18)", border: "1px solid #34d399", color: "#6ee7b7" },
    danger: { background: "rgba(248,113,113,.15)", border: "1px solid rgba(248,113,113,.5)", color: "#fca5a5" },
    ghost: { background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.6)" },
  };
  const off = disabled || busy;
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={off}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "9px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
        cursor: off ? "not-allowed" : "pointer", opacity: off ? 0.55 : 1,
        transition: "opacity .15s",
        ...tones[tone],
      }}
    >
      {busy ? <Spinner /> : null}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 12, height: 12, borderRadius: "50%",
      border: "2px solid rgba(255,255,255,.25)", borderTopColor: "currentColor",
      display: "inline-block", animation: "ai-spin .7s linear infinite",
    }} />
  );
}

/* ── state blocks ────────────────────────────────────────────────────────── */

export function Loading({ label = "Analysing…" }: { label?: string }) {
  return (
    <div style={{ padding: 70, textAlign: "center", color: "rgba(255,255,255,.35)", fontSize: 13 }}>
      <Spinner /> <span style={{ marginLeft: 8 }}>{label}</span>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div style={{
      padding: "48px 24px", textAlign: "center", color: "rgba(255,255,255,.3)",
      fontSize: 13, lineHeight: 1.6,
    }}>
      {children}
    </div>
  );
}

export function ErrorNote({ children, onDismiss }: { children: ReactNode; onDismiss?: () => void }) {
  return (
    <div style={{
      background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.3)",
      borderRadius: 12, padding: "12px 16px", marginBottom: 16,
      fontSize: 12.5, color: "#fca5a5", display: "flex", justifyContent: "space-between", gap: 12,
    }}>
      <div style={{ lineHeight: 1.6 }}>{children}</div>
      {onDismiss ? (
        <button onClick={onDismiss} style={{
          background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 16, lineHeight: 1,
        }}>×</button>
      ) : null}
    </div>
  );
}

/**
 * Shown when no model provider is configured.
 *
 * Every AI page renders this instead of its run button rather than letting the
 * request fail server-side — the failure mode was a red toast saying "Request
 * failed (500)", which tells nobody that the fix is one environment variable.
 */
export function AiNotConfigured() {
  return (
    <div style={{
      ...card,
      borderColor: "rgba(251,191,36,.3)", background: "rgba(251,191,36,.06)",
      fontSize: 13, color: "#fcd34d", lineHeight: 1.65,
    }}>
      <strong style={{ display: "block", marginBottom: 6, fontSize: 14 }}>No AI provider configured</strong>
      This page needs a model to run. Set <code style={codeStyle}>GROQ_API_KEY</code> (or any
      <code style={codeStyle}>GROQ_API_KEY_1…N</code> for rotation) or <code style={codeStyle}>OPENAI_API_KEY</code>,
      then reload. Everything else on the page — the data, the counts — is already live.
    </div>
  );
}

const codeStyle: CSSProperties = {
  background: "rgba(0,0,0,.3)", padding: "1px 6px", borderRadius: 5,
  fontSize: 12, margin: "0 3px", fontFamily: "ui-monospace,monospace",
};

/* ── small display pieces ────────────────────────────────────────────────── */

export type Tone = "red" | "amber" | "green" | "blue" | "grey" | "violet";

const TONE_COLORS: Record<Tone, { fg: string; bg: string; bd: string }> = {
  red: { fg: "#fca5a5", bg: "rgba(248,113,113,.14)", bd: "rgba(248,113,113,.35)" },
  amber: { fg: "#fcd34d", bg: "rgba(251,191,36,.14)", bd: "rgba(251,191,36,.35)" },
  green: { fg: "#6ee7b7", bg: "rgba(52,211,153,.14)", bd: "rgba(52,211,153,.35)" },
  blue: { fg: "#93c5fd", bg: "rgba(56,189,248,.14)", bd: "rgba(56,189,248,.35)" },
  violet: { fg: "#c4b5fd", bg: "rgba(139,92,246,.16)", bd: "rgba(139,92,246,.35)" },
  grey: { fg: "rgba(255,255,255,.55)", bg: "rgba(255,255,255,.06)", bd: "rgba(255,255,255,.12)" },
};

export function Pill({ children, tone = "grey" }: { children: ReactNode; tone?: Tone }) {
  const c = TONE_COLORS[tone];
  return (
    <span style={{
      display: "inline-block", padding: "3px 9px", borderRadius: 999,
      fontSize: 10.5, fontWeight: 800, letterSpacing: ".02em",
      color: c.fg, background: c.bg, border: `1px solid ${c.bd}`, whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

/** 0–100 score with a colour that follows severity, not preference. */
export function ScoreBar({ value, tone }: { value: number; tone?: Tone }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const auto: Tone = v >= 70 ? "red" : v >= 40 ? "amber" : "green";
  const c = TONE_COLORS[tone ?? auto];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 120 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 99, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
        <div style={{ width: `${v}%`, height: "100%", background: c.fg, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, color: c.fg, width: 26, textAlign: "right" }}>{v}</span>
    </div>
  );
}

export function KpiRow({ items }: {
  items: Array<{ label: string; value: string | number; sub?: string; color?: string }>;
}) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
      gap: 14, marginBottom: 22,
    }}>
      {items.map((k) => (
        <div key={k.label} style={{
          background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)",
          borderRadius: 16, padding: "16px 18px",
        }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: k.color || "#818cf8" }}>{k.value}</div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,.55)", marginTop: 5 }}>{k.label}</div>
          {k.sub ? <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.28)", marginTop: 2 }}>{k.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Model output, rendered readably.
 *
 * Deliberately not a markdown library: these prompts ask for short prose and
 * bullets, and the only two things that ever come back needing treatment are
 * `- ` lists and `**bold**` runs. Anything more would be a dependency carried
 * for one page.
 */
export function Prose({ text, size = 13 }: { text: string; size?: number }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div style={{ fontSize: size, lineHeight: 1.75, color: "rgba(255,255,255,.8)" }}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^\s*[-*•]\s+/.test(l) || /^\s*\d+[.)]\s+/.test(l));
        if (isList) {
          return (
            <ul key={bi} style={{ margin: "0 0 14px", paddingLeft: 20 }}>
              {lines.map((l, li) => (
                <li key={li} style={{ marginBottom: 5 }}>{bold(l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        const heading = block.match(/^#{1,4}\s+(.*)$/);
        if (heading) {
          return (
            <div key={bi} style={{ fontSize: size + 2, fontWeight: 800, color: "#f8fafc", margin: "16px 0 8px" }}>
              {heading[1]}
            </div>
          );
        }
        return <p key={bi} style={{ margin: "0 0 14px" }}>{bold(block)}</p>;
      })}
    </div>
  );
}

function bold(line: string): ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} style={{ color: "#f8fafc", fontWeight: 700 }}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

/** Copy-to-clipboard that says whether it worked. */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(t);
  }, [done]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
    } catch {
      // Clipboard is blocked outside a secure context and in some embedded
      // browsers. Selecting the text by hand still works, so this stays quiet.
      setDone(false);
    }
  }, [text]);

  return (
    <Button tone={done ? "good" : "ghost"} onClick={copy}>
      {done ? "Copied" : label}
    </Button>
  );
}

/** A titled section with the standard card surface. */
export function Section({
  title, right, children, style,
}: { title?: string; right?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ ...card, marginBottom: 18, ...style }}>
      {title ? (
        <div style={{ ...cardHead, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span>{title}</span>
          {right}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/**
 * The disclaimer every generated-text page carries.
 *
 * Not decoration. These pages draft emails and public marketing copy from a
 * four-customer dataset, and the operator reading them is the only check
 * between a model sentence and a customer inbox.
 */
export function ReviewNotice({ children }: { children?: ReactNode }) {
  return (
    <div style={{
      fontSize: 11.5, color: "rgba(255,255,255,.35)", lineHeight: 1.6,
      padding: "10px 14px", borderRadius: 10,
      background: "rgba(255,255,255,.025)", border: "1px dashed rgba(255,255,255,.1)",
      marginTop: 14,
    }}>
      {children || "Drafted by a model from your live data. Read it before it goes anywhere — nothing here sends itself."}
    </div>
  );
}

/** Local date in the DD-MM-YYYY the rest of this product uses. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}
