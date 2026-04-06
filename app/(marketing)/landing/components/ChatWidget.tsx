"use client";
import { useEffect, useRef, useState, useCallback } from "react";

type Message = {
  id: string;
  sender: "customer" | "bot" | "agent";
  text: string;
  created_at: string;
  suggestions?: string[];
};

/* ─── Quick reply suggestions ─────────────────────────────────────────────── */
const WELCOME_SUGGESTIONS = [
  "What is FinovaOS?",
  "Explain pricing plans",
  "How do I create a sales invoice?",
  "Is there a free trial?",
  "Inventory management features",
  "HR & Payroll features",
];

const TOPIC_MAP: Record<string, string[]> = {
  pricing:    ["What is included in Starter?", "Enterprise vs Professional", "Do you offer a custom plan?"],
  invoice:    ["How do I create a purchase invoice?", "How do I send an invoice PDF?", "How do I process a sales return?"],
  inventory:  ["How do I view the stock report?", "What is a GRN?", "Do you support multi-warehouse operations?"],
  hr:         ["How does payroll work?", "How is attendance tracked?", "Do you support leave management?"],
  banking:    ["How do I do bank reconciliation?", "What is an expense voucher?", "How do bulk payments work?"],
  reports:    ["Where can I find the P&L report?", "How do I view the balance sheet?", "Is a tax report available?"],
};

/* ─── API helpers ─────────────────────────────────────────────────────────── */
async function apiCreateConversation(name: string, email: string) {
  const res = await fetch("/api/chat/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerName: name, customerEmail: email || null }),
  });
  return res.ok ? res.json() : null;
}

async function apiSaveMessage(conversationId: string, sender: string, text: string) {
  await fetch("/api/chat/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, sender, text }),
  });
}

async function apiGetMessages(conversationId: string): Promise<Message[]> {
  const res = await fetch(`/api/chat/messages?conversationId=${conversationId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

async function apiUpdateConversation(id: string, patch: Record<string, string>) {
  await fetch(`/api/chat/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

async function apiGetConversation(id: string) {
  const res = await fetch(`/api/chat/conversations/${id}`);
  return res.ok ? res.json() : null;
}

async function askBot(conversationId: string, userMessage: string): Promise<string> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, message: userMessage }),
    });
    const data = await res.json();
    return data.reply || "Something went wrong. Please try again or type 'human agent' to connect with support.";
  } catch {
    return "Network error. Please check your internet connection and try again.";
  }
}

/* ─── Markdown-lite renderer ──────────────────────────────────────────────── */
function renderText(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j} style={{ color: "rgba(255,255,255,.95)", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    return <span key={i}>{parts}{i < lines.length - 1 ? <br /> : null}</span>;
  });
}

/* ─── Detect topic for suggestions ────────────────────────────────────────── */
function detectTopic(text: string): string | null {
  const t = text.toLowerCase();
  if (/pric|plan|cost|kharcha|starter|professional|enterprise/.test(t)) return "pricing";
  if (/invoice|bill|sales|purchase|invoic/.test(t)) return "invoice";
  if (/inventor|stock|warehouse|item|product/.test(t)) return "inventory";
  if (/hr|payroll|salary|employee|attend|leave/.test(t)) return "hr";
  if (/bank|reconcil|payment|voucher|expense/.test(t)) return "banking";
  if (/report|p&l|balance|cash flow|trial/.test(t)) return "reports";
  return null;
}

