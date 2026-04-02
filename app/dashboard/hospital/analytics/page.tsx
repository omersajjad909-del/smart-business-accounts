"use client";

import { useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  hospitalBg,
  hospitalBorder,
  hospitalFont,
  hospitalMuted,
  mapAppointmentRecords,
  mapLabRecords,
  mapPatientRecords,
  mapPrescriptionRecords,
} from "../_shared";

export default function HospitalAnalyticsPage() {
  const patientStore = useBusinessRecords("patient");
  const appointmentStore = useBusinessRecords("appointment");
  const prescriptionStore = useBusinessRecords("prescription");
  const labStore = useBusinessRecords("lab_test");

  const patients = useMemo(() => mapPatientRecords(patientStore.records), [patientStore.records]);
  const appointments = useMemo(() => mapAppointmentRecords(appointmentStore.records), [appointmentStore.records]);
  const prescriptions = useMemo(() => mapPrescriptionRecords(prescriptionStore.records), [prescriptionStore.records]);
  const labs = useMemo(() => mapLabRecords(labStore.records), [labStore.records]);

  const departmentLoad = appointments.reduce<Record<string, number>>((acc, row) => {
    const key = row.department || "General";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const doctorLoad = appointments.reduce<Record<string, number>>((acc, row) => {
    const key = row.doctor || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const statusBars = [
    { label: "Patient occupancy", value: patients.filter((row) => row.status === "admitted" || row.status === "icu").length, total: Math.max(patients.length, 1), color: "#3b82f6" },
    { label: "Appointment completion", value: appointments.filter((row) => row.status === "completed").length, total: Math.max(appointments.length, 1), color: "#22c55e" },
    { label: "Prescription dispensing", value: prescriptions.filter((row) => row.status === "completed").length, total: Math.max(prescriptions.length, 1), color: "#a78bfa" },
    { label: "Lab completion", value: labs.filter((row) => row.status === "completed").length, total: Math.max(labs.length, 1), color: "#f59e0b" },
  ];

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: hospitalFont }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>Healthcare Analytics</h1>
        <p style={{ margin: 0, fontSize: 13, color: hospitalMuted }}>Operational view of case load, department demand, and clinical throughput.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: hospitalBg, border: `1px solid ${hospitalBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Operational Completion</div>
          <div style={{ display: "grid", gap: 12 }}>
            {statusBars.map((row) => {
              const pct = Math.round((row.value / row.total) * 100);
              return (
                <div key={row.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: hospitalMuted }}>{row.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: row.color }}>{pct}%</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: row.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: hospitalBg, border: `1px solid ${hospitalBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Department Demand</div>
          <div style={{ display: "grid", gap: 10 }}>
            {Object.entries(departmentLoad).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([dept, count]) => (
              <div key={dept} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{dept}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#93c5fd" }}>{count}</span>
              </div>
            ))}
            {Object.keys(departmentLoad).length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No appointment load yet.</div>}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: hospitalBg, border: `1px solid ${hospitalBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Doctor Schedule Pressure</div>
          <div style={{ display: "grid", gap: 10 }}>
            {Object.entries(doctorLoad).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([doctor, count]) => (
              <div key={doctor} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{doctor}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#c4b5fd" }}>{count}</span>
              </div>
            ))}
            {Object.keys(doctorLoad).length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No doctor assignments yet.</div>}
          </div>
        </div>

        <div style={{ background: hospitalBg, border: `1px solid ${hospitalBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Clinical Backlog</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { label: "ICU patients", value: patients.filter((row) => row.status === "icu").length, color: "#ef4444" },
              { label: "Unconfirmed appointments", value: appointments.filter((row) => row.status === "scheduled").length, color: "#f59e0b" },
              { label: "Active prescriptions", value: prescriptions.filter((row) => row.status === "active").length, color: "#22c55e" },
              { label: "Urgent pending labs", value: labs.filter((row) => row.urgent && row.status !== "completed").length, color: "#f97316" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13, color: hospitalMuted }}>{row.label}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
