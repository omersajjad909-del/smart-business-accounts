import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companies: {
          select: {
            company: {
              select: { name: true }
            }
          },
          take: 1
        }
      }
    });

    const rows = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      companyName: u.companies[0]?.company?.name || null
    }));

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
