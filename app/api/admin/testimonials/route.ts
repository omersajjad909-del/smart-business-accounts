import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isAdmin(req: NextRequest) {
  return String(req.headers.get("x-user-role") || "").toUpperCase() === "ADMIN";
}

const db = prisma as any;

// GET - list testimonials, filter by ?status=PENDING|PUBLISHED|REJECTED
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const status = req.nextUrl.searchParams.get("status");
    const where = status ? { status } : {};
    const testimonials = await db.testimonial.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ testimonials });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST - admin manually adds a testimonial (auto-published)
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { name, company, role, message, rating, avatar, planUsed, featured } = await req.json();
    if (!name?.trim() || !message?.trim())
      return NextResponse.json({ error: "Name and message required" }, { status: 400 });
    const testimonial = await db.testimonial.create({
      data: {
        name: name.trim(),
        company: company?.trim() || null,
        role: role?.trim() || null,
        message: message.trim(),
        rating: Number(rating) || 5,
        avatar: avatar?.trim() || null,
        planUsed: planUsed?.trim() || null,
        status: "PUBLISHED",
        featured: featured === true,
      },
    });
    return NextResponse.json({ testimonial });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH - approve/reject/update
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { id, action, ...updates } = await req.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const data: any = {};

    if (action === "PUBLISH") data.status = "PUBLISHED";
    else if (action === "REJECT") data.status = "REJECTED";
    else if (action === "PENDING") data.status = "PENDING";
    else {
      if (updates.name !== undefined)     data.name     = updates.name;
      if (updates.company !== undefined)  data.company  = updates.company;
      if (updates.role !== undefined)     data.role     = updates.role;
      if (updates.message !== undefined)  data.message  = updates.message;
      if (updates.rating !== undefined)   data.rating   = Number(updates.rating);
      if (updates.planUsed !== undefined) data.planUsed = updates.planUsed;
      if (updates.featured !== undefined) data.featured = Boolean(updates.featured);
      if (updates.status !== undefined)   data.status   = updates.status;
    }

    const testimonial = await db.testimonial.update({ where: { id }, data });
    return NextResponse.json({ testimonial });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await db.testimonial.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
