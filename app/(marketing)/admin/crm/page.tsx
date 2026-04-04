"use client";
import { useEffect, useState, useCallback } from "react";

type Lead = {
  id: string; name: string; email: string; phone?: string; company?: string;
  message?: string; source?: string; status: string; priority: string;
  notes?: string; followUpAt?: string; assignedTo?: string; country?: string;
  createdAt: string; updatedAt: string;
};

type VisitorRow = {
  country: string; countryName: string; flag: string; topCity: string;
  visitors: number; uniqueVisitors: number;
};

type VisitorStats = {
  totalVisits: number; uniqueVisitors: number; countries: number; cities: number;
  deviceBreakdown: { mobile: number; desktop: number; tablet: number };
  topPages: { page: string; visits: number }[];
};

const STATUS_COLORS: Record<string, string> = {
  new:       "rgba(99,102,241,.2)",
  contacted: "rgba(251,191,36,.2)",
  demo:      "rgba(6,182,212,.2)",
  proposal:  "rgba(167,139,250,.2)",
  converted: "rgba(52,211,153,.2)",
  lost:      "rgba(248,113,113,.2)",
};
const STATUS_TEXT: Record<string, string> = {
  new:"#a5b4fc", contacted:"#fbbf24", demo:"#22d3ee",
  proposal:"#c4b5fd", converted:"#34d399", lost:"#f87171",
};
const STATUS_LABELS = ["new","contacted","demo","proposal","converted","lost"];
const PRIORITY_COLOR: Record<string, string> = { low:"#6ee7b7", medium:"#fbbf24", high:"#f87171" };

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

