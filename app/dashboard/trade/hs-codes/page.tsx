"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";
import { confirmToast } from "@/lib/toast-feedback";
import { useResponsive } from "@/hooks/useResponsive";

const ff = "'Outfit','Inter',sans-serif";
const accent = "#6366f1";

type HSCode = { id: string; code: string; description: string; dutyRate: number; unit: string; category: string };

const COMMON_HS_CODES: Omit<HSCode, "id">[] = [
  { code: "1001.90", description: "Wheat and meslin", dutyRate: 0, unit: "KG", category: "Food & Agriculture" },
  { code: "2701.12", description: "Bituminous coal", dutyRate: 5, unit: "KG", category: "Minerals & Fuels" },
  { code: "3004.90", description: "Medicaments (mixed/unmixed products)", dutyRate: 0, unit: "KG", category: "Pharmaceuticals" },
  { code: "5201.00", description: "Cotton, not carded or combed", dutyRate: 5, unit: "KG", category: "Textiles" },
  { code: "5208.11", description: "Woven cotton fabric, plain weave", dutyRate: 20, unit: "M2", category: "Textiles" },
  { code: "6109.10", description: "T-shirts, singlets, cotton", dutyRate: 20, unit: "PCS", category: "Garments" },
  { code: "8471.30", description: "Laptop computers", dutyRate: 0, unit: "PCS", category: "Electronics" },
  { code: "8517.12", description: "Telephones for cellular networks", dutyRate: 17, unit: "PCS", category: "Electronics" },
  { code: "8703.23", description: "Motor vehicles, 1000-1500cc", dutyRate: 50, unit: "PCS", category: "Automobiles" },
  { code: "2710.19", description: "Petroleum oils, not crude", dutyRate: 5, unit: "LTR", category: "Minerals & Fuels" },
  { code: "0901.11", description: "Coffee, not roasted or decaffeinated", dutyRate: 5, unit: "KG", category: "Food & Agriculture" },
  { code: "1701.14", description: "Cane sugar, raw", dutyRate: 15, unit: "KG", category: "Food & Agriculture" },
  { code: "3901.10", description: "Polyethylene, density < 0.94", dutyRate: 10, unit: "KG", category: "Plastics" },
  { code: "7208.37", description: "Flat-rolled iron/steel products", dutyRate: 15, unit: "KG", category: "Metals" },
  { code: "9403.60", description: "Wooden furniture", dutyRate: 25, unit: "PCS", category: "Furniture" },
];

