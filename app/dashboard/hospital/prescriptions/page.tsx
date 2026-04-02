"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";
const card: React.CSSProperties = { background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 20, fontFamily: ff };

type Medicine = { name: string; dosage: string; frequency: string; duration: string; qty: number };
const statusColors: Record<string, string> = { active: "#22c55e", completed: "#3b82f6", cancelled: "#6b7280" };
const EMPTY_MED: Medicine = { name: "", dosage: "", frequency: "Once daily", duration: "7 days", qty: 7 };
const EMPTY_FORM = { patient: "", doctor: "", date: new Date().toISOString().split("T")[0], medicines: [{ ...EMPTY_MED }], diagnosis: "", notes: "" };

export default function PrescriptionsPage() {
  const { records, loading, create, update } = useBusinessRecords("prescription");
  const patientStore = useBusinessRecords("patient");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState("all");
  const [formError, setFormError] = useState("");

  const prescriptions = records.map(r => ({
    id: r.id,
    rxNo: (r.data?.rxNo as string) || r.title,
    patient: r.title,
    doctor: (r.data?.doctor as string) || "",
    date: r.date || (r.data?.date as string) || "",
    medicines: (r.data?.medicines as Medicine[]) || [],
    diagnosis: (r.data?.diagnosis as string) || "",
    notes: (r.data?.notes as string) || "",
    status: r.status || "active",
  }));

  const total = prescriptions.length;
  const active = prescriptions.filter(p => p.status === "active").length;
  const dispensedToday = prescriptions.filter(p => p.status === "completed").length;
  const pending = active;

  const filtered = filterStatus === "all" ? prescriptions : prescriptions.filter(p => p.status === filterStatus);

  function addMed() { setForm(f => ({ ...f, medicines: [...f.medicines, { ...EMPTY_MED }] })); }
  function removeMed(i: number) { setForm(f => ({ ...f, medicines: f.medicines.filter((_, idx) => idx !== i) })); }
  function updateMed(i: number, key: keyof Medicine, val: string | number) {
    setForm(f => ({ ...f, medicines: f.medicines.map((m, idx) => idx === i ? { ...m, [key]: val } : m) }));
  }

  async function save() {
    if (!form.patient.trim()) return setFormError("Patient name is required.");
    if (!form.doctor.trim()) return setFormError("Doctor name is required.");
    if (!form.date) return setFormError("Prescription date is required.");
    if (!form.diagnosis.trim()) return setFormError("Diagnosis is required.");
    const patientExists = patientStore.records.some(record => record.title.toLowerCase() === form.patient.trim().toLowerCase());
    if (!patientExists) return setFormError("Create the patient record first.");
    const cleanedMedicines = form.medicines
      .map((medicine) => ({
        name: medicine.name.trim(),
        dosage: medicine.dosage.trim(),
        frequency: medicine.frequency.trim(),
        duration: medicine.duration.trim(),
        qty: Number(medicine.qty),
      }))
      .filter((medicine) => medicine.name);
    if (cleanedMedicines.length === 0) return setFormError("Add at least one medicine.");
    if (cleanedMedicines.some((medicine) => !medicine.dosage || !medicine.frequency || !medicine.duration || medicine.qty <= 0)) {
      return setFormError("Complete dosage, frequency, duration, and quantity for each medicine.");
    }
    setFormError("");
    await create({ title: form.patient.trim(), status: "active", date: form.date, data: { rxNo: `RX-${2000 + records.length + 1}`, doctor: form.doctor.trim(), date: form.date, medicines: cleanedMedicines, diagnosis: form.diagnosis.trim(), notes: form.notes.trim() } });
    setShowModal(false);
    setForm(EMPTY_FORM);
  }

  async function changeStatus(id: string, nextStatus: "completed" | "cancelled") {
    const prescription = prescriptions.find((row) => row.id === id);
    if (!prescription) return;
    if (prescription.status !== "active") {
      alert("Only active prescriptions can be updated.");
      return;
    }
    if (!window.confirm(`Mark prescription ${prescription.rxNo} as ${nextStatus}?`)) return;
    await update(id, { status: nextStatus });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", color: "#fff", fontFamily: ff, padding: "28px 32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Prescriptions</h1>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.45)", fontSize: 14 }}>Doctor prescriptions and medicine orders</p>
        </div>
        <button onClick={() => { setFormError(""); setShowModal(true); }}
          style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>
          + Create Prescription
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total", value: total, color: "#a78bfa" },
          { label: "Active", value: active, color: "#22c55e" },
          { label: "Dispensed", value: dispensedToday, color: "#3b82f6" },
          { label: "Pending Dispensing", value: pending, color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} style={{ ...card, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {["all", "active", "completed", "cancelled"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${filterStatus === s ? "#3b82f6" : border}`, background: filterStatus === s ? "rgba(59,130,246,0.15)" : bg, color: filterStatus === s ? "#3b82f6" : "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: ff, fontSize: 12, textTransform: "capitalize" }}>
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.length === 0 && !loading && (
          <div style={{ ...card, textAlign: "center", padding: 40, color: "rgba(255,255,255,0.25)" }}>No prescriptions found.</div>
        )}
        {filtered.map(rx => (
          <div key={rx.id} style={{ ...card }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setExpanded(expanded === rx.id ? null : rx.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ color: "#a78bfa", fontWeight: 700, fontSize: 15 }}>{rx.rxNo}</span>
                <span style={{ fontWeight: 600 }}>{rx.patient}</span>
                <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>{rx.doctor}</span>
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{rx.date}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  {rx.medicines.length} medicine{rx.medicines.length !== 1 ? "s" : ""}
                </span>
                <span style={{ background: `${statusColors[rx.status]}22`, color: statusColors[rx.status], padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{rx.status}</span>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 16 }}>{expanded === rx.id ? "▲" : "▼"}</span>
              </div>
            </div>

            {expanded === rx.id && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${border}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Diagnosis: <span style={{ color: "#fff" }}>{rx.diagnosis}</span></div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Notes: <span style={{ color: "#fff" }}>{rx.notes}</span></div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${border}` }}>
                        {["Medicine", "Dosage", "Frequency", "Duration", "Qty"].map(h => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "rgba(255,255,255,0.4)", fontWeight: 500, fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rx.medicines.map((m, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${border}` }}>
                          <td style={{ padding: "9px 12px", fontWeight: 500 }}>{m.name}</td>
                          <td style={{ padding: "9px 12px", color: "rgba(255,255,255,0.6)" }}>{m.dosage}</td>
                          <td style={{ padding: "9px 12px", color: "rgba(255,255,255,0.6)" }}>{m.frequency}</td>
                          <td style={{ padding: "9px 12px", color: "rgba(255,255,255,0.6)" }}>{m.duration}</td>
                          <td style={{ padding: "9px 12px", color: "#34d399", fontWeight: 600 }}>{m.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rx.status === "active" && (
                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <button onClick={() => void changeStatus(rx.id, "completed")}
                      style={{ padding: "7px 16px", background: "rgba(34,197,94,0.15)", border: `1px solid rgba(34,197,94,0.3)`, color: "#22c55e", borderRadius: 7, cursor: "pointer", fontFamily: ff, fontSize: 12, fontWeight: 600 }}>Mark Dispensed</button>
                    <button onClick={() => void changeStatus(rx.id, "cancelled")}
                      style={{ padding: "7px 16px", background: "rgba(239,68,68,0.1)", border: `1px solid rgba(239,68,68,0.2)`, color: "#ef4444", borderRadius: 7, cursor: "pointer", fontFamily: ff, fontSize: 12 }}>Cancel</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 620, maxHeight: "88vh", overflowY: "auto", fontFamily: ff }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Create Prescription</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.26)", borderRadius: 8, color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
              {([["Patient Name", "patient"], ["Doctor", "doctor"], ["Date", "date"], ["Diagnosis", "diagnosis"]] as [string, string][]).map(([label, key]) => (
                <div key={key} style={{ gridColumn: key === "diagnosis" ? "span 2" : "span 1" }}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>{label}</label>
                  <input type={key === "date" ? "date" : "text"} value={String((form as Record<string,unknown>)[key] ?? "")} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: ff, fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: ff, fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>

            {/* Medicines */}
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Medicines</span>
              <button onClick={addMed} style={{ background: "rgba(59,130,246,0.15)", border: `1px solid rgba(59,130,246,0.3)`, color: "#3b82f6", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontFamily: ff, fontSize: 12 }}>+ Add Row</button>
            </div>
            {form.medicines.map((m, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1fr 60px 32px", gap: 8, marginBottom: 8 }}>
                {(["name", "dosage", "frequency", "duration"] as (keyof Medicine)[]).map(key => (
                  <input key={key} value={String(m[key])} onChange={e => updateMed(i, key, e.target.value)} placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
                    style={{ background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: "7px 10px", color: "#fff", fontFamily: ff, fontSize: 13, boxSizing: "border-box" }} />
                ))}
                <input type="number" value={m.qty} onChange={e => updateMed(i, "qty", Number(e.target.value))} placeholder="Qty"
                  style={{ background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: "7px 8px", color: "#fff", fontFamily: ff, fontSize: 13, boxSizing: "border-box" }} />
                <button onClick={() => removeMed(i)} style={{ background: "rgba(239,68,68,0.1)", border: "none", color: "#ef4444", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
            ))}

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#3b82f6", border: "none", borderRadius: 8, color: "#fff", fontFamily: ff, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save Prescription</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,0.6)", fontFamily: ff, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
