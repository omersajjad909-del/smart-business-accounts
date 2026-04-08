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

  const patients = patientRecords.map((record) => ({
    id: record.id, mrNo: String(record.data?.mrNo || record.title), name: record.title, age: Number(record.data?.age || 0),
    doctor: String(record.data?.doctor || ""), diagnosis: String(record.data?.diagnosis || ""), phone: String(record.data?.phone || ""),
    status: String(record.status || "opd"), admitDate: String(record.date || record.data?.admitDate || ""),
  }));
  const appointments = appointmentRecords.map((record) => ({
    id: record.id, apptNo: String(record.data?.apptNo || record.title), patient: record.title, doctor: String(record.data?.doctor || ""),
    department: String(record.data?.department || ""), date: String(record.date || record.data?.date || ""), time: String(record.data?.time || ""),
    type: String(record.data?.type || "consultation"), status: String(record.status || "scheduled"),
  }));
  const prescriptions = prescriptionRecords.map((record) => ({
    id: record.id, rxNo: String(record.data?.rxNo || record.title), patient: record.title, doctor: String(record.data?.doctor || ""),
    date: String(record.date || record.data?.date || ""), diagnosis: String(record.data?.diagnosis || ""),
    medicines: Array.isArray(record.data?.medicines) ? (record.data?.medicines as unknown[]) : [], status: String(record.status || "active"),
  }));
  const labs = labRecords.map((record) => ({
    id: record.id, labNo: String(record.data?.labNo || record.title), patient: record.title, doctor: String(record.data?.doctor || ""),
    requestDate: String(record.date || record.data?.requestDate || ""), tests: Array.isArray(record.data?.tests) ? (record.data?.tests as string[]) : [],
    urgent: Boolean(record.data?.urgent), status: String(record.status || "requested"), results: String(record.data?.results || ""),
  }));

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
