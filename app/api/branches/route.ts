import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { logActivity } from "@/lib/audit";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();
if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

async function getCompanyId(req: NextRequest): Promise<string | null> {
  try {
    // 1. Direct header (most reliable)
    const fromHeader = req.headers.get("x-company-id");
    if (fromHeader) return fromHeader;

    // 2. Lookup via user-id header
    const userId = req.headers.get("x-user-id");
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { defaultCompanyId: true },
      });
      if (user?.defaultCompanyId) return user.defaultCompanyId;
    }

    // 3. JWT cookie fallback
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/sb_auth=([^;]+)/);
    if (match) {
      const raw = decodeURIComponent(match[1]);
      try {
        // JWT payload is middle segment, base64 encoded
        const parts = raw.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
          const cid = payload?.companyId || payload?.defaultCompanyId;
          if (cid) return cid;
        }
      } catch { /* invalid JWT, skip */ }
    }

    return null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const branches = await prisma.branch.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(branches);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role")?.toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const userId = req.headers.get("x-user-id");
    const companyId = await getCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const body = await req.json();
    if (!body.code || !body.name) {
      return NextResponse.json({ error: "Code and name required" }, { status: 400 });
    }
    const branch = await prisma.branch.create({
      data: {
        companyId,
        code: body.code,
        name: body.name,
        city: body.city || null,
        address: body.address || null,
        phone: body.phone || null,
        managerName: body.managerName || null,
        isActive: body.isActive !== false,
      },
    });
    await logActivity(prisma, {
      companyId,
      userId,
      action: "BRANCH_CREATED",
      details: `Created branch ${branch.code} - ${branch.name}`,
    });
    return NextResponse.json(branch);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role")?.toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const userId = req.headers.get("x-user-id");
    const companyId = await getCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    const updated = await prisma.branch.updateMany({
      where: { id: body.id, companyId },
      data: {
        code: body.code,
        name: body.name,
        city: body.city || null,
        address: body.address || null,
        phone: body.phone || null,
        managerName: body.managerName || null,
        isActive: body.isActive !== false,
      },
    });
    if (!updated.count) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
    await logActivity(prisma, {
      companyId,
      userId,
      action: "BRANCH_UPDATED",
      details: `Updated branch ${body.id}`,
    });
    const branch = await prisma.branch.findUnique({ where: { id: body.id } });
    return NextResponse.json(branch);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role")?.toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const userId = req.headers.get("x-user-id");
    const companyId = await getCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await prisma.branch.deleteMany({ where: { id, companyId } });
    await logActivity(prisma, {
      companyId,
      userId,
      action: "BRANCH_DELETED",
      details: `Deleted branch ${id}`,
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
