"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";
const card: React.CSSProperties = { background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 20, fontFamily: ff };

const statusColors: Record<string, string> = { scheduled: "#f59e0b", confirmed: "#3b82f6", completed: "#22c55e", cancelled: "#6b7280", no_show: "#ef4444" };
const statusLabels: Record<string, string> = { scheduled: "Scheduled", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled", no_show: "No Show" };
const typeColors: Record<string, string> = { consultation: "#a78bfa", follow_up: "#34d399", procedure: "#f97316" };
const typeLabels: Record<string, string> = { consultation: "Consultation", follow_up: "Follow-up", procedure: "Procedure" };

const DOCTORS = ["Dr. Fatima Malik", "Dr. Hassan Qureshi", "Dr. Zara Ahmed", "Dr. Imran Shah", "Dr. Asma Riaz"];
const DEPARTMENTS = ["Cardiology", "Surgery", "Neurology", "Pediatrics", "Gynecology", "Orthopedics", "General Medicine", "Dermatology"];
const EMPTY_FORM = { patient: "", doctor: "", department: "", date: new Date().toISOString().split("T")[0], time: "09:00", type: "consultation", notes: "" };

export default function AppointmentsPage() {
  const { records, loading, create, update } = useBusinessRecords("appointment");
  const patientStore = useBusinessRecords("patient");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState("all");
  const [formError, setFormError] = useState("");

  const appointments = records.map(r => ({
    id: r.id,
    apptNo: (r.data?.apptNo as string) || r.title,
    patient: r.title,
    doctor: (r.data?.doctor as string) || "",
    department: (r.data?.department as string) || "",
    date: r.date || (r.data?.date as string) || "",
    time: (r.data?.time as string) || "",
    type: (r.data?.type as string) || "consultation",
    status: r.status || "scheduled",
    notes: (r.data?.notes as string) || "",
  }));

  const sorted = [...appointments].sort((a, b) => a.time.localeCompare(b.time));
  const filtered = filterStatus === "all" ? sorted : sorted.filter(a => a.status === filterStatus);

  const todayTotal = appointments.length;
  const confirmed = appointments.filter(a => a.status === "confirmed").length;
  const completed = appointments.filter(a => a.status === "completed").length;
  const cancelled = appointments.filter(a => a.status === "cancelled" || a.status === "no_show").length;

  async function updateStatus(id: string, status: string) {
    const appointment = appointments.find(a => a.id === id);
    if (!appointment) return;
    if (status === "completed" && appointment.status !== "confirmed") {
      alert("Only confirmed appointments can be completed.");
      return;
    }
    if ((status === "cancelled" || status === "no_show") && appointment.status === "completed") {
      alert("Completed appointments are locked.");
      return;
    }
    await update(id, { status });
  }

  async function save() {
    if (!form.patient.trim()) return setFormError("Patient name is required.");
    if (!form.doctor.trim()) return setFormError("Doctor is required.");
    if (!form.department.trim()) return setFormError("Department is required.");
    if (!form.date) return setFormError("Appointment date is required.");
    if (!form.time) return setFormError("Appointment time is required.");
    const patientExists = patientStore.records.some(record => record.title.toLowerCase() === form.patient.trim().toLowerCase());
    if (!patientExists) return setFormError("Create the patient record first.");
    const duplicateSlot = appointments.some(appt => appt.patient.toLowerCase() === form.patient.trim().toLowerCase() && appt.doctor === form.doctor && appt.date === form.date && appt.time === form.time && appt.status !== "cancelled" && appt.status !== "no_show");
    if (duplicateSlot) return setFormError("This patient already has an active appointment in the same slot.");
    setFormError("");
    await create({ title: form.patient.trim(), status: "scheduled", date: form.date, data: { apptNo: `APT-${String(records.length + 1).padStart(3, "0")}`, doctor: form.doctor.trim(), department: form.department.trim(), date: form.date, time: form.time, type: form.type, notes: form.notes.trim() } });
    setShowModal(false);
    setForm(EMPTY_FORM);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", color: "#fff", fontFamily: ff, padding: "28px 32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Appointments</h1>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.45)", fontSize: 14 }}>Today – {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <button onClick={() => { setFormError(""); setShowModal(true); }}
          style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>
          + Book Appointment
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Today Total", value: todayTotal, color: "#a78bfa" },
          { label: "Confirmed", value: confirmed, color: "#3b82f6" },
          { label: "Completed", value: completed, color: "#22c55e" },
          { label: "Cancelled / No Show", value: cancelled, color: "#ef4444" },
        ].map(s => (
          <div key={s.label} style={{ ...card, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {["all", "scheduled", "confirmed", "completed", "cancelled", "no_show"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${filterStatus === s ? statusColors[s] || "#3b82f6" : border}`, background: filterStatus === s ? `${statusColors[s] || "#3b82f6"}18` : bg, color: filterStatus === s ? statusColors[s] || "#3b82f6" : "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: ff, fontSize: 12, fontWeight: 500 }}>
            {s === "all" ? "All" : statusLabels[s] || s}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      {/* Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.length === 0 && !loading && (
          <div style={{ ...card, textAlign: "center", padding: 40, color: "rgba(255,255,255,0.25)" }}>No appointments found.</div>
        )}
        {filtered.map(appt => (
          <div key={appt.id} style={{ ...card, display: "flex", alignItems: "center", gap: 20, padding: "16px 20px" }}>
            <div style={{ minWidth: 64, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{appt.time}</div>
            </div>
            <div style={{ width: 2, height: 48, background: statusColors[appt.status], borderRadius: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{appt.patient}</span>
                <span style={{ background: `${typeColors[appt.type]}22`, color: typeColors[appt.type], padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{typeLabels[appt.type] || appt.type}</span>
                <span style={{ background: `${statusColors[appt.status]}22`, color: statusColors[appt.status], padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{statusLabels[appt.status]}</span>
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{appt.doctor} &nbsp;·&nbsp; {appt.department}</div>
              {appt.notes && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{appt.notes}</div>}
            </div>
            <div style={{ color: "#a78bfa", fontSize: 12, fontWeight: 600 }}>{appt.apptNo}</div>
            <div style={{ display: "flex", gap: 8 }}>
              {appt.status === "scheduled" && (
                <button onClick={() => updateStatus(appt.id, "confirmed")}
                  style={{ padding: "6px 12px", background: "rgba(59,130,246,0.15)", border: `1px solid rgba(59,130,246,0.3)`, color: "#3b82f6", borderRadius: 6, cursor: "pointer", fontFamily: ff, fontSize: 12, fontWeight: 600 }}>Confirm</button>
              )}
              {appt.status === "confirmed" && (
                <button onClick={() => updateStatus(appt.id, "completed")}
                  style={{ padding: "6px 12px", background: "rgba(34,197,94,0.15)", border: `1px solid rgba(34,197,94,0.3)`, color: "#22c55e", borderRadius: 6, cursor: "pointer", fontFamily: ff, fontSize: 12, fontWeight: 600 }}>Complete</button>
              )}
              {(appt.status === "scheduled" || appt.status === "confirmed") && (
                <button onClick={() => updateStatus(appt.id, "cancelled")}
                  style={{ padding: "6px 12px", background: "rgba(239,68,68,0.1)", border: `1px solid rgba(239,68,68,0.2)`, color: "#ef4444", borderRadius: 6, cursor: "pointer", fontFamily: ff, fontSize: 12 }}>Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 500, fontFamily: ff }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Book Appointment</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            {formError && <div style={{ marginBottom: "14px", padding: "10px 12px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.26)", borderRadius: 8, color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[["Patient Name", "patient"], ["Date", "date"], ["Time", "time"]].map(([label, key]) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>{label}</label>
                  <input type={key === "date" ? "date" : key === "time" ? "time" : "text"} value={String((form as Record<string,string>)[key] ?? "")} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: ff, fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Doctor</label>
                <select value={form.doctor} onChange={e => setForm(f => ({ ...f, doctor: e.target.value }))}
                  style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: ff, fontSize: 14 }}>
                  <option value="">Select Doctor</option>
                  {DOCTORS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Department</label>
                <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                  style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: ff, fontSize: 14 }}>
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: ff, fontSize: 14 }}>
                  <option value="consultation">Consultation</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="procedure">Procedure</option>
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: ff, fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#3b82f6", border: "none", borderRadius: 8, color: "#fff", fontFamily: ff, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Book Appointment</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,0.6)", fontFamily: ff, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
