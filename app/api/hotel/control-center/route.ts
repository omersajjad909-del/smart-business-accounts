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

  const [roomRecords, reservationRecords, housekeepingRecords, serviceRecords] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "hotel_room" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "hotel_reservation" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "housekeeping_task" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "room_service_order" }, orderBy: { createdAt: "desc" } }),
  ]);

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

  const occupiedRooms = rooms.filter((item) => item.status === "occupied").length;
  return NextResponse.json({
    summary: {
      rooms: rooms.length,
      occupiedRooms,
      occupancyRate: rooms.length ? Math.round((occupiedRooms / rooms.length) * 100) : 0,
      checkedInGuests: reservations.filter((item) => item.status === "checked_in").length,
      reservedGuests: reservations.filter((item) => item.status === "reserved").length,
      serviceRevenue: serviceOrders.filter((item) => item.status === "delivered").reduce((sum, item) => sum + item.amount, 0),
      pendingHousekeeping: housekeeping.filter((item) => item.status !== "completed").length,
      maintenanceRooms: rooms.filter((item) => item.status === "maintenance").length,
    },
    rooms,
    reservations,
    housekeeping,
    serviceOrders,
  });
}
