"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HospitalControlCenter, fetchJson, hospitalBg, hospitalBorder, hospitalFont, hospitalMuted } from "./_shared";

const emptyState: HospitalControlCenter = {
  summary: { patients: 0, activePatients: 0, todayAppointments: 0, completedAppointments: 0, activePrescriptions: 0, completedPrescriptions: 0, pendingLabs: 0, urgentPendingLabs: 0, icuPatients: 0 },
  patients: [],
  appointments: [],
  prescriptions: [],
  labs: [],
};

export default function HospitalOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/hospital/control-center", emptyState).then(setData);
  }, []);

  const { summary, patients, appointments, prescriptions, labs } = data;
  const today = new Date().toISOString().slice(0, 10);
  const todayAppointments = appointments.filter((row) => row.date.startsWith(today));
  const upcomingAppointments = [...todayAppointments].filter((row) => row.status === "scheduled" || row.status === "confirmed").sort((a, b) => a.time.localeCompare(b.time)).slice(0, 5);
  const highRiskQueue = [
    ...patients.filter((row) => row.status === "icu").map((row) => ({ label: row.name, meta: `ICU · ${row.doctor || "Unassigned doctor"}`, tone: "#ef4444" })),
    ...labs.filter((row) => row.urgent && row.status !== "completed").map((row) => ({ label: row.patient, meta: `Urgent lab · ${row.tests.join(", ") || "Tests pending"}`, tone: "#f59e0b" })),
  ].slice(0, 6);

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: hospitalFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26, gap: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800 }}>Healthcare Command Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: hospitalMuted }}>Monitor patients, front desk load, prescriptions, and lab processing from one place.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Patient Records", href: "/dashboard/hospital/patients" },
            { label: "Appointments", href: "/dashboard/hospital/appointments" },
            { label: "Prescriptions", href: "/dashboard/hospital/prescriptions" },
            { label: "Lab Tests", href: "/dashboard/hospital/lab" },
          ].map((action) => (
            <Link key={action.href} href={action.href} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${hospitalBorder}`, background: hospitalBg, color: "#c7d2fe", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Active Patients", value: summary.activePatients, color: "#3b82f6" },
          { label: "Today's Appointments", value: summary.todayAppointments, color: "#a78bfa" },
          { label: "Active Prescriptions", value: summary.activePrescriptions, color: "#22c55e" },
          { label: "Pending Labs", value: summary.pendingLabs, color: "#f59e0b" },
        ].map((card) => (
          <div key={card.label} style={{ background: hospitalBg, border: `1px solid ${hospitalBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: hospitalMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 18, alignItems: "start" }}>
        <div style={{ background: hospitalBg, border: `1px solid ${hospitalBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${hospitalBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Today's Front Desk Queue</div>
            <Link href="/dashboard/hospital/appointments" style={{ color: "#93c5fd", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>Open schedule</Link>
          </div>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            {upcomingAppointments.length === 0 && <div style={{ color: "rgba(255,255,255,.28)", textAlign: "center", padding: 24 }}>No active appointments for today.</div>}
            {upcomingAppointments.map((row) => (
              <div key={row.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr auto", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#c4b5fd" }}>{row.time || "--:--"}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{row.patient}</div>
                  <div style={{ fontSize: 12, color: hospitalMuted }}>{row.doctor} · {row.department || "General"}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: row.status === "confirmed" ? "#3b82f6" : "#f59e0b" }}>{row.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ background: hospitalBg, border: `1px solid ${hospitalBorder}`, borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Clinical Risk Watchlist</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {highRiskQueue.length === 0 && <div style={{ color: "rgba(255,255,255,.28)", padding: "8px 0" }}>No urgent cases in queue.</div>}
              {highRiskQueue.map((row, index) => (
                <div key={`${row.label}-${index}`} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: row.tone }}>{row.label}</div>
                  <div style={{ fontSize: 12, color: hospitalMuted, marginTop: 4 }}>{row.meta}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: hospitalBg, border: `1px solid ${hospitalBorder}`, borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Throughput Snapshot</div>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { label: "Completed appointments", value: summary.completedAppointments, color: "#22c55e" },
                { label: "Lab processing", value: labs.filter((row) => row.status === "processing").length, color: "#3b82f6" },
                { label: "Prescriptions dispensed", value: summary.completedPrescriptions, color: "#a78bfa" },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                  <span style={{ fontSize: 13, color: hospitalMuted }}>{row.label}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
