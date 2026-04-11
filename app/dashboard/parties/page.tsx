"use client";
import { confirmToast } from "@/lib/toast-feedback";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const ff = "'Outfit','Inter',sans-serif";
const accent = "#6366f1";

const TYPE_COLOR: Record<string, { bg: string; text: string }> = {
  CUSTOMER: { bg: "rgba(99,102,241,0.15)",  text: "#818cf8" },
  SUPPLIER: { bg: "rgba(251,146,60,0.15)",  text: "#fb923c" },
};

type Account = {
  id: string; name: string; phone?: string;
  partyType: "CUSTOMER" | "SUPPLIER" | string | null;
};

const TABS = ["ALL", "CUSTOMER", "SUPPLIER"] as const;
type Tab = typeof TABS[number];

export default function PartyAccounts() {
  const user = getCurrentUser();

  const [accounts,  setAccounts]  = useState<Account[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("ALL");
  const [search,    setSearch]    = useState("");
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name,      setName]      = useState("");
  const [phone,     setPhone]     = useState("");
  const [partyType, setPartyType] = useState<"CUSTOMER" | "SUPPLIER">("CUSTOMER");

  function headers(json = false) {
    const h: Record<string, string> = {
      "x-user-role":   user?.role      || "",
      "x-user-id":     user?.id        || "",
      "x-company-id":  user?.companyId || "",
    };
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch("/api/accounts", { headers: headers() });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.accounts || [];
      // Only show CUSTOMER and SUPPLIER — no banks, expenses, etc.
      setAccounts(list.filter((a: Account) => a.partyType === "CUSTOMER" || a.partyType === "SUPPLIER"));
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveParty() {
    if (!name.trim()) return;
    setSaving(true);
    const method = editingId ? "PUT" : "POST";
    const body: any = {
      name: name.trim(),
      type: partyType === "CUSTOMER" ? "ASSET" : "LIABILITY",
      partyType,
      phone: phone || undefined,
    };
    if (editingId) body.id = editingId;
    else body.code = `${partyType[0]}-${Date.now()}`;

    await fetch("/api/accounts", { method, headers: headers(true), body: JSON.stringify(body) });
    resetForm();
    setSaving(false);
    await load();
  }

  function handleEdit(a: Account) {
    setEditingId(a.id);
    setName(a.name);
    setPhone(a.phone || "");
    setPartyType(a.partyType === "CUSTOMER" ? "CUSTOMER" : "SUPPLIER");
  }

  async function deleteParty(id: string) {
    if (!await confirmToast("Delete this party? This cannot be undone.")) return;
    await fetch(`/api/accounts?id=${id}`, { method: "DELETE", headers: headers() });
    await load();
  }

  function resetForm() {
    setEditingId(null); setName(""); setPhone(""); setPartyType("CUSTOMER");
  }

  const filtered = accounts.filter(a => {
    const matchTab    = activeTab === "ALL" || a.partyType === activeTab;
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const customers = accounts.filter(a => a.partyType === "CUSTOMER").length;
  const suppliers  = accounts.filter(a => a.partyType === "SUPPLIER").length;

  // ── Styles ──
  const panel: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, fontFamily: ff };
  const inp:   React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const lbl:   React.CSSProperties = { fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Customers & Vendors</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
          Manage your customers and suppliers. For full chart of accounts, use <strong>Accounting → Chart of Accounts</strong>.
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Parties", value: accounts.length, color: accent },
          { label: "Customers",     value: customers,        color: "#818cf8" },
          { label: "Suppliers",     value: suppliers,        color: "#fb923c" },
        ].map(k => (
          <div key={k.label} style={{ ...panel, padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>

        {/* ── Add / Edit Form ── */}
        <div style={{ ...panel, alignSelf: "start" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{editingId ? "Edit Party" : "Add New Party"}</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={lbl}>Party Name *</label>
              <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. SAJJAD ENTERPRISES" onKeyDown={e => e.key === "Enter" && saveParty()} />
            </div>
            <div>
              <label style={lbl}>Phone (Optional)</label>
              <input style={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="03xx-xxxxxxx" />
            </div>
            <div>
              <label style={lbl}>Type</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(["CUSTOMER", "SUPPLIER"] as const).map(t => (
                  <button key={t} onClick={() => setPartyType(t)}
                    style={{ padding: "9px 0", borderRadius: 8, border: `1px solid ${partyType === t ? TYPE_COLOR[t].text + "88" : "var(--border)"}`, background: partyType === t ? TYPE_COLOR[t].bg : "transparent", color: partyType === t ? TYPE_COLOR[t].text : "var(--text-muted)", fontFamily: ff, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                    {t === "CUSTOMER" ? "Customer" : "Supplier"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveParty} disabled={saving || !name.trim()}
                style={{ flex: 1, background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: saving || !name.trim() ? "not-allowed" : "pointer", opacity: saving || !name.trim() ? 0.6 : 1 }}>
                {saving ? "Saving…" : editingId ? "Update Party" : "Add Party"}
              </button>
              {editingId && (
                <button onClick={resetForm}
                  style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 16px", fontFamily: ff, fontSize: 14, cursor: "pointer" }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Party List ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Search + Tabs */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input style={{ ...inp, flex: 1 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search parties…" />
            <div style={{ display: "flex", gap: 6 }}>
              {TABS.map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  style={{ padding: "7px 14px", borderRadius: 20, border: "1px solid var(--border)", fontFamily: ff, fontSize: 12, fontWeight: activeTab === t ? 700 : 400, background: activeTab === t ? accent : "transparent", color: activeTab === t ? "#fff" : "var(--text-muted)", cursor: "pointer" }}>
                  {t === "ALL" ? "All" : t === "CUSTOMER" ? "Customers" : "Suppliers"}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ ...panel, padding: 0, overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                {search ? `No results for "${search}"` : "No parties found. Add one from the left."}
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Name", "Type", "Phone", "Actions"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, textAlign: h === "Actions" ? "right" : "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, idx) => {
                    const c = TYPE_COLOR[a.partyType as string] || TYPE_COLOR.CUSTOMER;
                    return (
                      <tr key={a.id} style={{ borderBottom: idx < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.03)"}
                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                        <td style={{ padding: "13px 16px", fontSize: 14, fontWeight: 600 }}>{a.name}</td>
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.bg, color: c.text }}>
                            {a.partyType}
                          </span>
                        </td>
                        <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--text-muted)" }}>{a.phone || "—"}</td>
                        <td style={{ padding: "13px 16px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 12px", fontSize: 12, color: "var(--text-muted)", cursor: "pointer", fontFamily: ff }} onClick={() => handleEdit(a)}>Edit</button>
                            <button style={{ background: "transparent", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 6, padding: "4px 12px", fontSize: 12, color: "#f87171", cursor: "pointer", fontFamily: ff }} onClick={() => deleteParty(a.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