export default function HSCodesPage() {
  const { isMobile } = useResponsive();
  const user = getCurrentUser();
  const [codes, setCodes] = useState<HSCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HSCode | null>(null);
  const [form, setForm] = useState({ code: "", description: "", dutyRate: "", unit: "", category: "" });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const h = user as { id?: string; role?: string; companyId?: string } | null;
  const headers: HeadersInit = { "x-user-id": h?.id || "", "x-user-role": h?.role || "ADMIN", "x-company-id": h?.companyId || "", "Content-Type": "application/json" };

  async function load(q = "") {
    setLoading(true);
    const res = await fetch(`/api/hs-codes${q ? `?q=${encodeURIComponent(q)}` : ""}`, { headers });
    if (res.ok) setCodes(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.code || !form.description) { toast.error("Code and description required"); return; }
    setSaving(true);
    const method = editing ? "PUT" : "POST";
    const body = editing ? { id: editing.id, ...form, dutyRate: Number(form.dutyRate) } : { ...form, dutyRate: Number(form.dutyRate) };
    const res = await fetch("/api/hs-codes", { method, headers, body: JSON.stringify(body) });
    if (res.ok) { toast.success(editing ? "Updated" : "Added"); setShowForm(false); setEditing(null); resetForm(); load(); }
    else { const e = await res.json(); toast.error(e.error || "Failed"); }
    setSaving(false);
  }

  async function del(id: string) {
    if (!await confirmToast("Delete this HS Code?")) return;
    const res = await fetch(`/api/hs-codes?id=${id}`, { method: "DELETE", headers });
    if (res.ok) { toast.success("Deleted"); load(); } else toast.error("Delete failed");
  }

  async function importCommon() {
    if (!await confirmToast("Import common HS codes? This will add standard codes to your list.")) return;
    setImporting(true);
    let added = 0;
    for (const c of COMMON_HS_CODES) {
      const res = await fetch("/api/hs-codes", { method: "POST", headers, body: JSON.stringify(c) });
      if (res.ok) added++;
    }
    toast.success(`${added} HS codes imported`);
    load();
    setImporting(false);
  }

  function startEdit(c: HSCode) { setEditing(c); setForm({ code: c.code, description: c.description, dutyRate: String(c.dutyRate), unit: c.unit, category: c.category }); setShowForm(true); }
  function resetForm() { setForm({ code: "", description: "", dutyRate: "", unit: "", category: "" }); }

  const inp: React.CSSProperties = { background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" };
  const btn = (bg = accent): React.CSSProperties => ({ background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: "pointer" });
  const ghost: React.CSSProperties = { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 16px", fontFamily: ff, fontSize: 13, cursor: "pointer" };

  const filtered = search ? codes.filter(c => c.code.includes(search) || c.description.toLowerCase().includes(search.toLowerCase())) : codes;

  return (
    <div style={{ padding: isMobile ? "13px 13px" : "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>HS Code Master</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>Harmonized System codes for import/export customs declarations</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {codes.length === 0 && <button style={btn("#0891b2")} onClick={importCommon} disabled={importing}>{importing ? "Importing..." : "📦 Import Common Codes"}</button>}
          <button style={btn()} onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}>+ Add HS Code</button>
        </div>
      </div>

      {showForm && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{editing ? "Edit HS Code" : "New HS Code"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 }}>
            <div><label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 5 }}>HS CODE *</label><input style={inp} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. 5208.11" /></div>
            <div style={{ gridColumn: "span 2" }}><label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 5 }}>DESCRIPTION *</label><input style={inp} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Goods description" /></div>
            <div><label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 5 }}>DUTY RATE %</label><input type="number" style={inp} value={form.dutyRate} onChange={e => setForm(f => ({ ...f, dutyRate: e.target.value }))} placeholder="0" /></div>
            <div><label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 5 }}>UNIT</label><input style={inp} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="KG / PCS / MTR" /></div>
            <div><label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 5 }}>CATEGORY</label><input style={inp} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Textiles / Electronics..." /></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={btn()} onClick={save} disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Save"}</button>
            <button style={ghost} onClick={() => { setShowForm(false); setEditing(null); resetForm(); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 16, padding: "12px 16px" }}>
        <input style={{ ...inp, width: 320 }} value={search} onChange={e => { setSearch(e.target.value); if (!e.target.value) load(); }} onKeyDown={e => e.key === "Enter" && load(search)} placeholder="Search code or description..." />
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["HS Code", "Description", "Category", "Duty Rate", "Unit", ""].map(h => (
                <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                No HS codes found. {codes.length === 0 && <span>Click <b>"Import Common Codes"</b> to get started.</span>}
              </td></tr>
            ) : filtered.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: 700, color: accent }}>{c.code}</td>
                <td style={{ padding: "12px 16px", fontSize: 14 }}>{c.description}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)" }}>{c.category || "—"}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: c.dutyRate > 0 ? "#f59e0b" : "#10b981" }}>{c.dutyRate}%</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)" }}>{c.unit || "—"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ ...ghost, padding: "4px 12px", fontSize: 12 }} onClick={() => startEdit(c)}>Edit</button>
                    <button style={{ ...ghost, padding: "4px 12px", fontSize: 12, color: "#f87171", borderColor: "#f8717144" }} onClick={() => del(c.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
        {filtered.length} codes shown{search ? ` for "${search}"` : ""}
      </div>
    </div>
  );
}
