import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { resolveCompanyId } from "@/lib/tenant";

type AdvancePayload = {
  reason?: string;
  deductMonths?: number;
};

function employeeName(employee?: { firstName?: string | null; lastName?: string | null } | null) {
  return [employee?.firstName, employee?.lastName].filter(Boolean).join(" ").trim() || "Unnamed Employee";
}

function parsePayload(remarks?: string | null): AdvancePayload {
  if (!remarks) return {};
  try {
    const parsed = JSON.parse(remarks);
    return typeof parsed === "object" && parsed !== null ? parsed : { reason: remarks };
  } catch {
    return { reason: remarks };
  }
}

function mapAdvance(advance: {
  id: string;
  employeeId: string;
  amount: number;
  date: Date;
  status: string;
  remarks?: string | null;
  employee?: { firstName?: string | null; lastName?: string | null } | null;
}) {
  const payload = parsePayload(advance.remarks);
  const isCleared = advance.status === "DEDUCTED" || advance.status === "CLEARED";

  return {
    id: advance.id,
    employeeId: advance.employeeId,
    employeeName: employeeName(advance.employee),
    amount: Number(advance.amount || 0),
    reason: payload.reason || "",
    deductMonths: Number(payload.deductMonths || 1),
    deductedSoFar: isCleared ? Number(advance.amount || 0) : 0,
    status: isCleared ? "CLEARED" : "ACTIVE",
    date: advance.date.toISOString().slice(0, 10),
  };
}

export async function GET(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
  if (guard) return guard;

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const advances = await prisma.advanceSalary.findMany({
      where: { companyId, deletedAt: null },
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ advances: advances.map(mapAdvance) });
  } catch (error) {
    console.error("[hr/advance-salary] Failed to fetch advances.", error);
    return NextResponse.json({ error: "Failed to fetch advances" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
  if (guard) return guard;

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json();
    const employeeId = String(body.employeeId || "").trim();
    const amount = Number(body.amount || 0);
    const reason = String(body.reason || "").trim();
    const deductMonths = Math.max(1, Number(body.deductMonths || 1));

    if (!employeeId || amount <= 0) {
      return NextResponse.json({ error: "Employee and valid amount are required" }, { status: 400 });
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const advance = await prisma.advanceSalary.create({
      data: {
        companyId,
        employeeId,
        amount,
        date: new Date(),
        status: "PENDING",
        remarks: JSON.stringify({ reason, deductMonths }),
      },
      include: { employee: { select: { firstName: true, lastName: true } } },
    });

    return NextResponse.json({ advance: mapAdvance(advance) }, { status: 201 });
  } catch (error) {
    console.error("[hr/advance-salary] Failed to create advance.", error);
    return NextResponse.json({ error: "Failed to create advance" }, { status: 500 });
  }
}
