import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

// Simple database connection test
export async function GET() {
  try {
    // Test connection
    await prisma.$connect();
    
    // Simple query
    const userCount = await prisma.user.count();
    
    return NextResponse.json({
      success: true,
      message: "Database connected successfully",
      userCount,
      database: "smart_accounts",
      host: "localhost:5432",
    });
  } catch (error: Any) {
    console.error("❌ DATABASE CONNECTION ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        details: {
          message: "Cannot connect to PostgreSQL database",
          solution: [
            "1. Make sure PostgreSQL service is running",
            "2. Check if port 5432 is open",
            "3. Verify database 'smart_accounts' exists",
            "4. Check username/password: postgres/12345678",
          ],
        },
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

