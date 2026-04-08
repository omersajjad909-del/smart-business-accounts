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

  const [vehicles, drivers, trips, fuelLogs, dispatches, maintenance, expenses] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "vehicle" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "driver" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "trip" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "fuel_log" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "transport_dispatch" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "vehicle_maintenance" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "transport_expense" }, orderBy: { createdAt: "desc" } }),
  ]);

  const mappedVehicles = vehicles.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      regNo: record.title,
      make: String(data.make || ""),
      model: String(data.model || ""),
      year: Number(data.year || 2024),
      type: String(data.type || "truck"),
      capacity: String(data.capacity || ""),
      driver: String(data.driver || ""),
      status: String(record.status || "available"),
      lastService: String(data.lastService || ""),
      nextService: String(data.nextService || ""),
      mileage: Number(data.mileage || 0),
      fuelType: String(data.fuelType || "Diesel"),
    };
  });

  const mappedDrivers = drivers.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      empId: String(data.empId || record.id),
      name: record.title,
      phone: String(data.phone || ""),
      cnic: String(data.cnic || ""),
      licenseNo: String(data.licenseNo || ""),
      licenseExpiry: String(data.licenseExpiry || ""),
      experience: Number(data.experience || 0),
      tripsCompleted: Number(data.trips_completed || 0),
      rating: Number(data.rating || 0),
      status: String(record.status || "available"),
      salary: Number(record.amount || data.salary || 0),
    };
  });

  const mappedTrips = trips.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      tripNo: String(data.tripNo || record.id),
      vehicle: String(data.vehicle || ""),
      driver: String(data.driver || ""),
      from: String(data.from || ""),
      to: String(data.to || ""),
      cargo: String(data.cargo || ""),
      weight: Number(data.weight || 0),
      client: String(data.client || ""),
      date: String(record.date || data.date || "").slice(0, 10),
      startTime: String(data.startTime || ""),
      endTime: String(data.endTime || ""),
      distance: Number(data.distance || 0),
      fare: Number(record.amount || data.fare || 0),
      expenses: Number(data.expenses || 0),
      status: String(record.status || "scheduled"),
    };
  });

  const mappedFuelLogs = fuelLogs.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      vehicle: record.title,
      driver: String(data.driver || ""),
      date: String(record.date || data.date || "").slice(0, 10),
      liters: Number(data.liters || 0),
      pricePerLiter: Number(data.pricePerLiter || 0),
      totalCost: Number(record.amount || data.totalCost || 0),
      odometer: Number(data.odometer || 0),
      station: String(data.station || ""),
      fuelType: String(data.fuelType || "diesel"),
      mileage: Number(data.mileage || 0),
    };
  });

  const mappedDispatches = dispatches.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      dispatchNo: record.title,
      tripId: String(data.tripId || ""),
      tripNo: String(data.tripNo || ""),
      vehicle: String(data.vehicle || ""),
      driver: String(data.driver || ""),
      customer: String(data.customer || ""),
      cargo: String(data.cargo || ""),
      origin: String(data.origin || ""),
      destination: String(data.destination || ""),
      dispatchDate: String(record.date || data.dispatchDate || "").slice(0, 10),
      eta: String(data.eta || ""),
      notes: String(data.notes || ""),
      status: String(record.status || "planned"),
    };
  });

  const mappedMaintenance = maintenance.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      jobNo: record.title,
      vehicle: String(data.vehicle || ""),
      serviceType: String(data.serviceType || ""),
      workshop: String(data.workshop || ""),
      scheduledDate: String(record.date || data.scheduledDate || "").slice(0, 10),
      completionDate: String(data.completionDate || "").slice(0, 10),
      notes: String(data.notes || ""),
      status: String(record.status || "scheduled"),
      cost: Number(record.amount || data.cost || 0),
    };
  });

  const mappedExpenses = expenses.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      expenseNo: record.title,
      vehicle: String(data.vehicle || ""),
      driver: String(data.driver || ""),
      tripId: String(data.tripId || ""),
      tripNo: String(data.tripNo || ""),
      expenseType: String(data.expenseType || ""),
      date: String(record.date || data.date || "").slice(0, 10),
      notes: String(data.notes || ""),
      status: String(record.status || "logged"),
      amount: Number(record.amount || 0),
    };
  });

  return NextResponse.json({
    summary: {
      fleetSize: mappedVehicles.length,
      availableVehicles: mappedVehicles.filter((item) => item.status === "available").length,
      maintenanceVehicles: mappedVehicles.filter((item) => item.status === "maintenance").length,
      drivers: mappedDrivers.length,
      driversOnDuty: mappedDrivers.filter((item) => item.status === "on_duty").length,
      trips: mappedTrips.length,
      activeTrips: mappedTrips.filter((item) => item.status === "in_transit").length,
      completedTrips: mappedTrips.filter((item) => item.status === "completed").length,
      dispatches: mappedDispatches.length,
      activeDispatches: mappedDispatches.filter((item) => item.status === "planned" || item.status === "dispatched").length,
      fuelCost: mappedFuelLogs.reduce((sum, item) => sum + item.totalCost, 0),
      maintenanceCost: mappedMaintenance.reduce((sum, item) => sum + item.cost, 0),
      expenseBooked: mappedExpenses.reduce((sum, item) => sum + item.amount, 0),
      netRevenue: mappedTrips.filter((item) => item.status === "completed").reduce((sum, item) => sum + item.fare - item.expenses, 0),
    },
    vehicles: mappedVehicles,
    drivers: mappedDrivers,
    trips: mappedTrips,
    fuelLogs: mappedFuelLogs,
    dispatches: mappedDispatches,
    maintenance: mappedMaintenance,
    expenses: mappedExpenses,
  });
}
