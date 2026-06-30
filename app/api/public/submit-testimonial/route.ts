/**
 * POST /api/public/submit-testimonial
 * Logged-in user submits a review. Status starts as PENDING for admin approval.
 * GET  /api/public/submit-testimonial — returns the current user's submitted testimonials
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

const db = prisma as any;

function getUser(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req as any);
    if (!token) return null;
    const p = verifyJwt(token) as any;
    return { userId: p?.userId || p?.id || null, companyId: p?.companyId || null, name: p?.name || null };
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUser(req);
    if (!user?.userId) return NextResponse.json({ error: "Login required" }, { status: 401 });

    const { message, rating, role, name, company } = await req.json();

    if (!message?.trim() || message.trim().length < 20)
      return NextResponse.json({ error: "Review must be at least 20 characters" }, { status: 400 });

    const r = Math.max(1, Math.min(5, Number(rating) || 5));

    // One pending testimonial per user at a time — update if exists, else create
    const existing = await db.testimonial.findFirst({
      where: { userId: user.userId, status: "PENDING" },
    });

    let testimonial;
    if (existing) {
      testimonial = await db.testimonial.update({
        where: { id: existing.id },
        data: {
          message: message.trim(),
          rating: r,
          role: role?.trim() || null,
          name: name?.trim() || user.name || "User",
          company: company?.trim() || null,
        },
      });
    } else {
      testimonial = await db.testimonial.create({
        data: {
          message: message.trim(),
          rating: r,
          role: role?.trim() || null,
          name: name?.trim() || user.name || "User",
          company: company?.trim() || null,
          status: "PENDING",
          featured: false,
          userId: user.userId,
          companyId: user.companyId,
        },
      });
    }

    return NextResponse.json({ success: true, id: testimonial.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = getUser(req);
    if (!user?.userId) return NextResponse.json({ items: [] });

    const items = await db.testimonial.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, message: true, rating: true, status: true, createdAt: true },
    });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
