"use client";

import toast from "react-hot-toast";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,.03)";
const border = "rgba(255,255,255,.07)";

const catColor: Record<string,string> = { orphan:"#6366f1", widow:"#f59e0b", disabled:"#3b82f6", student:"#22c55e", family:"#f97316" };
const catLabel: Record<string,string> = { orphan:"Orphan", widow:"Widow", disabled:"Disabled", student:"Student", family:"Family" };

export default function BeneficiariesPage() {
  const { records, loading, create } = useBusinessRecords("beneficiary");
  const [showModal, setShowModal] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [form, setForm] = useState({ benefId:"", name:"", cnic:"", phone:"", address:"", category:"orphan", assistance:"", monthlyAid:"" });

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const beneficiaries = records.map(r => ({
    id: r.id,
    benefId: (r.data?.benefId as string) || r.id,
    name: r.title,
    cnic: (r.data?.cnic as string) || "",
    phone: (r.data?.phone as string) || "",
    address: (r.data?.address as string) || "",
    category: (r.data?.category as string) || "family",
    assistance: (r.data?.assistance as string[]) || [],
    monthlyAid: r.amount || Number(r.data?.monthlyAid) || 0,
    status: r.status || "active",
    enrollDate: r.date || (r.data?.enrollDate as string) || "",
  }));

  const thisMonthEnrolled = beneficiaries.filter(b=>{ const d=new Date(b.enrollDate); return d.getMonth()===today.getMonth()&&d.getFullYear()===today.getFullYear(); }).length;
  const totalMonthlyAid = beneficiaries.filter(b=>b.status==="active").reduce((s,b)=>s+b.monthlyAid,0);

  const filtered = filterCat==="all" ? beneficiaries : beneficiaries.filter(b=>b.category===filterCat);

  const addBeneficiary = async () => {
    const name = form.name.trim();
    if (!name || !form.cnic.trim() || !form.monthlyAid) {
      toast.error("Beneficiary name, CNIC, aur monthly aid required hain.");
      return;
    }
    if (beneficiaries.some(b => b.cnic.trim() === form.cnic.trim() || b.name.trim().toLowerCase() === name.toLowerCase())) {
      toast.error("Is beneficiary ka record already maujood hai.");
      return;
    }
    await create({ title: form.name, status: "active", date: todayStr, amount: Number(form.monthlyAid), data: { benefId: form.benefId || `BNF-${String(records.length + 1).padStart(3, '0')}`, cnic: form.cnic, phone: form.phone, address: form.address, category: form.category, assistance: form.assistance.split(",").map(s=>s.trim()), monthlyAid: Number(form.monthlyAid), enrollDate: todayStr } });
    setShowModal(false);
    setForm({ benefId:"", name:"", cnic:"", phone:"", address:"", category:"orphan", assistance:"", monthlyAid:"" });
  };

  const card = { background:bg, border:`1px solid ${border}`, borderRadius:12, padding:20 };
  const inp = { background:"rgba(255,255,255,.05)", border:`1px solid ${border}`, borderRadius:8, padding:"10px 14px", color:"#fff", fontFamily:ff, width:"100%", boxSizing:"border-box" as const, fontSize:14 };
  const btn = (c:string) => ({ background:c, border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontFamily:ff, cursor:"pointer", fontSize:14, fontWeight:600 });

  return (
    <div style={{ fontFamily:ff, color:"#fff", padding:24, minHeight:"100vh", background:"#0f0f0f" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:700 }}>Beneficiary Management</h1>
          <p style={{ margin:"4px 0 0", color:"rgba(255,255,255,.5)", fontSize:14 }}>Track aid recipients & monthly disbursements</p>
        </div>
        <button onClick={()=>setShowModal(true)} style={btn("#6366f1")}>+ Add Beneficiary</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
        {[
          { label:"Total Beneficiaries", value:beneficiaries.length, color:"#6366f1" },
          { label:"Active", value:beneficiaries.filter(b=>b.status==="active").length, color:"#22c55e" },
          { label:"Monthly Aid Total", value:`Rs. ${totalMonthlyAid.toLocaleString()}`, color:"#f59e0b" },
          { label:"New This Month", value:thisMonthEnrolled, color:"#3b82f6" },
        ].map(s=>(
          <div key={s.label} style={{ ...card, textAlign:"center" }}>
            <div style={{ fontSize:26, fontWeight:700, color:s.color }}>{s.value}</div>
            <div style={{ color:"rgba(255,255,255,.5)", fontSize:13, marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {["all","orphan","widow","disabled","student","family"].map(c=>(
          <button key={c} onClick={()=>setFilterCat(c)} style={{ ...btn(filterCat===c?"#6366f1":"rgba(255,255,255,.07)"), padding:"8px 16px", textTransform:"capitalize" }}>{c==="all"?"All":catLabel[c]}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign:"center", padding:40, color:"rgba(255,255,255,.4)" }}>Loading...</div>}

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {!loading && filtered.length === 0 && <div style={{ ...card, textAlign:"center", padding:40, color:"rgba(255,255,255,.25)" }}>No beneficiaries found.</div>}
        {filtered.map(b=>(
          <div key={b.id} style={{ ...card }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:`${catColor[b.category]}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                {b.category==="orphan"?"👶":b.category==="widow"?"👩":b.category==="disabled"?"♿":b.category==="student"?"🎓":"👨‍👩‍👧"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                  <span style={{ fontWeight:700 }}>{b.name}</span>
                  <span style={{ background:`${catColor[b.category]}22`, color:catColor[b.category], border:`1px solid ${catColor[b.category]}44`, borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:600 }}>{catLabel[b.category]}</span>
                  {b.status==="inactive" && <span style={{ background:"rgba(107,114,128,.2)", color:"#6b7280", borderRadius:20, padding:"2px 8px", fontSize:11 }}>Inactive</span>}
                </div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", marginBottom:6 }}>
                  {b.benefId} · {b.cnic} · {b.phone}
                </div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginBottom:8 }}>📍 {b.address} · Enrolled: {b.enrollDate}</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {b.assistance.map(a=>(
                    <span key={a} style={{ background:"rgba(255,255,255,.06)", border:`1px solid ${border}`, borderRadius:20, padding:"2px 8px", fontSize:11, color:"rgba(255,255,255,.7)" }}>{a}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:18, fontWeight:700, color:"#22c55e" }}>Rs. {b.monthlyAid.toLocaleString()}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", marginBottom:10 }}>Monthly Aid</div>
                <div style={{ display:"flex", gap:6 }}>
                  <button style={{ ...btn("rgba(255,255,255,.07)"), padding:"7px 12px", fontSize:12 }}>Profile</button>
                  <button style={{ ...btn("rgba(34,197,94,.2)"), padding:"7px 12px", fontSize:12, color:"#22c55e" }}>Disburse</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ background:"#1a1a2e", border:`1px solid ${border}`, borderRadius:16, padding:28, width:540, maxHeight:"90vh", overflowY:"auto" }}>
            <h2 style={{ margin:"0 0 20px", fontSize:18 }}>Add Beneficiary</h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[["Beneficiary ID","benefId"],["Full Name","name"],["CNIC","cnic"],["Phone","phone"],["Monthly Aid (Rs.)","monthlyAid"]].map(([lbl,key])=>(
                <div key={key}>
                  <label style={{ fontSize:12, color:"rgba(255,255,255,.5)", display:"block", marginBottom:4 }}>{lbl}</label>
                  <input value={(form as Record<string,string>)[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} style={inp} />
                </div>
              ))}
              <div>
                <label style={{ fontSize:12, color:"rgba(255,255,255,.5)", display:"block", marginBottom:4 }}>Category</label>
                <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={inp}>
                  {["orphan","widow","disabled","student","family"].map(c=><option key={c} value={c}>{catLabel[c]}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop:12 }}>
              <label style={{ fontSize:12, color:"rgba(255,255,255,.5)", display:"block", marginBottom:4 }}>Address</label>
              <input value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} style={inp} />
            </div>
            <div style={{ marginTop:12 }}>
              <label style={{ fontSize:12, color:"rgba(255,255,255,.5)", display:"block", marginBottom:4 }}>Assistance Types (comma separated)</label>
              <input value={form.assistance} onChange={e=>setForm(p=>({...p,assistance:e.target.value}))} style={inp} placeholder="Monthly Cash Aid, Food Ration, Medical" />
            </div>
            <div style={{ display:"flex", gap:12, marginTop:20 }}>
              <button onClick={addBeneficiary} style={{ background:"#6366f1", border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontFamily:ff, cursor:"pointer", fontSize:14, fontWeight:600, flex:1 }}>Add Beneficiary</button>
              <button onClick={()=>setShowModal(false)} style={{ background:"rgba(255,255,255,.07)", border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontFamily:ff, cursor:"pointer", fontSize:14, fontWeight:600, flex:1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
