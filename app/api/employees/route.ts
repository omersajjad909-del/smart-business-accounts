import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";

// GET: Fetch all employees
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const isActiveParam = searchParams.get("isActive");
    const isActive =
      isActiveParam === null
        ? true
        : isActiveParam === "true";

    const employees = await prisma.employee.findMany({
      where: {
        ...(department && { department }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        attendances: { orderBy: { date: "desc" }, take: 10 },
        payroll: { orderBy: { monthYear: "desc" }, take: 3 },
      },
      orderBy: { firstName: "asc" },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}

// POST: Create new employee
export async function POST(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
  if (guard) return guard;

  try {
    const body = await req.json();
    const {
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      designations,
      department,
      dateOfJoining,
      salary,
      salaryFrequency,
    } = body;

    if (!employeeId || !firstName || !email || !department) {
      return NextResponse.json(
        { error: "Required fields: employeeId, firstName, email, department" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.create({
      data: {
        employeeId,
        firstName,
        lastName,
        email,
        phone,
        designations,
        department,
        dateOfJoining: new Date(dateOfJoining),
        salary,
        salaryFrequency,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Employee ID or email already exists" },
        { status: 400 }
      );
    }
    console.error("Error creating employee:", error);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}

// PUT: Update employee
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

    const employee = await prisma.employee.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(employee);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    console.error("Error updating employee:", error);
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}

// DELETE: Delete employee
export async function DELETE(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN"]);
  if (guard) return guard;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.employee.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Employee deleted successfully" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    console.error("Error deleting employee:", error);
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
  }
}
