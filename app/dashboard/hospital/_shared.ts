"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const hospitalFont = "'Outfit','Inter',sans-serif";
export const hospitalBg = "rgba(255,255,255,0.03)";
export const hospitalBorder = "rgba(255,255,255,0.07)";
export const hospitalMuted = "rgba(255,255,255,0.45)";

export type PatientStatus = "admitted" | "discharged" | "icu" | "opd";
export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
export type PrescriptionStatus = "active" | "completed" | "cancelled";
export type LabStatus = "requested" | "sample_collected" | "processing" | "completed";

export type PatientRow = {
  id: string;
  mrNo: string;
  name: string;
  age: number;
  doctor: string;
  diagnosis: string;
  phone: string;
  status: PatientStatus;
  admitDate: string;
};

export type AppointmentRow = {
  id: string;
  apptNo: string;
  patient: string;
  doctor: string;
  department: string;
  date: string;
  time: string;
  type: string;
  status: AppointmentStatus;
};

export type PrescriptionMedicine = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  qty: number;
};

export type PrescriptionRow = {
  id: string;
  rxNo: string;
  patient: string;
  doctor: string;
  date: string;
  diagnosis: string;
  medicines: PrescriptionMedicine[];
  status: PrescriptionStatus;
};

export type LabRow = {
  id: string;
  labNo: string;
  patient: string;
  doctor: string;
  requestDate: string;
  tests: string[];
  urgent: boolean;
  status: LabStatus;
  results: string;
};

export type HospitalControlCenter = {
  summary: {
    patients: number;
    activePatients: number;
    todayAppointments: number;
    completedAppointments: number;
    activePrescriptions: number;
    completedPrescriptions: number;
    pendingLabs: number;
    urgentPendingLabs: number;
    icuPatients: number;
  };
  patients: PatientRow[];
  appointments: AppointmentRow[];
  prescriptions: PrescriptionRow[];
  labs: LabRow[];
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

export function mapPatientRecords(records: BusinessRecord[]): PatientRow[] {
  return records.map((record) => ({
    id: record.id,
    mrNo: String(record.data?.mrNo || record.title),
    name: record.title,
    age: Number(record.data?.age || 0),
    doctor: String(record.data?.doctor || ""),
    diagnosis: String(record.data?.diagnosis || ""),
    phone: String(record.data?.phone || ""),
    status: (record.status as PatientStatus) || "opd",
    admitDate: String(record.date || record.data?.admitDate || ""),
  }));
}

export function mapAppointmentRecords(records: BusinessRecord[]): AppointmentRow[] {
  return records.map((record) => ({
    id: record.id,
    apptNo: String(record.data?.apptNo || record.title),
    patient: record.title,
    doctor: String(record.data?.doctor || ""),
    department: String(record.data?.department || ""),
    date: String(record.date || record.data?.date || ""),
    time: String(record.data?.time || ""),
    type: String(record.data?.type || "consultation"),
    status: (record.status as AppointmentStatus) || "scheduled",
  }));
}

export function mapPrescriptionRecords(records: BusinessRecord[]): PrescriptionRow[] {
  return records.map((record) => ({
    id: record.id,
    rxNo: String(record.data?.rxNo || record.title),
    patient: record.title,
    doctor: String(record.data?.doctor || ""),
    date: String(record.date || record.data?.date || ""),
    diagnosis: String(record.data?.diagnosis || ""),
    medicines: Array.isArray(record.data?.medicines) ? (record.data?.medicines as PrescriptionMedicine[]) : [],
    status: (record.status as PrescriptionStatus) || "active",
  }));
}

export function mapLabRecords(records: BusinessRecord[]): LabRow[] {
  return records.map((record) => ({
    id: record.id,
    labNo: String(record.data?.labNo || record.title),
    patient: record.title,
    doctor: String(record.data?.doctor || ""),
    requestDate: String(record.date || record.data?.requestDate || ""),
    tests: Array.isArray(record.data?.tests) ? (record.data?.tests as string[]) : [],
    urgent: Boolean(record.data?.urgent),
    status: (record.status as LabStatus) || "requested",
    results: String(record.data?.results || ""),
  }));
}
