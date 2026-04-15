"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Contact = { id: string; name: string; company?: string; email?: string; phone?: string; createdAt: string };
type Opportunity = { id: string; title: string; value?: number; stage: string; contact?: { name: string }; createdAt: string };
type Interaction = { id: string; type: string; notes?: string; contact?: { name: string }; date?: string; createdAt: string };

const STAGE_COLORS: Record<string, string> = {
  LEAD: "bg-blue-900/40 text-blue-300",
  QUALIFIED: "bg-indigo-900/40 text-indigo-300",
  PROPOSAL: "bg-yellow-900/40 text-yellow-300",
  NEGOTIATION: "bg-orange-900/40 text-orange-300",
  WON: "bg-green-900/40 text-green-300",
  LOST: "bg-red-900/40 text-red-300",
};

export default function CRMOverview() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/crm/contacts").then(r => r.ok ? r.json() : null),
      fetch("/api/crm/opportunities").then(r => r.ok ? r.json() : null),
      fetch("/api/crm/interactions").then(r => r.ok ? r.json() : null),
    ]).then(([c, o, i]) => {
      if (c?.contacts) setContacts(c.contacts.slice(0, 5));
      if (o?.opportunities) setOpps(o.opportunities.slice(0, 5));
      if (i?.interactions) setInteractions(i.interactions.slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalValue = opps.reduce((s, o) => s + (o.value || 0), 0);
  const wonOpps = opps.filter(o => o.stage === "WON").length;

  const stats = [
    { label: "Total Contacts", value: contacts.length || "—", color: "#818cf8", href: "/dashboard/crm/contacts" },
    { label: "Open Opportunities", value: opps.filter(o => o.stage !== "WON" && o.stage !== "LOST").length || "—", color: "#22c55e", href: "/dashboard/crm/opportunities" },
    { label: "Pipeline Value", value: totalValue > 0 ? `${(totalValue / 1000).toFixed(0)}K` : "—", color: "#f59e0b", href: "/dashboard/crm/opportunities" },
    { label: "Recent Interactions", value: interactions.length || "—", color: "#c084fc", href: "/dashboard/crm/interactions" },
  ];

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Inter',sans-serif", color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", margin: "0 0 4px" }}>CRM</h1>
          <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13, margin: 0 }}>Contacts, Pipeline & Relationship Management</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link prefetch={false} href="/dashboard/crm/contacts" style={btnStyle("#6366f1")}>+ New Contact</Link>
          <Link prefetch={false} href="/dashboard/crm/opportunities" style={btnStyle("rgba(99,102,241,.2)", "#a5b4fc", "1px solid rgba(99,102,241,.3)")}>View Pipeline</Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14, marginBottom: 32 }}>
        {stats.map(s => (
          <Link prefetch={false} key={s.label} href={s.href} style={{ textDecoration: "none" }}>
            <div style={{
              background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)",
              borderRadius: 14, padding: "18px 20px", cursor: "pointer",
              transition: "border-color .2s",
            }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Three columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 20 }}>

        {/* Recent Contacts */}
        <div style={sectionStyle}>
          <div style={sectionHeader}>
            <span>Recent Contacts</span>
            <Link prefetch={false} href="/dashboard/crm/contacts" style={linkStyle}>View all →</Link>
          </div>
          {loading ? <Loader /> : contacts.length === 0 ? <Empty msg="No contacts yet" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {contacts.map(c => (
                <div key={c.id} style={rowStyle}>
                  <div style={avatarStyle}>{(c.name || "?")[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{c.company || c.email || ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div style={sectionStyle}>
          <div style={sectionHeader}>
            <span>Opportunities</span>
            <Link prefetch={false} href="/dashboard/crm/opportunities" style={linkStyle}>View all →</Link>
          </div>
          {loading ? <Loader /> : opps.length === 0 ? <Empty msg="No opportunities yet" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {opps.map(o => (
                <div key={o.id} style={rowStyle}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "white", marginBottom: 3 }}>{o.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                        ...parseClass(STAGE_COLORS[o.stage] || "bg-slate-700/40 text-slate-400"),
                      }}>{o.stage}</span>
                      {o.value && <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{o.value.toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Interactions */}
        <div style={sectionStyle}>
          <div style={sectionHeader}>
            <span>Recent Interactions</span>
            <Link prefetch={false} href="/dashboard/crm/interactions" style={linkStyle}>View all →</Link>
          </div>
          {loading ? <Loader /> : interactions.length === 0 ? <Empty msg="No interactions yet" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {interactions.map(i => (
                <div key={i.id} style={rowStyle}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(99,102,241,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                    {i.type === "CALL" ? "📞" : i.type === "EMAIL" ? "📧" : i.type === "MEETING" ? "🤝" : "💬"}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.7)" }}>{i.contact?.name || "—"} · {i.type}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2 }}>{i.notes ? i.notes.slice(0, 60) : "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Cards */}
      <div style={{ marginTop: 28, display: "flex", gap: 14, flexWrap: "wrap" }}>
        {[
          { href: "/dashboard/crm/contacts", label: "Contacts", icon: "👥", desc: "All CRM contacts & clients" },
          { href: "/dashboard/crm/opportunities", label: "Opportunities", icon: "💼", desc: "Sales pipeline & deals" },
          { href: "/dashboard/crm/interactions", label: "Interactions", icon: "🤝", desc: "Calls, meetings & emails" },
          { href: "/dashboard/quotation", label: "Quotations", icon: "📋", desc: "Create & send quotes" },
        ].map(n => (
          <Link prefetch={false} key={n.href} href={n.href} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 20px", borderRadius: 12,
            background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)",
            textDecoration: "none", flex: 1, minWidth: 200, transition: "border-color .2s",
          }}>
            <span style={{ fontSize: 22 }}>{n.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{n.label}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{n.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// helpers
function parseClass(cls: string) {
  const parts = cls.split(" ");
  const bg = parts.find(p => p.startsWith("bg-")) || "";
  const text = parts.find(p => p.startsWith("text-")) || "";
  const colorMap: Record<string, string> = {
    "bg-blue-900/40": "rgba(30,58,138,.4)", "text-blue-300": "#93c5fd",
    "bg-indigo-900/40": "rgba(49,46,129,.4)", "text-indigo-300": "#a5b4fc",
    "bg-yellow-900/40": "rgba(113,63,18,.4)", "text-yellow-300": "#fcd34d",
    "bg-orange-900/40": "rgba(124,45,18,.4)", "text-orange-300": "#fdba74",
    "bg-green-900/40": "rgba(20,83,45,.4)", "text-green-300": "#86efac",
    "bg-red-900/40": "rgba(127,29,29,.4)", "text-red-300": "#fca5a5",
  };
  return { background: colorMap[bg] || "rgba(71,85,105,.4)", color: colorMap[text] || "#94a3b8" };
}

const sectionStyle: React.CSSProperties = {
  background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)",
  borderRadius: 14, padding: "18px 20px",
};
const sectionHeader: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.7)", marginBottom: 14,
};
const linkStyle: React.CSSProperties = { fontSize: 11, color: "#818cf8", textDecoration: "none" };
const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10 };
const avatarStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
  background: "rgba(99,102,241,.2)", display: "flex", alignItems: "center",
  justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#a5b4fc",
};

function Loader() {
  return <div style={{ color: "rgba(255,255,255,.3)", fontSize: 12, padding: "8px 0" }}>Loading…</div>;
}
function Empty({ msg }: { msg: string }) {
  return <div style={{ color: "rgba(255,255,255,.25)", fontSize: 12, padding: "12px 0", textAlign: "center" }}>{msg}</div>;
}
function btnStyle(bg: string, color = "white", border?: string): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", padding: "10px 18px", borderRadius: 10,
    background: bg, color, fontWeight: 700, fontSize: 13, textDecoration: "none",
    border: border || "none",
  };
}
