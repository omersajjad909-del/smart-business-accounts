import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { resolveCompanyId } from "@/lib/tenant";

// GET: Fetch advances
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const monthYear = searchParams.get("monthYear"); 

    const where: Any = {};
    where.companyId = companyId;
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    
    if (monthYear) {
      where.OR = [
        { monthYear: monthYear },
        { monthYear: null }
      ];
    }

    if (!(prisma as Any).advanceSalary) {
        console.error("❌ Prisma Client out of sync. advanceSalary model missing.");
        return NextResponse.json({ error: "System update required. Please restart the server." }, { status: 500 });
    }

    const advances = await prisma.advanceSalary.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(advances);
  } catch (error) {
    console.error("Error fetching advances:", error);
    return NextResponse.json({ error: "Failed to fetch advances" }, { status: 500 });
  }
}

// POST: Give Advance
export async function POST(req: NextRequest) {
  console.log("💰 POST /api/advance called");
  
  const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
  if (guard) {
    console.log("⛔ Role check failed");
    return guard;
  }

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json();
    console.log("📥 Payload:", body);
    
    const { employeeId, amount, date, monthYear, remarks } = body;

    if (!employeeId || !amount || !date) {
      console.log("⚠️ Missing fields");
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!(prisma as Any).advanceSalary) {
       console.error("❌ Prisma Client out of sync. advanceSalary model missing.");
       return NextResponse.json({ error: "System update required. Please restart the server to apply changes." }, { status: 500 });
    }

    console.log("💾 Saving to DB...");
    const advance = await prisma.advanceSalary.create({
      data: {
        companyId,
        employeeId,
        amount: Number(amount),
        date: new Date(date),
        monthYear: monthYear || null,
        remarks,
        status: "PENDING",
      },
    });

    console.log("✅ Saved:", advance);
    return NextResponse.json(advance, { status: 201 });
  } catch (error: Any) {
    console.error("❌ Error creating advance:", error);
    return NextResponse.json({ error: "Failed to create advance: " + error.message }, { status: 500 });
  }
}

// DELETE: Delete/Cancel Advance
export async function DELETE(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN"]);
  if (guard) return guard;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.advanceSalary.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Advance record deleted successfully" });
  } catch (error) {
    console.error("Error deleting advance:", error);
    return NextResponse.json({ error: "Failed to delete advance" }, { status: 500 });
  }
}
