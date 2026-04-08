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
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const [membershipRecords, classRecords, trainerRecords] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "gym_member" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "gym_class" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "trainer" }, orderBy: { createdAt: "desc" } }),
  ]);

  const memberships = membershipRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      memberId: String(data.memberId || `M-${row.id.slice(-6).toUpperCase()}`),
      name: row.title,
      plan: String(data.plan || "Monthly"),
      startDate: String(row.date || data.startDate || ""),
      endDate: String(data.endDate || ""),
      status: String(row.status || "Active"),
      daysLeft: Number(data.daysLeft || 0),
      fee: Number(row.amount || data.fee || 0),
      paymentStatus: String(data.paymentStatus || "Paid"),
    };
  });

  const classes = classRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      classId: String(data.classId || `CLS-${row.id.slice(-6).toUpperCase()}`),
      name: row.title,
      instructor: String(data.instructor || ""),
      days: String(data.days || ""),
      time: String(data.time || ""),
      duration: Number(data.duration || 60),
      capacity: Number(data.capacity || 0),
      enrolled: Number(data.enrolled || 0),
      status: String(row.status || "Open"),
    };
  });

  const trainers = trainerRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      trainerId: String(data.trainerId || `TRN-${row.id.slice(-6).toUpperCase()}`),
      name: row.title,
      specialization: String(data.specialization || "General Fitness"),
      activeClients: Number(data.activeClients || 0),
      salary: Number(row.amount || data.salary || 0),
      status: String(row.status || "Active"),
      rating: Number(data.rating || 4),
    };
  });

  const occupancy = classes.reduce((sum, row) => sum + row.enrolled, 0);
  const capacity = classes.reduce((sum, row) => sum + row.capacity, 0);
  const paidRevenue = memberships.filter((row) => row.paymentStatus === "Paid").reduce((sum, row) => sum + row.fee, 0);
  const totalClients = trainers.reduce((sum, row) => sum + row.activeClients, 0);

  return NextResponse.json({
    summary: {
      members: memberships.length,
      activeMembers: memberships.filter((row) => row.status === "Active").length,
      expiringMembers: memberships.filter((row) => row.status === "Expiring").length,
      expiredMembers: memberships.filter((row) => row.status === "Expired").length,
      classes: classes.length,
      openClasses: classes.filter((row) => row.status === "Open").length,
      cancelledClasses: classes.filter((row) => row.status === "Cancelled").length,
      trainers: trainers.length,
      activeTrainers: trainers.filter((row) => row.status === "Active").length,
      paidRevenue,
      overdueMembers: memberships.filter((row) => row.paymentStatus !== "Paid").length,
      occupancyRate: capacity ? Math.round((occupancy / capacity) * 100) : 0,
      trainerUtilization: trainers.length ? Math.round(totalClients / trainers.length) : 0,
    },
    memberships,
    classes,
    trainers,
  });
}
