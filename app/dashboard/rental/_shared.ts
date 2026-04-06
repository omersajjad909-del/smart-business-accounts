"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const rentalAccent = "#22c55e";

export function mapRentalAgreement(record: BusinessRecord) {
  return {
    id: record.id,
    agreement: record.title,
    customer: String(record.data?.customer || ""),
    asset: String(record.data?.asset || ""),
    startDate: String(record.date || "").slice(0, 10),
    endDate: String(record.data?.endDate || "").slice(0, 10),
    amount: Number(record.amount || 0),
    status: record.status || "draft",
  };
}

export function mapRentalBooking(record: BusinessRecord) {
  return {
    id: record.id,
    booking: record.title,
    customer: String(record.data?.customer || ""),
    asset: String(record.data?.asset || ""),
    pickupDate: String(record.date || "").slice(0, 10),
    returnDate: String(record.data?.returnDate || "").slice(0, 10),
    amount: Number(record.amount || 0),
    status: record.status || "reserved",
  };
}
