import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { resolveCompanyId } from "@/lib/tenant";
import { parseDeviceTime } from "@/lib/biometric";
import { parseAttendanceLog } from "@/lib/attendanceLogParser";
import { processPunches } from "@/lib/attendanceProcessing";

/**
 * Upload the log a vendor tool exported (ZKTime, iVMS, eSSL eTimeTrack…).
 *
 * The escape hatch for machines with no network path to us at all: someone
 * exports a file at month end and drops it here. Same dedupe as live ingest,
 * so re-uploading an overlapping export is harmless.
 */

export async function POST(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
  if (guard) return guard;

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json();
    const deviceId = String(body?.deviceId || "");
    const text = String(body?.content || "");

    if (!deviceId) return NextResponse.json({ error: "Pick a device to import against" }, { status: 400 });
    if (!text.trim()) return NextResponse.json({ error: "File is empty" }, { status: 400 });

    const device = await prisma.biometricDevice.findFirst({
      where: { id: deviceId, companyId },
      select: { id: true, tzOffsetMin: true },
    });
    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    const { rows, malformed } = parseAttendanceLog(text);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No punches found — expected columns for enrollment number and date/time" },
        { status: 400 }
      );
    }

    const employees = await prisma.employee.findMany({
      where: { companyId, biometricId: { in: Array.from(new Set(rows.map((r) => r.biometricId))) } },
      select: { id: true, biometricId: true },
    });
    const empByEnrollment = new Map(employees.map((e) => [e.biometricId!, e.id]));

    const data = [];
    let unparsedTime = 0;
    let min: Date | null = null;
    let max: Date | null = null;

    for (const r of rows) {
      const punchTime = parseDeviceTime(r.time, device.tzOffsetMin);
      if (!punchTime) {
        unparsedTime += 1;
        continue;
      }
      if (!min || punchTime < min) min = punchTime;
      if (!max || punchTime > max) max = punchTime;

      data.push({
        companyId,
        deviceId: device.id,
        biometricId: r.biometricId,
        employeeId: empByEnrollment.get(r.biometricId) ?? null,
        punchTime,
        direction: r.direction,
        source: "IMPORT",
        raw: r.raw,
      });
    }

    const inserted = data.length
      ? (await prisma.attendancePunch.createMany({ data, skipDuplicates: true })).count
      : 0;

    let processed = null;
    if (inserted > 0 && min && max) {
      processed = await processPunches(companyId, {
        from: new Date(min.getTime() - 12 * 3_600_000),
        to: new Date(max.getTime() + 12 * 3_600_000),
        onlyUnprocessed: false,
      });
    }

    return NextResponse.json({
      parsed: rows.length,
      inserted,
      duplicates: data.length - inserted,
      malformed: malformed + unparsedTime,
      unmapped: data.filter((d) => !d.employeeId).length,
      processed,
    });
  } catch (error) {
    console.error("Error importing attendance log:", error);
    return NextResponse.json({ error: "Failed to import log" }, { status: 500 });
  }
}
