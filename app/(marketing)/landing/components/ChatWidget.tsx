"use client";
import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  sender: "customer" | "bot";
  text: string;
  created_at: string;
  suggestions?: string[];
};

/* ─── Built-in knowledge base (works 100% offline / without server) ─────── */
const KB: [RegExp, string][] = [
  [/what is finova|finova kya|ye kya|about finova|kaun sa|introduce|explain finova/i,
   "FinovaOS is a complete cloud-based Business OS for SMEs. It covers:\n\n• Accounting & double-entry bookkeeping\n• Sales & purchase invoicing\n• Inventory management\n• HR & Payroll\n• Banking & reconciliation\n• CRM & customer management\n• AI financial intelligence\n\nUsed by 12,000+ businesses across South Asia. 🚀"],

  [/pric|plan|cost|kitna|starter|professional|enterprise|subscription|fee|charge/i,
   "FinovaOS has 4 plans:\n\n1. **Starter** — 5 users | Core accounting + invoicing\n2. **Professional** — 25 users | + Inventory, HR, Banking, CRM\n3. **Enterprise** — Unlimited users | Full features + API + WhatsApp\n4. **Custom** — Pick only the modules you need\n\nContact us for pricing: finovaos.app@gmail.com 💰"],

  [/invoice|bill|billing|invoice kaise|banao|create invoice|sales invoice/i,
   "Creating a Sales Invoice:\n\n1. Go to Dashboard → Sales Invoice\n2. Click 'New Invoice'\n3. Select customer & add items\n4. Set quantity, price & tax\n5. Click Save → Send PDF to customer\n\nFeatures: PDF generation, email delivery, payment tracking. 📄"],

  [/inventory|stock|item|product|maal|saman|warehouse|grn/i,
   "Inventory Management in FinovaOS:\n\n• Real-time stock levels\n• Low stock alerts\n• Barcode scanning & label printing\n• Multi-warehouse support\n• Goods Receipt Notes (GRN)\n• Stock valuation (FIFO / average cost)\n\nGo to Dashboard → Inventory. 📦"],

  [/hr|payroll|salary|employee|attendance|leave|mulazim|tanahua/i,
   "HR & Payroll in FinovaOS:\n\n• Employee records & profiles\n• Daily attendance tracking\n• Leave management (casual, sick, annual)\n• Salary processing & payslips\n• Advance salary management\n\nGo to Dashboard → HR & Payroll. 👥"],

  [/bank|reconcil|payment|voucher|cpv|crv|journal|jv/i,
   "Banking & Payments in FinovaOS:\n\n• Bank account management (multiple banks)\n• Bank reconciliation\n• Payment receipts (CRV)\n• Cash payment vouchers (CPV)\n• Journal vouchers (JV)\n• Bulk payments\n\nGo to Dashboard → Banking & Payments. 🏦"],

  [/report|trial balance|p&l|profit.loss|balance sheet|ledger|hisab|tax report/i,
   "Financial Reports in FinovaOS:\n\n• Profit & Loss (P&L)\n• Balance Sheet\n• Cash Flow Statement\n• Trial Balance\n• Accounts Aging (receivable & payable)\n• Tax Summary Report\n• Export to PDF, Excel, CSV\n\nGo to Dashboard → Reports. 📊"],

  [/crm|customer|client|lead|pipeline|contact/i,
   "CRM in FinovaOS:\n\n• Customer & supplier records\n• Sales pipeline management\n• Interaction & follow-up history\n• Lead management\n• Credit limit & credit days tracking\n\nGo to Dashboard → CRM. 🤝"],

  [/ai|artificial|intelligence|smart|automation|forecast|insight/i,
   "FinovaOS AI Intelligence — 9 features:\n\n1. Business health score (0–100)\n2. Ask AI — chat with your data\n3. Financial insights & analysis\n4. Auto anomaly alerts\n5. 30/60/90-day forecast\n6. Business recommendations\n7. Monthly CEO report\n8. Market intelligence\n9. Business advisor\n\nGo to Dashboard → AI Intelligence. 🤖"],

  [/demo|trial|try|start|sign up|register|kaise shuru|get started/i,
   "Get started with FinovaOS:\n\n1. Visit finovaos.app\n2. Click 'Get Started'\n3. Set up your company\n4. Our team will guide you\n\nOr contact us:\n• Email: finovaos.app@gmail.com\n• Phone: +92 304 7653693 🚀"],

  [/contact|email|phone|support|help|madad|number/i,
   "Contact FinovaOS:\n\n• Email: finovaos.app@gmail.com\n• Phone: +92 304 7653693\n• Website: finovaos.app\n\nOr type 'human agent' to connect with our support team. 📞"],

  [/purchase|supplier|vendor|po|purchase order|buy|khareed/i,
   "Purchase Management in FinovaOS:\n\n• Purchase invoices from suppliers\n• Purchase Orders (PO) with approval\n• Goods Receipt Notes (GRN)\n• Delivery challans\n• 3-way match: PO → GRN → Invoice\n• Advance payments to suppliers\n\nGo to Dashboard → Purchases. 🛒"],

  [/multi.company|branch|multi.branch|company setup/i,
   "Multi-Company & Branch in FinovaOS:\n\n• Manage multiple companies from one login\n• Each company has separate data & accounts\n• Branch-level reporting\n• Cost centers per department\n• Available on Professional & Enterprise plans. 🏢"],

  [/security|safe|data|backup|2fa|two.factor/i,
   "FinovaOS Security:\n\n• 256-bit bank-grade encryption\n• Two-factor authentication (2FA)\n• Role-based access control\n• Daily automated backups\n• SOC 2 Type II compliant (AWS)\n• Login history & session management\n\nYour data is completely safe. 🔒"],

  [/mobile|app|android|ios|phone pe/i,
   "FinovaOS is fully responsive and works on all mobile browsers. Native iOS & Android apps are coming soon! 📱\n\nFor now, just open finovaos.app on your phone's browser."],

  [/currency|pkr|usd|rupee|dollar|exchange/i,
   "FinovaOS supports 150+ currencies including:\n• PKR (Pakistani Rupee)\n• USD, AED, GBP, EUR, SAR\n• Real-time exchange rates\n• Multi-currency invoicing\n\nPerfect for import/export businesses! 💱"],
];

