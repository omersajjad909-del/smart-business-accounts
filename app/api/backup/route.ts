import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { createCompanyBackup } from "@/lib/backup";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const userRole = req.headers.get("x-user-role");
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const backups = await prisma.systemBackup.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      fileName: true,
      fileSize: true,
      backupType: true,
      status: true,
      createdAt: true,
      createdBy: true,
      // exclude metadata (can be large) from list view
    },
  });

  return NextResponse.json(backups);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { backupType = "FULL" } = body;

  try {
    // Snapshot contents come from lib/backup so this route and the restore path
    // can never cover different tables.
    const result = await createCompanyBackup(companyId, { backupType, createdBy: userId });

    return NextResponse.json({
      success: true,
      backup: {
        id: result.backupId,
        fileName: result.fileName,
        fileSize: result.fileSize,
        status: "COMPLETED",
        backupType,
        recordCount: result.counts,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
