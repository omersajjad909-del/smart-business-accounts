// FILE: app/(marketing)/compare/[competitor]/page.tsx
// Head-to-head pages. The hub at /compare shows all five columns at once,
// which is useful to browse but ranks for nothing in particular — someone
// searching "FinovaOS vs QuickBooks" needs a page about exactly that.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RIVALS, getRival, winsAgainst, ROWS, type Val } from "../_data";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export function generateStaticParams() {
  return RIVALS.map((r) => ({ competitor: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>;
}): Promise<Metadata> {
  const { competitor } = await params;
  const rival = getRival(competitor);
  if (!rival) return { title: "Compare" };

  const title = `${rival.headline} — Feature & Pricing Comparison`;
  const description = `An honest, feature-by-feature comparison of FinovaOS and ${rival.name}: pricing, accounting, inventory, manufacturing, payroll, and regional tax support.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE}/compare/${rival.slug}` },
    openGraph: { title, description, url: `${BASE}/compare/${rival.slug}`, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

const BORDER = "rgba(255,255,255,.09)";

function Mark({ val }: { val: Val }) {
  if (val === true) return <span style={{ color: "#4ade80", fontSize: 16 }}>✓</span>;
  if (val === false) return <span style={{ color: "#374151", fontSize: 14 }}>—</span>;
  if (typeof val === "string" && val !== "")
    return <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{val}</span>;
  return null;
}

export default async function CompetitorComparePage({
  params,
}: {
  params: Promise<{ competitor: string }>;
}) {
  const { competitor } = await params;
  const rival = getRival(competitor);
  if (!rival) notFound();

  const wins = winsAgainst(rival.key);
  const others = RIVALS.filter((r) => r.slug !== rival.slug);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#04061a 0%,#080c2a 60%,#04061a 100%)",
      fontFamily: "'Outfit','Inter',sans-serif",
      color: "#e2e8f0",
    }}>
      <div style={{ padding: "20px 32px" }}>
        <Link href="/compare" style={{ color: "#64748b", textDecoration: "none", fontSize: 14 }}>
          ← All comparisons
        </Link>
      </div>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "48px 24px 40px", maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 26 }}>
          {[
            { logo: "F", label: "FinovaOS", color: "#818cf8", bg: "rgba(129,140,248,.14)", border: "rgba(129,140,248,.4)" },
            { logo: rival.logo, label: rival.name, color: "#94a3b8", bg: "rgba(255,255,255,.05)", border: BORDER },
          ].map((b, i) => (
            <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {i === 1 && <span style={{ color: "#475569", fontSize: 13, fontWeight: 700 }}>vs</span>}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, background: b.bg,
                  border: `1px solid ${b.border}`, color: b.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 800,
                }}>{b.logo}</div>
                <span style={{ fontSize: 12.5, color: "#94a3b8", fontWeight: 600 }}>{b.label}</span>
              </div>
            </div>
          ))}
        </div>

        <h1 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 800, margin: "0 0 14px", lineHeight: 1.2 }}>
          {rival.headline}
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 16, lineHeight: 1.7, margin: 0 }}>{rival.tagline}</p>
      </section>

      {/* Where the rival is the right call — stated first, on purpose. */}
      <section style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px 40px" }}>
        <div style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${BORDER}`, borderRadius: 16, padding: "22px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10 }}>
            Where {rival.name} is a good choice
          </div>
          <p style={{ margin: 0, fontSize: 14.5, color: "#94a3b8", lineHeight: 1.8 }}>{rival.goodFor}</p>
        </div>
      </section>

      {/* Why teams move */}
      <section style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px 48px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 18px" }}>
          Where FinovaOS is different
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rival.switchReasons.map((reason) => (
            <div key={reason} style={{
              display: "flex", gap: 12, alignItems: "flex-start",
              background: "rgba(129,140,248,.05)", border: "1px solid rgba(129,140,248,.16)",
              borderRadius: 12, padding: "14px 16px",
            }}>
              <span style={{ color: "#818cf8", fontSize: 15, lineHeight: 1.4, flexShrink: 0 }}>◆</span>
              <span style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.75 }}>{reason}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Head-to-head table */}
      <section style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 56px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>Feature by feature</h2>
        <p style={{ fontSize: 13.5, color: "#64748b", margin: "0 0 20px" }}>
          {wins.length} capabilities FinovaOS includes that {rival.name} does not.
        </p>

        <div style={{ overflowX: "auto", border: `1px solid ${BORDER}`, borderRadius: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,.035)" }}>
                <th style={{ textAlign: "left", padding: "14px 18px", fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>Feature</th>
                <th style={{ textAlign: "center", padding: "14px 14px", fontSize: 12, fontWeight: 800, color: "#818cf8", whiteSpace: "nowrap" }}>FinovaOS</th>
                <th style={{ textAlign: "center", padding: "14px 14px", fontSize: 12, fontWeight: 700, color: "#94a3b8", whiteSpace: "nowrap" }}>{rival.name}</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                row.category ? (
                  <tr key={`${row.feature}-${i}`} style={{ background: "rgba(255,255,255,.02)" }}>
                    <td colSpan={3} style={{ padding: "12px 18px", fontSize: 11.5, fontWeight: 800, color: "#818cf8", letterSpacing: ".06em" }}>
                      {row.feature}
                    </td>
                  </tr>
                ) : (
                  <tr key={`${row.feature}-${i}`} style={{ borderTop: `1px solid rgba(255,255,255,.05)` }}>
                    <td style={{ padding: "11px 18px", fontSize: 13.5, color: "#cbd5e1" }}>
                      {row.feature}
                      {row.note && (
                        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 3, lineHeight: 1.5 }}>{row.note}</div>
                      )}
                    </td>
                    <td style={{ textAlign: "center", padding: "11px 14px", background: "rgba(129,140,248,.04)" }}>
                      <Mark val={row.finova}/>
                    </td>
                    <td style={{ textAlign: "center", padding: "11px 14px" }}>
                      <Mark val={row[rival.key]}/>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: 11.5, color: "#475569", marginTop: 14, lineHeight: 1.7 }}>
          Comparison compiled from publicly available product information. Competitor
          features and pricing change — check their current plans before deciding.
          {rival.name} is a trademark of its respective owner.
        </p>
      </section>

      {/* Other comparisons */}
      <section style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 56px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px", color: "#94a3b8" }}>Other comparisons</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 10 }}>
          {others.map((o) => (
            <Link key={o.slug} href={`/compare/${o.slug}`} style={{
              display: "flex", alignItems: "center", gap: 10, textDecoration: "none",
              background: "rgba(255,255,255,.03)", border: `1px solid ${BORDER}`,
              borderRadius: 12, padding: "13px 15px",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: "rgba(255,255,255,.05)", border: `1px solid ${BORDER}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800, color: "#94a3b8",
              }}>{o.logo}</div>
              <span style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 600 }}>vs {o.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 100px" }}>
        <div style={{
          borderRadius: 20, padding: "40px 32px", textAlign: "center",
          background: "linear-gradient(135deg,rgba(99,102,241,.12),rgba(79,70,229,.05))",
          border: "1px solid rgba(99,102,241,.22)",
        }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 10px", color: "white" }}>
            See it against your own numbers
          </h2>
          <p style={{ fontSize: 14.5, color: "#94a3b8", margin: "0 0 24px", lineHeight: 1.7 }}>
            Bring your current setup to a demo and we will show you exactly what
            moving would look like — including what you would lose.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/demo" style={{
              padding: "12px 24px", borderRadius: 11, textDecoration: "none",
              background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white",
              fontSize: 14, fontWeight: 700,
            }}>Book a Demo →</Link>
            <Link href="/pricing" style={{
              padding: "12px 24px", borderRadius: 11, textDecoration: "none",
              background: "rgba(255,255,255,.05)", border: `1px solid ${BORDER}`,
              color: "#cbd5e1", fontSize: 14, fontWeight: 600,
            }}>View Pricing</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
