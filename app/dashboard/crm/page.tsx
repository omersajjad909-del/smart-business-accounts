"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const FF = "'Outfit','Inter',sans-serif";
const ACCENT = "#6366f1";

type Contact     = { id: string; name: string; company?: string; email?: string; phone?: string; createdAt: string };
type Opportunity = { id: string; title: string; value?: number; stage: string; contact?: { name: string }; createdAt: string };
type Interaction = { id: string; type: string; notes?: string; contact?: { name: string }; date?: string; createdAt: string };

const STAGE_META: Record<string, { label: string; color: string; bg: string }> = {
  LEAD:        { label: "Lead",        color: "#60a5fa", bg: "rgba(96,165,250,.12)"  },
  QUALIFIED:   { label: "Qualified",   color: "#a78bfa", bg: "rgba(167,139,250,.12)" },
  PROPOSAL:    { label: "Proposal",    color: "#fbbf24", bg: "rgba(251,191,36,.12)"  },
  NEGOTIATION: { label: "Negotiation", color: "#fb923c", bg: "rgba(251,146,60,.12)"  },
  WON:         { label: "Won",         color: "#34d399", bg: "rgba(52,211,153,.12)"  },
  LOST:        { label: "Lost",        color: "#f87171", bg: "rgba(248,113,113,.12)" },
};

const TYPE_ICON: Record<string, string> = { CALL: "📞", EMAIL: "📧", MEETING: "🤝", NOTE: "📝" };
const TYPE_COLOR: Record<string, string> = { CALL: "#34d399", EMAIL: "#60a5fa", MEETING: "#a78bfa", NOTE: "#fbbf24" };

