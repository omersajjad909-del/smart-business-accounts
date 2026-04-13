"use client";
import { fmtDate } from "@/lib/dateUtils";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getMaxUsersForPlan } from "@/lib/planLimits";
import { COUNTRIES as ALL_COUNTRIES, sortCountries } from "@/lib/countries";
import { CURRENCY_LABEL, SUPPORTED_CURRENCIES, currencyByCountry } from "@/lib/currency";
import Link from "next/link";

type CompanyData = {
  name: string;
  country: string | null;
  baseCurrency: string;
  plan: string;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  activeModules: string | null;
  stripeCustomerId: string | null;
};

const CURRENCIES = [...SUPPORTED_CURRENCIES];

export default function CompanyProfilePage() {
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [userCount, setUserCount] = useState<number>(0);
  const [maxUsers, setMaxUsers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{text:string;ok:boolean}|null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name:"", country:"", baseCurrency:"" });
  const countryOptions = sortCountries(ALL_COUNTRIES).map((country) => country.name);

  useEffect(() => {
    Promise.all([
      fetch("/api/me/company").then(r => r.ok ? r.json() : null),
      fetch("/api/users", { headers:{"x-user-role":"ADMIN"} }).then(r => r.ok ? r.json() : []),
      fetch("/api/public/plan-config").then(r => r.ok ? r.json() : null),
    ]).then(([companyData, users, planConfig]) => {
      if (companyData) {
        setCompany(companyData);
        setForm({ name: companyData.name || "", country: companyData.country || "", baseCurrency: companyData.baseCurrency || "USD" });
      }
      setUserCount(Array.isArray(users) ? users.length : 0);

      // Dynamic max users from admin config
      if (planConfig?.planLimits && companyData?.plan) {
        const key = String(companyData.plan).toLowerCase();
        const lim = planConfig.planLimits[key];
        setMaxUsers(lim === undefined ? null : lim);
      } else if (companyData?.plan) {
        setMaxUsers(getMaxUsersForPlan(companyData.plan));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function saveProfile() {
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/company/update", {
        method: "PATCH",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ name: form.name, country: form.country, baseCurrency: form.baseCurrency }),
      });
      if (res.ok) {
        setCompany(prev => prev ? { ...prev, ...form } : prev);
        setSaveMsg({ text:"Profile updated successfully", ok:true });
        setEditing(false);
      } else {
        const j = await res.json().catch(() => ({}));
        setSaveMsg({ text: j.error || "Failed to save", ok:false });
      }
    } catch {
      setSaveMsg({ text:"Network error", ok:false });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3500);
    }
  }

  function updateCountry(countryName: string) {
    const match = ALL_COUNTRIES.find((country) => country.name === countryName);
    setForm((current) => ({
      ...current,
      country: countryName,
      baseCurrency: match ? currencyByCountry(match.code) : current.baseCurrency,
    }));
  }

  const card: React.CSSProperties = {
    borderRadius:14, padding:"22px 24px",
    background:"rgba(255,255,255,0.03)",
    border:"1px solid rgba(255,255,255,0.07)",
    marginBottom:16,
  };

  const inputStyle: React.CSSProperties = {
    width:"100%", padding:"10px 14px", borderRadius:8,
    background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
    color:"white", fontSize:13, outline:"none", boxSizing:"border-box",
    transition:"border-color .15s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.35)",
    textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:6,
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"50vh" }}>
      <div style={{ width:32, height:32, border:"3px solid rgba(99,102,241,0.2)", borderTopColor:"#6366f1", borderRadius:"50%", animation:"spin .7s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!company) return (
    <div style={{ textAlign:"center", padding:48, color:"rgba(255,255,255,0.3)" }}>Company not found.</div>
  );

  const planCode = String(company.plan || "STARTER").toUpperCase();
  const statusActive = String(company.subscriptionStatus || "").toUpperCase() === "ACTIVE";
  const periodEnd = company.currentPeriodEnd ? fmtDate(company.currentPeriodEnd) : null;
  const planColors: Record<string,string> = { STARTER:"#818cf8", PRO:"#a78bfa", ENTERPRISE:"#34d399", CUSTOM:"#fbbf24" };
  const planColor = planColors[planCode] || "#818cf8";

  return (
    <div style={{ maxWidth:820, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:"white", margin:0 }}>Company Profile</h1>
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:4 }}>Your business identity & subscription details</p>
        </div>
        {isAdmin && !editing && (
          <button onClick={() => setEditing(true)} style={{ padding:"9px 18px", borderRadius:9, background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.3)", color:"#a5b4fc", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            Edit Profile
          </button>
        )}
      </div>

      {/* Save message */}
      {saveMsg && (
        <div style={{ marginBottom:16, padding:"11px 16px", borderRadius:10, background: saveMsg.ok ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)", border:`1px solid ${saveMsg.ok ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`, fontSize:13, color: saveMsg.ok ? "#34d399" : "#f87171" }}>
          {saveMsg.text}
        </div>
      )}

      {/* Company identity card */}
      <div style={card}>
        <div style={{ display:"flex", alignItems:"center", gap:18, marginBottom: editing ? 24 : 0 }}>
          {/* Avatar */}
          <div style={{ width:64, height:64, borderRadius:16, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, fontWeight:800, color:"white", flexShrink:0, boxShadow:"0 8px 24px rgba(99,102,241,0.3)" }}>
            {(company.name || "C")[0].toUpperCase()}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:20, fontWeight:800, color:"white", letterSpacing:"-.3px" }}>{company.name}</div>
            <div style={{ display:"flex", gap:12, marginTop:6, flexWrap:"wrap" }}>
              {company.country && (
                <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>🌍 {company.country}</span>
              )}
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>💱 {company.baseCurrency}</span>
            </div>
          </div>
        </div>

        {/* Edit form */}
        {editing && isAdmin && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:16 }}>
              <div>
                <label style={labelStyle}>Company Name</label>
                <input style={inputStyle} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Company name" />
              </div>
              <div>
                <label style={labelStyle}>Country</label>
                <select style={{...inputStyle,paddingRight:32}} value={form.country} onChange={e=>updateCountry(e.target.value)}>
                  <option value="">Select country</option>
                  {countryOptions.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Base Currency</label>
                <select style={{...inputStyle,paddingRight:32}} value={form.baseCurrency} onChange={e=>setForm(f=>({...f,baseCurrency:e.target.value}))}>
                  {CURRENCIES.map(c=><option key={c} value={c}>{c} - {CURRENCY_LABEL[c] || c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={saveProfile} disabled={saving} style={{ padding:"9px 20px", borderRadius:9, background:"linear-gradient(135deg,#6366f1,#4f46e5)", border:"none", color:"white", fontWeight:700, fontSize:13, cursor:saving?"not-allowed":"pointer", opacity:saving?.7:1 }}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={()=>{setEditing(false);setSaveMsg(null);}} style={{ padding:"9px 20px", borderRadius:9, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.55)", fontWeight:600, fontSize:13, cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Plan & Subscription */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
        {/* Plan card */}
        <div style={{ ...card, margin:0, background:`rgba(99,102,241,0.06)`, border:`1px solid rgba(99,102,241,0.2)` }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".07em", color:"rgba(255,255,255,0.35)", marginBottom:12 }}>Current Plan</div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ padding:"6px 14px", borderRadius:20, background:`rgba(99,102,241,0.15)`, border:`1px solid rgba(99,102,241,0.35)` }}>
              <span style={{ fontSize:18, fontWeight:900, color:planColor }}>{planCode}</span>
            </div>
            <div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.45)" }}>
                {maxUsers === null ? "Unlimited users" : `Up to ${maxUsers} users`}
              </div>
              {periodEnd && <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:2 }}>Renews {periodEnd}</div>}
            </div>
          </div>
          {isAdmin && (
            <Link href="/dashboard/billing" style={{ display:"inline-block", marginTop:14, padding:"7px 14px", borderRadius:8, background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.25)", color:"#a5b4fc", fontSize:11, fontWeight:700, textDecoration:"none" }}>
              Manage Plan →
            </Link>
          )}
        </div>

        {/* Subscription status */}
        <div style={{ ...card, margin:0, background: statusActive ? "rgba(52,211,153,0.06)" : "rgba(248,113,113,0.06)", border:`1px solid ${statusActive ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}` }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".07em", color:"rgba(255,255,255,0.35)", marginBottom:12 }}>Subscription</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background: statusActive ? "#34d399" : "#f87171", boxShadow:`0 0 8px ${statusActive ? "rgba(52,211,153,0.5)" : "rgba(248,113,113,0.5)"}` }}/>
            <span style={{ fontSize:18, fontWeight:800, color: statusActive ? "#34d399" : "#f87171" }}>
              {company.subscriptionStatus || "ACTIVE"}
            </span>
          </div>
          {company.stripeCustomerId && (
            <div style={{ marginTop:12, fontSize:11, color:"rgba(255,255,255,0.25)", fontFamily:"monospace" }}>
              {company.stripeCustomerId}
            </div>
          )}
        </div>
      </div>

      {/* Users overview */}
      <div style={card}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.7)" }}>Team Members</div>
          {isAdmin && (
            <Link href="/dashboard/users" style={{ fontSize:12, color:"#818cf8", fontWeight:600, textDecoration:"none" }}>Manage Users →</Link>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <span style={{ fontSize:13, color:"rgba(255,255,255,0.6)" }}>
              <strong style={{ color:"white", fontSize:16 }}>{userCount}</strong>
              {maxUsers !== null ? ` / ${maxUsers} users` : " users (unlimited)"}
            </span>
            {maxUsers !== null && (
              <span style={{ fontSize:11, color: userCount >= maxUsers ? "#f87171" : "rgba(255,255,255,0.3)" }}>
                {userCount >= maxUsers ? "Limit reached" : `${maxUsers - userCount} slots left`}
              </span>
            )}
          </div>
          {maxUsers !== null && (
            <div style={{ height:6, borderRadius:10, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
              <div style={{
                height:"100%", borderRadius:10, transition:"width .4s ease",
                width:`${Math.min(100,(userCount/maxUsers)*100)}%`,
                background: userCount >= maxUsers ? "linear-gradient(90deg,#f87171,#ef4444)" : "linear-gradient(90deg,#6366f1,#818cf8)",
              }}/>
            </div>
          )}
        </div>

        {userCount >= (maxUsers ?? Infinity) && maxUsers !== null && (
          <div style={{ padding:"10px 14px", borderRadius:8, background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.2)", fontSize:12, color:"#f87171" }}>
            User limit reached. <Link href="/dashboard/billing" style={{ color:"#f87171", fontWeight:700 }}>Upgrade your plan</Link> to add more members.
          </div>
        )}
      </div>

      {/* Active modules (for custom plan) */}
      {company.activeModules && planCode === "CUSTOM" && (
        <div style={card}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.7)", marginBottom:12 }}>Active Modules</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {company.activeModules.split(",").filter(Boolean).map(m => (
              <span key={m} style={{ padding:"4px 12px", borderRadius:20, background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.25)", color:"#fbbf24", fontSize:12, fontWeight:600 }}>
                {m.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
