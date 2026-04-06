"use client";

import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const FONT = "'Outfit','Inter',sans-serif";
const ACCENT = "#6366f1";
const PANEL = "var(--panel-bg)";
const BORDER = "var(--border)";
const TEXT = "var(--text-primary)";
const MUTED = "var(--text-muted)";
const BG = "var(--app-bg)";

const PREFIX_MAP: Record<string, string> = {
  CUSTOMER: "CS", SUPPLIER: "SP", BANKS: "BNK", CASH: "CASH",
  "FIXED ASSETS": "FA", "ACCUMULATED DEPRECIATION": "ADEP",
  EXPENSE: "EXP", INCOME: "INC", EQUITY: "EQT",
  LIABILITIES: "LIAB", STOCK: "STK", GENERAL: "GEN", CONTRA: "CON",
};

const CATEGORIES = [
  { value: "CUSTOMER",                  label: "Customer" },
  { value: "SUPPLIER",                  label: "Supplier" },
  { value: "BANKS",                     label: "Bank Account" },
  { value: "CASH",                      label: "Cash in Hand" },
  { value: "FIXED ASSETS",             label: "Fixed Assets" },
  { value: "ACCUMULATED DEPRECIATION", label: "Accumulated Depreciation" },
  { value: "EXPENSE",                   label: "Expense" },
  { value: "INCOME",                    label: "Income / Revenue" },
  { value: "EQUITY",                    label: "Equity (Capital)" },
  { value: "LIABILITIES",              label: "Liabilities" },
  { value: "STOCK",                     label: "Stock / Inventory" },
  { value: "GENERAL",                   label: "General" },
  { value: "CONTRA",                    label: "Contra" },
];

const TABS = ["ALL", "CUSTOMER", "SUPPLIER", "BANKS", "EXPENSE", "FIXED ASSETS", "EQUITY", "LIABILITIES", "CASH", "INCOME", "GENERAL", "CONTRA"];

type Account = {
  id: string; code: string; name: string;
  type?: string | null; partyType?: string | null;
  city?: string | null; phone?: string | null; email?: string | null;
  address?: string | null; ntn?: string | null; strn?: string | null;
  bankIban?: string | null; description?: string | null;
  parentId?: string | null;
  openDebit?: number; openCredit?: number;
  openDate?: string; creditDays?: number; creditLimit?: number;
};

const EMPTY_FORM = {
  code: "", name: "", partyType: "GENERAL",
  city: "", phone: "", email: "", address: "",
  ntn: "", strn: "", bankIban: "", description: "",
  parentId: "",
  openDate: new Date().toISOString().slice(0, 10),
  openDebit: "", openCredit: "", creditDays: "", creditLimit: "",
};

