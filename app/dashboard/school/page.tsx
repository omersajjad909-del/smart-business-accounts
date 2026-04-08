"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson, schoolBg, schoolBorder, schoolFont, schoolMuted, type SchoolControlCenter } from "./_shared";

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

export default function SchoolOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/school/control-center", emptyState).then(setData);
  }, []);

  const { summary, students } = data;

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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Students", value: summary.students, color: "#818cf8" },
          { label: "Active Students", value: summary.activeStudents, color: "#34d399" },
          { label: "Collected Fees", value: `Rs. ${summary.collectedFees.toLocaleString()}`, color: "#60a5fa" },
          { label: "Pending Fees", value: `Rs. ${summary.pendingFees.toLocaleString()}`, color: "#f87171" },
          { label: "Pass Rate", value: `${summary.passRate}%`, color: "#f59e0b" },
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
              { label: "Scheduled periods", value: summary.schedules, color: "#a5b4fc" },
              { label: "Fee defaulters", value: summary.defaulters, color: "#f87171" },
              { label: "Pending admissions", value: summary.pendingAdmissions, color: "#f59e0b" },
              { label: "Teachers", value: summary.teachers, color: "#34d399" },
              { label: "Attendance today", value: `${summary.attendancePresent}/${summary.attendanceTotal}`, color: "#60a5fa" },
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
                <div style={{ fontSize: 12, color: schoolMuted, marginTop: 4 }}>Roll {student.rollNo} | Class {student.className}{student.section ? `-${student.section}` : ""}</div>
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
