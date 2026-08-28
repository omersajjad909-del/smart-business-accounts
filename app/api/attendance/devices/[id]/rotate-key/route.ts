import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { resolveCompanyId } from "@/lib/tenant";
import { deviceKeyPrefix, generateDeviceKey, hashDeviceKey } from "@/lib/biometric";

/**
 * Issue a fresh ingest key. The old one stops working immediately, so the
 * bridge agent (or the machine's cloud-server setting) has to be updated
 * before punches start flowing again.
 */
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = requireRole(req, ["ADMIN"]);
  if (guard) return guard;

  try {
    const { id } = await context.params;
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const existing = await prisma.biometricDevice.findFirst({ where: { id, companyId } });
    if (!existing) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    const key = generateDeviceKey();
    await prisma.biometricDevice.update({
      where: { id },
      data: { apiKeyHash: hashDeviceKey(key), apiKeyPrefix: deviceKeyPrefix(key) },
    });

    return NextResponse.json({ apiKey: key, apiKeyPrefix: deviceKeyPrefix(key) });
  } catch (error) {
    console.error("Error rotating device key:", error);
    return NextResponse.json({ error: "Failed to rotate key" }, { status: 500 });
  }
}
