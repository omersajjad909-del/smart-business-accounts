import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const company = String(body?.company || "").trim();
    const source = String(body?.source || "waitlist-page").trim();

    if (!name || !email || !company) {
      return NextResponse.json(
        { error: "Name, email, and company are required." },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    await db.newsletterSubscriber.upsert({
      where: { email },
      update: {
        status: "active",
        name,
        unsubscribedAt: null,
        source,
      },
      create: {
        email,
        name,
        source,
        status: "active",
      },
    });

    try {
      const existingLead = await db.lead.findFirst({
        where: {
          email,
          source,
        },
        select: { id: true },
      });

      if (!existingLead) {
        await db.lead.create({
          data: {
            name,
            email,
            company,
            source,
            status: "new",
            priority: "medium",
            message: `Waitlist signup from ${company}`,
          },
        });
      }
    } catch {
      // Lead capture is best-effort so the public waitlist flow never fails for analytics reasons.
    }

    await db.activityLog.create({
      data: {
        action: "WAITLIST_SIGNUP",
        details: JSON.stringify({
          name,
          email,
          company,
          source,
          submittedAt: new Date().toISOString(),
        }),
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "You're on the list. We'll reach out as soon as early access opens.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to join waitlist." },
      { status: 500 },
    );
  }
}