/* ─── Main Widget ─────────────────────────────────────────────────────────── */
export default function ChatWidget() {
  const [open,      setOpen]      = useState(false);
  const [step,      setStep]      = useState<"form" | "chat">("form");
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [inputVal,  setInputVal]  = useState("");
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [convId,    setConvId]    = useState<string | null>(null);
  const [status,    setStatus]    = useState<"bot" | "waiting" | "agent" | "closed">("bot");
  const [botTyping, setBotTyping] = useState(false);
  const [unread,    setUnread]    = useState(0);
  const [agentName, setAgentName] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef        = useRef<NodeJS.Timeout | null>(null);
  const lastMsgId      = useRef<string | null>(null);
  const msgSeq         = useRef(0);
  const convIdRef      = useRef<string | null>(null);

  function makeId(prefix: string) {
    msgSeq.current += 1;
    return `${prefix}-${msgSeq.current}`;
  }

  useEffect(() => {
    const handleOpenChat = () => setOpen(true);
    window.addEventListener("open-chat", handleOpenChat);
    return () => window.removeEventListener("open-chat", handleOpenChat);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botTyping]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  /* ── Polling for agent messages ── */
  const pollMessages = useCallback(async () => {
    if (!convId || convId.startsWith("demo-")) return;
    try {
      const all = await apiGetMessages(convId);
      if (!all.length) return;
      const agentMsgs = all.filter(m => m.sender === "agent");
      if (agentMsgs.length > 0) {
        const latestAgent = agentMsgs[agentMsgs.length - 1];
        if (latestAgent.id !== lastMsgId.current) {
          lastMsgId.current = latestAgent.id;
          setMessages(prev => {
            if (prev.find(m => m.id === latestAgent.id)) return prev;
            if (!open) setUnread(u => u + 1);
            return [...prev, latestAgent];
          });
        }
      }
      const conv = await apiGetConversation(convId);
      if (conv) {
        setStatus(conv.status as "bot" | "waiting" | "agent" | "closed");
        if (conv.assigned_agent) setAgentName(conv.assigned_agent);
      }
    } catch { /* ignore */ }
  }, [convId, open]);

  useEffect(() => {
    if (convId && status !== "closed") {
      pollRef.current = setInterval(pollMessages, 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [convId, status, pollMessages]);

  /* ── Start conversation ── */
  async function startChat() {
    if (!name.trim()) return;
    let newConvId: string;
    try {
      const conv = await apiCreateConversation(name.trim(), email.trim());
      newConvId = conv?.id || `demo-${Date.now()}`;
    } catch {
      newConvId = `demo-${Date.now()}`;
    }
    convIdRef.current = newConvId;
    setConvId(newConvId);
    setStep("chat");

    const firstName = name.split(" ")[0];
    const welcomeText = `Hi ${firstName}! I am **FinovaOS AI Assistant**.\n\nI can help you with FinovaOS features including accounting, invoicing, inventory, HR, payroll, banking, reports, and more.\n\nAsk me anything and I will guide you.`;

    const welcome: Message = {
      id: "welcome",
      sender: "bot",
      text: welcomeText,
      created_at: new Date().toISOString(),
      suggestions: WELCOME_SUGGESTIONS,
    };
    setMessages([welcome]);
    if (!newConvId.startsWith("demo-")) {
      apiSaveMessage(newConvId, "bot", welcomeText).catch(() => {});
    }
  }

  /* ── Send message (text or quick reply) ── */
  async function sendMessage(overrideText?: string) {
    const cid = convIdRef.current || convId;
    const rawText = overrideText || inputVal.trim();
    if (!rawText || !cid) return;
    if (!overrideText) setInputVal("");

    const customerMsg: Message = {
      id: makeId("c"),
      sender: "customer",
      text: rawText,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, customerMsg]);
    if (!cid.startsWith("demo-")) {
      apiSaveMessage(cid, "customer", rawText).catch(() => {});
    }

    if (status === "agent") return;

    const wantsHuman = /human|agent|person|real|support|insaan|banda|kisi se baat|aadmi|connect|live/i.test(rawText);
    if (wantsHuman) {
      await escalateToAgent(cid);
      return;
    }

    setBotTyping(true);
    try {
      const reply = await askBot(cid, rawText);
      setBotTyping(false);

      // Detect topic for contextual suggestions
      const topic = detectTopic(rawText + " " + reply);
      const suggestions = topic ? TOPIC_MAP[topic] : undefined;

      const botMsg: Message = {
        id: makeId("b"),
        sender: "bot",
        text: reply,
        created_at: new Date().toISOString(),
        suggestions,
      };
      setMessages(prev => [...prev, botMsg]);
      if (!cid.startsWith("demo-")) {
        apiSaveMessage(cid, "bot", reply).catch(() => {});
      }
    } catch {
      setBotTyping(false);
      await escalateToAgent(cid);
    }
  }

  /* ── Escalate ── */
  async function escalateToAgent(cid: string) {
    setStatus("waiting");
    if (!cid.startsWith("demo-")) {
      apiUpdateConversation(cid, { status: "waiting" }).catch(() => {});
    }
    const waitText = "Connecting you to a human agent. Someone from our team will join shortly.\n\nYou can also email us at **finovaos.app@gmail.com**.";
    const waitMsg: Message = { id: makeId("w"), sender: "bot", text: waitText, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, waitMsg]);
    if (!cid.startsWith("demo-")) {
      apiSaveMessage(cid, "bot", waitText).catch(() => {});
    }
  }

  const handleKey      = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const handleStartKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") startChat(); };

  const statusLabel =
    status === "bot"     ? { text: "AI Assistant • Online",  color: "#818cf8", dot: "#6366f1" } :
    status === "waiting" ? { text: "Connecting to agent…",   color: "#fbbf24", dot: "#f59e0b" } :
    status === "agent"   ? { text: agentName ? `${agentName} • Live` : "Live Agent", color: "#34d399", dot: "#10b981" } :
                           { text: "Conversation closed",    color: "#6b7280",  dot: "#6b7280" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        @keyframes widgetIn  { from{opacity:0;transform:scale(.93) translateY(14px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes msgIn     { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dotBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes pulse     { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        @keyframes shimmer   { 0%{opacity:.5} 50%{opacity:1} 100%{opacity:.5} }
        .chat-msg  { animation: msgIn .22s ease both; }
        .dot1 { animation: dotBounce 1.2s ease infinite .0s; }
        .dot2 { animation: dotBounce 1.2s ease infinite .18s; }
        .dot3 { animation: dotBounce 1.2s ease infinite .36s; }
        .chat-input:focus { outline: none; }
        .chat-input::placeholder { color: rgba(255,255,255,.22); }
        .chat-send:hover  { background: rgba(99,102,241,.85) !important; transform: scale(1.05); }
        .chat-send        { transition: all .2s; }
        .chip:hover       { background: rgba(129,140,248,.25) !important; border-color: rgba(129,140,248,.6) !important; color: white !important; transform: translateY(-1px); }
        .chip             { transition: all .18s; }
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
        onMouseEnter={e => { if (!open) { e.currentTarget.style.transform="scale(1.1)"; e.currentTarget.style.boxShadow="0 12px 40px rgba(99,102,241,.7)"; } }}
        onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow = open ? "0 4px 16px rgba(0,0,0,.4)" : "0 8px 32px rgba(99,102,241,.55)"; }}
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

          {/* ── Header ── */}
          <div style={{ padding:"14px 18px 13px", background:"linear-gradient(135deg,rgba(40,38,110,.95),rgba(25,22,80,.95))", borderBottom:"1px solid rgba(255,255,255,.07)", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:11 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#4f46e5,#818cf8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:19, flexShrink:0, boxShadow:"0 4px 12px rgba(99,102,241,.4)" }}>
                🤖
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:800, color:"white", letterSpacing:"-.2px" }}>FinovaOS Support</div>
                <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:statusLabel.dot, boxShadow:`0 0 6px ${statusLabel.dot}`, animation:"shimmer 2s ease infinite" }}/>
                  <span style={{ fontSize:11, color:statusLabel.color, fontWeight:600 }}>{statusLabel.text}</span>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.08)", borderRadius:9, cursor:"pointer", color:"rgba(255,255,255,.5)", padding:"6px 8px", transition:"all .2s", display:"flex", alignItems:"center", justifyContent:"center" }}
                onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,255,255,.12)"; e.currentTarget.style.color="white"; }}
                onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,.06)"; e.currentTarget.style.color="rgba(255,255,255,.5)"; }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          {/* ── Form Step ── */}
          {step === "form" && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"32px 24px", gap:18, overflowY:"auto" }}>
              <div style={{ textAlign:"center", marginBottom:4 }}>
                <div style={{ fontSize:36, marginBottom:12 }}>👋</div>
                <div style={{ fontSize:17, fontWeight:800, color:"white", marginBottom:6, letterSpacing:"-.3px" }}>Welcome to FinovaOS!</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", lineHeight:1.6 }}>Apna naam batao — main aapki puri madad karunga.</div>
              </div>

              {/* Feature chips preview */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center", marginBottom:4 }}>
                {["📄 Accounting", "📦 Inventory", "👥 HR & Payroll", "🏦 Banking", "📊 Reports", "🤝 CRM"].map(f => (
                  <span key={f} style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,.4)", padding:"4px 10px", borderRadius:20, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)" }}>{f}</span>
                ))}
              </div>
              <div>
                <label style={{ fontSize:11.5, fontWeight:700, color:"rgba(255,255,255,.4)", letterSpacing:".07em", textTransform:"uppercase", display:"block", marginBottom:7 }}>Your Name *</label>
                <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", lineHeight:1.6, marginBottom:10 }}>Tell us your name and we will get the conversation started.</div>
                <input
                  value={name} onChange={e => setName(e.target.value)} onKeyDown={handleStartKey}
                  placeholder="e.g. Ali Raza"
                  style={{ width:"100%", padding:"11px 14px", borderRadius:11, background:"rgba(255,255,255,.05)", border:"1.5px solid rgba(255,255,255,.1)", color:"white", fontSize:14, fontFamily:"inherit", outline:"none", transition:"border .2s", boxSizing:"border-box" }}
                  onFocus={e=>(e.target.style.borderColor="rgba(129,140,248,.7)")}
                  onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.1)")}
                />
              </div>
              <div>
                <label style={{ fontSize:11.5, fontWeight:700, color:"rgba(255,255,255,.4)", letterSpacing:".07em", textTransform:"uppercase", display:"block", marginBottom:7 }}>
                  Email <span style={{ color:"rgba(255,255,255,.2)", fontWeight:400, fontSize:11 }}>(optional)</span>
                </label>
                <input
                  value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleStartKey}
                  placeholder="you@company.com" type="email"
                  style={{ width:"100%", padding:"11px 14px", borderRadius:11, background:"rgba(255,255,255,.05)", border:"1.5px solid rgba(255,255,255,.1)", color:"white", fontSize:14, fontFamily:"inherit", outline:"none", transition:"border .2s", boxSizing:"border-box" }}
                  onFocus={e=>(e.target.style.borderColor="rgba(129,140,248,.7)")}
                  onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.1)")}
                />
              </div>

              <button
                onClick={startChat} disabled={!name.trim()}
                style={{
                  padding:"13px", borderRadius:13, border:"none",
                  cursor: name.trim() ? "pointer" : "not-allowed",
                  background: name.trim() ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.05)",
                  color: name.trim() ? "white" : "rgba(255,255,255,.25)",
                  fontSize:15, fontWeight:700, fontFamily:"inherit",
                  transition:"all .25s",
                  boxShadow: name.trim() ? "0 6px 20px rgba(99,102,241,.45)" : "none",
                }}
                onMouseEnter={e=>{ if (name.trim()) { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 10px 28px rgba(99,102,241,.55)"; } }}
                onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow= name.trim() ? "0 6px 20px rgba(99,102,241,.45)" : "none"; }}
              >
                Start Chat →
              </button>

              <p style={{ fontSize:11, color:"rgba(255,255,255,.18)", textAlign:"center", margin:0 }}>
                Powered by FinovaOS AI · Available 24/7
              </p>
            </div>
          )}

          {/* ── Chat Step ── */}
          {step === "chat" && (
            <>
              <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 8px", display:"flex", flexDirection:"column", gap:12 }}>
                {messages.map(msg => (
                  <div key={msg.id} className="chat-msg">
                    <div style={{ display:"flex", justifyContent: msg.sender === "customer" ? "flex-end" : "flex-start", gap:8, alignItems:"flex-end" }}>
                      {msg.sender !== "customer" && (
                        <div style={{ width:28, height:28, borderRadius:9, flexShrink:0, marginBottom:2, background: msg.sender === "agent" ? "linear-gradient(135deg,#34d399,#059669)" : "linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, boxShadow:"0 3px 10px rgba(0,0,0,.3)" }}>
                          {msg.sender === "agent" ? "👤" : "🤖"}
                        </div>
                      )}
                      <div style={{
                        maxWidth:"80%", padding:"10px 14px",
                        borderRadius: msg.sender === "customer" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: msg.sender === "customer"
                          ? "linear-gradient(135deg,#6366f1,#4f46e5)"
                          : msg.sender === "agent"
                          ? "rgba(52,211,153,.1)"
                          : "rgba(255,255,255,.055)",
                        border: msg.sender === "agent" ? "1px solid rgba(52,211,153,.2)" : msg.sender === "bot" ? "1px solid rgba(255,255,255,.06)" : "none",
                        fontSize:13.5, color:"rgba(255,255,255,.9)", lineHeight:1.7, fontWeight:400,
                        boxShadow: msg.sender === "customer" ? "0 4px 16px rgba(99,102,241,.3)" : "none",
                      }}>
                        {renderText(msg.text)}
                        <div style={{ fontSize:9.5, color:"rgba(255,255,255,.22)", marginTop:4, textAlign: msg.sender === "customer" ? "right" : "left" }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                        </div>
                      </div>
                    </div>

                    {/* Quick reply chips */}
                    {msg.sender === "bot" && msg.suggestions && msg.suggestions.length > 0 && (
                      <div style={{ marginTop:8, marginLeft:36, display:"flex", flexWrap:"wrap", gap:6 }}>
                        {msg.suggestions.map(s => (
                          <button
                            key={s}
                            className="chip"
                            onClick={() => sendMessage(s)}
                            style={{
                              padding:"5px 12px", borderRadius:20, border:"1px solid rgba(129,140,248,.3)",
                              background:"rgba(129,140,248,.1)", color:"rgba(200,205,255,.85)",
                              fontSize:11.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
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

                {status === "waiting" && (
                  <div style={{ textAlign:"center", padding:"10px 14px", borderRadius:12, background:"rgba(251,191,36,.07)", border:"1px solid rgba(251,191,36,.18)", fontSize:12, color:"#fbbf24", fontWeight:600 }}>
                    Connecting to a human agent...
                  </div>
                )}

                {status === "agent" && agentName && (
                  <div style={{ textAlign:"center", padding:"10px 14px", borderRadius:12, background:"rgba(52,211,153,.07)", border:"1px solid rgba(52,211,153,.18)", fontSize:12, color:"#34d399", fontWeight:600 }}>
                    {agentName} has joined the chat
                  </div>
                )}

                <div ref={messagesEndRef}/>
              </div>

              {/* Human agent button */}
              {status === "bot" && (
                <div style={{ padding:"0 14px 6px", flexShrink:0 }}>
                  <button
                    onClick={() => { const cid = convIdRef.current || convId; if (cid) escalateToAgent(cid); }}
                    style={{ width:"100%", padding:"8px", borderRadius:10, background:"rgba(52,211,153,.07)", border:"1px solid rgba(52,211,153,.2)", color:"#34d399", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all .2s", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}
                    onMouseEnter={e=>{ e.currentTarget.style.background="rgba(52,211,153,.16)"; e.currentTarget.style.borderColor="rgba(52,211,153,.45)"; e.currentTarget.style.color="white"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background="rgba(52,211,153,.07)"; e.currentTarget.style.borderColor="rgba(52,211,153,.2)"; e.currentTarget.style.color="#34d399"; }}>
                    👤 Talk to a human agent
                  </button>
                </div>
              )}

              {/* Input */}
              {status !== "closed" && (
                <div style={{ padding:"8px 14px 14px", flexShrink:0, borderTop:"1px solid rgba(255,255,255,.05)" }}>
                  <div
                    style={{ display:"flex", gap:8, alignItems:"center", background:"rgba(255,255,255,.05)", borderRadius:14, border:"1.5px solid rgba(255,255,255,.07)", padding:"7px 8px 7px 14px", transition:"border .2s" }}
                    onFocusCapture={e => (e.currentTarget.style.borderColor = "rgba(129,140,248,.45)")}
                    onBlurCapture={e  => (e.currentTarget.style.borderColor = "rgba(255,255,255,.07)")}
                  >
                    <input
                      className="chat-input"
                      value={inputVal}
                      onChange={e => setInputVal(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder={status === "waiting" ? "Please wait for the agent..." : "Ask anything about FinovaOS..."}
                      disabled={status === "waiting"}
                      style={{ flex:1, background:"none", border:"none", color:"white", fontSize:14, fontFamily:"inherit", padding:"3px 0" }}
                    />
                    <button
                      className="chat-send"
                      onClick={() => sendMessage()}
                      disabled={!inputVal.trim() || status === "waiting"}
                      style={{
                        width:36, height:36, borderRadius:10, border:"none",
                        cursor: inputVal.trim() ? "pointer" : "default",
                        background: inputVal.trim() ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.04)",
                        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                        boxShadow: inputVal.trim() ? "0 4px 12px rgba(99,102,241,.4)" : "none",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" opacity={inputVal.trim() ? 1 : 0.25}>
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    </button>
                  </div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.13)", textAlign:"center", marginTop:7, letterSpacing:".03em" }}>
                    Powered by FinovaOS AI • Available 24/7
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
