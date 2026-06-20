import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signJwt } from "@/lib/auth";
import bcrypt from "bcryptjs";

const DEMO_EMAIL = "finovaos.app@gmail.com";
const DEMO_PASSWORD = "Demo@1234";
const DEMO_NAME = "Demo User";
const DEMO_ROLE = "ADMIN";

const DEMO_COMPANY = {
  name: "FinovaOS Demo Co.",
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
  travel: "Travel Agency Demo Co.",
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

async function seedTravelBusinessRecords(companyId: string) {
  const existingCount = await prisma.businessRecord.count({
    where: { companyId, category: { in: ["travel_ticket", "visa_case"] } },
  });

  if (existingCount >= 4) return;

  const today = new Date();
  const travelRecords = [
    {
      companyId,
      category: "travel_ticket",
      title: "TRV-24018",
      amount: 185000,
      status: "issued",
      data: { passenger: "Ali Raza", airline: "Qatar Airways", route: "KHI -> DOH -> LHR", pnr: "A1B2C3" },
      date: today,
    },
    {
      companyId,
      category: "travel_ticket",
      title: "TRV-24019",
      amount: 92000,
      status: "booked",
      data: { passenger: "Sara Khan", airline: "Air Arabia", route: "KHI -> SHJ", pnr: "D4E5F6" },
      date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
    },
    {
      companyId,
      category: "visa_case",
      title: "VISA-24007",
      amount: 25000,
      status: "submitted",
      data: { applicant: "Hassan Ali", country: "United Kingdom", passportNo: "AB1234567" },
      date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      companyId,
      category: "visa_case",
      title: "VISA-24008",
      amount: 32000,
      status: "document_check",
      data: { applicant: "Ayesha Noor", country: "Canada", passportNo: "CD7654321" },
      date: today,
    },
  ];

  await prisma.businessRecord.createMany({ data: travelRecords });
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
    // Ensure sample data exists — but NEVER overwrite businessType of existing company
    const companyId = user.defaultCompanyId;
    if (companyId) {
      await seedBusinessRecords(companyId);
      if (businessType === "travel") {
        await seedTravelBusinessRecords(companyId);
      }
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
  if (businessType === "travel") {
    await seedTravelBusinessRecords(company.id);
  }

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
      // Non-fatal — proceed with cookie-only auth
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
    console.error("❌ DEMO LOGIN ERROR:", e);
    return NextResponse.json(
      { message: e.message || "Demo login failed. Please try again." },
      { status: 500 }
    );
  }
}

const ALLOWED_DEMO_TYPES = new Set([
  "trading",
  "distribution",
  "wholesale",
  "import_company",
  "export_company",
  "travel",
]);

function normalizeBusinessType(input?: string | null) {
  if (!input) return null;
  const normalized = String(input).trim().toLowerCase();
  if (!normalized) return null;
  return ALLOWED_DEMO_TYPES.has(normalized) ? normalized : null;
}

export async function GET(req: NextRequest) {
  const requested = normalizeBusinessType(req.nextUrl.searchParams.get("businessType"));
  return handleDemoLogin(req, requested);
}

export async function POST(req: NextRequest) {
  try {
    let businessType: string | null = null;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      businessType = typeof body?.businessType === "string" ? body.businessType : null;
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const form = await req.formData().catch(() => null);
      businessType = typeof form?.get("businessType") === "string" ? String(form?.get("businessType")) : null;
    } else {
      const body = await req.json().catch(() => ({}));
      businessType = typeof body?.businessType === "string" ? body.businessType : null;
    }

    const requested = normalizeBusinessType(
      businessType || req.nextUrl.searchParams.get("businessType")
    );
    return handleDemoLogin(req, requested);
  } catch {
    const requested = normalizeBusinessType(req.nextUrl.searchParams.get("businessType"));
    return handleDemoLogin(req, requested);
  }
}
