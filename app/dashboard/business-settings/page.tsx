"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useResponsive } from "@/hooks/useResponsive";

type Tab = "general" | "identity" | "invoice" | "subscription";

interface CompanyInfo {
  name: string; country: string; baseCurrency: string;
  businessType: string; plan: string; subscriptionStatus: string;
  totalUsers: number; totalAccounts: number;
  createdAt: string; currentPeriodEnd: string | null;
}
interface AdminSettings {
  companyIdentity: { legalName:string; legalAddress:string; city:string; state:string; postalCode:string; website:string };
  invoiceContact:  { contactName:string; email:string; phone:string; supportEmail:string; supportPhone:string };
  bankDetails:     { bankName:string; accountTitle:string; accountNumber:string; iban:string; swiftCode:string; branchName:string };
  taxProfile:      { taxIdLabel:string; taxIdValue:string; vatNumber:string; gstNumber:string; registrationNote:string };
  printPreferences:{ paperSize:string; invoiceTemplate:string; footerNote:string; showLogo:boolean };
}

const BIZ_LABELS: Record<string,{label:string;icon:string;color:string}> = {
  trading:          {label:"Trading",               icon:"🛒",color:"#818cf8"},
  distribution:     {label:"Distribution/Wholesale",icon:"🚛",color:"#38bdf8"},
  wholesale:        {label:"Wholesale",             icon:"📦",color:"#34d399"},
  import_company:   {label:"Import Company",        icon:"🚢",color:"#fb923c"},
  export_company:   {label:"Export Company",        icon:"🌍",color:"#a78bfa"},
  clearing_forwarding:{label:"Clearing & Forwarding",icon:"✈️",color:"#f472b6"},
  manufacturing:    {label:"Manufacturing",         icon:"🏭",color:"#fbbf24"},
  retail:           {label:"Retail / POS",          icon:"🏪",color:"#4ade80"},
  restaurant:       {label:"Restaurant",            icon:"🍽️",color:"#f87171"},
  real_estate:      {label:"Real Estate",           icon:"🏢",color:"#c084fc"},
  construction:     {label:"Construction",          icon:"🏗️",color:"#fb923c"},
  school:           {label:"School/Education",      icon:"🎓",color:"#60a5fa"},
  hospital:         {label:"Hospital/Clinic",       icon:"🏥",color:"#34d399"},
  hotel:            {label:"Hotel",                 icon:"🏨",color:"#fbbf24"},
  service:          {label:"Service Business",      icon:"⚙️",color:"#a78bfa"},
};

const CURRENCIES = [
  "USD","EUR","GBP","PKR","AED","SAR","INR","BDT","EGP","TRY","MYR","IDR","NGN","KES","GHS","ZAR","CAD","AUD","SGD","HKD","JPY","CNY","KWD","QAR","BHD","OMR","JOD","IQD",
];

const COUNTRIES = [
  "United States","United Kingdom","Pakistan","United Arab Emirates","Saudi Arabia","India","Bangladesh","Egypt","Turkey","Malaysia","Indonesia","Nigeria","Kenya","Ghana","South Africa","Canada","Australia","Singapore","Hong Kong","Japan","China","Kuwait","Qatar","Bahrain","Oman","Jordan","Iraq","Germany","France","Italy","Spain","Netherlands","Belgium","Sweden","Norway","Denmark","Finland","Switzerland","Austria","Poland","Czech Republic","Hungary","Romania","Bulgaria","Greece","Portugal","Philippines","Vietnam","Thailand","South Korea","Taiwan","New Zealand","Brazil","Mexico","Argentina","Colombia","Chile","Peru","Venezuela",
];

