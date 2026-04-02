/**
 * GET  /api/admin/newsletter  — list subscribers
 * POST /api/admin/newsletter  — broadcast email to all active subscribers
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

const db = prisma as any;

function isAdmin(req: NextRequest) {
  const role = String(req.headers.get("x-user-role") || "").toUpperCase();
  if (role === "ADMIN") return true;
  try {
    const p = verifyJwt(getTokenFromRequest(req as any)!);
    return String((p as any)?.role || "").toUpperCase() === "ADMIN";
  } catch { return false; }
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "active";
  const page   = Math.max(1, Number(searchParams.get("page") || 1));
  const limit  = 50;

  const where: any = {};
  if (status !== "all") where.status = status;

  const [items, total, activeCount, unsubCount] = await Promise.all([
    db.newsletterSubscriber.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.newsletterSubscriber.count({ where }),
    db.newsletterSubscriber.count({ where: { status: "active" } }),
    db.newsletterSubscriber.count({ where: { status: "unsubscribed" } }),
  ]);

  return NextResponse.json({ items, total, page, activeCount, unsubCount });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { subject, html, preview } = await req.json();
  if (!subject || !html) return NextResponse.json({ error: "subject and html required" }, { status: 400 });

  const subscribers = await db.newsletterSubscriber.findMany({
    where: { status: "active" },
    select: { email: true, name: true },
  });

  if (preview) {
    return NextResponse.json({ success: true, count: subscribers.length, preview: true });
  }

  let sent = 0;
  await Promise.allSettled(
    subscribers.map(async (s: { email: string; name: string | null }) => {
      const r = await sendEmail({ to: s.email, subject, html });
      if (r.success) sent++;
    })
  );

  return NextResponse.json({ success: true, sent, total: subscribers.length });
}
