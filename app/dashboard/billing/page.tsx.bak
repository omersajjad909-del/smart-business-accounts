"use client";
import { fmtDate } from "@/lib/dateUtils";
import { confirmToast, alertToast } from "@/lib/toast-feedback";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Types Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
type PaymentMethod = {
  id: string; brand: string; last4: string;
  expMonth: number; expYear: number; holderName: string; isDefault: boolean;
};
type Invoice = {
  id: string; number: string; date: string;
  amount: number; currency: string; status: "paid" | "open" | "void"; plan: string;
};
type Subscription = {
  plan: string; status: string; currentPeriodEnd: string | null;
  amount: number; currency: string; introOfferClaimed: boolean; billingCycle?: string;
};

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Plan definitions Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
const PLANS = [
  {
    code: "STARTER", name: "Starter", monthlyPrice: 49, icon: "Ã°Å¸Å’Â±", color: "#818cf8",
    gradFrom: "#6366f1", gradTo: "#4f46e5",
    features: ["Up to 5 users","Core Accounting","Sales & Purchase Invoices","Bank Reconciliation","Basic Reports","Email Support"],
    notIncluded: ["HR & Payroll","Advanced Reports","Multi-Branch","API Access"],
  },
  {
    code: "PROFESSIONAL", name: "Professional", monthlyPrice: 99, icon: "Ã°Å¸Å¡â‚¬", color: "#34d399", popular: true,
    gradFrom: "#10b981", gradTo: "#059669",
    features: ["Up to 20 users","Everything in Starter","CRM & Sales Pipeline","Inventory Management","Multi-Branch Support","Advanced Reports","Backup & Restore","Priority Support"],
    notIncluded: ["HR & Payroll","API Access","Dedicated Account Manager"],
  },
  {
    code: "ENTERPRISE", name: "Enterprise", monthlyPrice: 249, icon: "Ã°Å¸â€™Å½", color: "#fbbf24",
    gradFrom: "#f59e0b", gradTo: "#d97706",
    features: ["Unlimited users","Everything in Pro","HR & Payroll","API Access & Webhooks","Custom Integrations","Dedicated Account Manager","SLA Support","Custom Modules"],
    notIncluded: [],
  },
];

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Card brand config Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
const CARD_BRANDS: Record<string, { label: string; grad: string }> = {
  visa:       { label: "VISA",       grad: "linear-gradient(135deg,#1a1f71,#1e3a8a)" },
  mastercard: { label: "MASTERCARD", grad: "linear-gradient(135deg,#2d1b69,#c2185b)" },
  amex:       { label: "AMEX",       grad: "linear-gradient(135deg,#1a3c5e,#0277bd)" },
  discover:   { label: "DISCOVER",   grad: "linear-gradient(135deg,#7c3102,#f76f20)" },
  unknown:    { label: "CARD",       grad: "linear-gradient(135deg,#312e81,#4f46e5)" },
};

