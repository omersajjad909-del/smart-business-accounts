"use client";
import { useEffect, useRef, useState } from "react";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Msg = {
  id: string;
  sender: "customer" | "bot";
  text: string;
  time: string;
  chips?: string[];
};

/* ─── Offline knowledge base (fallback when server is down) ──────────────── */
const KB: [RegExp, string][] = [
  [/^(hi|hello|hey|salam|assalam|helo|hii|adaab|namaste|good\s*(morning|afternoon|evening)|howdy|greetings)[\s!?.]*$/i,
   "Hello! 👋 I'm FinovaOS AI Assistant.\n\nI can help with:\n• Pricing & plans\n• Invoice & billing\n• Inventory management\n• HR & Payroll\n• Banking & reports\n• CRM & AI features\n\nAsk me anything!"],

  [/what is finova|finova kya|about finova|kaun sa software|introduce yourself/i,
   "FinovaOS is a complete cloud Business OS for SMEs — all in one platform:\n\n• Accounting & double-entry bookkeeping\n• Sales & purchase invoicing\n• Inventory management\n• HR & Payroll\n• Banking & reconciliation\n• CRM & customer management\n• AI financial intelligence\n\nUsed by 12,000+ businesses. 🚀"],

  [/pric|plan|cost|kitna|starter|professional|enterprise|subscription|fee|charge/i,
   "FinovaOS ke 4 plans hain:\n\n1. **Starter** — 3 users | PKR 13,622/mo | Invoicing, ledger, basic reports\n2. **Professional** — 10 users | PKR 27,522/mo | + Inventory, HR & Payroll, Banking, CRM\n3. **Enterprise** — 25 users | PKR 69,222/mo | + API access, integrations, priority support\n4. **Custom** — Sirf woh modules jo chahiye, pay per module\n\n🔥 Launch offer: 75% off pehle 3 mahine!\nContact: finovaos.app@gmail.com 💰"],

  [/invoice|bill|billing|sales invoice|create invoice|banao invoice/i,
   "Creating a Sales Invoice:\n\n1. Dashboard → Sales Invoice → New Invoice\n2. Select customer & add items\n3. Set quantity, price & tax\n4. Save → Send PDF via email\n\nFeatures: PDF generation, email delivery, payment tracking. 📄"],

  [/inventor|stock|item|product|maal|saman|warehouse|grn/i,
   "Inventory Management:\n\n• Real-time stock levels\n• Low stock alerts\n• Multi-warehouse support\n• Goods Receipt Notes (GRN)\n• Stock valuation (FIFO / avg cost)\n• Barcode scanning\n\nDashboard → Inventory 📦"],

  [/hr|payroll|salary|employee|attendance|leave|mulazim|tanahua/i,
   "HR & Payroll:\n\n• Employee records & profiles\n• Daily attendance tracking\n• Leave management (casual, sick, annual)\n• Salary processing & payslips\n• Advance salary management\n\nDashboard → HR & Payroll 👥"],

  [/bank|reconcil|payment|voucher|cpv|crv|journal|jv/i,
   "Banking & Payments:\n\n• Multiple bank accounts\n• Bank reconciliation\n• Payment receipts (CRV)\n• Cash payment vouchers (CPV)\n• Journal vouchers (JV)\n• Bulk payments\n\nDashboard → Banking 🏦"],

  [/\b(terms|privacy|policy|data.?protection|gdpr|refund|cancel|cancell|contract|shart|conditions|legal|agreement|money.?back)\b/i,
   "FinovaOS Terms & Privacy:\n\n• Data Protection: 256-bit bank-grade encryption, stored on AWS (SOC 2 Type II)\n• Data Ownership: Your data belongs to you — FinovaOS never sells or shares it\n• GDPR Compliant: Access, modify, or delete your data anytime\n• Terms of Service: Subscription-based, cancel anytime, no long-term contracts\n• Money-back Guarantee: 14-day full refund if not satisfied\n• Daily automated backups, data recovery on request\n• Privacy Policy: finovaos.app/privacy\n• Full Terms: finovaos.app/terms\n\nKoi specific sawal hai? 😊"],

  [/trial[\s-]?balance|p&?l\b|profit[\s-]?loss|balance[\s-]?sheet|ledger|hisab|tax[\s-]?report|cash[\s-]?flow|aging[\s-]?report|financial[\s-]?report|reports?\s+(section|page|kahan|dikhao|dekhna|banana|export)/i,
   "Financial Reports:\n\n• Profit & Loss (P&L)\n• Balance Sheet\n• Cash Flow Statement\n• Trial Balance\n• Tax Summary\n• Aging reports (receivable & payable)\n• Export to PDF, Excel, CSV\n\nDashboard → Reports 📊"],

  [/crm|customer|client|lead|pipeline/i,
   "CRM in FinovaOS:\n\n• Customer & supplier records\n• Sales pipeline management\n• Interaction & follow-up history\n• Lead management\n• Credit limit tracking\n\nDashboard → CRM 🤝"],

  [/ai|artificial intelligence|smart|forecast|insight|advisor/i,
   "FinovaOS AI Intelligence:\n\n1. Business health score (0–100)\n2. Ask AI — chat with your data\n3. Financial insights & analysis\n4. Auto anomaly alerts\n5. 30/60/90-day forecasts\n6. Business recommendations\n7. Monthly CEO report\n\nDashboard → AI Intelligence 🤖"],

  [/demo|trial|try|start|sign up|register|get started|kaise shuru/i,
   "Get started with FinovaOS:\n\n1. Visit **finovaos.app**\n2. Click 'Get Started'\n3. Set up your company (5 min)\n4. Our team will guide you through onboarding\n\nContact: finovaos.app@gmail.com | +92 304 7653693 🚀"],

  [/contact|email|phone|support|madad|helpline/i,
   "Contact FinovaOS:\n\n• Email: **finovaos.app@gmail.com**\n• Phone: **+92 304 7653693**\n• Website: **finovaos.app**\n\nOr type 'human agent' to connect with our support team. 📞"],

  [/purchase|supplier|vendor|po|purchase order|khareed/i,
   "Purchase Management:\n\n• Purchase invoices from suppliers\n• Purchase Orders (PO) with approval\n• Goods Receipt Notes (GRN)\n• 3-way match: PO → GRN → Invoice\n• Advance payments to suppliers\n\nDashboard → Purchases 🛒"],

  [/multi.company|branch|company setup/i,
   "Multi-Company & Branch:\n\n• Manage multiple companies from one login\n• Each company has separate data\n• Branch-level reporting & controls\n• Available on Professional & Enterprise plans 🏢"],

  [/security|\bsafe\b|data.{0,8}(protect|safe|secur|store)|backup|2fa|encrypt|password|soc.?2/i,
   "FinovaOS Security:\n\n• 256-bit bank-grade encryption\n• Two-factor authentication (2FA)\n• Role-based access control\n• Daily automated backups\n• SOC 2 Type II compliant (AWS)\n• Login history & session management 🔒"],

  [/mobile|app|android|ios|phone/i,
   "FinovaOS works on all devices! 📱\n\n• Fully responsive on mobile browsers\n• Native iOS & Android apps coming soon\n\nJust open finovaos.app on your phone's browser."],

  [/currency|pkr|usd|rupee|dollar|exchange/i,
   "FinovaOS supports 150+ currencies:\n• PKR, USD, AED, GBP, EUR, SAR\n• Real-time exchange rates\n• Multi-currency invoicing\n\nPerfect for import/export businesses! 💱"],

  [/marketing.?auto|whatsapp.?broadcast|email.?campaign|drip.?sequence|lead.?nurtur|send.?campaign|bulk.?message/i,
   "FinovaOS Marketing Automation (Power Add-on):\n\n• Automated email campaigns\n• WhatsApp broadcasts to all customers\n• Lead nurturing & drip sequences\n• Customer segmentation by behavior\n• Open rate & click tracking\n\nAvailable as a Power Add-on on ANY plan!\nContact: finovaos.app@gmail.com for pricing 📣"],

  [/\bapi\b|integration|webhook|third.?party|zapier|import.?data|custom.?integrat|connect.?with/i,
   "FinovaOS API & Integrations:\n\n• Full REST API access (Enterprise plan)\n• Webhook support for real-time sync\n• CSV & Excel import/export on all plans\n• Custom integrations on request\n• Connect with eCommerce, payment gateways, banks\n\nContact: finovaos.app@gmail.com for custom integrations 🔌"],

  [/why finova|better than|compare|versus|\bvs\b|quickbooks|xero|competitor|best accounting|alternative|kon sa software/i,
   "Why FinovaOS over QuickBooks / Xero?\n\n• All-in-one: Accounting + HR + Inventory + CRM in ONE platform\n• Built for Pakistan: PKR pricing, Urdu support\n• 12,000+ businesses trust FinovaOS\n• 75% cheaper than international alternatives\n• Local support team available in Urdu/English\n• No hidden per-module fees\n• 14-day money-back guarantee\n\nSwitch with full data migration support! 🏆"],

  [/\bgst\b|sales.?tax|withholding|\bfbr\b|\bntn\b|\bwht\b|income.?tax|\bvat\b|tax.?rate|tax.?setup/i,
   "FinovaOS Tax Management:\n\n• GST/Sales Tax on invoices (any rate)\n• Withholding Tax (WHT) management\n• FBR-compliant reporting\n• Multiple tax rates & categories\n• Tax-inclusive & tax-exclusive pricing\n• Tax Summary report (PDF/Excel export)\n• Input/Output tax tracking\n\nDashboard → Reports → Tax Summary 📋"],

  [/user.?role|permission|access.?control|team.?member|add.?user|invite.?user|staff.?access|kitne.?user|staff.?login/i,
   "Users & Permissions in FinovaOS:\n\n• Add team members with role-based access\n• Roles: Admin, Accountant, Sales, Viewer, HR\n• Each role sees only their allowed modules\n• View-only mode for owners/investors\n• Login history & session management\n\nPlan limits:\n• Starter: up to 3 users\n• Professional: up to 10 users\n• Enterprise: up to 25 users\n\nDashboard → Settings → Team Members 👥"],
];

