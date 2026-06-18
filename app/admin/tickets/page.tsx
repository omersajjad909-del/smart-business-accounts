"use client";

import { useEffect, useState, useRef } from "react";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketStatus = "open" | "answered" | "closed";

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  userEmail: string;
  companyName: string;
  replies: number;
  createdAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function getAuthHeaders(): Record<string, string> {
  const u = getCurrentUser();
  const hdrs: Record<string, string> = { "Content-Type": "application/json" };
  if (u?.role) hdrs["x-user-role"] = u.role;
  if (u?.id) hdrs["x-user-id"] = u.id;
  return hdrs;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<TicketStatus, { bg: string; color: string; label: string }> = {
  open:     { bg: "rgba(249,115,22,0.12)",  color: "#f97316", label: "Open" },
  answered: { bg: "rgba(99,102,241,0.12)",  color: "#818cf8", label: "Answered" },
  closed:   { bg: "rgba(100,116,139,0.12)", color: "#94a3b8", label: "Closed" },
};

function StatusBadge({ status }: { status: TicketStatus }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.open;
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 11px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: ".04em",
      background: s.bg,
      color: s.color,
    }}>
      {s.label}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 14,
          padding: "20px 24px",
          display: "flex",
          gap: 16,
          alignItems: "center",
          animation: "pulse 1.4s ease-in-out infinite",
          animationDelay: `${i * 0.1}s`,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ height: 14, width: "40%", background: "rgba(255,255,255,0.06)", borderRadius: 6, marginBottom: 10 }} />
            <div style={{ height: 11, width: "25%", background: "rgba(255,255,255,0.04)", borderRadius: 6 }} />
          </div>
          <div style={{ height: 22, width: 64, background: "rgba(255,255,255,0.05)", borderRadius: 20 }} />
          <div style={{ height: 11, width: 56, background: "rgba(255,255,255,0.04)", borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}

// ─── Reply Modal ──────────────────────────────────────────────────────────────

function ReplyModal({
  ticket,
  onClose,
  onSend,
  sending,
}: {
  ticket: Ticket;
  onClose: () => void;
  onSend: (msg: string) => Promise<void>;
  sending: boolean;
}) {
  const [reply, setReply] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textRef.current?.focus();
  }, []);

  async function handleSend() {
    const trimmed = reply.trim();
    if (!trimmed) { toast.error("Reply cannot be empty"); return; }
    await onSend(trimmed);
    setReply("");
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{
        background: "#0d1526",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20,
        padding: 32,
        width: "100%",
        maxWidth: 560,
        maxHeight: "88vh",
        overflowY: "auto",
        animation: "fadeUp .25s ease",
        fontFamily: "'Outfit','Inter',sans-serif",
      }}>
        {/* Modal header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <StatusBadge status={ticket.status} />
            <h2 style={{ margin: "10px 0 0", fontSize: 17, fontWeight: 800, color: "#e2e8f0", lineHeight: 1.35 }}>
              {ticket.subject}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: 4, marginLeft: 12 }}
          >
            ✕
          </button>
        </div>

        {/* Ticket meta */}
        <div style={{ display: "flex", gap: 16, marginBottom: 18, flexWrap: "wrap", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          <span>{ticket.companyName}</span>
          <span>{ticket.userEmail}</span>
          <span>{timeAgo(ticket.createdAt)}</span>
          <span>{ticket.replies} {ticket.replies === 1 ? "reply" : "replies"}</span>
        </div>

        {/* Original message */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          padding: "16px 18px",
          marginBottom: 22,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: ".07em", marginBottom: 10 }}>
            ORIGINAL MESSAGE
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.75 }}>
            {ticket.message}
          </p>
        </div>

        {/* Reply textarea */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: ".07em", marginBottom: 8 }}>
            YOUR REPLY
          </label>
          <textarea
            ref={textRef}
            rows={5}
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Type your reply to the customer..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "rgba(255,255,255,0.04)",
              border: "1.5px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "12px 14px",
              color: "#e2e8f0",
              fontFamily: "'Outfit','Inter',sans-serif",
              fontSize: 13.5,
              outline: "none",
              resize: "vertical",
              transition: "border-color .2s",
            }}
            onFocus={e => (e.target.style.borderColor = "rgba(99,102,241,0.5)")}
            onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
          />
        </div>

        {/* Modal actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "rgba(255,255,255,0.5)",
              fontFamily: "'Outfit','Inter',sans-serif",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !reply.trim()}
            style={{
              padding: "9px 22px",
              borderRadius: 10,
              border: "none",
              background: sending || !reply.trim() ? "rgba(99,102,241,0.3)" : "#6366f1",
              color: "white",
              fontFamily: "'Outfit','Inter',sans-serif",
              fontSize: 13,
              fontWeight: 700,
              cursor: sending || !reply.trim() ? "not-allowed" : "pointer",
              transition: "opacity .2s",
            }}
          >
            {sending ? "Sending…" : "Send Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type FilterTab = "all" | TicketStatus;

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "answered", label: "Answered" },
  { key: "closed", label: "Closed" },
];

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [replyTarget, setReplyTarget] = useState<Ticket | null>(null);
  const [sending, setSending] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const hdrs = getAuthHeaders();
      const r = await fetch("/api/admin/tickets", {
        cache: "no-store",
        headers: hdrs,
        credentials: "include",
      });
      const data = await r.json();
      setTickets(r.ok ? (data.tickets ?? []) : []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Derived counts
  const all      = tickets ?? [];
  const total    = all.length;
  const openCnt  = all.filter(t => t.status === "open").length;
  const answCnt  = all.filter(t => t.status === "answered").length;
  const closedCnt = all.filter(t => t.status === "closed").length;

  const visible = filter === "all" ? all : all.filter(t => t.status === filter);

  // ── Reply ──────────────────────────────────────────────────────────────────

  async function handleReply(message: string) {
    if (!replyTarget) return;
    setSending(true);
    try {
      const r = await fetch("/api/admin/tickets", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ action: "REPLY", ticketId: replyTarget.id, message }),
      });
      if (r.ok) {
        toast.success("Reply sent");
        setReplyTarget(null);
        load();
      } else {
        const d = await r.json().catch(() => ({}));
        toast.error(d.error ?? "Failed to send reply");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSending(false);
    }
  }

  // ── Close ticket ───────────────────────────────────────────────────────────

  async function handleClose(ticket: Ticket) {
    setClosingId(ticket.id);
    try {
      const r = await fetch("/api/admin/tickets", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ action: "UPDATE_STATUS", ticketId: ticket.id, status: "closed" }),
      });
      if (r.ok) {
        toast.success("Ticket closed");
        load();
      } else {
        const d = await r.json().catch(() => ({}));
        toast.error(d.error ?? "Failed to close ticket");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setClosingId(null);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const cardStyle = (accent?: string): React.CSSProperties => ({
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${accent ? `${accent}22` : "rgba(255,255,255,0.08)"}`,
    borderRadius: 14,
    padding: "20px 24px",
  });

  return (
    <div style={{ fontFamily: "'Outfit','Inter',sans-serif", color: "#e2e8f0", padding: "0 0 72px" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.45} }
        .tk-row:hover { background:rgba(255,255,255,0.025)!important; }
        .tk-tab-btn { border:none; cursor:pointer; font-family:inherit; font-weight:600; font-size:13px; padding:7px 16px; border-radius:9px; transition:all .18s; }
        .tk-action-btn { border:none; cursor:pointer; font-family:inherit; font-weight:700; font-size:12px; padding:6px 14px; border-radius:8px; transition:opacity .18s; }
        .tk-action-btn:hover { opacity:0.82; }
        .tk-action-btn:disabled { opacity:0.4; cursor:not-allowed; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 5px", fontSize: 26, fontWeight: 800, letterSpacing: "-.3px" }}>Support Tickets</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
          Customer support requests and replies
        </p>
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total",    val: total,     color: "#818cf8" },
          { label: "Open",     val: openCnt,   color: "#f97316" },
          { label: "Answered", val: answCnt,   color: "#818cf8" },
          { label: "Closed",   val: closedCnt, color: "#94a3b8" },
        ].map(k => (
          <div key={k.label} style={{ ...cardStyle(), padding: "18px 22px" }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: k.color, lineHeight: 1 }}>
              {loading ? "—" : k.val}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6, fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className="tk-tab-btn"
            onClick={() => setFilter(tab.key)}
            style={{
              background: filter === tab.key ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.05)",
              color: filter === tab.key ? "#818cf8" : "rgba(255,255,255,0.5)",
              border: filter === tab.key ? "1px solid rgba(99,102,241,0.35)" : "1px solid transparent",
            }}
          >
            {tab.label}
            {!loading && tab.key !== "all" && (
              <span style={{
                marginLeft: 6,
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.45)",
              }}>
                {tab.key === "open" ? openCnt : tab.key === "answered" ? answCnt : closedCnt}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Ticket list ── */}
      {loading ? (
        <Skeleton />
      ) : visible.length === 0 ? (
        /* ── Empty state ── */
        <div style={{
          ...cardStyle(),
          textAlign: "center",
          padding: "64px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{ fontSize: 40, opacity: 0.35 }}>💬</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>No tickets yet</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
            {filter === "all"
              ? "No support tickets have been submitted."
              : `No ${filter} tickets at the moment.`}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visible.map(ticket => (
            <div
              key={ticket.id}
              className="tk-row"
              style={{
                ...cardStyle(),
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
                transition: "background .18s",
                cursor: "default",
              }}
            >
              {/* Subject + meta */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 5, lineHeight: 1.35 }}>
                  {ticket.subject}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginBottom: 3 }}>
                  {ticket.companyName}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                  {ticket.userEmail}
                </div>
              </div>

              {/* Replies badge */}
              <div style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                whiteSpace: "nowrap",
                minWidth: 52,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.45)", lineHeight: 1 }}>
                  {ticket.replies}
                </div>
                <div>replies</div>
              </div>

              {/* Status badge */}
              <StatusBadge status={ticket.status} />

              {/* Time ago */}
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap", minWidth: 72, textAlign: "right" }}>
                {timeAgo(ticket.createdAt)}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  className="tk-action-btn"
                  onClick={() => setReplyTarget(ticket)}
                  style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" }}
                >
                  Reply
                </button>
                {ticket.status !== "closed" && (
                  <button
                    className="tk-action-btn"
                    onClick={() => handleClose(ticket)}
                    disabled={closingId === ticket.id}
                    style={{ background: "rgba(100,116,139,0.12)", color: "#94a3b8", border: "1px solid rgba(100,116,139,0.2)" }}
                  >
                    {closingId === ticket.id ? "…" : "Close"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Reply modal ── */}
      {replyTarget && (
        <ReplyModal
          ticket={replyTarget}
          onClose={() => !sending && setReplyTarget(null)}
          onSend={handleReply}
          sending={sending}
        />
      )}
    </div>
  );
}
