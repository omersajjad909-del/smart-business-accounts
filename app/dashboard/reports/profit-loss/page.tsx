"use client";

import toast from "react-hot-toast";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";

interface LineItem { name: string; amount: number; }
interface PLReport {
  // Revenue
  grossSales: number; salesReturns: number; salesDiscounts: number; netSales: number;
  // COGS
  openingStock: number; purchases: number; freightInward: number;
  purchaseDiscounts: number; closingStock: number; cogs: number;
  // Gross
  grossProfit: number; grossMarginPct: number;
  // OpEx
  operatingExpenses: LineItem[]; totalOpEx: number;
  // EBIT
  operatingProfit: number; operatingMarginPct: number;
  // Other
  otherIncome: LineItem[]; totalOtherIncome: number;
  financeExpenses: LineItem[]; totalFinanceExpenses: number;
  // EBT / Tax / Net
  ebt: number; taxEntries: LineItem[]; taxAmount: number;
  netProfit: number; netMarginPct: number;
}

const todayStr    = () => new Date().toISOString().slice(0, 10);
const firstOfYear = () => `${new Date().getFullYear()}-01-01`;

function getHeaders(): Record<string, string> {
  const user = getCurrentUser();
  if (!user) return {};
  return { "x-user-id": user.id, "x-user-role": user.role ?? "", "x-company-id": user.companyId ?? "" };
}

