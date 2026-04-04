"use client";
// FILE: app/chat-admin/page.tsx
// Agent dashboard — view all conversations, reply to customers
// Uses Prisma API + polling (no Supabase needed)

import { useEffect, useRef, useState, useCallback } from "react";

/* ─── Types ─── */
type Conversation = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  status: "bot" | "waiting" | "agent" | "closed";
  assigned_agent: string | null;
  created_at: string;
  updated_at: string;
  last_message?: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender: "customer" | "bot" | "agent";
  text: string;
  created_at: string;
};

/* ─── Status config ─── */
const STATUS = {
  bot:     { label:"AI Bot",   color:"#818cf8", bg:"rgba(129,140,248,.12)", dot:"#6366f1" },
  waiting: { label:"Waiting",  color:"#fbbf24", bg:"rgba(251,191,36,.12)",  dot:"#f59e0b" },
  agent:   { label:"Live",     color:"#34d399", bg:"rgba(52,211,153,.12)",  dot:"#10b981" },
  closed:  { label:"Closed",   color:"#6b7280", bg:"rgba(107,114,128,.12)", dot:"#6b7280" },
};

/* ─── API helpers ─── */
async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch("/api/chat/conversations?limit=100");
  const data = await res.json();
  return data.data || [];
}

async function fetchMessages(convId: string): Promise<Message[]> {
  const res = await fetch(`/api/chat/messages?conversationId=${convId}`);
  const data = await res.json();
  return (data.data || []).map((m: Record<string, string>) => ({
    ...m,
    conversation_id: m.conversation_id || convId,
  }));
}

