import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { getSupportAccessUntil, grantSupportAccess, revokeSupportAccess } from "@/lib/supportAccess";
import { notifyAdmins } from "@/lib/adminNotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET -> { until }, POST { action: "grant" | "revoke" } -> { until } */
export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
  return NextResponse.json({ until: await getSupportAccessUntil(companyId) });
}

export async function POST(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const { action } = await req.json().catch(() => ({}));
  const userId = req.headers.get("x-user-id");
  if (action === "grant") {
    const until = await grantSupportAccess(companyId, userId);
    const co = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }).catch(() => null);
    await notifyAdmins({
      title: "🔓 Support access granted",
      message: `${co?.name || companyId} allowed support access`,
      type: "INFO",
      link: "/admin/trials",
    });
    return NextResponse.json({ until });
  }
  if (action === "revoke") {
    await revokeSupportAccess(companyId, userId);
    return NextResponse.json({ until: null });
  }
  return NextResponse.json({ error: "action must be grant or revoke" }, { status: 400 });
}
