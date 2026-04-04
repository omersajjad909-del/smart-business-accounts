"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  message?: string | null;
  source?: string | null;
  status: string;
  priority: string;
  notes?: string | null;
  followUpAt?: string | null;
  assignedTo?: string | null;
  country?: string | null;
  createdAt: string;
};

type VisitorStats = {
  totalVisits: number;
  uniqueVisitors: number;
  countries: number;
  cities: number;
  deviceBreakdown: { mobile: number; desktop: number; tablet: number };
  topPages: { page: string; visits: number }[];
};

type VisitorRow = {
  country: string;
  countryName: string;
  flag: string;
  topCity: string;
  visitors: number;
  uniqueVisitors: number;
};

const STATUSES = ["new", "contacted", "demo", "proposal", "converted", "lost"] as const;
const STATUS_COLORS: Record<string, string> = {
  new: "#a5b4fc",
  contacted: "#fbbf24",
  demo: "#22d3ee",
  proposal: "#c4b5fd",
  converted: "#34d399",
  lost: "#f87171",
};
const STATUS_BG: Record<string, string> = {
  new: "rgba(99,102,241,.18)",
  contacted: "rgba(251,191,36,.18)",
  demo: "rgba(34,211,238,.18)",
  proposal: "rgba(167,139,250,.18)",
  converted: "rgba(52,211,153,.18)",
  lost: "rgba(248,113,113,.18)",
};
const PRIORITY_COLORS: Record<string, string> = { low: "#6ee7b7", medium: "#fbbf24", high: "#f87171" };

function adminHeaders(json = false) {
  const user = getCurrentUser();
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  if (user?.id) headers["x-user-id"] = user.id;
  if (user?.role) headers["x-user-role"] = user.role;
  return headers;
}

function fmtDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