function LeadCard({ lead, onUpdate, onDelete }: { lead: Lead; onUpdate: (id:string, data:any)=>void; onDelete:(id:string)=>void }) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes]         = useState(lead.notes || "");
  const [saving, setSaving]       = useState(false);

  async function saveNotes() {
    setSaving(true);
    await onUpdate(lead.id, { notes });
    setSaving(false);
    setShowNotes(false);
  }

  return (
    <div style={{
      borderRadius:14, padding:"16px 18px",
      background:"rgba(255,255,255,.04)",
      border:`1px solid ${STATUS_COLORS[lead.status] || "rgba(255,255,255,.08)"}`,
      borderLeft:`3px solid ${STATUS_TEXT[lead.status] || "#818cf8"}`,
    }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8, marginBottom:10 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:"white" }}>{lead.name}</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.45)", marginTop:2 }}>{lead.email}</div>
          {lead.company && <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:1 }}>🏢 {lead.company}</div>}
          {lead.phone   && <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:1 }}>📞 {lead.phone}</div>}
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5, flexShrink:0 }}>
          <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:6, background:STATUS_COLORS[lead.status], color:STATUS_TEXT[lead.status], textTransform:"uppercase" }}>
            {lead.status}
          </span>
          <span style={{ fontSize:10, fontWeight:600, color:PRIORITY_COLOR[lead.priority] || "#fbbf24" }}>
            ● {lead.priority}
          </span>
        </div>
      </div>

      {lead.message && (
        <div style={{ fontSize:12, color:"rgba(255,255,255,.38)", lineHeight:1.5, marginBottom:10, padding:"8px 10px", borderRadius:8, background:"rgba(255,255,255,.03)" }}>
          {lead.message.slice(0,120)}{lead.message.length>120?"…":""}
        </div>
      )}

      <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
        {lead.source  && <span style={{ fontSize:10, padding:"2px 7px", borderRadius:5, background:"rgba(255,255,255,.06)", color:"rgba(255,255,255,.45)" }}>📌 {lead.source}</span>}
        {lead.country && <span style={{ fontSize:10, padding:"2px 7px", borderRadius:5, background:"rgba(255,255,255,.06)", color:"rgba(255,255,255,.45)" }}>🌍 {lead.country}</span>}
        <span style={{ fontSize:10, padding:"2px 7px", borderRadius:5, background:"rgba(255,255,255,.06)", color:"rgba(255,255,255,.35)" }}>
          {fmtDate(lead.createdAt)}
        </span>
      </div>

      {/* Status changer */}
      <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:8 }}>
        {STATUS_LABELS.map(s => (
          <button key={s} type="button" onClick={() => onUpdate(lead.id, { status: s })}
            style={{ fontSize:10, padding:"2px 8px", borderRadius:5, border:"none", cursor:"pointer", fontFamily:"inherit",
              background: lead.status===s ? STATUS_COLORS[s] : "rgba(255,255,255,.05)",
              color: lead.status===s ? STATUS_TEXT[s] : "rgba(255,255,255,.3)",
              fontWeight: lead.status===s ? 700 : 500,
            }}>
            {s}
          </button>
        ))}
      </div>

      {/* Notes */}
      {showNotes ? (
        <div style={{ marginTop:8 }}>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
            placeholder="Add notes..."
            style={{ width:"100%", padding:"8px 10px", borderRadius:8, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:12, fontFamily:"inherit", resize:"vertical", outline:"none" }}/>
          <div style={{ display:"flex", gap:6, marginTop:6 }}>
            <button type="button" onClick={saveNotes} style={{ fontSize:11, padding:"5px 12px", borderRadius:7, background:"rgba(99,102,241,.3)", border:"none", color:"white", cursor:"pointer", fontFamily:"inherit" }}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={()=>setShowNotes(false)} style={{ fontSize:11, padding:"5px 10px", borderRadius:7, background:"transparent", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.4)", cursor:"pointer", fontFamily:"inherit" }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", gap:6, marginTop:4 }}>
          <button type="button" onClick={()=>setShowNotes(true)}
            style={{ fontSize:11, padding:"4px 10px", borderRadius:7, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.08)", color:"rgba(255,255,255,.45)", cursor:"pointer", fontFamily:"inherit" }}>
            {lead.notes ? "📝 Notes" : "+ Note"}
          </button>
          <button type="button" onClick={()=>onDelete(lead.id)}
            style={{ fontSize:11, padding:"4px 10px", borderRadius:7, background:"rgba(248,113,113,.08)", border:"1px solid rgba(248,113,113,.18)", color:"#f87171", cursor:"pointer", fontFamily:"inherit" }}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function CrmPage() {
  const [tab,  setTab]  = useState<"visitors"|"leads"|"pipeline">("visitors");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [visitorRows,  setVisitorRows]  = useState<VisitorRow[]>([]);
  const [visitorStats, setVisitorStats] = useState<VisitorStats | null>(null);
  const [topPages, setTopPages] = useState<{page:string;visits:number}[]>([]);
  const [range, setRange] = useState("7d");
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  // New lead form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:"", email:"", phone:"", company:"", message:"", source:"manual", priority:"medium" });
  const [formSaving, setFormSaving] = useState(false);

  const loadVisitors = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/visitors?range=${range}`, { headers: { "x-user-role":"ADMIN" } });
      if (r.ok) {
        const d = await r.json();
        setVisitorRows(d.rows || []);
        setVisitorStats(d.stats || null);
        setTopPages(d.stats?.topPages || []);
      }
    } finally { setLoading(false); }
  }, [range]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/leads", { headers: { "x-user-role":"ADMIN" } });
      if (r.ok) { const d = await r.json(); setLeads(d.leads || []); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadVisitors(); }, [loadVisitors]);
  useEffect(() => { loadLeads(); }, [loadLeads]);

  async function updateLead(id: string, data: any) {
    const r = await fetch("/api/admin/leads", { method:"PATCH", headers:{"Content-Type":"application/json","x-user-role":"ADMIN"}, body: JSON.stringify({ id, ...data }) });
    if (r.ok) setLeads(prev => prev.map(l => l.id===id ? { ...l, ...data } : l));
  }

  async function deleteLead(id: string) {
    if (!confirm("Delete this lead?")) return;
    const r = await fetch(`/api/admin/leads?id=${id}`, { method:"DELETE", headers:{"x-user-role":"ADMIN"} });
    if (r.ok) setLeads(prev => prev.filter(l => l.id !== id));
  }

  async function createLead(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setFormSaving(true);
    try {
      const r = await fetch("/api/admin/leads", { method:"POST", headers:{"Content-Type":"application/json","x-user-role":"ADMIN"}, body: JSON.stringify(form) });
      if (r.ok) { const d = await r.json(); setLeads(prev => [d.lead, ...prev]); setShowForm(false); setForm({ name:"",email:"",phone:"",company:"",message:"",source:"manual",priority:"medium" }); }
    } finally { setFormSaving(false); }
  }

  const filteredLeads = leads.filter(l => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!l.name.toLowerCase().includes(s) && !l.email.toLowerCase().includes(s) && !(l.company||"").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  // Pipeline grouped by status
  const pipeline = STATUS_LABELS.reduce((acc, s) => {
    acc[s] = leads.filter(l => l.status === s);
    return acc;
  }, {} as Record<string, Lead[]>);

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#080c1e,#0c0f2e)", color:"white", fontFamily:"'Outfit',sans-serif", padding:"32px 24px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap'); *,*::before,*::after{box-sizing:border-box;}`}</style>

      {/* Header */}
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:800, color:"white", letterSpacing:"-.5px", margin:0 }}>Visitor CRM</h1>
            <p style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginTop:4 }}>Track website visitors · Manage leads · Close deals</p>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {tab==="visitors" && (
              <select value={range} onChange={e=>{setRange(e.target.value);}} style={{ padding:"7px 12px", borderRadius:9, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:12, fontFamily:"inherit", cursor:"pointer" }}>
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            )}
            {(tab==="leads"||tab==="pipeline") && (
              <button type="button" onClick={()=>setShowForm(true)} style={{ padding:"8px 16px", borderRadius:9, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", border:"none", color:"white", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                + Add Lead
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:4, marginBottom:24, background:"rgba(255,255,255,.04)", borderRadius:12, padding:4, width:"fit-content" }}>
          {([["visitors","👥 Visitors"],["leads","📋 Leads"],["pipeline","📊 Pipeline"]] as const).map(([t,l]) => (
            <button key={t} type="button" onClick={()=>setTab(t)} style={{ padding:"8px 20px", borderRadius:9, border:"none", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit",
              background: tab===t ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "transparent",
              color: tab===t ? "white" : "rgba(255,255,255,.4)",
              boxShadow: tab===t ? "0 4px 12px rgba(99,102,241,.4)" : "none",
            }}>{l}</button>
          ))}
        </div>

        {/* ── VISITORS TAB ── */}
        {tab==="visitors" && (
          <>
            {/* Stats row */}
            {visitorStats && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:24 }}>
                {[
                  { label:"Total Visits",    val:visitorStats.totalVisits,    color:"#818cf8" },
                  { label:"Unique Visitors", val:visitorStats.uniqueVisitors, color:"#34d399" },
                  { label:"Countries",       val:visitorStats.countries,      color:"#fbbf24" },
                  { label:"Cities",          val:visitorStats.cities,         color:"#06b6d4" },
                ].map(s => (
                  <div key={s.label} style={{ borderRadius:14, padding:"16px 18px", background:"rgba(255,255,255,.04)", border:`1px solid ${s.color}25` }}>
                    <div style={{ fontSize:24, fontWeight:900, color:s.color }}>{loading ? "…" : s.val.toLocaleString()}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", marginTop:4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Device breakdown + top pages */}
            {visitorStats && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
                <div style={{ borderRadius:14, padding:"16px 18px", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.4)", marginBottom:14, textTransform:"uppercase", letterSpacing:".07em" }}>Device Split</div>
                  {[
                    { k:"desktop", label:"Desktop", color:"#818cf8", val:visitorStats.deviceBreakdown.desktop },
                    { k:"mobile",  label:"Mobile",  color:"#34d399", val:visitorStats.deviceBreakdown.mobile  },
                    { k:"tablet",  label:"Tablet",  color:"#fbbf24", val:visitorStats.deviceBreakdown.tablet  },
                  ].map(d => (
                    <div key={d.k} style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                        <span style={{ color:"rgba(255,255,255,.6)" }}>{d.label}</span>
                        <span style={{ color:d.color, fontWeight:700 }}>{d.val}%</span>
                      </div>
                      <div style={{ height:5, borderRadius:3, background:"rgba(255,255,255,.07)" }}>
                        <div style={{ height:"100%", borderRadius:3, background:d.color, width:`${d.val}%`, transition:"width .6s ease" }}/>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ borderRadius:14, padding:"16px 18px", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.4)", marginBottom:14, textTransform:"uppercase", letterSpacing:".07em" }}>Top Pages</div>
                  {topPages.slice(0,6).map((p,i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                      <span style={{ fontSize:12, color:"rgba(255,255,255,.55)", maxWidth:"70%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.page}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:"#818cf8" }}>{p.visits}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Country table */}
            <div style={{ borderRadius:16, overflow:"hidden", border:"1px solid rgba(255,255,255,.07)" }}>
              <div style={{ padding:"14px 18px", background:"rgba(255,255,255,.04)", borderBottom:"1px solid rgba(255,255,255,.07)", display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:12, fontSize:11, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".07em" }}>
                <span>Country</span><span>City</span><span>Visits</span><span>Unique</span>
              </div>
              {loading ? (
                <div style={{ padding:32, textAlign:"center", color:"rgba(255,255,255,.3)", fontSize:13 }}>Loading…</div>
              ) : visitorRows.length === 0 ? (
                <div style={{ padding:32, textAlign:"center", color:"rgba(255,255,255,.3)", fontSize:13 }}>No visitor data yet. Tracking starts on the next page view.</div>
              ) : visitorRows.map((r, i) => (
                <div key={i} style={{ padding:"12px 18px", display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:12, borderBottom:"1px solid rgba(255,255,255,.04)", background: i%2===0 ? "transparent" : "rgba(255,255,255,.01)" }}>
                  <span style={{ fontSize:13, color:"white", display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:18 }}>{r.flag}</span> {r.countryName}
                  </span>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,.45)" }}>{r.topCity || "—"}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#818cf8" }}>{r.visitors}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#34d399" }}>{r.uniqueVisitors}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── LEADS TAB ── */}
        {tab==="leads" && (
          <>
            {/* Filters */}
            <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, company…"
                style={{ flex:1, minWidth:200, padding:"8px 12px", borderRadius:9, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:12, fontFamily:"inherit", outline:"none" }}/>
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ padding:"8px 12px", borderRadius:9, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:12, fontFamily:"inherit", cursor:"pointer" }}>
                <option value="all">All Status</option>
                {STATUS_LABELS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <span style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>{filteredLeads.length} lead{filteredLeads.length!==1?"s":""}</span>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:14 }}>
              {filteredLeads.map(lead => (
                <LeadCard key={lead.id} lead={lead} onUpdate={updateLead} onDelete={deleteLead} />
              ))}
              {filteredLeads.length === 0 && (
                <div style={{ gridColumn:"1/-1", textAlign:"center", padding:48, color:"rgba(255,255,255,.25)", fontSize:14 }}>
                  No leads found.
                </div>
              )}
            </div>
          </>
        )}

        {/* ── PIPELINE TAB ── */}
        {tab==="pipeline" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:12, alignItems:"start", overflowX:"auto" }}>
            {STATUS_LABELS.map(s => (
              <div key={s} style={{ minWidth:180 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, padding:"6px 10px", borderRadius:8, background:STATUS_COLORS[s] }}>
                  <span style={{ fontSize:11, fontWeight:800, color:STATUS_TEXT[s], textTransform:"uppercase", letterSpacing:".07em" }}>{s}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:STATUS_TEXT[s], background:"rgba(0,0,0,.2)", borderRadius:10, padding:"1px 7px" }}>{pipeline[s].length}</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {pipeline[s].map(lead => (
                    <div key={lead.id} style={{ borderRadius:10, padding:"10px 12px", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", cursor:"pointer" }}
                      onClick={()=>{ setTab("leads"); setSearch(lead.email); }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"white", marginBottom:2 }}>{lead.name}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>{lead.company || lead.email}</div>
                      {lead.source && <div style={{ fontSize:10, color:"rgba(255,255,255,.25)", marginTop:4 }}>📌 {lead.source}</div>}
                    </div>
                  ))}
                  {pipeline[s].length === 0 && (
                    <div style={{ textAlign:"center", padding:"16px 0", fontSize:11, color:"rgba(255,255,255,.2)" }}>Empty</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", backdropFilter:"blur(6px)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ width:"100%", maxWidth:460, borderRadius:20, background:"#0e1132", border:"1px solid rgba(255,255,255,.1)", padding:"28px 28px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:16, fontWeight:800, color:"white", margin:0 }}>Add New Lead</h2>
              <button type="button" onClick={()=>setShowForm(false)} style={{ background:"none", border:"none", color:"rgba(255,255,255,.4)", fontSize:20, cursor:"pointer" }}>×</button>
            </div>
            <form onSubmit={createLead} style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                { k:"name",    label:"Name *",    placeholder:"Full name"    },
                { k:"email",   label:"Email *",   placeholder:"email@co.com" },
                { k:"phone",   label:"Phone",     placeholder:"+92 …"        },
                { k:"company", label:"Company",   placeholder:"Company name" },
              ].map(f => (
                <div key={f.k}>
                  <label style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:600, display:"block", marginBottom:5 }}>{f.label}</label>
                  <input value={(form as any)[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.placeholder}
                    style={{ width:"100%", padding:"9px 12px", borderRadius:9, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:13, fontFamily:"inherit", outline:"none" }}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:600, display:"block", marginBottom:5 }}>Message</label>
                <textarea value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} rows={2} placeholder="What they need…"
                  style={{ width:"100%", padding:"9px 12px", borderRadius:9, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:13, fontFamily:"inherit", outline:"none", resize:"vertical" }}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <label style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:600, display:"block", marginBottom:5 }}>Source</label>
                  <select value={form.source} onChange={e=>setForm(p=>({...p,source:e.target.value}))} style={{ width:"100%", padding:"9px 12px", borderRadius:9, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:12, fontFamily:"inherit", cursor:"pointer" }}>
                    {["manual","contact-form","demo-request","visitor","newsletter","referral","linkedin","cold-call"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:600, display:"block", marginBottom:5 }}>Priority</label>
                  <select value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))} style={{ width:"100%", padding:"9px 12px", borderRadius:9, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:12, fontFamily:"inherit", cursor:"pointer" }}>
                    {["low","medium","high"].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={formSaving || !form.name || !form.email}
                style={{ marginTop:4, padding:"11px", borderRadius:10, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity: (!form.name||!form.email) ? .5 : 1 }}>
                {formSaving ? "Saving…" : "Create Lead"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
