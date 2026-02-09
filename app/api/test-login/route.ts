import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Test endpoint to check users and database
export async function GET(_req: NextRequest) {
  try {
    // Check database connection
    await prisma.$connect();
    
    // Get all users (without passwords)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Check if any users exist
    const userCount = await prisma.user.count();

    return NextResponse.json({
      databaseConnected: true,
      userCount,
      users,
      message: userCount === 0 ? "No users found. Please create a user first." : "Users found",
    });
  } catch (error: any) {
    console.error("❌ TEST LOGIN ERROR:", error);
    return NextResponse.json(
      {
        databaseConnected: false,
        error: error.message,
        code: error.code,
        meta: error.meta,
      },
      { status: 500 }
    );
  }
}

