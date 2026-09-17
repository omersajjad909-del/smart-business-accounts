/**
 * POST /api/company/reset-all — wipe every record this company has recorded,
 * keeping the company, its users and their logins.
 *
 * This is the same primitive the demo sandbox uses to reset itself
 * (`clearCompanyData`), pointed at a real tenant instead. Because it is
 * irreversible and destroys real bookkeeping, it needs more than a signed-in
 * cookie: only an ADMIN, re-typing their current password and the exact
 * company name, can trigger it — the same "type the name to confirm" bar
 * used for destructive actions elsewhere, plus the password check
 * change-password already uses to prove the human at the keyboard is who the
 * session says they are.
 *
 * GET returns just the company name, so the confirm screen can tell the
 * caller what to type without trusting anything the client already has
 * cached.
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync } from "@/lib/rateLimit";
import { requireActiveSession, isCredentialChangeAllowed } from "@/lib/sessionGuard";
import { clearCompanyData } from "@/lib/clearCompanyData";

export async function GET(req: NextRequest) {
  const session = await requireActiveSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.companyId) {
    return NextResponse.json({ error: "No company on this session" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { name: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({
    companyName: company.name,
    isAdmin: session.role === "ADMIN",
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireActiveSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isCredentialChangeAllowed(session)) {
      return NextResponse.json(
        { error: "This cannot be done from an impersonated or demo session" },
        { status: 403 },
      );
    }
    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Only an admin can reset the system" }, { status: 403 });
    }
    if (!session.companyId) {
      return NextResponse.json({ error: "No company on this session" }, { status: 400 });
    }

    // Throttled per account — this is an online guess against the current
    // password, same reasoning as change-password.
    const rl = await rateLimitAsync(`reset-all:${session.userId}`, 3, 15 * 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait before trying again." },
        { status: 429 },
      );
    }

    const { password, confirmName } = await req.json().catch(() => ({}) as any);
    if (!password || !confirmName) {
      return NextResponse.json({ error: "Password and company name confirmation are required" }, { status: 400 });
    }

    const [user, company] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, password: true, email: true, name: true },
      }),
      prisma.company.findUnique({
        where: { id: session.companyId },
        select: { id: true, name: true, isDemo: true },
      }),
    ]);
    if (!user || !company) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const passwordMatch = await bcrypt.compare(String(password), user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    if (String(confirmName).trim() !== company.name) {
      return NextResponse.json({ error: "Company name does not match" }, { status: 400 });
    }

    await clearCompanyData(company.id);

    // Written after the wipe, not inside it — clearCompanyData deletes this
    // company's ActivityLog rows as part of the transaction, so a row
    // written before would be erased along with everything else.
    await prisma.activityLog.create({
      data: {
        companyId: company.id,
        userId: user.id,
        action: "SYSTEM_RESET",
        details: `Full system reset performed by ${user.name} (${user.email})`,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("RESET ALL SYSTEM ERROR:", error);
    return NextResponse.json({ error: "Failed to reset system" }, { status: 500 });
  }
}