function formatCardNumber(val: string) { return val.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim(); }
function formatExpiry(val: string) { const d = val.replace(/\D/g,"").slice(0,4); return d.length>2?d.slice(0,2)+"/"+d.slice(2):d; }
function detectBrand(num: string): string {
  const n = num.replace(/\s/g,"");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^6/.test(n)) return "discover";
  return "unknown";
}

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Status Badge Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    paid:     { bg:"rgba(52,211,153,.12)",  color:"#34d399", label:"Paid" },
    open:     { bg:"rgba(251,191,36,.12)",  color:"#fbbf24", label:"Open" },
    void:     { bg:"rgba(255,255,255,.06)", color:"rgba(255,255,255,.4)", label:"Void" },
    active:   { bg:"rgba(52,211,153,.12)",  color:"#34d399", label:"Active" },
    trialing: { bg:"rgba(129,140,248,.12)", color:"#a5b4fc", label:"Trial" },
    past_due: { bg:"rgba(239,68,68,.12)",   color:"#f87171", label:"Past Due" },
    canceled: { bg:"rgba(255,255,255,.06)", color:"rgba(255,255,255,.4)", label:"Canceled" },
    inactive: { bg:"rgba(255,255,255,.06)", color:"rgba(255,255,255,.4)", label:"Inactive" },
  };
  const s = map[status.toLowerCase()] ?? map.inactive;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, background:s.bg, color:s.color, fontSize:11, fontWeight:700 }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.color, display:"inline-block" }}/>
      {s.label}
    </span>
  );
}

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Cancel Modal Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
function CancelModal({ onClose, onConfirm, planName }: { onClose:()=>void; onConfirm:(r:string)=>Promise<void>; planName:string }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const reasons = ["Too expensive","Missing features I need","Switching to another tool","Business closed / paused","Just testing","Other"];

  async function confirmCancellation() {
    if (!reason) return;
    setLoading(true);
    await onConfirm(reason);
    setLoading(false);
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.72)", backdropFilter:"blur(6px)" }}/>
      <div style={{ position:"relative", width:"100%", maxWidth:480, background:"#0f1630", borderRadius:24, border:"1px solid rgba(239,68,68,.22)", boxShadow:"0 32px 80px rgba(0,0,0,.5)", overflow:"hidden" }}>
        <div style={{ height:3, background:"linear-gradient(90deg,#ef4444,#dc2626)" }}/>
        <div style={{ padding:"28px 32px 32px" }}>
          <div style={{ width:52, height:52, borderRadius:16, background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, marginBottom:18 }}>Ã¢Å¡Â Ã¯Â¸Â</div>
          <h2 style={{ margin:"0 0 8px", fontSize:20, fontWeight:800, color:"white" }}>Cancel {planName} Plan?</h2>
          <p style={{ margin:"0 0 24px", fontSize:13, color:"rgba(255,255,255,.5)", lineHeight:1.65 }}>
            Your plan stays active until the end of the billing period. You can reactivate at any time.
          </p>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:10 }}>Why are you leaving?</div>
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {reasons.map(r => (
                <button key={r} onClick={() => setReason(r)} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:11, border:`1.5px solid ${reason===r?"rgba(239,68,68,.5)":"rgba(255,255,255,.08)"}`, background:reason===r?"rgba(239,68,68,.08)":"rgba(255,255,255,.03)", cursor:"pointer", fontSize:13, color:reason===r?"#fca5a5":"rgba(255,255,255,.6)", textAlign:"left", fontFamily:"inherit", transition:"all .15s" }}>
                  <div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${reason===r?"#ef4444":"rgba(255,255,255,.2)"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {reason===r && <div style={{ width:8, height:8, borderRadius:"50%", background:"#ef4444" }}/>}
                  </div>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onClose} style={{ flex:1, padding:"12px", borderRadius:12, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.7)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              Keep my plan
            </button>
            <button onClick={confirmCancellation} disabled={!reason||loading} style={{ flex:1, padding:"12px", borderRadius:12, background:(!reason||loading)?"rgba(255,255,255,.05)":"linear-gradient(135deg,#ef4444,#dc2626)", border:"none", color:(!reason||loading)?"rgba(255,255,255,.3)":"white", fontSize:13, fontWeight:700, cursor:(!reason||loading)?"not-allowed":"pointer", fontFamily:"inherit", transition:"all .2s" }}>
              {loading ? "CancelingÃ¢â‚¬Â¦" : "Yes, Cancel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Add Card Modal Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
function AddCardModal({ onClose, onSuccess }: { onClose:()=>void; onSuccess?:(card:PaymentMethod)=>void }) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry]         = useState("");
  const [cvc, setCvc]               = useState("");
  const [name, setName]             = useState("");
  const [address, setAddress]       = useState("");
  const [city, setCity]             = useState("");
  const [zip, setZip]               = useState("");
  const [country, setCountry]       = useState("US");
  const [saving, setSaving]         = useState(false);
  const [step, setStep]             = useState<"card"|"billing">("card");

  const brand    = detectBrand(cardNumber);
  const brandCfg = CARD_BRANDS[brand] ?? CARD_BRANDS.unknown;

  const inp: React.CSSProperties = { width:"100%", padding:"12px 14px", borderRadius:11, border:"1.5px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.05)", color:"white", fontSize:13, outline:"none", fontFamily:"inherit", transition:"border-color .2s" };
  const lbl: React.CSSProperties = { fontSize:10, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:".08em", textTransform:"uppercase" as const, display:"block", marginBottom:6 };

  async function handleSave() {
    if (!cardNumber.replace(/\s/g,"") || !expiry || !name) { toast.error("Fill in card number, expiry, and name."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/billing/payment-methods", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ cardNumber, expiry, holderName:name, cvc, address, city, zip, country }) });
      const data = await res.json().catch(()=>({}));
      if (res.ok && data?.paymentMethod) { toast.success("Payment method added!"); onSuccess?.(data.paymentMethod); onClose(); }
      else toast.error(data?.error || "Failed to add card.");
    } catch { toast.error("Network error. Please try again."); }
    setSaving(false);
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.72)", backdropFilter:"blur(6px)" }}/>
      <div style={{ position:"relative", width:"100%", maxWidth:500, background:"#0f1630", borderRadius:24, border:"1px solid rgba(255,255,255,.1)", boxShadow:"0 32px 80px rgba(0,0,0,.5)", overflow:"hidden" }}>
        <div style={{ height:3, background:"linear-gradient(90deg,#6366f1,#8b5cf6,#d946ef)" }}/>
        <div style={{ padding:"22px 28px", borderBottom:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:"white" }}>Add Payment Method</h2>
            <p style={{ margin:"3px 0 0", fontSize:12, color:"rgba(255,255,255,.4)" }}>Encrypted &amp; secure Ã¢â‚¬â€ we never store full card numbers</p>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:"1px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.04)", cursor:"pointer", fontSize:16, color:"rgba(255,255,255,.5)", display:"flex", alignItems:"center", justifyContent:"center" }}>Ã¢Å“â€¢</button>
        </div>
        <div style={{ padding:"22px 28px 28px" }}>
          <div style={{ display:"flex", gap:5, marginBottom:22, padding:4, background:"rgba(255,255,255,.05)", borderRadius:12 }}>
            {(["card","billing"] as const).map(s => (
              <button key={s} onClick={() => setStep(s)} style={{ flex:1, padding:"8px", borderRadius:9, border:"none", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit", transition:"all .15s", background:step===s?"rgba(255,255,255,.1)":"transparent", color:step===s?"white":"rgba(255,255,255,.35)" }}>
                {s==="card" ? "Ã°Å¸â€™Â³ Card Details" : "Ã°Å¸â€œÂ Billing Address"}
              </button>
            ))}
          </div>

          {step === "card" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ height:100, borderRadius:14, background:brandCfg.grad, padding:"16px 20px", position:"relative", overflow:"hidden", boxShadow:"0 8px 28px rgba(0,0,0,.3)" }}>
                <div style={{ position:"absolute", top:-20, right:-20, width:110, height:110, borderRadius:"50%", background:"rgba(255,255,255,.06)" }}/>
                <div style={{ width:28, height:20, borderRadius:4, background:"linear-gradient(135deg,#fbbf24,#d97706)", marginBottom:10 }}/>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                  <div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,.9)", fontFamily:"monospace", letterSpacing:2 }}>{cardNumber || "Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢ Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢ Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢ Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢"}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", marginTop:4 }}>{name || "CARDHOLDER NAME"} &nbsp; {expiry || "MM/YY"}</div>
                  </div>
                  <div style={{ fontSize:9, fontWeight:900, color:"rgba(255,255,255,.45)", letterSpacing:1 }}>{brandCfg.label}</div>
                </div>
              </div>
              <div><label style={lbl}>Card Number</label><input value={cardNumber} onChange={e=>setCardNumber(formatCardNumber(e.target.value))} placeholder="1234 5678 9012 3456" maxLength={19} style={{...inp,fontFamily:"monospace",letterSpacing:2}}/></div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><label style={lbl}>Expiry Date</label><input value={expiry} onChange={e=>setExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" maxLength={5} style={inp}/></div>
                <div><label style={lbl}>CVC / CVV</label><input value={cvc} onChange={e=>setCvc(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢" type="password" maxLength={4} style={inp}/></div>
              </div>
              <div><label style={lbl}>Cardholder Name</label><input value={name} onChange={e=>setName(e.target.value.toUpperCase())} placeholder="AS IT APPEARS ON CARD" style={{...inp,textTransform:"uppercase"}}/></div>
              <button onClick={() => setStep("billing")} style={{ width:"100%", padding:"12px", borderRadius:12, background:"linear-gradient(135deg,#6366f1,#7c3aed)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                Continue to Billing Address Ã¢â€ â€™
              </button>
            </div>
          )}

          {step === "billing" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div><label style={lbl}>Billing Address</label><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="123 Main Street" style={inp}/></div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><label style={lbl}>City</label><input value={city} onChange={e=>setCity(e.target.value)} placeholder="New York" style={inp}/></div>
                <div><label style={lbl}>ZIP / Postal</label><input value={zip} onChange={e=>setZip(e.target.value)} placeholder="10001" style={inp}/></div>
              </div>
              <div><label style={lbl}>Country</label>
                <select value={country} onChange={e=>setCountry(e.target.value)} style={{...inp,cursor:"pointer"}}>
                  {[["US","United States"],["GB","United Kingdom"],["AE","UAE"],["CA","Canada"],["AU","Australia"],["PK","Pakistan"],["IN","India"],["SG","Singapore"],["DE","Germany"],["NG","Nigeria"],["OTHER","Other"]].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div style={{ padding:"12px 14px", borderRadius:12, background:"rgba(52,211,153,.07)", border:"1px solid rgba(52,211,153,.18)", display:"flex", alignItems:"center", gap:10, fontSize:11, color:"#6ee7b7" }}>
                Ã°Å¸â€â€™ 256-bit SSL Ã¢â‚¬â€ we never store your full card number
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setStep("card")} style={{ flex:1, padding:"12px", borderRadius:12, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.7)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Ã¢â€ Â Back</button>
                <button onClick={handleSave} disabled={saving} style={{ flex:2, padding:"12px", borderRadius:12, background:saving?"rgba(255,255,255,.06)":"linear-gradient(135deg,#6366f1,#7c3aed)", border:"none", color:saving?"rgba(255,255,255,.3)":"white", fontSize:13, fontWeight:700, cursor:saving?"wait":"pointer", fontFamily:"inherit" }}>
                  {saving ? "SavingÃ¢â‚¬Â¦" : "Save Payment Method"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
   MAIN PAGE
Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */
function BillingPage() {
  const searchParams = useSearchParams();
  const upgraded = searchParams?.get("upgrade") === "success";

  const [subscription,      setSubscription]      = useState<Subscription | null>(null);
  const [paymentMethods,    setPaymentMethods]    = useState<PaymentMethod[]>([]);
  const [invoices,          setInvoices]          = useState<Invoice[]>([]);
  const [showAddCard,       setShowAddCard]        = useState(false);
  const [showCancel,        setShowCancel]         = useState(false);
  const [billing,           setBillingToggle]      = useState<"monthly"|"annual">("monthly");
  const [loading,           setLoading]            = useState(true);
  const [checkingOut,       setCheckingOut]        = useState<string | null>(null);
  const [showUpgradeBanner, setShowUpgradeBanner]  = useState(upgraded);
  const [activeTab,         setActiveTab]          = useState<"overview"|"methods"|"invoices"|"plans">("overview");

  useEffect(() => {
    (async () => {
      try {
        const u = getCurrentUser();
        const h: Record<string,string> = {};
        if (u?.role)      h["x-user-role"]  = u.role;
        if (u?.id)        h["x-user-id"]    = u.id;
        if (u?.companyId) h["x-company-id"] = u.companyId;

        const [meRes, pmRes, invRes] = await Promise.all([
          fetch("/api/me/company",              { cache:"no-store", headers:h, credentials:"include" }),
          fetch("/api/billing/payment-methods", { cache:"no-store", headers:h, credentials:"include" }),
          fetch("/api/billing/invoices",        { cache:"no-store", headers:h, credentials:"include" }),
        ]);

        if (meRes.ok) {
          const d = await meRes.json();
          const planUpper = (d.plan || "STARTER").toUpperCase();
          const amountMap: Record<string,number> = { STARTER:49, PRO:99, PROFESSIONAL:99, ENTERPRISE:249 };
          setSubscription({ plan:planUpper, status:d.subscriptionStatus||"active", currentPeriodEnd:d.currentPeriodEnd||null, amount:amountMap[planUpper]??49, currency:"USD", introOfferClaimed:!!d.introOfferClaimed, billingCycle:d.billingCycle||"monthly" });
        }
        if (pmRes.ok)  { const d = await pmRes.json();  setPaymentMethods(d.paymentMethods || []); }
        if (invRes.ok) { const d = await invRes.json(); setInvoices(d.invoices || []); }
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, []);

  async function handleCheckout(planCode: string, cycle = "monthly") {
    setCheckingOut(planCode);
    const u = getCurrentUser();
    const h: Record<string,string> = { "Content-Type":"application/json" };
    if (u?.role)      h["x-user-role"]  = u.role;
    if (u?.id)        h["x-user-id"]    = u.id;
    if (u?.companyId) h["x-company-id"] = u.companyId;
    const r = await fetch("/api/billing/checkout", { method:"POST", headers:h, credentials:"include", body:JSON.stringify({ planCode, successUrl:`${window.location.origin}/dashboard/billing?upgrade=success`, billingCycle:cycle }) });
    const j = await r.json().catch(()=>({}));
    if (r.ok && j?.url) window.location.assign(j.url);
    else toast.error(j?.error || "Failed to change plan.");
    setCheckingOut(null);
  }

  async function handleCancel(reason: string) {
    const u = getCurrentUser();
    const h: Record<string,string> = { "Content-Type":"application/json" };
    if (u?.role)      h["x-user-role"]  = u.role;
    if (u?.id)        h["x-user-id"]    = u.id;
    if (u?.companyId) h["x-company-id"] = u.companyId;
    const r = await fetch("/api/billing/cancel", { method:"POST", headers:h, credentials:"include", body:JSON.stringify({ reason }) });
    if (r.ok) {
      setSubscription(prev => prev ? { ...prev, status:"canceled" } : prev);
      setShowCancel(false);
      toast.success("Subscription canceled. Active until period end.");
    } else {
      const d = await r.json().catch(()=>({}));
      toast.error(d?.error || "Failed to cancel.");
    }
  }

  async function removeCard(id: string) {
    const res = await fetch(`/api/billing/payment-methods?id=${id}`, { method:"DELETE" });
    if (res.ok) {
      setPaymentMethods(prev => {
        const f = prev.filter(p => p.id !== id);
        if (f.length > 0 && !f.some(p => p.isDefault)) f[0] = { ...f[0], isDefault:true };
        return f;
      });
      toast.success("Card removed.");
    } else toast.error("Failed to remove card.");
  }

  async function setDefaultCard(id: string) {
    const res = await fetch("/api/billing/payment-methods", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id }) });
    if (res.ok) { setPaymentMethods(prev => prev.map(p => ({ ...p, isDefault:p.id===id }))); toast.success("Default updated."); }
    else toast.error("Failed to update default.");
  }

  const currentPlanCode = subscription?.plan?.toUpperCase() ?? "STARTER";
  const currentPlan     = PLANS.find(p => p.code === currentPlanCode) ?? PLANS[0];
  const isCanceled      = subscription?.status?.toLowerCase() === "canceled";

  if (loading) return (
    <div style={{ padding:"32px 28px", fontFamily:"'Outfit',sans-serif" }}>
      {[1,2,3].map(i => <div key={i} style={{ height:80, borderRadius:16, background:"rgba(255,255,255,.05)", marginBottom:16, animation:"pulse 1.5s infinite" }}/>)}
    </div>
  );

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding:"9px 18px", borderRadius:10, border:"none", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit", transition:"all .15s",
    background: active ? "rgba(99,102,241,.18)" : "transparent",
    color: active ? "#a5b4fc" : "rgba(255,255,255,.4)",
  });

  const card: React.CSSProperties = {
    borderRadius:20, border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.03)",
    overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,.12)",
  };

  return (
    <div style={{ padding:"28px 28px 80px", maxWidth:1050, margin:"0 auto", fontFamily:"'Outfit','DM Sans',sans-serif", color:"white" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        input:focus,select:focus{border-color:rgba(99,102,241,.6)!important;box-shadow:0 0 0 3px rgba(99,102,241,.12)!important;outline:none!important}
        input::placeholder,select::placeholder{color:rgba(255,255,255,.2)!important}
        select option{background:#1e293b;color:white}
        .plan-card{border-radius:20px;border:1.5px solid rgba(255,255,255,.08);padding:26px 22px;transition:transform .2s,box-shadow .2s;background:rgba(255,255,255,.03);position:relative}
        .plan-card:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,.2)}
        .row-hover:hover{background:rgba(255,255,255,.03)!important}
        @media(max-width:860px){.bill-stats{grid-template-columns:repeat(2,1fr)!important}.bill-plans{grid-template-columns:1fr!important}.bill-sub-inner{flex-direction:column!important}}
        @media(max-width:540px){.bill-stats{grid-template-columns:1fr!important}}
      `}</style>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Success Banner Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {showUpgradeBanner && (
        <div style={{ marginBottom:20, padding:"16px 20px", borderRadius:16, background:"rgba(52,211,153,.08)", border:"1.5px solid rgba(52,211,153,.22)", display:"flex", alignItems:"center", gap:14, animation:"fadeUp .4s ease" }}>
          <div style={{ width:42, height:42, borderRadius:12, background:"rgba(52,211,153,.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>Ã°Å¸Å½â€°</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:800, color:"#34d399" }}>Plan activated successfully!</div>
            <div style={{ fontSize:12, color:"rgba(52,211,153,.7)", marginTop:2 }}>Your subscription is now active. Add a payment method below for uninterrupted service.</div>
          </div>
          <button onClick={() => setShowUpgradeBanner(false)} style={{ width:28, height:28, borderRadius:8, border:"1px solid rgba(52,211,153,.22)", background:"transparent", cursor:"pointer", fontSize:14, color:"#34d399" }}>Ã¢Å“â€¢</button>
        </div>
      )}

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Page header Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:800, letterSpacing:"-0.6px" }}>Billing &amp; Payments</h1>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"rgba(255,255,255,.4)" }}>Manage your subscription, payment methods, and invoices</p>
        </div>
        <button onClick={() => setShowAddCard(true)} style={{ padding:"9px 18px", borderRadius:11, background:"linear-gradient(135deg,#6366f1,#7c3aed)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          + Add Card
        </button>
      </div>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Stats row Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div className="bill-stats" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
        {[
          { label:"Current Plan",   value: currentPlan.name,                          icon: currentPlan.icon, color: currentPlan.color },
          { label:"Status",         value: subscription?.status||"Ã¢â‚¬â€",                 icon: "Ã¢â€”Â",              color: "#34d399", isStatus:true },
          { label:"Next Renewal",   value: subscription?.currentPeriodEnd ? fmtDate(subscription.currentPeriodEnd) : "Ã¢â‚¬â€", icon:"Ã°Å¸â€œâ€¦", color:"#fbbf24" },
          { label:"Monthly Amount", value: subscription ? `$${subscription.amount}/mo` : "Ã¢â‚¬â€",                 icon: "Ã°Å¸â€™Â°",             color: "#38bdf8" },
        ].map(s => (
          <div key={s.label} style={{ padding:"17px 18px", borderRadius:16, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:`${s.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.3)", letterSpacing:".06em", textTransform:"uppercase" }}>{s.label}</div>
              <div style={{ fontSize:14, fontWeight:800, marginTop:3 }}>
                {(s as {isStatus?:boolean}).isStatus ? <StatusBadge status={s.value.toLowerCase()} /> : s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Tabs Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div style={{ display:"flex", gap:4, marginBottom:24, padding:5, borderRadius:14, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", width:"fit-content", overflowX:"auto" }}>
        {([
          { id:"overview", label:"Ã°Å¸â€œÅ  Overview" },
          { id:"plans",    label:"Ã°Å¸Å¡â‚¬ Plans" },
          { id:"methods",  label:"Ã°Å¸â€™Â³ Payment Methods" },
          { id:"invoices", label:"Ã°Å¸Â§Â¾ Invoices" },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabBtn(activeTab===t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Ã¢â€¢ÂÃ¢â€¢Â OVERVIEW TAB Ã¢â€¢ÂÃ¢â€¢Â */}
      {activeTab === "overview" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20, animation:"fadeUp .35s ease" }}>

          {/* Subscription */}
          <div style={{ ...card }}>
            <div style={{ height:3, background:`linear-gradient(90deg,${currentPlan.gradFrom},${currentPlan.gradTo})` }}/>
            <div style={{ padding:"24px 28px" }}>
              <div className="bill-sub-inner" style={{ display:"flex", alignItems:"flex-start", gap:24, flexWrap:"wrap" }}>
                {/* Plan badge */}
                <div style={{ padding:"20px 24px", borderRadius:16, background:`linear-gradient(135deg,${currentPlan.gradFrom}18,${currentPlan.gradTo}10)`, border:`1px solid ${currentPlan.color}22`, textAlign:"center", minWidth:150 }}>
                  <div style={{ fontSize:30, marginBottom:6 }}>{currentPlan.icon}</div>
                  <div style={{ fontSize:19, fontWeight:900, color:currentPlan.color }}>{currentPlan.name}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginTop:4 }}>${currentPlan.monthlyPrice}<span style={{ fontSize:11 }}>/mo</span></div>
                  {isCanceled && <div style={{ marginTop:8, padding:"3px 10px", borderRadius:99, background:"rgba(239,68,68,.12)", border:"1px solid rgba(239,68,68,.22)", fontSize:10, fontWeight:700, color:"#f87171", display:"inline-block" }}>CANCELED</div>}
                </div>
                {/* Details */}
                <div style={{ flex:1, display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:18 }}>
                  {[
                    { label:"Status",        node: <StatusBadge status={subscription?.status?.toLowerCase()||"active"} /> },
                    { label:"Billing Cycle", node: <span style={{ fontSize:14, fontWeight:800 }}>{subscription?.billingCycle==="yearly"?"Yearly":"Monthly"}</span> },
                    { label:"Renewal Date",  node: <span style={{ fontSize:14, fontWeight:800 }}>{subscription?.currentPeriodEnd ? fmtDate(subscription.currentPeriodEnd) : "Ã¢â‚¬â€"}</span> },
                    { label:"Currency",      node: <span style={{ fontSize:14, fontWeight:800 }}>USD</span> },
                  ].map(r => (
                    <div key={r.label}>
                      <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.3)", letterSpacing:".06em", textTransform:"uppercase", marginBottom:7 }}>{r.label}</div>
                      {r.node}
                    </div>
                  ))}
                </div>
                {/* Actions */}
                <div style={{ display:"flex", flexDirection:"column", gap:8, minWidth:180 }}>
                  {!isCanceled ? (
                    <>
                      <button onClick={() => handleCheckout(currentPlanCode==="ENTERPRISE"?"PROFESSIONAL":currentPlanCode==="PROFESSIONAL"?"ENTERPRISE":"PROFESSIONAL")} disabled={!!checkingOut}
                        style={{ padding:"11px 20px", borderRadius:12, background:`linear-gradient(135deg,${currentPlan.gradFrom},${currentPlan.gradTo})`, border:"none", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:checkingOut?.5:1 }}>
                        {checkingOut ? "ProcessingÃ¢â‚¬Â¦" : currentPlanCode==="ENTERPRISE" ? "Manage Plan" : `Upgrade to ${currentPlanCode==="PROFESSIONAL"?"Enterprise":"Professional"} Ã¢â€ â€™`}
                      </button>
                      <button onClick={() => setActiveTab("plans")} style={{ padding:"10px 20px", borderRadius:12, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.09)", color:"rgba(255,255,255,.6)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                        View all plans
                      </button>
                      <button onClick={() => setShowCancel(true)} style={{ padding:"10px 20px", borderRadius:12, background:"rgba(239,68,68,.07)", border:"1px solid rgba(239,68,68,.18)", color:"#f87171", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                        Cancel Subscription
                      </button>
                    </>
                  ) : (
                    <button onClick={() => handleCheckout(currentPlanCode)} style={{ padding:"12px 20px", borderRadius:12, background:"linear-gradient(135deg,#6366f1,#7c3aed)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      Reactivate Plan Ã¢â€ â€™
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent invoices */}
          <div style={{ ...card }}>
            <div style={{ padding:"18px 24px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:15, fontWeight:800 }}>Recent Invoices</div>
              <button onClick={() => setActiveTab("invoices")} style={{ fontSize:12, fontWeight:600, color:"#a5b4fc", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>View all Ã¢â€ â€™</button>
            </div>
            {invoices.length === 0 ? (
              <div style={{ padding:"32px 24px", textAlign:"center", color:"rgba(255,255,255,.3)" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>Ã°Å¸Â§Â¾</div>
                <div style={{ fontSize:13, fontWeight:600 }}>No invoices yet</div>
              </div>
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>{["Invoice #","Date","Plan","Amount","Status",""].map(h=><th key={h} style={{ padding:"10px 20px", textAlign:"left", fontSize:10, fontWeight:700, color:"rgba(255,255,255,.3)", letterSpacing:".06em", textTransform:"uppercase", borderBottom:"1px solid rgba(255,255,255,.05)" }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {invoices.slice(0,3).map((inv,i) => (
                      <tr key={inv.id} className="row-hover" style={{ borderBottom:i<Math.min(invoices.length,3)-1?"1px solid rgba(255,255,255,.04)":"none" }}>
                        <td style={{ padding:"13px 20px", fontSize:12, fontWeight:700, color:"rgba(255,255,255,.8)", fontFamily:"monospace" }}>{inv.number}</td>
                        <td style={{ padding:"13px 20px", fontSize:12, color:"rgba(255,255,255,.4)" }}>{inv.date}</td>
                        <td style={{ padding:"13px 20px", fontSize:12, color:"rgba(255,255,255,.65)" }}>{inv.plan}</td>
                        <td style={{ padding:"13px 20px", fontSize:12, fontWeight:700 }}>${inv.amount}.00</td>
                        <td style={{ padding:"13px 20px" }}><StatusBadge status={inv.status}/></td>
                        <td style={{ padding:"13px 20px" }}><button onClick={() => toast("PDF download coming soon.")} style={{ padding:"4px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.04)", fontSize:11, fontWeight:600, color:"rgba(255,255,255,.45)", cursor:"pointer", fontFamily:"inherit" }}>Ã¢Â¬â€¡ PDF</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment methods preview */}
          <div style={{ ...card }}>
            <div style={{ padding:"18px 24px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:15, fontWeight:800 }}>Payment Methods</div>
              <button onClick={() => setActiveTab("methods")} style={{ fontSize:12, fontWeight:600, color:"#a5b4fc", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>Manage Ã¢â€ â€™</button>
            </div>
            {paymentMethods.length === 0 ? (
              <div style={{ padding:"28px 24px", textAlign:"center" }}>
                <div style={{ fontSize:26, marginBottom:8 }}>Ã°Å¸â€™Â³</div>
                <div style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,.4)", marginBottom:12 }}>No payment methods saved</div>
                <button onClick={() => setShowAddCard(true)} style={{ padding:"9px 20px", borderRadius:10, background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.3)", color:"#a5b4fc", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>+ Add Card</button>
              </div>
            ) : paymentMethods.slice(0,2).map(pm => {
              const cfg = CARD_BRANDS[pm.brand] ?? CARD_BRANDS.unknown;
              return (
                <div key={pm.id} className="row-hover" style={{ padding:"14px 24px", display:"flex", alignItems:"center", gap:16, borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                  <div style={{ width:52, height:34, borderRadius:8, background:cfg.grad, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:900, color:"rgba(255,255,255,.5)", letterSpacing:1, flexShrink:0 }}>{cfg.label}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>{cfg.label} Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢ {pm.last4}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:2 }}>Expires {String(pm.expMonth).padStart(2,"0")}/{pm.expYear}</div>
                  </div>
                  {pm.isDefault && <span style={{ padding:"2px 8px", borderRadius:8, background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.28)", fontSize:10, fontWeight:700, color:"#a5b4fc" }}>DEFAULT</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ã¢â€¢ÂÃ¢â€¢Â PLANS TAB Ã¢â€¢ÂÃ¢â€¢Â */}
      {activeTab === "plans" && (
        <div style={{ animation:"fadeUp .35s ease" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22, flexWrap:"wrap", gap:12 }}>
            <div>
              <h2 style={{ margin:0, fontSize:18, fontWeight:800 }}>Available Plans</h2>
              <p style={{ margin:"4px 0 0", fontSize:13, color:"rgba(255,255,255,.4)" }}>Upgrade, downgrade, or switch billing cycle anytime</p>
            </div>
            <div style={{ display:"flex", gap:5, padding:4, borderRadius:12, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.07)" }}>
              {(["monthly","annual"] as const).map(t => (
                <button key={t} onClick={() => setBillingToggle(t)} style={{ padding:"8px 16px", borderRadius:9, border:"none", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit", transition:"all .15s", background:billing===t?"rgba(255,255,255,.12)":"transparent", color:billing===t?"white":"rgba(255,255,255,.35)" }}>
                  {t==="monthly" ? "Monthly" : "Annual (Save 20%)"}
                </button>
              ))}
            </div>
          </div>

          <div className="bill-plans" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18 }}>
            {PLANS.map(plan => {
              const isCurrent = currentPlanCode === plan.code;
              const price     = billing === "annual" ? Math.round(plan.monthlyPrice * 0.8) : plan.monthlyPrice;
              const planIdx   = PLANS.findIndex(p=>p.code===plan.code);
              const curIdx    = PLANS.findIndex(p=>p.code===currentPlanCode);
              const isHigher  = planIdx > curIdx;
              const isLower   = planIdx < curIdx;

              return (
                <div key={plan.code} className="plan-card" style={{ border:isCurrent?`2px solid ${plan.color}40`:plan.popular?`2px solid ${plan.color}28`:undefined }}>
                  {plan.popular && !isCurrent && <div style={{ position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", padding:"3px 12px", borderRadius:99, background:`linear-gradient(135deg,${plan.gradFrom},${plan.gradTo})`, fontSize:10, fontWeight:800, color:"white", whiteSpace:"nowrap" }}>Ã¢Â­Â Most Popular</div>}
                  {isCurrent && <div style={{ marginBottom:12 }}><span style={{ padding:"3px 10px", borderRadius:99, background:`${plan.color}18`, color:plan.color, fontSize:10, fontWeight:800 }}>Ã¢Å“â€œ Current Plan</span></div>}
                  <div style={{ fontSize:28, marginBottom:8 }}>{plan.icon}</div>
                  <h3 style={{ margin:"0 0 4px", fontSize:18, fontWeight:800 }}>{plan.name}</h3>
                  <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:4 }}>
                    <span style={{ fontSize:30, fontWeight:900, color:plan.color }}>${price}</span>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>/ mo{billing==="annual"?" Ã‚Â· billed annually":""}</span>
                  </div>
                  {billing==="annual" && <div style={{ fontSize:11, color:"rgba(52,211,153,.7)", marginBottom:14, fontWeight:600 }}>Save ${Math.round(plan.monthlyPrice*12 - plan.monthlyPrice*0.8*12)}/year</div>}
                  <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:22, marginTop:billing==="annual"?0:14 }}>
                    {plan.features.map(f => <div key={f} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"rgba(255,255,255,.7)" }}><span style={{ color:"#34d399", flexShrink:0 }}>Ã¢Å“â€œ</span>{f}</div>)}
                    {plan.notIncluded.map(f => <div key={f} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"rgba(255,255,255,.22)" }}><span style={{ flexShrink:0, opacity:.4 }}>Ã¢Å“â€¢</span>{f}</div>)}
                  </div>
                  <button onClick={() => !isCurrent && handleCheckout(plan.code, billing==="annual"?"yearly":"monthly")} disabled={isCurrent||!!checkingOut}
                    style={{ width:"100%", padding:"12px", borderRadius:12, border:"none", fontSize:13, fontWeight:700, cursor:isCurrent?"default":"pointer", fontFamily:"inherit", transition:"all .2s", background:isCurrent?"rgba(255,255,255,.06)":`linear-gradient(135deg,${plan.gradFrom},${plan.gradTo})`, color:isCurrent?"rgba(255,255,255,.3)":"white", boxShadow:isCurrent?"none":`0 4px 20px ${plan.color}28`, opacity:checkingOut&&checkingOut!==plan.code?.5:1 }}>
                    {checkingOut===plan.code ? "ProcessingÃ¢â‚¬Â¦" : isCurrent ? "Current Plan" : isHigher ? `Upgrade to ${plan.name} Ã¢â€ â€™` : isLower ? `Downgrade to ${plan.name}` : `Select ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ã¢â€¢ÂÃ¢â€¢Â PAYMENT METHODS TAB Ã¢â€¢ÂÃ¢â€¢Â */}
      {activeTab === "methods" && (
        <div style={{ animation:"fadeUp .35s ease" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
            <div>
              <h2 style={{ margin:0, fontSize:18, fontWeight:800 }}>Payment Methods</h2>
              <p style={{ margin:"4px 0 0", fontSize:13, color:"rgba(255,255,255,.4)" }}>Cards saved for automatic renewal</p>
            </div>
            <button onClick={() => setShowAddCard(true)} style={{ padding:"9px 18px", borderRadius:11, background:"linear-gradient(135deg,#6366f1,#7c3aed)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>+ Add Card</button>
          </div>
          <div style={{ ...card }}>
            {paymentMethods.length === 0 ? (
              <div style={{ padding:"52px 24px", textAlign:"center" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>Ã°Å¸â€™Â³</div>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>No payment methods</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.35)", marginBottom:20 }}>Add a card for uninterrupted service</div>
                <button onClick={() => setShowAddCard(true)} style={{ padding:"10px 24px", borderRadius:12, background:"linear-gradient(135deg,#6366f1,#7c3aed)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>+ Add Payment Method</button>
              </div>
            ) : paymentMethods.map((pm, i) => {
              const cfg = CARD_BRANDS[pm.brand] ?? CARD_BRANDS.unknown;
              return (
                <div key={pm.id} className="row-hover" style={{ padding:"18px 24px", display:"flex", alignItems:"center", gap:18, borderBottom:i<paymentMethods.length-1?"1px solid rgba(255,255,255,.05)":"none" }}>
                  <div style={{ width:72, height:46, borderRadius:10, background:cfg.grad, padding:"8px 12px", position:"relative", flexShrink:0, boxShadow:"0 4px 16px rgba(0,0,0,.25)" }}>
                    <div style={{ width:18, height:13, borderRadius:3, background:"linear-gradient(135deg,#fbbf24,#d97706)", marginBottom:5, opacity:.9 }}/>
                    <div style={{ fontSize:8, color:"rgba(255,255,255,.75)", fontFamily:"monospace", letterSpacing:1.5 }}>Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢ {pm.last4}</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontWeight:700, fontSize:14 }}>{cfg.label} ending in {pm.last4}</span>
                      {pm.isDefault && <span style={{ padding:"2px 8px", borderRadius:8, background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.28)", fontSize:10, fontWeight:700, color:"#a5b4fc" }}>DEFAULT</span>}
                    </div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginTop:3 }}>{pm.holderName} Ã‚Â· Expires {String(pm.expMonth).padStart(2,"0")}/{pm.expYear}</div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    {!pm.isDefault && <button onClick={() => setDefaultCard(pm.id)} style={{ fontSize:11, fontWeight:600, padding:"6px 14px", borderRadius:9, border:"1px solid rgba(255,255,255,.09)", background:"rgba(255,255,255,.04)", color:"rgba(255,255,255,.55)", cursor:"pointer", fontFamily:"inherit" }}>Set Default</button>}
                    <button onClick={() => removeCard(pm.id)} style={{ fontSize:11, fontWeight:600, padding:"6px 14px", borderRadius:9, border:"1px solid rgba(239,68,68,.22)", background:"rgba(239,68,68,.06)", color:"#f87171", cursor:"pointer", fontFamily:"inherit" }}>Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Processor badges */}
          <div style={{ marginTop:18, padding:"16px 20px", borderRadius:14, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.28)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:10 }}>Accepted Payment Methods</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {["Visa","Mastercard","Amex","Discover","PayPal","Apple Pay","Google Pay","JazzCash","Easypaisa","Wise","Bitcoin","Ethereum","USDT","Klarna"].map(p => (
                <div key={p} style={{ padding:"4px 11px", borderRadius:7, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", fontSize:11, fontWeight:600, color:"rgba(255,255,255,.45)" }}>{p}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ã¢â€¢ÂÃ¢â€¢Â INVOICES TAB Ã¢â€¢ÂÃ¢â€¢Â */}
      {activeTab === "invoices" && (
        <div style={{ animation:"fadeUp .35s ease" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
            <div>
              <h2 style={{ margin:0, fontSize:18, fontWeight:800 }}>Invoice History</h2>
              <p style={{ margin:"4px 0 0", fontSize:13, color:"rgba(255,255,255,.4)" }}>All past and upcoming billing records</p>
            </div>
            <button onClick={() => toast("CSV export coming soon.")} style={{ padding:"9px 16px", borderRadius:11, border:"1px solid rgba(255,255,255,.09)", background:"rgba(255,255,255,.04)", color:"rgba(255,255,255,.55)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Ã¢Â¬â€¡ Export CSV</button>
          </div>
          <div style={{ ...card }}>
            {invoices.length === 0 ? (
              <div style={{ padding:"52px 24px", textAlign:"center" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>Ã°Å¸Â§Â¾</div>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>No invoices yet</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.35)" }}>Billing history will appear here once you have an active subscription</div>
              </div>
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>{["Invoice #","Date","Plan","Amount","Status","Action"].map(h=><th key={h} style={{ padding:"12px 20px", textAlign:"left", fontSize:10, fontWeight:700, color:"rgba(255,255,255,.3)", letterSpacing:".06em", textTransform:"uppercase", borderBottom:"1px solid rgba(255,255,255,.06)", whiteSpace:"nowrap" }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv,i) => (
                      <tr key={inv.id} className="row-hover" style={{ borderBottom:i<invoices.length-1?"1px solid rgba(255,255,255,.04)":"none" }}>
                        <td style={{ padding:"14px 20px", fontSize:13, fontWeight:700, color:"rgba(255,255,255,.85)", fontFamily:"monospace" }}>{inv.number}</td>
                        <td style={{ padding:"14px 20px", fontSize:13, color:"rgba(255,255,255,.4)" }}>{inv.date}</td>
                        <td style={{ padding:"14px 20px", fontSize:13, color:"rgba(255,255,255,.65)" }}>{inv.plan}</td>
                        <td style={{ padding:"14px 20px", fontSize:13, fontWeight:700 }}>${inv.amount}.00 {inv.currency}</td>
                        <td style={{ padding:"14px 20px" }}><StatusBadge status={inv.status}/></td>
                        <td style={{ padding:"14px 20px" }}><button onClick={() => toast("PDF download coming soon.")} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.04)", fontSize:11, fontWeight:600, color:"rgba(255,255,255,.45)", cursor:"pointer", fontFamily:"inherit" }}>Ã¢Â¬â€¡ PDF</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Modals Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {showAddCard && <AddCardModal onClose={() => setShowAddCard(false)} onSuccess={c => setPaymentMethods(prev => [...prev, c])} />}
      {showCancel  && <CancelModal planName={currentPlan.name} onClose={() => setShowCancel(false)} onConfirm={handleCancel} />}
    </div>
  );
}

export default function BillingPageWrapper() {
  return (
    <Suspense fallback={<div style={{ padding:32, fontFamily:"Outfit,sans-serif", color:"white" }}>Loading...</div>}>
      <BillingPage />
    </Suspense>
  );
}
