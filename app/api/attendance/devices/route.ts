import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { resolveCompanyId } from "@/lib/tenant";
import { deviceKeyPrefix, generateDeviceKey, hashDeviceKey } from "@/lib/biometric";

const BRANDS = ["ZKTECO", "ESSL", "HIKVISION", "SUPREMA", "ANVIZ", "OTHER"];
const MODES = ["BRIDGE", "PUSH", "IMPORT"];

/** Never let apiKeyHash out of the server. */
const DEVICE_SELECT = {
  id: true,
  name: true,
  serialNumber: true,
  brand: true,
  mode: true,
  location: true,
  ipAddress: true,
  apiKeyPrefix: true,
  tzOffsetMin: true,
  isActive: true,
  lastSeenAt: true,
  lastPunchAt: true,
  createdAt: true,
} as const;

// GET: all machines registered for this company
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const devices = await prisma.biometricDevice.findMany({
      where: { companyId },
      select: { ...DEVICE_SELECT, _count: { select: { punches: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(devices);
  } catch (error) {
    console.error("Error fetching biometric devices:", error);
    return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 });
  }
}

// POST: register a machine. The ingest key is returned here and nowhere else.
export async function POST(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN"]);
  if (guard) return guard;

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json();
    const name = String(body?.name || "").trim();
    const serialNumber = String(body?.serialNumber || "").trim();

    if (!name || !serialNumber) {
      return NextResponse.json({ error: "name and serialNumber are required" }, { status: 400 });
    }

    const brand = BRANDS.includes(body?.brand) ? body.brand : "ZKTECO";
    const mode = MODES.includes(body?.mode) ? body.mode : "BRIDGE";
    const tzOffsetMin = Number.isFinite(Number(body?.tzOffsetMin)) ? Number(body.tzOffsetMin) : 300;

    const key = generateDeviceKey();

    const device = await prisma.biometricDevice.create({
      data: {
        companyId,
        name,
        serialNumber,
        brand,
        mode,
        location: body?.location ? String(body.location).trim() : null,
        ipAddress: body?.ipAddress ? String(body.ipAddress).trim() : null,
        tzOffsetMin,
        apiKeyHash: hashDeviceKey(key),
        apiKeyPrefix: deviceKeyPrefix(key),
      },
      select: DEVICE_SELECT,
    });

    return NextResponse.json({ ...device, apiKey: key }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A device with this serial number is already registered" },
        { status: 400 }
      );
    }
    console.error("Error creating biometric device:", error);
    return NextResponse.json({ error: "Failed to create device" }, { status: 500 });
  }
}

// PUT: edit a machine (?id=…). The key is not editable — rotate it instead.
export async function PUT(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN"]);
  if (guard) return guard;

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const existing = await prisma.biometricDevice.findFirst({ where: { id, companyId } });
    if (!existing) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body?.name !== undefined) data.name = String(body.name).trim();
    if (body?.serialNumber !== undefined) data.serialNumber = String(body.serialNumber).trim();
    if (BRANDS.includes(body?.brand)) data.brand = body.brand;
    if (MODES.includes(body?.mode)) data.mode = body.mode;
    if (body?.location !== undefined) data.location = body.location ? String(body.location).trim() : null;
    if (body?.ipAddress !== undefined) data.ipAddress = body.ipAddress ? String(body.ipAddress).trim() : null;
    if (body?.tzOffsetMin !== undefined && Number.isFinite(Number(body.tzOffsetMin))) {
      data.tzOffsetMin = Number(body.tzOffsetMin);
    }
    if (body?.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const device = await prisma.biometricDevice.update({
      where: { id },
      data,
      select: DEVICE_SELECT,
    });

    return NextResponse.json(device);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "That serial number is already in use" }, { status: 400 });
    }
    console.error("Error updating biometric device:", error);
    return NextResponse.json({ error: "Failed to update device" }, { status: 500 });
  }
}

// DELETE: remove a machine (?id=…) along with its raw punch history.
export async function DELETE(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN"]);
  if (guard) return guard;

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const existing = await prisma.biometricDevice.findFirst({ where: { id, companyId } });
    if (!existing) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    await prisma.biometricDevice.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting biometric device:", error);
    return NextResponse.json({ error: "Failed to delete device" }, { status: 500 });
  }
}
