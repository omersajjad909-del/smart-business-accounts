"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchJson, schoolBg, schoolBorder, schoolFont, schoolMuted, type SchoolControlCenter } from "../_shared";

const emptyState: SchoolControlCenter = {
  summary: { students: 0, activeStudents: 0, defaulters: 0, collectedFees: 0, pendingFees: 0, schedules: 0, exams: 0, passRate: 0, pendingAdmissions: 0, teachers: 0, attendancePresent: 0, attendanceTotal: 0 },
  students: [],
  fees: [],
  schedules: [],
  exams: [],
  admissions: [],
  attendance: [],
  teachers: [],
};

export default function SchoolAnalyticsPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/school/control-center", emptyState).then(setData);
  }, []);

  const { students, fees, schedules, exams } = data;

  const classMix = useMemo(() => students.reduce<Record<string, number>>((acc, row) => {
    const key = row.className || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {}), [students]);

  const feeByMonth = useMemo(() => fees.reduce<Record<string, number>>((acc, row) => {
    const key = row.month || "Unknown";
    acc[key] = (acc[key] || 0) + row.amount;
    return acc;
  }, {}), [fees]);

  const examByClass = useMemo(() => exams.reduce<Record<string, number>>((acc, row) => {
    const key = row.className || "Unassigned";
    acc[key] = (acc[key] || 0) + row.percentage;
    return acc;
  }, {}), [exams]);

  const examCountByClass = useMemo(() => exams.reduce<Record<string, number>>((acc, row) => {
    const key = row.className || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {}), [exams]);

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: schoolFont }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>School Analytics</h1>
        <p style={{ margin: 0, fontSize: 13, color: schoolMuted }}>Enrollment mix, fee demand, exam performance, and timetable load.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: schoolBg, border: `1px solid ${schoolBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Student Distribution by Class</div>
          <div style={{ display: "grid", gap: 10 }}>
            {Object.entries(classMix).sort((a, b) => b[1] - a[1]).map(([className, count]) => (
              <div key={className} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>Class {className}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#a5b4fc" }}>{count}</span>
              </div>
            ))}
            {Object.keys(classMix).length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No student records yet.</div>}
          </div>
        </div>

        <div style={{ background: schoolBg, border: `1px solid ${schoolBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Timetable Load</div>
          <div style={{ display: "grid", gap: 10 }}>
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => {
              const count = schedules.filter((row) => row.day === day).length;
              return (
                <div key={day} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                  <span style={{ fontSize: 13 }}>{day}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#34d399" }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: schoolBg, border: `1px solid ${schoolBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Fee Demand by Month</div>
          <div style={{ display: "grid", gap: 10 }}>
            {Object.entries(feeByMonth).sort((a, b) => b[1] - a[1]).map(([month, amount]) => (
              <div key={month} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13 }}>{month}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#60a5fa" }}>Rs. {amount.toLocaleString()}</span>
              </div>
            ))}
            {Object.keys(feeByMonth).length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No fee records yet.</div>}
          </div>
        </div>

        <div style={{ background: schoolBg, border: `1px solid ${schoolBorder}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Average Exam Score by Class</div>
          <div style={{ display: "grid", gap: 10 }}>
            {Object.keys(examByClass).map((className) => {
              const avg = Math.round(examByClass[className] / Math.max(1, examCountByClass[className]));
              return (
                <div key={className} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                  <span style={{ fontSize: 13 }}>Class {className}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: avg >= 50 ? "#34d399" : "#f87171" }}>{avg}%</span>
                </div>
              );
            })}
            {Object.keys(examByClass).length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No exam records yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
