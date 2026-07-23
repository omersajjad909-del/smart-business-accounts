"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useResponsive } from "@/hooks/useResponsive";

interface Conversation {
  id: string;
  customer_name: string;
  customer_email: string | null;
  status: string;
  assigned_agent: string | null;
  created_at: string;
  updated_at: string;
  last_message: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender: string;
  text: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  bot:      "Bot",
  waiting:  "Waiting",
  active:   "Active",
  resolved: "Resolved",
};
const STATUS_COLOR: Record<string, string> = {
  bot:      "#6366f1",
  waiting:  "#f59e0b",
  active:   "#34d399",
  resolved: "rgba(255,255,255,.25)",
};

function fmt(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function AdminChatInbox() {
  const { isMobile } = useResponsive();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filter, setFilter]               = useState("all");
  const [selected, setSelected]           = useState<Conversation | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [reply, setReply]                 = useState("");
  const [sending, setSending]             = useState(false);
  const [loading, setLoading]             = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConvos = useCallback(async () => {
    const r = await fetch(`/api/chat/conversations?status=${filter}&limit=100`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setConversations(d.data ?? []);
    }
    setLoading(false);
  }, [filter]);

  const fetchMessages = useCallback(async (convId: string) => {
    const r = await fetch(`/api/chat/messages?conversationId=${convId}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setMessages(d.data ?? []);
    }
  }, []);

  useEffect(() => { fetchConvos(); }, [fetchConvos]);

  useEffect(() => {
    if (!selected) return;
    fetchMessages(selected.id);
    const t = setInterval(() => fetchMessages(selected.id), 8000);
    return () => clearInterval(t);
  }, [selected, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendReply() {
    if (!reply.trim() || !selected || sending) return;
    setSending(true);
    const text = reply.trim();
    setReply("");
    await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: selected.id, sender: "agent", text }),
    });
    await fetch(`/api/chat/conversations/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    await fetchMessages(selected.id);
    fetchConvos();
    setSending(false);
  }

  async function updateStatus(convId: string, status: string) {
    await fetch(`/api/chat/conversations/${convId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchConvos();
    if (selected?.id === convId) setSelected(s => s ? { ...s, status } : s);
  }

  const waitingCount = conversations.filter(c => c.status === "waiting").length;

  return (
    <div style={{ height: "calc(100vh - 56px)", display: "flex", flexDirection: "column", fontFamily: "'Outfit','Inter',sans-serif", background: "var(--bg)", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: isMobile ? "12px 11px" : "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div style={{ fontSize: 18 }}>💬</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Support Inbox</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Live chat conversations from finovaos.app</div>
        </div>
        {waitingCount > 0 && (
          <div style={{ marginLeft: "auto", background: "#f59e0b", color: "#000", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 800 }}>
            {waitingCount} waiting
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* LEFT — conversation list */}
        <div style={{ width: 300, flexShrink: 0, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 4, padding: "10px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            {["all", "waiting", "active", "bot", "resolved"].map(f => (
              <button key={f} onClick={() => { setFilter(f); setSelected(null); setMessages([]); }} style={{
                padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: filter === f ? "rgba(99,102,241,.18)" : "transparent",
                color: filter === f ? "#818cf8" : "var(--text-muted)",
                border: filter === f ? "1px solid rgba(99,102,241,.3)" : "1px solid transparent",
              }}>
                {f === "all" ? "All" : STATUS_LABEL[f]}
                {f === "waiting" && waitingCount > 0 && <span style={{ marginLeft: 4, background: "#f59e0b", color: "#000", borderRadius: 20, padding: "0 5px", fontSize: 10, fontWeight: 800 }}>{waitingCount}</span>}
              </button>
            ))}
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading...</div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No conversations</div>
            ) : conversations.map(c => (
              <div key={c.id} onClick={() => { setSelected(c); fetchMessages(c.id); }} style={{
                padding: "12px 14px", cursor: "pointer",
                background: selected?.id === c.id ? "rgba(99,102,241,.08)" : "transparent",
                borderBottom: "1px solid var(--border)",
                borderLeft: c.status === "waiting" ? "3px solid #f59e0b" : "3px solid transparent",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{c.customer_name}</span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{fmt(c.updated_at)}</span>
                </div>
                {c.customer_email && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{c.customer_email}</div>
                )}
                <div style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 6 }}>
                  {c.last_message || "No messages yet"}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                  background: `${STATUS_COLOR[c.status] || "#888"}22`,
                  color: STATUS_COLOR[c.status] || "#888",
                  border: `1px solid ${STATUS_COLOR[c.status] || "#888"}44`,
                }}>
                  {STATUS_LABEL[c.status] || c.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — conversation thread */}
        {!selected ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 40 }}>💬</div>
            <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Select a conversation to view messages</div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Thread header */}
            <div style={{ padding: isMobile ? "12px 10px" : "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{selected.customer_name}</div>
                {selected.customer_email && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{selected.customer_email}</div>}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                background: `${STATUS_COLOR[selected.status] || "#888"}22`,
                color: STATUS_COLOR[selected.status] || "#888",
                border: `1px solid ${STATUS_COLOR[selected.status] || "#888"}44`,
              }}>
                {STATUS_LABEL[selected.status] || selected.status}
              </span>
              {selected.status !== "resolved" && (
                <button onClick={() => updateStatus(selected.id, "resolved")} style={{
                  padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: "rgba(52,211,153,.12)", color: "#34d399",
                  border: "1px solid rgba(52,211,153,.3)",
                }}>
                  Mark Resolved
                </button>
              )}
              {selected.status === "resolved" && (
                <button onClick={() => updateStatus(selected.id, "active")} style={{
                  padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: "rgba(99,102,241,.1)", color: "#818cf8",
                  border: "1px solid rgba(99,102,241,.25)",
                }}>
                  Reopen
                </button>
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px 10px" : "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, marginTop: 40 }}>No messages yet</div>
              ) : messages.map(m => {
                const isAgent = m.sender === "agent";
                const isBot   = m.sender === "bot";
                const isSystem = m.sender === "system";
                if (isSystem) return (
                  <div key={m.id} style={{ textAlign: "center", fontSize: 11, color: "#f59e0b", padding: "4px 12px", background: "rgba(245,158,11,.08)", borderRadius: 20, alignSelf: "center" }}>
                    {m.text}
                  </div>
                );
                return (
                  <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isAgent ? "flex-end" : "flex-start" }}>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>
                      {isAgent ? "You (Agent)" : isBot ? "AI Bot" : selected.customer_name} · {fmt(m.created_at)}
                    </div>
                    <div style={{
                      maxWidth: "72%", padding: "10px 14px", borderRadius: isAgent ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      fontSize: 13, lineHeight: 1.55,
                      background: isAgent ? "linear-gradient(135deg,#6366f1,#4f46e5)" : isBot ? "rgba(99,102,241,.1)" : "rgba(255,255,255,.06)",
                      color: isAgent ? "white" : "var(--text)",
                      border: isAgent ? "none" : "1px solid var(--border)",
                    }}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Reply input */}
            {selected.status !== "resolved" && (
              <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, flexShrink: 0 }}>
                <input
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendReply()}
                  placeholder="Type a reply… (Enter to send)"
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: 10, fontSize: 13,
                    background: "var(--input-bg, rgba(255,255,255,.04))",
                    border: "1px solid var(--border)", color: "var(--text)",
                    outline: "none", fontFamily: "inherit",
                  }}
                />
                <button onClick={sendReply} disabled={sending || !reply.trim()} style={{
                  padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: reply.trim() ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.06)",
                  color: reply.trim() ? "white" : "var(--text-muted)",
                  border: "none", transition: "all .2s",
                }}>
                  {sending ? "…" : "Send"}
                </button>
              </div>
            )}
            {selected.status === "resolved" && (
              <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", textAlign: "center", fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>
                Conversation resolved · Click Reopen to continue
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
