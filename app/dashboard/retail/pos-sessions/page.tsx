"use client";
import { useState, useEffect } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { confirmToast } from "@/lib/toast-feedback";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,.03)";
const border = "rgba(255,255,255,.07)";

type Session = {
  id: string;
  sessionRef: string;
  date: string;
  cashier: string;
  branch: string;
  openingCash: number;
  closingCash: number;
  cashSales: number;
  cardSales: number;
  transactions: number;
  totalSales: number;
  expectedCash: number;
  discrepancy: number;
  status: string;
};

export default function POSSessionsPage() {
  const { records, loading, create, update } = useBusinessRecords("pos_session");
  const { records: saleRecords } = useBusinessRecords("pos_sale");
  const user = getCurrentUser();

  const [showOpen, setShowOpen] = useState(false);
  const [openForm, setOpenForm] = useState({ cashier: "", branch: "Main Store", openingCash: "" });
  const [saving, setSaving] = useState(false);
  const [cashiers, setCashiers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [closingId, setClosingId] = useState<string | null>(null);
  const [closingCash, setClosingCash] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  // Fetch cashiers and branches when modal opens
  useEffect(() => {
    if (!showOpen || !user?.companyId) return;
    
    setLoadingOptions(true);
    const headers = {
      "Content-Type": "application/json",
      "x-company-id": user.companyId,
      "x-user-role": user.role || "",
      "x-user-id": user.id || "",
    };

    async function fetchData() {
      try {
        console.log("[POS] Fetching cashiers and branches...", headers);
        
        // Fetch users
        const usersRes = await fetch("/api/users", { 
          headers, 
          method: "GET"
        });
        console.log("[POS] Users response status:", usersRes.status);
        const usersData = usersRes.ok ? await usersRes.json() : [];
        console.log("[POS] Cashiers loaded:", usersData);
        
        // Fetch branches
        const branchesRes = await fetch("/api/branches", { 
          headers, 
          method: "GET"
        });
        console.log("[POS] Branches response status:", branchesRes.status);
        const branchesData = branchesRes.ok ? await branchesRes.json() : [];
        console.log("[POS] Branches loaded:", branchesData);

        // Set cashiers - only CASHIER role users
        const usersList = Array.isArray(usersData) ? usersData : [];
        setCashiers(usersList.filter((u: any) => u.role === "CASHIER"));

        // Set branches - only include active ones
        const branchesList = Array.isArray(branchesData) ? branchesData : [];
        setBranches(branchesList.filter((b: any) => b.isActive !== false));
      } catch (error: any) {
        console.error("[POS] Error fetching options:", error);
        setCashiers([]);
        setBranches([]);
      } finally {
        setLoadingOptions(false);
      }
    }

    fetchData();
  }, [showOpen, user?.companyId, user?.role, user?.id]);

  const sessions: Session[] = records.map(r => {
    const d = r.data || {};
    const cashSales = Number(d.cashSales || 0);
    const cardSales = Number(d.cardSales || 0);
    const openingCash = Number(d.openingCash || 0);
    const closingCash = Number(d.closingCash || 0);
    const expectedCash = openingCash + cashSales;
    const discrepancy = r.status === "CLOSED" ? closingCash - expectedCash : 0;
    return {
      id: r.id,
      sessionRef: r.title,
      date: r.date || r.createdAt.slice(0, 10),
      cashier: String(d.cashier || ""),
      branch: String(d.branch || "Main Store"),
      openingCash,
      closingCash,
      cashSales,
      cardSales,
      transactions: Number(d.transactions || 0),
      totalSales: (r.amount || 0),
      expectedCash,
      discrepancy,
      status: r.status || "OPEN",
    };
  });

  const openSessions = sessions.filter(s => s.status === "OPEN");
  const todaySessions = sessions.filter(s => s.date === today);
  const todayRevenue = todaySessions.reduce((a, s) => a + s.totalSales, 0);
  const todayTxns = todaySessions.reduce((a, s) => a + s.transactions, 0);

  async function openSession() {
    if (!openForm.cashier.trim()) return;
    setSaving(true);
    try {
      const sessionRef = `S-${Date.now().toString().slice(-6)}`;
      await create({
        title: sessionRef,
        status: "OPEN",
        date: today,
        amount: 0,
        data: { cashier: openForm.cashier, branch: openForm.branch, openingCash: Number(openForm.openingCash) || 0, cashSales: 0, cardSales: 0, transactions: 0 },
      });
      setShowOpen(false);
      setOpenForm({ cashier: "", branch: "Main Store", openingCash: "" });
    } finally {
      setSaving(false);
    }
  }

  async function closeSession(session: Session) {
    const cash = Number(closingCash);
    if (!await confirmToast(`Close session ${session.sessionRef}? This cannot be reopened.`)) return;
    await update(session.id, {
      status: "CLOSED",
      data: {
        cashier: session.cashier,
        branch: session.branch,
        openingCash: session.openingCash,
        cashSales: session.cashSales,
        cardSales: session.cardSales,
        transactions: session.transactions,
        closingCash: cash,
      },
    });
    setClosingId(null);
    setClosingCash("");
  }

  // Sales belonging to a session
  function sessionSales(sessionId: string) {
    return saleRecords.filter(r => r.data?.sessionId === sessionId);
  }

  const inp: React.CSSProperties = {
    background: "rgba(255,255,255,.05)", border: `1px solid ${border}`, borderRadius: 8,
    padding: "9px 12px", color: "#fff", fontSize: 13, fontFamily: ff, outline: "none",
    width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh", background: "#0a0f1a" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>📋 POS Sessions</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.35)", margin: 0 }}>Shift management — opening cash, sales tracking, closing reconciliation</p>
        </div>
        <button
          onClick={() => setShowOpen(true)}
          style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          + Open New Session
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Open Sessions", value: openSessions.length, color: "#10b981", sub: openSessions.map(s => s.cashier).join(", ") || "None" },
          { label: "Today's Revenue", value: `Rs. ${todayRevenue.toLocaleString()}`, color: "#34d399", sub: `${todaySessions.length} sessions today` },
          { label: "Today's Transactions", value: todayTxns, color: "#818cf8", sub: "All shifts combined" },
          { label: "Total Sessions", value: sessions.length, color: "rgba(255,255,255,.6)", sub: `${sessions.filter(s => s.status === "CLOSED").length} closed` },
        ].map(s => (
          <div key={s.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "18px 22px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginBottom: 4 }}>{loading ? "…" : s.value}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Sessions list */}
      {loading && <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.3)" }}>Loading...</div>}
      {!loading && sessions.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.2)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, marginBottom: 6 }}>No session</div>
          <div style={{ fontSize: 13 }}>Start your first cashier shift</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sessions.map(session => {
          const isOpen = session.status === "OPEN";
          const isExpanded = expandedId === session.id;
          const isClosing = closingId === session.id;
          const thisSales = sessionSales(session.id);

          return (
            <div key={session.id} style={{ background: bg, border: `1px solid ${isOpen ? "rgba(16,185,129,.3)" : border}`, borderRadius: 14, overflow: "hidden" }}>

              {/* Main row */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : session.id)}
                style={{ display: "grid", gridTemplateColumns: "110px 100px 140px 1fr 1fr 1fr 130px auto", alignItems: "center", gap: 16, padding: "16px 22px", cursor: "pointer" }}
              >
                {/* Session ref */}
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#818cf8" }}>{session.sessionRef}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2 }}>{session.date}</div>
                </div>

                {/* Status */}
                <div>
                  <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: isOpen ? "rgba(16,185,129,.15)" : "rgba(100,116,139,.12)", color: isOpen ? "#10b981" : "#94a3b8", border: `1px solid ${isOpen ? "rgba(16,185,129,.3)" : "rgba(100,116,139,.2)"}` }}>
                    {isOpen ? "🟢 OPEN" : "⚫ CLOSED"}
                  </span>
                </div>

                {/* Cashier + Branch */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{session.cashier}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{session.branch}</div>
                </div>

                {/* Opening cash */}
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 3 }}>Opening Cash</div>
                  <div style={{ fontWeight: 700 }}>Rs. {session.openingCash.toLocaleString()}</div>
                </div>

                {/* Sales */}
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 3 }}>Sales · {session.transactions} txns</div>
                  <div style={{ fontWeight: 700, color: "#34d399" }}>Rs. {session.totalSales.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2 }}>
                    Cash Rs. {session.cashSales.toLocaleString()} · Card Rs. {session.cardSales.toLocaleString()}
                  </div>
                </div>

                {/* Reconciliation (only if closed) */}
                <div>
                  {!isOpen ? (
                    <>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 3 }}>Reconciliation</div>
                      <div style={{ fontSize: 12 }}>Expected: <strong>Rs. {session.expectedCash.toLocaleString()}</strong></div>
                      <div style={{ fontSize: 12 }}>Actual: <strong>Rs. {session.closingCash.toLocaleString()}</strong></div>
                      <div style={{ fontSize: 12, fontWeight: 800, marginTop: 3, color: session.discrepancy === 0 ? "#34d399" : session.discrepancy > 0 ? "#818cf8" : "#f87171" }}>
                        {session.discrepancy === 0 ? "✅ Balanced" : session.discrepancy > 0 ? `▲ Over Rs. ${session.discrepancy.toLocaleString()}` : `▼ Short Rs. ${Math.abs(session.discrepancy).toLocaleString()}`}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.25)" }}>Session open</div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                  {isOpen && (
                    <button
                      onClick={() => { setClosingId(session.id); setClosingCash(""); }}
                      style={{ padding: "7px 14px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      Close
                    </button>
                  )}
                  <div style={{ width: 24, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.2)", fontSize: 11 }}>
                    {isExpanded ? "▲" : "▼"}
                  </div>
                </div>
              </div>

              {/* Close Session Modal (inline) */}
              {isClosing && (
                <div style={{ borderTop: `1px solid rgba(239,68,68,.2)`, background: "rgba(239,68,68,.05)", padding: "20px 24px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#f87171", marginBottom: 16 }}>🔒 Close Session — {session.sessionRef}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 6 }}>Opening Cash</div>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>Rs. {session.openingCash.toLocaleString()}</div>
                    </div>
                    <div style={{ background: "rgba(16,185,129,.06)", border: "1px solid rgba(16,185,129,.15)", borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 6 }}>Cash Sales</div>
                      <div style={{ fontWeight: 800, fontSize: 18, color: "#34d399" }}>Rs. {session.cashSales.toLocaleString()}</div>
                    </div>
                    <div style={{ background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.15)", borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 6 }}>Expected in Drawer</div>
                      <div style={{ fontWeight: 800, fontSize: 18, color: "#818cf8" }}>Rs. {session.expectedCash.toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Actual Cash in Drawer (Count it) *</label>
                      <input
                        type="number" min="0" autoFocus
                        value={closingCash}
                        onChange={e => setClosingCash(e.target.value)}
                        placeholder={`Expected: ${session.expectedCash.toLocaleString()}`}
                        style={inp}
                      />
                      {closingCash && (
                        <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: Number(closingCash) === session.expectedCash ? "#34d399" : Number(closingCash) > session.expectedCash ? "#818cf8" : "#f87171" }}>
                          {Number(closingCash) === session.expectedCash
                            ? "✅ Perfectly balanced!"
                            : Number(closingCash) > session.expectedCash
                            ? `▲ Over by Rs. ${(Number(closingCash) - session.expectedCash).toLocaleString()}`
                            : `▼ Short by Rs. ${(session.expectedCash - Number(closingCash)).toLocaleString()}`}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setClosingId(null)} style={{ padding: "10px 18px", background: "transparent", border: `1px solid ${border}`, color: "rgba(255,255,255,.6)", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                        Cancel
                      </button>
                      <button
                        onClick={() => closeSession(session)}
                        disabled={!closingCash}
                        style={{ padding: "10px 22px", background: !closingCash ? "rgba(255,255,255,.08)" : "rgba(239,68,68,.8)", color: !closingCash ? "rgba(255,255,255,.3)" : "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: closingCash ? "pointer" : "not-allowed" }}
                      >
                        Confirm Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Expanded — Sales in session */}
              {isExpanded && !isClosing && (
                <div style={{ borderTop: `1px solid ${border}`, padding: "20px 24px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 14 }}>
                    Sales in this session ({thisSales.length})
                  </div>
                  {thisSales.length === 0 ? (
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.25)", padding: "12px 0" }}>No sales recorded in this session.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {thisSales.map(sale => {
                        const sd = sale.data || {};
                        return (
                          <div key={sale.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 14px", background: "rgba(255,255,255,.025)", borderRadius: 8 }}>
                            <div style={{ fontWeight: 700, color: "#818cf8", minWidth: 100, fontSize: 13 }}>{sale.title}</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", flex: 1 }}>{String(sd.items || "")}</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", textTransform: "capitalize" }}>{String(sd.payMethod || "cash")}</div>
                            <div style={{ fontWeight: 700, color: "#34d399", minWidth: 100, textAlign: "right" }}>Rs. {(sale.amount || 0).toLocaleString()}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Open Session Modal */}
      {showOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", backdropFilter: "blur(8px)", zIndex: 99, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#111827", border: `1px solid ${border}`, borderRadius: 18, padding: 32, width: 440, fontFamily: ff }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800 }}>🟢 Open New Session</h2>
                <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>Start cashier shift</p>
              </div>
              <button onClick={() => setShowOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Cashier Name *</label>
                <select
                  value={openForm.cashier} onChange={e => setOpenForm(f => ({ ...f, cashier: e.target.value }))}
                  style={inp} autoFocus
                >
                  <option value="">— Select Cashier —</option>
                  {loadingOptions ? (
                    <option disabled>Loading cashier...</option>
                  ) : cashiers.length > 0 ? (
                    cashiers.map((c: any) => (
                      <option key={c.id} value={c.name || c.email}>
                        {c.name || c.email}{c.role ? ` (${c.role})` : ""}
                      </option>
                    ))
                  ) : (
                    <option disabled>No cashiers available</option>
                  )}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Branch / Counter</label>
                <select
                  value={openForm.branch} onChange={e => setOpenForm(f => ({ ...f, branch: e.target.value }))}
                  style={inp}
                >
                  {branches.length > 0 ? (
                    branches.map((b: any) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))
                  ) : (
                    <option value="Main Store">Main Store</option>
                  )}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Opening Cash (drawer mein kitna daala)</label>
                <input
                  type="number" min="0"
                  value={openForm.openingCash} onChange={e => setOpenForm(f => ({ ...f, openingCash: e.target.value }))}
                  placeholder="e.g. 5000" style={inp}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => setShowOpen(false)} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${border}`, color: "rgba(255,255,255,.6)", borderRadius: 10, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
              <button
                onClick={openSession}
                disabled={saving || !openForm.cashier.trim()}
                style={{ padding: "10px 24px", background: !openForm.cashier.trim() ? "rgba(255,255,255,.08)" : "linear-gradient(135deg,#10b981,#059669)", color: !openForm.cashier.trim() ? "rgba(255,255,255,.3)" : "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: openForm.cashier.trim() ? "pointer" : "not-allowed" }}
              >
                {saving ? "Opening..." : "🟢 Open Session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