export default function CRMOverview() {
  const [contacts, setContacts]         = useState<Contact[]>([]);
  const [opps, setOpps]                 = useState<Opportunity[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/crm/contacts").then(r => r.ok ? r.json() : null),
      fetch("/api/crm/opportunities").then(r => r.ok ? r.json() : null),
      fetch("/api/crm/interactions").then(r => r.ok ? r.json() : null),
    ]).then(([c, o, i]) => {
      if (c?.contacts)     setContacts(c.contacts.slice(0, 5));
      if (o?.opportunities) setOpps(o.opportunities.slice(0, 6));
      if (i?.interactions) setInteractions(i.interactions.slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openOpps   = opps.filter(o => o.stage !== "WON" && o.stage !== "LOST");
  const totalValue = opps.reduce((s, o) => s + (o.value || 0), 0);
  const wonCount   = opps.filter(o => o.stage === "WON").length;

  const fmt = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `$${(n / 1_000).toFixed(0)}K`
    : `$${n.toLocaleString()}`;

  const STATS = [
    { label: "Total Contacts",      value: contacts.length,   icon: "👥", color: "#818cf8", href: "/dashboard/crm/contacts"      },
    { label: "Open Opportunities",  value: openOpps.length,   icon: "🎯", color: "#34d399", href: "/dashboard/crm/opportunities" },
    { label: "Pipeline Value",      value: fmt(totalValue),   icon: "💰", color: "#fbbf24", href: "/dashboard/crm/opportunities" },
    { label: "Interactions",        value: interactions.length, icon: "💬", color: "#c084fc", href: "/dashboard/crm/interactions" },
  ];

  const NAV = [
    { href: "/dashboard/crm/contacts",      label: "Contacts",      icon: "👥", desc: "All CRM contacts & clients",  accent: "#818cf8" },
    { href: "/dashboard/crm/opportunities", label: "Opportunities",  icon: "🎯", desc: "Sales pipeline & deals",     accent: "#34d399" },
    { href: "/dashboard/crm/interactions",  label: "Interactions",   icon: "💬", desc: "Calls, meetings & emails",   accent: "#c084fc" },
    { href: "/dashboard/quotation",         label: "Quotations",     icon: "📋", desc: "Create & send quotes",       accent: "#fbbf24" },
  ];

  return (
    <div style={{ padding: "28px 32px", fontFamily: FF, color: "var(--text-primary)", minHeight: "100vh", background: "var(--app-bg)" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤝</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-.5px" }}>CRM</h1>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", paddingLeft: 46 }}>Contacts, Pipeline & Relationship Management</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link prefetch={false} href="/dashboard/crm/contacts" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, background: ACCENT, color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none", fontFamily: FF }}>
            <span style={{ fontSize: 15 }}>+</span> New Contact
          </Link>
          <Link prefetch={false} href="/dashboard/crm/opportunities" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 600, fontSize: 13, textDecoration: "none", fontFamily: FF }}>
            View Pipeline →
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginBottom: 28 }}>
        {STATS.map(s => (
          <Link key={s.label} href={s.href} prefetch={false} style={{ textDecoration: "none" }}>
            <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", position: "relative", overflow: "hidden", cursor: "pointer", transition: "transform .15s, border-color .15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = s.color; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.transform = ""; }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: s.color, borderRadius: "14px 14px 0 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>{s.label}</span>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{s.icon}</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Main 3-col Content ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 24 }}>

        {/* Recent Contacts */}
        <Panel title="Recent Contacts" href="/dashboard/crm/contacts" loading={loading} empty={contacts.length === 0} emptyMsg="No contacts yet">
          {contacts.map((c, i) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < contacts.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: `rgba(99,102,241,.15)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#a5b4fc" }}>
                {(c.name || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.company || c.email || "—"}</div>
              </div>
              {c.phone && <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>📞</span>}
            </div>
          ))}
        </Panel>

        {/* Opportunities */}
        <Panel title="Opportunities" href="/dashboard/crm/opportunities" loading={loading} empty={opps.length === 0} emptyMsg="No opportunities yet">
          {opps.map((o, i) => {
            const meta = STAGE_META[o.stage] || STAGE_META.LEAD;
            return (
              <div key={o.id} style={{ padding: "8px 0", borderBottom: i < opps.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8 }}>{o.title}</div>
                  {o.value ? <span style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24", flexShrink: 0 }}>{fmt(o.value)}</span> : null}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: meta.bg, color: meta.color }}>{meta.label}</span>
                  {o.contact?.name && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{o.contact.name}</span>}
                </div>
              </div>
            );
          })}
        </Panel>

        {/* Recent Interactions */}
        <Panel title="Recent Interactions" href="/dashboard/crm/interactions" loading={loading} empty={interactions.length === 0} emptyMsg="No interactions yet">
          {interactions.map((it, i) => {
            const icon  = TYPE_ICON[it.type]  || "💬";
            const color = TYPE_COLOR[it.type] || "#94a3b8";
            return (
              <div key={it.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < interactions.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  {icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                    {it.contact?.name || "—"} <span style={{ color, fontWeight: 700 }}>· {it.type}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                    {it.notes ? it.notes.slice(0, 55) + (it.notes.length > 55 ? "…" : "") : "No notes"}
                  </div>
                </div>
              </div>
            );
          })}
        </Panel>
      </div>

      {/* ── Win Rate Bar (if data exists) ── */}
      {opps.length > 0 && (
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>Pipeline Health</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", gap: 3, height: 8, borderRadius: 8, overflow: "hidden" }}>
              {Object.entries(STAGE_META).map(([stage, meta]) => {
                const count = opps.filter(o => o.stage === stage).length;
                const pct   = opps.length > 0 ? (count / opps.length) * 100 : 0;
                if (pct === 0) return null;
                return <div key={stage} style={{ width: `${pct}%`, background: meta.color, transition: "width .4s" }} title={`${meta.label}: ${count}`} />;
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {Object.entries(STAGE_META).map(([stage, meta]) => {
              const count = opps.filter(o => o.stage === stage).length;
              if (count === 0) return null;
              return (
                <div key={stage} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color }} />
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{meta.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{count}</span>
                </div>
              );
            })}
          </div>
          {wonCount > 0 && (
            <div style={{ fontSize: 12, fontWeight: 700, color: "#34d399", whiteSpace: "nowrap" }}>
              Win Rate: {Math.round((wonCount / opps.length) * 100)}%
            </div>
          )}
        </div>
      )}

      {/* ── Quick Nav Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 }}>
        {NAV.map(n => (
          <Link key={n.href} href={n.href} prefetch={false} style={{ textDecoration: "none" }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 12, background: "var(--panel-bg)", border: "1px solid var(--border)", cursor: "pointer", transition: "border-color .15s, transform .15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = n.accent; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.transform = ""; }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${n.accent}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                {n.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{n.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{n.desc}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}

// ── Panel component ──────────────────────────────────────────────
function Panel({ title, href, loading, empty, emptyMsg, children }: {
  title: string; href: string; loading: boolean; empty: boolean; emptyMsg: string; children: React.ReactNode;
}) {
  return (
    <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{title}</span>
        <Link prefetch={false} href={href} style={{ fontSize: 11, color: ACCENT, textDecoration: "none", fontWeight: 600, fontFamily: FF }}>View all →</Link>
      </div>
      <div style={{ padding: "4px 18px 12px" }}>
        {loading
          ? <div style={{ padding: "20px 0", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>Loading…</div>
          : empty
          ? <div style={{ padding: "24px 0", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>{emptyMsg}</div>
          : children
        }
      </div>
    </div>
  );
}
