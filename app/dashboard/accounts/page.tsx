"use client";

import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { confirmToast } from "@/lib/toast-feedback";

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

const CATEGORY_COLOR: Record<string, { bg: string; text: string }> = {
  CUSTOMER:    { bg: "rgba(99,102,241,0.15)",  text: "#818cf8" },
  SUPPLIER:    { bg: "rgba(251,146,60,0.15)",  text: "#fb923c" },
  BANKS:       { bg: "rgba(52,211,153,0.15)",  text: "#34d399" },
  CASH:        { bg: "rgba(45,212,191,0.15)",  text: "#2dd4bf" },
  EXPENSE:     { bg: "rgba(248,113,113,0.15)", text: "#f87171" },
  INCOME:      { bg: "rgba(74,222,128,0.15)",  text: "#4ade80" },
  EQUITY:      { bg: "rgba(167,139,250,0.15)", text: "#a78bfa" },
  LIABILITIES: { bg: "rgba(251,191,36,0.15)",  text: "#fbbf24" },
  "FIXED ASSETS": { bg: "rgba(56,189,248,0.15)", text: "#38bdf8" },
  STOCK:       { bg: "rgba(129,140,248,0.15)", text: "#818cf8" },
  GENERAL:     { bg: "rgba(148,163,184,0.15)", text: "#94a3b8" },
  CONTRA:      { bg: "rgba(244,114,182,0.15)", text: "#f472b6" },
  "ACCUMULATED DEPRECIATION": { bg: "rgba(248,113,113,0.15)", text: "#f87171" },
};

const CATEGORIES = [
  { value: "CUSTOMER",                  label: "Customer" },
  { value: "SUPPLIER",                  label: "Supplier" },
  { value: "BANKS",                     label: "Bank Account" },
  { value: "CASH",                      label: "Cash in Hand" },
  { value: "FIXED ASSETS",              label: "Fixed Assets" },
  { value: "ACCUMULATED DEPRECIATION",  label: "Accumulated Depreciation" },
  { value: "EXPENSE",                   label: "Expense" },
  { value: "INCOME",                    label: "Income / Revenue" },
  { value: "EQUITY",                    label: "Equity (Capital)" },
  { value: "LIABILITIES",               label: "Liabilities" },
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
  code: "", name: "", partyType: "CUSTOMER",
  city: "", phone: "", email: "", address: "",
  ntn: "", strn: "", bankIban: "", description: "",
  parentId: "",
  openDate: new Date().toISOString().slice(0, 10),
  openDebit: "", openCredit: "", creditDays: "", creditLimit: "",
};

function inp(extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: "10px 14px", borderRadius: 8,
    border: `1.5px solid ${BORDER}`,
    background: "var(--app-bg)", color: TEXT,
    fontFamily: FONT, fontSize: 13.5, outline: "none",
    width: "100%", boxSizing: "border-box" as const,
    transition: "border-color 0.2s",
    ...extra,
  };
}

