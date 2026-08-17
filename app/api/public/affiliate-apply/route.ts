import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { AFFILIATE_APPLICATIONS_OPEN, AFFILIATE_PROGRAM_LIVE } from "@/lib/affiliateProgram";

function genCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    // Hiding the form is not the same as closing the door — this endpoint is
    // public, so it has to refuse on its own rather than trust the UI. Without
    // this an application could still be filed against a program that pays
    // nothing yet, and we would owe someone an answer we do not have.
    if (!AFFILIATE_PROGRAM_LIVE && !AFFILIATE_APPLICATIONS_OPEN) {
      return NextResponse.json(
        { error: "The affiliate program is not open yet." },
        { status: 503 },
      );
    }

    const data = await req.json() as { name?: string; email?: string; website?: string; audience?: string };
    if (!data.name || !data.email) return NextResponse.json({ error: "Name and email required" }, { status: 400 });

    // Check if already applied
    const existing = await prisma.affiliate.findUnique({ where: { email: data.email } });
    if (existing) return NextResponse.json({ success: true, status: existing.status, alreadyApplied: true });

    // Generate unique tracking code
    let code = genCode();
    let attempts = 0;
    while (attempts < 5) {
      const taken = await prisma.affiliate.findUnique({ where: { trackingCode: code } });
      if (!taken) break;
      code = genCode();
      attempts++;
    }

    await prisma.affiliate.create({
      data: {
        name: data.name,
        email: data.email,
        website: data.website,
        audience: data.audience,
        trackingCode: code,
        status: "PENDING",
      },
    });

    try {
      await (prisma as unknown as { notification: { create: (a: unknown) => Promise<unknown> } }).notification.create({
        data: { type: "INFO", title: `New Affiliate Application`, message: `${data.name} (${data.email}) applied — ${data.audience}`, isRead: false },
      });
    } catch { /* notification model optional */ }

    return NextResponse.json({ success: true, status: "PENDING" });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
