"use client";

import { useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapExamRecords,
  mapFeeRecords,
  mapScheduleRecords,
  mapStudentRecords,
  schoolBg,
  schoolBorder,
  schoolFont,
  schoolMuted,
} from "../_shared";

export default function SchoolAnalyticsPage() {
  const studentStore = useBusinessRecords("student");
  const feeStore = useBusinessRecords("fee_record");
  const scheduleStore = useBusinessRecords("class_period");
  const examStore = useBusinessRecords("exam_result");

  const students = useMemo(() => mapStudentRecords(studentStore.records), [studentStore.records]);
  const fees = useMemo(() => mapFeeRecords(feeStore.records), [feeStore.records]);
  const periods = useMemo(() => mapScheduleRecords(scheduleStore.records), [scheduleStore.records]);
  const exams = useMemo(() => mapExamRecords(examStore.records), [examStore.records]);

  const classMix = students.reduce<Record<string, number>>((acc, row) => {
    const key = row.className || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const feeByMonth = fees.reduce<Record<string, number>>((acc, row) => {
    const key = row.month || "Unknown";
    acc[key] = (acc[key] || 0) + row.amount;
    return acc;
  }, {});

  const examByClass = exams.reduce<Record<string, number>>((acc, row) => {
    const key = row.className || "Unassigned";
    acc[key] = acc[key] || 0;
    acc[key] += row.percentage;
    return acc;
  }, {});

  const examCountByClass = exams.reduce<Record<string, number>>((acc, row) => {
    const key = row.className || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

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
              const count = periods.filter((row) => row.day === day).length;
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
