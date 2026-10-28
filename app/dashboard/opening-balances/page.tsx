"use client";
import { useState, useEffect, useCallback } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useResponsive } from "@/hooks/useResponsive";
import { shrinkImage } from "@/lib/shrinkImage";
import { readJsonResponse } from "@/lib/readJsonResponse";
import CameraCapture from "@/components/CameraCapture";

const FONT = "'Outfit','Inter',sans-serif";

interface Account { id: string; code: string; name: string; type: string; partyType?: string | null; }
interface BalanceRow { accountId: string; accountCode: string; accountName: string; debit: number | string; credit: number | string; scanName?: string; scanNarration?: string; }
interface ImportResult { updated: number; skipped: number; errors?: string[]; difference?: number; }

const BLANK_ROW = (): BalanceRow => ({ accountId: "", accountCode: "", accountName: "", debit: "", credit: "" });

const input: React.CSSProperties = {
  width: "100%", background: "var(--app-bg)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "8px 11px", color: "var(--text-primary)", fontSize: 13,
  fontFamily: FONT, outline: "none", boxSizing: "border-box",
};

export default function OpeningBalancesPage() {
  const { isMobile } = useResponsive();
  const [tab, setTab]               = useState<"manual" | "csv" | "scan">("manual");
  const [accounts, setAccounts]     = useState<Account[]>([]);
  const [rows, setRows]             = useState<BalanceRow[]>([BLANK_ROW()]);
  const [date, setDate]             = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving]         = useState(false);
  const [result, setResult]         = useState<ImportResult | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [csv, setCsv]               = useState("code,debit,credit\nCASH001,10000,0\nAP001,0,2500");
  const [acSearch, setAcSearch]     = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
  const [acKind, setAcKind]         = useState<"ALL" | "CUSTOMER" | "SUPPLIER" | "OTHER">("ALL");
  const [scanning, setScanning]     = useState(false);
  const [camera, setCamera]         = useState<null | "new" | "append">(null);
  const [scanProgress, setScanProgress] = useState("");
  const [scanNotes, setScanNotes]   = useState<string | null>(null);
  const [scanDone, setScanDone]     = useState<{ total: number; matched: number } | null>(null);

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

  // The list used to stop at the first 12 accounts by name, so on an empty search
  // customers — and anyone whose name is not near the top of the alphabet — never
  // appeared at all. Everything is listed now (the box scrolls), and a kind filter
  // narrows it to customers or suppliers in one tap.
  const filteredAccounts = (i: number) => {
    const q = (acSearch[i] || "").toLowerCase();
    return accounts
      .filter(a => {
        const pt = String(a.partyType || "").toUpperCase();
        if (acKind === "CUSTOMER" && pt !== "CUSTOMER") return false;
        if (acKind === "SUPPLIER" && pt !== "SUPPLIER") return false;
        if (acKind === "OTHER" && (pt === "CUSTOMER" || pt === "SUPPLIER")) return false;
        return !q || a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q);
      })
      .slice(0, 300);
  };

  // Pages are read one request each — a single call carrying many photos would
  // blow the request size limit and lose every page if one failed. A page that
  // fails is reported by number and the rest still land in the review table.
  // `append` keeps rows already on screen so a register can be added to page by page.
  const scanRegister = async (files: File[], append = false) => {
    setScanning(true); setError(null); setResult(null); setScanNotes(null); setScanProgress("");
    try {
      const collected: BalanceRow[] = [];
      const notes: string[] = [];
      const failed: string[] = [];
      for (let p = 0; p < files.length; p++) {
        setScanProgress(files.length > 1 ? `Reading page ${p + 1} of ${files.length}…` : "Reading the page…");
        try {
          const fd = new FormData();
          fd.append("image", await shrinkImage(files[p]), "register.jpg");
          const res = await fetch("/api/opening-balances/scan", { method: "POST", credentials: "include", headers: getHeaders(), body: fd });
          const data = await readJsonResponse(res);
          if (!res.ok) { failed.push(`Page ${p + 1}: ${data.error || "scan failed"}`); continue; }
          const scanned: Array<{ rawName: string; nameRoman?: string | null; narration?: string | null; debit: number; credit: number; accountId?: string | null }> = data.rows || [];
          if (!scanned.length) { failed.push(`Page ${p + 1}: ${data.notes || "no balances found"}`); continue; }
          if (data.notes) notes.push(files.length > 1 ? `Page ${p + 1}: ${data.notes}` : data.notes);
          for (const r of scanned) {
            const acc = r.accountId ? accounts.find(a => a.id === r.accountId) : undefined;
            collected.push({
              accountId: acc?.id || "", accountCode: acc?.code || "", accountName: acc?.name || "",
              debit: r.debit || "", credit: r.credit || "",
              scanName: r.nameRoman && r.nameRoman !== r.rawName ? `${r.rawName} (${r.nameRoman})` : r.rawName,
              scanNarration: r.narration || undefined,
            });
          }
        } catch (e: any) {
          failed.push(`Page ${p + 1}: ${e.message || "scan failed"}`);
        }
      }
      if (failed.length) setError(failed.join(" · "));
      if (!collected.length) return;
      // Nothing is saved yet — the rows land in the review table so the user
      // checks every name and amount before approving.
      const base = append ? rows.filter(r => r.accountId || r.scanName || r.debit || r.credit) : [];
      const all = [...base, ...collected];
      setRows(all);
      setScanNotes(notes.length ? notes.join(" | ") : null);
      setScanDone({ total: all.length, matched: all.filter(r => r.accountId).length });
      setTab("manual");
    } finally { setScanning(false); setScanProgress(""); }
  };

  // ── Totals ───────────────────────────────────────────────────────────────
  const totalDebit  = rows.reduce((s, r) => s + (parseFloat(String(r.debit))  || 0), 0);
  const totalCredit = rows.reduce((s, r) => s + (parseFloat(String(r.credit)) || 0), 0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01;

  // ── Submit manual ────────────────────────────────────────────────────────
  const submitManual = async () => {
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
      setScanDone(null); setScanNotes(null);
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
    <div style={{ minHeight: "100vh", background: "var(--app-bg)", padding: isMobile ? "15px 14px" : "28px 32px", fontFamily: FONT, color: "var(--text-primary)" }}>

      <CameraCapture open={camera !== null} onClose={() => setCamera(null)} title="Photograph the register page"
        onCapture={file => scanRegister([file], camera === "append")} />

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
        {(["manual", "scan", "csv"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? "#6366f1" : "transparent",
            color: tab === t ? "#fff" : "var(--text-muted)",
            border: "none", borderRadius: 7, padding: "8px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
          }}>
            {t === "manual" ? "Manual Entry" : t === "scan" ? "📷 Scan Register" : "CSV Import"}
          </button>
        ))}
      </div>

      {/* Date picker */}
      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: isMobile ? "12px 10px" : "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
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
        <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 12, padding: isMobile ? "12px 10px" : "14px 20px", marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: "var(--tx-4ade80, #4ade80)", marginBottom: 4 }}>✓ Opening balances saved successfully</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Updated: {result.updated} accounts · Skipped: {result.skipped}</div>
          {result.difference ? (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.6 }}>
              Unbalanced amount of <strong style={{ color: "var(--text-primary)" }}>{Math.abs(result.difference).toFixed(2)}</strong> is held in <strong style={{ color: "var(--text-primary)" }}>Opening Balance Equity</strong> ({result.difference > 0 ? "Cr" : "Dr"}).
              Add your cash, bank, stock and capital figures whenever you know them — this amount adjusts on its own and reaches 0 once everything is entered.
            </div>
          ) : null}
          {result.errors?.length ? (
            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 12, cursor: "pointer", color: "var(--tx-fbbf24, #fbbf24)" }}>View {result.errors.length} warnings</summary>
              <ul style={{ margin: "8px 0 0 16px", fontSize: 11, color: "var(--text-muted)" }}>
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          ) : null}
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "12px 18px", marginBottom: 20, color: "var(--tx-f87171, #f87171)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── SCAN REGISTER ── */}
      {tab === "scan" && (
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: isMobile ? "16px 14px" : "28px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 38, marginBottom: 8 }}>📷</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Photo of your register / copy</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 20px" }}>
            Take a clear photo of one page of your khata. Urdu, Roman Urdu or English — the AI reads it and matches each name to your accounts.
            <br />Nothing is saved until you check the rows and approve.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" disabled={scanning} onClick={() => setCamera("new")} style={{ display: "inline-block", background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: scanning ? "default" : "pointer", opacity: scanning ? 0.6 : 1, fontFamily: FONT }}>
              📷 Take photo
            </button>
            <label style={{ display: "inline-block", background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: scanning ? "default" : "pointer", opacity: scanning ? 0.6 : 1 }}>
              🖼 Upload from gallery
              <input type="file" accept="image/*" multiple disabled={scanning} style={{ display: "none" }}
                onChange={e => { const fl = Array.from(e.target.files || []); e.target.value = ""; if (fl.length) scanRegister(fl); }} />
            </label>
          </div>
          {scanning && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 14 }}>{scanProgress}</div>}
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 14 }}>Tip: one page per photo, good light, page flat, all columns in frame. Many pages? Photograph them all first, then select them together from the gallery.</div>
        </div>
      )}

      {/* ── MANUAL ENTRY ── */}
      {tab === "manual" && scanDone && (
        <div style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 12, padding: "12px 16px", marginBottom: 14, fontSize: 13, lineHeight: 1.7 }}>
          <strong>Review scanned rows.</strong> {scanDone.matched} of {scanDone.total} matched to an account.
          {scanDone.matched < scanDone.total && <> Rows with no account are <strong>not saved</strong> — pick an account for each, or remove the row.</>}
          {scanNotes && <div style={{ color: "var(--tx-fbbf24, #fbbf24)" }}>AI note: {scanNotes}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
            <button type="button" disabled={scanning} onClick={() => setCamera("append")} style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", color: "inherit", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: scanning ? "default" : "pointer", opacity: scanning ? 0.6 : 1, fontFamily: FONT }}>
              📷 Add page
            </button>
            <label style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: scanning ? "default" : "pointer", opacity: scanning ? 0.6 : 1 }}>
              🖼 Add from gallery
              <input type="file" accept="image/*" multiple disabled={scanning} style={{ display: "none" }}
                onChange={e => { const fl = Array.from(e.target.files || []); e.target.value = ""; if (fl.length) scanRegister(fl, true); }} />
            </label>
            {scanning && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{scanProgress}</span>}
          </div>
        </div>
      )}
      {tab === "manual" && (
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "visible" }}>
          {/* On a phone each row becomes a card (account on top, Dr / Cr side by
              side) instead of a four-column table that cannot fit and, inside a
              clipped container, could not be scrolled either. */}
          {/* overflow stays visible: the account search list drops below its row, and a
              clipped container cut that list off and left it unscrollable. A fixed
              table layout keeps the Debit / Credit columns inside the card instead. */}
          <table style={{ width: "100%", borderCollapse: "collapse", ...(isMobile ? { display: "block" } : { tableLayout: "fixed" }) }}>
            {!isMobile && (
              <colgroup>
                <col />
                <col style={{ width: 150 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 48 }} />
              </colgroup>
            )}
            <thead style={isMobile ? { display: "none" } : undefined}>
              <tr>
                <th style={th}>Account</th>
                <th style={{ ...th, textAlign: "right" }}>Debit (Dr)</th>
                <th style={{ ...th, textAlign: "right" }}>Credit (Cr)</th>
                <th style={{ ...th, width: 40 }}></th>
              </tr>
            </thead>
            <tbody style={isMobile ? { display: "block" } : undefined}>
              {rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)", ...(isMobile && { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "12px 12px" }) }}>
                  {/* Account selector */}
                  <td style={{ padding: isMobile ? 0 : "8px 12px", position: "relative", ...(isMobile && { gridColumn: "1 / 3" }) }}>
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
                    {row.scanName && (
                      <div dir="auto" style={{ fontSize: 12, marginTop: 5, color: row.accountId ? "var(--text-muted)" : "var(--tx-fbbf24, #fbbf24)" }}>
                        📄 {row.scanName}{row.scanNarration ? ` · ${row.scanNarration}` : ""}{!row.accountId && " — pick account"}
                      </div>
                    )}
                    {dropdownOpen === i && (
                      <div style={{ position: "absolute", top: "100%", left: 12, right: 12, background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 10, zIndex: 100, maxHeight: 280, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                        <div style={{ position: "sticky", top: 0, zIndex: 1, background: "var(--panel-bg)", display: "flex", gap: 6, padding: "8px 10px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
                          {(["ALL", "CUSTOMER", "SUPPLIER", "OTHER"] as const).map(k => (
                            <button key={k} type="button" onMouseDown={e => { e.preventDefault(); setAcKind(k); }}
                              style={{ padding: "4px 11px", borderRadius: 14, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT, textTransform: "capitalize",
                                border: `1px solid ${acKind === k ? "#6366f1" : "var(--border)"}`,
                                background: acKind === k ? "rgba(99,102,241,0.15)" : "transparent",
                                color: acKind === k ? "#6366f1" : "var(--text-muted)" }}>
                              {k === "ALL" ? "All" : k.toLowerCase()}
                            </button>
                          ))}
                          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)", alignSelf: "center" }}>{filteredAccounts(i).length} accounts</span>
                        </div>
                        {filteredAccounts(i).length === 0 && (
                          <div style={{ padding: "14px", fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>No account matches. Try another name, or switch the filter above.</div>
                        )}
                        {filteredAccounts(i).map(acc => (
                          <div key={acc.id} onMouseDown={() => selectAccount(i, acc)}
                            style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.1)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--tx-a5b4fc, #a5b4fc)", minWidth: 70 }}>{acc.code}</span>
                            <span style={{ flex: 1 }}>{acc.name}</span>
                            <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>{acc.partyType || acc.type}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  {/* Debit */}
                  <td style={{ padding: isMobile ? 0 : "8px 12px" }}>
                    {isMobile && <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Debit (Dr)</div>}
                    <input type="number" min="0" step="0.01" placeholder="0.00"
                      style={{ ...input, textAlign: "right" }}
                      value={row.debit}
                      onChange={e => { updateRow(i, "debit", e.target.value); if (e.target.value) updateRow(i, "credit", ""); }}
                    />
                  </td>
                  {/* Credit */}
                  <td style={{ padding: isMobile ? 0 : "8px 12px" }}>
                    {isMobile && <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Credit (Cr)</div>}
                    <input type="number" min="0" step="0.01" placeholder="0.00"
                      style={{ ...input, textAlign: "right" }}
                      value={row.credit}
                      onChange={e => { updateRow(i, "credit", e.target.value); if (e.target.value) updateRow(i, "debit", ""); }}
                    />
                  </td>
                  {/* Remove */}
                  <td style={{ padding: isMobile ? 0 : "8px 12px", textAlign: isMobile ? "right" : "center", ...(isMobile && { gridColumn: "1 / 3" }) }}>
                    {rows.length > 1 && (
                      <button onClick={() => removeRow(i)} style={{ background: "transparent", border: "none", color: "var(--tx-f87171, #f87171)", cursor: "pointer", fontSize: isMobile ? 12 : 17, fontWeight: isMobile ? 700 : undefined, lineHeight: 1, fontFamily: FONT }}>{isMobile ? "✕ Remove" : "×"}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot style={isMobile ? { display: "block" } : undefined}>
              <tr style={{ background: "rgba(var(--ink),0.02)", ...(isMobile && { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: "12px 12px" }) }}>
                <td style={{ padding: isMobile ? 0 : "12px 12px", fontSize: 13, fontWeight: 700, ...(isMobile && { gridColumn: "1 / 3" }) }}>
                  <button onClick={addRow} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--tx-a5b4fc, #a5b4fc)", fontFamily: FONT }}>
                    + Add Row
                  </button>
                </td>
                <td style={{ padding: isMobile ? 0 : "12px 12px", textAlign: isMobile ? "left" : "right", fontWeight: 800, fontSize: 15, color: "var(--tx-10b981, #10b981)" }}>
                  {isMobile && <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>Total Dr</div>}
                  {totalDebit.toFixed(2)}
                </td>
                <td style={{ padding: isMobile ? 0 : "12px 12px", textAlign: isMobile ? "left" : "right", fontWeight: 800, fontSize: 15, color: "var(--tx-f87171, #f87171)" }}>
                  {isMobile && <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>Total Cr</div>}
                  {totalCredit.toFixed(2)}
                </td>
                {!isMobile && <td />}
              </tr>
              {/* Balance indicator */}
              <tr style={isMobile ? { display: "block" } : undefined}>
                <td colSpan={4} style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", ...(isMobile && { display: "block" }) }}>
                  <div style={{ display: "flex", alignItems: isMobile ? "stretch" : "center", flexDirection: isMobile ? "column" : "row", gap: 10, justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: isBalanced ? "#4ade80" : "#f87171" }} />
                      {isBalanced
                        ? <span style={{ fontSize: 12, color: "var(--tx-4ade80, #4ade80)", fontWeight: 600 }}>Balanced — debits equal credits</span>
                        : <span style={{ fontSize: 12, color: "var(--tx-fbbf24, #fbbf24)", fontWeight: 600 }}>Difference: {Math.abs(totalDebit - totalCredit).toFixed(2)} — will be posted to <strong>Opening Balance Equity</strong> ({totalDebit > totalCredit ? "Cr" : "Dr"}). You can move it to Cash, Stock or Capital later.</span>
                      }
                    </div>
                    <button onClick={submitManual} disabled={saving || rows.every(r => !r.accountId)}
                      style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 9, padding: "9px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT, opacity: saving || rows.every(r => !r.accountId) ? 0.6 : 1, flexShrink: 0, ...(isMobile && { width: "100%", padding: "12px 24px" }) }}>
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
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: isMobile ? "13px 13px" : "24px 28px" }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.7 }}>
            Paste CSV with columns: <code style={{ background: "rgba(99,102,241,0.12)", padding: "2px 7px", borderRadius: 4, fontSize: 12, color: "var(--tx-a5b4fc, #a5b4fc)" }}>code,debit,credit</code><br />
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
      <div style={{ marginTop: 20, padding: isMobile ? "12px 10px" : "14px 18px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 12, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
        <strong style={{ color: "var(--text-primary)" }}>Tip:</strong> Don&apos;t know every figure yet? Enter what you know and save — any difference is held in
        <strong style={{ color: "var(--text-primary)" }}> Opening Balance Equity</strong> so your books stay balanced. Common entries: Cash/Bank (Dr), Accounts Receivable (Dr), Inventory (Dr) vs Accounts Payable (Cr), Loans (Cr), Capital/Equity (Cr).
      </div>
    </div>
  );
}