const WELCOME_SUGGESTIONS = [
  "What is FinovaOS?",
  "Explain pricing plans",
  "How do I create a sales invoice?",
  "Can I get a demo?",
  "Inventory management features",
  "HR & Payroll features",
];

const TOPIC_MAP: Record<string, string[]> = {
  pricing:   ["What is included in Starter?", "Enterprise vs Professional", "Do you offer a custom plan?"],
  invoice:   ["How do I send an invoice PDF?", "How do I process a sales return?", "Purchase invoice kaise banayein?"],
  inventory: ["What is a GRN?", "Do you support multi-warehouse?", "How do I set minimum stock?"],
  hr:        ["How does payroll work?", "How is attendance tracked?", "Do you support leave management?"],
  banking:   ["What is bank reconciliation?", "What is an expense voucher?", "How do bulk payments work?"],
  reports:   ["Where can I find the P&L report?", "How to view balance sheet?", "Is tax report available?"],
  ai:        ["What is the health score?", "How does cash flow forecast work?", "Show me AI features"],
};

/* ─── Client-side answer engine ──────────────────────────────────────────── */
function getLocalAnswer(text: string): string | null {
  for (const [pattern, answer] of KB) {
    if (pattern.test(text)) return answer;
  }
  return null;
}

function detectTopic(text: string): string | null {
  const t = text.toLowerCase();
  if (/pric|plan|cost|starter|professional|enterprise/.test(t)) return "pricing";
  if (/invoice|bill|sales|purchase/.test(t)) return "invoice";
  if (/inventor|stock|warehouse|item|product/.test(t)) return "inventory";
  if (/hr|payroll|salary|employee|attend|leave/.test(t)) return "hr";
  if (/bank|reconcil|payment|voucher|expense/.test(t)) return "banking";
  if (/report|p&l|balance|cash flow|trial/.test(t)) return "reports";
  if (/ai|intelligen|forecast|insight|advisor/.test(t)) return "ai";
  return null;
}

/* ─── Server call (with timeout + fallback) ──────────────────────────────── */
async function askServer(message: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch("/api/widget-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.reply || null;
  } catch {
    return null;
  }
}

