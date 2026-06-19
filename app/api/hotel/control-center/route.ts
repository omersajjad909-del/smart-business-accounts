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

  const [roomRecords, reservationRecords, housekeepingRecords, serviceRecords, laundryRecords, complaintRecords] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "hotel_room" }, orderBy: { title: "asc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "hotel_reservation" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "housekeeping_task" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "room_service_order" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "hotel_laundry" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "hotel_complaint" }, orderBy: { createdAt: "desc" } }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  const rooms = roomRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id, number: record.title, type: String(data.type || "Standard"), floor: String(data.floor || ""),
      rate: Number(record.amount || 0), capacity: Number(data.capacity || 1), status: String(record.status || "available"),
    };
  });

  const reservations = reservationRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id, guest: record.title, room: String(data.room || ""), checkIn: String(record.date || "").slice(0, 10),
      checkOut: String(data.checkOut || ""), phone: String(data.phone || ""), adults: Number(data.adults || 1),
      children: Number(data.children || 0), amount: Number(record.amount || 0), status: String(record.status || "reserved"),
    };
  });

  const housekeeping = housekeepingRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id, room: record.title, task: String(data.task || "Cleaning"), assignedTo: String(data.assignedTo || ""),
      priority: String(data.priority || "normal"), notes: String(data.notes || ""), status: String(record.status || "pending"),
    };
  });

  const serviceOrders = serviceRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id, room: record.title, items: String(data.items || ""), amount: Number(record.amount || 0),
      notes: String(data.notes || ""), time: record.createdAt ? new Date(record.createdAt).toLocaleTimeString() : "", status: String(record.status || "pending"),
    };
  });

  const laundry = laundryRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id, guest: record.title, room: String(data.room || ""), items: String(data.items || ""),
      notes: String(data.notes || ""), amount: Number(record.amount || 0), status: String(record.status || "pickup_pending"),
      date: String(record.date || "").slice(0, 10),
    };
  });

  const complaints = complaintRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id, title: record.title, guestName: String(data.guestName || ""), room: String(data.room || ""),
      category: String(data.category || "general"), priority: String(data.priority || "medium"),
      notes: String(data.notes || ""), status: String(record.status || "open"),
      date: String(record.date || "").slice(0, 10),
    };
  });

  const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
  const todayCheckIns = reservations.filter((r) => r.checkIn === today && r.status === "checked_in").length;
  const todayCheckOuts = reservations.filter((r) => r.checkOut === today && r.status === "checked_out").length;
  const expectedArrivals = reservations.filter((r) => r.checkIn === today && r.status === "reserved").length;

  return NextResponse.json({
    summary: {
      rooms: rooms.length,
      occupiedRooms,
      occupancyRate: rooms.length ? Math.round((occupiedRooms / rooms.length) * 100) : 0,
      checkedInGuests: reservations.filter((r) => r.status === "checked_in").length,
      reservedGuests: reservations.filter((r) => r.status === "reserved").length,
      serviceRevenue: serviceOrders.filter((r) => r.status === "delivered").reduce((s, r) => s + r.amount, 0),
      pendingHousekeeping: housekeeping.filter((r) => r.status !== "completed").length,
      maintenanceRooms: rooms.filter((r) => r.status === "maintenance").length,
      todayCheckIns,
      todayCheckOuts,
      expectedArrivals,
      openComplaints: complaints.filter((r) => r.status === "open" || r.status === "in_progress").length,
      laundryPending: laundry.filter((r) => r.status === "pickup_pending").length,
      laundryInProgress: laundry.filter((r) => r.status === "washing" || r.status === "ironing").length,
      laundryReady: laundry.filter((r) => r.status === "ready").length,
      revenueToday: serviceOrders.filter((r) => r.status === "delivered" && r.time.startsWith(today)).reduce((s, r) => s + r.amount, 0),
      pendingReservations: reservations.filter((r) => r.status === "reserved").length,
    },
    rooms,
    reservations,
    housekeeping,
    serviceOrders,
    laundry,
    complaints,
  });
}