async function updateConversation(id: string, patch: Record<string, string>) {
  await fetch(`/api/chat/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

async function saveMessage(conversationId: string, sender: string, text: string) {
  await fetch("/api/chat/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, sender, text }),
  });
}

/* ─── Agent name (could be from auth in future) ─── */
const AGENT_NAME = "Support Agent";

/* ─── Quick replies ─── */
const QUICK_REPLIES = [
  "I'll look into that for you right away!",
  "Could you share more details about the issue?",
  "Let me check that and get back to you shortly.",
  "Is there anything else I can help you with?",
  "Please try refreshing the page and let me know if the issue persists.",
  "Your account details have been updated. Please log in again.",
];

export default function AgentDashboard() {
  const [conversations,  setConversations]  = useState<Conversation[]>([]);
  const [activeId,       setActiveId]       = useState<string | null>(null);
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [replyText,      setReplyText]      = useState("");
  const [filter,         setFilter]         = useState<"all" | "waiting" | "agent" | "bot" | "closed">("all");
  const [search,         setSearch]         = useState("");
  const [sending,        setSending]        = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [nowMs,          setNowMs]          = useState(0);
  const [notifSound,     setNotifSound]     = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const prevWaiting    = useRef(0);

  const activeConv = conversations.find(c => c.id === activeId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  /* ── Load conversations (polling) ── */
  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
      // Notify on new waiting chats
      const waitCount = data.filter(c => c.status === "waiting").length;
      if (waitCount > prevWaiting.current) setNotifSound(true);
      prevWaiting.current = waitCount;
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadConversations();
    const t = setInterval(loadConversations, 3000);
    return () => clearInterval(t);
  }, [loadConversations]);

  /* ── Load messages for active conversation (polling) ── */
  const loadMessages = useCallback(async () => {
    if (!activeId) return;
    try {
      const data = await fetchMessages(activeId);
      setMessages(data);
    } catch { /* ignore */ }
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    loadMessages();
    const t = setInterval(loadMessages, 2500);
    return () => clearInterval(t);
  }, [activeId, loadMessages]);

  /* ── Notification blink reset ── */
  useEffect(() => {
    if (notifSound) setTimeout(() => setNotifSound(false), 1000);
  }, [notifSound]);

  /* ── Take over conversation ── */
  async function takeOver() {
    if (!activeId) return;
    await updateConversation(activeId, { status: "agent", assignedAgent: AGENT_NAME });
    await saveMessage(activeId, "agent", `Hi! I'm ${AGENT_NAME} from FinovaOS Support. How can I help you today? 😊`);
    loadConversations();
    loadMessages();
  }

  /* ── Close conversation ── */
  async function closeConversation() {
    if (!activeId) return;
    await updateConversation(activeId, { status: "closed" });
    loadConversations();
  }

  /* ── Send reply ── */
  async function sendReply(text?: string) {
    const msg = (text || replyText).trim();
    if (!msg || !activeId || sending) return;
    setSending(true);
    setReplyText("");

    await saveMessage(activeId, "agent", msg);
    await updateConversation(activeId, {});
    loadMessages();
    setSending(false);
    inputRef.current?.focus();
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); }
  };

  /* ── Filter ── */
  const filtered = conversations.filter(c => {
    const matchFilter = filter === "all" || c.status === filter;
    const matchSearch = !search
      || c.customer_name.toLowerCase().includes(search.toLowerCase())
      || (c.customer_email || "").toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const waitingCount = conversations.filter(c => c.status === "waiting").length;

  function timeAgo(iso: string) {
    if (!nowMs) return "—";
    const diff = nowMs - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <div style={{ minHeight:"100vh", background:"#080c1e", color:"white", fontFamily:"'Outfit','DM Sans',sans-serif", display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes pulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        ::-webkit-scrollbar       { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(99,102,241,.3); border-radius:2px; }
        textarea { resize:none; }
        textarea::placeholder { color:rgba(255,255,255,.22); }
        textarea:focus { outline:none; }
        .conv-item:hover { background:rgba(255,255,255,.04) !important; }
      `}</style>

      {/* ── TOP NAV ── */}
      <div style={{ height:56, borderBottom:"1px solid rgba(255,255,255,.07)", background:"rgba(7,10,27,.95)", backdropFilter:"blur(20px)", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px", flexShrink:0, position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{ background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.08)", borderRadius:8, padding:"6px 8px", cursor:"pointer", color:"rgba(255,255,255,.5)", transition:"all .2s" }}
            onMouseEnter={e=>(e.currentTarget.style.color="white")}
            onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,.5)")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#6366f1,#818cf8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>💬</div>
            <span style={{ fontWeight:800, fontSize:15, letterSpacing:"-.02em" }}>FinovaOS <span style={{ color:"#818cf8" }}>Support</span></span>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {waitingCount > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:99, background:"rgba(251,191,36,.12)", border:"1px solid rgba(251,191,36,.3)", animation: notifSound ? "pulse .5s ease" : "none" }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:"#fbbf24", animation:"blink 1.2s ease infinite" }}/>
              <span style={{ fontSize:12, fontWeight:700, color:"#fbbf24" }}>{waitingCount} waiting</span>
            </div>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:99, background:"rgba(52,211,153,.08)", border:"1px solid rgba(52,211,153,.2)" }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#34d399" }}/>
            <span style={{ fontSize:12, fontWeight:600, color:"#34d399" }}>{AGENT_NAME}</span>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* ── SIDEBAR ── */}
        {sidebarOpen && (
          <div style={{ width:300, flexShrink:0, borderRight:"1px solid rgba(255,255,255,.07)", display:"flex", flexDirection:"column", background:"rgba(255,255,255,.01)" }}>

            {/* Search + filters */}
            <div style={{ padding:"14px 14px 8px" }}>
              <div style={{ position:"relative", marginBottom:10 }}>
                <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"rgba(255,255,255,.3)" }}>🔍</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search conversations…"
                  style={{ width:"100%", padding:"8px 10px 8px 30px", borderRadius:9, border:"1.5px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.04)", color:"white", fontSize:12.5, fontFamily:"inherit", outline:"none" }}
                  onFocus={e=>(e.target.style.borderColor="rgba(129,140,248,.4)")}
                  onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/>
              </div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {(["all","waiting","agent","bot","closed"] as const).map(f => (
                  <button key={f} onClick={()=>setFilter(f)}
                    style={{ fontSize:10.5, fontWeight:700, padding:"3px 9px", borderRadius:99, border:"none", cursor:"pointer", fontFamily:"inherit",
                      background: filter===f ? (f==="waiting"?"#fbbf24":f==="agent"?"#34d399":f==="bot"?"#818cf8":f==="closed"?"#6b7280":"#6366f1") : "rgba(255,255,255,.06)",
                      color: filter===f ? (["waiting","agent","bot","closed"].includes(f)?"#080c1e":"white") : "rgba(255,255,255,.4)" }}>
                    {f === "all" ? `All (${conversations.length})` : f === "waiting" ? `⏳ ${f} (${conversations.filter(c=>c.status===f).length})` : f === "agent" ? `👤 ${f}` : f}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation list */}
            <div style={{ flex:1, overflowY:"auto" }}>
              {filtered.length === 0 && (
                <div style={{ padding:24, textAlign:"center", color:"rgba(255,255,255,.25)", fontSize:13 }}>
                  {conversations.length === 0 ? "No conversations yet.\nThe chat widget on your website will create them." : "No conversations match your filter."}
                </div>
              )}
              {filtered.map(conv => {
                const st = STATUS[conv.status] || STATUS.bot;
                const isActive = conv.id === activeId;
                return (
                  <div key={conv.id} className="conv-item" onClick={() => setActiveId(conv.id)}
                    style={{ padding:"12px 14px", borderBottom:"1px solid rgba(255,255,255,.04)", cursor:"pointer", transition:"background .15s",
                      background: isActive ? "rgba(99,102,241,.1)" : "transparent",
                      borderLeft: isActive ? "3px solid #6366f1" : "3px solid transparent" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <div style={{ width:7, height:7, borderRadius:"50%", background:st.dot, flexShrink:0 }}/>
                        <span style={{ fontSize:13, fontWeight:700, color:"white" }}>{conv.customer_name}</span>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <span style={{ fontSize:9.5, padding:"1px 6px", borderRadius:99, background:st.bg, color:st.color, fontWeight:700 }}>{st.label}</span>
                        <span style={{ fontSize:10, color:"rgba(255,255,255,.25)" }}>{timeAgo(conv.updated_at)}</span>
                      </div>
                    </div>
                    {conv.customer_email && <div style={{ fontSize:10.5, color:"rgba(255,255,255,.3)", marginBottom:3 }}>📧 {conv.customer_email}</div>}
                    {conv.last_message && (
                      <div style={{ fontSize:11.5, color:"rgba(255,255,255,.35)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {conv.last_message}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MAIN CHAT AREA ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {!activeId ? (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, color:"rgba(255,255,255,.2)" }}>
              <div style={{ fontSize:48 }}>💬</div>
              <div style={{ fontSize:16, fontWeight:700, color:"rgba(255,255,255,.4)" }}>Select a conversation</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.2)", textAlign:"center", maxWidth:320, lineHeight:1.6 }}>
                Pick a conversation from the sidebar to start helping customers.<br/>New chats appear automatically — no refresh needed.
              </div>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              {activeConv && (
                <div style={{ padding:"12px 20px", borderBottom:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, background:"rgba(255,255,255,.02)" }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:32, height:32, borderRadius:10, background:"linear-gradient(135deg,#6366f1,#818cf8)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, color:"white" }}>
                        {activeConv.customer_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700 }}>{activeConv.customer_name}</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>{activeConv.customer_email || "No email"} · {timeAgo(activeConv.created_at)}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    {(activeConv.status === "bot" || activeConv.status === "waiting") && (
                      <button onClick={takeOver} style={{ padding:"7px 16px", borderRadius:9, background:"linear-gradient(135deg,#34d399,#059669)", border:"none", color:"white", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                        👤 Take Over
                      </button>
                    )}
                    {activeConv.status !== "closed" && (
                      <button onClick={closeConversation} style={{ padding:"7px 14px", borderRadius:9, background:"rgba(239,68,68,.15)", border:"1px solid rgba(239,68,68,.3)", color:"#f87171", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                        ✕ Close
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:10 }}>
                {messages.map((msg, i) => (
                  <div key={msg.id || i} style={{ display:"flex", justifyContent: msg.sender === "customer" ? "flex-end" : "flex-start", gap:8, alignItems:"flex-end", animation:"fadeIn .2s ease both" }}>
                    {msg.sender !== "customer" && (
                      <div style={{ width:28, height:28, borderRadius:9, flexShrink:0, background: msg.sender === "agent" ? "linear-gradient(135deg,#34d399,#059669)" : "linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>
                        {msg.sender === "agent" ? "👤" : "🤖"}
                      </div>
                    )}
                    <div style={{
                      maxWidth:"72%", padding:"9px 14px",
                      borderRadius: msg.sender === "customer" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: msg.sender === "customer" ? "linear-gradient(135deg,#6366f1,#4f46e5)" : msg.sender === "agent" ? "rgba(52,211,153,.12)" : "rgba(255,255,255,.06)",
                      border: msg.sender === "agent" ? "1px solid rgba(52,211,153,.25)" : "none",
                      fontSize:13, color:"rgba(255,255,255,.88)", lineHeight:1.65, whiteSpace:"pre-line",
                    }}>
                      {msg.sender !== "customer" && (
                        <div style={{ fontSize:10, fontWeight:700, color: msg.sender === "agent" ? "#34d399" : "#818cf8", marginBottom:4, letterSpacing:".03em" }}>
                          {msg.sender === "agent" ? `👤 ${activeConv?.assigned_agent || "Agent"}` : "🤖 AI Bot"}
                        </div>
                      )}
                      {msg.text}
                      <div style={{ fontSize:9.5, color:"rgba(255,255,255,.25)", marginTop:4, textAlign:"right" }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                      </div>
                    </div>
                    {msg.sender === "customer" && (
                      <div style={{ width:28, height:28, borderRadius:9, flexShrink:0, background:"rgba(255,255,255,.08)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13 }}>
                        {activeConv?.customer_name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef}/>
              </div>

              {/* Quick replies */}
              {activeConv?.status === "agent" && (
                <div style={{ padding:"6px 20px", borderTop:"1px solid rgba(255,255,255,.05)", display:"flex", gap:6, flexWrap:"wrap", flexShrink:0 }}>
                  {QUICK_REPLIES.map((qr, i) => (
                    <button key={i} onClick={() => sendReply(qr)} style={{ fontSize:10.5, padding:"3px 10px", borderRadius:99, background:"rgba(99,102,241,.12)", border:"1px solid rgba(99,102,241,.25)", color:"#818cf8", cursor:"pointer", fontFamily:"inherit", fontWeight:600, transition:"all .15s", whiteSpace:"nowrap" }}
                      onMouseEnter={e=>{ e.currentTarget.style.background="rgba(99,102,241,.25)"; e.currentTarget.style.color="white"; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background="rgba(99,102,241,.12)"; e.currentTarget.style.color="#818cf8"; }}>
                      {qr.length > 40 ? qr.slice(0, 40) + "…" : qr}
                    </button>
                  ))}
                </div>
              )}

              {/* Reply box */}
              {activeConv && activeConv.status !== "closed" && (
                <div style={{ padding:"12px 20px 16px", flexShrink:0, borderTop:"1px solid rgba(255,255,255,.07)" }}>
                  {activeConv.status !== "agent" ? (
                    <div style={{ padding:14, borderRadius:12, background:"rgba(251,191,36,.06)", border:"1px solid rgba(251,191,36,.2)", fontSize:12.5, color:"#fbbf24", textAlign:"center" }}>
                      {activeConv.status === "waiting"
                        ? "⏳ Customer is waiting for you. Click \"Take Over\" to join the chat."
                        : "🤖 AI bot is handling this conversation. Click \"Take Over\" to take control."}
                    </div>
                  ) : (
                    <div style={{ display:"flex", gap:10, alignItems:"flex-end", background:"rgba(255,255,255,.04)", borderRadius:14, border:"1.5px solid rgba(255,255,255,.08)", padding:"10px 12px", transition:"border .2s" }}
                      onFocusCapture={e=>(e.currentTarget.style.borderColor="rgba(129,140,248,.4)")}
                      onBlurCapture={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,.08)")}>
                      <textarea
                        ref={inputRef}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={handleKey}
                        rows={2}
                        placeholder="Type your reply… (Enter to send, Shift+Enter for new line)"
                        style={{ flex:1, background:"none", border:"none", color:"white", fontSize:13.5, fontFamily:"inherit", lineHeight:1.6 }}
                      />
                      <button onClick={() => sendReply()} disabled={!replyText.trim() || sending} style={{
                        width:38, height:38, borderRadius:10, border:"none", flexShrink:0,
                        background: replyText.trim() ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.06)",
                        cursor: replyText.trim() ? "pointer" : "default",
                        display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s",
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" opacity={replyText.trim() ? 1 : 0.3}>
                          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeConv?.status === "closed" && (
                <div style={{ padding:16, flexShrink:0, borderTop:"1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ textAlign:"center", padding:12, borderRadius:12, background:"rgba(107,114,128,.08)", border:"1px solid rgba(107,114,128,.2)", fontSize:12.5, color:"#9ca3af" }}>
                    ✕ Conversation closed
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
