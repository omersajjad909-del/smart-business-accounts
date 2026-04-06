"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const mediaAccent = "#a78bfa";

export function mapMediaCampaign(record: BusinessRecord) {
  return {
    id: record.id,
    campaign: record.title,
    client: String(record.data?.client || ""),
    channel: String(record.data?.channel || ""),
    dueDate: String(record.date || "").slice(0, 10),
    budget: Number(record.amount || 0),
    status: record.status || "planning",
  };
}

export function mapMediaClient(record: BusinessRecord) {
  return {
    id: record.id,
    client: record.title,
    industry: String(record.data?.industry || ""),
    manager: String(record.data?.manager || ""),
    retainer: Number(record.amount || 0),
    status: record.status || "active",
  };
}

export function mapMediaPlan(record: BusinessRecord) {
  return {
    id: record.id,
    plan: record.title,
    campaign: String(record.data?.campaign || ""),
    channel: String(record.data?.channel || ""),
    startDate: String(record.date || "").slice(0, 10),
    spend: Number(record.amount || 0),
    status: record.status || "draft",
  };
}
