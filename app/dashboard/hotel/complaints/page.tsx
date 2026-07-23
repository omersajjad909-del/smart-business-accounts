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

const PRIORITIES = { low: { label: "Low", color: "#34d399" }, medium: { label: "Medium", color: "#f59e0b" }, high: { label: "High", color: "#f87171" } };
const STATUSES = {
  open:        { label: "Open",        color: "#f87171", bg: "rgba(239,68,68,.12)" },
  in_progress: { label: "In Progress", color: "#f59e0b", bg: "rgba(245,158,11,.12)" },
  resolved:    { label: "Resolved",    color: "#34d399", bg: "rgba(52,211,153,.12)" },
};
const CATEGORIES = ["Room Issue", "Food & Beverage", "Service", "Noise", "Maintenance", "Billing", "Other"];

const empty = { title: "", guestName: "", room: "", category: "Room Issue", priority: "medium", notes: "" };

export default function ComplaintsPage() {
  const { isMobile } = useResponsive();
  const user = getCurrentUser();

  const { records, loading, create, update, remove } = useBusinessRecords("hotel_complaint");

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const complaints = records.map(r => ({
    id: r.id,
    title: r.title,
    guestName: String(r.data?.guestName || ""),
    room: String(r.data?.room || ""),
    category: String(r.data?.category || "Room Issue"),
    priority: String(r.data?.priority || "medium") as keyof typeof PRIORITIES,
    notes: String(r.data?.notes || ""),
    status: (r.status || "open") as keyof typeof STATUSES,
    date: String(r.date || r.createdAt || "").slice(0, 10),
  }));

  const filtered = filterStatus === "all" ? complaints : complaints.filter(c => c.status === filterStatus);
  const openCount = complaints.filter(c => c.status === "open").length;
  const inProgressCount = complaints.filter(c => c.status === "in_progress").length;
  const resolvedCount = complaints.filter(c => c.status === "resolved").length;

  function openAdd() { setEditId(null); setForm(empty); setShowModal(true); }
  function openEdit(c: typeof complaints[0]) {
    setEditId(c.id);
    setForm({ title: c.title, guestName: c.guestName, room: c.room, category: c.category, priority: c.priority, notes: c.notes });
    setShowModal(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    const data = { guestName: form.guestName.trim(), room: form.room.trim(), category: form.category, priority: form.priority, notes: form.notes.trim() };
    if (editId) {
      await update(editId, { title: form.title.trim(), data });
    } else {
      await create({ title: form.title.trim(), status: "open", data });
    }
    setShowModal(false);
  }

  async function changeStatus(id: string, status: string) {
    await update(id, { status });
  }

  return (
    <div style={{ minHeight: "100vh", padding: isMobile ? "15px 14px" : "28px 32px", color: "#fff", fontFamily: hotelFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800 }}>⚠️ Guest Complaints</h1>
          <p style={{ margin: 0, fontSize: 13, color: hotelMuted }}>Track and resolve guest complaints and issues</p>
        </div>
        <button onClick={openAdd} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Log Complaint
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Open",        value: openCount,       ...STATUSES.open },
          { label: "In Progress", value: inProgressCount, ...STATUSES.in_progress },
          { label: "Resolved",    value: resolvedCount,   ...STATUSES.resolved },
        ].map(s => (
          <div key={s.label} onClick={() => setFilterStatus(filterStatus === s.label.toLowerCase().replace(" ", "_") ? "all" : s.label.toLowerCase().replace(" ", "_"))}
            style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "12px 10px" : "18px 20px", cursor: "pointer" }}>
            <div style={{ fontSize: 12, color: s.color, fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {["all", "open", "in_progress", "resolved"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${filterStatus === s ? "#f97316" : border}`, background: filterStatus === s ? "rgba(249,115,22,.12)" : "transparent", color: filterStatus === s ? "#f97316" : hotelMuted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Complaint", "Guest", "Room", "Category", "Priority", "Status", "Date", "Actions"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: hotelMuted, borderBottom: `1px solid ${border}`, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: hotelMuted }}>Loading…</td></tr>}
            {!loading && filtered.map(c => {
              const pc = PRIORITIES[c.priority] || PRIORITIES.medium;
              const sc = STATUSES[c.status] || STATUSES.open;
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, maxWidth: 180 }}>{c.title}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13 }}>{c.guestName || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {c.room && <span style={{ background: "rgba(99,102,241,.12)", color: "#a5b4fc", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>Room {c.room}</span>}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: hotelMuted }}>{c.category}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ color: pc.color, fontWeight: 700, fontSize: 12 }}>● {pc.label}</span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: sc.bg, color: sc.color, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{sc.label}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: hotelMuted }}>{c.date}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {c.status === "open" && (
                        <button onClick={() => changeStatus(c.id, "in_progress")}
                          style={{ padding: "4px 8px", background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)", color: "#f59e0b", borderRadius: 6, fontSize: 10, cursor: "pointer", fontWeight: 600 }}>
                          In Progress
                        </button>
                      )}
                      {c.status === "in_progress" && (
                        <button onClick={() => changeStatus(c.id, "resolved")}
                          style={{ padding: "4px 8px", background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", borderRadius: 6, fontSize: 10, cursor: "pointer", fontWeight: 600 }}>
                          ✓ Resolve
                        </button>
                      )}
                      <button onClick={() => openEdit(c)}
                        style={{ padding: "4px 8px", background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.3)", color: "#818cf8", borderRadius: 6, fontSize: 10, cursor: "pointer" }}>
                        Edit
                      </button>
                      <button onClick={() => remove(c.id)}
                        style={{ padding: "4px 8px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171", borderRadius: 6, fontSize: 10, cursor: "pointer" }}>
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: hotelMuted }}>No complaints logged.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(6px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 500, fontFamily: hotelFont }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{editId ? "✏️ Edit Complaint" : "⚠️ Log Complaint"}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: hotelMuted, fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: hotelMuted, marginBottom: 6 }}>Complaint Summary *</label>
                <input style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus placeholder="e.g. AC not working in room" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: hotelMuted, marginBottom: 6 }}>Guest Name</label>
                <input style={inp} value={form.guestName} onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: hotelMuted, marginBottom: 6 }}>Room No.</label>
                <input style={inp} value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: hotelMuted, marginBottom: 6 }}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  style={{ ...inp, background: "#1e2535", cursor: "pointer" }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: hotelMuted, marginBottom: 6 }}>Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  style={{ ...inp, background: "#1e2535", cursor: "pointer" }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: hotelMuted, marginBottom: 6 }}>Details / Notes</label>
                <input style={inp} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Describe the issue in detail..." />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {editId ? "Save Changes" : "Log Complaint"}
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
