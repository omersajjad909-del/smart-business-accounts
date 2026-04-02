import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

async function ensureEmployeeScopedUniqueIndexes() {
  await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Employee_email_key"`);
  await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Employee_employeeId_key"`);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Employee_companyId_email_key"
    ON "Employee"("companyId", "email")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Employee_companyId_employeeId_key"
    ON "Employee"("companyId", "employeeId")
  `);
}

// GET: Fetch all employees
export async function GET(req: NextRequest) {
  try {
    await ensureEmployeeScopedUniqueIndexes();
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const isActiveParam = searchParams.get("isActive");
    const isActive =
      isActiveParam === null
        ? true
        : isActiveParam === "true";

    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        ...(department && { department }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        attendances: { orderBy: { date: "desc" }, take: 10 },
        // payroll: { orderBy: { monthYear: "desc" }, take: 3 },
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
    await ensureEmployeeScopedUniqueIndexes();
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
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

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        companyId,
        OR: [
          { employeeId: String(employeeId).trim() },
          { email: normalizedEmail },
        ],
      },
      select: { employeeId: true, email: true },
    });

    if (existingEmployee) {
      return NextResponse.json(
        {
          error:
            existingEmployee.email === normalizedEmail
              ? "This email already exists in this company."
              : "This employee ID already exists in this company.",
        },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.create({
      data: {
        companyId,
        employeeId: String(employeeId).trim(),
        firstName,
        lastName,
        email: normalizedEmail,
        phone,
        designations,
        department,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),
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
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const body = await req.json();
    await ensureEmployeeScopedUniqueIndexes();

    // Fix: Convert dateOfJoining to Date object if present
    if (body.dateOfJoining) {
      body.dateOfJoining = new Date(body.dateOfJoining);
    }

    if (body.email) {
      body.email = String(body.email).trim().toLowerCase();
    }
    if (body.employeeId) {
      body.employeeId = String(body.employeeId).trim();
    }

    const duplicate = await prisma.employee.findFirst({
      where: {
        companyId,
        id: { not: id },
        OR: [
          body.employeeId ? { employeeId: body.employeeId } : undefined,
          body.email ? { email: body.email } : undefined,
        ].filter(Boolean) as Array<{ employeeId?: string; email?: string }>,
      },
      select: { employeeId: true, email: true },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          error:
            body.email && duplicate.email === body.email
              ? "This email already exists in this company."
              : "This employee ID already exists in this company.",
        },
        { status: 400 }
      );
    }
    
    // Remove ID from body if present to avoid changing primary key (optional but good practice)
    delete body.id;
    delete body.createdAt;
    delete body.updatedAt;

    const updated = await prisma.employee.updateMany({
      where: { id, companyId },
      data: body,
    });
    if (!updated.count) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const employee = await prisma.employee.findUnique({ where: { id } });

    return NextResponse.json(employee);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Employee ID or Email already exists" }, { status: 400 });
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
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.employee.deleteMany({
      where: { id, companyId },
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