const WELCOME_CHIPS = [
  "What is FinovaOS?",
  "Show me pricing plans",
  "How to create an invoice?",
  "HR & Payroll features",
  "Inventory management",
  "Can I get a demo?",
];

const TOPIC_CHIPS: Record<string, string[]> = {
  pricing:   ["What's in Starter?", "Enterprise vs Professional", "Is there a custom plan?"],
  invoice:   ["How to send invoice PDF?", "How to process a return?", "Purchase invoice kaise?"],
  inventory: ["What is a GRN?", "Multi-warehouse support?", "How to set min stock?"],
  hr:        ["How does payroll work?", "How is attendance tracked?", "Leave management?"],
  banking:   ["What is reconciliation?", "What is an expense voucher?", "Bulk payments kaise?"],
  reports:   ["Where is P&L report?", "How to view balance sheet?", "Tax report available?"],
  ai:        ["What is health score?", "How does forecast work?", "Show AI features"],
};

function matchKB(text: string): string | null {
  for (const [pat, ans] of KB) {
    if (pat.test(text)) return ans;
  }
  return null;
}

function detectTopic(text: string): string | null {
  const t = text.toLowerCase();
  if (/pric|plan|starter|enterprise/.test(t))                                               return "pricing";
  if (/invoice|bill|sales/.test(t))                                                         return "invoice";
  if (/inventor|stock|warehouse/.test(t))                                                   return "inventory";
  if (/hr|payroll|salary|leave/.test(t))                                                    return "hr";
  if (/bank|reconcil|voucher/.test(t))                                                      return "banking";
  if (/trial.?balance|p&l|profit.loss|balance.?sheet|cash.?flow|financial.?report/.test(t)) return "reports";
  if (/\bai\b|forecast|insight/.test(t))                                                    return "ai";
  return null;
}

