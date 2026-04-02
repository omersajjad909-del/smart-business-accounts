"use client";
import { useState, useEffect, useCallback } from "react";
import { getCurrentUser } from "@/lib/auth";

const FONT = "'Outfit','Inter',sans-serif";

interface Account { id: string; code: string; name: string; type: string; }
interface BalanceRow { accountId: string; accountCode: string; accountName: string; debit: number | string; credit: number | string; }
interface ImportResult { updated: number; skipped: number; errors?: string[]; }

const BLANK_ROW = (): BalanceRow => ({ accountId: "", accountCode: "", accountName: "", debit: "", credit: "" });

const input: React.CSSProperties = {
  width: "100%", background: "var(--app-bg)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "8px 11px", color: "var(--text-primary)", fontSize: 13,
  fontFamily: FONT, outline: "none", boxSizing: "border-box",
};

export default function OpeningBalancesPage() {
  const [tab, setTab]               = useState<"manual" | "csv">("manual");
  const [accounts, setAccounts]     = useState<Account[]>([]);
  const [rows, setRows]             = useState<BalanceRow[]>([BLANK_ROW()]);
  const [date, setDate]             = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving]         = useState(false);
  const [result, setResult]         = useState<ImportResult | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [csv, setCsv]               = useState("code,debit,credit\nCASH001,10000,0\nAP001,0,2500");
  const [acSearch, setAcSearch]     = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);

  const getHeaders = useCallback((): Record<string, string> => {
    const user = getCurrentUser();
    return user ? { "x-user-id": user.id, "x-user-role": user.role ?? "", "x-company-id": user.companyId || "" } : {};
  }, []);

  useEffect(() => {
    fetch("/api/accounts", { headers: getHeaders(), credentials: "include" })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAccounts(data); })
      .catch(() => {});
  }, [getHeaders]);

  // ── Row helpers ──────────────────────────────────────────────────────────
  const updateRow = (i: number, field: keyof BalanceRow, value: string) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const selectAccount = (i: number, acc: Account) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, accountId: acc.id, accountCode: acc.code, accountName: acc.name } : r));
    setDropdownOpen(null);
    setAcSearch(prev => { const a = [...prev]; a[i] = ""; return a; });
  };

  const addRow = () => setRows(prev => [...prev, BLANK_ROW()]);
  const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const filteredAccounts = (i: number) => {
    const q = (acSearch[i] || "").toLowerCase();
    if (!q) return accounts.slice(0, 12);
    return accounts.filter(a => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)).slice(0, 12);
  };

  // ── Totals ───────────────────────────────────────────────────────────────
  const totalDebit  = rows.reduce((s, r) => s + (parseFloat(String(r.debit))  || 0), 0);
  const totalCredit = rows.reduce((s, r) => s + (parseFloat(String(r.credit)) || 0), 0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01;

  // ── Submit manual ────────────────────────────────────────────────────────
  const submitManual = async () => {
    if (!isBalanced) { setError("Debits and credits must be equal before saving."); return; }
    const valid = rows.filter(r => r.accountId && (parseFloat(String(r.debit)) || parseFloat(String(r.credit))));
    if (!valid.length) { setError("Add at least one account with an amount."); return; }

    setSaving(true); setError(null); setResult(null);
    try {
      const csvData = ["code,debit,credit",
        ...valid.map(r => `${r.accountCode},${parseFloat(String(r.debit)) || 0},${parseFloat(String(r.credit)) || 0}`)
      ].join("\n");

      const res = await fetch("/api/opening-balances/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...getHeaders() },
        body: JSON.stringify({ csv: csvData, date }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Import failed"); return; }
      setResult(data);
      setRows([BLANK_ROW()]);
    } finally { setSaving(false); }
  };

  // ── Submit CSV ───────────────────────────────────────────────────────────
  const submitCsv = async () => {
    setSaving(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/opening-balances/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...getHeaders() },
        body: JSON.stringify({ csv, date }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Import failed"); return; }
      setResult(data);
    } finally { setSaving(false); }
  };

  const th: React.CSSProperties = { padding: "10px 12px", textAlign: "left", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, borderBottom: "1px solid var(--border)", fontWeight: 600 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg)", padding: "32px 28px", fontFamily: FONT, color: "var(--text-primary)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.5 }}>Opening Balances</h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Set the starting balances for all accounts at the beginning of your financial year</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => window.location.assign("/api/opening-balances/template")}
            style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 16px", fontSize: 13, cursor: "pointer", color: "var(--text-muted)", fontFamily: FONT }}>
            ⬇ Template
          </button>
          <button onClick={() => window.location.assign("/api/accounts?format=csv")}
            style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 16px", fontSize: 13, cursor: "pointer", color: "var(--text-muted)", fontFamily: FONT }}>
            ⬇ Accounts CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 4, gap: 4, marginBottom: 24, width: "fit-content" }}>
        {(["manual", "csv"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? "#6366f1" : "transparent",
            color: tab === t ? "#fff" : "var(--text-muted)",
            border: "none", borderRadius: 7, padding: "8px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
          }}>
            {t === "manual" ? "Manual Entry" : "CSV Import"}
          </button>
        ))}
      </div>

      {/* Date picker */}
      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Opening Balance Date</div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text-primary)", fontSize: 14, fontFamily: FONT, outline: "none" }} />
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
          This is typically the <strong style={{ color: "var(--text-primary)" }}>first day of your financial year</strong>.<br />
          All balances will be posted as of this date.
        </div>
      </div>

      {/* Result banner */}
      {result && (
        <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 12, padding: "14px 20px", marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: "#4ade80", marginBottom: 4 }}>✓ Opening balances saved successfully</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Updated: {result.updated} accounts · Skipped: {result.skipped}</div>
          {result.errors?.length ? (
            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 12, cursor: "pointer", color: "#fbbf24" }}>View {result.errors.length} warnings</summary>
              <ul style={{ margin: "8px 0 0 16px", fontSize: 11, color: "var(--text-muted)" }}>
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          ) : null}
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "12px 18px", marginBottom: 20, color: "#f87171", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── MANUAL ENTRY ── */}
      {tab === "manual" && (
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Account</th>
                <th style={{ ...th, textAlign: "right" }}>Debit (Dr)</th>
                <th style={{ ...th, textAlign: "right" }}>Credit (Cr)</th>
                <th style={{ ...th, width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  {/* Account selector */}
                  <td style={{ padding: "8px 12px", position: "relative" }}>
                    <input
                      style={input}
                      placeholder="Search account name or code…"
                      value={row.accountId ? `${row.accountCode} — ${row.accountName}` : (acSearch[i] || "")}
                      onFocus={() => { setDropdownOpen(i); if (row.accountId) setRows(prev => prev.map((r, idx) => idx === i ? { ...r, accountId: "", accountCode: "", accountName: "" } : r)); }}
                      onChange={e => {
                        setAcSearch(prev => { const a = [...prev]; a[i] = e.target.value; return a; });
                        setDropdownOpen(i);
                      }}
                    />
                    {dropdownOpen === i && filteredAccounts(i).length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 12, right: 12, background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 10, zIndex: 100, maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                        {filteredAccounts(i).map(acc => (
                          <div key={acc.id} onMouseDown={() => selectAccount(i, acc)}
                            style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.1)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#a5b4fc", minWidth: 70 }}>{acc.code}</span>
                            <span style={{ flex: 1 }}>{acc.name}</span>
                            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{acc.type}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  {/* Debit */}
                  <td style={{ padding: "8px 12px" }}>
                    <input type="number" min="0" step="0.01" placeholder="0.00"
                      style={{ ...input, textAlign: "right" }}
                      value={row.debit}
                      onChange={e => { updateRow(i, "debit", e.target.value); if (e.target.value) updateRow(i, "credit", ""); }}
                    />
                  </td>
                  {/* Credit */}
                  <td style={{ padding: "8px 12px" }}>
                    <input type="number" min="0" step="0.01" placeholder="0.00"
                      style={{ ...input, textAlign: "right" }}
                      value={row.credit}
                      onChange={e => { updateRow(i, "credit", e.target.value); if (e.target.value) updateRow(i, "debit", ""); }}
                    />
                  </td>
                  {/* Remove */}
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    {rows.length > 1 && (
                      <button onClick={() => removeRow(i)} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: 17, lineHeight: 1, fontFamily: FONT }}>×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                <td style={{ padding: "12px 12px", fontSize: 13, fontWeight: 700 }}>
                  <button onClick={addRow} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#a5b4fc", fontFamily: FONT }}>
                    + Add Row
                  </button>
                </td>
                <td style={{ padding: "12px 12px", textAlign: "right", fontWeight: 800, fontSize: 15, color: "#10b981" }}>{totalDebit.toFixed(2)}</td>
                <td style={{ padding: "12px 12px", textAlign: "right", fontWeight: 800, fontSize: 15, color: "#f87171" }}>{totalCredit.toFixed(2)}</td>
                <td />
              </tr>
              {/* Balance indicator */}
              <tr>
                <td colSpan={4} style={{ padding: "10px 12px", borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: isBalanced ? "#4ade80" : "#f87171" }} />
                      {isBalanced
                        ? <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 600 }}>Balanced — debits equal credits</span>
                        : <span style={{ fontSize: 12, color: "#fbbf24", fontWeight: 600 }}>Difference: {Math.abs(totalDebit - totalCredit).toFixed(2)} — must be 0 before saving</span>
                      }
                    </div>
                    <button onClick={submitManual} disabled={saving || !isBalanced || rows.every(r => !r.accountId)}
                      style={{ background: isBalanced ? "#6366f1" : "rgba(99,102,241,0.3)", color: "#fff", border: "none", borderRadius: 9, padding: "9px 24px", fontSize: 13, fontWeight: 700, cursor: isBalanced ? "pointer" : "not-allowed", fontFamily: FONT, opacity: saving ? 0.7 : 1 }}>
                      {saving ? "Saving…" : "Save Opening Balances"}
                    </button>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── CSV IMPORT ── */}
      {tab === "csv" && (
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "24px 28px" }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.7 }}>
            Paste CSV with columns: <code style={{ background: "rgba(99,102,241,0.12)", padding: "2px 7px", borderRadius: 4, fontSize: 12, color: "#a5b4fc" }}>code,debit,credit</code><br />
            Use the account <strong style={{ color: "var(--text-primary)" }}>code</strong> from your Chart of Accounts (not the name).
          </div>
          <textarea value={csv} onChange={e => setCsv(e.target.value)} rows={12}
            style={{ width: "100%", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", color: "var(--text-primary)", fontSize: 13, fontFamily: "monospace", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button onClick={submitCsv} disabled={saving}
              style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 9, padding: "9px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Importing…" : "Import CSV"}
            </button>
          </div>
        </div>
      )}

      {/* Help tip */}
      <div style={{ marginTop: 20, padding: "14px 18px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 12, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
        <strong style={{ color: "var(--text-primary)" }}>Tip:</strong> Opening balances must follow double-entry — every debit needs an equal credit.
        Common entries: Cash/Bank (Dr), Accounts Receivable (Dr), Inventory (Dr) vs Accounts Payable (Cr), Loans (Cr), Capital/Equity (Cr).
      </div>
    </div>
  );
}