function inp(style?: React.CSSProperties): React.CSSProperties {
  return {
    padding: "9px 12px", borderRadius: 8,
    border: `1px solid ${BORDER}`,
    background: BG, color: TEXT,
    fontFamily: FONT, fontSize: 13, outline: "none",
    width: "100%", boxSizing: "border-box" as const,
    ...style,
  };
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{children}</div>;
}

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importCsv, setImportCsv] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function loadAccounts() {
    const user = getCurrentUser();
    if (!user) { setLoading(false); return; }
    try {
      const res = await fetch("/api/accounts", {
        headers: { "x-user-role": user.role, "x-company-id": user.companyId },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setAccounts(data);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => { loadAccounts(); }, []);

  async function handleCategoryChange(cat: string) {
    if (editingId) { f("partyType", cat); return; }
    const prefix = PREFIX_MAP[cat] || "ACC";
    const user = getCurrentUser();
    try {
      const res = await fetch(`/api/accounts?prefix=${prefix}`, {
        headers: { "x-user-role": user?.role || "", "x-company-id": user?.companyId || "" },
      });
      const data = await res.json();
      setForm(p => ({ ...p, partyType: cat, code: data.nextCode || p.code }));
    } catch {
      f("partyType", cat);
    }
  }

  async function saveAccount() {
    const user = getCurrentUser();
    if (!user) { toast.error("Session expired"); return; }
    if (!form.code || !form.name) { toast.error("A/C Code and Name are required"); return; }
    setSaving(true);
    const method = editingId ? "PUT" : "POST";
    const payload = editingId ? { ...form, id: editingId } : form;
    try {
      const res = await fetch("/api/accounts", {
        method,
        headers: { "Content-Type": "application/json", "x-user-role": user.role, "x-company-id": user.companyId },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        resetForm(); loadAccounts();
        toast.success(editingId ? "Account updated!" : "Account saved!");
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to save");
      }
    } catch { toast.error("Network error"); }
    finally { setSaving(false); }
  }

  async function deleteAccount(id: string) {
    if (!confirm("Delete this account?")) return;
    const user = getCurrentUser();
    if (!user) { toast.error("Session expired"); return; }
    const res = await fetch(`/api/accounts?id=${id}`, {
      method: "DELETE",
      headers: { "x-user-role": user.role, "x-company-id": user.companyId },
    });
    if (res.ok) { loadAccounts(); toast.success("Account deleted"); }
    else toast.error("Failed to delete");
  }

  function handleEdit(a: Account) {
    setEditingId(a.id);
    setForm({
      code: a.code, name: a.name,
      partyType: a.partyType || "GENERAL",
      city: a.city || "", phone: a.phone || "", email: a.email || "",
      address: a.address || "", ntn: a.ntn || "", strn: a.strn || "",
      bankIban: a.bankIban || "", description: a.description || "",
      parentId: a.parentId || "",
      openDate: a.openDate ? new Date(a.openDate).toISOString().slice(0, 10) : EMPTY_FORM.openDate,
      openDebit: String(a.openDebit || ""), openCredit: String(a.openCredit || ""),
      creditDays: String(a.creditDays || ""), creditLimit: String(a.creditLimit || ""),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() { setEditingId(null); setForm({ ...EMPTY_FORM }); }

  const filtered = accounts.filter(a => {
    const matchTab = activeTab === "ALL" || a.partyType === activeTab;
    const t = searchTerm.toLowerCase();
    return matchTab && (
      a.name.toLowerCase().includes(t) ||
      a.code.toLowerCase().includes(t) ||
      (a.city || "").toLowerCase().includes(t) ||
      (a.ntn || "").toLowerCase().includes(t)
    );
  });

  const showPartyFields = ["CUSTOMER", "SUPPLIER"].includes(form.partyType);
  const showBankFields  = form.partyType === "BANKS";

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: MUTED, fontFamily: FONT }}>
      Loading accounts…
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, padding: "28px 24px", color: TEXT }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Chart of Accounts</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: MUTED }}>{accounts.length} accounts</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={async () => {
            if (!confirm("Add 20 default trading accounts? (existing ones will be skipped)")) return;
            setSeeding(true);
            try {
              const user = getCurrentUser();
              const res = await fetch("/api/accounts/seed-defaults", {
                method: "POST",
                headers: { ...(user?.id ? { "x-user-id": user.id } : {}), ...(user?.role ? { "x-user-role": user.role } : {}) },
              });
              const data = await res.json();
              if (data.added > 0) toast.success(`${data.added} default accounts added!`);
              else toast("All default accounts already exist.");
              loadAccounts();
            } catch { toast.error("Error — please try again."); }
            finally { setSeeding(false); }
          }} disabled={seeding} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {seeding ? "Adding…" : "⚡ Quick Setup"}
          </button>
          <button onClick={() => window.open("/api/accounts?format=csv", "_blank")} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${BORDER}`, background: PANEL, color: TEXT, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>
            ↓ Export CSV
          </button>
          <button onClick={() => setShowImport(v => !v)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${ACCENT}`, background: "rgba(99,102,241,0.12)", color: ACCENT, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            ↑ Import CSV
          </button>
        </div>
      </div>

      {/* ── Import Panel ── */}
      {showImport && (
        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: MUTED }}>
            CSV headers: <code>code, name, partyType, city, phone, openDebit, openCredit, openDate, creditDays, creditLimit</code>
          </p>
          <textarea value={importCsv} onChange={e => setImportCsv(e.target.value)}
            style={{ ...inp(), height: 120, resize: "vertical", display: "block", marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={async () => {
              const user = getCurrentUser();
              if (!user) { toast.error("Session expired"); return; }
              if (!importCsv.trim()) { toast.error("Paste CSV first"); return; }
              const res = await fetch("/api/accounts/import", { method: "POST", headers: { "Content-Type": "application/json", "x-user-role": user.role, "x-user-id": user.id, "x-company-id": user.companyId }, body: JSON.stringify({ csv: importCsv }) });
              const data = await res.json();
              if (res.ok) { toast.success(`Imported: ${data.created}, Skipped: ${data.skipped}`); setImportCsv(""); setShowImport(false); loadAccounts(); }
              else toast.error(data.error || "Import failed");
            }} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: ACCENT, color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Import</button>
            <button onClick={() => setShowImport(false)} style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Form ── */}
      <div style={{ background: PANEL, border: `2px solid ${editingId ? ACCENT : BORDER}`, borderRadius: 14, padding: 22, marginBottom: 24, boxShadow: editingId ? `0 0 0 3px rgba(99,102,241,0.15)` : "none" }}>
        {editingId && (
          <div style={{ marginBottom: 16, padding: "8px 14px", background: "rgba(99,102,241,0.12)", borderRadius: 8, fontSize: 12, color: ACCENT, fontWeight: 700 }}>
            ✏️ Editing account — make changes then click Update
          </div>
        )}

        {/* Row 1: Category, Code, Name */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 2fr", gap: 12, marginBottom: 14 }}>
          <div>
            <Label>Category *</Label>
            <select value={form.partyType} onChange={e => handleCategoryChange(e.target.value)} style={{ ...inp(), colorScheme: "dark" }}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <Label>A/C Code *</Label>
            <input value={form.code} onChange={e => f("code", e.target.value)} placeholder="e.g. CS-001" style={{ ...inp(), color: ACCENT, fontWeight: 700 }} />
          </div>
          <div>
            <Label>Account Name *</Label>
            <input value={form.name} onChange={e => f("name", e.target.value)} placeholder="Full account name" style={inp()} />
          </div>
        </div>

        {/* Row 2: Contact info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <Label>Phone</Label>
            <input value={form.phone} onChange={e => f("phone", e.target.value)} placeholder="0300-0000000" style={inp()} />
          </div>
          <div>
            <Label>Email</Label>
            <input type="email" value={form.email} onChange={e => f("email", e.target.value)} placeholder="email@domain.com" style={inp()} />
          </div>
          <div>
            <Label>City</Label>
            <input value={form.city} onChange={e => f("city", e.target.value)} placeholder="Lahore" style={inp()} />
          </div>
          <div>
            <Label>Address</Label>
            <input value={form.address} onChange={e => f("address", e.target.value)} placeholder="Street, Area" style={inp()} />
          </div>
        </div>

        {/* Row 3: Tax fields — only for Customer / Supplier */}
        {showPartyFields && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <Label>NTN (National Tax No.)</Label>
              <input value={form.ntn} onChange={e => f("ntn", e.target.value)} placeholder="1234567-8" style={inp()} />
            </div>
            <div>
              <Label>STRN (Sales Tax Reg. No.)</Label>
              <input value={form.strn} onChange={e => f("strn", e.target.value)} placeholder="12-34-5678-001-56" style={inp()} />
            </div>
            <div>
              <Label>Credit Days</Label>
              <input type="number" value={form.creditDays} onChange={e => f("creditDays", e.target.value)} placeholder="30" style={inp()} />
            </div>
          </div>
        )}

        {/* Row 3b: Bank IBAN — only for BANKS */}
        {showBankFields && (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <Label>Bank IBAN / Account No.</Label>
              <input value={form.bankIban} onChange={e => f("bankIban", e.target.value)} placeholder="PK36SCBL0000001123456702" style={inp()} />
            </div>
            <div>
              <Label>Credit Limit</Label>
              <input type="number" value={form.creditLimit} onChange={e => f("creditLimit", e.target.value)} placeholder="0.00" style={inp()} />
            </div>
          </div>
        )}

        {/* Row 4: Opening balances */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <Label>Opening Date</Label>
            <input type="date" value={form.openDate} onChange={e => f("openDate", e.target.value)} style={{ ...inp(), colorScheme: "dark" }} />
          </div>
          <div>
            <Label>Opening Debit (Dr)</Label>
            <input type="number" value={form.openDebit} onChange={e => f("openDebit", e.target.value)} placeholder="0.00" style={inp()} />
          </div>
          <div>
            <Label>Opening Credit (Cr)</Label>
            <input type="number" value={form.openCredit} onChange={e => f("openCredit", e.target.value)} placeholder="0.00" style={inp()} />
          </div>
          {!showPartyFields && !showBankFields && (
            <div>
              <Label>Credit Limit</Label>
              <input type="number" value={form.creditLimit} onChange={e => f("creditLimit", e.target.value)} placeholder="0.00" style={inp()} />
            </div>
          )}
          {showPartyFields && (
            <div>
              <Label>Credit Limit</Label>
              <input type="number" value={form.creditLimit} onChange={e => f("creditLimit", e.target.value)} placeholder="0.00" style={inp()} />
            </div>
          )}
        </div>

        {/* Row 5: Description */}
        <div style={{ marginBottom: 16 }}>
          <Label>Description / Notes</Label>
          <input value={form.description} onChange={e => f("description", e.target.value)} placeholder="Internal notes about this account (optional)" style={inp()} />
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={saveAccount} disabled={saving} style={{ padding: "10px 28px", borderRadius: 8, border: "none", background: editingId ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", fontFamily: FONT, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(99,102,241,0.35)", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : editingId ? "✓ Update Account" : "+ Save Account"}
          </button>
          {editingId && (
            <button onClick={resetForm} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* ── Search + Tabs ── */}
      <div style={{ marginBottom: 16 }}>
        <input type="text" placeholder="Search by name, code, city, NTN…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          style={{ ...inp({ width: 320, marginBottom: 14 }) }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "6px 14px", borderRadius: 20, border: `1px solid ${activeTab === tab ? ACCENT : BORDER}`,
              background: activeTab === tab ? "rgba(99,102,241,0.15)" : "transparent",
              color: activeTab === tab ? ACCENT : MUTED,
              fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer",
              textTransform: "uppercase", letterSpacing: 0.5,
            }}>{tab}</button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(99,102,241,0.08)" }}>
                {["Code", "Name", "Category", "Phone", "NTN / STRN", "Opening Dr", "Opening Cr", "Actions"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", color: MUTED, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: "40px 16px", textAlign: "center", color: MUTED }}>No accounts found</td></tr>
              ) : filtered.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.1)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)"}
                >
                  <td style={{ padding: "11px 14px", color: ACCENT, fontWeight: 700 }}>{a.code}</td>
                  <td style={{ padding: "11px 14px", fontWeight: 600 }}>
                    {a.name}
                    {a.description && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{a.description}</div>}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 12, background: "rgba(99,102,241,0.12)", color: ACCENT, fontSize: 10, fontWeight: 700 }}>
                      {a.partyType}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px", color: MUTED, fontSize: 12 }}>{a.phone || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 11, color: MUTED }}>
                    {a.ntn && <div>NTN: {a.ntn}</div>}
                    {a.strn && <div>STRN: {a.strn}</div>}
                    {!a.ntn && !a.strn && "—"}
                  </td>
                  <td style={{ padding: "11px 14px", color: "#f87171", textAlign: "right" }}>{a.openDebit ? Number(a.openDebit).toLocaleString() : "—"}</td>
                  <td style={{ padding: "11px 14px", color: "#34d399", textAlign: "right" }}>{a.openCredit ? Number(a.openCredit).toLocaleString() : "—"}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => handleEdit(a)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${ACCENT}`, background: "rgba(99,102,241,0.12)", color: ACCENT, fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Edit</button>
                      <button onClick={() => deleteAccount(a.id)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(248,113,113,0.4)", background: "rgba(248,113,113,0.08)", color: "#f87171", fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${BORDER}`, fontSize: 12, color: MUTED, display: "flex", justifyContent: "space-between" }}>
          <span>Showing {filtered.length} of {accounts.length} accounts</span>
          {activeTab !== "ALL" && <span style={{ color: ACCENT, fontWeight: 600 }}>{activeTab}</span>}
        </div>
      </div>
    </div>
  );
}
