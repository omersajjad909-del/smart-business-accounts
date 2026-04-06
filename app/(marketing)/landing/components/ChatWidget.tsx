"use client";
import { useEffect, useRef, useState, useCallback } from "react";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Message = {
  id: string;
  sender: "customer" | "bot" | "agent";
  text: string;
  created_at: string;
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
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, message: userMessage }),
  });
  const data = await res.json();
  return data.reply || "Thoda masla aa gaya — kripya dobara poochein ya **'human agent'** type karein hamare team se baat karne ke liye. 👤";
}

/* ─── Main Widget ─────────────────────────────────────────────────────────── */
export default function ChatWidget() {
  const [open,       setOpen]       = useState(false);
  const [step,       setStep]       = useState<"form" | "chat">("form");
  const [name,       setName]       = useState("");
  const [email,      setEmail]      = useState("");
  const [inputVal,   setInputVal]   = useState("");
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [convId,     setConvId]     = useState<string | null>(null);
  const [status,     setStatus]     = useState<"bot" | "waiting" | "agent" | "closed">("bot");
  const [botTyping,  setBotTyping]  = useState(false);
  const [unread,     setUnread]     = useState(0);
  const [agentName,  setAgentName]  = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef        = useRef<NodeJS.Timeout | null>(null);
  const lastMsgId      = useRef<string | null>(null);
  const msgSeq         = useRef(0);
  // Ref so event handlers always get the latest convId (avoids stale closure)
  const convIdRef      = useRef<string | null>(null);

  function makeId(prefix: string) {
    msgSeq.current += 1;
    return `${prefix}-${msgSeq.current}`;
  }

  /* ── Listen for global open event ── */
  useEffect(() => {
    const handleOpenChat = () => setOpen(true);
    window.addEventListener("open-chat", handleOpenChat);
    return () => window.removeEventListener("open-chat", handleOpenChat);
  }, []);

  /* scroll to bottom */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botTyping]);

  /* clear unread when opened */
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  /* ── Polling for agent messages ── */
  const pollMessages = useCallback(async () => {
    if (!convId || convId.startsWith("demo-")) return;
    try {
      const all = await apiGetMessages(convId);
      if (!all.length) return;

      // Check for new agent messages
      const agentMsgs = all.filter(m => m.sender === "agent");
      if (agentMsgs.length > 0) {
        const latestAgent = agentMsgs[agentMsgs.length - 1];
        if (latestAgent.id !== lastMsgId.current) {
          lastMsgId.current = latestAgent.id;
          setMessages(prev => {
            // Avoid duplication — only add if not already present
            if (prev.find(m => m.id === latestAgent.id)) return prev;
            if (!open) setUnread(u => u + 1);
            return [...prev, latestAgent];
          });
        }
      }

      // Poll conversation status
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

    // Try to create in DB
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

    const welcomeText = `Hi ${name.split(" ")[0]}! 👋 I'm FinovaOS's AI assistant. I can help with invoicing, reports, banking, inventory, HR, and more. What can I help you with today?`;

    const welcome: Message = {
      id: "welcome",
      sender: "bot",
      text: welcomeText,
      created_at: new Date().toISOString(),
    };
    setMessages([welcome]);

    // Save welcome to DB (non-blocking)
    if (!newConvId.startsWith("demo-")) {
      apiSaveMessage(newConvId, "bot", welcomeText).catch(() => {});
    }
  }

  /* ── Send message ── */
  async function sendMessage() {
    const cid = convIdRef.current || convId;
    if (!inputVal.trim() || !cid) return;
    const convId_local = cid;  // use stable local copy
    const text = inputVal.trim();
    setInputVal("");

    const customerMsg: Message = {
      id: makeId("c"),
      sender: "customer",
      text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, customerMsg]);

    // Save to DB
    if (!convId_local.startsWith("demo-")) {
      apiSaveMessage(convId_local, "customer", text).catch(() => {});
    }

    // If agent is active — don't call bot
    if (status === "agent") return;

    // Check if user wants human agent
    const wantsHuman = /human|agent|person|real|support|help me|talk to someone|insaan|banda|kisi se baat/i.test(text);
    if (wantsHuman) {
      await escalateToAgent(convId_local);
      return;
    }

    // Bot responds
    setBotTyping(true);
    try {
      const reply = await askBot(convId_local, text);
      setBotTyping(false);

      const botMsg: Message = {
        id: makeId("b"),
        sender: "bot",
        text: reply,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, botMsg]);

      if (!convId_local.startsWith("demo-")) {
        apiSaveMessage(convId_local, "bot", reply).catch(() => {});
      }
    } catch {
      setBotTyping(false);
      await escalateToAgent(convId_local);
    }
  }

  /* ── Escalate to human agent ── */
  async function escalateToAgent(cid: string) {
    setStatus("waiting");

    if (!cid.startsWith("demo-")) {
      apiUpdateConversation(cid, { status: "waiting" }).catch(() => {});
    }

    const waitText = "I'm connecting you with a human agent now. Please hold on — someone will be with you shortly. ⏳";
    const waitMsg: Message = {
      id: makeId("w"),
      sender: "bot",
      text: waitText,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, waitMsg]);

    if (!cid.startsWith("demo-")) {
      apiSaveMessage(cid, "bot", waitText).catch(() => {});
    }
  }

  const handleKey      = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const handleStartKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") startChat(); };

  const statusLabel =
    status === "bot"     ? { text: "AI Assistant",         color: "#818cf8", dot: "#6366f1" } :
    status === "waiting" ? { text: "Connecting to agent…", color: "#fbbf24", dot: "#f59e0b" } :
    status === "agent"   ? { text: agentName ? `Agent: ${agentName}` : "Live Agent", color: "#34d399", dot: "#10b981" } :
                           { text: "Closed",               color: "#6b7280", dot: "#6b7280" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
        @keyframes widgetIn  { from{opacity:0;transform:scale(.92) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes msgIn     { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dotBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        @keyframes pulse     { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
        .chat-msg { animation: msgIn .22s ease both; }
        .dot1 { animation: dotBounce 1.2s ease infinite .0s; }
        .dot2 { animation: dotBounce 1.2s ease infinite .2s; }
        .dot3 { animation: dotBounce 1.2s ease infinite .4s; }
        .chat-input:focus { outline:none; }
        .chat-input::placeholder { color:rgba(255,255,255,.25); }
        .chat-send:hover { background: rgba(99,102,241,.8) !important; }
      `}</style>

      {/* ── FAB ── */}
      <button onClick={() => setOpen(v => !v)} style={{
        position:"fixed", bottom:24, right:24, zIndex:9999,
        width:56, height:56, borderRadius:"50%", border:"none", cursor:"pointer",
        background:"linear-gradient(135deg,#6366f1,#4f46e5)",
        boxShadow:"0 8px 28px rgba(99,102,241,.55)",
        display:"flex", alignItems:"center", justifyContent:"center",
        transition:"all .25s", animation: open ? "none" : "pulse 2.5s ease infinite",
      }}
        onMouseEnter={e => { e.currentTarget.style.transform="scale(1.08)"; e.currentTarget.style.boxShadow="0 12px 36px rgba(99,102,241,.7)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform="scale(1)";    e.currentTarget.style.boxShadow="0 8px 28px rgba(99,102,241,.55)"; }}
      >
        {unread > 0 && !open && (
          <div style={{ position:"absolute", top:-4, right:-4, width:20, height:20, borderRadius:"50%", background:"#ef4444", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:"white", border:"2px solid #080c1e" }}>{unread}</div>
        )}
        {open
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        }
      </button>

      {/* ── Chat Window ── */}
      {open && (
        <div style={{
          position:"fixed", bottom:92, right:24, zIndex:9998,
          width:360, height:520, borderRadius:20, overflow:"hidden",
          background:"rgba(7,10,27,.98)", border:"1.5px solid rgba(99,102,241,.3)",
          boxShadow:"0 24px 72px rgba(0,0,0,.7), 0 0 0 1px rgba(99,102,241,.1)",
          display:"flex", flexDirection:"column",
          animation:"widgetIn .25s cubic-bezier(.22,1,.36,1) both",
          fontFamily:"'Outfit',sans-serif",
        }}>

          {/* Header */}
          <div style={{ padding:"14px 18px", background:"linear-gradient(135deg,rgba(45,43,107,.9),rgba(30,27,85,.9))", borderBottom:"1px solid rgba(255,255,255,.08)", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#4f46e5,#818cf8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>🤖</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13.5, fontWeight:700, color:"white" }}>FinovaOS Support</div>
                <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:statusLabel.dot, flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:statusLabel.color, fontWeight:600 }}>{statusLabel.text}</span>
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,.4)", padding:4, borderRadius:6, transition:"color .2s" }}
                onMouseEnter={e=>(e.currentTarget.style.color="white")}
                onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,.4)")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          {/* ── Form Step ── */}
          {step === "form" && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"28px 24px", gap:16 }}>
              <div style={{ textAlign:"center", marginBottom:8 }}>
                <div style={{ fontSize:28, marginBottom:8 }}>👋</div>
                <div style={{ fontSize:15, fontWeight:700, color:"white", marginBottom:4 }}>Welcome to FinovaOS Support</div>
                <div style={{ fontSize:12.5, color:"rgba(255,255,255,.4)", lineHeight:1.6 }}>Tell us a bit about yourself so we can help you better.</div>
              </div>

              <div>
                <label style={{ fontSize:11.5, fontWeight:600, color:"rgba(255,255,255,.4)", letterSpacing:".06em", textTransform:"uppercase", display:"block", marginBottom:6 }}>Your Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} onKeyDown={handleStartKey} placeholder="e.g. Ali Raza"
                  style={{ width:"100%", padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,.05)", border:"1.5px solid rgba(255,255,255,.1)", color:"white", fontSize:14, fontFamily:"inherit", outline:"none", transition:"border .2s", boxSizing:"border-box" }}
                  onFocus={e=>(e.target.style.borderColor="rgba(129,140,248,.6)")}
                  onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.1)")} />
              </div>

              <div>
                <label style={{ fontSize:11.5, fontWeight:600, color:"rgba(255,255,255,.4)", letterSpacing:".06em", textTransform:"uppercase", display:"block", marginBottom:6 }}>Email <span style={{ color:"rgba(255,255,255,.2)", fontWeight:400 }}>(optional)</span></label>
                <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleStartKey} placeholder="you@company.com" type="email"
                  style={{ width:"100%", padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,.05)", border:"1.5px solid rgba(255,255,255,.1)", color:"white", fontSize:14, fontFamily:"inherit", outline:"none", transition:"border .2s", boxSizing:"border-box" }}
                  onFocus={e=>(e.target.style.borderColor="rgba(129,140,248,.6)")}
                  onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.1)")} />
              </div>

              <button onClick={startChat} disabled={!name.trim()} style={{
                padding:"12px", borderRadius:12, border:"none", cursor: name.trim() ? "pointer" : "not-allowed",
                background: name.trim() ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.06)",
                color: name.trim() ? "white" : "rgba(255,255,255,.3)",
                fontSize:14, fontWeight:700, fontFamily:"inherit", transition:"all .25s",
                boxShadow: name.trim() ? "0 4px 16px rgba(99,102,241,.4)" : "none",
              }}>
                Start Chat →
              </button>
            </div>
          )}

          {/* ── Chat Step ── */}
          {step === "chat" && (
            <>
              <div style={{ flex:1, overflowY:"auto", padding:"16px 14px", display:"flex", flexDirection:"column", gap:10, scrollbarWidth:"thin", scrollbarColor:"rgba(99,102,241,.3) transparent" }}>
                {messages.map(msg => (
                  <div key={msg.id} className="chat-msg" style={{ display:"flex", justifyContent: msg.sender === "customer" ? "flex-end" : "flex-start", gap:8, alignItems:"flex-end" }}>
                    {msg.sender !== "customer" && (
                      <div style={{ width:26, height:26, borderRadius:8, flexShrink:0, marginBottom:2, background: msg.sender === "agent" ? "linear-gradient(135deg,#34d399,#059669)" : "linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>
                        {msg.sender === "agent" ? "👤" : "🤖"}
                      </div>
                    )}
                    <div style={{
                      maxWidth:"78%", padding:"9px 13px",
                      borderRadius: msg.sender === "customer" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: msg.sender === "customer" ? "linear-gradient(135deg,#6366f1,#4f46e5)" : msg.sender === "agent" ? "rgba(52,211,153,.12)" : "rgba(255,255,255,.06)",
                      border: msg.sender === "agent" ? "1px solid rgba(52,211,153,.25)" : "none",
                      fontSize:13, color:"rgba(255,255,255,.88)", lineHeight:1.65, fontWeight:400, whiteSpace:"pre-line",
                    }}>
                      {msg.text}
                      <div style={{ fontSize:9.5, color:"rgba(255,255,255,.25)", marginTop:3, textAlign: msg.sender === "customer" ? "right" : "left" }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}

                {botTyping && (
                  <div className="chat-msg" style={{ display:"flex", alignItems:"flex-end", gap:8 }}>
                    <div style={{ width:26, height:26, borderRadius:8, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>🤖</div>
                    <div style={{ padding:"10px 14px", borderRadius:"14px 14px 14px 4px", background:"rgba(255,255,255,.06)", display:"flex", gap:4, alignItems:"center" }}>
                      <div className="dot1" style={{ width:6, height:6, borderRadius:"50%", background:"rgba(129,140,248,.7)" }}/>
                      <div className="dot2" style={{ width:6, height:6, borderRadius:"50%", background:"rgba(129,140,248,.7)" }}/>
                      <div className="dot3" style={{ width:6, height:6, borderRadius:"50%", background:"rgba(129,140,248,.7)" }}/>
                    </div>
                  </div>
                )}

                {status === "waiting" && (
                  <div style={{ textAlign:"center", padding:"8px 12px", borderRadius:10, background:"rgba(251,191,36,.08)", border:"1px solid rgba(251,191,36,.2)", fontSize:11.5, color:"#fbbf24", fontWeight:600 }}>
                    ⏳ Waiting for a human agent to join…
                  </div>
                )}

                {status === "agent" && agentName && (
                  <div style={{ textAlign:"center", padding:"8px 12px", borderRadius:10, background:"rgba(52,211,153,.08)", border:"1px solid rgba(52,211,153,.2)", fontSize:11.5, color:"#34d399", fontWeight:600 }}>
                    ✅ {agentName} has joined the chat
                  </div>
                )}

                <div ref={messagesEndRef}/>
              </div>

              {status === "bot" && (
                <div style={{ padding:"0 14px 8px", flexShrink:0 }}>
                  <button
                    onClick={() => {
                      const cid = convIdRef.current || convId;
                      if (cid) escalateToAgent(cid);
                    }}
                    style={{
                      width:"100%", padding:"8px", borderRadius:9,
                      background:"rgba(52,211,153,.08)",
                      border:"1px solid rgba(52,211,153,.25)",
                      color:"#34d399",
                      fontSize:12, fontWeight:700, cursor:"pointer",
                      fontFamily:"inherit", transition:"all .2s",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:7,
                    }}
                    onMouseEnter={e=>{ e.currentTarget.style.background="rgba(52,211,153,.18)"; e.currentTarget.style.borderColor="rgba(52,211,153,.5)"; e.currentTarget.style.color="white"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background="rgba(52,211,153,.08)"; e.currentTarget.style.borderColor="rgba(52,211,153,.25)"; e.currentTarget.style.color="#34d399"; }}>
                    👤 Talk to a human agent
                  </button>
                </div>
              )}

              {status !== "closed" && (
                <div style={{ padding:"10px 14px 14px", flexShrink:0, borderTop:"1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", background:"rgba(255,255,255,.05)", borderRadius:12, border:"1.5px solid rgba(255,255,255,.08)", padding:"6px 8px 6px 14px", transition:"border .2s" }}
                    onFocusCapture={e => (e.currentTarget.style.borderColor = "rgba(129,140,248,.4)")}
                    onBlurCapture={e  => (e.currentTarget.style.borderColor = "rgba(255,255,255,.08)")}>
                    <input
                      className="chat-input"
                      value={inputVal}
                      onChange={e => setInputVal(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder={status === "waiting" ? "Waiting for agent…" : "Type a message…"}
                      disabled={status === "waiting"}
                      style={{ flex:1, background:"none", border:"none", color:"white", fontSize:13.5, fontFamily:"inherit", padding:"4px 0" }}
                    />
                    <button className="chat-send" onClick={sendMessage} disabled={!inputVal.trim() || status === "waiting"} style={{
                      width:34, height:34, borderRadius:9, border:"none", cursor: inputVal.trim() ? "pointer" : "default",
                      background: inputVal.trim() ? "rgba(99,102,241,.6)" : "rgba(255,255,255,.04)",
                      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background .2s",
                    }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" opacity={inputVal.trim() ? 1 : 0.3}>
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    </button>
                  </div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.15)", textAlign:"center", marginTop:6 }}>Powered by FinovaOS AI</div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
