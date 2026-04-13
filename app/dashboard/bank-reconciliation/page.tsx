"use client";
import { fmtDate } from "@/lib/dateUtils";
import { confirmToast } from "@/lib/toast-feedback";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

// ─── Design tokens ────────────────────────────────────────────────────────────
const ff     = "'Outfit','Inter',sans-serif";
const accent = "#3b82f6";

interface BankAccount {
  id: string; accountNo?: string; bankName?: string;
  accountName?: string; balance?: number;
  accountId?: string | null; source?: "BankAccount" | "Account";
  account?: { openDebit?: number };
}
interface BankStatement {
  id: string; statementNo: string; date: string; amount: number;
  description: string; referenceNo?: string; isReconciled: boolean;
}

function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function BankReconciliationPage() {
  const user = getCurrentUser();

  const [bankAccounts,       setBankAccounts]       = useState<BankAccount[]>([]);
  const [statements,         setStatements]         = useState<BankStatement[]>([]);
  const [selectedAccount,    setSelectedAccount]    = useState("");
  const [selectedStatements, setSelectedStatements] = useState<string[]>([]);
  const [systemBalance,      setSystemBalance]      = useState(0);
  const [bankBalance,        setBankBalance]        = useState(0);
  const [loading,            setLoading]            = useState(false);
  const [showBankForm,       setShowBankForm]       = useState(false);
  const [editingBankId,      setEditingBankId]      = useState("");
  const [companyInfo,        setCompanyInfo]        = useState<any>(null);
  const [bankForm,           setBankForm]           = useState({ bankName: "", accountNo: "", accountName: "", balance: 0 });

  const h = (json = false): Record<string, string> => ({
    "x-user-role":  user?.role      || "",
    "x-user-id":    user?.id        || "",
    "x-company-id": user?.companyId || "",
    ...(json ? { "Content-Type": "application/json" } : {}),
  });

  useEffect(() => { fetchBankAccounts(); loadCompany(); }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchStatements(selectedAccount);
      const acct = bankAccounts.find(a => a.id === selectedAccount || a.accountId === selectedAccount);
      if (acct) setSystemBalance(acct.source === "BankAccount" ? (acct.balance || 0) : (acct.account?.openDebit || 0));
    } else {
      setSystemBalance(0); setBankBalance(0);
    }
  }, [selectedAccount, bankAccounts]);

  async function loadCompany() {
    try {
      const res = await fetch("/api/me/company", { headers: h() });
      if (res.ok) setCompanyInfo(await res.json());
    } catch {}
  }

  async function fetchBankAccounts() {
    if (!user?.companyId) { setBankAccounts([]); return; }
    try {
      const res  = await fetch("/api/bank-accounts", { headers: h() });
      const data = await res.json();
      setBankAccounts(Array.isArray(data) ? data : []);
    } catch { setBankAccounts([]); }
  }

  async function fetchStatements(accountId: string) {
    if (!user?.companyId) return;
    try {
      const ba = bankAccounts.find(a => a.id === accountId || a.accountId === accountId);
      let url = "";
      if (ba?.source === "BankAccount") {
        url = `/api/bank-statements?bankAccountId=${accountId}&isReconciled=false`;
      } else {
        const linked = bankAccounts.find(a => a.accountId === accountId);
        if (linked?.source === "BankAccount") url = `/api/bank-statements?bankAccountId=${linked.id}&isReconciled=false`;
        else { setStatements([]); return; }
      }
      const res  = await fetch(url, { headers: h() });
      const data = await res.json();
      setStatements(Array.isArray(data) ? data : []);
    } catch { setStatements([]); }
  }

  async function handleAddBank(e: React.FormEvent) {
    e.preventDefault();
    if (!bankForm.bankName || !bankForm.accountNo || !bankForm.accountName) { toast.error("Fill all required fields"); return; }
    setLoading(true);
    try {
      const method = editingBankId ? "PUT" : "POST";
      const body   = editingBankId ? { id: editingBankId, ...bankForm } : bankForm;
      const res    = await fetch("/api/bank-accounts", { method, headers: h(true), body: JSON.stringify(body) });
      if (res.ok) {
        toast.success(editingBankId ? "Bank account updated!" : "Bank account added!");
        setBankForm({ bankName: "", accountNo: "", accountName: "", balance: 0 });
        setEditingBankId(""); setShowBankForm(false);
        fetchBankAccounts();
      } else toast.error("Failed to save bank account");
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  }

  function handleEditBank(a: BankAccount) {
    setEditingBankId(a.id);
    setBankForm({ bankName: a.bankName || "", accountNo: a.accountNo || "", accountName: a.accountName || "", balance: a.balance || 0 });
    setShowBankForm(true);
  }

  async function handleDeleteBank(id: string) {
    if (!await confirmToast("Delete this bank account?")) return;
    const res = await fetch(`/api/bank-accounts?id=${id}`, { method: "DELETE", headers: h() });
    if (res.ok) {
      toast.success("Deleted!"); fetchBankAccounts();
      if (selectedAccount === id) setSelectedAccount("");
    } else {
      const err = await res.json(); toast.error(err.error || "Delete failed");
    }
  }

  async function handleReconcile() {
    if (!selectedAccount || selectedStatements.length === 0) { toast.error("Select a bank account and statements"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/bank-reconciliation", {
        method: "POST", headers: h(true),
        body: JSON.stringify({
          bankAccountId: selectedAccount, reconcileDate: new Date(),
          systemBalance, bankBalance,
          statementIds: selectedStatements,
          narration: `Reconciliation for ${selectedStatements.length} statements`,
        }),
      });
      if (res.ok) {
        toast.success("Reconciliation completed!");
        setSelectedStatements([]); setSystemBalance(0); setBankBalance(0);
        fetchStatements(selectedAccount);
      } else toast.error("Reconciliation failed");
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  }

  const difference  = Math.abs((systemBalance || 0) - (bankBalance || 0));
  const isBalanced  = difference < 0.01;
  const currency    = companyInfo?.baseCurrency || "PKR";

  const panel: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, fontFamily: ff };
  const inp:   React.CSSProperties = { width: "100%", background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const lbl:   React.CSSProperties = { fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: accent }}>Bank Reconciliation</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>Match your bank statements with system records</p>
        </div>
        <button onClick={() => { if (showBankForm) { setShowBankForm(false); setEditingBankId(""); setBankForm({ bankName: "", accountNo: "", accountName: "", balance: 0 }); } else { setShowBankForm(true); } }}
          style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontFamily: ff, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {showBankForm ? "Cancel" : "+ Add Bank Account"}
        </button>
      </div>

      {/* Add/Edit Bank Form */}
      {showBankForm && (
        <form onSubmit={handleAddBank} style={{ ...panel, marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: accent, marginBottom: 18 }}>{editingBankId ? "Edit Bank Account" : "New Bank Account"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={lbl}>Bank Name *</label>
              <input style={inp} placeholder="e.g. HBL, MCB" value={bankForm.bankName} onChange={e => setBankForm(f => ({ ...f, bankName: e.target.value }))} required />
            </div>
            <div>
              <label style={lbl}>Account Number *</label>
              <input style={inp} placeholder="IBAN or Account No" value={bankForm.accountNo} onChange={e => setBankForm(f => ({ ...f, accountNo: e.target.value }))} required />
            </div>
            <div>
              <label style={lbl}>Account Name *</label>
              <input style={inp} placeholder="Account Title" value={bankForm.accountName} onChange={e => setBankForm(f => ({ ...f, accountName: e.target.value }))} required />
            </div>
            <div>
              <label style={lbl}>Initial Balance ({currency})</label>
              <input type="number" style={inp} placeholder="0.00" value={bankForm.balance} onChange={e => setBankForm(f => ({ ...f, balance: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" disabled={loading} style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Saving…" : editingBankId ? "Update Account" : "Save Account"}
            </button>
            <button type="button" onClick={() => { setShowBankForm(false); setEditingBankId(""); setBankForm({ bankName: "", accountNo: "", accountName: "", balance: 0 }); }}
              style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 20px", fontFamily: ff, fontSize: 14, color: "var(--text-muted)", cursor: "pointer" }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Balance Controls */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Bank Account Selector */}
        <div style={panel}>
          <label style={lbl}>Bank Account</label>
          <select style={inp} value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
            <option value="">— Select Account —</option>
            {bankAccounts.map(a => (
              <option key={a.id} value={a.source === "BankAccount" ? a.id : (a.accountId || "")}>
                {a.bankName} — {a.accountNo}
              </option>
            ))}
          </select>
          {bankAccounts.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {bankAccounts.map(a => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "7px 10px" }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{a.bankName} — {a.accountNo}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => handleEditBank(a)} style={{ background: "transparent", border: "none", color: "#818cf8", cursor: "pointer", fontSize: 12, fontFamily: ff }}>Edit</button>
                    <button type="button" onClick={() => handleDeleteBank(a.id)} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: 12, fontFamily: ff }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Balance */}
        <div style={panel}>
          <label style={lbl}>System Balance ({currency})</label>
          <input type="number" step="0.01" style={inp} value={systemBalance || ""} placeholder="0.00"
            onChange={e => setSystemBalance(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>Auto-loaded from selected account</div>
        </div>

        {/* Bank Balance */}
        <div style={panel}>
          <label style={lbl}>Bank Balance ({currency})</label>
          <input type="number" step="0.01" style={inp} value={bankBalance || ""} placeholder="0.00"
            onChange={e => setBankBalance(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)} />
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>Enter balance from bank statement</div>
        </div>
      </div>

      {/* Difference Banner */}
      <div style={{ background: isBalanced ? "rgba(34,197,94,0.12)" : "rgba(248,113,113,0.12)", border: `1px solid ${isBalanced ? "rgba(34,197,94,0.3)" : "rgba(248,113,113,0.3)"}`, borderRadius: 10, padding: "12px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20 }}>{isBalanced ? "✓" : "✗"}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: isBalanced ? "#22c55e" : "#f87171" }}>
            Difference: {currency} {fmt(difference)} — {isBalanced ? "Balanced" : "Not Balanced"}
          </div>
          {!isBalanced && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Adjust System Balance or Bank Balance until difference is 0.00</div>}
        </div>
      </div>

      {/* Statements Table */}
      <div style={{ ...panel, padding: 0, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Unreconciled Bank Statements ({statements.length})</div>
          {selectedStatements.length > 0 && (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{selectedStatements.length} selected</div>
          )}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["", "Date", "Statement No", "Description", "Reference", "Amount"].map(h => (
                <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, textAlign: h === "Amount" ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {statements.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                {selectedAccount ? "No unreconciled statements found." : "Select a bank account to view statements."}
              </td></tr>
            ) : statements.map((s, idx) => {
              const checked = selectedStatements.includes(s.id);
              return (
                <tr key={s.id} style={{ borderBottom: idx < statements.length - 1 ? "1px solid var(--border)" : "none", background: checked ? "rgba(59,130,246,0.06)" : "transparent", cursor: "pointer" }}
                  onClick={() => setSelectedStatements(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                  onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLTableRowElement).style.background = "var(--panel-bg)"; }}
                  onMouseLeave={e => { if (!checked) (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}>
                  <td style={{ padding: "13px 16px" }}>
                    <input type="checkbox" checked={checked} onChange={() => {}} style={{ cursor: "pointer", accentColor: accent }} />
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--text-muted)" }}>{fmtDate(s.date)}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600, color: accent }}>{s.statementNo}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13 }}>{s.description}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--text-muted)" }}>{s.referenceNo || "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600, textAlign: "right" }}>{fmt(s.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Reconcile Button */}
      <button onClick={handleReconcile} disabled={loading || !isBalanced}
        style={{ background: isBalanced ? accent : "rgba(59,130,246,0.3)", color: "#fff", border: "none", borderRadius: 8, padding: "11px 28px", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: (loading || !isBalanced) ? "not-allowed" : "pointer", opacity: (loading || !isBalanced) ? 0.6 : 1 }}>
        {loading ? "Processing…" : "Reconcile Selected Statements"}
      </button>
    </div>
  );
}
