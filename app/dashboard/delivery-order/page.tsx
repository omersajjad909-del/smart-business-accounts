"use client";
import { useState, useMemo } from "react";
import { useBusinessRecords, BusinessRecord } from "@/lib/useBusinessRecords";
import DateInput from "@/app/dashboard/reports/_components/DateInput";

// ─── Types ────────────────────────────────────────────────────────────────────

type DOStatus = "DRAFT" | "PENDING" | "DISPATCHED" | "DELIVERED" | "CANCELLED";

interface DOItem { itemName: string; qty: number | ""; description: string; }

interface DeliveryOrderData {
  doNo: string; date: string; customerId: string; customerName: string;
  salesOrderRef: string; deliveryAddress: string; driverName: string;
  vehicleNo: string; warehouse: string; items: DOItem[]; notes: string;
}

interface DeliveryOrderRecord extends DeliveryOrderData {
  id: string; status: DOStatus; createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<DOStatus, { label: string; color: string; bg: string; border: string }> = {
  DRAFT:      { label: "Draft",      color: "#94a3b8", bg: "rgba(148,163,184,.12)", border: "rgba(148,163,184,.35)" },
  PENDING:    { label: "Pending",    color: "#fbbf24", bg: "rgba(251,191,36,.12)",  border: "rgba(251,191,36,.35)"  },
  DISPATCHED: { label: "Dispatched", color: "#60a5fa", bg: "rgba(96,165,250,.12)",  border: "rgba(96,165,250,.35)"  },
  DELIVERED:  { label: "Delivered",  color: "#4ade80", bg: "rgba(74,222,128,.12)",  border: "rgba(74,222,128,.35)"  },
  CANCELLED:  { label: "Cancelled",  color: "#f87171", bg: "rgba(248,113,113,.12)", border: "rgba(248,113,113,.35)" },
};

const FONT = "'Outfit','Inter',sans-serif";
const ACCENT = "#14b8a6";

const s = {
  page:  { fontFamily: FONT, color: "var(--text-primary)", padding: "28px 24px", minHeight: "100vh", background: "var(--app-bg)" },
  panel: { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14 },
  inp:   { background: "rgba(255,255,255,.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 13px", color: "var(--text-primary)", fontFamily: FONT, fontSize: 13, width: "100%", boxSizing: "border-box" as const, outline: "none" },
  label: { fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 500 } as React.CSSProperties,
  btn:   (bg: string, sm?: boolean) => ({ background: bg, border: "none", borderRadius: 8, padding: sm ? "7px 14px" : "10px 22px", color: "#fff", fontFamily: FONT, cursor: "pointer", fontSize: sm ? 12 : 13, fontWeight: 600, lineHeight: 1 } as React.CSSProperties),
  badge: (m: { color: string; bg: string; border: string }) => ({ background: m.bg, color: m.color, border: `1px solid ${m.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" as const, display: "inline-block" }),
  th:    { padding: "11px 13px", textAlign: "left" as const, fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", borderBottom: "1px solid var(--border)" },
  td:    { padding: "12px 13px", fontSize: 13, borderBottom: "1px solid var(--border)", verticalAlign: "middle" as const },
};

const todayIso = () => new Date().toISOString().split("T")[0];
const genDoNo = () => `DO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

const BLANK_ITEM: DOItem = { itemName: "", qty: "", description: "" };
const BLANK_FORM = {
  doNo: "", date: todayIso(), customerId: "", customerName: "", salesOrderRef: "",
  deliveryAddress: "", driverName: "", vehicleNo: "", warehouse: "Main Warehouse",
  items: [{ ...BLANK_ITEM }], notes: "", status: "DRAFT" as DOStatus,
};

function mapRecord(r: BusinessRecord): DeliveryOrderRecord {
  const d = (r.data ?? {}) as Partial<DeliveryOrderData>;
  return {
    id: r.id, status: (r.status as DOStatus) ?? "DRAFT", createdAt: r.createdAt,
    doNo: d.doNo ?? r.title ?? "", date: d.date ?? r.date ?? "",
    customerId: d.customerId ?? "", customerName: d.customerName ?? "",
    salesOrderRef: d.salesOrderRef ?? "", deliveryAddress: d.deliveryAddress ?? "",
    driverName: d.driverName ?? "", vehicleNo: d.vehicleNo ?? "",
    warehouse: d.warehouse ?? "Main Warehouse",
    items: Array.isArray(d.items) ? d.items : [{ ...BLANK_ITEM }],
    notes: d.notes ?? "",
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DeliveryOrderPage() {
  const { records, loading, create, update, remove } = useBusinessRecords("delivery_order");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM, doNo: genDoNo() });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<DOStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const orders = useMemo(() => records.map(mapRecord), [records]);

  const filtered = useMemo(() => {
    let list = filterStatus === "ALL" ? orders : orders.filter(o => o.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o => o.doNo.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.vehicleNo.toLowerCase().includes(q));
    }
    return list;
  }, [orders, filterStatus, search]);

  const sf = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { ...BLANK_ITEM }] }));
  const removeItem = (i: number) => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  const setItem = (i: number, k: keyof DOItem, v: string | number) =>
    setForm(p => { const items = [...p.items]; items[i] = { ...items[i], [k]: v }; return { ...p, items }; });

  const openNew = () => { setForm({ ...BLANK_FORM, doNo: genDoNo() }); setEditing(null); setShowForm(true); };
  const openEdit = (o: DeliveryOrderRecord) => {
    setForm({ doNo: o.doNo, date: o.date, customerId: o.customerId, customerName: o.customerName, salesOrderRef: o.salesOrderRef, deliveryAddress: o.deliveryAddress, driverName: o.driverName, vehicleNo: o.vehicleNo, warehouse: o.warehouse, items: o.items.length ? o.items : [{ ...BLANK_ITEM }], notes: o.notes, status: o.status });
    setEditing(o.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.customerName.trim()) return alert("Customer name is required");
    setSaving(true);
    const payload = { category: "delivery_order", title: form.doNo, status: form.status, date: form.date, data: { ...form } };
    editing ? await update(editing, payload) : await create(payload);
    setSaving(false); setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this Delivery Order?")) return;
    await remove(id);
  };

  const kpis = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === "PENDING").length,
    dispatched: orders.filter(o => o.status === "DISPATCHED").length,
    delivered: orders.filter(o => o.status === "DELIVERED").length,
  }), [orders]);

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 5px" }}>Delivery Orders</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Manage dispatch and delivery of goods to customers.</p>
        </div>
        <button onClick={openNew} style={s.btn(ACCENT)}>+ New DO</button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Orders", value: kpis.total, color: "#a78bfa" },
          { label: "Pending",      value: kpis.pending, color: "#fbbf24" },
          { label: "Dispatched",   value: kpis.dispatched, color: "#60a5fa" },
          { label: "Delivered",    value: kpis.delivered, color: "#4ade80" },
        ].map(k => (
          <div key={k.label} style={{ ...s.panel, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ ...s.panel, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{editing ? "Edit" : "New"} Delivery Order</h2>
            <button onClick={() => setShowForm(false)} style={s.btn("rgba(255,255,255,.08)", true)}>✕ Close</button>
          </div>

          {/* Row 1: DO No, Date, Status */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div><label style={s.label}>DO Number</label>
              <input value={form.doNo} onChange={e => sf("doNo", e.target.value)} style={s.inp} /></div>
            <div><label style={s.label}>Date</label>
              <DateInput value={form.date} onChange={v => sf("date", v)} style={s.inp} /></div>
            <div><label style={s.label}>Status</label>
              <select value={form.status} onChange={e => sf("status", e.target.value)} style={s.inp}>
                {(Object.keys(STATUS_META) as DOStatus[]).map(st => <option key={st} value={st}>{STATUS_META[st].label}</option>)}
              </select></div>
          </div>

          {/* Row 2: Customer, Sales Order Ref, Warehouse */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div><label style={s.label}>Customer Name *</label>
              <input value={form.customerName} onChange={e => sf("customerName", e.target.value)} style={s.inp} placeholder="Customer name" /></div>
            <div><label style={s.label}>Sales Order Ref</label>
              <input value={form.salesOrderRef} onChange={e => sf("salesOrderRef", e.target.value)} style={s.inp} placeholder="SO-2025-0001" /></div>
            <div><label style={s.label}>Dispatch Warehouse</label>
              <input value={form.warehouse} onChange={e => sf("warehouse", e.target.value)} style={s.inp} placeholder="Main Warehouse" /></div>
          </div>

          {/* Row 3: Delivery Address */}
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>Delivery Address</label>
            <textarea value={form.deliveryAddress} onChange={e => sf("deliveryAddress", e.target.value)} style={{ ...s.inp, height: 64, resize: "vertical" }} placeholder="Full delivery address..." />
          </div>

          {/* Row 4: Driver, Vehicle */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div><label style={s.label}>Driver Name</label>
              <input value={form.driverName} onChange={e => sf("driverName", e.target.value)} style={s.inp} placeholder="Driver name" /></div>
            <div><label style={s.label}>Vehicle No</label>
              <input value={form.vehicleNo} onChange={e => sf("vehicleNo", e.target.value)} style={s.inp} placeholder="e.g. ABC-123" /></div>
          </div>

          {/* Items Table */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ ...s.label, margin: 0 }}>Items</label>
              <button onClick={addItem} style={s.btn(ACCENT, true)}>+ Add Item</button>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,.03)" }}>
                    <th style={{ ...s.th, width: "38%" }}>Item / Product</th>
                    <th style={{ ...s.th, width: "15%" }}>Qty</th>
                    <th style={{ ...s.th, width: "38%" }}>Description</th>
                    <th style={{ ...s.th, width: "9%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, i) => (
                    <tr key={i}>
                      <td style={s.td}><input value={item.itemName} onChange={e => setItem(i, "itemName", e.target.value)} style={s.inp} placeholder="Product name" /></td>
                      <td style={s.td}><input type="number" min="0" value={item.qty} onChange={e => setItem(i, "qty", Number(e.target.value))} style={s.inp} placeholder="0" /></td>
                      <td style={s.td}><input value={item.description} onChange={e => setItem(i, "description", e.target.value)} style={s.inp} placeholder="Optional note" /></td>
                      <td style={s.td}>
                        {form.items.length > 1 && <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={s.label}>Notes</label>
            <textarea value={form.notes} onChange={e => sf("notes", e.target.value)} style={{ ...s.inp, height: 64, resize: "vertical" }} placeholder="Additional instructions..." />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={s.btn(ACCENT)}>{saving ? "Saving…" : editing ? "Update DO" : "Create DO"}</button>
            <button onClick={() => setShowForm(false)} style={s.btn("rgba(255,255,255,.08)")}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter + Search */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        {(["ALL", "DRAFT", "PENDING", "DISPATCHED", "DELIVERED", "CANCELLED"] as const).map(st => (
          <button key={st} onClick={() => setFilterStatus(st)} style={{ background: filterStatus === st ? ACCENT : "rgba(255,255,255,.06)", border: `1px solid ${filterStatus === st ? ACCENT : "var(--border)"}`, borderRadius: 8, padding: "6px 14px", color: filterStatus === st ? "#fff" : "var(--text-muted)", fontFamily: FONT, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            {st === "ALL" ? "All" : STATUS_META[st as DOStatus].label}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search DO / customer / vehicle…" style={{ ...s.inp, width: 240, marginLeft: "auto" }} />
      </div>

      {/* Table */}
      <div style={s.panel}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No delivery orders found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,.03)" }}>
                <th style={s.th}>DO No</th>
                <th style={s.th}>Date</th>
                <th style={s.th}>Customer</th>
                <th style={s.th}>SO Ref</th>
                <th style={s.th}>Driver</th>
                <th style={s.th}>Vehicle</th>
                <th style={s.th}>Status</th>
                <th style={{ ...s.th, textAlign: "right" as const }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const meta = STATUS_META[o.status] ?? STATUS_META.DRAFT;
                return (
                  <tr key={o.id} style={{ transition: "background .15s" }}>
                    <td style={{ ...s.td, fontWeight: 700, color: ACCENT }}>{o.doNo}</td>
                    <td style={s.td}>{o.date ? new Date(o.date).toLocaleDateString("en-PK") : "—"}</td>
                    <td style={s.td}>{o.customerName || "—"}</td>
                    <td style={{ ...s.td, color: "var(--text-muted)" }}>{o.salesOrderRef || "—"}</td>
                    <td style={s.td}>{o.driverName || "—"}</td>
                    <td style={s.td}>{o.vehicleNo || "—"}</td>
                    <td style={s.td}><span style={s.badge(meta)}>{meta.label}</span></td>
                    <td style={{ ...s.td, textAlign: "right" as const }}>
                      <button onClick={() => openEdit(o)} style={{ ...s.btn("rgba(255,255,255,.08)", true), marginRight: 6 }}>Edit</button>
                      <button onClick={() => handleDelete(o.id)} style={s.btn("rgba(248,113,113,.15)", true)}>Delete</button>
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