function SectionTitle({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, marginTop: 4 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: BORDER, marginLeft: 4 }} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, marginBottom: 5, letterSpacing: 0.4 }}>{label}</div>
      {children}
    </div>
  );
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

  useEffect(() => {
    if (!loading && !editingId && !form.code) {
      handleCategoryChange(form.partyType);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

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
    if (!(await confirmToast("Delete this account?"))) return;
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

  const showContact  = ["CUSTOMER", "SUPPLIER", "BANKS"].includes(form.partyType);
  const showTax      = ["CUSTOMER", "SUPPLIER"].includes(form.partyType);
  const showBankIban = form.partyType === "BANKS";
  const catColor     = CATEGORY_COLOR[form.partyType] || CATEGORY_COLOR["GENERAL"];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: MUTED, fontFamily: FONT }}>
      Loading accounts…
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, padding: "28px 24px", color: TEXT }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Chart of Accounts</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: MUTED }}>{accounts.length} total accounts</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={async () => {
            if (!(await confirmToast("Add 20 default trading accounts? Existing ones will be skipped."))) return;
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
          }} disabled={seeding} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {seeding ? "Adding…" : "⚡ Quick Setup"}
          </button>
          <button onClick={() => window.open("/api/accounts?format=csv", "_blank")} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${BORDER}`, background: PANEL, color: TEXT, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>
            ↓ Export
          </button>
          <button onClick={() => setShowImport(v => !v)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${ACCENT}`, background: showImport ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.08)", color: ACCENT, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            ↑ Import
          </button>
        </div>
      </div>

      {/* ── Import Panel ── */}
      {showImport && (
        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: MUTED }}>
            CSV headers: <code style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>code, name, partyType, city, phone, openDebit, openCredit, openDate, creditDays, creditLimit</code>
          </p>
          <textarea value={importCsv} onChange={e => setImportCsv(e.target.value)}
            style={{ ...inp(), height: 110, resize: "vertical", display: "block", marginBottom: 10 }} />
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
            <button onClick={() => setShowImport(false)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Form Card ── */}
      <div style={{
        background: PANEL,
        border: `1.5px solid ${editingId ? ACCENT : BORDER}`,
        borderRadius: 16,
        marginBottom: 24,
        overflow: "hidden",
        boxShadow: editingId ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
      }}>

        {/* Form Header */}
        <div style={{
          padding: "16px 22px",
          borderBottom: `1px solid ${BORDER}`,
          background: editingId ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.02)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: editingId ? "rgba(99,102,241,0.2)" : catColor.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
              {editingId ? "✏️" : "➕"}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: TEXT }}>
                {editingId ? "Edit Account" : "New Account"}
              </div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>
                {editingId ? "Update the details below and click Save" : "Fill in the details to add a new account"}
              </div>
            </div>
          </div>
          {editingId && (
            <button onClick={resetForm} style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 12, cursor: "pointer" }}>
              ✕ Cancel
            </button>
          )}
        </div>

        <div style={{ padding: "20px 22px" }}>

          {/* Section 1: Identity */}
          <SectionTitle icon="🏷️" label="Account Identity" />
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 160px 2fr", gap: 14, marginBottom: 22 }}>
            <Field label="Category *">
              <select
                value={form.partyType}
                onChange={e => handleCategoryChange(e.target.value)}
                style={{ ...inp(), colorScheme: "dark", cursor: "pointer" }}
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="A/C Code *">
              <input
                value={form.code}
                onChange={e => f("code", e.target.value)}
                placeholder="CS-0001"
                style={{ ...inp(), color: catColor.text, fontWeight: 700, letterSpacing: 0.5 }}
              />
            </Field>
            <Field label="Account Name *">
              <input
                value={form.name}
                onChange={e => f("name", e.target.value)}
                placeholder="Enter full account name"
                style={inp()}
              />
            </Field>
          </div>

          {/* Section 2: Contact Info (Customer, Supplier, Banks) */}
          {showContact && (
            <>
              <SectionTitle icon="📞" label="Contact Information" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
                <Field label="Phone">
                  <input value={form.phone} onChange={e => f("phone", e.target.value)} placeholder="0300-0000000" style={inp()} />
                </Field>
                <Field label="Email">
                  <input type="email" value={form.email} onChange={e => f("email", e.target.value)} placeholder="email@domain.com" style={inp()} />
                </Field>
                <Field label="City">
                  <input value={form.city} onChange={e => f("city", e.target.value)} placeholder="Lahore" style={inp()} />
                </Field>
                <Field label="Address">
                  <input value={form.address} onChange={e => f("address", e.target.value)} placeholder="Street, Area" style={inp()} />
                </Field>
              </div>
            </>
          )}

          {/* Section 3: Tax Fields (Customer / Supplier only) */}
          {showTax && (
            <>
              <SectionTitle icon="📋" label="Tax & Credit" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
                <Field label="NTN">
                  <input value={form.ntn} onChange={e => f("ntn", e.target.value)} placeholder="1234567-8" style={inp()} />
                </Field>
                <Field label="STRN">
                  <input value={form.strn} onChange={e => f("strn", e.target.value)} placeholder="12-34-5678-001-56" style={inp()} />
                </Field>
                <Field label="Credit Days">
                  <input type="number" value={form.creditDays} onChange={e => f("creditDays", e.target.value)} placeholder="30" style={inp()} />
                </Field>
                <Field label="Credit Limit">
                  <input type="number" value={form.creditLimit} onChange={e => f("creditLimit", e.target.value)} placeholder="0.00" style={inp()} />
                </Field>
              </div>
            </>
          )}

          {/* Section 4: Bank IBAN */}
          {showBankIban && (
            <>
              <SectionTitle icon="🏦" label="Bank Details" />
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 22 }}>
                <Field label="IBAN / Account No.">
                  <input value={form.bankIban} onChange={e => f("bankIban", e.target.value)} placeholder="PK36SCBL0000001123456702" style={inp()} />
                </Field>
                <Field label="Credit Limit">
                  <input type="number" value={form.creditLimit} onChange={e => f("creditLimit", e.target.value)} placeholder="0.00" style={inp()} />
                </Field>
              </div>
            </>
          )}

          {/* Section 5: Opening Balance */}
          <SectionTitle icon="💰" label="Opening Balance" />
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
            <Field label="Opening Date">
              <input type="date" value={form.openDate} onChange={e => f("openDate", e.target.value)} style={{ ...inp(), colorScheme: "dark" }} />
            </Field>
            <Field label="Debit (Dr)">
              <input type="number" value={form.openDebit} onChange={e => f("openDebit", e.target.value)} placeholder="0.00" style={{ ...inp(), color: "#f87171" }} />
            </Field>
            <Field label="Credit (Cr)">
              <input type="number" value={form.openCredit} onChange={e => f("openCredit", e.target.value)} placeholder="0.00" style={{ ...inp(), color: "#34d399" }} />
            </Field>
            {!showTax && !showBankIban && (
              <Field label="Credit Limit">
                <input type="number" value={form.creditLimit} onChange={e => f("creditLimit", e.target.value)} placeholder="0.00" style={inp()} />
              </Field>
            )}
          </div>

          {/* Section 6: Notes */}
          <SectionTitle icon="📝" label="Notes" />
          <div style={{ marginBottom: 20 }}>
            <input
              value={form.description}
              onChange={e => f("description", e.target.value)}
              placeholder="Internal notes about this account (optional)"
              style={inp()}
            />
          </div>

          {/* Save Button */}
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button
              onClick={saveAccount}
              disabled={saving}
              style={{
                padding: "11px 32px",
                borderRadius: 9,
                border: "none",
                background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                color: "#fff",
                fontFamily: FONT,
                fontSize: 14,
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: "0 4px 18px rgba(99,102,241,0.4)",
                opacity: saving ? 0.7 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {saving ? "Saving…" : editingId ? "✓ Update Account" : "+ Save Account"}
            </button>
            {editingId && (
              <button onClick={resetForm} style={{ padding: "11px 20px", borderRadius: 9, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>
                Discard Changes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "0 0 auto" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: MUTED, fontSize: 14, pointerEvents: "none" }}>🔍</span>
          <input
            type="text"
            placeholder="Search name, code, city, NTN…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ ...inp({ paddingLeft: 36, width: 280 }) }}
          />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "6px 13px", borderRadius: 20,
              border: `1px solid ${activeTab === tab ? ACCENT : BORDER}`,
              background: activeTab === tab ? "rgba(99,102,241,0.15)" : "transparent",
              color: activeTab === tab ? ACCENT : MUTED,
              fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer",
              textTransform: "uppercase", letterSpacing: 0.5,
              transition: "all 0.15s",
            }}>{tab === "ALL" ? "All" : tab}</button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(99,102,241,0.07)", borderBottom: `1px solid ${BORDER}` }}>
                {["A/C Code", "Account Name", "Category", "Contact", "Tax Info", "Opening Dr", "Opening Cr", "Actions"].map(h => (
                  <th key={h} style={{
                    padding: "12px 16px", textAlign: "left",
                    color: MUTED, fontWeight: 700, fontSize: 10.5,
                    textTransform: "uppercase", letterSpacing: 0.8,
                    whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "48px 16px", textAlign: "center", color: MUTED }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>No accounts found</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Try a different search or category filter</div>
                  </td>
                </tr>
              ) : filtered.map((a, i) => {
                const cc = CATEGORY_COLOR[a.partyType || "GENERAL"] || CATEGORY_COLOR["GENERAL"];
                return (
                  <tr
                    key={a.id}
                    style={{ borderBottom: `1px solid ${BORDER}`, background: "transparent", transition: "background 0.12s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.06)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: cc.text, background: cc.bg, padding: "3px 8px", borderRadius: 6 }}>
                        {a.code}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</div>
                      {a.description && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{a.description}</div>}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ padding: "3px 9px", borderRadius: 12, background: cc.bg, color: cc.text, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {a.partyType}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", color: MUTED, fontSize: 12 }}>
                      {a.phone && <div>{a.phone}</div>}
                      {a.city && <div style={{ fontSize: 11, marginTop: 1 }}>{a.city}</div>}
                      {!a.phone && !a.city && "—"}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 11, color: MUTED }}>
                      {a.ntn && <div>NTN: {a.ntn}</div>}
                      {a.strn && <div>STRN: {a.strn}</div>}
                      {!a.ntn && !a.strn && "—"}
                    </td>
                    <td style={{ padding: "13px 16px", color: "#f87171", textAlign: "right", fontWeight: 600, fontSize: 13 }}>
                      {a.openDebit ? Number(a.openDebit).toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: "13px 16px", color: "#34d399", textAlign: "right", fontWeight: 600, fontSize: 13 }}>
                      {a.openCredit ? Number(a.openCredit).toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => handleEdit(a)}
                          style={{ padding: "5px 13px", borderRadius: 6, border: `1px solid ${ACCENT}`, background: "rgba(99,102,241,0.1)", color: ACCENT, fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >Edit</button>
                        <button
                          onClick={() => deleteAccount(a.id)}
                          style={{ padding: "5px 13px", borderRadius: 6, border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.07)", color: "#f87171", fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div style={{ padding: "12px 18px", borderTop: `1px solid ${BORDER}`, fontSize: 12, color: MUTED, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Showing <strong style={{ color: TEXT }}>{filtered.length}</strong> of <strong style={{ color: TEXT }}>{accounts.length}</strong> accounts</span>
          {activeTab !== "ALL" && (
            <span style={{ padding: "3px 10px", borderRadius: 12, background: "rgba(99,102,241,0.12)", color: ACCENT, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{activeTab}</span>
          )}
        </div>
      </div>
    </div>
  );
}
