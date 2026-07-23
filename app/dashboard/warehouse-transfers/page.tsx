"use client";
import { useState, useMemo } from "react";
import { useBusinessRecords, BusinessRecord } from "@/lib/useBusinessRecords";
import DateInput from "@/app/dashboard/reports/_components/DateInput";
import { useResponsive } from "@/hooks/useResponsive";

// ─── Types ────────────────────────────────────────────────────────────────────

type TransferStatus = "DRAFT" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";

interface TransferItem { itemName: string; qty: number | ""; unit: string; notes: string; }

interface WarehouseTransferData {
  transferNo: string; date: string; fromWarehouse: string; toWarehouse: string;
  items: TransferItem[]; reason: string; notes: string;
}

interface WarehouseTransferRecord extends WarehouseTransferData {
  id: string; status: TransferStatus; createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<TransferStatus, { label: string; color: string; bg: string; border: string }> = {
  DRAFT:      { label: "Draft",      color: "#94a3b8", bg: "rgba(148,163,184,.12)", border: "rgba(148,163,184,.35)" },
  IN_TRANSIT: { label: "In Transit", color: "#60a5fa", bg: "rgba(96,165,250,.12)",  border: "rgba(96,165,250,.35)"  },
  COMPLETED:  { label: "Completed",  color: "#4ade80", bg: "rgba(74,222,128,.12)",  border: "rgba(74,222,128,.35)"  },
  CANCELLED:  { label: "Cancelled",  color: "#f87171", bg: "rgba(248,113,113,.12)", border: "rgba(248,113,113,.35)" },
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
};

const todayIso = () => new Date().toISOString().split("T")[0];
const genNo = () => `TRF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
const BLANK_ITEM: TransferItem = { itemName: "", qty: "", unit: "PCS", notes: "" };
const BLANK_FORM = { transferNo: genNo(), date: todayIso(), fromWarehouse: "", toWarehouse: "", items: [{ ...BLANK_ITEM }], reason: "", notes: "", status: "DRAFT" as TransferStatus };

function mapRecord(r: BusinessRecord): WarehouseTransferRecord {
  const d = (r.data ?? {}) as Partial<WarehouseTransferData>;
  return {
    id: r.id, status: (r.status as TransferStatus) ?? "DRAFT", createdAt: r.createdAt,
    transferNo: d.transferNo ?? r.title ?? "", date: d.date ?? r.date ?? "",
    fromWarehouse: d.fromWarehouse ?? "", toWarehouse: d.toWarehouse ?? "",
    items: Array.isArray(d.items) ? d.items : [{ ...BLANK_ITEM }],
    reason: d.reason ?? "", notes: d.notes ?? "",
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WarehouseTransfersPage() {
  const { isMobile } = useResponsive();
  const { records, loading, create, update, remove } = useBusinessRecords("warehouse_transfer");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TransferStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const transfers = useMemo(() => records.map(mapRecord), [records]);

  const filtered = useMemo(() => {
    let list = filterStatus === "ALL" ? transfers : transfers.filter(t => t.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.transferNo.toLowerCase().includes(q) || t.fromWarehouse.toLowerCase().includes(q) || t.toWarehouse.toLowerCase().includes(q));
    }
    return list;
  }, [transfers, filterStatus, search]);

  const sf = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));
  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { ...BLANK_ITEM }] }));
  const removeItem = (i: number) => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  const setItem = (i: number, k: keyof TransferItem, v: string | number) =>
    setForm(p => { const items = [...p.items]; items[i] = { ...items[i], [k]: v }; return { ...p, items }; });

  const openNew = () => { setForm({ ...BLANK_FORM, transferNo: genNo() }); setEditing(null); setShowForm(true); };
  const openEdit = (t: WarehouseTransferRecord) => {
    setForm({ transferNo: t.transferNo, date: t.date, fromWarehouse: t.fromWarehouse, toWarehouse: t.toWarehouse, items: t.items.length ? t.items : [{ ...BLANK_ITEM }], reason: t.reason, notes: t.notes, status: t.status });
    setEditing(t.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.fromWarehouse.trim() || !form.toWarehouse.trim()) return alert("Both warehouses are required");
    if (form.fromWarehouse === form.toWarehouse) return alert("From and To warehouses must be different");
    setSaving(true);
    const payload = { category: "warehouse_transfer", title: form.transferNo, status: form.status, date: form.date, data: { ...form } };
    editing ? await update(editing, payload) : await create(payload);
    setSaving(false); setShowForm(false);
  };

  const totalItems = useMemo(() => transfers.reduce((sum, t) => sum + t.items.length, 0), [transfers]);

  const kpis = useMemo(() => ({
    total:     transfers.length,
    inTransit: transfers.filter(t => t.status === "IN_TRANSIT").length,
    completed: transfers.filter(t => t.status === "COMPLETED").length,
    totalItems,
  }), [transfers, totalItems]);

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 5px" }}>Warehouse Transfers</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Move stock between warehouses and branches with full traceability.</p>
        </div>
        <button onClick={openNew} style={s.btn(ACCENT)}>+ New Transfer</button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Transfers",  value: kpis.total,      color: "#a78bfa" },
          { label: "In Transit",       value: kpis.inTransit,  color: "#60a5fa" },
          { label: "Completed",        value: kpis.completed,  color: "#4ade80" },
          { label: "Total Line Items", value: kpis.totalItems, color: "#fbbf24" },
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
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{editing ? "Edit" : "New"} Warehouse Transfer</h2>
            <button onClick={() => setShowForm(false)} style={s.btn("rgba(255,255,255,.08)", true)}>✕ Close</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div><label style={s.label}>Transfer No</label>
              <input value={form.transferNo} onChange={e => sf("transferNo", e.target.value)} style={s.inp} /></div>
            <div><label style={s.label}>Date</label>
              <DateInput value={form.date} onChange={v => sf("date", v)} style={s.inp} /></div>
            <div><label style={s.label}>From Warehouse *</label>
              <input value={form.fromWarehouse} onChange={e => sf("fromWarehouse", e.target.value)} style={s.inp} placeholder="e.g. Main Warehouse" /></div>
            <div><label style={s.label}>To Warehouse *</label>
              <input value={form.toWarehouse} onChange={e => sf("toWarehouse", e.target.value)} style={s.inp} placeholder="e.g. Branch Warehouse" /></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div><label style={s.label}>Status</label>
              <select value={form.status} onChange={e => sf("status", e.target.value)} style={s.inp}>
                {(Object.keys(STATUS_META) as TransferStatus[]).map(st => <option key={st} value={st}>{STATUS_META[st].label}</option>)}
              </select></div>
            <div><label style={s.label}>Reason for Transfer</label>
              <input value={form.reason} onChange={e => sf("reason", e.target.value)} style={s.inp} placeholder="e.g. Restock branch, excess stock" /></div>
          </div>

          {/* Items */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ ...s.label, margin: 0 }}>Items to Transfer</label>
              <button onClick={addItem} style={s.btn(ACCENT, true)}>+ Add Item</button>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,.03)" }}>
                    <th style={{ ...s.th, width: "40%" }}>Item / Product</th>
                    <th style={{ ...s.th, width: "18%" }}>Qty</th>
                    <th style={{ ...s.th, width: "14%" }}>Unit</th>
                    <th style={{ ...s.th, width: "22%" }}>Notes</th>
                    <th style={{ ...s.th, width: "6%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, i) => (
                    <tr key={i}>
                      <td style={s.td}><input value={item.itemName} onChange={e => setItem(i, "itemName", e.target.value)} style={s.inp} placeholder="Product name" /></td>
                      <td style={s.td}><input type="number" min="0" value={item.qty} onChange={e => setItem(i, "qty", Number(e.target.value))} style={s.inp} /></td>
                      <td style={s.td}><input value={item.unit} onChange={e => setItem(i, "unit", e.target.value)} style={s.inp} placeholder="PCS" /></td>
                      <td style={s.td}><input value={item.notes} onChange={e => setItem(i, "notes", e.target.value)} style={s.inp} placeholder="Optional" /></td>
                      <td style={s.td}>{form.items.length > 1 && <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={s.label}>Notes</label>
            <textarea value={form.notes} onChange={e => sf("notes", e.target.value)} style={{ ...s.inp, height: 60, resize: "vertical" }} placeholder="Additional instructions…" />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={s.btn(ACCENT)}>{saving ? "Saving…" : editing ? "Update Transfer" : "Create Transfer"}</button>
            <button onClick={() => setShowForm(false)} style={s.btn("rgba(255,255,255,.08)")}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter + Search */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        {(["ALL", ...Object.keys(STATUS_META)] as const).map(st => (
          <button key={st} onClick={() => setFilterStatus(st as TransferStatus | "ALL")} style={{ background: filterStatus === st ? ACCENT : "rgba(255,255,255,.06)", border: `1px solid ${filterStatus === st ? ACCENT : "var(--border)"}`, borderRadius: 8, padding: "6px 14px", color: filterStatus === st ? "#fff" : "var(--text-muted)", fontFamily: FONT, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            {st === "ALL" ? "All" : STATUS_META[st as TransferStatus].label}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transfer no / warehouse…" style={{ ...s.inp, width: 240, marginLeft: "auto" }} />
      </div>

      {/* Table */}
      <div style={s.panel}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No transfers found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,.03)" }}>
                <th style={s.th}>Transfer No</th>
                <th style={s.th}>Date</th>
                <th style={s.th}>From</th>
                <th style={s.th}>To</th>
                <th style={s.th}>Items</th>
                <th style={s.th}>Reason</th>
                <th style={s.th}>Status</th>
                <th style={{ ...s.th, textAlign: "right" as const }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const meta = STATUS_META[t.status] ?? STATUS_META.DRAFT;
                const totalQty = t.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
                return (
                  <tr key={t.id}>
                    <td style={{ ...s.td, fontWeight: 700, color: ACCENT }}>{t.transferNo}</td>
                    <td style={s.td}>{t.date ? new Date(t.date).toLocaleDateString("en-PK") : "—"}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{t.fromWarehouse || "—"}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{t.toWarehouse || "—"}</td>
                    <td style={{ ...s.td, color: "var(--text-muted)" }}>{t.items.length} line(s) · {totalQty} units</td>
                    <td style={{ ...s.td, color: "var(--text-muted)" }}>{t.reason || "—"}</td>
                    <td style={s.td}><span style={s.badge(meta)}>{meta.label}</span></td>
                    <td style={{ ...s.td, textAlign: "right" as const }}>
                      <button onClick={() => openEdit(t)} style={{ ...s.btn("rgba(255,255,255,.08)", true), marginRight: 6 }}>Edit</button>
                      <button onClick={async () => { if (confirm("Delete this transfer?")) await remove(t.id); }} style={s.btn("rgba(248,113,113,.15)", true)}>Delete</button>
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
