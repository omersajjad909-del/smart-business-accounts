"use client";

import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { getCurrentUser } from "@/lib/auth";
import { hotelFont, hotelMuted } from "../_shared";
import { useResponsive } from "@/hooks/useResponsive";

const bg = "rgba(255,255,255,.03)";
const border = "rgba(255,255,255,.07)";
const inp: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box",
};

const STATUS_FLOW = ["pickup_pending", "washing", "ironing", "ready", "delivered"] as const;
type LaundryStatus = typeof STATUS_FLOW[number];

const STATUS_CONFIG: Record<LaundryStatus, { label: string; color: string; bg: string }> = {
  pickup_pending: { label: "Pickup Pending", color: "#f59e0b", bg: "rgba(245,158,11,.12)" },
  washing:        { label: "Washing",         color: "#60a5fa", bg: "rgba(96,165,250,.12)" },
  ironing:        { label: "Ironing",          color: "#a78bfa", bg: "rgba(167,139,250,.12)" },
  ready:          { label: "Ready",            color: "#34d399", bg: "rgba(52,211,153,.12)" },
  delivered:      { label: "Delivered",        color: "#6b7280", bg: "rgba(107,114,128,.12)" },
};

const empty = { guest: "", room: "", items: "", notes: "", amount: "" };

export default function LaundryPage() {
  const { isMobile } = useResponsive();
  const user = getCurrentUser();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "x-user-id": (user as { id?: string } | null)?.id || "",
    "x-user-role": "ADMIN",
    "x-company-id": (user as { companyId?: string } | null)?.companyId || "",
  };

  const { records, loading, create, update, remove } = useBusinessRecords("hotel_laundry");

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const items = records.map(r => ({
    id: r.id,
    guest: r.title,
    room: String(r.data?.room || ""),
    items: String(r.data?.items || ""),
    notes: String(r.data?.notes || ""),
    amount: Number(r.amount || 0),
    status: (r.status || "pickup_pending") as LaundryStatus,
    date: String(r.date || r.createdAt || "").slice(0, 10),
  }));

  const filtered = filterStatus === "all" ? items : items.filter(i => i.status === filterStatus);

  const counts = STATUS_FLOW.reduce((acc, s) => ({ ...acc, [s]: items.filter(i => i.status === s).length }), {} as Record<string, number>);

  function openAdd() { setEditId(null); setForm(empty); setShowModal(true); }
  function openEdit(i: typeof items[0]) {
    setEditId(i.id);
    setForm({ guest: i.guest, room: i.room, items: i.items, notes: i.notes, amount: String(i.amount) });
    setShowModal(true);
  }

  async function save() {
    if (!form.guest.trim() || !form.room.trim()) return;
    if (editId) {
      await update(editId, { title: form.guest.trim(), amount: Number(form.amount) || 0, data: { room: form.room.trim(), items: form.items.trim(), notes: form.notes.trim() } });
    } else {
      await create({ title: form.guest.trim(), status: "pickup_pending", amount: Number(form.amount) || 0, data: { room: form.room.trim(), items: form.items.trim(), notes: form.notes.trim() } });
    }
    setShowModal(false);
  }

  async function advance(id: string, currentStatus: LaundryStatus) {
    const idx = STATUS_FLOW.indexOf(currentStatus);
    if (idx < STATUS_FLOW.length - 1) {
      await update(id, { status: STATUS_FLOW[idx + 1] });
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: isMobile ? "15px 14px" : "28px 32px", color: "#fff", fontFamily: hotelFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800 }}>🧺 Laundry Management</h1>
          <p style={{ margin: 0, fontSize: 13, color: hotelMuted }}>Track guest laundry from pickup to delivery</p>
        </div>
        <button onClick={openAdd} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Add Laundry Order
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 24 }}>
        {STATUS_FLOW.map(s => {
          const c = STATUS_CONFIG[s];
          return (
            <div key={s} onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
              style={{ background: filterStatus === s ? c.bg : bg, border: `1px solid ${filterStatus === s ? c.color.replace(")", ",.35)").replace("rgb(", "rgba(") : border}`, borderRadius: 12, padding: isMobile ? "12px 10px" : "14px 16px", cursor: "pointer" }}>
              <div style={{ fontSize: 11, color: c.color, fontWeight: 700, marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{counts[s] || 0}</div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Guest", "Room", "Items", "Amount", "Status", "Date", "Actions"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: hotelMuted, borderBottom: `1px solid ${border}`, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: hotelMuted }}>Loading…</td></tr>}
            {!loading && filtered.map(item => {
              const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.pickup_pending;
              const isLast = item.status === "delivered";
              return (
                <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{item.guest}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: "rgba(99,102,241,.12)", color: "#a5b4fc", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>Room {item.room}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: hotelMuted, maxWidth: 180 }}>{item.items || "—"}</td>
                  <td style={{ padding: "12px 16px", color: "#34d399", fontWeight: 600 }}>{item.amount ? `Rs. ${item.amount.toLocaleString()}` : "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: sc.bg, color: sc.color, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{sc.label}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: hotelMuted }}>{item.date}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {!isLast && (
                        <button onClick={() => advance(item.id, item.status)}
                          style={{ padding: "4px 10px", background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                          → Next
                        </button>
                      )}
                      <button onClick={() => openEdit(item)}
                        style={{ padding: "4px 10px", background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.3)", color: "#818cf8", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                        Edit
                      </button>
                      <button onClick={() => remove(item.id)}
                        style={{ padding: "4px 10px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: hotelMuted }}>No laundry orders{filterStatus !== "all" ? ` with status "${filterStatus}"` : ""}.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(6px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 460, fontFamily: hotelFont }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{editId ? "✏️ Edit Order" : "🧺 New Laundry Order"}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: hotelMuted, fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: hotelMuted, marginBottom: 6 }}>Guest Name *</label>
                <input style={inp} value={form.guest} onChange={e => setForm(f => ({ ...f, guest: e.target.value }))} autoFocus />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: hotelMuted, marginBottom: 6 }}>Room No. *</label>
                <input style={inp} value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: hotelMuted, marginBottom: 6 }}>Items (e.g. 2 shirts, 1 suit)</label>
                <input style={inp} value={form.items} onChange={e => setForm(f => ({ ...f, items: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: hotelMuted, marginBottom: 6 }}>Charges (Rs.)</label>
                <input type="number" style={inp} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: hotelMuted, marginBottom: 6 }}>Notes</label>
                <input style={inp} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {editId ? "Save Changes" : "Add Order"}
              </button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 20px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: hotelMuted, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
