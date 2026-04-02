import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyName, industry, branchCount, adminName, adminEmail, adminPassword, plan, billingCycle } = body;

    // Validate input
    if (!companyName || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create company
    const company = await prisma.company.create({
      data: {
        name: companyName,
        code: companyName.substring(0, 10).toUpperCase().replace(/\s+/g, ""),
        isActive: true,
      },
    });

    await prisma.branch.create({
      data: {
        companyId: company.id,
        code: "MAIN",
        name: "Main Branch",
        city: null,
        isActive: true,
      },
    });

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: "ADMIN",
        active: true,
        defaultCompanyId: company.id,
        companies: {
          create: {
            companyId: company.id,
            isDefault: true,
          },
        },
      },
    });

    // Create subscription (awaiting payment)
    try {
      const anyPrisma = prisma as any;
      if (anyPrisma.subscription?.create) {
        await anyPrisma.subscription.create({
          data: {
            companyId: company.id,
            plan: String(plan || "STARTER").toUpperCase(),
            status: "PENDING_PAYMENT",
            billingCycle: String(billingCycle || "MONTHLY").toUpperCase(),
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(), // Immediate expiration until payment
          },
        });
      }
    } catch {
      // Ignore subscription creation failure for now; company + admin still succeed
    }

    // Log the company creation in AuditLog (best-effort, tolerant of older clients)
    try {
      const anyPrisma = prisma as any;
      if (anyPrisma.auditLog?.create) {
        await anyPrisma.auditLog.create({
          data: {
            companyId: company.id,
            entity: "Company",
            entityId: company.id,
            action: "CREATE",
            userId: adminUser.id,
            userName: adminUser.name,
            userRole: "ADMIN",
            description: `Company created: ${companyName}`,
          },
        });
      }
    } catch {}

    return NextResponse.json(
      {
        companyId: company.id,
        userId: adminUser.id,
        message: "Company created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
