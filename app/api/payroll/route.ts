import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";

// GET: Fetch payroll records
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const monthYear = searchParams.get("monthYear");
    const status = searchParams.get("status");

    const payroll = await prisma.payroll.findMany({
      where: {
        employeeId: employeeId || undefined,
        monthYear: monthYear || undefined,
        paymentStatus: status || undefined,
      },
      select: {
        id: true,
        employeeId: true,
        monthYear: true,
        baseSalary: true,
        allowances: true,
        deductions: true,
        deductionReason: true,
        additionalCash: true,
        netSalary: true,
        paymentStatus: true,
        employee: { select: { firstName: true, lastName: true, salary: true, employeeId: true } }
      },
      orderBy: { monthYear: "desc" },
    });

    return NextResponse.json(payroll);
  } catch (error) {
    console.error("Error fetching payroll:", error);
    return NextResponse.json({ error: "Failed to fetch payroll" }, { status: 500 });
  }
}

// POST: Create payroll
export async function POST(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
  if (guard) return guard;

  try {
    const body = await req.json();
    const {
      employeeId,
      monthYear,
      baseSalary,
      allowances,
      deductions,
      deductionReason,
      additionalCash,
    } = body;

    if (!employeeId || !monthYear || !baseSalary) {
      return NextResponse.json(
        { error: "employeeId, monthYear, and baseSalary are required" },
        { status: 400 }
      );
    }

    // Net Salary should be strictly Earnings - Deductions.
    // Additional Cash is a payment/advance that reduces the balance (or increases debt), 
    // calculated dynamically as (NetSalary - AdditionalCash).
    const netSalary = baseSalary + (allowances || 0) - (deductions || 0);

    const payroll = await prisma.payroll.create({
      data: {
        employeeId,
        monthYear,
        baseSalary,
        allowances: allowances || 0,
        deductions: deductions || 0,
        deductionReason: deductionReason || null,
        additionalCash: additionalCash || 0,
        netSalary,
      },
    });

    return NextResponse.json(payroll, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Payroll record for this employee and month already exists" },
        { status: 400 }
      );
    }
    console.error("Error creating payroll:", error);
    return NextResponse.json({ error: "Failed to create payroll" }, { status: 500 });
  }
}

// PUT: Update payroll
export async function PUT(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
  if (guard) return guard;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const body = await req.json();
    
    // Recalculate netSalary if needed
    if (body.baseSalary || body.allowances || body.deductions || body.additionalCash !== undefined) {
      const existing = await prisma.payroll.findUnique({ where: { id } });
      if (existing) {
        body.netSalary = (body.baseSalary || existing.baseSalary) + 
                         (body.allowances || existing.allowances) - 
                         (body.deductions || existing.deductions) +
                         (body.additionalCash !== undefined ? body.additionalCash : existing.additionalCash);
      }
    }

    const payroll = await prisma.payroll.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(payroll);
  } catch (error) {
    console.error("Error updating payroll:", error);
    return NextResponse.json({ error: "Failed to update payroll" }, { status: 500 });
  }
}

// DELETE: Delete payroll
export async function DELETE(req: NextRequest) {
    const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
    if (guard) return guard;
  
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get("id");
  
      if (!id) {
        return NextResponse.json({ error: "ID is required" }, { status: 400 });
      }
  
      await prisma.payroll.delete({
        where: { id },
      });
  
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting payroll:", error);
      return NextResponse.json({ error: "Failed to delete payroll" }, { status: 500 });
    }
}
