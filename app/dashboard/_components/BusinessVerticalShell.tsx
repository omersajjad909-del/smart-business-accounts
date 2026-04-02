"use client";

import Link from "next/link";

type VerticalLink = { label: string; href: string };
type VerticalPoint = { title: string; description: string };

type BusinessVerticalShellProps = {
  title: string;
  subtitle: string;
  mode: "overview" | "analytics";
  accent?: string;
  links: VerticalLink[];
  highlights: VerticalPoint[];
  workflow: string[];
};

const shellFont = "'Outfit','Inter',sans-serif";

export function BusinessVerticalShell({
  title,
  subtitle,
  mode,
  accent = "#818cf8",
  links,
  highlights,
  workflow,
}: BusinessVerticalShellProps) {
  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: shellFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800 }}>{title}</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.45)" }}>{subtitle}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.08)",
                background: "rgba(255,255,255,.03)",
                color: accent,
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {highlights.map((card) => (
          <div key={card.title} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 8 }}>{mode === "overview" ? "Module Focus" : "Analytics Focus"}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: accent, marginBottom: 8 }}>{card.title}</div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: "rgba(255,255,255,.55)" }}>{card.description}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 18 }}>
        <section style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,.08)", fontSize: 15, fontWeight: 800 }}>
            {mode === "overview" ? "Operational Modules" : "Executive Reading"}
          </div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {highlights.map((item) => (
              <div key={item.title} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginTop: 6, lineHeight: 1.6 }}>{item.description}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,.08)", fontSize: 15, fontWeight: 800 }}>
            {mode === "overview" ? "Business Flow" : "Control Flow"}
          </div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {workflow.map((step, index) => (
              <div key={step} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${accent}22`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                  {index + 1}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.72)", lineHeight: 1.55 }}>{step}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
