import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { unpackSnapshot } from "@/lib/backup";

export async function GET(req: NextRequest) {
  const userRole = req.headers.get("x-user-role");
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Backup ID required" }, { status: 400 });

  const backup = await prisma.systemBackup.findFirst({
    where: { id, companyId },
  });

  if (!backup || !backup.metadata) {
    return NextResponse.json({ error: "Backup not found or data unavailable" }, { status: 404 });
  }

  // Snapshots are stored gzipped; the download is always plain JSON so the file
  // stays re-uploadable through the restore-from-file flow.
  const json = unpackSnapshot(backup.metadata);

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${backup.fileName}"`,
      "Content-Length": String(Buffer.byteLength(json, "utf8")),
    },
  });
}