/* ─── Markdown-lite renderer ─────────────────────────────────────────────── */
function renderText(text: string): React.ReactNode[] {
  return text.split("\n").map((line, i) => {
    const t = line.trimStart();
    if (!t) return <span key={i} style={{ display: "block", height: 6 }} />;

    if (t.startsWith("• ") || t.startsWith("- ")) {
      const inner = t.slice(2).replace(/\*\*(.*?)\*\*/g, "|||$1|||");
      return (
        <span key={i} style={{ display: "flex", gap: 7, padding: "1px 0", alignItems: "flex-start" }}>
          <span style={{ color: "#818cf8", flexShrink: 0, fontSize: 13 }}>•</span>
          <span style={{ color: "rgba(255,255,255,.88)", fontSize: 13.5, lineHeight: 1.75 }}>
            {inner.split("|||").map((p, j) => j % 2 === 1
              ? <strong key={j} style={{ color: "white" }}>{p}</strong> : p)}
          </span>
        </span>
      );
    }

    const num = t.match(/^(\d+)\.\s+(.*)/);
    if (num) {
      const inner = num[2].replace(/\*\*(.*?)\*\*/g, "|||$1|||");
      return (
        <span key={i} style={{ display: "flex", gap: 8, padding: "2px 0", alignItems: "flex-start" }}>
          <span style={{ minWidth: 20, height: 20, borderRadius: "50%", background: "rgba(99,102,241,.4)", color: "#c7d2fe", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>{num[1]}</span>
          <span style={{ color: "rgba(255,255,255,.88)", fontSize: 13.5, lineHeight: 1.75 }}>
            {inner.split("|||").map((p, j) => j % 2 === 1
              ? <strong key={j} style={{ color: "white" }}>{p}</strong> : p)}
          </span>
        </span>
      );
    }

    const parts = t.replace(/\*\*(.*?)\*\*/g, "|||$1|||").split("|||");
    return (
      <span key={i} dir="auto" style={{ display: "block", color: "rgba(255,255,255,.85)", fontSize: 13.5, lineHeight: 1.8, margin: "1px 0" }}>
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: "white" }}>{p}</strong> : p)}
      </span>
    );
  });
}

