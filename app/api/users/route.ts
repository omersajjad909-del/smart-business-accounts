import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");

    // اگر یہ ایڈمن پینل سے کال ہو رہی ہے تو مکمل ڈیٹا بھیجیں
    if (role === "ADMIN") {
      const users = await prisma.user.findMany({
        include: { permissions: true },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(users);
    }

    // لاگ ان پیج کے لیے صرف ضروری ڈیٹا بھیجیں (سیکیورٹی کے لیے پاس ورڈ نکال دیا گیا ہے)
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");
    
    // صرف ADMIN صارفین نئے users create کر سکتے ہیں
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
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
    
    // صرف ADMIN صارفین کو update کر سکتے ہیں
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const { id, name, email, password, role, active } = await req.json();
    const updateData: any = { name, email, role, active };
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(updatedUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");
    
    // صرف ADMIN صارفین کو delete کر سکتے ہیں
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const { id } = await req.json();
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
