import toast from "react-hot-toast";
"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,.03)";
const border = "rgba(255,255,255,.07)";

const statusColor: Record<string,string> = { active:"#22c55e", completed:"#6b7280", pending_report:"#f59e0b", closed:"#6b7280" };
const statusLabel: Record<string,string> = { active:"Active", completed:"Completed", pending_report:"Report Due", closed:"Closed" };

export default function GrantsPage() {
  const { records, loading, create } = useBusinessRecords("grant");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ grantNo:"", title:"", donor:"", amount:"", currency:"PKR", startDate:"", endDate:"", purpose:"", reportDue:"" });

  const grants = records.map(r => ({
    id: r.id,
    grantNo: (r.data?.grantNo as string) || r.id,
    title: r.title,
    donor: (r.data?.donor as string) || "",
    amount: r.amount || Number(r.data?.amount) || 0,
    currency: (r.data?.currency as string) || "PKR",
    startDate: r.date || (r.data?.startDate as string) || "",
    endDate: (r.data?.endDate as string) || "",
    purpose: (r.data?.purpose as string) || "",
    spent: Number(r.data?.spent) || 0,
    status: r.status || "active",
    reportDue: (r.data?.reportDue as string) || undefined,
  }));

  const today = new Date();
  const daysTo = (d: string) => Math.ceil((new Date(d).getTime()-today.getTime())/(1000*60*60*24));
  const totalReceived = grants.reduce((s,g)=>s+g.amount,0);
  const totalSpent = grants.reduce((s,g)=>s+g.spent,0);
  const pendingReports = grants.filter(g=>g.status==="pending_report").length;

  const addGrant = async () => {
    const title = form.title.trim();
    if (!title || !form.donor.trim() || !form.amount) {
      toast.error("Grant title, donor, aur amount required hain.");
      return;
    }
    if (grants.some(g => g.title.trim().toLowerCase() === title.toLowerCase() || (form.grantNo && g.grantNo.trim().toLowerCase() === form.grantNo.trim().toLowerCase()))) {
      toast.error("Ye grant already registered hai.");
      return;
    }
    await create({ title: form.title, status: "active", date: form.startDate, amount: Number(form.amount), data: { grantNo: form.grantNo || `GRT-${String(records.length + 1).padStart(3, '0')}`, donor: form.donor, currency: form.currency, startDate: form.startDate, endDate: form.endDate, purpose: form.purpose, spent: 0, reportDue: form.reportDue || undefined } });
    setShowModal(false);
    setForm({ grantNo:"", title:"", donor:"", amount:"", currency:"PKR", startDate:"", endDate:"", purpose:"", reportDue:"" });
  };

  const card = { background:bg, border:`1px solid ${border}`, borderRadius:12, padding:20 };
  const inp = { background:"rgba(255,255,255,.05)", border:`1px solid ${border}`, borderRadius:8, padding:"10px 14px", color:"#fff", fontFamily:ff, width:"100%", boxSizing:"border-box" as const, fontSize:14 };
  const btn = (c:string) => ({ background:c, border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontFamily:ff, cursor:"pointer", fontSize:14, fontWeight:600 });

  return (
    <div style={{ fontFamily:ff, color:"#fff", padding:24, minHeight:"100vh", background:"#0f0f0f" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:700 }}>Grant Tracking</h1>
          <p style={{ margin:"4px 0 0", color:"rgba(255,255,255,.5)", fontSize:14 }}>Monitor grants, spending & compliance</p>
        </div>
        <button onClick={()=>setShowModal(true)} style={btn("#6366f1")}>+ Add Grant</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
        {[
          { label:"Active Grants", value:grants.filter(g=>g.status==="active").length, color:"#22c55e" },
          { label:"Total Received", value:`Rs. ${(totalReceived/1000000).toFixed(1)}M`, color:"#3b82f6" },
          { label:"Total Spent", value:`Rs. ${(totalSpent/1000000).toFixed(1)}M`, color:"#f59e0b" },
          { label:"Pending Reports", value:pendingReports, color:"#ef4444" },
        ].map(s=>(
          <div key={s.label} style={{ ...card, textAlign:"center" }}>
            <div style={{ fontSize:28, fontWeight:700, color:s.color }}>{s.value}</div>
            <div style={{ color:"rgba(255,255,255,.5)", fontSize:13, marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign:"center", padding:40, color:"rgba(255,255,255,.4)" }}>Loading...</div>}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(400px,1fr))", gap:16 }}>
        {!loading && grants.length === 0 && <div style={{ ...card, textAlign:"center", padding:40, color:"rgba(255,255,255,.25)" }}>No grants found.</div>}
        {grants.map(g=>{
          const utilPct = g.amount > 0 ? Math.min((g.spent/g.amount)*100, 100) : 0;
          const days = g.endDate ? daysTo(g.endDate) : null;
          const reportDays = g.reportDue ? daysTo(g.reportDue) : null;
          return (
            <div key={g.id} style={{ ...card }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15, marginBottom:3 }}>{g.title}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.5)" }}>{g.grantNo} · {g.donor}</div>
                </div>
                <span style={{ background:`${statusColor[g.status]}22`, color:statusColor[g.status], border:`1px solid ${statusColor[g.status]}44`, borderRadius:20, padding:"3px 10px", fontSize:12, fontWeight:600, flexShrink:0 }}>{statusLabel[g.status]}</span>
              </div>

              <div style={{ fontSize:13, color:"rgba(255,255,255,.6)", marginBottom:10 }}>📂 {g.purpose}</div>

              {/* Budget Utilization */}
              <div style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                  <span style={{ color:"rgba(255,255,255,.5)" }}>Spent: Rs. {g.spent.toLocaleString()}</span>
                  <span style={{ fontWeight:600, color:utilPct>90?"#ef4444":utilPct>70?"#f59e0b":"#22c55e" }}>{utilPct.toFixed(0)}%</span>
                  <span style={{ color:"rgba(255,255,255,.5)" }}>Total: Rs. {g.amount.toLocaleString()}</span>
                </div>
                <div style={{ height:8, background:"rgba(255,255,255,.1)", borderRadius:4, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${utilPct}%`, background:utilPct>90?"#ef4444":utilPct>70?"#f59e0b":"#22c55e", borderRadius:4, transition:"width .3s" }} />
                </div>
              </div>

              <div style={{ display:"flex", gap:12, fontSize:12, color:"rgba(255,255,255,.5)", marginBottom:12 }}>
                <span>📅 {g.startDate} → {g.endDate}</span>
                {days !== null && <span style={{ color:days<30?"#ef4444":days<90?"#f59e0b":"rgba(255,255,255,.5)" }}>{days>0?`${days}d left`:"Ended"}</span>}
              </div>

              {g.reportDue && (
                <div style={{ background:reportDays!<0?"rgba(239,68,68,.1)":reportDays!<14?"rgba(245,158,11,.1)":"rgba(255,255,255,.04)", border:`1px solid ${reportDays!<0?"#ef444440":reportDays!<14?"#f59e0b40":border}`, borderRadius:8, padding:"6px 10px", fontSize:12, marginBottom:12 }}>
                  <span style={{ color:reportDays!<0?"#ef4444":reportDays!<14?"#f59e0b":"rgba(255,255,255,.5)" }}>
                    📋 Report Due: {g.reportDue} {reportDays!<0?"(Overdue)":reportDays!<14?`(${reportDays}d left)`:""}
                  </span>
                </div>
              )}

              <div style={{ display:"flex", gap:8 }}>
                <button style={{ ...btn("rgba(99,102,241,.2)"), flex:1, padding:"8px", fontSize:13, color:"#818cf8" }}>Submit Report</button>
                <button style={{ ...btn("rgba(255,255,255,.07)"), flex:1, padding:"8px", fontSize:13 }}>Add Expense</button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ background:"#1a1a2e", border:`1px solid ${border}`, borderRadius:16, padding:28, width:540, maxHeight:"90vh", overflowY:"auto" }}>
            <h2 style={{ margin:"0 0 20px", fontSize:18 }}>Add Grant</h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[["Grant No","grantNo"],["Donor","donor"],["Amount","amount"],["Currency","currency"],["Start Date","startDate"],["End Date","endDate"],["Report Due","reportDue"]].map(([lbl,key])=>(
                <div key={key}>
                  <label style={{ fontSize:12, color:"rgba(255,255,255,.5)", display:"block", marginBottom:4 }}>{lbl}</label>
                  <input value={(form as Record<string,string>)[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} style={inp} />
                </div>
              ))}
            </div>
            <div style={{ marginTop:12 }}>
              <label style={{ fontSize:12, color:"rgba(255,255,255,.5)", display:"block", marginBottom:4 }}>Grant Title</label>
              <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} style={inp} />
            </div>
            <div style={{ marginTop:12 }}>
              <label style={{ fontSize:12, color:"rgba(255,255,255,.5)", display:"block", marginBottom:4 }}>Purpose</label>
              <textarea value={form.purpose} onChange={e=>setForm(p=>({...p,purpose:e.target.value}))} style={{ ...inp, height:60, resize:"vertical" }} />
            </div>
            <div style={{ display:"flex", gap:12, marginTop:20 }}>
              <button onClick={addGrant} style={{ background:"#6366f1", border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontFamily:ff, cursor:"pointer", fontSize:14, fontWeight:600, flex:1 }}>Add Grant</button>
              <button onClick={()=>setShowModal(false)} style={{ background:"rgba(255,255,255,.07)", border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontFamily:ff, cursor:"pointer", fontSize:14, fontWeight:600, flex:1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
