"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,.03)";
const border = "rgba(255,255,255,.07)";

export default function FundsPage() {
  const { records: fundRecords, loading: fundsLoading } = useBusinessRecords("fund");
  const { records: txRecords, loading: txLoading, create: createTx } = useBusinessRecords("fund_transaction");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ fund:"", type:"receipt", amount:"", description:"", reference:"" });

  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);

  const funds = fundRecords.map(r => ({
    id: r.id,
    name: r.title,
    purpose: (r.data?.purpose as string) || "",
    balance: r.amount || Number(r.data?.balance) || 0,
    totalReceived: Number(r.data?.totalReceived) || 0,
    totalSpent: Number(r.data?.totalSpent) || 0,
    donors: Number(r.data?.donors) || 0,
    status: r.status || "active",
  }));

  const transactions = txRecords.map(r => ({
    id: r.id,
    fund: (r.data?.fund as string) || "",
    type: r.status || "receipt",
    amount: r.amount || 0,
    description: r.title,
    date: r.date || "",
    reference: (r.data?.reference as string) || "",
  }));

  const totalBalance = funds.reduce((s,f)=>s+f.balance,0);
  const thisMo = transactions.filter(t=>t.date.startsWith(thisMonth));
  const receivedThisMonth = thisMo.filter(t=>t.type==="receipt").reduce((s,t)=>s+t.amount,0);
  const spentThisMonth = thisMo.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);

  const addTransaction = async () => {
    if (!form.description.trim() || !form.amount || !form.fund) {
      alert("Fund, description, aur amount required hain.");
      return;
    }
    await createTx({ title: form.description, status: form.type, date: today, amount: Number(form.amount), data: { fund: form.fund || (funds[0]?.name || ""), reference: form.reference } });
    setShowModal(false);
    setForm({ fund:"", type:"receipt", amount:"", description:"", reference:"" });
  };

  const loading = fundsLoading || txLoading;
  const card = { background:bg, border:`1px solid ${border}`, borderRadius:12, padding:20 };
  const inp = { background:"rgba(255,255,255,.05)", border:`1px solid ${border}`, borderRadius:8, padding:"10px 14px", color:"#fff", fontFamily:ff, width:"100%", boxSizing:"border-box" as const, fontSize:14 };
  const btn = (c:string) => ({ background:c, border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontFamily:ff, cursor:"pointer", fontSize:14, fontWeight:600 });

  return (
    <div style={{ fontFamily:ff, color:"#fff", padding:24, minHeight:"100vh", background:"#0f0f0f" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:700 }}>Fund Accounting</h1>
          <p style={{ margin:"4px 0 0", color:"rgba(255,255,255,.5)", fontSize:14 }}>Track funds, receipts & expenditures</p>
        </div>
        <button onClick={()=>setShowModal(true)} style={btn("#6366f1")}>+ Add Transaction</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
        {[
          { label:"Total Funds", value:funds.length, color:"#6366f1" },
          { label:"Total Balance", value:`Rs. ${(totalBalance/1000000).toFixed(2)}M`, color:"#22c55e" },
          { label:"Received This Month", value:`Rs. ${(receivedThisMonth/1000).toFixed(0)}K`, color:"#3b82f6" },
          { label:"Spent This Month", value:`Rs. ${(spentThisMonth/1000).toFixed(0)}K`, color:"#ef4444" },
        ].map(s=>(
          <div key={s.label} style={{ ...card, textAlign:"center" }}>
            <div style={{ fontSize:26, fontWeight:700, color:s.color }}>{s.value}</div>
            <div style={{ color:"rgba(255,255,255,.5)", fontSize:13, marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign:"center", padding:40, color:"rgba(255,255,255,.4)" }}>Loading...</div>}

      {/* Fund Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(380px,1fr))", gap:16, marginBottom:24 }}>
        {!fundsLoading && funds.length === 0 && <div style={{ ...card, textAlign:"center", padding:40, color:"rgba(255,255,255,.25)" }}>No funds found.</div>}
        {funds.map(f=>{
          const utilPct = f.totalReceived > 0 ? Math.min((f.totalSpent/f.totalReceived)*100, 100) : 0;
          return (
            <div key={f.id} style={{ ...card }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>{f.name}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", marginTop:2 }}>{f.purpose}</div>
                </div>
                <span style={{ background:f.status==="active"?"rgba(34,197,94,.15)":"rgba(107,114,128,.15)", color:f.status==="active"?"#22c55e":"#6b7280", border:`1px solid ${f.status==="active"?"#22c55e40":"#6b728040"}`, borderRadius:20, padding:"3px 10px", fontSize:12, fontWeight:600 }}>{f.status==="active"?"Active":"Closed"}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12, textAlign:"center" }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:"#22c55e" }}>Rs. {(f.balance/1000).toFixed(0)}K</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>Balance</div>
                </div>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:"#3b82f6" }}>Rs. {(f.totalReceived/1000).toFixed(0)}K</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>Received</div>
                </div>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:"#ef4444" }}>Rs. {(f.totalSpent/1000).toFixed(0)}K</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>Spent</div>
                </div>
              </div>
              <div style={{ marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"rgba(255,255,255,.4)", marginBottom:3 }}>
                  <span>Utilization</span><span>{utilPct.toFixed(0)}%</span>
                </div>
                <div style={{ height:6, background:"rgba(255,255,255,.1)", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${utilPct}%`, background:utilPct>90?"#ef4444":"#6366f1", borderRadius:3 }} />
                </div>
              </div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>👥 {f.donors} donors</div>
            </div>
          );
        })}
      </div>

      {/* Recent Transactions */}
      <div style={{ ...card }}>
        <h3 style={{ margin:"0 0 16px", fontSize:15, color:"rgba(255,255,255,.7)" }}>Recent Transactions</h3>
        {!txLoading && transactions.length === 0 && <div style={{ textAlign:"center", padding:20, color:"rgba(255,255,255,.25)" }}>No transactions found.</div>}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {transactions.slice(0,8).map(t=>(
            <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:"rgba(255,255,255,.03)", borderRadius:8, border:`1px solid ${border}` }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:t.type==="receipt"?"rgba(34,197,94,.15)":"rgba(239,68,68,.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>
                {t.type==="receipt"?"↓":"↑"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{t.description}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>{t.fund} · {t.reference} · {t.date}</div>
              </div>
              <div style={{ fontWeight:700, fontSize:15, color:t.type==="receipt"?"#22c55e":"#ef4444" }}>
                {t.type==="receipt"?"+":"-"}Rs. {t.amount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ background:"#1a1a2e", border:`1px solid ${border}`, borderRadius:16, padding:28, width:480 }}>
            <h2 style={{ margin:"0 0 20px", fontSize:18 }}>Add Transaction</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <label style={{ fontSize:12, color:"rgba(255,255,255,.5)", display:"block", marginBottom:4 }}>Fund</label>
                <select value={form.fund || (funds[0]?.name || "")} onChange={e=>setForm(p=>({...p,fund:e.target.value}))} style={inp}>
                  {funds.map(f=><option key={f.id} value={f.name}>{f.name}</option>)}
                  {funds.length === 0 && <option value="">No funds available</option>}
                </select>
              </div>
              <div>
                <label style={{ fontSize:12, color:"rgba(255,255,255,.5)", display:"block", marginBottom:4 }}>Type</label>
                <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={inp}>
                  <option value="receipt">Receipt (Income)</option><option value="expense">Expense</option>
                </select>
              </div>
              {[["Amount (Rs.)","amount"],["Description","description"],["Reference No","reference"]].map(([lbl,key])=>(
                <div key={key}>
                  <label style={{ fontSize:12, color:"rgba(255,255,255,.5)", display:"block", marginBottom:4 }}>{lbl}</label>
                  <input value={(form as Record<string,string>)[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} style={inp} />
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:12, marginTop:20 }}>
              <button onClick={addTransaction} style={{ background:"#6366f1", border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontFamily:ff, cursor:"pointer", fontSize:14, fontWeight:600, flex:1 }}>Add Transaction</button>
              <button onClick={()=>setShowModal(false)} style={{ background:"rgba(255,255,255,.07)", border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontFamily:ff, cursor:"pointer", fontSize:14, fontWeight:600, flex:1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
