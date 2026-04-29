"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const travelAccent = "#38bdf8";

export type TravelControlCenter = {
  summary: {
    tickets: number;
    issuedTickets: number;
    pendingTickets: number;
    visaCases: number;
    activeVisaCases: number;
    hotels: number;
    confirmedHotels: number;
    tours: number;
    confirmedTours: number;
    settlements: number;
    pendingSettlements: number;
    monthlySales: number;
    supplierExposure: number;
    passports: number;
  };
  tickets: ReturnType<typeof mapTravelTicket>[];
  visas: ReturnType<typeof mapVisaCase>[];
  hotels: ReturnType<typeof mapHotelBooking>[];
  tours: ReturnType<typeof mapGroupTour>[];
  settlements: ReturnType<typeof mapTravelSettlement>[];
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

export function mapTravelTicket(record: BusinessRecord) {
  return {
    id: record.id,
    booking: record.title,
    passenger: String(record.data?.passenger || ""),
    airline: String(record.data?.airline || ""),
    supplier: String(record.data?.supplier || record.data?.airline || ""),
    route: String(record.data?.route || ""),
    pnr: String(record.data?.pnr || ""),
    travelDate: String(record.date || "").slice(0, 10),
    amount: Number(record.amount || 0),
    cost: Number(record.data?.cost || 0),
    status: record.status || "quoted",
    invoiceId: String(record.data?.invoiceId || ""),
    invoiceNo: String(record.data?.invoiceNo || ""),
    settlementId: String(record.data?.settlementId || ""),
    settlementRef: String(record.data?.settlementRef || ""),
  };
}

export function mapVisaCase(record: BusinessRecord) {
  return {
    id: record.id,
    caseRef: record.title,
    applicant: String(record.data?.applicant || ""),
    country: String(record.data?.country || ""),
    supplier: String(record.data?.supplier || record.data?.embassy || ""),
    passportNo: String(record.data?.passportNo || ""),
    submissionDate: String(record.date || "").slice(0, 10),
    amount: Number(record.amount || 0),
    cost: Number(record.data?.cost || 0),
    status: record.status || "document_check",
    invoiceId: String(record.data?.invoiceId || ""),
    invoiceNo: String(record.data?.invoiceNo || ""),
    settlementId: String(record.data?.settlementId || ""),
    settlementRef: String(record.data?.settlementRef || ""),
  };
}

export function mapHotelBooking(record: BusinessRecord) {
  return {
    id: record.id,
    bookingRef: record.title,
    guestName: String(record.data?.guestName || ""),
    hotelName: String(record.data?.hotelName || ""),
    destination: String(record.data?.destination || ""),
    checkIn: String(record.date || "").slice(0, 10),
    checkOut: String(record.data?.checkOut || "").slice(0, 10),
    rooms: Number(record.data?.rooms || 1),
    mealPlan: String(record.data?.mealPlan || "room_only"),
    supplier: String(record.data?.supplier || ""),
    amount: Number(record.amount || 0),
    cost: Number(record.data?.cost || 0),
    status: record.status || "quoted",
    invoiceId: String(record.data?.invoiceId || ""),
    invoiceNo: String(record.data?.invoiceNo || ""),
    settlementId: String(record.data?.settlementId || ""),
    settlementRef: String(record.data?.settlementRef || ""),
  };
}

export function mapGroupTour(record: BusinessRecord) {
  return {
    id: record.id,
    tourRef: record.title,
    tourName: String(record.data?.tourName || ""),
    destination: String(record.data?.destination || ""),
    departureDate: String(record.date || "").slice(0, 10),
    returnDate: String(record.data?.returnDate || "").slice(0, 10),
    pax: Number(record.data?.pax || 1),
    leader: String(record.data?.leader || ""),
    supplier: String(record.data?.supplier || ""),
    amount: Number(record.amount || 0),
    cost: Number(record.data?.cost || 0),
    status: record.status || "enquiry",
    invoiceId: String(record.data?.invoiceId || ""),
    invoiceNo: String(record.data?.invoiceNo || ""),
    settlementId: String(record.data?.settlementId || ""),
    settlementRef: String(record.data?.settlementRef || ""),
  };
}

export function mapTravelSettlement(record: BusinessRecord) {
  return {
    id: record.id,
    settlementRef: record.title,
    supplierName: String(record.data?.supplierName || ""),
    customerName: String(record.data?.customerName || ""),
    sourceTitle: String(record.data?.sourceTitle || ""),
    invoiceNo: String(record.data?.invoiceNo || ""),
    dueDate: String(record.date || "").slice(0, 10),
    amount: Number(record.amount || 0),
    status: record.status || "pending",
  };
}
