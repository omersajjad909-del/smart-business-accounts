"use client";
import { useEffect, useState, useCallback } from "react";
import { getCurrentUser } from "@/lib/auth";

interface Party {
  id: string;
  name: string;
  partyType: string;
}

interface AgeingRow {
  numType: string;
  date: string;
  narration: string;
  billAmount: number;
  billBalance: number;
  days: number;
  totalBalance: number;
}

function getHeaders(): Record<string, string> {
  const user = getCurrentUser();
  if (!user) return {};
  return {
    "x-user-id": user.id,
    "x-user-role": user.role ?? "",
    "x-company-id": user.companyId ?? "",
  };
}

function fmt(n: number) {
  return Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AgeingReportPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [type, setType] = useState<"customer" | "supplier">("customer");
  const [asOnDate, setAsOnDate] = useState(today);
  const [partyId, setPartyId] = useState("");
  const [parties, setParties] = useState<Party[]>([]);
  const [data, setData] = useState<AgeingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load parties whenever type changes
  const loadParties = useCallback(async () => {
    setPartiesLoading(true);
    setPartyId("");
    setData([]);
    setError(null);
    try {
      const res = await fetch("/api/accounts", {
        headers: getHeaders(),
        credentials: "include",
      });
      const d = await res.json();
      const list: Party[] = Array.isArray(d) ? d : (d.accounts ?? []);
      const filtered = list.filter(a => {
        const pt = (a.partyType ?? "").toUpperCase();
        return type === "customer" ? pt === "CUSTOMER" : pt === "SUPPLIER";
      });
      setParties(filtered);
    } catch {
      setError("Failed to load accounts");
    } finally {
      setPartiesLoading(false);
    }
  }, [type]);

  useEffect(() => {
    loadParties();
  }, [loadParties]);

  const loadData = async () => {
    if (!partyId) return;
    setLoading(true);
    setData([]);
    setError(null);

    const url = type === "customer"
      ? `/api/reports/ageing/customer?date=${asOnDate}&customerId=${partyId}`
      : `/api/reports/ageing/supplier?date=${asOnDate}&supplierId=${partyId}`;

    try {
      const res = await fetch(url, {
        headers: getHeaders(),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load ageing data");
        return;
      }
      setData(Array.isArray(json) ? json : []);
    } catch {
      setError("Network error — could not load ageing data");
    } finally {
      setLoading(false);
    }
  };

  const totalBillAmount = data.reduce((s, r) => s + r.billAmount, 0);
  const totalBillBalance = data.reduce((s, r) => s + r.billBalance, 0);
  const totalBalance = data.length > 0 ? data[data.length - 1].totalBalance : 0;

  const panelBg = "var(--panel-bg, #0f1729)";
  const border = "var(--border, #1e2a45)";
  const textPrimary = "var(--text-primary, #f1f5f9)";
  const textMuted = "var(--text-muted, #94a3b8)";

  const inputStyle: React.CSSProperties = {
    background: panelBg,
    border: `1px solid ${border}`,
    borderRadius: 8,
    padding: "8px 12px",
    color: textPrimary,
    fontSize: 13,
    outline: "none",
    fontFamily: "'Outfit','Inter',sans-serif",
  };

  const thStyle: React.CSSProperties = {
    padding: "10px 14px",
    textAlign: "left",
    fontSize: 11,
    color: textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    borderBottom: `1px solid ${border}`,
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg, #060918)", padding: "28px 24px", fontFamily: "'Outfit','Inter',sans-serif", color: textPrimary }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.5 }}>Bill-Wise Ageing Report</h1>
          <p style={{ margin: 0, fontSize: 13, color: textMuted }}>Outstanding receivables &amp; payables by age</p>
        </div>
        <button
          onClick={() => window.print()}
          className="print:hidden"
          style={{ background: "transparent", color: textMuted, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Print
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="print:hidden" style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>

        {/* Type toggle */}
        <div>
          <div style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6, fontWeight: 600 }}>Type</div>
          <div style={{ display: "flex", background: "var(--app-bg, #060918)", border: `1px solid ${border}`, borderRadius: 8, overflow: "hidden" }}>
            {(["customer", "supplier"] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  padding: "8px 16px", border: "none", cursor: "pointer",
                  background: type === t ? "#6366f1" : "transparent",
                  color: type === t ? "#fff" : textMuted,
                  fontSize: 13, fontWeight: 600,
                  fontFamily: "'Outfit','Inter',sans-serif",
                }}
              >
                {t === "customer" ? "Customer" : "Supplier"}
              </button>
            ))}
          </div>
        </div>

        {/* As on date */}
        <div>
          <div style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6, fontWeight: 600 }}>As On Date</div>
          <input type="date" value={asOnDate} onChange={e => setAsOnDate(e.target.value)} style={inputStyle} />
        </div>

        {/* Party select */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6, fontWeight: 600 }}>
            {type === "customer" ? "Customer" : "Supplier"}
          </div>
          <select
            value={partyId}
            onChange={e => setPartyId(e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          >
            <option value="">
              {partiesLoading ? "Loading…" : `Select ${type === "customer" ? "Customer" : "Supplier"}`}
            </option>
            {parties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={loadData}
          disabled={!partyId || loading}
          style={{
            background: partyId ? "#6366f1" : "rgba(99,102,241,0.3)",
            color: "#fff", border: "none", borderRadius: 8, padding: "9px 24px",
            fontSize: 13, fontWeight: 700, cursor: partyId ? "pointer" : "not-allowed",
            fontFamily: "'Outfit','Inter',sans-serif",
          }}
        >
          {loading ? "Loading…" : "Show Report"}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#f87171", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                <th style={thStyle}>Num &amp; Type</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Narration</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Bill Amount</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Bill Balance</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Days</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} style={{ padding: "32px 14px", textAlign: "center", color: textMuted, fontSize: 13 }}>
                    Loading data…
                  </td>
                </tr>
              )}

              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "32px 14px", textAlign: "center", color: textMuted, fontSize: 13 }}>
                    {partyId ? "No outstanding bills found for this party" : `Select a ${type} and click Show Report`}
                  </td>
                </tr>
              )}

              {data.map((r, i) => {
                // Colour code by age bracket (via days)
                const dayColor = r.days > 90 ? "#f87171" : r.days > 60 ? "#fb923c" : r.days > 30 ? "#fbbf24" : textPrimary;
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${border}` }}>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "monospace", color: "#a5b4fc" }}>{r.numType}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: textMuted, whiteSpace: "nowrap" }}>{r.date}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, color: textPrimary }}>{r.narration}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 13, color: textPrimary }}>{fmt(r.billAmount)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 13, color: r.billBalance < 0 ? "#f87171" : "#4ade80" }}>
                      {r.billBalance < 0 ? "−" : ""}{fmt(r.billBalance)}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: dayColor }}>{r.days}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: textPrimary }}>
                      {r.totalBalance < 0 ? "−" : ""}{fmt(r.totalBalance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Totals footer */}
            {data.length > 0 && (
              <tfoot>
                <tr style={{ background: "rgba(99,102,241,0.06)", borderTop: `2px solid rgba(99,102,241,0.2)` }}>
                  <td colSpan={3} style={{ padding: "12px 14px", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: textMuted }}>
                    Totals
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, fontSize: 14, color: textPrimary }}>
                    {fmt(totalBillAmount)}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, fontSize: 14, color: totalBillBalance < 0 ? "#f87171" : "#4ade80" }}>
                    {totalBillBalance < 0 ? "−" : ""}{fmt(totalBillBalance)}
                  </td>
                  <td />
                  <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 900, fontSize: 16, color: totalBalance < 0 ? "#f87171" : "#4ade80" }}>
                    {totalBalance < 0 ? "−" : ""}{fmt(totalBalance)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Age legend */}
      <div className="print:hidden" style={{ marginTop: 16, display: "flex", gap: 20, fontSize: 12, color: textMuted }}>
        <span style={{ color: textPrimary }}>Age colour:</span>
        {[
          { label: "0–30 days", color: textPrimary },
          { label: "31–60 days", color: "#fbbf24" },
          { label: "61–90 days", color: "#fb923c" },
          { label: "90+ days", color: "#f87171" },
        ].map(({ label, color }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
            {label}
          </span>
        ))}
      </div>

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
