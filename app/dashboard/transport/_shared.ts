"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const transportFont = "'Outfit','Inter',sans-serif";
export const transportBg = "rgba(255,255,255,.03)";
export const transportBorder = "rgba(255,255,255,.07)";
export const transportMuted = "rgba(255,255,255,.45)";

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function mapVehicleRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    regNo: record.title,
    make: String(record.data?.make || ""),
    model: String(record.data?.model || ""),
    year: Number(record.data?.year || 2024),
    type: String(record.data?.type || "truck"),
    capacity: String(record.data?.capacity || ""),
    driver: String(record.data?.driver || ""),
    status: String(record.status || "available"),
    lastService: String(record.data?.lastService || ""),
    nextService: String(record.data?.nextService || ""),
    mileage: Number(record.data?.mileage || 0),
    fuelType: String(record.data?.fuelType || "Diesel"),
  }));
}

export function mapDriverRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    empId: String(record.data?.empId || record.id),
    name: record.title,
    phone: String(record.data?.phone || ""),
    cnic: String(record.data?.cnic || ""),
    licenseNo: String(record.data?.licenseNo || ""),
    licenseExpiry: String(record.data?.licenseExpiry || ""),
    experience: Number(record.data?.experience || 0),
    tripsCompleted: Number(record.data?.trips_completed || 0),
    rating: Number(record.data?.rating || 0),
    status: String(record.status || "available"),
    salary: Number(record.amount || record.data?.salary || 0),
  }));
}

export function mapTripRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    tripNo: String(record.data?.tripNo || record.id),
    vehicle: String(record.data?.vehicle || ""),
    driver: String(record.data?.driver || ""),
    from: String(record.data?.from || ""),
    to: String(record.data?.to || ""),
    cargo: String(record.data?.cargo || ""),
    weight: Number(record.data?.weight || 0),
    client: String(record.data?.client || ""),
    date: String(record.date || record.data?.date || "").slice(0, 10),
    startTime: String(record.data?.startTime || ""),
    endTime: String(record.data?.endTime || ""),
    distance: Number(record.data?.distance || 0),
    fare: Number(record.amount || record.data?.fare || 0),
    expenses: Number(record.data?.expenses || 0),
    status: String(record.status || "scheduled"),
  }));
}

export function mapFuelRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    vehicle: record.title,
    driver: String(record.data?.driver || ""),
    date: String(record.date || record.data?.date || "").slice(0, 10),
    liters: Number(record.data?.liters || 0),
    pricePerLiter: Number(record.data?.pricePerLiter || 0),
    totalCost: Number(record.amount || record.data?.totalCost || 0),
    odometer: Number(record.data?.odometer || 0),
    station: String(record.data?.station || ""),
    fuelType: String(record.data?.fuelType || "diesel"),
    mileage: Number(record.data?.mileage || 0),
  }));
}

export function mapDispatchRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    dispatchNo: record.title,
    tripId: String(record.data?.tripId || ""),
    tripNo: String(record.data?.tripNo || ""),
    vehicle: String(record.data?.vehicle || ""),
    driver: String(record.data?.driver || ""),
    customer: String(record.data?.customer || ""),
    cargo: String(record.data?.cargo || ""),
    origin: String(record.data?.origin || ""),
    destination: String(record.data?.destination || ""),
    dispatchDate: String(record.date || record.data?.dispatchDate || "").slice(0, 10),
    eta: String(record.data?.eta || ""),
    notes: String(record.data?.notes || ""),
    status: String(record.status || "planned"),
  }));
}

export function mapMaintenanceRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    jobNo: record.title,
    vehicle: String(record.data?.vehicle || ""),
    serviceType: String(record.data?.serviceType || ""),
    workshop: String(record.data?.workshop || ""),
    scheduledDate: String(record.date || record.data?.scheduledDate || "").slice(0, 10),
    completionDate: String(record.data?.completionDate || "").slice(0, 10),
    notes: String(record.data?.notes || ""),
    status: String(record.status || "scheduled"),
    cost: Number(record.amount || record.data?.cost || 0),
  }));
}

export function mapTransportExpenseRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    expenseNo: record.title,
    vehicle: String(record.data?.vehicle || ""),
    driver: String(record.data?.driver || ""),
    tripId: String(record.data?.tripId || ""),
    tripNo: String(record.data?.tripNo || ""),
    expenseType: String(record.data?.expenseType || ""),
    date: String(record.date || record.data?.date || "").slice(0, 10),
    notes: String(record.data?.notes || ""),
    status: String(record.status || "logged"),
    amount: Number(record.amount || 0),
  }));
}