const inp = (extra?:object) => ({
  width:"100%",padding:"10px 13px",borderRadius:9,background:"rgba(255,255,255,.04)",
  border:"1px solid rgba(255,255,255,.1)",color:"var(--text-primary)",fontSize:13,
  fontFamily:"inherit",outline:"none",boxSizing:"border-box" as const,...(extra||{}),
});
const lbl = {fontSize:11,fontWeight:700,color:"rgba(255,255,255,.4)",textTransform:"uppercase" as const,letterSpacing:".07em",marginBottom:5,display:"block"};
const section = (extra?:object) => ({borderRadius:14,background:"var(--panel-bg)",border:"1px solid var(--border)",padding: isMobile ? "12px 11px" : "22px 24px",marginBottom:16,...(extra||{})});

function Field({label,children}:{label:string;children:React.ReactNode}) {
  return (
    <div style={{marginBottom:14}}>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  );
}
function Grid({children,cols=2}:{children:React.ReactNode;cols?:number}) {
  return <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:14}}>{children}</div>;
}

export default function BusinessSettingsPage() {
  const { isMobile } = useResponsive();
  const [tab, setTab] = useState<Tab>("general");
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState<{msg:string;type:"ok"|"err"}|null>(null);

  // Company basic info
  const [co, setCo] = useState<CompanyInfo>({name:"",country:"",baseCurrency:"USD",businessType:"trading",plan:"STARTER",subscriptionStatus:"ACTIVE",totalUsers:0,totalAccounts:0,createdAt:"",currentPeriodEnd:null});
  const [name, setName]         = useState("");
  const [country, setCountry]   = useState("");
  const [currency, setCurrency] = useState("USD");

  // Admin control sections
  const [identity, setIdentity] = useState({legalName:"",legalAddress:"",city:"",state:"",postalCode:"",website:""});
  const [contact, setContact]   = useState({contactName:"",email:"",phone:"",supportEmail:"",supportPhone:""});
  const [bank, setBank]         = useState({bankName:"",accountTitle:"",accountNumber:"",iban:"",swiftCode:"",branchName:""});
  const [tax, setTax]           = useState({taxIdLabel:"",taxIdValue:"",vatNumber:"",gstNumber:"",registrationNote:""});
  const [print, setPrint]       = useState({paperSize:"A4",invoiceTemplate:"classic",footerNote:"Thank you for your business.",showLogo:true});

  useEffect(() => {
    Promise.all([
      fetch("/api/me/company").then(r=>r.json()).catch(()=>({})),
      fetch("/api/company/admin-control").then(r=>r.json()).catch(()=>({})),
    ]).then(([coData, acData]) => {
      if (coData && !coData.error) {
        setCo(coData);
        setName(coData.name||"");
        setCountry(coData.country||"");
        setCurrency(coData.baseCurrency||"USD");
      }
      if (acData && !acData.error) {
        const a = acData as AdminSettings;
        if (a.companyIdentity) setIdentity(prev=>({...prev,...a.companyIdentity}));
        if (a.invoiceContact)  setContact(prev=>({...prev,...a.invoiceContact}));
        if (a.bankDetails)     setBank(prev=>({...prev,...a.bankDetails}));
        if (a.taxProfile)      setTax(prev=>({...prev,...a.taxProfile}));
        if (a.printPreferences)setPrint(prev=>({...prev,...a.printPreferences}));
      }
    }).finally(()=>setLoading(false));
  }, []);

  function showToast(msg:string, type:"ok"|"err"="ok") {
    setToast({msg,type});
    setTimeout(()=>setToast(null), 3000);
  }

  async function saveGeneral() {
    setSaving(true);
    try {
      const r = await fetch("/api/company/update", {
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({name,country,baseCurrency:currency}),
      });
      if (!r.ok) throw new Error("Failed");
      setCo(prev=>({...prev,name,country,baseCurrency:currency}));
      showToast("Company details saved");
    } catch { showToast("Save failed","err"); }
    finally { setSaving(false); }
  }

  async function saveAdminSection(patch: Partial<AdminSettings>) {
    setSaving(true);
    try {
      const r = await fetch("/api/company/admin-control", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error("Failed");
      showToast("Settings saved");
    } catch { showToast("Save failed","err"); }
    finally { setSaving(false); }
  }

  const biz = BIZ_LABELS[co.businessType] || {label:co.businessType,icon:"🏢",color:"#818cf8"};
  const planColor = co.plan==="ENTERPRISE"?"#fbbf24":co.plan==="PRO"?"#34d399":"#818cf8";
  const statusColor = co.subscriptionStatus==="ACTIVE"?"#34d399":"#f87171";

  const TABS: {id:Tab;label:string;icon:string}[] = [
    {id:"general",    label:"General",       icon:"🏢"},
    {id:"identity",   label:"Identity & Bank",icon:"📋"},
    {id:"invoice",    label:"Invoice & Tax",  icon:"🧾"},
    {id:"subscription",label:"Subscription", icon:"💳"},
  ];

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:300,color:"rgba(255,255,255,.3)",fontSize:14}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:36,height:36,border:"3px solid rgba(99,102,241,.2)",borderTopColor:"#6366f1",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 12px"}}/>
        Loading settings…
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:"0 0 40px",fontFamily:"'Outfit','Inter',sans-serif",color:"var(--text-primary)"}}>

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",top:72,right:20,zIndex:999,padding:"11px 18px",borderRadius:10,fontSize:13,fontWeight:700,
          background:toast.type==="ok"?"rgba(52,211,153,.15)":"rgba(248,113,113,.15)",
          border:`1px solid ${toast.type==="ok"?"rgba(52,211,153,.35)":"rgba(248,113,113,.35)"}`,
          color:toast.type==="ok"?"#34d399":"#f87171",
          boxShadow:"0 8px 32px rgba(0,0,0,.3)",
        }}>
          {toast.type==="ok"?"✓":""} {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div style={{marginBottom:24,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:900,margin:"0 0 4px",letterSpacing:"-.4px"}}>Business Settings</h1>
          <p style={{margin:0,fontSize:13,color:"var(--text-muted)"}}>Manage your company information, invoice preferences, and tax profile.</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{padding:"4px 12px",borderRadius:20,background:`${planColor}15`,border:`1px solid ${planColor}30`,color:planColor,fontSize:11,fontWeight:700}}>{co.plan}</span>
          <span style={{padding:"4px 12px",borderRadius:20,background:`${statusColor}15`,border:`1px solid ${statusColor}30`,color:statusColor,fontSize:11,fontWeight:700}}>{co.subscriptionStatus}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:20,background:"var(--panel-bg)",borderRadius:12,padding:5,border:"1px solid var(--border)"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:"9px 6px",borderRadius:9,border:"none",cursor:"pointer",fontSize:12.5,fontWeight:700,fontFamily:"inherit",transition:"all .15s",
              background:tab===t.id?"linear-gradient(135deg,#6366f1,#4f46e5)":"transparent",
              color:tab===t.id?"white":"var(--text-muted)",
            }}>
            <span style={{marginRight:5}}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: GENERAL ══ */}
      {tab==="general" && (
        <>
          {/* Company Details */}
          <div style={section()}>
            <div style={{fontSize:14,fontWeight:800,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Company Details
            </div>
            <Grid>
              <Field label="Company Name">
                <input value={name} onChange={e=>setName(e.target.value)} style={inp()} placeholder="Your company name"/>
              </Field>
              <Field label="Country">
                <select value={country} onChange={e=>setCountry(e.target.value)} style={inp()}>
                  <option value="">— Select country —</option>
                  {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Base Currency">
                <select value={currency} onChange={e=>setCurrency(e.target.value)} style={inp()}>
                  {CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </Grid>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
              <button onClick={saveGeneral} disabled={saving}
                style={{padding:"10px 28px",borderRadius:10,border:"none",cursor:saving?"wait":"pointer",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"white",fontSize:13,fontWeight:700,fontFamily:"inherit",boxShadow:"0 4px 16px rgba(99,102,241,.35)",opacity:saving?.6:1}}>
                {saving?"Saving…":"Save Changes"}
              </button>
            </div>
          </div>

          {/* Business Type — READ ONLY */}
          <div style={section()}>
            <div style={{fontSize:14,fontWeight:800,marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
              <span>{biz.icon}</span> Business Type
              <span style={{marginLeft:"auto",padding:"3px 10px",borderRadius:20,background:"rgba(251,191,36,.1)",border:"1px solid rgba(251,191,36,.25)",color:"#fbbf24",fontSize:10,fontWeight:700}}>READ ONLY</span>
            </div>
            <p style={{margin:"0 0 16px",fontSize:12,color:"var(--text-muted)"}}>Your business type is locked after setup to protect your data and chart of accounts.</p>
            <div style={{display:"flex",alignItems:"center",gap:14,padding: isMobile ? "12px 10px" : "16px 18px",borderRadius:12,background:`${biz.color}0f`,border:`1px solid ${biz.color}25`}}>
              <div style={{width:50,height:50,borderRadius:14,background:`${biz.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{biz.icon}</div>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:"white"}}>{biz.label}</div>
                <div style={{fontSize:12,color:"var(--text-muted)",marginTop:3}}>Active business module · data & accounts are configured for this type</div>
              </div>
              <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:9,background:`${biz.color}18`,border:`1px solid ${biz.color}30`}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={biz.color} strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                <span style={{fontSize:11,fontWeight:700,color:biz.color}}>Locked</span>
              </div>
            </div>
            <div style={{marginTop:12,padding:"10px 14px",borderRadius:10,background:"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.15)",fontSize:12,color:"rgba(255,255,255,.45)"}}>
              ℹ️ Need to change your business type? Contact support or your account manager. Changing it requires a verified data migration to avoid loss of records.
            </div>
          </div>
        </>
      )}

      {/* ══ TAB: IDENTITY & BANK ══ */}
      {tab==="identity" && (
        <>
          {/* Company Identity */}
          <div style={section()}>
            <div style={{fontSize:14,fontWeight:800,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
              Legal Identity
            </div>
            <Grid>
              <Field label="Legal / Registered Name"><input value={identity.legalName} onChange={e=>setIdentity(p=>({...p,legalName:e.target.value}))} style={inp()} placeholder="Full legal company name"/></Field>
              <Field label="Website"><input value={identity.website} onChange={e=>setIdentity(p=>({...p,website:e.target.value}))} style={inp()} placeholder="https://yourcompany.com"/></Field>
              <Field label="Registered Address"><input value={identity.legalAddress} onChange={e=>setIdentity(p=>({...p,legalAddress:e.target.value}))} style={inp()} placeholder="Street address"/></Field>
              <Field label="City"><input value={identity.city} onChange={e=>setIdentity(p=>({...p,city:e.target.value}))} style={inp()} placeholder="City"/></Field>
              <Field label="State / Province"><input value={identity.state} onChange={e=>setIdentity(p=>({...p,state:e.target.value}))} style={inp()} placeholder="State / Province"/></Field>
              <Field label="Postal / ZIP Code"><input value={identity.postalCode} onChange={e=>setIdentity(p=>({...p,postalCode:e.target.value}))} style={inp()} placeholder="12345"/></Field>
            </Grid>

            <div style={{height:1,background:"var(--border)",margin:"16px 0"}}/>
            <div style={{fontSize:14,fontWeight:800,marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013 8.81a19.79 19.79 0 01-3.07-8.63A2 2 0 011.92 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
              Contact Information
            </div>
            <Grid>
              <Field label="Contact Name"><input value={contact.contactName} onChange={e=>setContact(p=>({...p,contactName:e.target.value}))} style={inp()} placeholder="Primary contact name"/></Field>
              <Field label="Email"><input type="email" value={contact.email} onChange={e=>setContact(p=>({...p,email:e.target.value}))} style={inp()} placeholder="info@company.com"/></Field>
              <Field label="Phone"><input value={contact.phone} onChange={e=>setContact(p=>({...p,phone:e.target.value}))} style={inp()} placeholder="+1 (555) 000-0000"/></Field>
              <Field label="Support Email"><input type="email" value={contact.supportEmail} onChange={e=>setContact(p=>({...p,supportEmail:e.target.value}))} style={inp()} placeholder="support@company.com"/></Field>
              <Field label="Support Phone"><input value={contact.supportPhone} onChange={e=>setContact(p=>({...p,supportPhone:e.target.value}))} style={inp()} placeholder="+1 (555) 000-0001"/></Field>
            </Grid>

            <div style={{height:1,background:"var(--border)",margin:"16px 0"}}/>
            <div style={{fontSize:14,fontWeight:800,marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              Bank Details
            </div>
            <Grid>
              <Field label="Bank Name"><input value={bank.bankName} onChange={e=>setBank(p=>({...p,bankName:e.target.value}))} style={inp()} placeholder="Bank name"/></Field>
              <Field label="Account Title"><input value={bank.accountTitle} onChange={e=>setBank(p=>({...p,accountTitle:e.target.value}))} style={inp()} placeholder="Account holder name"/></Field>
              <Field label="Account Number"><input value={bank.accountNumber} onChange={e=>setBank(p=>({...p,accountNumber:e.target.value}))} style={inp()} placeholder="0000-0000-0000"/></Field>
              <Field label="IBAN"><input value={bank.iban} onChange={e=>setBank(p=>({...p,iban:e.target.value}))} style={inp()} placeholder="IBAN number"/></Field>
              <Field label="SWIFT / BIC Code"><input value={bank.swiftCode} onChange={e=>setBank(p=>({...p,swiftCode:e.target.value}))} style={inp()} placeholder="SWIFT code"/></Field>
              <Field label="Branch Name"><input value={bank.branchName} onChange={e=>setBank(p=>({...p,branchName:e.target.value}))} style={inp()} placeholder="Branch name"/></Field>
            </Grid>

            <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
              <button onClick={()=>saveAdminSection({companyIdentity:identity,invoiceContact:contact,bankDetails:bank})} disabled={saving}
                style={{padding:"10px 28px",borderRadius:10,border:"none",cursor:saving?"wait":"pointer",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"white",fontSize:13,fontWeight:700,fontFamily:"inherit",boxShadow:"0 4px 16px rgba(99,102,241,.35)",opacity:saving?.6:1}}>
                {saving?"Saving…":"Save Identity & Bank"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══ TAB: INVOICE & TAX ══ */}
      {tab==="invoice" && (
        <>
          {/* Tax Profile */}
          <div style={section()}>
            <div style={{fontSize:14,fontWeight:800,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Tax Registration
            </div>
            <Grid>
              <Field label="Tax ID Label (e.g. GST No, VAT No, NTN)">
                <input value={tax.taxIdLabel} onChange={e=>setTax(p=>({...p,taxIdLabel:e.target.value}))} style={inp()} placeholder="e.g. NTN, VAT No"/>
              </Field>
              <Field label="Tax ID Value">
                <input value={tax.taxIdValue} onChange={e=>setTax(p=>({...p,taxIdValue:e.target.value}))} style={inp()} placeholder="Registration number"/>
              </Field>
              <Field label="VAT Number">
                <input value={tax.vatNumber} onChange={e=>setTax(p=>({...p,vatNumber:e.target.value}))} style={inp()} placeholder="VAT number"/>
              </Field>
              <Field label="GST Number">
                <input value={tax.gstNumber} onChange={e=>setTax(p=>({...p,gstNumber:e.target.value}))} style={inp()} placeholder="GST number"/>
              </Field>
              <Field label="Registration Note (shown on invoices)">
                <input value={tax.registrationNote} onChange={e=>setTax(p=>({...p,registrationNote:e.target.value}))} style={inp()} placeholder="e.g. Registered under Sales Tax Act"/>
              </Field>
            </Grid>
          </div>

          {/* Print & Invoice Preferences */}
          <div style={section()}>
            <div style={{fontSize:14,fontWeight:800,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print & Invoice Preferences
            </div>
            <Grid>
              <Field label="Paper Size">
                <select value={print.paperSize} onChange={e=>setPrint(p=>({...p,paperSize:e.target.value}))} style={inp()}>
                  <option value="A4">A4</option>
                  <option value="THERMAL_80MM">Thermal 80mm</option>
                  <option value="THERMAL_58MM">Thermal 58mm</option>
                </select>
              </Field>
              <Field label="Invoice Template">
                <select value={print.invoiceTemplate} onChange={e=>setPrint(p=>({...p,invoiceTemplate:e.target.value}))} style={inp()}>
                  <option value="classic">Classic</option>
                  <option value="compact">Compact</option>
                  <option value="modern">Modern</option>
                </select>
              </Field>
              <Field label="Invoice Footer Note">
                <input value={print.footerNote} onChange={e=>setPrint(p=>({...p,footerNote:e.target.value}))} style={inp()} placeholder="Thank you for your business."/>
              </Field>
              <Field label="Show Logo on Invoice">
                <div style={{display:"flex",alignItems:"center",gap:10,paddingTop:4}}>
                  <button onClick={()=>setPrint(p=>({...p,showLogo:!p.showLogo}))}
                    style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",transition:"background .2s",background:print.showLogo?"#6366f1":"rgba(255,255,255,.1)",position:"relative",flexShrink:0}}>
                    <div style={{position:"absolute",top:3,left:print.showLogo?22:3,width:18,height:18,borderRadius:"50%",background:"white",transition:"left .2s"}}/>
                  </button>
                  <span style={{fontSize:12,color:"var(--text-muted)"}}>{print.showLogo?"Enabled":"Disabled"}</span>
                </div>
              </Field>
            </Grid>

            <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
              <button onClick={()=>saveAdminSection({taxProfile:tax,printPreferences:print})} disabled={saving}
                style={{padding:"10px 28px",borderRadius:10,border:"none",cursor:saving?"wait":"pointer",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"white",fontSize:13,fontWeight:700,fontFamily:"inherit",boxShadow:"0 4px 16px rgba(99,102,241,.35)",opacity:saving?.6:1}}>
                {saving?"Saving…":"Save Invoice & Tax"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══ TAB: SUBSCRIPTION ══ */}
      {tab==="subscription" && (
        <>
          {/* Plan overview */}
          <div style={section()}>
            <div style={{fontSize:14,fontWeight:800,marginBottom:16}}>Current Plan</div>
            <div style={{display:"flex",alignItems:"center",gap:16,padding: isMobile ? "12px 10px" : "18px 20px",borderRadius:12,background:`${planColor}0f`,border:`1px solid ${planColor}25`,marginBottom:16}}>
              <div style={{width:52,height:52,borderRadius:15,background:`${planColor}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
                {co.plan==="ENTERPRISE"?"🏆":co.plan==="PRO"?"⚡":"🌱"}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:20,fontWeight:900,color:planColor}}>{co.plan}</div>
                <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>
                  Status: <span style={{color:statusColor,fontWeight:700}}>{co.subscriptionStatus}</span>
                  {co.currentPeriodEnd && <span style={{marginLeft:12}}>Renews: <span style={{color:"rgba(255,255,255,.6)"}}>{new Date(co.currentPeriodEnd).toLocaleDateString()}</span></span>}
                </div>
              </div>
              <Link href="/dashboard/billing" style={{padding:"9px 18px",borderRadius:10,background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"white",fontSize:12,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>
                Manage Billing →
              </Link>
            </div>

            {/* Stats grid */}
            <div style={{display:"grid",gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)",gap:12}}>
              {[
                {label:"Team Members",    value:co.totalUsers,    icon:"👥", color:"#818cf8"},
                {label:"Chart of Accounts",value:co.totalAccounts, icon:"📊", color:"#34d399"},
                {label:"Member Since",    value:co.createdAt ? new Date(co.createdAt).getFullYear() : "—", icon:"📅", color:"#f59e0b"},
              ].map(s=>(
                <div key={s.label} style={{padding: isMobile ? "12px 10px" : "16px 18px",borderRadius:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)"}}>
                  <div style={{fontSize:20,marginBottom:8}}>{s.icon}</div>
                  <div style={{fontSize:22,fontWeight:900,color:s.color,marginBottom:4}}>{s.value}</div>
                  <div style={{fontSize:11,color:"var(--text-muted)",fontWeight:600}}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Plan features */}
          <div style={section()}>
            <div style={{fontSize:14,fontWeight:800,marginBottom:14}}>Plan Features</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[
                {feature:"Unlimited Invoices",  included:true},
                {feature:"Financial Reports",   included:true},
                {feature:"Inventory Management",included:true},
                {feature:"HR & Payroll",        included:true},
                {feature:"CRM Module",          included:co.plan!=="STARTER"},
                {feature:"AI Insights",         included:co.plan!=="STARTER"},
                {feature:"Advanced Analytics",  included:co.plan==="ENTERPRISE"},
                {feature:"API Access",          included:co.plan==="ENTERPRISE"},
                {feature:"Custom Modules",      included:co.plan==="ENTERPRISE"},
                {feature:"Priority Support",    included:co.plan!=="STARTER"},
              ].map(f=>(
                <div key={f.feature} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",borderRadius:9,background:f.included?"rgba(52,211,153,.05)":"rgba(255,255,255,.02)",border:`1px solid ${f.included?"rgba(52,211,153,.15)":"rgba(255,255,255,.05)"}`}}>
                  <span style={{fontSize:14,color:f.included?"#34d399":"rgba(255,255,255,.2)",flexShrink:0}}>{f.included?"✓":"✕"}</span>
                  <span style={{fontSize:12,fontWeight:600,color:f.included?"rgba(255,255,255,.8)":"rgba(255,255,255,.3)"}}>{f.feature}</span>
                </div>
              ))}
            </div>
            {co.plan==="STARTER" && (
              <div style={{marginTop:14,padding: isMobile ? "12px 10px" : "14px 18px",borderRadius:12,background:"linear-gradient(135deg,rgba(99,102,241,.1),rgba(139,92,246,.06))",border:"1px solid rgba(99,102,241,.2)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:"white",marginBottom:3}}>Upgrade to unlock more features</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.45)"}}>Get CRM, AI insights, advanced analytics, and priority support.</div>
                </div>
                <Link href="/pricing" style={{padding:"9px 18px",borderRadius:10,background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"white",fontSize:12,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap",boxShadow:"0 4px 14px rgba(99,102,241,.4)"}}>
                  View Plans →
                </Link>
              </div>
            )}
          </div>

          {/* Quick links */}
          <div style={section()}>
            <div style={{fontSize:14,fontWeight:800,marginBottom:14}}>Quick Links</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[
                {label:"Company Profile",  href:"/dashboard/company-profile",  icon:"🏢"},
                {label:"Team Members",     href:"/dashboard/users",             icon:"👥"},
                {label:"Billing & Plans",  href:"/dashboard/billing",           icon:"💳"},
                {label:"Admin Control",    href:"/dashboard/admin-control",     icon:"⚙️"},
              ].map(l=>(
                <Link key={l.href} href={l.href}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:10,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",textDecoration:"none",color:"var(--text-primary)",fontSize:13,fontWeight:600,transition:"background .15s"}}
                  onMouseEnter={(e:any)=>e.currentTarget.style.background="rgba(255,255,255,.06)"}
                  onMouseLeave={(e:any)=>e.currentTarget.style.background="rgba(255,255,255,.03)"}
                >
                  <span style={{fontSize:18}}>{l.icon}</span>{l.label}
                  <svg style={{marginLeft:"auto"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
