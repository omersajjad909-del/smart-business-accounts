"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type T = {
  id: string; name: string; company: string; role: string;
  message: string; rating: number; planUsed: string;
  status: string; featured: boolean; createdAt: string;
};

const EMPTY = { name:"", company:"", role:"", message:"", rating:5, planUsed:"PRO", featured:false };

function getAdminHeaders() {
  try {
    const u = (getCurrentUser() || {}) as any;
    return { "Content-Type":"application/json", "x-user-role": u.role || "ADMIN" };
  } catch { return { "Content-Type":"application/json", "x-user-role":"ADMIN" }; }
}

export default function TestimonialsAdminPage() {
  const [list, setList]         = useState<T[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("ALL");
  const [form, setForm]         = useState<typeof EMPTY>(EMPTY);
  const [editing, setEditing]   = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState("");

  async function load(status?: string) {
    setLoading(true);
    const q = status && status !== "ALL" ? `?status=${status}` : "";
    const res = await fetch(`/api/admin/testimonials${q}`, { headers: getAdminHeaders() });
    const d = await res.json();
    setList(d.testimonials || []);
    setLoading(false);
  }

  useEffect(() => { load(filter); }, [filter]);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 3000); }

  async function save() {
    if (!form.name.trim() || !form.message.trim()) return flash("Name and message required");
    setSaving(true);
    const method = editing ? "PATCH" : "POST";
    const body   = editing ? { id: editing, ...form } : form;
    const res = await fetch("/api/admin/testimonials", { method, headers: getAdminHeaders(), body: JSON.stringify(body) });
    setSaving(false);
    if (res.ok) { flash(editing ? "Updated!" : "Added!"); setShowForm(false); setEditing(null); setForm(EMPTY); load(filter); }
    else { const d = await res.json(); flash(d.error || "Error"); }
  }

  async function action(id: string, act: "PUBLISH" | "REJECT" | "PENDING") {
    await fetch("/api/admin/testimonials", { method:"PATCH", headers: getAdminHeaders(), body: JSON.stringify({ id, action: act }) });
    load(filter);
  }

  async function del(id: string) {
    if (!confirm("Delete this testimonial?")) return;
    await fetch(`/api/admin/testimonials?id=${id}`, { method:"DELETE", headers: getAdminHeaders() });
    load(filter);
  }

  function editT(t: T) {
    setForm({ name:t.name, company:t.company||"", role:t.role||"", message:t.message, rating:t.rating, planUsed:t.planUsed||"PRO", featured:t.featured });
    setEditing(t.id); setShowForm(true);
  }

  const S: Record<string, { bg: string; color: string; label: string }> = {
    PUBLISHED: { bg:"rgba(52,211,153,.12)", color:"#34d399", label:"Published" },
    PENDING:   { bg:"rgba(251,191,36,.12)", color:"#fbbf24", label:"Pending"   },
    REJECTED:  { bg:"rgba(248,113,113,.12)",color:"#f87171", label:"Rejected"  },
  };

  return (
    <div style={{ minHeight:"100vh", background:"#05071a", color:"white", fontFamily:"'Outfit',sans-serif", padding:"32px 28px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap'); *,*::before,*::after{box-sizing:border-box;}`}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>Testimonials</h1>
          <p style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginTop:4 }}>Manage customer reviews shown on the landing page</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setEditing(null); setShowForm(true); }} style={{
          padding:"10px 20px", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer",
          background:"linear-gradient(135deg,#6366f1,#4f46e5)", color:"white", border:"none",
        }}>
          + Add Testimonial
        </button>
      </div>

      {/* Flash */}
      {msg && <div style={{ marginBottom:16, padding:"10px 16px", borderRadius:10, background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.3)", fontSize:13, color:"#a5b4fc" }}>{msg}</div>}

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:24 }}>
        {["ALL","PUBLISHED","PENDING","REJECTED"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:"7px 16px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer",
            background: filter===f ? "rgba(99,102,241,.25)" : "rgba(255,255,255,.05)",
            color: filter===f ? "#a5b4fc" : "rgba(255,255,255,.45)",
            border: `1px solid ${filter===f ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.08)"}`,
          }}>{f}</button>
        ))}
        <span style={{ marginLeft:"auto", fontSize:12, color:"rgba(255,255,255,.3)", alignSelf:"center" }}>{list.length} total</span>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div style={{ marginBottom:24, borderRadius:16, padding:"24px", background:"rgba(255,255,255,.04)", border:"1px solid rgba(99,102,241,.25)" }}>
          <h3 style={{ fontSize:15, fontWeight:700, marginBottom:20 }}>{editing ? "Edit Testimonial" : "Add Testimonial"}</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            {[
              { key:"name",    label:"Name *",     ph:"e.g. John Smith"    },
              { key:"company", label:"Company",     ph:"e.g. Acme Corp"    },
              { key:"role",    label:"Role/Title",  ph:"e.g. CEO"          },
              { key:"planUsed",label:"Plan Used",   ph:"STARTER/PRO/ENT"  },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,.4)", letterSpacing:".06em", display:"block", marginBottom:6 }}>{f.label}</label>
                <input
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.ph}
                  style={{ width:"100%", padding:"9px 12px", borderRadius:9, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:13, outline:"none", fontFamily:"inherit" }}
                />
              </div>
            ))}
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,.4)", letterSpacing:".06em", display:"block", marginBottom:6 }}>Message *</label>
            <textarea
              value={form.message}
              onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
              rows={3}
              placeholder="Customer's testimonial..."
              style={{ width:"100%", padding:"9px 12px", borderRadius:9, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:13, outline:"none", resize:"vertical", fontFamily:"inherit" }}
            />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:24, marginBottom:20 }}>
            {/* Rating */}
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,.4)", letterSpacing:".06em", display:"block", marginBottom:6 }}>RATING</label>
              <div style={{ display:"flex", gap:4 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setForm(p=>({...p,rating:n}))} style={{
                    fontSize:18, cursor:"pointer", background:"none", border:"none", padding:0,
                    opacity: n <= form.rating ? 1 : 0.25, transition:"opacity .15s",
                  }}>⭐</button>
                ))}
              </div>
            </div>
            {/* Featured */}
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,.4)", letterSpacing:".06em", display:"block", marginBottom:6 }}>FEATURED</label>
              <button onClick={() => setForm(p=>({...p,featured:!p.featured}))} style={{
                padding:"6px 16px", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700,
                background: form.featured ? "rgba(251,191,36,.15)" : "rgba(255,255,255,.06)",
                color: form.featured ? "#fbbf24" : "rgba(255,255,255,.4)",
                border: `1px solid ${form.featured ? "rgba(251,191,36,.3)" : "rgba(255,255,255,.1)"}`,
              }}>
                {form.featured ? "⭐ Featured" : "Not Featured"}
              </button>
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={save} disabled={saving} style={{
              padding:"10px 24px", borderRadius:9, fontSize:13, fontWeight:700, cursor:"pointer",
              background:"linear-gradient(135deg,#6366f1,#4f46e5)", color:"white", border:"none",
              opacity: saving ? .6 : 1,
            }}>{saving ? "Saving…" : editing ? "Update" : "Add & Publish"}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY); }} style={{
              padding:"10px 20px", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer",
              background:"rgba(255,255,255,.06)", color:"rgba(255,255,255,.6)", border:"1px solid rgba(255,255,255,.1)",
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:"rgba(255,255,255,.3)", fontSize:14 }}>Loading…</div>
      ) : list.length === 0 ? (
        <div style={{ textAlign:"center", padding:60, color:"rgba(255,255,255,.3)", fontSize:14 }}>No testimonials found.</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {list.map(t => {
            const s = S[t.status] || S.PENDING;
            return (
              <div key={t.id} style={{
                borderRadius:14, padding:"18px 20px",
                background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)",
                display:"flex", gap:16, alignItems:"flex-start",
              }}>
                {/* Avatar */}
                <div style={{
                  width:40, height:40, borderRadius:"50%", flexShrink:0,
                  background:"linear-gradient(135deg,#6366f1,#4f46e5)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:13, fontWeight:800, color:"white",
                }}>
                  {t.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  {/* Top row */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                    <span style={{ fontSize:14, fontWeight:700, color:"white" }}>{t.name}</span>
                    {t.role && <span style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>{t.role}</span>}
                    {t.company && <span style={{ fontSize:12, color:"rgba(255,255,255,.3)" }}>· {t.company}</span>}
                    {t.featured && <span style={{ fontSize:9, fontWeight:700, color:"#fbbf24", padding:"1px 6px", borderRadius:10, background:"rgba(251,191,36,.12)", border:"1px solid rgba(251,191,36,.2)" }}>★ FEATURED</span>}
                  </div>
                  {/* Stars */}
                  <div style={{ display:"flex", gap:1, marginBottom:6 }}>
                    {[1,2,3,4,5].map(i=>(
                      <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill={i<=t.rating?"#fbbf24":"rgba(255,255,255,.1)"}>
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    ))}
                    {t.planUsed && <span style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginLeft:6 }}>{t.planUsed} Plan</span>}
                  </div>
                  {/* Message */}
                  <p style={{ fontSize:13, color:"rgba(255,255,255,.55)", lineHeight:1.65, margin:0 }}>{t.message}</p>
                </div>

                {/* Right: status + actions */}
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:10, flexShrink:0 }}>
                  <div style={{ padding:"4px 10px", borderRadius:20, background:s.bg, border:`1px solid ${s.color}40`, fontSize:11, fontWeight:700, color:s.color }}>
                    {s.label}
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    {t.status !== "PUBLISHED" && (
                      <button onClick={() => action(t.id,"PUBLISH")} style={{ padding:"5px 10px", borderRadius:7, fontSize:11, fontWeight:700, cursor:"pointer", background:"rgba(52,211,153,.12)", color:"#34d399", border:"1px solid rgba(52,211,153,.25)" }}>Publish</button>
                    )}
                    {t.status !== "REJECTED" && (
                      <button onClick={() => action(t.id,"REJECT")} style={{ padding:"5px 10px", borderRadius:7, fontSize:11, fontWeight:700, cursor:"pointer", background:"rgba(248,113,113,.1)", color:"#f87171", border:"1px solid rgba(248,113,113,.2)" }}>Reject</button>
                    )}
                    <button onClick={() => editT(t)} style={{ padding:"5px 10px", borderRadius:7, fontSize:11, fontWeight:700, cursor:"pointer", background:"rgba(99,102,241,.12)", color:"#a5b4fc", border:"1px solid rgba(99,102,241,.25)" }}>Edit</button>
                    <button onClick={() => del(t.id)} style={{ padding:"5px 10px", borderRadius:7, fontSize:11, fontWeight:700, cursor:"pointer", background:"rgba(248,113,113,.08)", color:"#f87171", border:"1px solid rgba(248,113,113,.15)" }}>Del</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
