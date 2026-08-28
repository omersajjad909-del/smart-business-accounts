import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { resolveCompanyId } from "@/lib/tenant";
import {
  BIOMETRIC_SETTINGS_ACTION,
  DEFAULT_BIOMETRIC_SETTINGS,
  getBiometricSettings,
  normalizeSettings,
} from "@/lib/biometric";

/**
 * The rules that turn scans into a status: grace period, half-day threshold,
 * double-tap window. Stored as an ActivityLog row, the same way holiday
 * settings are, so it stays tenant-scoped without a table of its own.
 */

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    return NextResponse.json(await getBiometricSettings(companyId));
  } catch (error) {
    console.error("Error loading biometric settings:", error);
    return NextResponse.json(DEFAULT_BIOMETRIC_SETTINGS);
  }
}

export async function PUT(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN"]);
  if (guard) return guard;

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const settings = normalizeSettings(await req.json());

    await prisma.activityLog.create({
      data: {
        companyId,
        action: BIOMETRIC_SETTINGS_ACTION,
        details: JSON.stringify(settings),
        userId: req.headers.get("x-user-id") || null,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error saving biometric settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