/* ─── API helpers — never throw, never block UI ──────────────────────────── */

// Single endpoint: handles conversation creation + AI reply + message saving
async function apiChat(
  message: string,
  conversationId: string | null,
  name: string,
  email: string,
  history: { role: "user" | "assistant"; content: string }[] = []
): Promise<{ reply: string; conversationId: string | null }> {
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch("/api/widget-chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, conversationId, name, email, history }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error("[ChatWidget] server error:", res.status);
      return { reply: "", conversationId };
    }
    const data = await res.json();
    console.log("[ChatWidget] source:", data?.source, "| convId:", data?.conversationId);
    return {
      reply:          String(data?.reply || "").trim(),
      conversationId: data?.conversationId ? String(data.conversationId) : conversationId,
    };
  } catch {
    return { reply: "", conversationId };
  }
}

function apiEscalate(conversationId: string) {
  if (!conversationId || conversationId.startsWith("tmp-")) return;
  fetch("/api/chat/escalate", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId }),
  }).catch(() => {});
}

/* ─── Widget component ───────────────────────────────────────────────────── */
export default function ChatWidget() {
  const [open,      setOpen]      = useState(false);
  const [name]  = useState("Visitor");
  const [email] = useState("");
  const [convId,    setConvId]    = useState<string | null>(null);
  const [messages,  setMessages]  = useState<Msg[]>([]);
  const [inputVal,  setInputVal]  = useState("");
  const [typing,    setTyping]    = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [unread,    setUnread]    = useState(0);
  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq      = useRef(0);

  function mkId() { return `m-${++seq.current}`; }
  function now()  { return new Date().toISOString(); }
  function addMsg(m: Omit<Msg, "id" | "time">) {
    setMessages(p => [...p, { ...m, id: mkId(), time: now() }]);
  }

  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("open-chat", h);
    return () => window.removeEventListener("open-chat", h);
  }, []);

  // Restore conversation ID across page refreshes
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("fw_conv");
      if (saved && !saved.startsWith("tmp-")) setConvId(saved);
    } catch { /* ignore — private browsing */ }
  }, []);

  // Persist conversation ID so user can continue after refresh
  useEffect(() => {
    if (!convId || convId.startsWith("tmp-")) return;
    try { sessionStorage.setItem("fw_conv", convId); } catch { /* ignore */ }
  }, [convId]);

  // Show welcome message on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      addMsg({
        sender: "bot",
        text: "Hello! 👋 I'm **FinovaOS AI Assistant**.\n\nAsk me anything about FinovaOS — accounting, invoicing, inventory, HR, payroll, banking, pricing, and more.\n\nHow can I help you today?",
        chips: WELCOME_CHIPS,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => { if (open) setUnread(0); }, [open]);

  /* ── Start chat: show welcome immediately, no API call needed ── */

  /* ── Send message: one API call handles everything ── */
  async function sendMessage(override?: string) {
    const text = (override || inputVal).trim();
    if (!text || typing) return;
    if (!override) setInputVal("");
    // Dismiss mobile keyboard after send
    inputRef.current?.blur();

    addMsg({ sender: "customer", text });

    // Human agent request — escalate and show message
    if (/\b(human|agent|person|real person|support staff|insaan|banda|live chat|connect me)\b/i.test(text)) {
      if (convId) apiEscalate(convId);
      setEscalated(true);
      addMsg({
        sender: "bot",
        text: "Connecting you to a human agent now. Someone will respond shortly.\n\nYou can also reach us directly:\n• Email: **finovaos.app@gmail.com**\n• Phone: **+92 304 7653693**",
      });
      return;
    }

    setTyping(true);

    // Build conversation history for context-aware AI responses
    const history = messages.slice(-10).map(m => ({
      role: (m.sender === "customer" ? "user" : "assistant") as "user" | "assistant",
      content: m.text,
    }));

    // POST to /api/widget-chat — handles everything: conv creation, AI reply, saving
    const { reply: serverReply, conversationId: newConvId } = await apiChat(
      text, convId, name.trim(), email.trim(), history
    );
    if (newConvId && newConvId !== convId) setConvId(newConvId);

    // Fallback to offline KB if server fails
    const reply = serverReply
      || matchKB(text)
      || `FinovaOS ke baare mein koi bhi sawal poochein! 😊\n\nMain in topics mein madad kar sakta hoon:\n• Pricing & plans\n• Invoice & billing\n• Inventory & stock\n• HR & Payroll\n• Banking & reports\n\nYa seedha contact karein:\n• **finovaos.app@gmail.com**\n• **+92 304 7653693**`;

    setTyping(false);

    const topic = detectTopic(text + " " + reply);
    addMsg({ sender: "bot", text: reply, chips: topic ? TOPIC_CHIPS[topic] : undefined });

    if (!open) setUnread(u => u + 1);
  }

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  /* ── JSX ── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        @keyframes widgetIn  { from{opacity:0;transform:scale(.93) translateY(14px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes msgIn     { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dotBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes pulse     { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        @keyframes shimmer   { 0%{opacity:.5} 50%{opacity:1} 100%{opacity:.5} }
        .cw-msg  { animation: msgIn .22s ease both; }
        .cw-d1   { animation: dotBounce 1.2s ease infinite 0s; }
        .cw-d2   { animation: dotBounce 1.2s ease infinite .18s; }
        .cw-d3   { animation: dotBounce 1.2s ease infinite .36s; }
        .cw-input:focus { outline: none; }
        .cw-input::placeholder { color: rgba(255,255,255,.22); }
        .cw-chip { transition: all .18s; cursor: pointer; }
        .cw-chip:hover { background: rgba(129,140,248,.28) !important; border-color: rgba(129,140,248,.65) !important; color: white !important; transform: translateY(-1px); }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,.3); border-radius: 99px; }
        @media(max-width:480px){
          .cw-window { bottom:84px !important; right:12px !important; left:12px !important; width:auto !important; max-width:none !important; height:72vh !important; max-height:520px !important; border-radius:18px !important; }
        }
      `}</style>

      {/* ── FAB ── */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Open chat"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          width: 58, height: 58, borderRadius: "50%", border: "none", cursor: "pointer",
          background: open ? "rgba(255,255,255,.1)" : "linear-gradient(135deg,#6366f1,#4f46e5)",
          boxShadow: open ? "0 4px 16px rgba(0,0,0,.4)" : "0 8px 32px rgba(99,102,241,.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all .3s cubic-bezier(.34,1.56,.64,1)",
          animation: open ? "none" : "pulse 3s ease infinite",
        }}
      >
        {unread > 0 && !open && (
          <div style={{ position: "absolute", top: -3, right: -3, minWidth: 20, height: 20, borderRadius: 10, background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "white", border: "2.5px solid #080c1e", padding: "0 4px" }}>
            {unread}
          </div>
        )}
        {open
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        }
      </button>

      {/* ── Chat window ── */}
      {open && (
        <div className="cw-window" style={{
          position: "fixed", bottom: 96, right: 24, zIndex: 9998,
          width: 390, maxWidth: "calc(100vw - 32px)",
          height: 600, maxHeight: "calc(100vh - 120px)",
          borderRadius: 22, overflow: "hidden",
          background: "rgba(6,9,24,.98)",
          border: "1.5px solid rgba(99,102,241,.28)",
          boxShadow: "0 32px 80px rgba(0,0,0,.75), 0 0 0 1px rgba(99,102,241,.08), inset 0 1px 0 rgba(255,255,255,.04)",
          display: "flex", flexDirection: "column",
          animation: "widgetIn .28s cubic-bezier(.22,1,.36,1) both",
          fontFamily: "'Outfit', sans-serif",
        }}>

          {/* Header */}
          <div style={{ padding: "14px 18px 13px", background: "linear-gradient(135deg,rgba(40,38,110,.95),rgba(25,22,80,.95))", borderBottom: "1px solid rgba(255,255,255,.07)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#4f46e5,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0, boxShadow: "0 4px 12px rgba(99,102,241,.4)" }}>🤖</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "white", letterSpacing: "-.2px" }}>FinovaOS Support</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: escalated ? "#f59e0b" : "#6366f1", animation: "shimmer 2s ease infinite" }} />
                  <span style={{ fontSize: 11, color: escalated ? "#fbbf24" : "#818cf8", fontWeight: 600 }}>
                    {escalated ? "Connecting to agent…" : "AI Assistant • Online"}
                  </span>
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 9, cursor: "pointer", color: "rgba(255,255,255,.5)", padding: "6px 8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          {/* ── Chat messages ── */}
          {(
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
                {messages.map(msg => (
                  <div key={msg.id} className="cw-msg">
                    <div style={{ display: "flex", justifyContent: msg.sender === "customer" ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
                      {msg.sender === "bot" && (
                        <div style={{ width: 28, height: 28, borderRadius: 9, flexShrink: 0, marginBottom: 2, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, boxShadow: "0 3px 10px rgba(0,0,0,.3)" }}>🤖</div>
                      )}
                      <div style={{
                        maxWidth: "82%",
                        padding: msg.sender === "bot" ? "11px 14px 10px" : "10px 14px",
                        borderRadius: msg.sender === "customer" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: msg.sender === "customer" ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.055)",
                        border: msg.sender === "bot" ? "1px solid rgba(255,255,255,.07)" : "none",
                        boxShadow: msg.sender === "customer" ? "0 4px 16px rgba(99,102,241,.3)" : "0 2px 8px rgba(0,0,0,.12)",
                      }}>
                        {msg.sender === "bot"
                          ? renderText(msg.text)
                          : <span style={{ fontSize: 13.5, color: "rgba(255,255,255,.92)", lineHeight: 1.75 }}>{msg.text}</span>
                        }
                        <div style={{ fontSize: 9.5, color: "rgba(255,255,255,.22)", marginTop: 5, textAlign: msg.sender === "customer" ? "right" : "left" }}>
                          {new Date(msg.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>

                    {msg.sender === "bot" && msg.chips && (
                      <div style={{ marginTop: 8, marginLeft: 36, display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {msg.chips.map(c => (
                          <button key={c} className="cw-chip" onClick={() => sendMessage(c)}
                            style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid rgba(129,140,248,.3)", background: "rgba(129,140,248,.1)", color: "rgba(200,205,255,.85)", fontSize: 11.5, fontWeight: 600, fontFamily: "inherit" }}>
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {typing && (
                  <div className="cw-msg" style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🤖</div>
                    <div style={{ padding: "12px 16px", borderRadius: "16px 16px 16px 4px", background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.06)", display: "flex", gap: 5, alignItems: "center" }}>
                      <div className="cw-d1" style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(129,140,248,.8)" }} />
                      <div className="cw-d2" style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(129,140,248,.8)" }} />
                      <div className="cw-d3" style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(129,140,248,.8)" }} />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Human agent button */}
              {!escalated && (
                <div style={{ padding: "0 14px 6px", flexShrink: 0 }}>
                  <button onClick={() => sendMessage("human agent")}
                    style={{ width: "100%", padding: "8px", borderRadius: 10, background: "rgba(52,211,153,.07)", border: "1px solid rgba(52,211,153,.2)", color: "#34d399", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                    👤 Talk to a human agent
                  </button>
                </div>
              )}

              {/* Input */}
              <div style={{ padding: "8px 14px 14px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(255,255,255,.05)", borderRadius: 14, border: "1.5px solid rgba(255,255,255,.07)", padding: "7px 8px 7px 14px" }}
                  onFocusCapture={e => (e.currentTarget.style.borderColor = "rgba(129,140,248,.45)")}
                  onBlurCapture={e  => (e.currentTarget.style.borderColor = "rgba(255,255,255,.07)")}>
                  <input
                    ref={inputRef}
                    className="cw-input"
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onKeyDown={handleKey}
                    disabled={escalated}
                    placeholder={escalated ? "Waiting for agent..." : "Ask anything about FinovaOS..."}
                    style={{ flex: 1, background: "none", border: "none", color: "white", fontSize: 14, fontFamily: "inherit", padding: "3px 0" }}
                  />
                  <button onClick={() => sendMessage()} disabled={!inputVal.trim() || typing || escalated}
                    style={{ width: 36, height: 36, borderRadius: 10, border: "none", cursor: inputVal.trim() && !typing ? "pointer" : "default", background: inputVal.trim() && !typing ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" opacity={inputVal.trim() && !typing ? 1 : 0.25}>
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.13)", textAlign: "center", marginTop: 7 }}>Powered by FinovaOS AI • Available 24/7</div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
