"use client";`r`nimport { confirmToast, alertToast } from "@/lib/toast-feedback";`r`n
import { useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const FONT = "'Outfit','Inter',sans-serif";
const DANGER = "#ef4444";
const DANGER_LIGHT = "rgba(239,68,68,0.1)";
const SUCCESS = "#34d399";
const SUCCESS_LIGHT = "rgba(52,211,153,0.1)";
const ACCENT = "#6366f1";

function fmt(val: number) {
  const abs = Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return val < 0 ? `(${abs})` : abs;
}

export default function YearEndClosingPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function runClosing() {
    if (!await confirmToast("Year end closing is irreversible. All Income & Expense account balances will be zeroed and the net result transferred to Capital / Retained Earnings. Are you sure?")) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const user = getCurrentUser();
      const res = await fetch("/api/reports/year-end", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(user?.id   ? { "x-user-id":   user.id }   : {}),
          ...(user?.role ? { "x-user-role": user.role } : {}),
        },
        body: JSON.stringify({ date }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Year-end closing failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--app-bg)",
        fontFamily: FONT,
        padding: "28px 24px",
        color: "var(--text-primary)",
        maxWidth: 760,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.5px", color: DANGER }}>
          Year End Closing
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
          Finalise the financial year and transfer net profit / loss to retained earnings
        </p>
      </div>

      {/* Warning banner */}
      <div
        style={{
          padding: "16px 20px",
          borderRadius: 10,
          border: `1px solid ${DANGER}`,
          background: DANGER_LIGHT,
          marginBottom: 24,
          fontSize: 14,
          color: DANGER,
          lineHeight: 1.7,
        }}
      >
        <strong>Warning â€” this action is irreversible.</strong>
        <br />
        Running year-end closing will zero all Income &amp; Expense account balances for the period and post the net profit or loss as a journal entry to Capital / Retained Earnings.
        Ensure all transactions for the year have been posted and reconciled before proceeding.
      </div>

      {/* Form panel */}
      <div
        style={{
          background: "var(--panel-bg)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "24px",
          marginBottom: 24,
        }}
      >
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontSize: 13,
            color: "var(--text-muted)",
            maxWidth: 240,
            marginBottom: 20,
          }}
        >
          Closing Date (As On)
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: "9px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--app-bg)",
              color: "var(--text-primary)",
              fontFamily: FONT,
              fontSize: 14,
              outline: "none",
            }}
          />
        </label>

        <button
          onClick={runClosing}
          disabled={loading}
          style={{
            padding: "10px 28px",
            borderRadius: 8,
            border: "none",
            background: loading ? "rgba(239,68,68,0.4)" : DANGER,
            color: "#fff",
            fontFamily: FONT,
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Running Year End Close..." : "Run Year End Closing"}
        </button>

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              borderRadius: 8,
              background: DANGER_LIGHT,
              border: `1px solid ${DANGER}`,
              color: DANGER,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div
          style={{
            background: SUCCESS_LIGHT,
            border: `1px solid ${SUCCESS}`,
            borderRadius: 12,
            padding: "24px",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: SUCCESS, marginBottom: 16 }}>
            Year Closed Successfully
          </div>

          {[
            { label: "Total Income",  val: result.incomeTotal,  color: SUCCESS },
            { label: "Total Expenses", val: result.expenseTotal, color: "#f87171" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(52,211,153,0.2)", fontSize: 14 }}>
              <span style={{ color: "var(--text-muted)" }}>{label}</span>
              <span style={{ fontWeight: 600, color }}>{fmt(val ?? 0)}</span>
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", fontSize: 16, fontWeight: 700 }}>
            <span>{(result.profit ?? 0) >= 0 ? "Net Profit Transferred" : "Net Loss Transferred"}</span>
            <span style={{ color: (result.profit ?? 0) >= 0 ? SUCCESS : "#f87171" }}>
              {fmt(result.profit ?? 0)}
            </span>
          </div>

          {result.journalRef && (
            <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
              Journal Reference: <span style={{ color: ACCENT, fontFamily: "monospace" }}>{result.journalRef}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
