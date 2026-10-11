import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { notifyAdmins } from "@/lib/adminNotify";
import { getSupportAccessUntil, grantSupportAccess } from "@/lib/supportAccess";

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
  const allowAccess = body?.allowAccess === true;
  const userId = req.headers.get("x-user-id");

  // One open request per company: a second click should not queue a second job.
  const logs = await prisma.activityLog.findMany({
    where: { companyId, action: { in: ["SETUP_REQUEST", "SETUP_DONE"] } },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { action: true },
  });
  if (logs[0]?.action === "SETUP_REQUEST") {
    // The request is already open, but the customer may now be ticking the box.
    const supportUntil = allowAccess ? await grantSupportAccess(companyId, userId) : await getSupportAccessUntil(companyId);
    return NextResponse.json({ ok: true, alreadyOpen: true, supportUntil });
  }
  // Only what the customer ticked: the checkbox is the consent, never assumed.
  const supportUntil = allowAccess ? await grantSupportAccess(companyId, userId) : await getSupportAccessUntil(companyId);

  await prisma.activityLog.create({
    data: { companyId, action: "SETUP_REQUEST", details: JSON.stringify({ note }) },
  });
  const co = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true, trialPhone: true } }).catch(() => null);
  await notifyAdmins({
    title: "🛠 Setup help requested",
    message: [co?.name, co?.trialPhone, note, supportUntil ? "access allowed" : "access NOT allowed"].filter(Boolean).join(" · "),
    type: "WARNING",
    link: "/admin/trials",
  });
  return NextResponse.json({ ok: true, supportUntil });
}