/* ─── Markdown-lite renderer ─────────────────────────────────────────────── */
function renderText(text: string): React.ReactNode[] {
  return text.split("\n").map((line, i) => {
    const trimmed = line.trimStart();
    if (!trimmed) return <span key={i} style={{ display: "block", height: 6 }} />;
    if (trimmed.startsWith("• ") || trimmed.startsWith("- ")) {
      const inner = trimmed.slice(2).replace(/\*\*(.*?)\*\*/g, "|||$1|||");
      return (
        <span key={i} style={{ display: "flex", gap: 7, padding: "1px 0", alignItems: "flex-start" }}>
          <span style={{ color: "#818cf8", flexShrink: 0, fontSize: 13 }}>•</span>
          <span style={{ color: "rgba(255,255,255,.88)", fontSize: 13.5, lineHeight: 1.75 }}>
            {inner.split("|||").map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: "white" }}>{p}</strong> : p)}
          </span>
        </span>
      );
    }
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      const inner = numMatch[2].replace(/\*\*(.*?)\*\*/g, "|||$1|||");
      return (
        <span key={i} style={{ display: "flex", gap: 8, padding: "2px 0", alignItems: "flex-start" }}>
          <span style={{ minWidth: 20, height: 20, borderRadius: "50%", background: "rgba(99,102,241,.4)", color: "#c7d2fe", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>{numMatch[1]}</span>
          <span style={{ color: "rgba(255,255,255,.88)", fontSize: 13.5, lineHeight: 1.75 }}>
            {inner.split("|||").map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: "white" }}>{p}</strong> : p)}
          </span>
        </span>
      );
    }
    const parts = trimmed.replace(/\*\*(.*?)\*\*/g, "|||$1|||").split("|||");
    return (
      <span key={i} dir="auto" style={{ display: "block", color: "rgba(255,255,255,.85)", fontSize: 13.5, lineHeight: 1.8, margin: "1px 0" }}>
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: "white" }}>{p}</strong> : p)}
      </span>
    );
  });
}

