import { NextRequest, NextResponse } from "next/server";
import { buildBusinessOperator } from "@/lib/businessOperator";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const payload = await buildBusinessOperator(companyId);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Business operator GET error:", error);
    return NextResponse.json({ error: "Failed to load Business Operator" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role") || "USER";
    const body = await req.json().catch(() => ({}));
    const actionId = String(body?.actionId || "").trim();
    const title = String(body?.title || "Business Operator action").trim();
    const description = String(body?.description || "Queued by FinovaOS Business Operator").trim();
    const href = String(body?.href || "/dashboard/operator").trim();

    if (!companyId || !actionId) {
      return NextResponse.json({ error: "Company and action are required" }, { status: 400 });
    }

    await Promise.allSettled([
      prisma.auditLog.create({
        data: {
          companyId,
          entity: "BusinessOperator",
          entityId: actionId,
          action: "QUEUE",
          userId: userId || undefined,
          userRole,
          description: `${title} queued from FinovaOS Business Operator`,
          afterValues: JSON.stringify({ actionId, title, href }),
        },
      }),
      prisma.notification.create({
        data: {
          userId: userId || undefined,
          type: "SUCCESS",
          title: "Business Operator Action Queued",
          message: `${title} has been queued. ${description}`,
          link: href || "/dashboard/operator",
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      message: `${title} queued successfully.`,
    });
  } catch (error) {
    console.error("Business operator POST error:", error);
    return NextResponse.json({ error: "Failed to queue Business Operator action" }, { status: 500 });
  }
}
