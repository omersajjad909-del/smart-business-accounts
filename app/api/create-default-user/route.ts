import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

// Emergency endpoint to create default admin user
export async function POST(req: Request) {
  try {
    const { password = "us786" } = await req.json().catch(() => ({}));

    // Check if admin already exists
    const existing = await prisma.user.findUnique({
      where: { email: "admin@local.com" },
    });

    if (existing) {
      return NextResponse.json({
        message: "Admin user already exists",
        email: "admin@local.com",
        password: "Use existing password",
      });
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: "Admin",
        email: "admin@local.com",
        password: hashedPassword,
        role: "ADMIN",
        active: true,
        permissions: [
          "VIEW_DASHBOARD",
          // Add other default permissions here if needed
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message: "Default admin user created",
      email: user.email,
      password: password,
      note: "Please login with these credentials",
    });
  } catch (e: any) {
    console.error("❌ CREATE USER ERROR:", e);
    return NextResponse.json(
      {
        success: false,
        error: e.message || "Failed to create user",
        details: process.env.NODE_ENV === "development" ? e.stack : undefined,
      },
      { status: 500 }
    );
  }
}