/* ─── Main Widget ─────────────────────────────────────────────────────────── */
export default function ChatWidget() {
  const [open,      setOpen]      = useState(false);
  const [step,      setStep]      = useState<"form" | "chat">("form");
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [inputVal,  setInputVal]  = useState("");
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [botTyping, setBotTyping] = useState(false);
  const [unread,    setUnread]    = useState(0);
  const [waitingHuman, setWaitingHuman] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const msgSeq = useRef(0);

  function makeId() { msgSeq.current += 1; return `m-${msgSeq.current}`; }

  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("open-chat", h);
    return () => window.removeEventListener("open-chat", h);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botTyping]);

  useEffect(() => { if (open) setUnread(0); }, [open]);

  async function startChat() {
    if (!name.trim()) return;
    setStep("chat");
    const firstName = name.split(" ")[0];
    const welcome = `Hi ${firstName}! 👋 I'm **FinovaOS AI Assistant**.\n\nI can help you with anything about FinovaOS — accounting, invoicing, inventory, HR, payroll, banking, reports, and more.\n\nAsk me anything!`;
    setMessages([{ id: makeId(), sender: "bot", text: welcome, created_at: new Date().toISOString(), suggestions: WELCOME_SUGGESTIONS }]);
    // Fire-and-forget conversation creation (non-blocking)
    fetch("/api/chat/conversations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerName: name.trim(), customerEmail: email.trim() || null }),
    }).catch(() => {});
  }

  async function sendMessage(override?: string) {
    const text = (override || inputVal).trim();
    if (!text) return;
    if (!override) setInputVal("");

    setMessages(prev => [...prev, { id: makeId(), sender: "customer", text, created_at: new Date().toISOString() }]);

    // Human escalation
    if (/human|agent|person|real|support|insaan|banda|connect|live/i.test(text)) {
      setWaitingHuman(true);
      const msg = "Connecting you to a human agent. Someone will join shortly.\n\nYou can also reach us at:\n• Email: **finovaos.app@gmail.com**\n• Phone: **+92 304 7653693**";
      setMessages(prev => [...prev, { id: makeId(), sender: "bot", text: msg, created_at: new Date().toISOString() }]);
      return;
    }

    setBotTyping(true);

    // 1. Try local knowledge base first (instant)
    const local = getLocalAnswer(text);

    // 2. Try server in parallel (max 7s)
    const serverPromise = askServer(text);

    let reply = "";

    if (local) {
      // We have a local answer — use it after a brief delay for UX
      await new Promise(r => setTimeout(r, 600));
      // Also wait for server if it responds quickly
      const server = await Promise.race([serverPromise, new Promise<null>(r => setTimeout(() => r(null), 1500))]);
      reply = (typeof server === "string" && server.length > 20) ? server : local;
    } else {
      // No local answer — wait for server (up to 7s)
      const server = await serverPromise;
      if (server) {
        reply = server;
      } else {
        // Fallback smart default
        reply = `Great question! FinovaOS covers all your business needs:\n\n• Accounting & invoicing\n• Inventory management\n• HR & Payroll\n• Banking & reconciliation\n• CRM & AI intelligence\n\nFor detailed help:\n• Email: **finovaos.app@gmail.com**\n• Phone: **+92 304 7653693**\n• Type "human agent" to chat with our team`;
      }
    }

    setBotTyping(false);
    const topic = detectTopic(text + " " + reply);
    setMessages(prev => [...prev, {
      id: makeId(), sender: "bot", text: reply,
      created_at: new Date().toISOString(),
      suggestions: topic ? TOPIC_MAP[topic] : undefined,
    }]);
    if (!open) setUnread(u => u + 1);
  }

  const handleKey      = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const handleStartKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") startChat(); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        @keyframes widgetIn  { from{opacity:0;transform:scale(.93) translateY(14px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes msgIn     { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dotBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes pulse     { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        @keyframes shimmer   { 0%{opacity:.5} 50%{opacity:1} 100%{opacity:.5} }
        .chat-msg  { animation: msgIn .2s ease both; }
        .dot1 { animation: dotBounce 1.2s ease infinite .0s; }
        .dot2 { animation: dotBounce 1.2s ease infinite .18s; }
        .dot3 { animation: dotBounce 1.2s ease infinite .36s; }
        .chat-input:focus { outline: none; }
        .chat-input::placeholder { color: rgba(255,255,255,.22); }
        .chip:hover { background: rgba(129,140,248,.25) !important; border-color: rgba(129,140,248,.6) !important; color: white !important; transform: translateY(-1px); }
        .chip { transition: all .18s; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,.3); border-radius: 99px; }
      `}</style>

      {/* ── FAB ── */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position:"fixed", bottom:24, right:24, zIndex:9999,
          width:58, height:58, borderRadius:"50%", border:"none", cursor:"pointer",
          background: open ? "rgba(255,255,255,.1)" : "linear-gradient(135deg,#6366f1,#4f46e5)",
          boxShadow: open ? "0 4px 16px rgba(0,0,0,.4)" : "0 8px 32px rgba(99,102,241,.55)",
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"all .3s cubic-bezier(.34,1.56,.64,1)",
          animation: open ? "none" : "pulse 3s ease infinite",
        }}
      >
        {unread > 0 && !open && (
          <div style={{ position:"absolute", top:-3, right:-3, minWidth:20, height:20, borderRadius:10, background:"#ef4444", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:"white", border:"2.5px solid #080c1e", padding:"0 4px" }}>
            {unread}
          </div>
        )}
        {open
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        }
      </button>

      {/* ── Chat Window ── */}
      {open && (
        <div style={{
          position:"fixed", bottom:96, right:24, zIndex:9998,
          width:390, maxWidth:"calc(100vw - 32px)",
          height:600, maxHeight:"calc(100vh - 120px)",
          borderRadius:22, overflow:"hidden",
          background:"rgba(6,9,24,.98)",
          border:"1.5px solid rgba(99,102,241,.28)",
          boxShadow:"0 32px 80px rgba(0,0,0,.75), 0 0 0 1px rgba(99,102,241,.08), inset 0 1px 0 rgba(255,255,255,.04)",
          display:"flex", flexDirection:"column",
          animation:"widgetIn .28s cubic-bezier(.22,1,.36,1) both",
          fontFamily:"'Outfit',sans-serif",
        }}>

          {/* Header */}
          <div style={{ padding:"14px 18px 13px", background:"linear-gradient(135deg,rgba(40,38,110,.95),rgba(25,22,80,.95))", borderBottom:"1px solid rgba(255,255,255,.07)", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:11 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#4f46e5,#818cf8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:19, flexShrink:0, boxShadow:"0 4px 12px rgba(99,102,241,.4)" }}>🤖</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:800, color:"white", letterSpacing:"-.2px" }}>FinovaOS Support</div>
                <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background: waitingHuman ? "#f59e0b" : "#6366f1", animation:"shimmer 2s ease infinite" }}/>
                  <span style={{ fontSize:11, color: waitingHuman ? "#fbbf24" : "#818cf8", fontWeight:600 }}>
                    {waitingHuman ? "Connecting to agent…" : "AI Assistant • Online"}
                  </span>
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.08)", borderRadius:9, cursor:"pointer", color:"rgba(255,255,255,.5)", padding:"6px 8px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          {/* Form */}
          {step === "form" && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"28px 24px", gap:16, overflowY:"auto" }}>
              <div style={{ textAlign:"center", marginBottom:4 }}>
                <div style={{ fontSize:36, marginBottom:10 }}>👋</div>
                <div style={{ fontSize:17, fontWeight:800, color:"white", marginBottom:6 }}>Welcome to FinovaOS!</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", lineHeight:1.6 }}>Enter your name to start chatting with our AI assistant.</div>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center", marginBottom:4 }}>
                {["📄 Accounting", "📦 Inventory", "👥 HR & Payroll", "🏦 Banking", "📊 Reports", "🤝 CRM"].map(f => (
                  <span key={f} style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,.4)", padding:"4px 10px", borderRadius:20, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)" }}>{f}</span>
                ))}
              </div>
              <div>
                <label style={{ fontSize:11.5, fontWeight:700, color:"rgba(255,255,255,.4)", letterSpacing:".07em", textTransform:"uppercase", display:"block", marginBottom:7 }}>Your Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} onKeyDown={handleStartKey} placeholder="e.g. Ali Raza"
                  style={{ width:"100%", padding:"11px 14px", borderRadius:11, background:"rgba(255,255,255,.05)", border:"1.5px solid rgba(255,255,255,.1)", color:"white", fontSize:14, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
                  onFocus={e=>(e.target.style.borderColor="rgba(129,140,248,.7)")} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.1)")} />
              </div>
              <div>
                <label style={{ fontSize:11.5, fontWeight:700, color:"rgba(255,255,255,.4)", letterSpacing:".07em", textTransform:"uppercase", display:"block", marginBottom:7 }}>
                  Email <span style={{ color:"rgba(255,255,255,.2)", fontWeight:400, fontSize:11 }}>(optional)</span>
                </label>
                <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleStartKey} placeholder="you@company.com" type="email"
                  style={{ width:"100%", padding:"11px 14px", borderRadius:11, background:"rgba(255,255,255,.05)", border:"1.5px solid rgba(255,255,255,.1)", color:"white", fontSize:14, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
                  onFocus={e=>(e.target.style.borderColor="rgba(129,140,248,.7)")} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.1)")} />
              </div>
              <button onClick={startChat} disabled={!name.trim()}
                style={{ padding:"13px", borderRadius:13, border:"none", cursor: name.trim() ? "pointer" : "not-allowed", background: name.trim() ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.05)", color: name.trim() ? "white" : "rgba(255,255,255,.25)", fontSize:15, fontWeight:700, fontFamily:"inherit", boxShadow: name.trim() ? "0 6px 20px rgba(99,102,241,.45)" : "none" }}>
                Start Chat →
              </button>
              <p style={{ fontSize:11, color:"rgba(255,255,255,.18)", textAlign:"center", margin:0 }}>Powered by FinovaOS AI · Available 24/7</p>
            </div>
          )}

          {/* Chat */}
          {step === "chat" && (
            <>
              <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 8px", display:"flex", flexDirection:"column", gap:10 }}>
                {messages.map(msg => (
                  <div key={msg.id} className="chat-msg">
                    <div style={{ display:"flex", justifyContent: msg.sender === "customer" ? "flex-end" : "flex-start", gap:8, alignItems:"flex-end" }}>
                      {msg.sender !== "customer" && (
                        <div style={{ width:28, height:28, borderRadius:9, flexShrink:0, marginBottom:2, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, boxShadow:"0 3px 10px rgba(0,0,0,.3)" }}>🤖</div>
                      )}
                      <div style={{
                        maxWidth:"82%", padding: msg.sender === "bot" ? "11px 14px 10px" : "10px 14px",
                        borderRadius: msg.sender === "customer" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: msg.sender === "customer" ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.055)",
                        border: msg.sender === "bot" ? "1px solid rgba(255,255,255,.07)" : "none",
                        boxShadow: msg.sender === "customer" ? "0 4px 16px rgba(99,102,241,.3)" : "0 2px 8px rgba(0,0,0,.12)",
                        fontSize:13.5, color:"rgba(255,255,255,.92)", lineHeight:1.75,
                      }}>
                        {msg.sender === "bot" ? renderText(msg.text) : <span>{msg.text}</span>}
                        <div style={{ fontSize:9.5, color:"rgba(255,255,255,.22)", marginTop:5, textAlign: msg.sender === "customer" ? "right" : "left" }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                        </div>
                      </div>
                    </div>

                    {msg.sender === "bot" && msg.suggestions && (
                      <div style={{ marginTop:8, marginLeft:36, display:"flex", flexWrap:"wrap", gap:6 }}>
                        {msg.suggestions.map(s => (
                          <button key={s} className="chip" onClick={() => sendMessage(s)} style={{ padding:"5px 12px", borderRadius:20, border:"1px solid rgba(129,140,248,.3)", background:"rgba(129,140,248,.1)", color:"rgba(200,205,255,.85)", fontSize:11.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{s}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {botTyping && (
                  <div className="chat-msg" style={{ display:"flex", alignItems:"flex-end", gap:8 }}>
                    <div style={{ width:28, height:28, borderRadius:9, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>🤖</div>
                    <div style={{ padding:"12px 16px", borderRadius:"16px 16px 16px 4px", background:"rgba(255,255,255,.055)", border:"1px solid rgba(255,255,255,.06)", display:"flex", gap:5, alignItems:"center" }}>
                      <div className="dot1" style={{ width:7, height:7, borderRadius:"50%", background:"rgba(129,140,248,.8)" }}/>
                      <div className="dot2" style={{ width:7, height:7, borderRadius:"50%", background:"rgba(129,140,248,.8)" }}/>
                      <div className="dot3" style={{ width:7, height:7, borderRadius:"50%", background:"rgba(129,140,248,.8)" }}/>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef}/>
              </div>

              {/* Human agent button */}
              {!waitingHuman && (
                <div style={{ padding:"0 14px 6px", flexShrink:0 }}>
                  <button onClick={() => sendMessage("human agent")}
                    style={{ width:"100%", padding:"8px", borderRadius:10, background:"rgba(52,211,153,.07)", border:"1px solid rgba(52,211,153,.2)", color:"#34d399", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
                    👤 Talk to a human agent
                  </button>
                </div>
              )}

              {/* Input */}
              <div style={{ padding:"8px 14px 14px", flexShrink:0, borderTop:"1px solid rgba(255,255,255,.05)" }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", background:"rgba(255,255,255,.05)", borderRadius:14, border:"1.5px solid rgba(255,255,255,.07)", padding:"7px 8px 7px 14px" }}
                  onFocusCapture={e => (e.currentTarget.style.borderColor = "rgba(129,140,248,.45)")}
                  onBlurCapture={e  => (e.currentTarget.style.borderColor = "rgba(255,255,255,.07)")}>
                  <input className="chat-input" value={inputVal} onChange={e => setInputVal(e.target.value)} onKeyDown={handleKey}
                    placeholder={waitingHuman ? "Waiting for agent..." : "Ask anything about FinovaOS..."}
                    disabled={waitingHuman}
                    style={{ flex:1, background:"none", border:"none", color:"white", fontSize:14, fontFamily:"inherit", padding:"3px 0" }} />
                  <button onClick={() => sendMessage()} disabled={!inputVal.trim() || botTyping || waitingHuman}
                    style={{ width:36, height:36, borderRadius:10, border:"none", cursor: inputVal.trim() ? "pointer" : "default", background: inputVal.trim() ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.04)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" opacity={inputVal.trim() ? 1 : 0.25}>
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,.13)", textAlign:"center", marginTop:7 }}>Powered by FinovaOS AI • Available 24/7</div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
