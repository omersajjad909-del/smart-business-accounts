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

  const [patientRecords, appointmentRecords, prescriptionRecords, labRecords] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "patient" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "appointment" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "prescription" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "lab_test" }, orderBy: { createdAt: "desc" } }),
  ]);

  const patients = patientRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id, mrNo: String(data.mrNo || record.title), name: record.title, age: Number(data.age || 0),
      doctor: String(data.doctor || ""), diagnosis: String(data.diagnosis || ""), phone: String(data.phone || ""),
      status: String(record.status || "opd"), admitDate: String(record.date || data.admitDate || ""),
    };
  });
  const appointments = appointmentRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id, apptNo: String(data.apptNo || record.title), patient: record.title, doctor: String(data.doctor || ""),
      department: String(data.department || ""), date: String(record.date || data.date || ""), time: String(data.time || ""),
      type: String(data.type || "consultation"), status: String(record.status || "scheduled"),
    };
  });
  const prescriptions = prescriptionRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id, rxNo: String(data.rxNo || record.title), patient: record.title, doctor: String(data.doctor || ""),
      date: String(record.date || data.date || ""), diagnosis: String(data.diagnosis || ""),
      medicines: Array.isArray(data.medicines) ? (data.medicines as unknown[]) : [], status: String(record.status || "active"),
    };
  });
  const labs = labRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id, labNo: String(data.labNo || record.title), patient: record.title, doctor: String(data.doctor || ""),
      requestDate: String(record.date || data.requestDate || ""), tests: Array.isArray(data.tests) ? (data.tests as string[]) : [],
      urgent: Boolean(data.urgent), status: String(record.status || "requested"), results: String(data.results || ""),
    };
  });

  const today = new Date().toISOString().slice(0, 10);
  return NextResponse.json({
    summary: {
      patients: patients.length,
      activePatients: patients.filter((item) => item.status === "admitted" || item.status === "icu").length,
      todayAppointments: appointments.filter((item) => item.date.startsWith(today)).length,
      completedAppointments: appointments.filter((item) => item.status === "completed").length,
      activePrescriptions: prescriptions.filter((item) => item.status === "active").length,
      completedPrescriptions: prescriptions.filter((item) => item.status === "completed").length,
      pendingLabs: labs.filter((item) => item.status !== "completed").length,
      urgentPendingLabs: labs.filter((item) => item.urgent && item.status !== "completed").length,
      icuPatients: patients.filter((item) => item.status === "icu").length,
    },
    patients,
    appointments,
    prescriptions,
    labs,
  });
}
