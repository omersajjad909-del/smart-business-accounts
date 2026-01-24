// import { NextRequest, NextResponse } from "next/server";
// import { PrismaClient } from "@prisma/client";
// import { requireRole } from "@/lib/requireRole";

// const prisma = new PrismaClient();

// // GET: Fetch payroll records
// export async function GET(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const employeeId = searchParams.get("employeeId");
//     const monthYear = searchParams.get("monthYear");
//     const status = searchParams.get("status");

//     const payroll = await prisma.payroll.findMany({
//       where: {
//         employeeId: employeeId || undefined,
//         monthYear: monthYear || undefined,
//         paymentStatus: status || undefined,
//       },
//       include: { employee: { select: { firstName: true, lastName: true, salary: true } } },
//       orderBy: { monthYear: "desc" },
//     });

//     return NextResponse.json(payroll);
//   } catch (error) {
//     console.error("Error fetching payroll:", error);
//     return NextResponse.json({ error: "Failed to fetch payroll" }, { status: 500 });
//   }
// }

// // POST: Create payroll
// export async function POST(req: NextRequest) {
//   const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
//   if (guard) return guard;

//   try {
//     const body = await req.json();
//     const {
//       employeeId,
//       monthYear,
//       baseSalary,
//       allowances,
//       deductions,
//     } = body;

//     if (!employeeId || !monthYear || !baseSalary) {
//       return NextResponse.json(
//         { error: "employeeId, monthYear, and baseSalary are required" },
//         { status: 400 }
//       );
//     }

//     const netSalary = baseSalary + (allowances || 0) - (deductions || 0);

//     const payroll = await prisma.payroll.create({
//       data: {
//         employeeId,
//         monthYear,
//         baseSalary,
//         allowances: allowances || 0,
//         deductions: deductions || 0,
//         netSalary,
//       },
//     });

//     return NextResponse.json(payroll, { status: 201 });
//   } catch (error: any) {
//     if (error.code === "P2002") {
//       return NextResponse.json(
//         { error: "Payroll record for this employee and month already exists" },
//         { status: 400 }
//       );
//     }
//     console.error("Error creating payroll:", error);
//     return NextResponse.json({ error: "Failed to create payroll" }, { status: 500 });
//   }
// }

// // PUT: Update payroll
// export async function PUT(req: NextRequest) {
//   const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
//   if (guard) return guard;

//   try {
//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");

//     if (!id) {
//       return NextResponse.json({ error: "ID is required" }, { status: 400 });
//     }

//     const body = await req.json();
    
//     // Recalculate netSalary if needed
//     if (body.baseSalary || body.allowances || body.deductions) {
//       const existing = await prisma.payroll.findUnique({ where: { id } });
//       if (existing) {
//         body.netSalary = (body.baseSalary || existing.baseSalary) + 
//                          (body.allowances || existing.allowances) - 
//                          (body.deductions || existing.deductions);
//       }
//     }

//     const payroll = await prisma.payroll.update({
//       where: { id },
//       data: body,
//     });

//     return NextResponse.json(payroll);
//   } catch (error: any) {
//     if (error.code === "P2025") {
//       return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
//     }
//     console.error("Error updating payroll:", error);
//     return NextResponse.json({ error: "Failed to update payroll" }, { status: 500 });
//   }
// }

// // DELETE: Delete payroll record
// export async function DELETE(req: NextRequest) {
//   const guard = requireRole(req, ["ADMIN"]);
//   if (guard) return guard;

//   try {
//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");

//     if (!id) {
//       return NextResponse.json({ error: "ID is required" }, { status: 400 });
//     }

//     await prisma.payroll.delete({
//       where: { id },
//     });

// //     // If deleted, revert any advances deducted in this month to PENDING
//     if (payroll) {
//         await prisma.advanceSalary.updateMany({
//             where: {
//                 employeeId: payroll.employeeId,
//                 monthYear: payroll.monthYear,
//                 status: "DEDUCTED",
//             },
//             data: { status: "PENDING" },
//         });
//     }

