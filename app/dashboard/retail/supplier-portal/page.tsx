"use client";
import { useState, useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { confirmToast } from "@/lib/toast-feedback";
import toast from "react-hot-toast";

const F = "'Outfit','Inter',sans-serif";
const BG = "rgba(255,255,255,0.03)";
const BD = "rgba(255,255,255,0.07)";
const inp: React.CSSProperties = {
  fontFamily: F, padding: "9px 12px", background: BG,
  border: `1px solid ${BD}`, borderRadius: 8,
  color: "var(--text-primary)", fontSize: 13, width: "100%", boxSizing: "border-box",
};

type PortalStatus = "ACTIVE" | "PENDING" | "SUSPENDED";
type OrderStatus  = "SENT" | "ACKNOWLEDGED" | "DISPATCHED" | "RECEIVED" | "CANCELLED";

const PORTAL_META: Record<PortalStatus, { label: string; color: string; bg: string }> = {
  ACTIVE:    { label: "Active",    color: "#10b981", bg: "rgba(16,185,129,.12)" },
  PENDING:   { label: "Pending",   color: "#f59e0b", bg: "rgba(245,158,11,.12)" },
  SUSPENDED: { label: "Suspended", color: "#ef4444", bg: "rgba(239,68,68,.12)"  },
};
const ORDER_META: Record<OrderStatus, { label: string; color: string }> = {
  SENT:         { label: "Sent",         color: "#6366f1" },
  ACKNOWLEDGED: { label: "Acknowledged", color: "#3b82f6" },
  DISPATCHED:   { label: "Dispatched",   color: "#f59e0b" },
  RECEIVED:     { label: "Received",     color: "#10b981" },
  CANCELLED:    { label: "Cancelled",    color: "#ef4444" },
};

const BLANK_SUP  = { name: "", email: "", phone: "", category: "", creditDays: 30, portalNote: "" };
const BLANK_ORD  = { supplierId: "", items: "", qty: "", amount: 0, expectedDate: "", notes: "" };

export default function SupplierPortalPage() {
  const suppliers = useBusinessRecords("portal_supplier");
  const orders    = useBusinessRecords("portal_order");
  const [view, setView]             = useState<"suppliers" | "orders">("suppliers");
  const [showSupModal, setShowSup]  = useState(false);
  const [showOrdModal, setShowOrd]  = useState(false);
  const [editSupId, setEditSupId]   = useState<string | null>(null);
  const [supForm, setSupForm]       = useState({ ...BLANK_SUP });
  const [ordForm, setOrdForm]       = useState({ ...BLANK_ORD });
  const [saving, setSaving]         = useState(false);

  const supplierList = useMemo(() => suppliers.records.map(r => ({
    id:          r.id,
    name:        r.title,
    email:       String(r.data?.email       || ""),
    phone:       String(r.data?.phone       || ""),
    category:    String(r.data?.category    || "General"),
    creditDays:  Number(r.data?.creditDays  || 30),
    portalNote:  String(r.data?.portalNote  || ""),
    status:      (r.status || "PENDING") as PortalStatus,
    totalOrders: Number(r.data?.totalOrders || 0),
    lastOrder:   r.data?.lastOrder ? String(r.data.lastOrder) : null,
  })), [suppliers.records]);

  const orderList = useMemo(() => orders.records.map(r => {
    const sup = supplierList.find(s => s.id === r.data?.supplierId);
    return {
      id:           r.id,
      ref:          r.title,
      supplierId:   String(r.data?.supplierId   || ""),
      supplierName: sup?.name || String(r.data?.supplierName || ""),
      items:        String(r.data?.items        || ""),
      qty:          String(r.data?.qty          || ""),
      amount:       Number(r.data?.amount       || 0),
      expectedDate: String(r.data?.expectedDate || ""),
      notes:        String(r.data?.notes        || ""),
      status:       (r.status || "SENT") as OrderStatus,
      date:         r.date || r.createdAt.slice(0, 10),
    };
  }), [orders.records, supplierList]);

  function openCreateSup() { setEditSupId(null); setSupForm({ ...BLANK_SUP }); setShowSup(true); }
  function openEditSup(s: typeof supplierList[0]) {
    setEditSupId(s.id);
    setSupForm({ name: s.name, email: s.email, phone: s.phone, category: s.category, creditDays: s.creditDays, portalNote: s.portalNote });
    setShowSup(true);
  }
  function closeSup() { setShowSup(false); setEditSupId(null); setSupForm({ ...BLANK_SUP }); }

  async function saveSup() {
    if (!supForm.name.trim()) { toast.error("Supplier name required"); return; }
    setSaving(true);
    try {
      if (editSupId) {
        await suppliers.update(editSupId, { title: supForm.name, data: { ...supForm } });
      } else {
        await suppliers.create({ title: supForm.name, status: "PENDING", data: { ...supForm, totalOrders: 0 } });
      }
      closeSup();
    } finally { setSaving(false); }
  }

  async function activateSup(id: string, cur: PortalStatus) {
    const next: PortalStatus = cur === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    await suppliers.setStatus(id, next);
    toast.success(next === "ACTIVE" ? "Supplier portal activated" : "Supplier suspended");
  }

  async function deleteSup(id: string, name: string) {
    if (await confirmToast(`Remove ${name} from portal?`)) { await suppliers.remove(id); }
  }

  async function saveOrder() {
    if (!ordForm.supplierId || !ordForm.items.trim()) { toast.error("Supplier and items required"); return; }
    setSaving(true);
    try {
      const ref = `PO-${String(Date.now()).slice(-5)}`;
      await orders.create({
        title: ref, status: "SENT",
        date: new Date().toISOString().slice(0, 10),
        data: { ...ordForm, supplierName: supplierList.find(s => s.id === ordForm.supplierId)?.name || "" },
      });
      setShowOrd(false); setOrdForm({ ...BLANK_ORD });
    } finally { setSaving(false); }
  }

  async function advanceOrder(id: string, cur: OrderStatus) {
    const flow: OrderStatus[] = ["SENT","ACKNOWLEDGED","DISPATCHED","RECEIVED"];
    const idx = flow.indexOf(cur);
    if (idx === -1 || idx >= flow.length - 1) return;
    await orders.update(id, { status: flow[idx + 1] });
    toast.success(`Order marked ${ORDER_META[flow[idx+1]].label}`);
  }

  async function cancelOrder(id: string) {
    if (await confirmToast("Cancel this order?")) { await orders.update(id, { status: "CANCELLED" }); }
  }

  const activeCount = supplierList.filter(s => s.status === "ACTIVE").length;
  const pendingOrds = orderList.filter(o => o.status !== "RECEIVED" && o.status !== "CANCELLED").length;
  const totalSpend  = orderList.filter(o => o.status === "RECEIVED").reduce((a, o) => a + o.amount, 0);

  return (
    <div style={{ fontFamily: F, minHeight: "100vh", padding: "28px 24px", color: "var(--text-primary)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Supplier Portal</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Manage supplier relationships, send purchase orders and track delivery status.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowOrd(true)} style={{ padding: "9px 16px", borderRadius: 10, background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.3)", color: "#a5b4fc", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: F }}>
            + New Order
          </button>
          <button onClick={openCreateSup} style={{ padding: "9px 18px", borderRadius: 10, background: "linear-gradient(135deg,#ec4899,#db2777)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: F }}>
            + Add Supplier
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Suppliers",  value: supplierList.length, color: "#a78bfa" },
          { label: "Active Portal",    value: activeCount,         color: "#10b981" },
          { label: "Pending Orders",   value: pendingOrds,         color: "#f59e0b" },
          { label: "Total Received",   value: `Rs. ${(totalSpend/1000).toFixed(0)}K`, color: "#38bdf8" },
        ].map(k => (
          <div key={k.label} style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {(["suppliers","orders"] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{ padding: "7px 18px", borderRadius: 9, fontFamily: F, fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: view === v ? "rgba(236,72,153,.15)" : BG,
            border: `1px solid ${view === v ? "rgba(236,72,153,.35)" : BD}`,
            color: view === v ? "#f9a8d4" : "var(--text-muted)" }}>
            {v === "suppliers" ? `Suppliers (${supplierList.length})` : `Orders (${orderList.length})`}
          </button>
        ))}
      </div>

      {/* Suppliers table */}
      {view === "suppliers" && (
        <div style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,.02)" }}>
                {["Supplier","Category","Email","Phone","Credit Days","Orders","Status","Actions"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textAlign: "left", textTransform: "uppercase", letterSpacing: .5, borderBottom: `1px solid ${BD}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.loading ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
              ) : supplierList.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No suppliers yet. Click "+ Add Supplier" to get started.</td></tr>
              ) : supplierList.map(s => {
                const pm = PORTAL_META[s.status];
                return (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${BD}` }}>
                    <td style={{ padding: "11px 14px", fontWeight: 700, fontSize: 14 }}>{s.name}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--text-muted)" }}>{s.category}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12 }}>{s.email || "—"}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12 }}>{s.phone || "—"}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600 }}>{s.creditDays}d</td>
                    <td style={{ padding: "11px 14px", fontSize: 13 }}>{s.totalOrders}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: pm.bg, color: pm.color }}>{pm.label}</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => activateSup(s.id, s.status)} style={{ padding: "4px 10px", fontSize: 11, fontWeight: 700, borderRadius: 6, border: "none", cursor: "pointer", background: s.status === "ACTIVE" ? "rgba(239,68,68,.1)" : "rgba(16,185,129,.12)", color: s.status === "ACTIVE" ? "#f87171" : "#34d399" }}>
                          {s.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </button>
                        <button onClick={() => openEditSup(s)} style={{ padding: "4px 10px", fontSize: 11, fontWeight: 700, borderRadius: 6, border: `1px solid ${BD}`, background: "none", cursor: "pointer", color: "var(--text-muted)" }}>Edit</button>
                        <button onClick={() => deleteSup(s.id, s.name)} style={{ padding: "4px 10px", fontSize: 11, fontWeight: 700, borderRadius: 6, border: "none", background: "rgba(239,68,68,.1)", color: "#f87171", cursor: "pointer" }}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Orders table */}
      {view === "orders" && (
        <div style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,.02)" }}>
                {["PO Ref","Supplier","Items","Amount","Expected","Date","Status","Actions"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textAlign: "left", textTransform: "uppercase", letterSpacing: .5, borderBottom: `1px solid ${BD}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.loading ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
              ) : orderList.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No orders yet. Click "+ New Order" to create one.</td></tr>
              ) : orderList.map(o => {
                const om = ORDER_META[o.status];
                const canAdvance = o.status !== "RECEIVED" && o.status !== "CANCELLED";
                return (
                  <tr key={o.id} style={{ borderBottom: `1px solid ${BD}` }}>
                    <td style={{ padding: "11px 14px", fontWeight: 700, fontSize: 12, color: "#a78bfa" }}>{o.ref}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13 }}>{o.supplierName}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--text-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.items}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600 }}>Rs. {o.amount.toLocaleString()}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--text-muted)" }}>{o.expectedDate || "—"}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--text-muted)" }}>{o.date}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${om.color}18`, color: om.color }}>{om.label}</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {canAdvance && (
                          <button onClick={() => advanceOrder(o.id, o.status)} style={{ padding: "4px 10px", fontSize: 11, fontWeight: 700, borderRadius: 6, border: "none", cursor: "pointer", background: "rgba(59,130,246,.14)", color: "#60a5fa" }}>
                            → Next
                          </button>
                        )}
                        {canAdvance && (
                          <button onClick={() => cancelOrder(o.id)} style={{ padding: "4px 10px", fontSize: 11, fontWeight: 700, borderRadius: 6, border: "none", background: "rgba(239,68,68,.1)", color: "#f87171", cursor: "pointer" }}>Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Supplier modal */}
      {showSupModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--panel-bg,#1a1d2e)", border: `1px solid ${BD}`, borderRadius: 18, padding: 28, width: 480 }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 800 }}>{editSupId ? "Edit Supplier" : "Add Supplier"}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { label: "Supplier Name *", key: "name"  as const, span: true  },
                { label: "Category",        key: "category" as const, span: false },
                { label: "Email",           key: "email"    as const, span: false },
                { label: "Phone",           key: "phone"    as const, span: false },
                { label: "Portal Note",     key: "portalNote" as const, span: true },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.span ? "1 / -1" : "auto" }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 5 }}>{f.label}</label>
                  <input value={supForm[f.key] as string} onChange={e => setSupForm(p => ({ ...p, [f.key]: e.target.value }))} style={inp} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 5 }}>Credit Days</label>
                <input type="number" value={supForm.creditDays} onChange={e => setSupForm(p => ({ ...p, creditDays: Number(e.target.value) }))} style={inp} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
              <button onClick={closeSup} style={{ padding: "9px 20px", borderRadius: 9, border: `1px solid ${BD}`, background: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: F, fontSize: 13 }}>Cancel</button>
              <button onClick={saveSup} disabled={saving} style={{ padding: "9px 22px", borderRadius: 9, background: "linear-gradient(135deg,#ec4899,#db2777)", border: "none", color: "#fff", cursor: "pointer", fontFamily: F, fontSize: 13, fontWeight: 700 }}>
                {saving ? "Saving…" : editSupId ? "Update" : "Add Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order modal */}
      {showOrdModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--panel-bg,#1a1d2e)", border: `1px solid ${BD}`, borderRadius: 18, padding: 28, width: 480 }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 800 }}>New Purchase Order</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 5 }}>Supplier *</label>
                <select value={ordForm.supplierId} onChange={e => setOrdForm(p => ({ ...p, supplierId: e.target.value }))} style={inp}>
                  <option value="">— Select Supplier —</option>
                  {supplierList.filter(s => s.status === "ACTIVE").map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 5 }}>Items / Description *</label>
                <input value={ordForm.items} onChange={e => setOrdForm(p => ({ ...p, items: e.target.value }))} placeholder="e.g. 100x T-Shirts, 50x Jeans" style={inp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 5 }}>Order Amount (Rs.)</label>
                <input type="number" value={ordForm.amount} onChange={e => setOrdForm(p => ({ ...p, amount: Number(e.target.value) }))} style={inp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 5 }}>Expected Delivery</label>
                <input type="date" value={ordForm.expectedDate} onChange={e => setOrdForm(p => ({ ...p, expectedDate: e.target.value }))} style={inp} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 5 }}>Notes</label>
                <input value={ordForm.notes} onChange={e => setOrdForm(p => ({ ...p, notes: e.target.value }))} placeholder="Special instructions" style={inp} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowOrd(false); setOrdForm({ ...BLANK_ORD }); }} style={{ padding: "9px 20px", borderRadius: 9, border: `1px solid ${BD}`, background: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: F, fontSize: 13 }}>Cancel</button>
              <button onClick={saveOrder} disabled={saving} style={{ padding: "9px 22px", borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "#fff", cursor: "pointer", fontFamily: F, fontSize: 13, fontWeight: 700 }}>
                {saving ? "Saving…" : "Send Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
