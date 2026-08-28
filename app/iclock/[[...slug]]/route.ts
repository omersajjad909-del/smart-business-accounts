import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashDeviceKey, parseDeviceTime } from "@/lib/biometric";
import { processPunches } from "@/lib/attendanceProcessing";

export const dynamic = "force-dynamic";

/**
 * ZKTeco "ADMS" / push protocol.
 *
 * Newer machines can call a server themselves instead of waiting to be polled,
 * which is the only way to get live attendance out of a site with no PC to run
 * the bridge agent on. In the machine's menu: Comm → Cloud Server → set the
 * domain to this deployment. The firmware builds its own URLs, so the paths
 * below are fixed by the device, not by us.
 *
 *   GET  /iclock/cdata?SN=…&options=all   handshake — we answer with config
 *   POST /iclock/cdata?SN=…&table=ATTLOG  the scans, tab separated
 *   GET  /iclock/getrequest?SN=…          "any commands for me?" — none
 *   POST /iclock/devicecmd?SN=…           command results
 *
 * Authentication is the serial number, because the firmware sends no headers
 * and no body we control. That is weaker than the bridge agent's key, so a
 * device only counts if an admin registered that exact serial in PUSH mode.
 * Firmware that allows a URL prefix can use /iclock/<ingest-key>/cdata, which
 * we check properly.
 */

const OK = () =>
  new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });

const DENY = () =>
  new NextResponse("Device not registered", {
    status: 401,
    headers: { "Content-Type": "text/plain" },
  });

type Device = { id: string; companyId: string; tzOffsetMin: number; name: string };

/**
 * @param key present only when the firmware could be given a URL prefix. When
 *   it is, it must match — a wrong key is a rejection, not a fallback to SN.
 */
async function findDevice(sn: string | null, key: string | null): Promise<Device | null> {
  if (key) {
    return prisma.biometricDevice.findFirst({
      where: { apiKeyHash: hashDeviceKey(key), isActive: true },
      select: { id: true, companyId: true, tzOffsetMin: true, name: true },
    });
  }
  if (!sn) return null;
  return prisma.biometricDevice.findFirst({
    where: { serialNumber: sn.trim(), isActive: true, mode: "PUSH" },
    select: { id: true, companyId: true, tzOffsetMin: true, name: true },
  });
}

/** Split the path into an optional ingest key and the endpoint the device wants. */
function readSlug(slug: string[] | undefined): { key: string | null; endpoint: string } {
  const parts = (slug ?? []).filter(Boolean);
  if (parts.length === 0) return { key: null, endpoint: "" };
  if (parts.length === 1) return { key: null, endpoint: parts[0].toLowerCase() };
  return { key: parts[0], endpoint: parts[parts.length - 1].toLowerCase() };
}

export async function GET(req: NextRequest, context: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await context.params;
  const { key, endpoint } = readSlug(slug);
  const q = req.nextUrl.searchParams;
  const sn = q.get("SN") || q.get("sn");

  if (endpoint === "ping") {
    return new NextResponse("PONG", { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  const device = await findDevice(sn, key);
  if (!device) return DENY();

  await prisma.biometricDevice.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date() },
  });

  if (endpoint === "getrequest") return OK();

  // The handshake. Realtime=1 tells the machine to push each scan as it
  // happens; TransFlag's first four digits enable attendance + operation logs.
  const config = [
    `GET OPTION FROM: ${sn ?? device.name}`,
    "Stamp=9999",
    "OpStamp=9999",
    "ErrorDelay=30",
    "Delay=10",
    "TransTimes=00:00;14:00",
    "TransInterval=1",
    "TransFlag=1111000000",
    "TimeZone=5",
    "Realtime=1",
    "Encrypt=0",
  ].join("\n");

  return new NextResponse(config, { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function POST(req: NextRequest, context: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await context.params;
  const { key, endpoint } = readSlug(slug);
  const q = req.nextUrl.searchParams;
  const sn = q.get("SN") || q.get("sn");

  const device = await findDevice(sn, key);
  if (!device) return DENY();

  const now = new Date();

  // Command results and photo uploads carry nothing we store, but they still
  // prove the machine is online.
  if (endpoint === "devicecmd") {
    await prisma.biometricDevice.update({ where: { id: device.id }, data: { lastSeenAt: now } });
    return OK();
  }

  const table = (q.get("table") || "").toUpperCase();
  if (table && table !== "ATTLOG") {
    await prisma.biometricDevice.update({ where: { id: device.id }, data: { lastSeenAt: now } });
    return OK();
  }

  const body = await req.text();
  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // PIN \t YYYY-MM-DD HH:MM:SS \t status \t verify \t workcode \t …
  const parsed: { biometricId: string; punchTime: Date; direction: string; verifyMode: string | null; raw: string }[] = [];

  for (const line of lines) {
    const cells = line.split(/\t+/).map((c) => c.trim());
    const biometricId = cells[0];
    const stamp = cells[1];
    if (!biometricId || !stamp) continue;

    const punchTime = parseDeviceTime(stamp, device.tzOffsetMin);
    if (!punchTime) continue;

    const state = cells[2];
    const direction = state === "0" || state === "4" ? "IN" : state === "1" || state === "5" ? "OUT" : "AUTO";

    parsed.push({
      biometricId,
      punchTime,
      direction,
      verifyMode: cells[3] ?? null,
      raw: line.slice(0, 500),
    });
  }

  if (parsed.length === 0) {
    await prisma.biometricDevice.update({ where: { id: device.id }, data: { lastSeenAt: now } });
    return OK();
  }

  const employees = await prisma.employee.findMany({
    where: {
      companyId: device.companyId,
      biometricId: { in: Array.from(new Set(parsed.map((p) => p.biometricId))) },
    },
    select: { id: true, biometricId: true },
  });
  const empByEnrollment = new Map(employees.map((e) => [e.biometricId!, e.id]));

  const inserted = await prisma.attendancePunch.createMany({
    data: parsed.map((p) => ({
      companyId: device.companyId,
      deviceId: device.id,
      biometricId: p.biometricId,
      employeeId: empByEnrollment.get(p.biometricId) ?? null,
      punchTime: p.punchTime,
      direction: p.direction,
      verifyMode: p.verifyMode,
      source: "PUSH",
      raw: p.raw,
    })),
    skipDuplicates: true,
  });

  const times = parsed.map((p) => p.punchTime.getTime());
  await prisma.biometricDevice.update({
    where: { id: device.id },
    data: { lastSeenAt: now, lastPunchAt: new Date(Math.max(...times)) },
  });

  // The machine retries anything it does not get an OK for, so a processing
  // failure must not surface as an error — the punches are already stored.
  if (inserted.count > 0) {
    try {
      await processPunches(device.companyId, {
        from: new Date(Math.min(...times) - 12 * 3_600_000),
        to: new Date(Math.max(...times) + 12 * 3_600_000),
        onlyUnprocessed: false,
      });
    } catch (error) {
      console.error("iclock push stored, processing failed:", error);
    }
  }

  return new NextResponse(`OK: ${inserted.count}`, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
