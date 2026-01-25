import { NextRequest, NextResponse } from "next/server";
import { PrismaClient , Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
type RolePermission = Prisma.RolePermissionGetPayload<{}>;


const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("❌ LOGIN JSON PARSE ERROR:", parseError);
      return NextResponse.json(
        { message: "Invalid request format" },
        { status: 400 }
      );
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Username/Email and password required" },
        { status: 400 }
      );
    }

    const emailNormalized = email.trim().toLowerCase();
    console.log("🔍 LOGIN ATTEMPT:", { emailOrName: emailNormalized, hasPassword: !!password });

    // Check database connection - search by email OR name
    let user;
    try {
      // First try to find by email (exact match)
      user = await prisma.user.findUnique({
        where: { email: emailNormalized },
        include: {
          permissions: true,
        },
      });

      // If not found, search by name OR email (case-insensitive)
      if (!user) {
        const allUsers = await prisma.user.findMany({
          where: {
            OR: [
              {
                email: {
                  equals: emailNormalized,
                  mode: "insensitive",
                },
              },
              {
                name: {
                  equals: email.trim(), // Try exact name match
                  mode: "insensitive",
                },
              },
            ],
          },
          include: {
            permissions: true,
          },
        });
        user = allUsers[0] || null;
      }

      console.log("🔍 USER SEARCH:", { searchTerm: emailNormalized });
      console.log("🔍 USER FOUND:", user ? { id: user.id, name: user.name, email: user.email, active: user.active } : "NOT FOUND");
    } catch (dbError: any) {
      console.error("❌ LOGIN DATABASE ERROR:", dbError);
      console.error("❌ DATABASE ERROR DETAILS:", {
        message: dbError.message,
        code: dbError.code,
        meta: dbError.meta,
      });
      return NextResponse.json(
        { message: "Database connection error. Please try again.", error: dbError.message },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { message: "Invalid username/email or password" },
        { status: 401 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { message: "Account is inactive. Please contact administrator." },
        { status: 401 }
      );
    }

    // Verify password
    let passwordMatch = false;
    try {
      console.log("🔐 PASSWORD CHECK:", {
        hasStoredPassword: !!user.password,
        storedPasswordLength: user.password?.length,
      });
      passwordMatch = await bcrypt.compare(password, user.password);
      console.log("🔐 PASSWORD MATCH:", passwordMatch);
    } catch (bcryptError: any) {
      console.error("❌ LOGIN BCRYPT ERROR:", bcryptError);
      console.error("❌ BCRYPT ERROR DETAILS:", {
        message: bcryptError.message,
        stack: bcryptError.stack,
      });
      return NextResponse.json(
        { message: "Password verification failed", error: bcryptError.message },
        { status: 500 }
      );
    }

    if (!passwordMatch) {
      console.log("❌ PASSWORD MISMATCH");
      return NextResponse.json(
        { message: "Invalid username/email or password" },
        { status: 401 }
      );
    }

    // Fetch role-based permissions
    let rolePermissions = [];
    try {
      rolePermissions = await prisma.rolePermission.findMany({
        where: { role: user.role },
        select: { permission: true },
      });
    } catch (permError: any) {
      console.error("❌ LOGIN PERMISSIONS ERROR:", permError);
      // Continue without role permissions if error occurs
    }

    // 🔥 FRONTEND KE LIYE SAFE USER OBJECT (getCurrentUser() ke format ke mutabiq)
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.toUpperCase(), // Ensure uppercase
      permissions: (user.permissions || []).map((p: any) => p.permission || p), // User-specific permissions
      rolePermissions: rolePermissions.map((rp: RolePermission) => rp.permission),

    };

    console.log("✅ LOGIN SUCCESS:", { 
      userId: safeUser.id, 
      email: safeUser.email, 
      role: safeUser.role 
    });

    return NextResponse.json({ user: safeUser });
  } catch (e: any) {
    console.error("❌ LOGIN ERROR:", e);
    console.error("❌ LOGIN ERROR DETAILS:", {
      message: e.message,
      stack: e.stack,
      name: e.name,
    });
    return NextResponse.json(
      {
        message: e.message || "Login failed. Please try again.",
        error: process.env.NODE_ENV === "development" ? e.message : undefined,
      },
      { status: 500 }
    );
  }
}
