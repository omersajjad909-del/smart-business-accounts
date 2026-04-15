/**
 * POST /api/admin/fraud/flag
 * Body: { companyId, action: "FLAG" | "CLEAR", note? }
 *
 * FLAG  — marks company as manually flagged, logs to ActivityLog
 * CLEAR — removes manual flag
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const body = await req.json();
    const { companyId, action, note } = body as { companyId: string; action: "FLAG" | "CLEAR"; note?: string };

    if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });
    if (!["FLAG", "CLEAR"].includes(action)) return NextResponse.json({ error: "action must be FLAG or CLEAR" }, { status: 400 });

    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true } });
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    if (action === "FLAG") {
      // Update company fraud fields
      await prisma.company.update({
        where: { id: companyId },
        data: {
          fraudRisk: "HIGH",
          flaggedAt: new Date(),
          flagNote: note || null,
        },
      });

      // Log to ActivityLog
      await prisma.activityLog.create({
        data: {
          companyId,
          userId: (admin as any).id || null,
          action: "FRAUD_FLAGGED",
          details: JSON.stringify({
            flaggedBy: (admin as any).email,
            note: note || null,
            flaggedAt: new Date().toISOString(),
          }),
        },
      });

      // Log admin action
      await logAdminAction({
        adminId:     (admin as any).id,
        adminEmail:  (admin as any).email,
        action:      "FRAUD_FLAG",
        targetType:  "Company",
        targetId:    companyId,
        targetLabel: company.name,
        details:     JSON.stringify({ note }),
        companyId,
      });

      return NextResponse.json({ flagged: true, companyId, note });
    } else {
      // CLEAR flag
      await prisma.company.update({
        where: { id: companyId },
        data: {
          fraudRisk: "NONE",
          flaggedAt: null,
          flagNote:  null,
        },
      });

      await prisma.activityLog.create({
        data: {
          companyId,
          userId: (admin as any).id || null,
          action: "FRAUD_CLEARED",
          details: JSON.stringify({
            clearedBy: (admin as any).email,
            clearedAt: new Date().toISOString(),
          }),
        },
      });

      await logAdminAction({
        adminId:     (admin as any).id,
        adminEmail:  (admin as any).email,
        action:      "FRAUD_FLAG_CLEARED",
        targetType:  "Company",
        targetId:    companyId,
        targetLabel: company.name,
        companyId,
      });

      return NextResponse.json({ cleared: true, companyId });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
