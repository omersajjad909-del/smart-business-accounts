"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type PkRequest = {
  id: string;
  email: string;
  plan: string;
  billingCycle: string;
  method: string;
  mobileNumber: string;
  txId: string;
  amountPkr: number;
  status: string;
  adminNote: string | null;
  companyId: string | null;
  userId: string | null;
  createdAt: string;
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING:  { bg: "rgba(251,191,36,.12)",  color: "#fbbf24" },
  APPROVED: { bg: "rgba(52,211,153,.12)",  color: "#34d399" },
  REJECTED: { bg: "rgba(248,113,113,.12)", color: "#f87171" },
};

export default function PkPaymentsPage() {
  const [requests, setRequests] = useState<PkRequest[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<"ALL"|"PENDING"|"APPROVED"|"REJECTED">("PENDING");
  const [noteId,   setNoteId]   = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [acting,   setActing]   = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/pk-payments");
      const d = await r.json();
      if (Array.isArray(d.requests)) setRequests(d.requests);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function act(id: string, status: "APPROVED" | "REJECTED") {
    setActing(id);
    try {
      const r = await fetch("/api/admin/pk-payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, adminNote: noteText || null }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error || "Failed"); return; }
      toast.success(status === "APPROVED" ? "✅ Approved & subscription activated" : "❌ Rejected");
      setNoteId(null);
      setNoteText("");
      load();
    } catch { toast.error("Network error"); }
    finally { setActing(null); }
  }

  const visible = requests.filter(r => filter === "ALL" || r.status === filter);

  return (
    <div style={{ padding: "32px 28px", minHeight: "100vh", background: "#0b0f24", color: "white", fontFamily: "'Outfit', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🇵🇰 PK Payment Requests</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>JazzCash & Easypaisa — manual approval queue</div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map(f => {
          const count = f === "ALL" ? requests.length : requests.filter(r => r.status === f).length;
          const active = filter === f;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "7px 16px", borderRadius: 10, border: "1.5px solid",
              borderColor: active ? "rgba(99,102,241,.5)" : "rgba(255,255,255,.08)",
              background: active ? "rgba(99,102,241,.12)" : "rgba(255,255,255,.03)",
              color: active ? "#a5b4fc" : "rgba(255,255,255,.4)",
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>
              {f} <span style={{ opacity: .6 }}>({count})</span>
            </button>
          );
        })}
        <button onClick={load} style={{ marginLeft: "auto", padding: "7px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.5)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          ↻ Refresh
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.3)" }}>Loading…</div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.3)" }}>No {filter !== "ALL" ? filter.toLowerCase() : ""} requests</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visible.map(req => {
            const ss = STATUS_STYLE[req.status] || STATUS_STYLE.PENDING;
            const isActing = acting === req.id;
            return (
              <div key={req.id} style={{ borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>

                  {/* Left: info */}
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 18 }}>{req.method === "jazzcash" ? "📱" : "💳"}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "white" }}>
                          {req.method === "jazzcash" ? "JazzCash" : "Easypaisa"}
                          <span style={{ marginLeft: 8, fontSize: 11, padding: "2px 8px", borderRadius: 8, background: ss.bg, color: ss.color, fontWeight: 700 }}>
                            {req.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2 }}>
                          {new Date(req.createdAt).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: "6px 20px" }}>
                      {[
                        ["Email",   req.email],
                        ["Mobile",  req.mobileNumber],
                        ["TX ID",   req.txId],
                        ["Amount",  `PKR ${req.amountPkr.toLocaleString()}`],
                        ["Plan",    `${req.plan} · ${req.billingCycle}`],
                        ["Company", req.companyId || "—"],
                      ].map(([lbl, val]) => (
                        <div key={lbl}>
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>{lbl}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.75)", wordBreak: "break-all" }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {req.adminNote && (
                      <div style={{ marginTop: 10, padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,.04)", fontSize: 11, color: "rgba(255,255,255,.5)" }}>
                        Note: {req.adminNote}
                      </div>
                    )}
                  </div>

                  {/* Right: actions */}
                  {req.status === "PENDING" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>
                      {noteId === req.id ? (
                        <>
                          <textarea
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            placeholder="Optional note (e.g. verified via JazzCash app)…"
                            rows={2}
                            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white", fontSize: 12, fontFamily: "inherit", resize: "none" }}
                          />
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                            <button onClick={() => act(req.id, "APPROVED")} disabled={isActing} style={{ padding: "9px", borderRadius: 9, border: "none", background: isActing ? "rgba(52,211,153,.3)" : "rgba(52,211,153,.15)", color: "#34d399", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                              {isActing ? "…" : "✅ Approve"}
                            </button>
                            <button onClick={() => act(req.id, "REJECTED")} disabled={isActing} style={{ padding: "9px", borderRadius: 9, border: "none", background: "rgba(248,113,113,.1)", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                              {isActing ? "…" : "❌ Reject"}
                            </button>
                          </div>
                          <button onClick={() => { setNoteId(null); setNoteText(""); }} style={{ padding: "6px", borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", background: "transparent", color: "rgba(255,255,255,.3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setNoteId(req.id)} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(99,102,241,.3)", background: "rgba(99,102,241,.08)", color: "#a5b4fc", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                          Review →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
