import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

export async function GET(req: NextRequest) {
  try {
    const testimonials = await db.testimonial.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      select: {
        id: true, name: true, company: true, role: true,
        message: true, rating: true, planUsed: true, featured: true, createdAt: true,
      },
    });
    return NextResponse.json({ testimonials });
  } catch (e: any) {
    return NextResponse.json({ testimonials: [] });
  }
}
