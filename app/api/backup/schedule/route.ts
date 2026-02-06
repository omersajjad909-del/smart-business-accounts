import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const schedule = await prisma.backupSchedule.findUnique({
      where: { companyId },
    });

    return NextResponse.json(schedule || null);
  } catch (e: Any) {
    return NextResponse.json({ error: e.message || "Failed to load schedule" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json();
    const {
      frequency = "DAILY",
      timeOfDay = "02:00",
      dayOfWeek = null,
      dayOfMonth = null,
      isActive = true,
    } = body || {};

    const schedule = await prisma.backupSchedule.upsert({
      where: { companyId },
      update: {
        frequency,
        timeOfDay,
        dayOfWeek,
        dayOfMonth,
        isActive,
      },
      create: {
        companyId,
        frequency,
        timeOfDay,
        dayOfWeek,
        dayOfMonth,
        isActive,
      },
    });

    return NextResponse.json(schedule);
  } catch (e: Any) {
    return NextResponse.json({ error: e.message || "Failed to save schedule" }, { status: 500 });
  }
}
