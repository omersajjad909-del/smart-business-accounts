"use client";

import toast from "react-hot-toast";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,.03)";
const border = "rgba(255,255,255,.07)";

const typeColor: Record<string,string> = { individual:"#6366f1", corporate:"#3b82f6", government:"#22c55e", foreign:"#f59e0b" };
const freqLabel: Record<string,string> = { one_time:"One-Time", monthly:"Monthly", annual:"Annual" };

const getTier = (total: number) => {
  if(total >= 5000000) return { label:"Platinum", color:"#e5e7eb" };
  if(total >= 1000000) return { label:"Gold", color:"#f59e0b" };
  if(total >= 300000) return { label:"Silver", color:"#94a3b8" };
  return { label:"Bronze", color:"#b45309" };
};

export default function DonorsPage() {
  const { records, loading, create } = useBusinessRecords("donor");
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [form, setForm] = useState({ donorId:"", name:"", phone:"", email:"", type:"individual", frequency:"monthly", category:"" });

  const donors = records.map(r => ({
    id: r.id,
    donorId: (r.data?.donorId as string) || r.id,
    name: r.title,
    phone: (r.data?.phone as string) || "",
    email: (r.data?.email as string) || "",
    type: (r.data?.type as string) || "individual",
    totalDonated: r.amount || Number(r.data?.totalDonated) || 0,
    lastDonation: Number(r.data?.lastDonation) || 0,
    frequency: (r.data?.frequency as string) || "monthly",
    status: r.status || "active",
    category: (r.data?.category as string) || "",
  }));

  const filtered = filterType==="all" ? donors : donors.filter(d=>d.type===filterType);
  const topDonor = donors.length > 0 ? [...donors].sort((a,b)=>b.totalDonated-a.totalDonated)[0] : null;
  const thisMonthDonations = donors.filter(d=>d.status==="active").reduce((s,d)=>d.frequency==="monthly"?s+d.lastDonation:s,0);

  const addDonor = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error("Donor name required hai.");
      return;
    }
    if (donors.some(d => d.name.trim().toLowerCase() === name.toLowerCase() || (form.email && d.email.trim().toLowerCase() === form.email.trim().toLowerCase()))) {
      toast.error("Is donor ka record already maujood hai.");
      return;
    }
    await create({ title: form.name, status: "active", data: { donorId: form.donorId || `DON-${String(records.length + 1).padStart(3, '0')}`, phone: form.phone, email: form.email, type: form.type, totalDonated: 0, lastDonation: 0, frequency: form.frequency, category: form.category } });
    setShowModal(false);
    setForm({ donorId:"", name:"", phone:"", email:"", type:"individual", frequency:"monthly", category:"" });
  };

  const card = { background:bg, border:`1px solid ${border}`, borderRadius:12, padding:20 };
  const inp = { background:"rgba(255,255,255,.05)", border:`1px solid ${border}`, borderRadius:8, padding:"10px 14px", color:"#fff", fontFamily:ff, width:"100%", boxSizing:"border-box" as const, fontSize:14 };
  const btn = (c:string) => ({ background:c, border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontFamily:ff, cursor:"pointer", fontSize:14, fontWeight:600 });

  return (
    <div style={{ fontFamily:ff, color:"#fff", padding:24, minHeight:"100vh", background:"#0f0f0f" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:700 }}>Donor Management</h1>
          <p style={{ margin:"4px 0 0", color:"rgba(255,255,255,.5)", fontSize:14 }}>Manage donor relationships & contributions</p>
        </div>
        <button onClick={()=>setShowModal(true)} style={btn("#6366f1")}>+ Add Donor</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
        {[
          { label:"Total Donors", value:donors.length, color:"#6366f1" },
          { label:"Active Donors", value:donors.filter(d=>d.status==="active").length, color:"#22c55e" },
          { label:"This Month (Rs.)", value:`${(thisMonthDonations/1000).toFixed(0)}K`, color:"#3b82f6" },
          { label:"Top Donor", value:topDonor ? topDonor.name.split(" ")[0] : "—", color:"#f59e0b" },
        ].map(s=>(
          <div key={s.label} style={{ ...card, textAlign:"center" }}>
            <div style={{ fontSize:24, fontWeight:700, color:s.color }}>{s.value}</div>
            <div style={{ color:"rgba(255,255,255,.5)", fontSize:13, marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {["all","individual","corporate","government","foreign"].map(t=>(
          <button key={t} onClick={()=>setFilterType(t)} style={{ ...btn(filterType===t?"#6366f1":"rgba(255,255,255,.07)"), padding:"8px 16px", textTransform:"capitalize" }}>{t==="all"?"All":t}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign:"center", padding:40, color:"rgba(255,255,255,.4)" }}>Loading...</div>}

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {!loading && filtered.length === 0 && <div style={{ ...card, textAlign:"center", padding:40, color:"rgba(255,255,255,.25)" }}>No donors found.</div>}
        {filtered.map(d=>{
          const tier = getTier(d.totalDonated);
          return (
            <div key={d.id} style={{ ...card, display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:`${typeColor[d.type] || "#6366f1"}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0, color:typeColor[d.type] || "#6366f1" }}>
                {d.type==="individual"?"👤":d.type==="corporate"?"🏢":d.type==="government"?"🏛️":"🌐"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                  <span style={{ fontWeight:700 }}>{d.name}</span>
                  <span style={{ background:(typeColor[d.type]||"#6366f1")+"22", color:typeColor[d.type]||"#6366f1", border:`1px solid ${typeColor[d.type]||"#6366f1"}44`, borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:600, textTransform:"capitalize" }}>{d.type}</span>
                  <span style={{ background:"rgba(255,255,255,.07)", borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:700, color:tier.color }}>🏆 {tier.label}</span>
                  {d.status==="inactive" && <span style={{ background:"rgba(107,114,128,.2)", color:"#6b7280", borderRadius:20, padding:"2px 8px", fontSize:11 }}>Inactive</span>}
                </div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.5)" }}>{d.donorId} · {d.phone} · {d.email}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:2 }}>📂 {d.category} · {freqLabel[d.frequency] || d.frequency}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:16, fontWeight:700, color:"#22c55e" }}>Rs. {d.totalDonated.toLocaleString()}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>Total donated</div>
                <div style={{ fontSize:13, color:"#60a5fa", marginTop:2 }}>Last: Rs. {d.lastDonation.toLocaleString()}</div>
              </div>
              <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                <button style={{ ...btn("rgba(255,255,255,.07)"), padding:"7px 14px", fontSize:12 }}>History</button>
                <button style={{ ...btn("rgba(99,102,241,.2)"), padding:"7px 14px", fontSize:12, color:"#818cf8" }}>Receipt</button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ background:"#1a1a2e", border:`1px solid ${border}`, borderRadius:16, padding:28, width:500 }}>
            <h2 style={{ margin:"0 0 20px", fontSize:18 }}>Add Donor</h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[["Donor ID","donorId"],["Full Name","name"],["Phone","phone"],["Email","email"],["Category","category"]].map(([lbl,key])=>(
                <div key={key}>
                  <label style={{ fontSize:12, color:"rgba(255,255,255,.5)", display:"block", marginBottom:4 }}>{lbl}</label>
                  <input value={(form as Record<string,string>)[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} style={inp} />
                </div>
              ))}
              <div>
                <label style={{ fontSize:12, color:"rgba(255,255,255,.5)", display:"block", marginBottom:4 }}>Type</label>
                <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={inp}>
                  {["individual","corporate","government","foreign"].map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:12, color:"rgba(255,255,255,.5)", display:"block", marginBottom:4 }}>Frequency</label>
                <select value={form.frequency} onChange={e=>setForm(p=>({...p,frequency:e.target.value}))} style={inp}>
                  {["one_time","monthly","annual"].map(f=><option key={f} value={f}>{freqLabel[f]}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:"flex", gap:12, marginTop:20 }}>
              <button onClick={addDonor} style={{ background:"#6366f1", border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontFamily:ff, cursor:"pointer", fontSize:14, fontWeight:600, flex:1 }}>Add Donor</button>
              <button onClick={()=>setShowModal(false)} style={{ background:"rgba(255,255,255,.07)", border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontFamily:ff, cursor:"pointer", fontSize:14, fontWeight:600, flex:1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
