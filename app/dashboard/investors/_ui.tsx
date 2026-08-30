"use client";

// Shared shell for the Investor pages.
//
// Eight screens that all read the same way: a numbered heading, a panel or
// two, a plain table. The controls live here so a change to spacing or focus
// styling lands on every page at once.

import { investorAccent } from "./_shared";

export const FONT = "'Outfit','Inter',sans-serif";
export const PANEL = "var(--panel-bg)";
export const BORDER = "var(--border)";
export const TEXT = "var(--text-primary)";
export const MUTED = "var(--text-muted)";
export const BG = "var(--app-bg)";
export const ACCENT = investorAccent;

export function inp(extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: "9px 12px",
    borderRadius: 8,
    border: "1.5px solid " + BORDER,
    background: BG,
    color: TEXT,
    fontFamily: FONT,
    fontSize: 13.5,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    ...extra,
  };
}

export function labelStyle(): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    color: MUTED,
    marginBottom: 5,
    display: "block",
  };
}

export function Field({
  label,
  children,
  width,
}: {
  label: string;
  children: React.ReactNode;
  width?: number | string;
}) {
  return (
    <div style={{ flex: width ? "0 0 auto" : "1 1 150px", width, minWidth: 0 }}>
      <span style={labelStyle()}>{label}</span>
      {children}
    </div>
  );
}

export function Btn({
  children,
  onClick,
  tone = "accent",
  disabled,
  type = "button",
  small,
  fullWidth,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "accent" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
  small?: boolean;
  fullWidth?: boolean;
}) {
  const bg = tone === "accent" ? ACCENT : "transparent";
  const color = tone === "accent" ? "#04231f" : tone === "danger" ? "#f87171" : MUTED;
  const border = tone === "accent" ? ACCENT : BORDER;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? "6px 12px" : "9px 18px",
        borderRadius: 8,
        border: "1.5px solid " + border,
        background: bg,
        color,
        fontFamily: FONT,
        fontSize: small ? 12 : 13.5,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap",
        width: fullWidth ? "100%" : undefined,
      }}
    >
      {children}
    </button>
  );
}

export function Panel({
  step,
  title,
  hint,
  children,
  right,
}: {
  step?: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: PANEL,
        border: "1px solid " + BORDER,
        borderRadius: 12,
        padding: "16px 18px 18px",
        marginBottom: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: hint ? 4 : 12 }}>
        {step !== undefined && (
          <span
            style={{
              flex: "0 0 auto",
              width: 24,
              height: 24,
              borderRadius: 6,
              background: ACCENT,
              color: "#04231f",
              fontSize: 12.5,
              fontWeight: 800,
              display: "grid",
              placeItems: "center",
              fontFamily: FONT,
            }}
          >
            {step}
          </span>
        )}
        <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: TEXT, flex: 1 }}>{title}</h2>
        {right}
      </div>
      {hint && (
        <p style={{ margin: "0 0 14px", fontSize: 12.5, color: MUTED, lineHeight: 1.55, paddingLeft: step !== undefined ? 36 : 0 }}>
          {hint}
        </p>
      )}
      {children}
    </section>
  );
}

export function Tiles({ items }: { items: { label: string; value: string; tone?: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 18 }}>
      {items.map((t) => (
        <div
          key={t.label}
          style={{
            background: PANEL,
            border: "1px solid " + BORDER,
            borderRadius: 12,
            padding: "13px 15px",
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: MUTED }}>
            {t.label}
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: t.tone || TEXT,
              marginTop: 5,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {t.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div style={{ overflowX: "auto", border: "1px solid " + BORDER, borderRadius: 10 }}>{children}</div>;
}

export const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontFamily: FONT,
  fontSize: 13,
  minWidth: 520,
};

export const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: ".07em",
  textTransform: "uppercase",
  color: MUTED,
  borderBottom: "1px solid " + BORDER,
  whiteSpace: "nowrap",
};

export const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid " + BORDER,
  color: TEXT,
};

export const numTd: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
};

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "26px 18px", textAlign: "center", color: MUTED, fontSize: 13, lineHeight: 1.6 }}>{children}</div>
  );
}

export function PageShell({
  title,
  subtitle,
  isMobile,
  children,
  actions,
}: {
  title: string;
  subtitle: string;
  isMobile: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div
      style={{
        fontFamily: FONT,
        padding: isMobile ? "16px 12px 60px" : "24px 28px 80px",
        maxWidth: 1040,
        color: TEXT,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>{title}</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: MUTED, lineHeight: 1.6, maxWidth: 640 }}>{subtitle}</p>
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

/** Investor navigation lives in the dashboard sidebar. */
export function Tabs(_props: { active: string }) {
  return null;
}

export function PartyPicker({
  parties,
  value,
  onChange,
}: {
  parties: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <select style={inp({ maxWidth: 280 })} value={value} onChange={(e) => onChange(e.target.value)}>
      {parties.length === 0 && <option value="">No party yet</option>}
      {parties.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
