import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { resolveCompanyId } from "@/lib/tenant";
import { resolveUnmappedPunches } from "@/lib/attendanceProcessing";

/**
 * The join between "user 7 on the machine" and "Ali Raza in payroll".
 * Everything downstream is inert until this is filled in, so the GET also
 * reports enrollment numbers that have punched but match nobody yet.
 */

// GET: current mappings + enrollment numbers still waiting for an owner
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const employees = await prisma.employee.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        department: true,
        biometricId: true,
        shiftStart: true,
        shiftEnd: true,
      },
      orderBy: { firstName: "asc" },
    });

    const orphans = await prisma.attendancePunch.groupBy({
      by: ["biometricId"],
      where: { companyId, employeeId: null },
      _count: { _all: true },
      _max: { punchTime: true },
    });

    return NextResponse.json({
      employees,
      unmapped: orphans
        .map((o) => ({
          biometricId: o.biometricId,
          punches: o._count._all,
          lastSeen: o._max.punchTime,
        }))
        .sort((a, b) => b.punches - a.punches),
    });
  } catch (error) {
    console.error("Error loading biometric mapping:", error);
    return NextResponse.json({ error: "Failed to load mapping" }, { status: 500 });
  }
}

// PUT: save mappings, then adopt the punch history they unlock
export async function PUT(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
  if (guard) return guard;

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json();
    const rows: any[] = Array.isArray(body?.mappings) ? body.mappings : [];
    if (rows.length === 0) {
      return NextResponse.json({ error: "mappings array is required" }, { status: 400 });
    }

    // Two employees on one enrollment number would silently split someone's
    // attendance in half, so catch it before writing anything.
    const claimed = new Map<string, string>();
    for (const row of rows) {
      const value = String(row?.biometricId ?? "").trim();
      if (!value) continue;
      const owner = claimed.get(value);
      if (owner && owner !== row?.employeeId) {
        return NextResponse.json(
          { error: `Enrollment number ${value} is assigned to two employees` },
          { status: 400 }
        );
      }
      claimed.set(value, String(row.employeeId));
    }

    const ids = rows.map((r) => String(r?.employeeId || "")).filter(Boolean);
    const owned = await prisma.employee.findMany({
      where: { id: { in: ids }, companyId },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((e) => e.id));

    let saved = 0;
    for (const row of rows) {
      const employeeId = String(row?.employeeId || "");
      if (!ownedIds.has(employeeId)) continue;
      const raw = String(row?.biometricId ?? "").trim();
      await prisma.employee.update({
        where: { id: employeeId },
        data: { biometricId: raw || null },
      });
      saved += 1;
    }

    const linked = await resolveUnmappedPunches(companyId);

    return NextResponse.json({ saved, historyLinked: linked });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "That enrollment number is already mapped to another employee" },
        { status: 400 }
      );
    }
    console.error("Error saving biometric mapping:", error);
    return NextResponse.json({ error: "Failed to save mapping" }, { status: 500 });
  }
}
