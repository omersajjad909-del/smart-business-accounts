/**
 * GET  /api/admin/feedback  — list all feedback with filters
 * POST /api/admin/feedback  — update status/priority/adminNote
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { requireAdmin } from "@/lib/adminAuth";

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
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type   = searchParams.get("type");
  const page   = Math.max(1, Number(searchParams.get("page") || 1));
  const limit  = 25;

  const where: any = {};
  if (status) where.status = status;
  if (type)   where.type   = type;

  const [items, total] = await Promise.all([
    db.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.feedback.count({ where }),
  ]);

  // stats
  const stats = await db.feedback.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  const byType = await db.feedback.groupBy({
    by: ["type"],
    _count: { id: true },
  });

  return NextResponse.json({ items, total, page, stats, byType });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, status, priority, adminNote, action } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Publish a rated review as a public testimonial. Everything a visitor will
  // read comes straight from what the customer wrote — the admin decides
  // whether to publish it, not what it says.
  if (action === "publish_testimonial") {
    const fb = await db.feedback.findUnique({ where: { id } });
    if (!fb) return NextResponse.json({ error: "Feedback not found" }, { status: 404 });

    if (fb.testimonialId)
      return NextResponse.json({ error: "Already published as a testimonial" }, { status: 400 });
    if (fb.type !== "feedback" || !fb.rating)
      return NextResponse.json({ error: "Only rated feedback can become a testimonial" }, { status: 400 });
    if (!fb.publishConsent)
      return NextResponse.json({ error: "This reviewer did not give permission to publish" }, { status: 400 });
    if (!fb.name?.trim())
      return NextResponse.json({ error: "A testimonial needs the reviewer's name" }, { status: 400 });

    let company: string | null = null;
    let planUsed: string | null = null;
    if (fb.companyId) {
      const c = await db.company.findUnique({
        where: { id: fb.companyId },
        select: { name: true, plan: true },
      });
      company  = c?.name || null;
      planUsed = c?.plan || null;
    }

    const testimonial = await db.testimonial.create({
      data: {
        name:     fb.name.trim(),
        company,
        role:     fb.role?.trim() || null,
        message:  fb.message.trim(),
        rating:   fb.rating,
        planUsed,
        status:   "PUBLISHED",
        featured: false,
        userId:   fb.userId,
        companyId: fb.companyId,
      },
    });

    const updated = await db.feedback.update({
      where: { id },
      data: {
        testimonialId: testimonial.id,
        adminNote: adminNote !== undefined ? adminNote : undefined,
      },
    });

    return NextResponse.json({ success: true, feedback: updated, testimonialId: testimonial.id });
  }

  // Pull a published testimonial back off the public site.
  if (action === "unpublish_testimonial") {
    const fb = await db.feedback.findUnique({ where: { id } });
    if (!fb?.testimonialId)
      return NextResponse.json({ error: "This feedback is not published" }, { status: 400 });

    await db.testimonial.delete({ where: { id: fb.testimonialId } }).catch(() => {});
    const updated = await db.feedback.update({ where: { id }, data: { testimonialId: null } });
    return NextResponse.json({ success: true, feedback: updated });
  }

  const data: any = {};
  if (status)    { data.status = status; if (status === "resolved") data.resolvedAt = new Date(); }
  if (priority)  data.priority  = priority;
  if (adminNote !== undefined) data.adminNote = adminNote;

  const updated = await db.feedback.update({ where: { id }, data });
  return NextResponse.json({ success: true, feedback: updated });
}
