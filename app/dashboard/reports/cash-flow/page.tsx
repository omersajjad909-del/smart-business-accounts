"use client";
import { useEffect, useState, useCallback } from "react";
import { getCurrentUser } from "@/lib/auth";

interface CashFlowItem {
  date: string;
  voucherNo: string;
  description: string;
  amount: number;
  type: "INFLOW" | "OUTFLOW";
}

interface CashFlowSection {
  items: CashFlowItem[];
  inflow: number;
  outflow: number;
  net: number;
}

interface CashFlowData {
  period: { from: string; to: string };
  operating: CashFlowSection;
  investing: CashFlowSection;
  financing: CashFlowSection;
  netCashFlow: number;
}

function fmt(n: number) {
  return Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getHeaders(): Record<string, string> {
  const user = getCurrentUser();
  if (!user) return {};
  return {
    "x-user-id": user.id,
    "x-user-role": user.role ?? "ADMIN",
    "x-company-id": user.companyId ?? "",
  };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfYear() {
  return `${new Date().getFullYear()}-01-01`;
}

function exportCSV(data: CashFlowData) {
  const rows = [
    ["Category", "Date", "Voucher No", "Description", "Type", "Amount"],
    ...data.operating.items.map(i => ["Operating", i.date, i.voucherNo, i.description, i.type, i.amount]),
    ...data.investing.items.map(i => ["Investing", i.date, i.voucherNo, i.description, i.type, i.amount]),
    ...data.financing.items.map(i => ["Financing", i.date, i.voucherNo, i.description, i.type, i.amount]),
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cash-flow-${data.period.from}-to-${data.period.to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface SectionProps {
  title: string;
  accent: string;
  section: CashFlowSection;
  expanded: boolean;
  onToggle: () => void;
}

function Section({ title, accent, section, expanded, onToggle }: SectionProps) {
  const border = "var(--border, #1e2a45)";
  const textPrimary = "var(--text-primary, #f1f5f9)";
  const textMuted = "var(--text-muted, #94a3b8)";

  return (
    <div style={{ background: "var(--panel-bg, #0f1729)", border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
      {/* Section header */}
      <div
        onClick={onToggle}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", cursor: "pointer", borderBottom: expanded ? `1px solid ${border}` : "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: accent, display: "inline-block" }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: textPrimary }}>{title}</span>
          <span style={{ fontSize: 12, color: textMuted }}>({section.items.length} transactions)</span>
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#4ade80" }}>In: {fmt(section.inflow)}</span>
          <span style={{ fontSize: 12, color: "#f87171" }}>Out: {fmt(section.outflow)}</span>
          <span style={{ fontWeight: 800, fontSize: 14, color: section.net >= 0 ? "#4ade80" : "#f87171" }}>
            Net: {section.net >= 0 ? "" : "−"}{fmt(section.net)}
          </span>
          <span style={{ color: textMuted, fontSize: 12 }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded table */}
      {expanded && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.02)" }}>
              {["Date", "Voucher No", "Description", "Type", "Amount"].map(h => (
                <th key={h} style={{ padding: "9px 14px", textAlign: h === "Amount" ? "right" : "left", fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: 0.6, borderBottom: `1px solid ${border}`, fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.items.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "20px 14px", textAlign: "center", color: textMuted, fontSize: 13 }}>No transactions in this period</td>
              </tr>
            ) : section.items.map((item, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${border}` }}>
                <td style={{ padding: "9px 14px", fontSize: 12, color: textMuted }}>{item.date}</td>
                <td style={{ padding: "9px 14px", fontSize: 12, fontFamily: "monospace", color: textPrimary }}>{item.voucherNo}</td>
                <td style={{ padding: "9px 14px", fontSize: 13, color: textPrimary }}>{item.description}</td>
                <td style={{ padding: "9px 14px" }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                    background: item.type === "INFLOW" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                    color: item.type === "INFLOW" ? "#4ade80" : "#f87171"
                  }}>
                    {item.type}
                  </span>
                </td>
                <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 600, fontSize: 13, color: item.type === "INFLOW" ? "#86efac" : "#fca5a5" }}>
                  {fmt(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function CashFlowPage() {
  const [from, setFrom] = useState(firstOfYear());
  const [to, setTo] = useState(todayStr());
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState({ operating: true, investing: false, financing: false });

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/reports/cash-flow?from=${from}&to=${to}`,
        { headers: getHeaders(), credentials: "include" }
      );
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Failed to load cash flow report");
        return;
      }
      setData(result);
    } catch {
      setError("Network error — could not load report");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const panelBg = "var(--panel-bg, #0f1729)";
  const border = "var(--border, #1e2a45)";
  const textPrimary = "var(--text-primary, #f1f5f9)";
  const textMuted = "var(--text-muted, #94a3b8)";

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg, #060918)", padding: "28px 24px", fontFamily: "'Outfit','Inter',sans-serif", color: textPrimary }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.5 }}>Cash Flow Statement</h1>
          <p style={{ margin: 0, fontSize: 13, color: textMuted }}>Operating, Investing &amp; Financing Activities</p>
        </div>

        <div className="print:hidden" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>From</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 8, padding: "7px 10px", color: textPrimary, fontSize: 13, outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>To</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 8, padding: "7px 10px", color: textPrimary, fontSize: 13, outline: "none" }}
            />
          </div>
          <button
            onClick={loadReport}
            disabled={loading}
            style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Loading…" : "Run Report"}
          </button>
          {data && (
            <button
              onClick={() => exportCSV(data)}
              style={{ background: "transparent", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Export CSV
            </button>
          )}
          <button
            onClick={() => window.print()}
            style={{ background: "transparent", color: textMuted, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Print
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#f87171", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && !data && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200, color: textMuted, fontSize: 14 }}>
          Loading report…
        </div>
      )}

      {/* ── Report ── */}
      {data && (
        <>
          <div style={{ textAlign: "center", marginBottom: 20, fontSize: 13, color: textMuted }}>
            Period:{" "}
            <strong style={{ color: textPrimary }}>{data.period.from}</strong>
            {" "}to{" "}
            <strong style={{ color: textPrimary }}>{data.period.to}</strong>
          </div>

          {/* Net cash flow banner */}
          <div style={{
            background: data.netCashFlow >= 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${data.netCashFlow >= 0 ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
            borderRadius: 12, padding: "16px 24px", marginBottom: 20,
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>Net Increase / (Decrease) in Cash</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: data.netCashFlow >= 0 ? "#4ade80" : "#f87171" }}>
              {data.netCashFlow >= 0 ? "" : "−"}{fmt(data.netCashFlow)}
            </span>
          </div>

          {/* Sections */}
          <Section
            title="Operating Activities"
            accent="#6366f1"
            section={data.operating}
            expanded={expanded.operating}
            onToggle={() => setExpanded(p => ({ ...p, operating: !p.operating }))}
          />
          <Section
            title="Investing Activities"
            accent="#f59e0b"
            section={data.investing}
            expanded={expanded.investing}
            onToggle={() => setExpanded(p => ({ ...p, investing: !p.investing }))}
          />
          <Section
            title="Financing Activities"
            accent="#ec4899"
            section={data.financing}
            expanded={expanded.financing}
            onToggle={() => setExpanded(p => ({ ...p, financing: !p.financing }))}
          />

          {/* Summary table */}
          <div style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden", marginTop: 8 }}>
            <div style={{ padding: "12px 20px", borderBottom: `1px solid ${border}` }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>Summary</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  { label: "Net Cash from Operating", value: data.operating.net, accent: "#6366f1" },
                  { label: "Net Cash from Investing", value: data.investing.net, accent: "#f59e0b" },
                  { label: "Net Cash from Financing", value: data.financing.net, accent: "#ec4899" },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${border}` }}>
                    <td style={{ padding: "12px 20px", fontSize: 13, color: textPrimary, display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: row.accent, display: "inline-block" }} />
                      {row.label}
                    </td>
                    <td style={{ padding: "12px 20px", textAlign: "right", fontWeight: 700, fontSize: 14, color: row.value >= 0 ? "#4ade80" : "#f87171" }}>
                      {row.value >= 0 ? "" : "−"}{fmt(row.value)}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: data.netCashFlow >= 0 ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)" }}>
                  <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 800, color: textPrimary }}>Net Cash Flow</td>
                  <td style={{ padding: "14px 20px", textAlign: "right", fontWeight: 900, fontSize: 18, color: data.netCashFlow >= 0 ? "#4ade80" : "#f87171" }}>
                    {data.netCashFlow >= 0 ? "" : "−"}{fmt(data.netCashFlow)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
