"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SchedulePage() {
  const { records, loading, create, remove } = useBusinessRecords("class_period");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ subject: "", teacher: "", class: "", room: "", day: "Monday", time: "08:00", period: 1 });

  const periods = records.map(r => ({
    id: r.id,
    subject: r.title,
    teacher: (r.data?.teacher as string) || "",
    class: (r.data?.class as string) || "",
    room: (r.data?.room as string) || "",
    day: (r.data?.day as string) || "Monday",
    time: (r.data?.time as string) || "",
    period: Number(r.data?.period) || 1,
  }));

  async function save() {
    if (!form.subject.trim() || !form.teacher.trim() || !form.class.trim() || !form.room.trim()) {
      setError("Subject, teacher, class, and room are required.");
      return;
    }
    if (periods.some(p => p.day === form.day && p.class === form.class && p.period === form.period)) {
      setError("This class already has a period assigned for the selected day and slot.");
      return;
    }
    await create({ title: form.subject, status: "active", data: { teacher: form.teacher, class: form.class, room: form.room, day: form.day, time: form.time, period: form.period } });
    setShowModal(false);
    setError("");
    setForm({ subject: "", teacher: "", class: "", room: "", day: "Monday", time: "08:00", period: 1 });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>📅 Class Schedule</h1><p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Manage class timetable</p></div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#6366f1", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Period</button>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12 }}>
        {DAYS.map(day => {
          const dayPeriods = periods.filter(p => p.day === day).sort((a, b) => a.period - b.period);
          return (
            <div key={day}>
              <div style={{ background: "rgba(99,102,241,.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontWeight: 700, fontSize: 12, color: "#818cf8", textAlign: "center" }}>{day}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {dayPeriods.map(p => (
                  <div key={p.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{p.subject}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>{p.teacher}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>Class: {p.class} · Rm: {p.room}</div>
                    <div style={{ fontSize: 10, color: "#818cf8", marginTop: 2 }}>{p.time} · P{p.period}</div>
                    <button onClick={() => remove(p.id)} style={{ marginTop: 4, padding: "2px 6px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", color: "#ef4444", borderRadius: 4, fontSize: 9, cursor: "pointer" }}>Remove</button>
                  </div>
                ))}
                {dayPeriods.length === 0 && !loading && <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: 16, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,.2)" }}>Free</div>}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 480, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>Add Period</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[["Subject", "subject", "text", "span 2"], ["Teacher", "teacher", "text", ""], ["Class", "class", "text", ""], ["Room", "room", "text", ""], ["Time", "time", "time", ""]].map(([label, key, type, col]) => (
                <div key={key} style={{ gridColumn: col || undefined }}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{label}</label>
                  <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Day</label>
                <select value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14 }}>
                  {DAYS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Period No.</label>
                <input type="number" min={1} max={8} value={form.period} onChange={e => setForm(f => ({ ...f, period: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              {error && <div style={{ color: "#fda4af", fontSize: 12, flex: 1 }}>{error}</div>}
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#6366f1", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Period</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
