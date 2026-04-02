"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapPrescriptionRecords, pharmacyBg, pharmacyBorder, pharmacyFont, pharmacyMuted, todayIso } from "../_shared";

const STATUS_COLOR: Record<string, string> = { pending: "#f59e0b", dispensed: "#34d399", cancelled: "#6b7280" };
const initialForm = { patient: "", doctor: "", drugs: "", date: todayIso(), notes: "" };

export default function PharmacyPrescriptionsPage() {
  const { records, loading, create, update } = useBusinessRecords("pharmacy_prescription");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);

  const prescriptions = useMemo(() => mapPrescriptionRecords(records), [records]);

  async function save() {
    const patient = form.patient.trim();
    const doctor = form.doctor.trim();
    const drugs = form.drugs.trim();
    if (!patient || !doctor || !drugs || !form.date) {
      setError("Patient, doctor, drugs, and date are required.");
      return;
    }
    const duplicate = prescriptions.some((row) => row.status === "pending" && row.patient.toLowerCase() === patient.toLowerCase() && row.date === form.date && row.drugs.toLowerCase() === drugs.toLowerCase());
    if (duplicate) {
      setError("A matching pending prescription already exists.");
      return;
    }
    await create({ title: patient, status: "pending", date: form.date, data: { doctor, drugs, notes: form.notes.trim() } });
    setShowModal(false);
    setError("");
    setForm(initialForm);
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: pharmacyFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Prescriptions</h1>
          <p style={{ fontSize: 13, color: pharmacyMuted, margin: 0 }}>Track and dispense prescriptions.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#fb7185", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>New Prescription</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "Total", val: prescriptions.length, color: "#fb7185" }, { label: "Pending", val: prescriptions.filter((p) => p.status === "pending").length, color: "#f59e0b" }, { label: "Dispensed", val: prescriptions.filter((p) => p.status === "dispensed").length, color: "#34d399" }].map((s) => (
          <div key={s.label} style={{ background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ fontSize: 13, color: pharmacyMuted, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: pharmacyMuted }}>Loading...</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {prescriptions.map((p) => (
          <div key={p.id} style={{ background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontWeight: 700 }}>{p.patient}</span>
                <span style={{ fontSize: 12, color: pharmacyMuted }}>Dr. {p.doctor} | {p.date}</span>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>{p.drugs}</div>
              {p.notes && <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{p.notes}</div>}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ display: "inline-block", background: `${STATUS_COLOR[p.status]}20`, color: STATUS_COLOR[p.status], borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{p.status}</span>
              {p.status === "pending" && <button onClick={() => update(p.id, { status: "dispensed" })} style={{ padding: "5px 10px", background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Dispense</button>}
            </div>
          </div>
        ))}
        {!loading && prescriptions.length === 0 && <div style={{ background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 12, padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No prescriptions yet.</div>}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${pharmacyBorder}`, borderRadius: 16, padding: 32, width: 480, fontFamily: pharmacyFont }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>New Prescription</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[["Patient Name", "patient", "text", "span 2"], ["Doctor", "doctor", "text", ""], ["Date", "date", "date", ""], ["Drugs (comma separated)", "drugs", "text", "span 2"], ["Notes", "notes", "text", "span 2"]].map(([label, key, type, col]) => (
                <div key={key} style={{ gridColumn: col || undefined }}>
                  <label style={{ display: "block", fontSize: 12, color: pharmacyMuted, marginBottom: 6 }}>{label}</label>
                  <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", background: pharmacyBg, border: `1px solid ${pharmacyBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            {error && <div style={{ marginTop: 14, fontSize: 12, color: "#fca5a5" }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#fb7185", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add</button>
              <button onClick={() => { setShowModal(false); setError(""); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${pharmacyBorder}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