export default function AdminCrmPage() {
  const [tab, setTab] = useState<"visitors" | "leads" | "pipeline">("visitors");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("7d");
  const [visitorRows, setVisitorRows] = useState<VisitorRow[]>([]);
  const [visitorStats, setVisitorStats] = useState<VisitorStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
    source: "manual",
    priority: "medium",
    assignedTo: "",
    country: "",
    followUpAt: "",
  });

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || String(user.role || "").toUpperCase() !== "ADMIN") {
      window.location.replace("/admin/login");
      return;
    }
    setReady(true);
  }, []);

  const loadVisitors = useCallback(async () => {
    const response = await fetch(`/api/admin/visitors?range=${range}`, { headers: adminHeaders() });
    if (response.status === 403) {
      window.location.replace("/admin/login");
      return;
    }
    const data = await response.json();
    setVisitorRows(data.rows || []);
    setVisitorStats(data.stats || null);
  }, [range]);

  const loadLeads = useCallback(async () => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (search.trim()) params.set("q", search.trim());
    const response = await fetch(`/api/admin/leads?${params.toString()}`, { headers: adminHeaders() });
    if (response.status === 403) {
      window.location.replace("/admin/login");
      return;
    }
    const data = await response.json();
    setLeads(data.leads || []);
  }, [search, status]);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    Promise.all([loadVisitors(), loadLeads()]).finally(() => setLoading(false));
  }, [ready, loadVisitors, loadLeads]);

  async function patchLead(id: string, patch: Record<string, unknown>) {
    const response = await fetch("/api/admin/leads", {
      method: "PATCH",
      headers: adminHeaders(true),
      body: JSON.stringify({ id, ...patch }),
    });
    if (!response.ok) return;
    const data = await response.json();
    setLeads((current) => current.map((lead) => (lead.id === id ? data.lead : lead)));
  }

  async function removeLead(id: string) {
    if (!window.confirm("Delete this lead?")) return;
    const response = await fetch(`/api/admin/leads?id=${id}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
    if (response.ok) setLeads((current) => current.filter((lead) => lead.id !== id));
  }

  async function createLead(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/leads", {
        method: "POST",
        headers: adminHeaders(true),
        body: JSON.stringify({ ...form, followUpAt: form.followUpAt || null }),
      });
      if (!response.ok) return;
      const data = await response.json();
      setLeads((current) => [data.lead, ...current]);
      setShowForm(false);
      setForm({ name: "", email: "", phone: "", company: "", message: "", source: "manual", priority: "medium", assignedTo: "", country: "", followUpAt: "" });
    } finally {
      setSaving(false);
    }
  }

  const pipeline = useMemo(
    () => Object.fromEntries(STATUSES.map((item) => [item, leads.filter((lead) => lead.status === item)])) as Record<string, Lead[]>,
    [leads],
  );
  const leadSummary = useMemo(
    () => ({
      total: leads.length,
      high: leads.filter((lead) => lead.priority === "high").length,
      converted: leads.filter((lead) => lead.status === "converted").length,
      followUps: leads.filter((lead) => lead.followUpAt).length,
    }),
    [leads],
  );

  if (!ready) return null;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#080c1e,#0c0f2e)", color: "white", fontFamily: "'Outfit',sans-serif", padding: "32px 24px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @media (max-width: 980px) {.crm-two{grid-template-columns:1fr!important}.crm-pipeline{grid-template-columns:repeat(3,minmax(220px,1fr))!important}}
        @media (max-width: 720px) {.crm-pipeline{grid-template-columns:1fr!important}.crm-vis-head,.crm-vis-row{grid-template-columns:1.4fr .8fr .8fr .8fr!important}}
      `}</style>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900 }}>Admin CRM</h1>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,.42)" }}>Visitors, leads, and pipeline in one place.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tab === "visitors" ? (
              <select value={range} onChange={(e) => setRange(e.target.value)} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white" }}>
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            ) : (
              <button type="button" onClick={() => setShowForm(true)} style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "white", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                Add Lead
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,.04)", borderRadius: 14, padding: 4, width: "fit-content", marginBottom: 20 }}>
          {(["visitors", "leads", "pipeline"] as const).map((item) => (
            <button key={item} type="button" onClick={() => setTab(item)} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: tab === item ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "transparent", color: tab === item ? "white" : "rgba(255,255,255,.42)", fontSize: 13, fontWeight: 800, cursor: "pointer", textTransform: "capitalize" }}>
              {item}
            </button>
          ))}
        </div>

        {tab === "visitors" ? (
          <>
            <div className="crm-two" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
                {[
                  ["Total Visits", visitorStats?.totalVisits ?? 0, "#818cf8"],
                  ["Unique Visitors", visitorStats?.uniqueVisitors ?? 0, "#34d399"],
                  ["Countries", visitorStats?.countries ?? 0, "#fbbf24"],
                  ["Cities", visitorStats?.cities ?? 0, "#22d3ee"],
                ].map(([label, value, color]) => (
                  <div key={String(label)} style={{ borderRadius: 16, padding: "16px 18px", background: "rgba(255,255,255,.04)", border: `1px solid ${color}22` }}>
                    <div style={{ fontSize: 27, fontWeight: 900, color }}>{loading ? "..." : Number(value).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)", marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderRadius: 16, padding: "16px 18px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,.42)", marginBottom: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>Device Split</div>
                {[
                  ["desktop", visitorStats?.deviceBreakdown.desktop ?? 0, "#818cf8"],
                  ["mobile", visitorStats?.deviceBreakdown.mobile ?? 0, "#34d399"],
                  ["tablet", visitorStats?.deviceBreakdown.tablet ?? 0, "#fbbf24"],
                ].map(([label, value, color]) => (
                  <div key={String(label)} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: "rgba(255,255,255,.58)", textTransform: "capitalize" }}>{label}</span>
                      <span style={{ color, fontWeight: 800 }}>{value}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,.08)" }}>
                      <div style={{ height: "100%", width: `${value}%`, borderRadius: 99, background: String(color) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="crm-two" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
              <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)" }}>
                <div className="crm-vis-head" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr .8fr .8fr", gap: 12, padding: "14px 18px", background: "rgba(255,255,255,.04)", borderBottom: "1px solid rgba(255,255,255,.08)", fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.38)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  <span>Country</span><span>Top City</span><span>Visits</span><span>Unique</span>
                </div>
                {loading ? (
                  <div style={{ padding: 34, textAlign: "center", color: "rgba(255,255,255,.3)" }}>Loading visitors...</div>
                ) : visitorRows.length === 0 ? (
                  <div style={{ padding: 34, textAlign: "center", color: "rgba(255,255,255,.3)" }}>No visitor data yet.</div>
                ) : visitorRows.map((row, index) => (
                  <div key={`${row.country}-${index}`} className="crm-vis-row" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr .8fr .8fr", gap: 12, padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,.05)", background: index % 2 === 1 ? "rgba(255,255,255,.012)" : "transparent" }}>
                    <span style={{ color: "white", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 17 }}>{row.flag}</span>{row.countryName}</span>
                    <span style={{ color: "rgba(255,255,255,.46)", fontSize: 12 }}>{row.topCity || "—"}</span>
                    <span style={{ color: "#818cf8", fontSize: 13, fontWeight: 800 }}>{row.visitors}</span>
                    <span style={{ color: "#34d399", fontSize: 13, fontWeight: 800 }}>{row.uniqueVisitors}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderRadius: 16, padding: "16px 18px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,.42)", marginBottom: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>Top Pages</div>
                {(visitorStats?.topPages || []).slice(0, 8).map((page) => (
                  <div key={page.page} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,.56)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>{page.page}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#818cf8" }}>{page.visits}</span>
                  </div>
                ))}
                {!(visitorStats?.topPages || []).length ? <div style={{ color: "rgba(255,255,255,.3)", fontSize: 12 }}>Top pages will appear after traffic starts coming in.</div> : null}
              </div>
            </div>
          </>
        ) : null}

        {tab === "leads" ? (
          <>
            <div className="crm-two" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 18 }}>
              {[
                ["Total Leads", leadSummary.total, "#818cf8"],
                ["High Priority", leadSummary.high, "#f87171"],
                ["Converted", leadSummary.converted, "#34d399"],
                ["Follow Ups", leadSummary.followUps, "#fbbf24"],
              ].map(([label, value, color]) => (
                <div key={String(label)} style={{ borderRadius: 16, padding: "16px 18px", background: "rgba(255,255,255,.04)", border: `1px solid ${color}22` }}>
                  <div style={{ fontSize: 25, fontWeight: 900, color }}>{value}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)", marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, company, phone" style={{ flex: 1, minWidth: 220, padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white" }} />
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white" }}>
                <option value="all">All Status</option>
                {STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(330px,1fr))", gap: 14 }}>
              {leads.map((lead) => (
                <div key={lead.id} style={{ borderRadius: 16, padding: "16px 18px", background: "rgba(255,255,255,.04)", border: `1px solid ${STATUS_BG[lead.status] || "rgba(255,255,255,.08)"}`, borderLeft: `3px solid ${STATUS_COLORS[lead.status] || "#818cf8"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "white" }}>{lead.name}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.52)", marginTop: 3 }}>{lead.email}</div>
                      {lead.company ? <div style={{ fontSize: 11, color: "rgba(255,255,255,.34)", marginTop: 4 }}>Company: {lead.company}</div> : null}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: STATUS_BG[lead.status], color: STATUS_COLORS[lead.status], textTransform: "uppercase" }}>{lead.status}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: PRIORITY_COLORS[lead.priority] || "#fbbf24" }}>{lead.priority}</span>
                    </div>
                  </div>
                  {lead.message ? <div style={{ fontSize: 12, lineHeight: 1.6, color: "rgba(255,255,255,.45)", background: "rgba(255,255,255,.03)", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>{lead.message}</div> : null}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {lead.source ? <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 8, background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.45)" }}>{lead.source}</span> : null}
                    {lead.country ? <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 8, background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.45)" }}>{lead.country}</span> : null}
                    {lead.assignedTo ? <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 8, background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.45)" }}>Assigned: {lead.assignedTo}</span> : null}
                    {lead.followUpAt ? <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 8, background: "rgba(251,191,36,.08)", color: "#fbbf24" }}>Follow up: {fmtDate(lead.followUpAt)}</span> : null}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {STATUSES.map((item) => (
                      <button key={item} type="button" onClick={() => patchLead(lead.id, { status: item })} style={{ fontSize: 10, fontWeight: lead.status === item ? 800 : 600, padding: "4px 8px", borderRadius: 8, border: "none", cursor: "pointer", background: lead.status === item ? STATUS_BG[item] : "rgba(255,255,255,.05)", color: lead.status === item ? STATUS_COLORS[item] : "rgba(255,255,255,.34)", textTransform: "capitalize" }}>
                        {item}
                      </button>
                    ))}
                  </div>
                  <textarea defaultValue={lead.notes || ""} placeholder="Notes..." onBlur={(e) => patchLead(lead.id, { notes: e.currentTarget.value })} style={{ width: "100%", minHeight: 70, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white", resize: "vertical", marginBottom: 10 }} />
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>{fmtDate(lead.createdAt)}</span>
                    <button type="button" onClick={() => removeLead(lead.id)} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(248,113,113,.25)", background: "rgba(248,113,113,.08)", color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {!loading && leads.length === 0 ? <div style={{ gridColumn: "1/-1", padding: 48, textAlign: "center", color: "rgba(255,255,255,.3)" }}>No leads found for this filter.</div> : null}
            </div>
          </>
        ) : null}

        {tab === "pipeline" ? (
          <div className="crm-pipeline" style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(190px,1fr))", gap: 12, alignItems: "start" }}>
            {STATUSES.map((item) => (
              <div key={item} style={{ minWidth: 190 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 10, background: STATUS_BG[item], marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: STATUS_COLORS[item], textTransform: "uppercase" }}>{item}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: STATUS_COLORS[item] }}>{pipeline[item].length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {pipeline[item].map((lead) => (
                    <div key={lead.id} onClick={() => { setTab("leads"); setSearch(lead.email); }} style={{ borderRadius: 12, padding: "10px 12px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", cursor: "pointer" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "white" }}>{lead.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.42)", marginTop: 2 }}>{lead.company || lead.email}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
                        <span style={{ fontSize: 10, color: PRIORITY_COLORS[lead.priority] || "#fbbf24", fontWeight: 800 }}>{lead.priority}</span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,.28)" }}>{lead.source || "lead"}</span>
                      </div>
                    </div>
                  ))}
                  {!pipeline[item].length ? <div style={{ textAlign: "center", padding: "16px 0", fontSize: 11, color: "rgba(255,255,255,.22)" }}>Empty</div> : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {showForm ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 1000 }}>
          <div style={{ width: "100%", maxWidth: 520, borderRadius: 20, background: "#0e1132", border: "1px solid rgba(255,255,255,.1)", padding: "28px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Add Lead</h2>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.45)", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            <form onSubmit={createLead} style={{ display: "grid", gap: 12 }}>
              {[
                ["name", "Name *", "Full name"],
                ["email", "Email *", "lead@company.com"],
                ["phone", "Phone", "+92 ..."],
                ["company", "Company", "Company name"],
                ["assignedTo", "Assigned To", "Owner or rep"],
                ["country", "Country", "Country"],
              ].map(([key, label, placeholder]) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: "rgba(255,255,255,.42)", fontWeight: 700, display: "block", marginBottom: 5 }}>{label}</label>
                  <input value={(form as any)[key]} onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))} placeholder={placeholder} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white" }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, color: "rgba(255,255,255,.42)", fontWeight: 700, display: "block", marginBottom: 5 }}>Message</label>
                <textarea value={form.message} onChange={(e) => setForm((current) => ({ ...current, message: e.target.value }))} rows={3} placeholder="What they need" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white", resize: "vertical" }} />
              </div>
              <div className="crm-two" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: "rgba(255,255,255,.42)", fontWeight: 700, display: "block", marginBottom: 5 }}>Source</label>
                  <select value={form.source} onChange={(e) => setForm((current) => ({ ...current, source: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white" }}>
                    {["manual", "contact-form", "demo-request", "visitor", "newsletter", "referral", "linkedin", "cold-call"].map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "rgba(255,255,255,.42)", fontWeight: 700, display: "block", marginBottom: 5 }}>Priority</label>
                  <select value={form.priority} onChange={(e) => setForm((current) => ({ ...current, priority: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white" }}>
                    {["low", "medium", "high"].map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "rgba(255,255,255,.42)", fontWeight: 700, display: "block", marginBottom: 5 }}>Follow Up Date</label>
                <input type="date" value={form.followUpAt} onChange={(e) => setForm((current) => ({ ...current, followUpAt: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white" }} />
              </div>
              <button type="submit" disabled={saving || !form.name.trim() || !form.email.trim()} style={{ padding: "11px 14px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer", opacity: saving || !form.name.trim() || !form.email.trim() ? 0.55 : 1 }}>
                {saving ? "Saving..." : "Create Lead"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
