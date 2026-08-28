import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateDevice, parseDeviceTime } from "@/lib/biometric";
import { processPunches } from "@/lib/attendanceProcessing";

export const dynamic = "force-dynamic";

/**
 * Where the bridge agent posts.
 *
 * Auth is the device's own ingest key (`x-device-key`), not a user session —
 * the agent runs unattended on an office PC and has no login. The key is
 * scoped to one machine of one company, so a leaked key can only ever write
 * punches for that machine.
 *
 *   POST /api/attendance/ingest
 *   x-device-key: fbd_…
 *   { "punches": [ { "biometricId": "7", "time": "2026-08-28 09:03:11",
 *                    "direction": "IN", "verifyMode": "FP" } ] }
 *
 * Safe to retry: the (device, enrollment, timestamp) triple is unique, so
 * re-sending a batch after a timeout inserts nothing twice.
 */

const MAX_BATCH = 2000;
const DIRECTIONS = new Set(["IN", "OUT", "AUTO"]);

export async function POST(req: NextRequest) {
  const device = await authenticateDevice(req);
  if (!device) {
    return NextResponse.json({ error: "Invalid or inactive device key" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const rows: any[] = Array.isArray(body?.punches) ? body.punches : [];
  if (rows.length === 0) {
    // A heartbeat with no new scans still proves the agent is alive.
    await prisma.biometricDevice.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });
    return NextResponse.json({ accepted: 0, inserted: 0, duplicates: 0, heartbeat: true });
  }
  if (rows.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `Batch too large — send at most ${MAX_BATCH} punches per request` },
      { status: 413 }
    );
  }

  // Resolve enrollment numbers to employees in one query.
  const enrollments = Array.from(
    new Set(rows.map((r) => String(r?.biometricId ?? r?.userId ?? "").trim()).filter(Boolean))
  );
  const employees = await prisma.employee.findMany({
    where: { companyId: device.companyId, biometricId: { in: enrollments } },
    select: { id: true, biometricId: true },
  });
  const empByEnrollment = new Map(employees.map((e) => [e.biometricId!, e.id]));

  const data: {
    companyId: string;
    deviceId: string;
    biometricId: string;
    employeeId: string | null;
    punchTime: Date;
    direction: string;
    verifyMode: string | null;
    source: string;
    raw: string | null;
  }[] = [];

  let rejected = 0;
  let newest: Date | null = null;

  for (const r of rows) {
    const biometricId = String(r?.biometricId ?? r?.userId ?? "").trim();
    const rawTime = r?.time ?? r?.timestamp ?? r?.recordTime;
    if (!biometricId || !rawTime) {
      rejected += 1;
      continue;
    }

    const punchTime = parseDeviceTime(String(rawTime), device.tzOffsetMin);
    if (!punchTime) {
      rejected += 1;
      continue;
    }

    const direction = DIRECTIONS.has(String(r?.direction).toUpperCase())
      ? String(r.direction).toUpperCase()
      : "AUTO";

    data.push({
      companyId: device.companyId,
      deviceId: device.id,
      biometricId,
      employeeId: empByEnrollment.get(biometricId) ?? null,
      punchTime,
      direction,
      verifyMode: r?.verifyMode ? String(r.verifyMode).slice(0, 16) : null,
      source: "BRIDGE",
      raw: r?.raw ? String(r.raw).slice(0, 500) : null,
    });

    if (!newest || punchTime > newest) newest = punchTime;
  }

  const inserted = data.length
    ? (await prisma.attendancePunch.createMany({ data, skipDuplicates: true })).count
    : 0;

  await prisma.biometricDevice.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date(), ...(newest ? { lastPunchAt: newest } : {}) },
  });

  // Build the daily rows straight away so the dashboard is live, but never let
  // a processing hiccup fail the ingest — the punches are already safe on disk
  // and /api/attendance/punches can replay them.
  let processed = null;
  if (inserted > 0 && body?.process !== false) {
    try {
      const times = data.map((d) => d.punchTime.getTime());
      processed = await processPunches(device.companyId, {
        from: new Date(Math.min(...times) - 12 * 3_600_000),
        to: new Date(Math.max(...times) + 12 * 3_600_000),
        onlyUnprocessed: false,
      });
    } catch (error) {
      console.error("Punch ingest stored, processing failed:", error);
    }
  }

  return NextResponse.json({
    accepted: data.length,
    inserted,
    duplicates: data.length - inserted,
    rejected,
    unmapped: data.filter((d) => !d.employeeId).length,
    processed,
  });
}

/** Lets the agent verify its key and clock before it starts sending. */
export async function GET(req: NextRequest) {
  const device = await authenticateDevice(req);
  if (!device) {
    return NextResponse.json({ error: "Invalid or inactive device key" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    device: { name: device.name, serialNumber: device.serialNumber, mode: device.mode },
    serverTime: new Date().toISOString(),
  });
}
