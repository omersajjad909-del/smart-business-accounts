import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const schoolFont = "'Outfit','Inter',sans-serif";
export const schoolBg = "rgba(255,255,255,0.03)";
export const schoolBorder = "rgba(255,255,255,0.07)";
export const schoolMuted = "rgba(255,255,255,0.45)";

export type SchoolStudent = ReturnType<typeof mapStudentRecords>[number];
export type SchoolFee = ReturnType<typeof mapFeeRecords>[number];
export type SchoolSchedule = ReturnType<typeof mapScheduleRecords>[number];
export type SchoolExam = ReturnType<typeof mapExamRecords>[number];
export type SchoolAdmission = ReturnType<typeof mapAdmissionRecords>[number];
export type SchoolAttendance = ReturnType<typeof mapAttendanceRecords>[number];
export type SchoolTeacher = ReturnType<typeof mapTeacherRecords>[number];

export type SchoolControlCenter = {
  summary: {
    students: number;
    activeStudents: number;
    defaulters: number;
    collectedFees: number;
    pendingFees: number;
    schedules: number;
    exams: number;
    passRate: number;
    pendingAdmissions: number;
    teachers: number;
    attendancePresent: number;
    attendanceTotal: number;
  };
  students: SchoolStudent[];
  fees: SchoolFee[];
  schedules: SchoolSchedule[];
  exams: SchoolExam[];
  admissions: SchoolAdmission[];
  attendance: SchoolAttendance[];
  teachers: SchoolTeacher[];
};

export async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function mapStudentRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    rollNo: String(record.data?.rollNo || record.id),
    name: record.title,
    className: String(record.data?.class || ""),
    section: String(record.data?.section || ""),
    dob: String(record.data?.dob || ""),
    guardian: String(record.data?.guardian || ""),
    phone: String(record.data?.phone || ""),
    feeStatus: String(record.status || "pending"),
    admissionDate: String(record.date || record.data?.admissionDate || "").slice(0, 10),
    studentStatus: String(record.data?.studentStatus || "active"),
  }));
}

export function mapFeeRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    student: record.title,
    className: String(record.data?.class || ""),
    month: String(record.data?.month || ""),
    amount: Number(record.amount || 0),
    dueDate: String(record.date || record.data?.dueDate || "").slice(0, 10),
    paidDate: String(record.data?.paidDate || ""),
    status: String(record.status || "pending"),
    paymentMethod: String(record.data?.paymentMethod || ""),
  }));
}

export function mapScheduleRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    subject: record.title,
    teacher: String(record.data?.teacher || ""),
    className: String(record.data?.class || ""),
    room: String(record.data?.room || ""),
    day: String(record.data?.day || "Monday"),
    time: String(record.data?.time || ""),
    period: Number(record.data?.period || 1),
  }));
}

export function mapExamRecords(records: BusinessRecord[]) {
  return records.map((record) => {
    const totalMarks = Number(record.data?.totalMarks || 100);
    const obtainedMarks = Number(record.data?.obtainedMarks || 0);
    const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;
    const grade = percentage >= 90 ? "A+" : percentage >= 80 ? "A" : percentage >= 70 ? "B" : percentage >= 60 ? "C" : percentage >= 50 ? "D" : "F";
    return {
      id: record.id,
      student: record.title,
      rollNo: String(record.data?.rollNo || ""),
      className: String(record.data?.class || ""),
      examName: String(record.data?.examName || ""),
      totalMarks,
      obtainedMarks,
      percentage,
      grade,
      status: String(record.status || (percentage >= 50 ? "pass" : "fail")),
    };
  });
}

export function mapAdmissionRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    applicant: record.title,
    className: String(record.data?.class || ""),
    guardian: String(record.data?.guardian || ""),
    phone: String(record.data?.phone || ""),
    interviewDate: String(record.date || record.data?.interviewDate || "").slice(0, 10),
    status: String(record.status || "pending"),
  }));
}

export function mapAttendanceRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    student: record.title,
    className: String(record.data?.class || ""),
    date: String(record.date || "").slice(0, 10),
    status: String(record.status || "present"),
    remarks: String(record.data?.remarks || ""),
  }));
}

export function mapTeacherRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    name: record.title,
    subject: String(record.data?.subject || ""),
    classes: String(record.data?.classes || ""),
    phone: String(record.data?.phone || ""),
    room: String(record.data?.room || ""),
    status: String(record.status || "active"),
  }));
}
