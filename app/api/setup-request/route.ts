import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export const runtime = "nodejs";

/**
 * POST /api/setup-request
 *
 * A customer asks for help with their free setup. Setup is automatic by default
 * and self-service after that; this is the escape hatch for the ones who want a
 * person. It records the request only — an admin sees it in /admin/trials, and
 * nobody gets access to the company's data by it.
 */
export async function POST(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const note = String(body?.note || "").trim().slice(0, 500);

  // One open request per company: a second click should not queue a second job.
  const logs = await prisma.activityLog.findMany({
    where: { companyId, action: { in: ["SETUP_REQUEST", "SETUP_DONE"] } },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { action: true },
  });
  if (logs[0]?.action === "SETUP_REQUEST") return NextResponse.json({ ok: true, alreadyOpen: true });

  await prisma.activityLog.create({
    data: { companyId, action: "SETUP_REQUEST", details: JSON.stringify({ note }) },
  });
  return NextResponse.json({ ok: true });
}