const fmt = (n: number) =>
  `Rs. ${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function MarginBadge({ pct }: { pct: number }) {
  const c = pct >= 0 ? "#34d399" : "#f87171";
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: c, background: `${c}18`, border: `1px solid ${c}30`, borderRadius: 5, padding: "2px 8px", marginLeft: 8 }}>
      {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

type RowVariant = "normal" | "subtotal" | "total" | "deduct";
function PLRow({ label, amount, variant = "normal", indent = false, dimZero = false }: {
  label: string; amount: number; variant?: RowVariant; indent?: boolean; dimZero?: boolean;
}) {
  const isZero = Math.abs(amount) < 0.005;
  if (dimZero && isZero) return null;

  const styles: Record<RowVariant, React.CSSProperties> = {
    normal:   { fontSize: 13, color: "rgba(255,255,255,.65)", fontWeight: 400 },
    deduct:   { fontSize: 13, color: "#f87171",               fontWeight: 500 },
    subtotal: { fontSize: 13, color: "#e2e8f0",               fontWeight: 700, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 8, marginTop: 4 },
    total:    { fontSize: 15, color: "#fff",                   fontWeight: 900 },
  };
  const s = styles[variant];
  const amtColor = variant === "total" || variant === "subtotal"
    ? (amount >= 0 ? "#34d399" : "#f87171")
    : variant === "deduct"
      ? "#f87171"
      : "rgba(255,255,255,.7)";

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", ...(variant === "subtotal" || variant === "total" ? { borderTop: "1px solid rgba(255,255,255,.08)", marginTop: 6, paddingTop: 8 } : {}) }}>
      <span style={{ ...s, paddingLeft: indent ? 16 : 0 }}>{label}</span>
      <span style={{ ...s, color: amtColor, fontFamily: "'Courier New',monospace", minWidth: 140, textAlign: "right" }}>
        {variant === "deduct" && amount > 0 ? `(${fmt(amount)})` : fmt(amount)}
      </span>
    </div>
  );
}

function Section({ title, color, icon, children }: { title: string; color: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
      <div style={{ padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,.06)", background: `${color}0c`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color }}>{title}</span>
      </div>
      <div style={{ padding: "12px 18px" }}>{children}</div>
    </div>
  );
}

function ResultBar({ label, amount, margin, color }: { label: string; amount: number; margin?: number; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderRadius: 12, background: `${color}0f`, border: `1.5px solid ${color}33`, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color }}>{label}</span>
        {margin !== undefined && <MarginBadge pct={margin} />}
      </div>
      <span style={{ fontSize: 22, fontWeight: 900, color, fontFamily: "'Courier New',monospace" }}>
        {amount < 0 ? "(" : ""}{fmt(Math.abs(amount))}{amount < 0 ? ")" : ""}
      </span>
    </div>
  );
}

export default function ProfitLossPage() {
  const router  = useRouter();
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef   = useRef<HTMLInputElement>(null);
  const [showModal,    setShowModal]    = useState(true);
  const [from,         setFrom]         = useState(firstOfYear());
  const [to,           setTo]           = useState(todayStr());
  const [report,       setReport]       = useState<PLReport | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  async function loadReport() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/reports/profit-loss?from=${from}&to=${to}`, { headers: getHeaders(), credentials: "include" });
      const d   = await res.json();
      if (!res.ok) { setError(d.error || "Failed to load report"); return; }
      setReport(d);
    } catch { setError("Network error — could not load report"); }
    finally  { setLoading(false); }
  }

  function handleGenerate() { setShowModal(false); loadReport(); }

  async function sendEmail() {
    const email = window.prompt("Enter email address:");
    if (!email || !email.includes("@")) return;
    setSendingEmail(true);
    try {
      const user = getCurrentUser();
      const res  = await fetch("/api/email/send", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "x-user-role": user?.role ?? "", "x-user-id": user?.id ?? "", "x-company-id": user?.companyId ?? "" },
        body: JSON.stringify({ type: "custom", to: email, subject: `P&L Report: ${from} to ${to}`, message: `Profit & Loss report for the period ${from} to ${to}.` }),
      });
      const data = await res.json();
      res.ok ? toast.success("Email sent") : toast.error(data.error || "Failed to send email");
    } catch { toast.error("Error sending email"); }
    finally { setSendingEmail(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 14,
    background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)",
    color: "white", outline: "none", fontFamily: ff, boxSizing: "border-box",
  };

  return (
    <div style={{ fontFamily: ff, color: "rgba(255,255,255,.85)", minHeight: "100vh" }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @media print{.no-print{display:none!important}}`}</style>

      {/* ── DATE PICKER MODAL ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,.82)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 460, background: "rgba(10,13,32,.97)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 22, padding: "40px 40px 36px", boxShadow: "0 40px 100px rgba(0,0,0,.8)", position: "relative" }}>
            <button onClick={() => report ? setShowModal(false) : router.back()} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", color: "rgba(255,255,255,.35)", fontSize: 20, cursor: "pointer", padding: 4, borderRadius: 6 }}>✕</button>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📊</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "white", letterSpacing: "-.3px" }}>Profit & Loss</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 2 }}>Select reporting period</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".08em", textTransform: "uppercase", display: "block", marginBottom: 7 }}>From</label>
                <DateInput ref={fromRef} value={from} onChange={setFrom} style={inputStyle} autoFocus onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); toRef.current?.focus(); } }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".08em", textTransform: "uppercase", display: "block", marginBottom: 7 }}>To</label>
                <DateInput ref={toRef} value={to} onChange={setTo} style={inputStyle} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleGenerate(); } }} />
              </div>
            </div>
            <button onClick={handleGenerate} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#10b981,#059669)", color: "white", fontSize: 15, fontWeight: 700, fontFamily: ff, boxShadow: "0 6px 24px rgba(16,185,129,.35)" }}>
              Generate Report →
            </button>
          </div>
        </div>
      )}

      {/* ── REPORT ── */}
      {!showModal && (
        <>
          {/* Top bar */}
          <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginBottom: 4 }}>Reports › <span style={{ color: "#a5b4fc" }}>Profit & Loss</span></div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-.02em" }}>Profit & Loss Statement</h1>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 4 }}>
                Period: <strong style={{ color: "#e2e8f0" }}>{from}</strong> → <strong style={{ color: "#e2e8f0" }}>{to}</strong>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => setShowModal(true)} style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.55)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>
                ⟵ Change Dates
              </button>
              <button onClick={() => window.print()} style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>
                🖨 Print
              </button>
              <button onClick={sendEmail} disabled={sendingEmail || !report} style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(52,211,153,.3)", background: "rgba(52,211,153,.06)", color: "#34d399", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff, opacity: (sendingEmail || !report) ? 0.5 : 1 }}>
                {sendingEmail ? "Sending…" : "✉ Email"}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#f87171", fontSize: 13 }}>{error}</div>
          )}

          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 16, color: "rgba(255,255,255,.3)" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(16,185,129,.2)", borderTopColor: "#10b981", animation: "spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 14 }}>Building your P&L report…</span>
            </div>
          )}

          {report && !loading && (() => {
            const r = report;
            const isProfit = r.netProfit >= 0;
            const isGP     = r.grossProfit >= 0;
            const isEBIT   = r.operatingProfit >= 0;

            return (
              <>
                {/* ── KPI CARDS ── */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 24 }}>
                  {[
                    { label: "Net Sales",      val: r.netSales,        color: "#60a5fa", icon: "💰" },
                    { label: "COGS",           val: r.cogs,            color: "#fb923c", icon: "📦" },
                    { label: "Gross Profit",   val: r.grossProfit,     color: isGP   ? "#34d399" : "#f87171", icon: isGP   ? "📈" : "📉", pct: r.grossMarginPct },
                    { label: "Operating Profit (EBIT)", val: r.operatingProfit, color: isEBIT ? "#a78bfa" : "#f87171", icon: "⚙️", pct: r.operatingMarginPct },
                    { label: isProfit ? "Net Profit" : "Net Loss", val: r.netProfit, color: isProfit ? "#34d399" : "#f87171", icon: isProfit ? "✅" : "⚠️", pct: r.netMarginPct },
                  ].map(k => (
                    <div key={k.label} style={{ background: `${k.color}0e`, border: `1px solid ${k.color}28`, borderRadius: 13, padding: "14px 16px" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.32)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                        <span>{k.icon}</span>{k.label}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: k.color, letterSpacing: "-.02em" }}>
                        {k.val < 0 ? "(" : ""}{fmt(Math.abs(k.val))}{k.val < 0 ? ")" : ""}
                      </div>
                      {k.pct !== undefined && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: k.pct >= 0 ? "#34d399" : "#f87171", marginTop: 4 }}>
                          Margin: {k.pct >= 0 ? "+" : ""}{k.pct.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* ═══════════════════════════════════
                    WATERFALL P&L STATEMENT
                ═══════════════════════════════════ */}

                {/* 1. REVENUE */}
                <Section title="Revenue — آمدنی" color="#60a5fa" icon="💰">
                  <PLRow label="Gross Sales" amount={r.grossSales} />
                  {r.salesReturns  > 0 && <PLRow label="— Sales Returns"   amount={r.salesReturns}   variant="deduct" indent />}
                  {r.salesDiscounts > 0 && <PLRow label="— Sales Discounts" amount={r.salesDiscounts}  variant="deduct" indent />}
                  <PLRow label="NET SALES" amount={r.netSales} variant="total" />
                </Section>

                {/* 2. COGS */}
                <Section title="Cost of Goods Sold — COGS" color="#fb923c" icon="📦">
                  <PLRow label="Opening Stock"         amount={r.openingStock}      dimZero />
                  <PLRow label="+ Purchases"           amount={r.purchases}          dimZero />
                  <PLRow label="+ Freight / Carriage"  amount={r.freightInward}      dimZero />
                  {r.purchaseDiscounts > 0 && <PLRow label="— Purchase Discounts" amount={r.purchaseDiscounts} variant="deduct" indent />}
                  {r.closingStock > 0 && <PLRow label="— Closing Stock" amount={r.closingStock} variant="deduct" indent />}
                  <PLRow label="COST OF GOODS SOLD" amount={r.cogs} variant="total" />
                </Section>

                {/* GROSS PROFIT */}
                <ResultBar label="GROSS PROFIT — مجموعی منافع" amount={r.grossProfit} margin={r.grossMarginPct} color={isGP ? "#34d399" : "#f87171"} />

                {/* 3. OPERATING EXPENSES */}
                <Section title="Operating Expenses — آپریٹنگ اخراجات" color="#f87171" icon="⚙️">
                  {r.operatingExpenses.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "16px 0", color: "rgba(255,255,255,.25)", fontSize: 13 }}>No operating expenses recorded in this period</div>
                  ) : r.operatingExpenses.map((e, i) => (
                    <PLRow key={i} label={e.name} amount={e.amount} indent />
                  ))}
                  {r.totalOpEx > 0 && <PLRow label="TOTAL OPERATING EXPENSES" amount={r.totalOpEx} variant="subtotal" />}
                </Section>

                {/* OPERATING PROFIT */}
                <ResultBar label="OPERATING PROFIT (EBIT)" amount={r.operatingProfit} margin={r.operatingMarginPct} color={isEBIT ? "#a78bfa" : "#f87171"} />

                {/* 4. OTHER INCOME / FINANCE COSTS */}
                {(r.otherIncome.length > 0 || r.financeExpenses.length > 0) && (
                  <Section title="Other Income & Finance Costs — غیر آپریٹنگ" color="#fbbf24" icon="🏦">
                    {r.otherIncome.length > 0 && (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#34d399", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4 }}>Other Income</div>
                        {r.otherIncome.map((e, i) => <PLRow key={i} label={`+ ${e.name}`} amount={e.amount} indent />)}
                        {r.otherIncome.length > 1 && <PLRow label="Total Other Income" amount={r.totalOtherIncome} variant="subtotal" />}
                      </>
                    )}
                    {r.financeExpenses.length > 0 && (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#f87171", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4, marginTop: 10 }}>Finance Costs</div>
                        {r.financeExpenses.map((e, i) => <PLRow key={i} label={`— ${e.name}`} amount={e.amount} variant="deduct" indent />)}
                        {r.financeExpenses.length > 1 && <PLRow label="Total Finance Costs" amount={r.totalFinanceExpenses} variant="subtotal" />}
                      </>
                    )}
                    {(r.otherIncome.length > 0 || r.financeExpenses.length > 0) && (
                      <PLRow label="NET OTHER INCOME / (EXPENSE)" amount={r.totalOtherIncome - r.totalFinanceExpenses} variant="total" />
                    )}
                  </Section>
                )}

                {/* 5. EBT */}
                <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "12px 18px", marginBottom: 12 }}>
                  <PLRow label="NET PROFIT BEFORE TAX (EBT)" amount={r.ebt} variant="total" />
                </div>

                {/* 6. TAX */}
                {(r.taxEntries.length > 0 || r.taxAmount > 0) && (
                  <Section title="Income Tax" color="#94a3b8" icon="🧾">
                    {r.taxEntries.length > 0
                      ? r.taxEntries.map((e, i) => <PLRow key={i} label={e.name} amount={e.amount} variant="deduct" indent />)
                      : <PLRow label="Tax" amount={r.taxAmount} variant="deduct" indent />
                    }
                    <PLRow label="TOTAL TAX" amount={r.taxAmount} variant="subtotal" />
                  </Section>
                )}

                {/* 7. NET PROFIT — BOTTOM LINE */}
                <div style={{
                  padding: "20px 22px", borderRadius: 14, marginTop: 4,
                  background: isProfit ? "linear-gradient(135deg,rgba(52,211,153,.1),rgba(16,185,129,.05))" : "linear-gradient(135deg,rgba(248,113,113,.1),rgba(239,68,68,.05))",
                  border: `1.5px solid ${isProfit ? "rgba(52,211,153,.3)" : "rgba(248,113,113,.3)"}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 5 }}>
                        {isProfit ? "✅ NET PROFIT AFTER TAX" : "⚠️ NET LOSS AFTER TAX"}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>
                        Period: {from} → {to}
                        <MarginBadge pct={r.netMarginPct} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: isProfit ? "#34d399" : "#f87171", fontFamily: "'Courier New',monospace", letterSpacing: "-.01em" }}>
                        {r.netProfit < 0 ? "(" : ""}{fmt(Math.abs(r.netProfit))}{r.netProfit < 0 ? ")" : ""}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
