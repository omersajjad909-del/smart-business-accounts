"use client";
import { useState, useMemo } from "react";
import { useBusinessRecords, BusinessRecord } from "@/lib/useBusinessRecords";
import DateInput from "@/app/dashboard/reports/_components/DateInput";
import { useResponsive } from "@/hooks/useResponsive";

// ─── Types ────────────────────────────────────────────────────────────────────

type MovementType = "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT";

interface StockMovementData {
  movementNo: string; type: MovementType; date: string; itemName: string;
  warehouse: string; qty: number; unit: string; reference: string; reason: string; notes: string;
}

interface StockMovementRecord extends StockMovementData {
  id: string; createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_META: Record<MovementType, { label: string; color: string; bg: string; border: string; prefix: string }> = {
  STOCK_IN:    { label: "Stock In",    color: "#4ade80", bg: "rgba(74,222,128,.12)",   border: "rgba(74,222,128,.35)",   prefix: "SIN" },
  STOCK_OUT:   { label: "Stock Out",   color: "#f87171", bg: "rgba(248,113,113,.12)",  border: "rgba(248,113,113,.35)",  prefix: "SOUT" },
  ADJUSTMENT:  { label: "Adjustment",  color: "#fbbf24", bg: "rgba(251,191,36,.12)",   border: "rgba(251,191,36,.35)",   prefix: "ADJ" },
};

const REASONS: Record<MovementType, string[]> = {
  STOCK_IN:    ["Purchase Receipt", "Production", "Transfer In", "Return from Customer", "Opening Stock", "Other"],
  STOCK_OUT:   ["Sale Dispatch", "Transfer Out", "Damaged / Expired", "Return to Supplier", "Sample", "Other"],
  ADJUSTMENT:  ["Physical Count Correction", "Damage Write-off", "System Error Fix", "Revaluation", "Other"],
};

const FONT = "'Outfit','Inter',sans-serif";
const ACCENT = "#14b8a6";

const s = {
  page:  { fontFamily: FONT, color: "var(--text-primary)", padding: isMobile ? "15px 11px" : "28px 24px", minHeight: "100vh", background: "var(--app-bg)" },
  panel: { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14 },
  inp:   { background: "rgba(255,255,255,.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 13px", color: "var(--text-primary)", fontFamily: FONT, fontSize: 13, width: "100%", boxSizing: "border-box" as const, outline: "none" },
  label: { fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 500 } as React.CSSProperties,
  btn:   (bg: string, sm?: boolean) => ({ background: bg, border: "none", borderRadius: 8, padding: sm ? "7px 14px" : "10px 22px", color: "#fff", fontFamily: FONT, cursor: "pointer", fontSize: sm ? 12 : 13, fontWeight: 600, lineHeight: 1 } as React.CSSProperties),
  badge: (m: { color: string; bg: string; border: string }) => ({ background: m.bg, color: m.color, border: `1px solid ${m.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" as const, display: "inline-block" }),
  th:    { padding: "11px 13px", textAlign: "left" as const, fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", borderBottom: "1px solid var(--border)" },
  td:    { padding: "12px 13px", fontSize: 13, borderBottom: "1px solid var(--border)", verticalAlign: "middle" as const },
  tabBtn:(active: boolean) => ({ background: active ? ACCENT : "rgba(255,255,255,.06)", border: `1px solid ${active ? ACCENT : "var(--border)"}`, borderRadius: 8, padding: "7px 16px", color: active ? "#fff" : "var(--text-muted)", fontFamily: FONT, cursor: "pointer", fontSize: 12, fontWeight: 600 }),
};

const todayIso = () => new Date().toISOString().split("T")[0];
const genNo = (type: MovementType) => `${TYPE_META[type].prefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

const BLANK_FORM = (type: MovementType) => ({
  movementNo: genNo(type), type, date: todayIso(), itemName: "", warehouse: "Main Warehouse",
  qty: "" as number | "", unit: "PCS", reference: "", reason: REASONS[type][0], notes: "",
});

function mapRecord(r: BusinessRecord): StockMovementRecord {
  const d = (r.data ?? {}) as Partial<StockMovementData>;
  return {
    id: r.id, createdAt: r.createdAt,
    movementNo: d.movementNo ?? r.title ?? "", type: (d.type ?? "STOCK_IN") as MovementType,
    date: d.date ?? r.date ?? "", itemName: d.itemName ?? "", warehouse: d.warehouse ?? "",
    qty: Number(d.qty ?? 0), unit: d.unit ?? "PCS", reference: d.reference ?? "",
    reason: d.reason ?? "", notes: d.notes ?? "",
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StockMovementsPage() {
  const { isMobile } = useResponsive();
  const { records, loading, create, update, remove } = useBusinessRecords("stock_movement");
  const [activeTab, setActiveTab] = useState<MovementType | "ALL">("ALL");
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<MovementType>("STOCK_IN");
  const [form, setForm] = useState(BLANK_FORM("STOCK_IN"));
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const movements = useMemo(() => records.map(mapRecord), [records]);

  const filtered = useMemo(() => {
    let list = activeTab === "ALL" ? movements : movements.filter(m => m.type === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => m.movementNo.toLowerCase().includes(q) || m.itemName.toLowerCase().includes(q) || m.reference.toLowerCase().includes(q));
    }
    return list;
  }, [movements, activeTab, search]);

  const sf = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const openNew = (type: MovementType) => {
    setFormType(type); setForm(BLANK_FORM(type)); setEditing(null); setShowForm(true);
  };
  const openEdit = (m: StockMovementRecord) => {
    setFormType(m.type);
    setForm({ movementNo: m.movementNo, type: m.type, date: m.date, itemName: m.itemName, warehouse: m.warehouse, qty: m.qty, unit: m.unit, reference: m.reference, reason: m.reason, notes: m.notes });
    setEditing(m.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.itemName.trim()) return alert("Item name is required");
    if (!form.qty) return alert("Quantity is required");
    setSaving(true);
    const payload = { category: "stock_movement", title: form.movementNo, status: form.type, date: form.date, data: { ...form } };
    editing ? await update(editing, payload) : await create(payload);
    setSaving(false); setShowForm(false);
  };

  const kpis = useMemo(() => ({
    totalIn:  movements.filter(m => m.type === "STOCK_IN").reduce((s, m) => s + m.qty, 0),
    totalOut: movements.filter(m => m.type === "STOCK_OUT").reduce((s, m) => s + m.qty, 0),
    adjustments: movements.filter(m => m.type === "ADJUSTMENT").length,
    today: movements.filter(m => m.date === todayIso()).length,
  }), [movements]);

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 5px" }}>Stock Movements</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Track all stock in, stock out, and inventory adjustments.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => openNew("STOCK_IN")} style={s.btn("#4ade80", true)}>+ Stock In</button>
          <button onClick={() => openNew("STOCK_OUT")} style={s.btn("#f87171", true)}>+ Stock Out</button>
          <button onClick={() => openNew("ADJUSTMENT")} style={s.btn("#fbbf24", true)}>+ Adjustment</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Units In",    value: kpis.totalIn,      color: "#4ade80" },
          { label: "Total Units Out",   value: kpis.totalOut,     color: "#f87171" },
          { label: "Adjustments",       value: kpis.adjustments,  color: "#fbbf24" },
          { label: "Today's Movements", value: kpis.today,        color: "#60a5fa" },
        ].map(k => (
          <div key={k.label} style={{ ...s.panel, padding: isMobile ? "12px 10px" : "18px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ ...s.panel, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              {editing ? "Edit" : "New"} {TYPE_META[formType].label}
            </h2>
            <button onClick={() => setShowForm(false)} style={s.btn("rgba(255,255,255,.08)", true)}>✕ Close</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div><label style={s.label}>Movement No</label>
              <input value={form.movementNo} onChange={e => sf("movementNo", e.target.value)} style={s.inp} /></div>
            <div><label style={s.label}>Date</label>
              <DateInput value={form.date} onChange={v => sf("date", v)} style={s.inp} /></div>
            <div><label style={s.label}>Type</label>
              <select value={form.type} onChange={e => { const t = e.target.value as MovementType; setFormType(t); sf("type", t); sf("reason", REASONS[t][0]); }} style={s.inp}>
                {(Object.keys(TYPE_META) as MovementType[]).map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
              </select></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div><label style={s.label}>Item / Product *</label>
              <input value={form.itemName} onChange={e => sf("itemName", e.target.value)} style={s.inp} placeholder="Product or SKU name" /></div>
            <div><label style={s.label}>Quantity *</label>
              <input type="number" min="0" value={form.qty} onChange={e => sf("qty", Number(e.target.value))} style={s.inp} placeholder="0" /></div>
            <div><label style={s.label}>Unit</label>
              <input value={form.unit} onChange={e => sf("unit", e.target.value)} style={s.inp} placeholder="PCS, KG, BOX…" /></div>
            <div><label style={s.label}>Warehouse</label>
              <input value={form.warehouse} onChange={e => sf("warehouse", e.target.value)} style={s.inp} placeholder="Main Warehouse" /></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div><label style={s.label}>Reason</label>
              <select value={form.reason} onChange={e => sf("reason", e.target.value)} style={s.inp}>
                {REASONS[formType].map(r => <option key={r} value={r}>{r}</option>)}
              </select></div>
            <div><label style={s.label}>Reference (PO / Invoice No)</label>
              <input value={form.reference} onChange={e => sf("reference", e.target.value)} style={s.inp} placeholder="Optional reference" /></div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={s.label}>Notes</label>
            <textarea value={form.notes} onChange={e => sf("notes", e.target.value)} style={{ ...s.inp, height: 60, resize: "vertical" }} placeholder="Additional details…" />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={s.btn(ACCENT)}>{saving ? "Saving…" : editing ? "Update" : "Save Movement"}</button>
            <button onClick={() => setShowForm(false)} style={s.btn("rgba(255,255,255,.08)")}>Cancel</button>
          </div>
        </div>
      )}

      {/* Tabs + Search */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        {(["ALL", "STOCK_IN", "STOCK_OUT", "ADJUSTMENT"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={s.tabBtn(activeTab === t)}>
            {t === "ALL" ? "All" : TYPE_META[t as MovementType].label}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item / reference…" style={{ ...s.inp, width: 220, marginLeft: "auto" }} />
      </div>

      {/* Table */}
      <div style={s.panel}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No movements found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,.03)" }}>
                <th style={s.th}>No</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Date</th>
                <th style={s.th}>Item</th>
                <th style={s.th}>Warehouse</th>
                <th style={s.th}>Qty</th>
                <th style={s.th}>Reason</th>
                <th style={s.th}>Reference</th>
                <th style={{ ...s.th, textAlign: "right" as const }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const meta = TYPE_META[m.type];
                const sign = m.type === "STOCK_IN" ? "+" : m.type === "STOCK_OUT" ? "-" : "±";
                return (
                  <tr key={m.id}>
                    <td style={{ ...s.td, fontWeight: 700, color: ACCENT }}>{m.movementNo}</td>
                    <td style={s.td}><span style={s.badge(meta)}>{meta.label}</span></td>
                    <td style={s.td}>{m.date ? new Date(m.date).toLocaleDateString("en-PK") : "—"}</td>
                    <td style={s.td}>{m.itemName}</td>
                    <td style={{ ...s.td, color: "var(--text-muted)" }}>{m.warehouse}</td>
                    <td style={{ ...s.td, fontWeight: 700, color: meta.color }}>{sign}{m.qty} {m.unit}</td>
                    <td style={{ ...s.td, color: "var(--text-muted)" }}>{m.reason}</td>
                    <td style={{ ...s.td, color: "var(--text-muted)" }}>{m.reference || "—"}</td>
                    <td style={{ ...s.td, textAlign: "right" as const }}>
                      <button onClick={() => openEdit(m)} style={{ ...s.btn("rgba(255,255,255,.08)", true), marginRight: 6 }}>Edit</button>
                      <button onClick={async () => { if (confirm("Delete this movement?")) await remove(m.id); }} style={s.btn("rgba(248,113,113,.15)", true)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
