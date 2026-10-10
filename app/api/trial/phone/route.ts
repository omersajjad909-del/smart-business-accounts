import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { normalizePhone } from "@/lib/verification";

export const runtime = "nodejs";

/**
 * POST /api/trial/phone { phone }
 *
 * A trial that began with Google or a magic link has no phone number — those
 * flows never ask for one. The number is what stops one person collecting
 * trials with throwaway email addresses, so it is asked for here, and until it
 * is given the subscription guard refuses writes (reads still work).
 *
 * One trial per number: a number already attached to another company is refused.
 */
export async function POST(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(body?.phone);
  // E.164 allows at most 15 digits; under 8 is not a callable number anywhere.
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    return NextResponse.json({ error: "Enter a valid phone number with country code." }, { status: 400 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { trialEndsAt: true, trialPhone: true },
  });
  if (!company || !company.trialEndsAt) {
    return NextResponse.json({ error: "No free trial on this account." }, { status: 400 });
  }
  if (company.trialPhone) return NextResponse.json({ ok: true });

  const used = await prisma.company.findFirst({
    where: { trialPhone: phone, id: { not: companyId } },
    select: { id: true },
  });
  if (used) {
    return NextResponse.json(
      { error: "A free trial has already been started with this phone number." },
      { status: 409 },
    );
  }

  await prisma.company.update({ where: { id: companyId }, data: { trialPhone: phone } });
  return NextResponse.json({ ok: true });
}
