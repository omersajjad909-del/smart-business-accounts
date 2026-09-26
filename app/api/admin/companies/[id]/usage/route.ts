import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { resolveCompanyRef } from "@/lib/companyRefServer";

const DAY = 24 * 60 * 60 * 1000;
const PAGE_VIEW = "CLIENT_PAGE_VIEW:";

// What the company has actually created, per module. Record counts don't
// depend on cookie consent the way page views do, so they are the reliable
// half of "what does this customer use".
const MODULES: { key: string; label: string; model: string; softDelete?: boolean }[] = [
  { key: "sales", label: "Sales Invoices", model: "salesInvoice", softDelete: true },
  { key: "purchases", label: "Purchase Invoices", model: "purchaseInvoice", softDelete: true },
  { key: "vouchers", label: "Vouchers", model: "voucher", softDelete: true },
  { key: "receipts", label: "Payment Receipts", model: "paymentReceipt", softDelete: true },
  { key: "expenses", label: "Expense Vouchers", model: "expenseVoucher", softDelete: true },
  { key: "quotations", label: "Quotations", model: "quotation" },
  { key: "purchaseOrders", label: "Purchase Orders", model: "purchaseOrder" },
  { key: "challans", label: "Delivery Challans", model: "deliveryChallan" },
  { key: "saleReturns", label: "Sale Returns", model: "saleReturn" },
  { key: "creditNotes", label: "Credit Notes", model: "creditNote" },
  { key: "items", label: "Items / Products", model: "itemNew", softDelete: true },
  { key: "accounts", label: "Accounts", model: "account", softDelete: true },
  { key: "contacts", label: "Contacts", model: "contact", softDelete: true },
  { key: "employees", label: "Employees", model: "employee" },
  { key: "payroll", label: "Payroll", model: "payroll" },
  { key: "attendance", label: "Attendance", model: "attendance" },
  { key: "bank", label: "Bank Statements", model: "bankStatement" },
];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const { id: ref } = await params;
    const id = await resolveCompanyRef(ref);
    if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const since30 = new Date(Date.now() - 30 * DAY);
    const db = prisma as any;

    const modules = (await Promise.all(MODULES.map(async (m) => {
      const where: Record<string, unknown> = { companyId: id };
      if (m.softDelete) where.deletedAt = null;
      try {
        const [total, last30, latest] = await Promise.all([
          db[m.model].count({ where }),
          db[m.model].count({ where: { ...where, createdAt: { gte: since30 } } }),
          db[m.model].findFirst({ where, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
        ]);
        return { key: m.key, label: m.label, total, last30, lastCreatedAt: latest?.createdAt || null };
      } catch {
        return null;
      }
    }))).filter((m): m is NonNullable<typeof m> => !!m && m.total > 0)
      .sort((a, b) => b.last30 - a.last30 || b.total - a.total);

    // Page views (last 30 days) grouped by page.
    const pageGroups = await prisma.activityLog.groupBy({
      by: ["action"],
      where: { companyId: id, action: { startsWith: PAGE_VIEW }, createdAt: { gte: since30 } },
      _count: { _all: true },
      _max: { createdAt: true },
    }).catch(() => [] as any[]);
    const pages = pageGroups
      .map((g: any) => ({ page: g.action.slice(PAGE_VIEW.length), views: g._count._all, lastViewed: g._max.createdAt }))
      .sort((a: any, b: any) => b.views - a.views)
      .slice(0, 15);

    // Daily logins + page views for a 30-day activity strip.
    const [sessions, views] = await Promise.all([
      prisma.session.findMany({
        where: { companyId: id, createdAt: { gte: since30 } },
        select: { createdAt: true, userId: true },
      }).catch(() => []),
      prisma.activityLog.findMany({
        where: { companyId: id, action: { startsWith: PAGE_VIEW }, createdAt: { gte: since30 } },
        select: { createdAt: true, userId: true },
      }).catch(() => []),
    ]);
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const daily: { date: string; logins: number; views: number }[] = [];
    for (let i = 29; i >= 0; i--) daily.push({ date: dayKey(new Date(Date.now() - i * DAY)), logins: 0, views: 0 });
    const dayIdx = new Map(daily.map((d, i) => [d.date, i]));
    for (const s of sessions) { const i = dayIdx.get(dayKey(s.createdAt)); if (i !== undefined) daily[i].logins++; }
    for (const v of views) { const i = dayIdx.get(dayKey(v.createdAt)); if (i !== undefined) daily[i].views++; }

    // Per-user engagement.
    const memberships = await prisma.userCompany.findMany({
      where: { companyId: id },
      select: { user: { select: { id: true, name: true, email: true } } },
    });
    const userIds = memberships.map((m) => m.user.id);
    const lastSessions = await prisma.session.groupBy({
      by: ["userId"],
      where: { companyId: id, userId: { in: userIds } },
      _max: { createdAt: true },
      _count: { _all: true },
    }).catch(() => [] as any[]);
    const lastSessionMap = new Map(lastSessions.map((s: any) => [s.userId, s]));
    const users = memberships.map(({ user }) => {
      const s: any = lastSessionMap.get(user.id);
      const userViews = views.filter((v) => v.userId === user.id);
      const lastView = userViews.reduce<Date | null>((max, v) => (!max || v.createdAt > max ? v.createdAt : max), null);
      const lastLogin: Date | null = s?._max?.createdAt || null;
      const lastSeen = [lastLogin, lastView].filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] || null;
      return {
        id: user.id, name: user.name, email: user.email,
        lastLogin, lastSeen,
        totalLogins: s?._count?._all || 0,
        logins30: sessions.filter((x) => x.userId === user.id).length,
        views30: userViews.length,
      };
    });

    // Timeline: everything except raw page views (those are summarised above),
    // plus the most recent page views so the admin sees the actual flow.
    const nameMap = new Map(memberships.map((m) => [m.user.id, m.user.name || m.user.email]));
    const timelineRaw = await prisma.activityLog.findMany({
      where: { companyId: id },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { action: true, createdAt: true, userId: true },
    }).catch(() => []);
    const timeline = timelineRaw.map((t) => ({
      action: t.action,
      createdAt: t.createdAt,
      user: t.userId ? nameMap.get(t.userId) || null : null,
    }));

    // Emails an admin has already sent this company (outreach history).
    const emailsSent = await (prisma as any).adminActionLog.findMany({
      where: { companyId: id, action: "SEND_CUSTOMER_EMAIL" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { adminEmail: true, details: true, createdAt: true },
    }).catch(() => []);

    return NextResponse.json({
      modules,
      pages,
      daily,
      users,
      timeline,
      emailsSent: emailsSent.map((e: any) => {
        let d: any = {};
        try { d = JSON.parse(e.details || "{}"); } catch {}
        return { by: e.adminEmail, subject: d.subject || "", to: d.to || [], createdAt: e.createdAt };
      }),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
