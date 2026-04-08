import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

function normalizeRole(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

function normalizeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : new Date().toISOString();
}

export async function GET(req: NextRequest) {
  const role = normalizeRole(req.headers.get("x-user-role"));
  if (!["ADMIN", "ACCOUNTANT", "VIEWER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const [appointmentRecords, stylistRecords, serviceRecords] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "salon_appointment" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "stylist" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "salon_service" }, orderBy: { createdAt: "desc" } }),
  ]);

  const todayKey = new Date().toISOString().slice(0, 10);

  const appointments = appointmentRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      apptNo: String(data.apptNo || `SA-${row.id.slice(-6).toUpperCase()}`),
      client: row.title,
      phone: String(data.phone || ""),
      stylist: String(data.stylist || ""),
      service: String(data.service || ""),
      duration: Number(data.duration || 60),
      price: Number(row.amount || 0),
      date: normalizeDate(row.date || row.createdAt).slice(0, 10),
      time: String(data.time || "09:00"),
      status: String(row.status || "booked"),
    };
  });

  const stylists = stylistRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      stylistId: String(data.stylistId || `STY-${row.id.slice(-6).toUpperCase()}`),
      name: row.title,
      specialization: String(data.specialization || "Hair Styling"),
      status: String(row.status || "Active"),
      phone: String(data.phone || ""),
      appointmentsToday: Number(data.appointmentsToday || 0),
      monthlyEarnings: Number(row.amount || data.monthlyEarnings || 0),
    };
  });

  const services = serviceRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      serviceId: String(data.serviceId || `SVC-${row.id.slice(-6).toUpperCase()}`),
      name: row.title,
      category: String(data.category || "Hair"),
      duration: Number(data.duration || 0),
      price: Number(row.amount || data.price || 0),
      status: String(row.status || "Active"),
      popular: Boolean(data.popular),
    };
  });

  const completedAppointments = appointments.filter((item) => item.status === "completed");

  return NextResponse.json({
    summary: {
      appointments: appointments.length,
      appointmentsToday: appointments.filter((item) => item.date === todayKey).length,
      openQueue: appointments.filter((item) => ["booked", "confirmed", "in_progress"].includes(item.status)).length,
      completedAppointments: completedAppointments.length,
      cancellationRate: appointments.length ? Math.round((appointments.filter((item) => item.status === "cancelled").length / appointments.length) * 100) : 0,
      stylists: stylists.length,
      activeStylists: stylists.filter((item) => item.status === "Active").length,
      leaveStylists: stylists.filter((item) => item.status === "On Leave").length,
      services: services.length,
      activeServices: services.filter((item) => item.status === "Active").length,
      popularServices: services.filter((item) => item.popular).length,
      completedRevenue: completedAppointments.reduce((sum, item) => sum + item.price, 0),
    },
    appointments,
    stylists,
    services,
  });
}
