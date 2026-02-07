import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      // Allow login screen to fetch a basic user list before company is selected
      const publicUsers = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        where: { active: true },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(publicUsers);
    }

    if (role === "ADMIN") {
      const users = await prisma.user.findMany({
        where: { companies: { some: { companyId } } },
        include: { permissions: true },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(users);
    }

    const publicUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      where: { active: true, companies: { some: { companyId } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(publicUsers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");

    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { name, email, password, role } = await req.json();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "ACCOUNTANT",
        active: true,
        defaultCompanyId: companyId,
        companies: {
          create: [{ companyId, isDefault: true }],
        },
      },
    });
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");

    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { id, name, email, password, role, active } = await req.json();
    const updateData: Any = { name, email, role, active };
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const target = await prisma.userCompany.findFirst({
      where: { userId: id, companyId },
      select: { userId: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not in company" }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(updatedUser);
  } catch (error: Any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");

    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { id } = await req.json();
    const target = await prisma.userCompany.findFirst({
      where: { userId: id, companyId },
      select: { userId: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not in company" }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error: Any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

