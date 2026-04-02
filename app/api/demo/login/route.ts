import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signJwt } from "@/lib/auth";
import bcrypt from "bcryptjs";

const DEMO_EMAIL = "finovaos.app@gmail.com";
const DEMO_PASSWORD = "Demo@1234";
const DEMO_NAME = "Demo User";
const DEMO_ROLE = "ADMIN";

const DEMO_COMPANY = {
  name: "Finova Demo Co.",
  country: "PK",
  baseCurrency: "PKR",
  businessType: "trading",
  businessSetupDone: true,
  plan: "ENTERPRISE",
  subscriptionStatus: "ACTIVE",
};

const DEMO_BUSINESS_LABELS: Record<string, string> = {
  trading: "Trader Demo Co.",
  distribution: "Distributor Demo Co.",
  wholesale: "Wholesale Demo Co.",
  import_company: "Importer Demo Co.",
  export_company: "Exporter Demo Co.",
};

const SALES_INVOICES = [
  { title: "INV-001", amount: 50000 },
  { title: "INV-002", amount: 35000 },
  { title: "INV-003", amount: 72000 },
  { title: "INV-004", amount: 28000 },
  { title: "INV-005", amount: 91000 },
];

const PURCHASE_INVOICES = [
  { title: "PUR-001", amount: 30000 },
  { title: "PUR-002", amount: 22000 },
  { title: "PUR-003", amount: 48000 },
  { title: "PUR-004", amount: 15000 },
  { title: "PUR-005", amount: 60000 },
];

const POS_SALES = [
  { title: "POS Sale", amount: 5000 },
  { title: "POS Sale", amount: 8500 },
  { title: "POS Sale", amount: 3200 },
];

async function seedBusinessRecords(companyId: string) {
  const existingCount = await prisma.businessRecord.count({
    where: { companyId },
  });

  if (existingCount >= 5) return;

  const now = new Date();

  const records = [
    ...SALES_INVOICES.map((inv) => ({
      companyId,
      category: "sales_invoice",
      title: inv.title,
      amount: inv.amount,
      status: "posted",
      data: { title: inv.title, amount: inv.amount, status: "posted" },
      date: now,
    })),
    ...PURCHASE_INVOICES.map((inv) => ({
      companyId,
      category: "purchase_invoice",
      title: inv.title,
      amount: inv.amount,
      status: "posted",
      data: { title: inv.title, amount: inv.amount, status: "posted" },
      date: now,
    })),
    ...POS_SALES.map((sale) => ({
      companyId,
      category: "pos_sale",
      title: sale.title,
      amount: sale.amount,
      status: "completed",
      data: { title: sale.title, amount: sale.amount, status: "completed" },
      date: now,
    })),
  ];

  await prisma.businessRecord.createMany({ data: records });
}

async function applyDemoBusinessType(companyId: string, businessType?: string | null) {
  if (!businessType) return;
  const nextBusinessType = businessType === "wholesale" ? "trading" : businessType;
  await prisma.company.update({
    where: { id: companyId },
    data: {
      businessType: nextBusinessType,
      businessSetupDone: true,
      name: DEMO_BUSINESS_LABELS[businessType] || DEMO_COMPANY.name,
      plan: "ENTERPRISE",
      subscriptionStatus: "ACTIVE",
    },
  });
}

async function getOrCreateDemoUser(businessType?: string | null) {
  // Check if demo user already exists
  let user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
  });

  if (user) {
    // Ensure sample data exists
    const companyId = user.defaultCompanyId;
    if (companyId) {
      await applyDemoBusinessType(companyId, businessType);
      await seedBusinessRecords(companyId);
    }
    return user;
  }

  // Create demo company
  const company = await prisma.company.create({
    data: DEMO_COMPANY,
  });

  // Hash password and create user
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);

  user = await prisma.user.create({
    data: {
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      password: hashedPassword,
      role: DEMO_ROLE,
      active: true,
      defaultCompanyId: company.id,
    },
  });

  // Link user to company
  await prisma.userCompany.create({
    data: {
      userId: user.id,
      companyId: company.id,
      isDefault: true,
    },
  });

  // Seed sample business records
  await seedBusinessRecords(company.id);
  await applyDemoBusinessType(company.id, businessType);

  return user;
}

async function handleDemoLogin(req: NextRequest, businessType?: string | null) {
  try {
    const requestedBusinessType = businessType ?? req.nextUrl.searchParams.get("businessType");
    const user = await getOrCreateDemoUser(requestedBusinessType);
    const companyId = user.defaultCompanyId;

    if (!companyId) {
      return NextResponse.json(
        { message: "Demo company not found" },
        { status: 500 }
      );
    }

    const token = signJwt({
      userId: user.id,
      role: user.role,
      companyId,
    });

    // Create session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    try {
      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
          companyId,
          ip: req.headers.get("x-forwarded-for"),
          userAgent: req.headers.get("user-agent") || null,
        },
      });
    } catch {
      // Non-fatal â€” proceed with cookie-only auth
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { businessType: true, name: true },
    });

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.toUpperCase(),
      companyId,
    };

    const res = NextResponse.json({
      user: safeUser,
      company: {
        businessType: company?.businessType || null,
        name: company?.name || null,
      },
    });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.cookies.set("sb_auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch (e: any) {
    console.error("âŒ DEMO LOGIN ERROR:", e);
    return NextResponse.json(
      { message: e.message || "Demo login failed. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleDemoLogin(req);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const businessType = typeof body?.businessType === "string" ? body.businessType : null;
    return handleDemoLogin(req, businessType);
  } catch {
    return handleDemoLogin(req);
  }
}


