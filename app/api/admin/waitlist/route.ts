/**
 * GET  /api/admin/waitlist            — list "notify me" entries for careers / affiliate
 * POST /api/admin/waitlist            — email everyone on one list, mark them notified
 *
 * Backed by BusinessWaitlist, scoped to the keys in lib/comingSoonWaitlist.ts
 * so this never touches the (separately managed) business-type waitlist rows.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { sendEmail } from "@/lib/email";
import { COMING_SOON_LISTS } from "@/lib/comingSoonWaitlist";

const prismaAny = prisma as any;
const LIST_KEYS = Object.keys(COMING_SOON_LISTS);

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const waitlist = prismaAny.businessWaitlist;
  if (!waitlist) return NextResponse.json({ items: [], counts: {} });

  const { searchParams } = new URL(req.url);
  const list = searchParams.get("list");
  const where = list && LIST_KEYS.includes(list)
    ? { businessType: list }
    : { businessType: { in: LIST_KEYS } };

  const [items, grouped] = await Promise.all([
    waitlist.findMany({ where, orderBy: { createdAt: "desc" }, take: 500 }),
    waitlist.groupBy({
      by: ["businessType", "notified"],
      where: { businessType: { in: LIST_KEYS } },
      _count: { id: true },
    }),
  ]);

  const counts: Record<string, { total: number; unnotified: number }> = {};
  for (const key of LIST_KEYS) counts[key] = { total: 0, unnotified: 0 };
  for (const g of grouped as { businessType: string; notified: boolean; _count: { id: number } }[]) {
    counts[g.businessType].total += g._count.id;
    if (!g.notified) counts[g.businessType].unnotified += g._count.id;
  }

  return NextResponse.json({ items, counts, lists: COMING_SOON_LISTS });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const { list } = await req.json() as { list?: string };
  if (!list || !COMING_SOON_LISTS[list]) {
    return NextResponse.json({ error: "Unknown list" }, { status: 400 });
  }

  const waitlist = prismaAny.businessWaitlist;
  if (!waitlist) return NextResponse.json({ error: "Waitlist storage unavailable" }, { status: 503 });

  const cfg = COMING_SOON_LISTS[list];
  const subscribers = await waitlist.findMany({
    where: { businessType: list, notified: false },
    select: { id: true, email: true, name: true },
  });

  if (!subscribers.length) {
    return NextResponse.json({ success: true, sent: 0, total: 0 });
  }

  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
      .wrap { max-width: 560px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
      .header { background: linear-gradient(135deg,#4f46e5,#7c3aed); padding: 32px 28px; text-align: center; }
      .header h1 { color: white; margin: 0; font-size: 22px; }
      .header .emoji { font-size: 48px; display: block; margin-bottom: 12px; }
      .body { padding: 28px; color: #333; line-height: 1.7; font-size: 15px; }
      .cta { display: block; margin: 24px auto; width: fit-content; padding: 14px 32px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; }
      .footer { padding: 16px 28px; font-size: 11px; color: #aaa; text-align: center; border-top: 1px solid #eee; }
    </style></head>
    <body>
      <div class="wrap">
        <div class="header">
          <span class="emoji">${cfg.emoji}</span>
          <h1>${cfg.label} is now live!</h1>
        </div>
        <div class="body">
          <p>${cfg.notifyIntro}</p>
          <a href="${appUrl}${cfg.launchPath}" class="cta">Take a look →</a>
        </div>
        <div class="footer">&copy; ${new Date().getFullYear()} FinovaOS &middot; You received this because you asked to be notified.</div>
      </div>
    </body>
    </html>
  `;

  let sent = 0;
  const ids: string[] = [];
  await Promise.allSettled(
    subscribers.map(async (s: { id: string; email: string }) => {
      const r = await sendEmail({ to: s.email, subject: cfg.notifySubject, html });
      if (r.success) { sent++; ids.push(s.id); }
    }),
  );

  if (ids.length) {
    await waitlist.updateMany({ where: { id: { in: ids } }, data: { notified: true, notifiedAt: new Date() } });
  }

  return NextResponse.json({ success: true, sent, total: subscribers.length });
}
