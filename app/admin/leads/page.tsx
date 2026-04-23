"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  priority?: string | null;
  status?: string | null;
  followUpAt?: string | null;
  createdAt: string;
};

type LeadSummary = {
  total: number;
  byStatus: Record<string, number>;
  highPriority: number;
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      const u = getCurrentUser();
      const headers: Record<string, string> = {};
      if (u?.role) headers["x-user-role"] = u.role;
      if (u?.id) headers["x-user-id"] = u.id;

      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (priority !== "all") params.set("priority", priority);
      if (query.trim()) params.set("q", query.trim());

      try {
        const r = await fetch(`/api/admin/leads?${params.toString()}`, {
          cache: "no-store",
          headers,
          credentials: "include" as RequestCredentials,
        });
        const data = await r.json();
        if (!active) return;
        setLeads(r.ok ? data.leads || [] : []);
        setSummary(r.ok ? data.summary || null : null);
      } catch {
        if (!active) return;
        setLeads([]);
        setSummary(null);
      }
    })();

    return () => {
      active = false;
    };
  }, [status, priority, query]);

  const cards = [
    { label: "Total Leads", value: summary?.total ?? 0, tone: "purple" },
    { label: "High Priority", value: summary?.highPriority ?? 0, tone: "orange" },
    { label: "New", value: summary?.byStatus?.new ?? 0, tone: "blue" },
    { label: "Converted", value: summary?.byStatus?.converted ?? 0, tone: "green" },
  ];

  return (
    <div className="leads-page">
      <style>{styles}</style>

      <div className="page-head">
        <div>
          <h1>Leads</h1>
          <p>Track incoming prospects, priorities, and pipeline status.</p>
        </div>
      </div>

      <div className="cards-grid">
        {cards.map((card) => (
          <article key={card.label} className={`info-card tone-${card.tone}`}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      <section className="panel">
        <div className="toolbar">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search lead, email, company..." />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="demo">Demo</option>
            <option value="proposal">Proposal</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {!leads ? (
          <div className="empty-state">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="empty-state">No leads found for the selected filters.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Source</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Follow Up</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <strong>{lead.name}</strong>
                      <span>{lead.email}</span>
                    </td>
                    <td>{lead.company || "-"}</td>
                    <td>{lead.source || "manual"}</td>
                    <td><Badge tone={lead.priority === "high" ? "orange" : lead.priority === "low" ? "blue" : "purple"}>{lead.priority || "medium"}</Badge></td>
                    <td><Badge tone={lead.status === "converted" ? "green" : lead.status === "lost" ? "slate" : "purple"}>{lead.status || "new"}</Badge></td>
                    <td>{lead.followUpAt ? new Date(lead.followUpAt).toLocaleDateString("en-US") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "purple" | "orange" | "green" | "blue" | "slate" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

const styles = `
.leads-page{display:grid;gap:18px}
.page-head h1{margin:0;font-size:34px;font-weight:800;letter-spacing:-.05em}
.page-head p{margin:6px 0 0;color:rgba(203,213,225,.72);font-size:14px}
.cards-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.panel,.info-card{border-radius:22px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg, rgba(19,27,46,.98), rgba(15,22,39,.96));box-shadow:0 24px 70px rgba(3,6,18,.22)}
.info-card{padding:18px}
.info-card span{color:rgba(203,213,225,.72);font-size:13px}
.info-card strong{display:block;margin-top:10px;font-size:34px;line-height:1}
.tone-purple strong{color:#c4b5fd}.tone-orange strong{color:#fdba74}.tone-green strong{color:#86efac}.tone-blue strong{color:#93c5fd}
.panel{padding:18px}
.toolbar{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.toolbar input,.toolbar select{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:11px 13px;color:white;font:inherit}
.toolbar input{min-width:260px;flex:1}
.empty-state{padding:26px 6px;color:rgba(148,163,184,.72);font-size:13px}
.table-wrap{overflow:auto}
table{width:100%;border-collapse:collapse;min-width:760px}
th,td{padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06);text-align:left;font-size:13px;color:#e2e8f0}
th{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:rgba(148,163,184,.72)}
td strong{display:block}
td span{display:block;margin-top:4px;color:rgba(148,163,184,.72);font-size:12px}
.badge{display:inline-flex;padding:5px 10px;border-radius:999px;font-size:11px;font-weight:700;text-transform:capitalize}
.badge-purple{background:rgba(124,58,237,.18);color:#d8ccff}
.badge-orange{background:rgba(251,146,60,.16);color:#fdba74}
.badge-green{background:rgba(34,197,94,.16);color:#86efac}
.badge-blue{background:rgba(59,130,246,.16);color:#93c5fd}
.badge-slate{background:rgba(148,163,184,.16);color:#cbd5e1}
@media (max-width: 1100px){.cards-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width: 640px){.page-head h1{font-size:26px}.cards-grid{grid-template-columns:1fr}.panel,.info-card{border-radius:18px;padding:14px}.toolbar input,.toolbar select{width:100%;min-width:0}}
`;
