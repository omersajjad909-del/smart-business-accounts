"use client";

import Link from "next/link";
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
} from "./_shared";

export default function SchoolOverviewPage() {
  const studentStore = useBusinessRecords("student");
  const feeStore = useBusinessRecords("fee_record");
  const scheduleStore = useBusinessRecords("class_period");
  const examStore = useBusinessRecords("exam_result");

  const students = useMemo(() => mapStudentRecords(studentStore.records), [studentStore.records]);
  const fees = useMemo(() => mapFeeRecords(feeStore.records), [feeStore.records]);
  const periods = useMemo(() => mapScheduleRecords(scheduleStore.records), [scheduleStore.records]);
  const exams = useMemo(() => mapExamRecords(examStore.records), [examStore.records]);

  const activeStudents = students.filter((row) => row.studentStatus === "active").length;
  const defaulters = students.filter((row) => row.feeStatus === "overdue").length;
  const collected = fees.filter((row) => row.status === "paid").reduce((sum, row) => sum + row.amount, 0);
  const passRate = exams.length ? Math.round((exams.filter((row) => row.status === "pass").length / exams.length) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", padding: "28px 32px", color: "#fff", fontFamily: schoolFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800 }}>School Command Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: schoolMuted }}>Admissions, fees, schedules, and exam health in one view.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Students", href: "/dashboard/school/students" },
            { label: "Fees", href: "/dashboard/school/fees" },
            { label: "Schedule", href: "/dashboard/school/schedule" },
            { label: "Exams", href: "/dashboard/school/exams" },
            { label: "Analytics", href: "/dashboard/school/analytics" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${schoolBorder}`, background: schoolBg, color: "#a5b4fc", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Students", value: students.length, color: "#818cf8" },
          { label: "Active Students", value: activeStudents, color: "#34d399" },
          { label: "Collected Fees", value: `Rs. ${collected.toLocaleString()}`, color: "#60a5fa" },
          { label: "Pass Rate", value: `${passRate}%`, color: "#f59e0b" },
        ].map((card) => (
          <div key={card.label} style={{ background: schoolBg, border: `1px solid ${schoolBorder}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: schoolMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 18 }}>
        <div style={{ background: schoolBg, border: `1px solid ${schoolBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${schoolBorder}`, fontSize: 15, fontWeight: 800 }}>Academic Snapshot</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {[
              { label: "Scheduled periods", value: periods.length, color: "#a5b4fc" },
              { label: "Fee defaulters", value: defaulters, color: "#f87171" },
              { label: "Pending fee records", value: fees.filter((row) => row.status !== "paid").length, color: "#f59e0b" },
              { label: "Exam records", value: exams.length, color: "#34d399" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 13, color: schoolMuted }}>{row.label}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: schoolBg, border: `1px solid ${schoolBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${schoolBorder}`, fontSize: 15, fontWeight: 800 }}>Watchlist</div>
          <div style={{ padding: 18, display: "grid", gap: 10 }}>
            {students.filter((row) => row.feeStatus === "overdue").slice(0, 5).map((student) => (
              <div key={student.id} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{student.name}</div>
                <div style={{ fontSize: 12, color: schoolMuted, marginTop: 4 }}>Roll {student.rollNo} · Class {student.className}{student.section ? `-${student.section}` : ""}</div>
                <div style={{ fontSize: 12, color: "#fca5a5", marginTop: 6 }}>Fee status: {student.feeStatus}</div>
              </div>
            ))}
            {students.filter((row) => row.feeStatus === "overdue").length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No overdue student accounts right now.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
