import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signJwt } from "@/lib/auth";
import bcrypt from "bcryptjs";

const DEMO_EMAIL = "finovaos.app@gmail.com";
const DEMO_PASSWORD = "Demo@1234";
const DEMO_NAME = "Demo User";
const DEMO_ROLE = "ADMIN";
const SLOT_MINUTES = 30;
const GRACE_MINUTES_BEFORE = 5;
const GRACE_MINUTES_AFTER = 5;

const BUSINESS_LABELS: Record<string, string> = {
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

async function seedRecords(companyId: string, businessType: string) {
  const now = new Date();
  const base = [
    ...SALES_INVOICES.map(inv => ({
      companyId,
      category: "sales_invoice",
      title: inv.title,
      amount: inv.amount,
      status: "posted",
      data: { title: inv.title, amount: inv.amount, status: "posted" },
      date: now,
    })),
    ...PURCHASE_INVOICES.map(inv => ({
      companyId,
      category: "purchase_invoice",
      title: inv.title,
      amount: inv.amount,
      status: "posted",
      data: { title: inv.title, amount: inv.amount, status: "posted" },
      date: now,
    })),
    ...POS_SALES.map(sale => ({
      companyId,
      category: "pos_sale",
      title: sale.title,
      amount: sale.amount,
      status: "completed",
      data: { title: sale.title, amount: sale.amount, status: "completed" },
      date: now,
    })),
  ];
  await prisma.businessRecord.createMany({ data: base });

  if (businessType === "travel") {
    const today = new Date();
    await prisma.businessRecord.createMany({
      data: [
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
      ],
    });
  }
}

async function getOrCreateDemoUser() {
  let user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (user) return user;

  const hashed = await bcrypt.hash(DEMO_PASSWORD, 12);
  user = await prisma.user.create({
    data: {
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      password: hashed,
      role: DEMO_ROLE,
      active: true,
    },
  });
  return user;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const accessToken = String(body?.accessToken || "").trim();
    if (!accessToken) {
      return NextResponse.json({ error: "Access token required" }, { status: 400 });
    }

    const booking = await (prisma as any).demoBooking.findUnique({
      where: { accessToken },
    });
    if (!booking) {
      return NextResponse.json({ error: "Invalid booking token" }, { status: 404 });
    }
    if (booking.status === "COMPLETED" || booking.status === "EXPIRED") {
      return NextResponse.json({ error: "This demo booking has already ended" }, { status: 410 });
    }

    const now = Date.now();
    const slotStartMs = new Date(booking.slotStart).getTime();
    const slotEndMs = new Date(booking.slotEnd).getTime();
    if (now < slotStartMs - GRACE_MINUTES_BEFORE * 60000) {
      return NextResponse.json(
        {
          error: "Your demo has not started yet",
          slotStart: booking.slotStart,
          startsInSeconds: Math.round((slotStartMs - now) / 1000),
        },
        { status: 425 }
      );
    }
    if (now > slotEndMs + GRACE_MINUTES_AFTER * 60000) {
      await (prisma as any).demoBooking.update({
        where: { id: booking.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "Your demo slot has expired" }, { status: 410 });
    }

    const user = await getOrCreateDemoUser();
    let companyId = booking.demoCompanyId;

    if (!companyId) {
      const label = BUSINESS_LABELS[booking.businessType] || "FinovaOS Demo Co.";
      const nextType = booking.businessType === "wholesale" ? "trading" : booking.businessType;
      const company = await prisma.company.create({
        data: {
          name: `${label} (${booking.id.slice(0, 6).toUpperCase()})`,
          country: "PK",
          baseCurrency: "PKR",
          businessType: nextType,
          businessSetupDone: true,
          plan: "ENTERPRISE",
          subscriptionStatus: "ACTIVE",
        },
      });
      companyId = company.id;
      await prisma.userCompany.upsert({
        where: { userId_companyId: { userId: user.id, companyId } },
        update: {},
        create: { userId: user.id, companyId, isDefault: false },
      });
      await seedRecords(companyId, booking.businessType);
    }

    const sessionEndsAt = Math.min(slotEndMs, now + SLOT_MINUTES * 60000);
    const token = signJwt({ userId: user.id, role: user.role, companyId });

    try {
      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(sessionEndsAt),
          companyId,
          ip: req.headers.get("x-forwarded-for"),
          userAgent: req.headers.get("user-agent") || null,
        },
      });
    } catch {}

    await (prisma as any).demoBooking.update({
      where: { id: booking.id },
      data: {
        status: "ACTIVE",
        startedAt: booking.startedAt || new Date(),
        demoCompanyId: companyId,
      },
    });

    const res = NextResponse.json({
      success: true,
      companyId,
      businessType: booking.businessType,
      sessionEndsAt,
    });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.cookies.set("sb_auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(60, Math.round((sessionEndsAt - now) / 1000)),
    });
    res.cookies.set(
      "finova_demo",
      JSON.stringify({ bookingId: booking.id, endsAt: sessionEndsAt }),
      {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: Math.max(60, Math.round((sessionEndsAt - now) / 1000)),
      }
    );

    return res;
  } catch (e: any) {
    console.error("DEMO START ERROR:", e);
    return NextResponse.json({ error: e.message || "Failed to start demo" }, { status: 500 });
  }
}
