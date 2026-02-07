import { NextRequest, NextResponse } from "next/server";
import { PrismaClient , Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
type RolePermission = Prisma.RolePermissionGetPayload<Prisma.RolePermissionDefaultArgs>;


const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
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
    } catch (bcryptError: Any) {
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

    // Fetch companies for multi-tenant context
    let companies: Prisma.UserCompanyGetPayload<{ include: { company: true } }>[] = [];
    try {
      companies = await prisma.userCompany.findMany({
        where: { userId: user.id },
        include: { company: true },
      });
    } catch (companyError: Any) {
      console.error("LOGIN COMPANIES ERROR:", companyError);
    }

    const defaultCompanyId =
      user.defaultCompanyId ||
      companies.find((c: Any) => c.isDefault)?.companyId ||
      companies[0]?.companyId ||
      null;

    // Fetch role-based permissions
    let rolePermissions: Array<{ permission: string }> = [];
    try {
      rolePermissions = await prisma.rolePermission.findMany({
        where: { role: user.role, companyId: defaultCompanyId || undefined },
        select: { permission: true },
      });
    } catch (permError: Any) {
      console.error("❌ LOGIN PERMISSIONS ERROR:", permError);
      // Continue without role permissions if error occurs
    }

    const userPermissions = (user.permissions || [])
      .filter((p: Any) => !defaultCompanyId || p.companyId === defaultCompanyId)
      .map((p: Any) => p.permission || p);

    // 🔥 FRONTEND KE LIYE SAFE USER OBJECT (getCurrentUser() ke format ke mutabiq)
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.toUpperCase(), // Ensure uppercase
      permissions: userPermissions, // User-specific permissions
      rolePermissions: rolePermissions.map((rp) => rp.permission),
      companyId: defaultCompanyId,
      companies: companies.map((c: Any) => ({
        id: c.companyId,
        name: c.company?.name,
        code: c.company?.code,
        isDefault: c.isDefault,
      })),

    };

    console.log("✅ LOGIN SUCCESS:", { 
      userId: safeUser.id, 
      email: safeUser.email, 
      role: safeUser.role 
    });

    return NextResponse.json({ user: safeUser });
  } catch (e: Any) {
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



