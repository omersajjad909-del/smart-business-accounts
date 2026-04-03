/**
 * /api/admin/business-modules
 *
 * GET  — returns all business types with phase, status, enabled state, and waitlist counts
 * POST — actions:
 *   TOGGLE        { id, enabled }          — turn a single type ON/OFF
 *   RELEASE_PHASE { phase }                — enable all types in a phase at once
 *   RESET         { id }                   — remove admin override for one type
 *   RESET_ALL                              — clear all admin overrides
 *   NOTIFY_WAITLIST { id }                 — manually send emails to waitlist for a type
 *
 * When a type is toggled ON, waitlist subscribers are auto-notified by email.
 * Storage: ActivityLog with action = "BUSINESS_MODULE_CONFIG"
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { BUSINESS_PHASE_CONFIG } from "@/lib/businessModules";
import { sendEmail } from "@/lib/email";

const ACTION_KEY = "BUSINESS_MODULE_CONFIG";
const prismaAny = prisma as any;

function isAdmin(req: NextRequest) {
  const role = String(req.headers.get("x-user-role") || "").toUpperCase();
  if (role === "ADMIN") return true;
  try {
    const p = verifyJwt(getTokenFromRequest(req as any)!);
    return String(p?.role || "").toUpperCase() === "ADMIN";
  } catch { return false; }
}

async function loadOverrides(): Promise<Record<string, string>> {
  try {
    const log = await prisma.activityLog.findFirst({
      where: { action: ACTION_KEY },
      orderBy: { createdAt: "desc" },
    });
    if (log?.details) return JSON.parse(log.details) as Record<string, string>;
  } catch {}
  return {};
}

async function saveOverrides(overrides: Record<string, string>) {
  await prisma.activityLog.create({
    data: { action: ACTION_KEY, details: JSON.stringify(overrides) },
  });
}

/** Send notification emails to all un-notified waitlist entries for a business type */
async function notifyWaitlist(businessType: string): Promise<number> {
  const cfg = BUSINESS_PHASE_CONFIG[businessType];
  if (!cfg) return 0;
  const waitlist = prismaAny.businessWaitlist;
  if (!waitlist) return 0;

  let subscribers: { id: string; email: string; name: string | null }[] = [];
  try {
    subscribers = await waitlist.findMany({
      where: { businessType, notified: false },
      select: { id: true, email: true, name: true },
    });
  } catch { return 0; }

  if (!subscribers.length) return 0;

  const subject = `🎉 ${cfg.label} is now live on Finova!`;
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
          <h1>${cfg.label} is now Live!</h1>
        </div>
        <div class="body">
          <p>Great news! You asked us to notify you when <strong>${cfg.label}</strong> went live on Finova — and it's here!</p>
          <p>${cfg.description}</p>
          <p>You can now select <strong>${cfg.label}</strong> as your business type and get a fully configured dashboard with accounts, KPIs, and modules — all set up automatically.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://usefinova.app"}/business-setup" class="cta">
            Set Up My ${cfg.label} Dashboard →
          </a>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Finova &middot; You received this because you joined the waitlist.
        </div>
      </div>
    </body>
    </html>
  `;

  let sent = 0;
  const ids: string[] = [];

  await Promise.allSettled(
    subscribers.map(async (s) => {
      const r = await sendEmail({ to: s.email, subject, html });
      if (r.success) { sent++; ids.push(s.id); }
    })
  );

  // Mark as notified
  if (ids.length) {
    await waitlist.updateMany({
      where: { id: { in: ids } },
      data: { notified: true, notifiedAt: new Date() },
    });
  }

  return sent;
}

// ── GET ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const overrides = await loadOverrides();

  // Load waitlist counts grouped by businessType
  const waitlistCounts: Record<string, number> = {};
  try {
    const waitlist = prismaAny.businessWaitlist;
    const counts = waitlist ? await waitlist.groupBy({
      by: ["businessType"],
      where: { notified: false },
      _count: { id: true },
    }) : [];
    counts.forEach((c: any) => { waitlistCounts[c.businessType] = c._count.id; });
  } catch {}

  const modules = Object.entries(BUSINESS_PHASE_CONFIG).map(([id, cfg]) => {
    const adminStatus    = overrides[id];
    const effectiveStatus = adminStatus || cfg.status;
    return {
      id,
      label:         cfg.label,
      emoji:         cfg.emoji,
      description:   cfg.description,
      category:      cfg.category,
      phase:         cfg.phase,
      defaultStatus: cfg.status,
      status:        effectiveStatus,
      enabled:       effectiveStatus === "live",
      adminOverride: !!adminStatus,
      waitlistCount: waitlistCounts[id] || 0,
    };
  });

  const byPhase = {
    1: modules.filter(m => m.phase === 1),
    2: modules.filter(m => m.phase === 2),
    3: modules.filter(m => m.phase === 3),
    4: modules.filter(m => m.phase === 4),
  };

  return NextResponse.json({ modules, byPhase, overrides });
}

// ── POST ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action, id, enabled, phase } = body;

  const overrides = await loadOverrides();

  // ── TOGGLE single type ─────────────────────────────────────
  if (action === "TOGGLE") {
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const turningOn = !!enabled;
    overrides[id] = turningOn ? "live" : "coming_soon";
    await saveOverrides(overrides);

    // Auto-notify waitlist when turning ON
    let notified = 0;
    if (turningOn) {
      notified = await notifyWaitlist(id);
    }

    return NextResponse.json({ success: true, id, status: overrides[id], notified });
  }

  // ── RELEASE entire phase ───────────────────────────────────
  if (action === "RELEASE_PHASE") {
    if (!phase) return NextResponse.json({ error: "phase required" }, { status: 400 });
    const phaseNum = Number(phase);

    const typeIds = Object.entries(BUSINESS_PHASE_CONFIG)
      .filter(([, cfg]) => cfg.phase === phaseNum)
      .map(([id]) => id);

    // Only enable those not already live
    const newlyEnabled: string[] = [];
    for (const tid of typeIds) {
      const alreadyLive = (overrides[tid] || BUSINESS_PHASE_CONFIG[tid].status) === "live";
      if (!alreadyLive) {
        overrides[tid] = "live";
        newlyEnabled.push(tid);
      }
    }

    await saveOverrides(overrides);

    // Notify waitlist for all newly enabled types
    let totalNotified = 0;
    await Promise.allSettled(
      newlyEnabled.map(async (tid) => {
        const n = await notifyWaitlist(tid);
        totalNotified += n;
      })
    );

    return NextResponse.json({
      success: true,
      phase: phaseNum,
      released: typeIds.length,
      newlyEnabled: newlyEnabled.length,
      notified: totalNotified,
    });
  }

  // ── NOTIFY_WAITLIST manually ───────────────────────────────
  if (action === "NOTIFY_WAITLIST") {
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const notified = await notifyWaitlist(id);
    return NextResponse.json({ success: true, id, notified });
  }

  // ── RESET single override ──────────────────────────────────
  if (action === "RESET") {
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    delete overrides[id];
    await saveOverrides(overrides);
    return NextResponse.json({ success: true, id, reset: true });
  }

  // ── RESET ALL overrides ────────────────────────────────────
  if (action === "RESET_ALL") {
    await saveOverrides({});
    return NextResponse.json({ success: true, reset: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
