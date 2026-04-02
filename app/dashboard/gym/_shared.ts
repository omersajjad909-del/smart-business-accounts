"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const gymFont = "'Outfit','Inter',sans-serif";
export const gymBg = "rgba(255,255,255,.03)";
export const gymBorder = "rgba(255,255,255,.07)";
export const gymMuted = "rgba(255,255,255,.58)";

export type GymMemberStatus = "Active" | "Expiring" | "Expired";
export type GymClassStatus = "Open" | "Full" | "Cancelled";
export type GymTrainerStatus = "Active" | "Off Duty";

export type GymMembership = {
  id: string;
  memberId: string;
  name: string;
  plan: string;
  startDate: string;
  endDate: string;
  status: GymMemberStatus;
  daysLeft: number;
  fee: number;
  paymentStatus: string;
};

export type GymClass = {
  id: string;
  classId: string;
  name: string;
  instructor: string;
  days: string;
  time: string;
  duration: number;
  capacity: number;
  enrolled: number;
  status: GymClassStatus;
};

export type GymTrainer = {
  id: string;
  trainerId: string;
  name: string;
  specialization: string;
  activeClients: number;
  salary: number;
  status: GymTrainerStatus;
  rating: number;
};

export function mapGymMemberships(records: BusinessRecord[]): GymMembership[] {
  return records.map((record) => ({
    id: record.id,
    memberId: String(record.data?.memberId || `M-${record.id.slice(-6).toUpperCase()}`),
    name: record.title,
    plan: String(record.data?.plan || "Monthly"),
    startDate: String(record.date || record.data?.startDate || ""),
    endDate: String(record.data?.endDate || ""),
    status: (record.status as GymMemberStatus) || "Active",
    daysLeft: Number(record.data?.daysLeft || 0),
    fee: Number(record.amount || record.data?.fee || 0),
    paymentStatus: String(record.data?.paymentStatus || "Paid"),
  }));
}

export function mapGymClasses(records: BusinessRecord[]): GymClass[] {
  return records.map((record) => ({
    id: record.id,
    classId: String(record.data?.classId || `CLS-${record.id.slice(-6).toUpperCase()}`),
    name: record.title,
    instructor: String(record.data?.instructor || ""),
    days: String(record.data?.days || ""),
    time: String(record.data?.time || ""),
    duration: Number(record.data?.duration || 60),
    capacity: Number(record.data?.capacity || 0),
    enrolled: Number(record.data?.enrolled || 0),
    status: (record.status as GymClassStatus) || "Open",
  }));
}

export function mapGymTrainers(records: BusinessRecord[]): GymTrainer[] {
  return records.map((record) => ({
    id: record.id,
    trainerId: String(record.data?.trainerId || `TRN-${record.id.slice(-6).toUpperCase()}`),
    name: record.title,
    specialization: String(record.data?.specialization || "General Fitness"),
    activeClients: Number(record.data?.activeClients || 0),
    salary: Number(record.amount || record.data?.salary || 0),
    status: (record.status as GymTrainerStatus) || "Active",
    rating: Number(record.data?.rating || 4),
  }));
}

export function gymStatusColor(status: string) {
  const colors: Record<string, string> = {
    Active: "#34d399",
    Expiring: "#fbbf24",
    Expired: "#f87171",
    Open: "#60a5fa",
    Full: "#f87171",
    Cancelled: "#6b7280",
    "Off Duty": "#f59e0b",
  };
  return colors[status] || "#a78bfa";
}
