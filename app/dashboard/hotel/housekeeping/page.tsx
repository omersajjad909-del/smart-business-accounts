"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";
const STATUS_COLOR: Record<string, string> = { pending: "#f59e0b", in_progress: "#3b82f6", completed: "#34d399" };

export default function HousekeepingPage() {
  const { records, loading, create, update } = useBusinessRecords("housekeeping_task");
  const roomStore = useBusinessRecords("hotel_room");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ room: "", task: "Cleaning", assignedTo: "", priority: "normal", notes: "" });

  const tasks = records.map(r => ({
    id: r.id,
    room: r.title,
    task: (r.data?.task as string) || "Cleaning",
    assignedTo: (r.data?.assignedTo as string) || "",
    priority: (r.data?.priority as string) || "normal",
    notes: (r.data?.notes as string) || "",
    status: r.status || "pending",
  }));

  async function save() {
    if (!form.room.trim() || !form.assignedTo.trim()) {
      setError("Room and assigned staff are required.");
      return;
    }
    if (tasks.some(t => t.room === form.room && t.task === form.task && t.status !== "completed")) {
      setError("An active housekeeping task already exists for this room and task.");
      return;
    }
    await create({ title: form.room, status: "pending", data: { task: form.task, assignedTo: form.assignedTo, priority: form.priority, notes: form.notes } });
    setShowModal(false);
    setError("");
    setForm({ room: "", task: "Cleaning", assignedTo: "", priority: "normal", notes: "" });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>🧹 Housekeeping</h1><p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Manage housekeeping tasks</p></div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Task</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "Total Tasks", val: tasks.length, color: "#f97316" }, { label: "Pending", val: tasks.filter(t => t.status === "pending").length, color: "#f59e0b" }, { label: "Completed Today", val: tasks.filter(t => t.status === "completed").length, color: "#34d399" }].map(s => (
          <div key={s.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "20px 24px" }}><div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div></div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {tasks.map(t => (
          <div key={t.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontWeight: 700 }}>Room {t.room}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>{t.task}</span>
                {t.priority === "urgent" && <span style={{ display: "inline-block", background: "rgba(239,68,68,.15)", color: "#ef4444", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 600 }}>URGENT</span>}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Assigned: {t.assignedTo} {t.notes && `· ${t.notes}`}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ display: "inline-block", background: `${STATUS_COLOR[t.status]}20`, color: STATUS_COLOR[t.status], borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{t.status.replace("_", " ")}</span>
              {t.status === "pending" && <button onClick={() => update(t.id, { status: "in_progress" })} style={{ padding: "5px 10px", background: "rgba(59,130,246,.15)", border: "1px solid rgba(59,130,246,.3)", color: "#3b82f6", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Start</button>}
              {t.status === "in_progress" && <button onClick={async () => {
                await update(t.id, { status: "completed" });
                const room = roomStore.records.find(r => r.title === t.room);
                if (room) await roomStore.update(room.id, { status: "available" });
              }} style={{ padding: "5px 10px", background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Done</button>}
            </div>
          </div>
        ))}
        {!loading && tasks.length === 0 && <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No housekeeping tasks.</div>}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 440, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>Add Task</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Room Number</label>
                <input type="text" value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Task</label>
                <select value={form.task} onChange={e => setForm(f => ({ ...f, task: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14 }}>
                  {["Cleaning", "Bed Change", "Restocking", "Deep Clean", "Maintenance Check"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Assigned To</label>
                <input type="text" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14 }}>
                  <option value="normal">Normal</option><option value="urgent">Urgent</option>
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              {error && <div style={{ color: "#fda4af", fontSize: 12, flex: 1 }}>{error}</div>}
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Task</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
