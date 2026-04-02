"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const hotelFont = "'Outfit','Inter',sans-serif";
export const hotelBg = "rgba(255,255,255,0.03)";
export const hotelBorder = "rgba(255,255,255,0.07)";
export const hotelMuted = "rgba(255,255,255,0.45)";

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function mapRoomRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    number: record.title,
    type: String(record.data?.type || "Standard"),
    floor: String(record.data?.floor || ""),
    rate: Number(record.amount || 0),
    capacity: Number(record.data?.capacity || 1),
    status: String(record.status || "available"),
  }));
}

export function mapReservationRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    guest: record.title,
    room: String(record.data?.room || ""),
    checkIn: String(record.date || "").slice(0, 10),
    checkOut: String(record.data?.checkOut || ""),
    phone: String(record.data?.phone || ""),
    adults: Number(record.data?.adults || 1),
    children: Number(record.data?.children || 0),
    amount: Number(record.amount || 0),
    status: String(record.status || "reserved"),
  }));
}

export function mapHousekeepingRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    room: record.title,
    task: String(record.data?.task || "Cleaning"),
    assignedTo: String(record.data?.assignedTo || ""),
    priority: String(record.data?.priority || "normal"),
    notes: String(record.data?.notes || ""),
    status: String(record.status || "pending"),
  }));
}

export function mapRoomServiceRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    room: record.title,
    items: String(record.data?.items || ""),
    amount: Number(record.amount || 0),
    notes: String(record.data?.notes || ""),
    time: record.createdAt ? new Date(record.createdAt).toLocaleTimeString() : "",
    status: String(record.status || "pending"),
  }));
}

export function mapHotelFolioRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    guest: record.title,
    room: String(record.data?.room || ""),
    charges: Number(record.amount || 0),
    serviceCharges: Number(record.data?.serviceCharges || 0),
    taxes: Number(record.data?.taxes || 0),
    paid: Number(record.data?.paid || 0),
    status: String(record.status || "open"),
    checkOut: String(record.date || "").slice(0, 10),
  }));
}

export function mapGuestHistoryRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    guest: record.title,
    room: String(record.data?.room || ""),
    visits: Number(record.data?.visits || 0),
    lastStay: String(record.data?.lastStay || record.date || "").slice(0, 10),
    phone: String(record.data?.phone || ""),
    totalSpend: Number(record.amount || 0),
    notes: String(record.data?.notes || ""),
  }));
}