//     return NextResponse.json({ message: "Payroll record deleted successfully" });
//   } catch (error: any) {
//     if (error.code === "P2025") {
//       return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
//     }
//     console.error("Error deleting payroll:", error);
//     return NextResponse.json({ error: "Failed to delete payroll" }, { status: 500 });
//   }
// }


import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

/* =========================
   GET: Fetch payroll records
   ========================= */
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
      include: {
        employee: {
          select: { firstName: true, lastName: true, salary: true, employeeId: true },
        },
      },
      orderBy: { monthYear: "desc" },
    });

    return NextResponse.json(payroll);
  } catch (error) {
    console.error("Error fetching payroll:", error);
    return NextResponse.json(
      { error: "Failed to fetch payroll" },
      { status: 500 }
    );
  }
}

/* =========================
   POST: Create payroll
   ========================= */
export async function POST(req: NextRequest) {
  console.log("💰 POST /api/payroll called");

  const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
  if (guard) return guard;

  try {
    const body = await req.json();
    const { employeeId, monthYear, baseSalary, allowances, deductions } = body;

    if (!employeeId || !monthYear) {
      return NextResponse.json(
        { error: "Employee and Month are required" },
        { status: 400 }
      );
    }

    if (baseSalary === undefined || baseSalary === null) {
      return NextResponse.json(
        { error: "Basic Salary is required" },
        { status: 400 }
      );
    }

    /* ================= ABSENT / HOLIDAY DEDUCTION ================= */

    const [year, month] = monthYear.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const absentDays = await prisma.attendance.count({
      where: {
        employeeId,
        status: "ABSENT",
        date: { gte: startDate, lte: endDate },
      },
    });

    const WORKING_DAYS = 30;
    const perDaySalary = baseSalary / WORKING_DAYS;
    const absentDeduction = perDaySalary * absentDays;

    /* ================= DEDUCTION REASON ================= */

    const reasons: string[] = [];
    if (absentDays > 0) reasons.push(`${absentDays} Absent`);
    if (deductions > 0) reasons.push("Advance");

    /* ================= FINAL SALARY ================= */

    const totalDeductions = (deductions || 0) + absentDeduction;

    const netSalary =
      baseSalary + (allowances || 0) - totalDeductions;

    const payroll = await prisma.payroll.create({
      data: {
        employeeId,
        monthYear,
        baseSalary,
        allowances: allowances || 0,
        deductions: totalDeductions,
        deductionReason: reasons.join(", "), // ✅ ADDED (no removal)
        netSalary,
      },
    });

    // Mark advances as DEDUCTED for this month
    await prisma.advanceSalary.updateMany({
      where: {
        employeeId,
        status: "PENDING",
        OR: [
          { monthYear: monthYear },
          { monthYear: null },
        ],
      },
      data: {
        status: "DEDUCTED",
        monthYear: monthYear, // Lock to this month so we can revert if payroll is deleted
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
    return NextResponse.json(
      { error: "Failed to create payroll" },
      { status: 500 }
    );
  }
}

/* =========================
   PUT: Update payroll
   ========================= */
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

    const existing = await prisma.payroll.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Payroll record not found" },
        { status: 404 }
      );
    }

    const baseSalary = body.baseSalary ?? existing.baseSalary;
    const allowances = body.allowances ?? existing.allowances;
    const deductions = body.deductions ?? existing.deductions;

    body.netSalary = baseSalary + allowances - deductions;

    const payroll = await prisma.payroll.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(payroll);
  } catch (error) {
    console.error("Error updating payroll:", error);
    return NextResponse.json(
      { error: "Failed to update payroll" },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE: Delete payroll
   ========================= */
export async function DELETE(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN"]);
  if (guard) return guard;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const payroll = await prisma.payroll.delete({ where: { id } });

    // Revert advances to PENDING
    await prisma.advanceSalary.updateMany({
      where: {
        employeeId: payroll.employeeId,
        monthYear: payroll.monthYear,
        status: "DEDUCTED",
      },
      data: { status: "PENDING" },
    });

    return NextResponse.json({
      message: "Payroll record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payroll:", error);
    return NextResponse.json(
      { error: "Failed to delete payroll" },
      { status: 500 }
    );
  }
}
