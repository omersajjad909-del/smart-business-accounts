import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";

// GET: Fetch attendance records
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const month = searchParams.get("month"); // YYYY-MM
    const status = searchParams.get("status");

    let dateFilter: Any = {};
    if (month) {
      const [year, monthNum] = month.split("-").map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0);
      dateFilter = { gte: startDate, lte: endDate };
    }

    const attendance = await prisma.attendance.findMany({
      where: {
        employeeId: employeeId || undefined,
        date: Object.keys(dateFilter).length ? dateFilter : undefined,
        status: status || undefined,
      },
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}

// POST: Mark attendance
export async function POST(req: NextRequest) {
  // Debugging logs
  console.log("📝 POST /api/attendance called");
  console.log("Headers:", Object.fromEntries(req.headers));

  const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
  if (guard) {
    console.log("❌ Forbidden by requireRole");
    return guard;
  }

  try {
    const body = await req.json();
    const { employeeId, date, status, checkIn, checkOut, remarks } = body;

    if (!employeeId || !date || !status) {
      return NextResponse.json(
        { error: "employeeId, date, and status are required" },
        { status: 400 }
      );
    }

    const baseDate = new Date(date);

    let checkInDateTime: Date | null = null;
    if (checkIn) {
      const [h, m] = checkIn.split(":").map((v: string) => parseInt(v, 10));
      if (!Number.isNaN(h)) {
        const d = new Date(baseDate);
        d.setHours(h, Number.isNaN(m) ? 0 : m, 0, 0);
        checkInDateTime = d;
      }
    }

    let checkOutDateTime: Date | null = null;
    if (checkOut) {
      const [h, m] = checkOut.split(":").map((v: string) => parseInt(v, 10));
      if (!Number.isNaN(h)) {
        const d = new Date(baseDate);
        d.setHours(h, Number.isNaN(m) ? 0 : m, 0, 0);
        checkOutDateTime = d;
      }
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        date: baseDate,
        status,
        checkIn: checkInDateTime,
        checkOut: checkOutDateTime,
        remarks,
      },
    });

    return NextResponse.json(attendance, { status: 201 });
  } catch (error: Any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Attendance record for this date already exists" },
        { status: 400 }
      );
    }
    console.error("Error marking attendance:", error);
    return NextResponse.json({ error: "Failed to mark attendance" }, { status: 500 });
  }
}

// PUT: Update attendance
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
    const { status, checkIn, checkOut, remarks, date: _date } = body; // Extract relevant fields

    const updateData: Any = {
      status,
      remarks,
    };

    // If date is provided (though usually not changed in update), ensure it's a Date object
    // But typically we don't update date. We use date to construct time.
    // Let's assume we use the existing record's date or the passed date.
    // Ideally, we should fetch the existing record to get the base date if not provided, 
    // but frontend should probably send the date.
    
    // Simplification: We will just parse checkIn/checkOut if provided string.
    // We need a base date. If the user updates checkIn/checkOut, they are sending time strings (HH:mm).
    // We need to combine them with the record's date.
    
    // To be safe and consistent with POST, let's assume body might contain full ISO strings or we need to reconstruct.
    // However, the frontend sends "HH:mm".
    // We need the Date of the record to set the correct Day/Month/Year for the Time.
    
    // Let's fetch the existing record first to get the base date.
    const existingRecord = await prisma.attendance.findUnique({ where: { id } });
    if (!existingRecord) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const baseDate = new Date(existingRecord.date);

    if (checkIn !== undefined) {
      if (!checkIn) {
        updateData.checkIn = null;
      } else {
        const [h, m] = checkIn.split(":").map((v: string) => parseInt(v, 10));
        if (!Number.isNaN(h)) {
          const d = new Date(baseDate);
          d.setHours(h, Number.isNaN(m) ? 0 : m, 0, 0);
          updateData.checkIn = d;
        }
      }
    }

    if (checkOut !== undefined) {
      if (!checkOut) {
        updateData.checkOut = null;
      } else {
        const [h, m] = checkOut.split(":").map((v: string) => parseInt(v, 10));
        if (!Number.isNaN(h)) {
          const d = new Date(baseDate);
          d.setHours(h, Number.isNaN(m) ? 0 : m, 0, 0);
          updateData.checkOut = d;
        }
      }
    }

    const attendance = await prisma.attendance.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(attendance);
  } catch (error: Any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }
    console.error("Error updating attendance:", error);
    return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 });
  }
}

function _formatPakTime(dateString?: string | Date | null) {
  if (!dateString) return "--";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "--";

  return d.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}




// DELETE: Delete attendance record
export async function DELETE(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN"]);
  if (guard) return guard;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.attendance.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Attendance record deleted successfully" });
  } catch (error: Any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }
    console.error("Error deleting attendance:", error);
    return NextResponse.json({ error: "Failed to delete attendance" }, { status: 500 });
  }
}
