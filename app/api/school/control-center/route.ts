import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

function normalizeRole(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

export async function GET(req: NextRequest) {
  const role = normalizeRole(req.headers.get("x-user-role"));
  if (!["ADMIN", "ACCOUNTANT", "VIEWER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const [students, fees, schedules, exams, admissions, attendance, teachers] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "student" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "fee_record" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "class_period" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "exam_result" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "admission" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "student_attendance" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "teacher" }, orderBy: { createdAt: "desc" } }),
  ]);

  const mappedStudents = students.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      rollNo: String(data.rollNo || record.id),
      name: record.title,
      className: String(data.class || ""),
      section: String(data.section || ""),
      dob: String(data.dob || ""),
      guardian: String(data.guardian || ""),
      phone: String(data.phone || ""),
      feeStatus: String(record.status || "pending"),
      admissionDate: String(record.date || data.admissionDate || "").slice(0, 10),
      studentStatus: String(data.studentStatus || "active"),
    };
  });

  const mappedFees = fees.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      student: record.title,
      className: String(data.class || ""),
      month: String(data.month || ""),
      amount: Number(record.amount || 0),
      dueDate: String(record.date || data.dueDate || "").slice(0, 10),
      paidDate: String(data.paidDate || ""),
      status: String(record.status || "pending"),
      paymentMethod: String(data.paymentMethod || ""),
    };
  });

  const mappedSchedules = schedules.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      subject: record.title,
      teacher: String(data.teacher || ""),
      className: String(data.class || ""),
      room: String(data.room || ""),
      day: String(data.day || "Monday"),
      time: String(data.time || ""),
      period: Number(data.period || 1),
    };
  });

  const mappedExams = exams.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    const totalMarks = Number(data.totalMarks || 100);
    const obtainedMarks = Number(data.obtainedMarks || 0);
    const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;
    return {
      id: record.id,
      student: record.title,
      rollNo: String(data.rollNo || ""),
      className: String(data.class || ""),
      examName: String(data.examName || ""),
      totalMarks,
      obtainedMarks,
      percentage,
      grade: percentage >= 90 ? "A+" : percentage >= 80 ? "A" : percentage >= 70 ? "B" : percentage >= 60 ? "C" : percentage >= 50 ? "D" : "F",
      status: String(record.status || (percentage >= 50 ? "pass" : "fail")),
    };
  });

  const mappedAdmissions = admissions.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      applicant: record.title,
      className: String(data.class || ""),
      guardian: String(data.guardian || ""),
      phone: String(data.phone || ""),
      interviewDate: String(record.date || data.interviewDate || "").slice(0, 10),
      status: String(record.status || "pending"),
    };
  });

  const mappedAttendance = attendance.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      student: record.title,
      className: String(data.class || ""),
      date: String(record.date || "").slice(0, 10),
      status: String(record.status || "present"),
      remarks: String(data.remarks || ""),
    };
  });

  const mappedTeachers = teachers.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      name: record.title,
      subject: String(data.subject || ""),
      classes: String(data.classes || ""),
      phone: String(data.phone || ""),
      room: String(data.room || ""),
      status: String(record.status || "active"),
    };
  });

  const passRate = mappedExams.length
    ? Math.round((mappedExams.filter((item) => item.status === "pass").length / mappedExams.length) * 100)
    : 0;

  return NextResponse.json({
    summary: {
      students: mappedStudents.length,
      activeStudents: mappedStudents.filter((item) => item.studentStatus === "active").length,
      defaulters: mappedStudents.filter((item) => item.feeStatus === "overdue").length,
      collectedFees: mappedFees.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0),
      pendingFees: mappedFees.filter((item) => item.status !== "paid").reduce((sum, item) => sum + item.amount, 0),
      schedules: mappedSchedules.length,
      exams: mappedExams.length,
      passRate,
      pendingAdmissions: mappedAdmissions.filter((item) => item.status === "pending").length,
      teachers: mappedTeachers.length,
      attendancePresent: mappedAttendance.filter((item) => item.status === "present").length,
      attendanceTotal: mappedAttendance.length,
    },
    students: mappedStudents,
    fees: mappedFees,
    schedules: mappedSchedules,
    exams: mappedExams,
    admissions: mappedAdmissions,
    attendance: mappedAttendance,
    teachers: mappedTeachers,
  });
}
