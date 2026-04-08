"use client";
import { confirmToast, alertToast } from "@/lib/toast-feedback";

import toast from "react-hot-toast";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";
const card: React.CSSProperties = { background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 20, fontFamily: ff };

const statusColor: Record<string, string> = { admitted: "#3b82f6", discharged: "#22c55e", icu: "#ef4444", opd: "#f59e0b" };
const statusLabel: Record<string, string> = { admitted: "Admitted", discharged: "Discharged", icu: "ICU", opd: "OPD" };

const EMPTY_FORM = { mrNo: "", name: "", age: 0, gender: "Male", bloodGroup: "B+", phone: "", address: "", diagnosis: "", doctor: "", admitDate: "", status: "opd", insurance: false };

export default function PatientsPage() {
  const { records, loading, create, update, remove } = useBusinessRecords("patient");
  const appointmentStore = useBusinessRecords("appointment");
  const prescriptionStore = useBusinessRecords("prescription");
  const labStore = useBusinessRecords("lab_test");
  const [selected, setSelected] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<typeof EMPTY_FORM & { id?: string }>({ ...EMPTY_FORM });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [formError, setFormError] = useState("");

  const patients = records.map(r => ({
    id: r.id,
    mrNo: (r.data?.mrNo as string) || r.title,
    name: r.title,
    age: Number(r.data?.age) || 0,
    gender: (r.data?.gender as string) || "Male",
    bloodGroup: (r.data?.bloodGroup as string) || "",
    phone: (r.data?.phone as string) || "",
    address: (r.data?.address as string) || "",
    diagnosis: (r.data?.diagnosis as string) || "",
    doctor: (r.data?.doctor as string) || "",
    admitDate: r.date || (r.data?.admitDate as string) || "",
    status: r.status || "opd",
    insurance: Boolean(r.data?.insurance),
  }));

  const total = patients.length;
  const admitted = patients.filter(p => p.status === "admitted").length;
  const opd = patients.filter(p => p.status === "opd").length;
  const discharged = patients.filter(p => p.status === "discharged").length;
  const icu = patients.filter(p => p.status === "icu").length;

  const filtered = patients.filter(p =>
    (filterStatus === "all" || p.status === filterStatus) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.mrNo.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedPatient = patients.find(p => p.id === selected) || null;

  async function save() {
    if (!form.name.trim()) return setFormError("Patient name is required.");
    if (!form.mrNo.trim()) return setFormError("MR number is required.");
    if (form.age <= 0) return setFormError("Age must be greater than zero.");
    if (!form.doctor.trim()) return setFormError("Doctor name is required.");
    if (!form.admitDate) return setFormError("Admit date is required.");
    if (patients.some(p => p.mrNo.toLowerCase() === form.mrNo.trim().toLowerCase() && p.id !== form.id)) return setFormError("MR number already exists.");
    setFormError("");
    if (form.id) {
      await update(form.id, { title: form.name.trim(), status: form.status, date: form.admitDate, data: { mrNo: form.mrNo.trim(), age: form.age, gender: form.gender, bloodGroup: form.bloodGroup, phone: form.phone.trim(), address: form.address.trim(), diagnosis: form.diagnosis.trim(), doctor: form.doctor.trim(), admitDate: form.admitDate, insurance: form.insurance } });
    } else {
      await create({ title: form.name.trim(), status: form.status, date: form.admitDate, data: { mrNo: form.mrNo.trim(), age: form.age, gender: form.gender, bloodGroup: form.bloodGroup, phone: form.phone.trim(), address: form.address.trim(), diagnosis: form.diagnosis.trim(), doctor: form.doctor.trim(), admitDate: form.admitDate, insurance: form.insurance } });
    }
    setShowModal(false);
    setForm({ ...EMPTY_FORM });
  }

  async function removePatient(patientId: string, patientName: string) {
    const hasLinkedAppointments = appointmentStore.records.some(record => record.title === patientName && ["scheduled", "confirmed"].includes(String(record.status || "")));
    const hasLinkedPrescriptions = prescriptionStore.records.some(record => record.title === patientName && String(record.status || "") === "active");
    const hasLinkedLabs = labStore.records.some(record => record.title === patientName && String(record.status || "") !== "completed");
    if (hasLinkedAppointments || hasLinkedPrescriptions || hasLinkedLabs) {
      toast("Resolve linked appointments, prescriptions, and lab tests before removing this patient.");
      return;
    }
    if (!await confirmToast(`Remove ${patientName}?`)) return;
    await remove(patientId);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", color: "#fff", fontFamily: ff, padding: "28px 32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Patient Records</h1>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.45)", fontSize: 14 }}>Manage hospital patient information</p>
        </div>
        <button onClick={() => { setFormError(""); setForm({ ...EMPTY_FORM, mrNo: `MR-${1000 + patients.length + 1}`, admitDate: new Date().toISOString().split("T")[0] }); setShowModal(true); }}
          style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>
          + Add Patient
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Patients", value: total, color: "#a78bfa" },
          { label: "Admitted", value: admitted, color: "#3b82f6" },
          { label: "ICU", value: icu, color: "#ef4444" },
          { label: "OPD Today", value: opd, color: "#f59e0b" },
          { label: "Discharged", value: discharged, color: "#22c55e" },
        ].map(s => (
          <div key={s.label} style={{ ...card, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or MR No..."
          style={{ flex: 1, background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "10px 14px", color: "#fff", fontFamily: ff, fontSize: 14 }} />
        {["all", "admitted", "icu", "opd", "discharged"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${filterStatus === s ? "#3b82f6" : border}`, background: filterStatus === s ? "rgba(59,130,246,0.15)" : bg, color: filterStatus === s ? "#3b82f6" : "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: ff, fontSize: 13, textTransform: "capitalize" }}>
            {s === "all" ? "All" : statusLabel[s]}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={{ display: "grid", gridTemplateColumns: selectedPatient ? "1fr 380px" : "1fr", gap: 20 }}>
        {/* List */}
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}` }}>
                {["MR No", "Patient", "Age/Gender", "Blood", "Doctor", "Admit Date", "Status", "Ins."].map(h => (
                  <th key={h} style={{ padding: "14px 16px", textAlign: "left", color: "rgba(255,255,255,0.45)", fontWeight: 500, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 14 }}>No patients found.</td></tr>
              )}
              {filtered.map(p => (
                <tr key={p.id} onClick={() => setSelected(p.id === selected ? null : p.id)} style={{ borderBottom: `1px solid ${border}`, cursor: "pointer", background: selected === p.id ? "rgba(59,130,246,0.08)" : "transparent", transition: "background 0.15s" }}>
                  <td style={{ padding: "13px 16px", color: "#a78bfa", fontWeight: 600 }}>{p.mrNo}</td>
                  <td style={{ padding: "13px 16px", fontWeight: 500 }}>{p.name}</td>
                  <td style={{ padding: "13px 16px", color: "rgba(255,255,255,0.6)" }}>{p.age}y / {p.gender}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{p.bloodGroup}</span>
                  </td>
                  <td style={{ padding: "13px 16px", color: "rgba(255,255,255,0.7)" }}>{p.doctor}</td>
                  <td style={{ padding: "13px 16px", color: "rgba(255,255,255,0.5)" }}>{p.admitDate}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ background: `${statusColor[p.status]}22`, color: statusColor[p.status], padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{statusLabel[p.status] || p.status}</span>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ color: p.insurance ? "#22c55e" : "rgba(255,255,255,0.3)", fontSize: 16 }}>{p.insurance ? "✓" : "✗"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail Panel */}
        {selectedPatient && (
          <div style={{ ...card, position: "relative" }}>
            <button onClick={() => setSelected(null)} style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 18, cursor: "pointer" }}>✕</button>
            <div style={{ marginBottom: 16 }}>
              <span style={{ background: `${statusColor[selectedPatient.status]}22`, color: statusColor[selectedPatient.status], padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{statusLabel[selectedPatient.status]}</span>
              {selectedPatient.insurance && <span style={{ marginLeft: 8, background: "rgba(34,197,94,0.15)", color: "#22c55e", padding: "4px 10px", borderRadius: 20, fontSize: 12 }}>Insured</span>}
            </div>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>{selectedPatient.name}</h2>
            <p style={{ margin: "0 0 16px", color: "#a78bfa", fontSize: 13, fontWeight: 600 }}>{selectedPatient.mrNo}</p>
            {[
              ["Age / Gender", `${selectedPatient.age} years / ${selectedPatient.gender}`],
              ["Blood Group", selectedPatient.bloodGroup],
              ["Phone", selectedPatient.phone],
              ["Address", selectedPatient.address],
              ["Diagnosis", selectedPatient.diagnosis],
              ["Doctor", selectedPatient.doctor],
              ["Admit Date", selectedPatient.admitDate],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${border}` }}>
                <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 500, textAlign: "right", maxWidth: 200 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button onClick={() => { setFormError(""); setForm({ id: selectedPatient.id, mrNo: selectedPatient.mrNo, name: selectedPatient.name, age: selectedPatient.age, gender: selectedPatient.gender, bloodGroup: selectedPatient.bloodGroup, phone: selectedPatient.phone, address: selectedPatient.address, diagnosis: selectedPatient.diagnosis, doctor: selectedPatient.doctor, admitDate: selectedPatient.admitDate, status: selectedPatient.status, insurance: selectedPatient.insurance }); setShowModal(true); }}
                style={{ flex: 1, padding: "9px 0", background: "rgba(59,130,246,0.15)", border: `1px solid rgba(59,130,246,0.3)`, color: "#3b82f6", borderRadius: 8, cursor: "pointer", fontFamily: ff, fontSize: 13, fontWeight: 600 }}>Edit Patient</button>
              <button onClick={() => { void removePatient(selectedPatient.id, selectedPatient.name); setSelected(null); }}
                style={{ padding: "9px 16px", background: "rgba(239,68,68,0.1)", border: `1px solid rgba(239,68,68,0.2)`, color: "#ef4444", borderRadius: 8, cursor: "pointer", fontFamily: ff, fontSize: 13 }}>Remove</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 540, maxHeight: "85vh", overflowY: "auto", fontFamily: ff }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{form.id ? "Edit Patient" : "Add Patient"}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.26)", borderRadius: 8, color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {([["MR No", "mrNo"], ["Full Name", "name"], ["Phone", "phone"]] as [string, string][]).map(([label, key]) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>{label}</label>
                  <input value={String((form as Record<string,unknown>)[key] ?? "")} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: ff, fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Age</label>
                <input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: Number(e.target.value) }))}
                  style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: ff, fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Gender</label>
                <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                  style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: ff, fontSize: 14 }}>
                  {["Male", "Female", "Other"].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Blood Group</label>
                <select value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))}
                  style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: ff, fontSize: 14 }}>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: ff, fontSize: 14 }}>
                  {["admitted", "discharged", "icu", "opd"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Address</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: ff, fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Diagnosis</label>
                <input value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
                  style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: ff, fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Doctor</label>
                <input value={form.doctor} onChange={e => setForm(f => ({ ...f, doctor: e.target.value }))}
                  style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: ff, fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Admit Date</label>
                <input type="date" value={form.admitDate} onChange={e => setForm(f => ({ ...f, admitDate: e.target.value }))}
                  style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: ff, fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Insurance</label>
                <select value={form.insurance ? "yes" : "no"} onChange={e => setForm(f => ({ ...f, insurance: e.target.value === "yes" }))}
                  style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: ff, fontSize: 14 }}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#3b82f6", border: "none", borderRadius: 8, color: "#fff", fontFamily: ff, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                {form.id ? "Save Changes" : "Add Patient"}
              </button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,0.6)", fontFamily: ff, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
