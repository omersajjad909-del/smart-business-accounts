import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

const db = prisma as any;

// POST - user submits feedback (goes to PENDING)
export async function POST(req: NextRequest) {
  try {
    const userId    = req.headers.get("x-user-id");
    const companyId = await resolveCompanyId(req).catch(() => null);

    const { name, company, role, message, rating, planUsed } = await req.json();

    if (!name?.trim() || !message?.trim())
      return NextResponse.json({ error: "Name and message required" }, { status: 400 });

    if (message.trim().length < 20)
      return NextResponse.json({ error: "Please write at least 20 characters" }, { status: 400 });

    const testimonial = await db.testimonial.create({
      data: {
        name:     name.trim(),
        company:  company?.trim() || null,
        role:     role?.trim()    || null,
        message:  message.trim(),
        rating:   Math.min(5, Math.max(1, Number(rating) || 5)),
        planUsed: planUsed?.trim() || null,
        status:   "PENDING",
        featured: false,
        userId,
        companyId,
      },
    });

    return NextResponse.json({ success: true, id: testimonial.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET - check if user already submitted
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ submitted: false });

    const existing = await db.testimonial.findFirst({
      where: { userId },
      select: { id: true, status: true, createdAt: true },
    });

    return NextResponse.json({ submitted: !!existing, testimonial: existing });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
