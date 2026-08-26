/**
 * POST /api/public/feedback — submit complaint or suggestion (public, no auth needed)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

const db = prisma as any;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, subject, message, email, name, role, priority, module: affectedModule, rating, publishConsent } = body;

    if (!type || !subject?.trim() || !message?.trim())
      return NextResponse.json({ error: "type, subject and message are required" }, { status: 400 });

    if (!["feedback", "complaint", "suggestion", "bug", "general"].includes(type))
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    if (message.trim().length < 20)
      return NextResponse.json({ error: "Message must be at least 20 characters" }, { status: 400 });

    // Star rating: only meaningful on "feedback", must be a whole 1-5, and is
    // never accepted on its own — the 20-character check above already
    // guarantees a written review accompanies it.
    let ratingValue: number | null = null;
    if (rating !== undefined && rating !== null && rating !== 0) {
      if (type !== "feedback")
        return NextResponse.json({ error: "A star rating can only be given on feedback" }, { status: 400 });

      const n = Number(rating);
      if (!Number.isInteger(n) || n < 1 || n > 5)
        return NextResponse.json({ error: "Rating must be a whole number between 1 and 5" }, { status: 400 });

      ratingValue = n;
    }

    if (type === "feedback" && ratingValue === null)
      return NextResponse.json({ error: "Please pick a star rating from 1 to 5" }, { status: 400 });

    // Try to get logged-in user context
    let userId: string | null = null;
    let companyId: string | null = null;
    try {
      const token = getTokenFromRequest(req as any);
      if (token) {
        const p = verifyJwt(token) as any;
        userId = p?.userId || p?.id || null;
        companyId = p?.companyId || null;
      }
    } catch {}

    const fb = await db.feedback.create({
      data: {
        type,
        subject: subject.trim(),
        message: message.trim(),
        rating: ratingValue,
        // Consent only means anything alongside a rating we could publish.
        publishConsent: ratingValue !== null && publishConsent === true,
        email: email?.toLowerCase().trim() || null,
        name: name?.trim() || null,
        // Only a review is ever published, so a job title is pointless anywhere
        // else. Capped so a stray paragraph cannot land on the public site.
        role: ratingValue !== null ? (role?.trim().slice(0, 60) || null) : null,
        status: "open",
        priority: ["low","normal","high","urgent"].includes(priority) ? priority : "normal",
        module: affectedModule?.trim() || null,
        userId,
        companyId,
      },
    });

    return NextResponse.json({ success: true, id: fb.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    let userId: string | null = req.headers.get("x-user-id");
    if (!userId) {
      try {
        const token = getTokenFromRequest(req as any);
        if (token) {
          const p = verifyJwt(token) as any;
          userId = p?.userId || p?.id || null;
        }
      } catch {}
    }
    if (!userId) return NextResponse.json({ items: [] });

    const items = await db.feedback.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, type: true, subject: true, status: true, priority: true, createdAt: true,
        // message, role and module come back too: the submissions list is where
        // the writer edits, and a form cannot be prefilled from a summary.
        message: true, role: true, module: true,
        // A review's own progress is separate from the ticket status: whether it
        // carries a rating, whether the user allowed publishing, and whether an
        // admin has actually published it as a testimonial.
        rating: true, publishConsent: true, testimonialId: true,
      },
    });
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ items: [] });
  }
}

/**
 * PATCH /api/public/feedback — the writer correcting their own submission.
 *
 * Only their own, and only the parts they wrote. Status, priority and the admin
 * note belong to whoever is handling it and are not readable from here, let
 * alone writable.
 *
 * Consent is the reason this exists. Somebody writes a review, leaves the
 * publish box unticked because it is off by default, and there was then no way
 * back — the admin cannot publish without permission, and the writer had no
 * way to give it except by writing the whole review again.
 *
 * Editing stops once the review has been published as a testimonial. At that
 * point the words are on the public site, and quietly rewriting them underneath
 * is not something the writer should be able to do without anyone knowing.
 */
export async function PATCH(req: NextRequest) {
  try {
    let userId: string | null = req.headers.get("x-user-id");
    if (!userId) {
      try {
        const token = getTokenFromRequest(req as any);
        if (token) {
          const p = verifyJwt(token) as any;
          userId = p?.userId || p?.id || null;
        }
      } catch {}
    }
    if (!userId) return NextResponse.json({ error: "Sign in to edit your submission" }, { status: 401 });

    const body = await req.json();
    const { id, subject, message, rating, publishConsent, role, module: affectedModule } = body;
    if (!id) return NextResponse.json({ error: "Which submission?" }, { status: 400 });

    const existing = await db.feedback.findFirst({
      where: { id, userId },
      select: { id: true, type: true, testimonialId: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.testimonialId) {
      return NextResponse.json(
        { error: "This review is already published. Ask the team to change it." },
        { status: 409 },
      );
    }

    const data: Record<string, unknown> = {};

    if (subject !== undefined) {
      if (!String(subject).trim()) return NextResponse.json({ error: "Subject cannot be empty" }, { status: 400 });
      data.subject = String(subject).trim();
    }

    if (message !== undefined) {
      const text = String(message).trim();
      if (text.length < 20)
        return NextResponse.json({ error: "Message must be at least 20 characters" }, { status: 400 });
      data.message = text;
    }

    // Same rules as the original submission: a rating belongs to a review, is a
    // whole 1-5, and a review cannot end up with none.
    if (rating !== undefined) {
      if (existing.type !== "feedback")
        return NextResponse.json({ error: "A star rating can only be given on a review" }, { status: 400 });
      const n = Number(rating);
      if (!Number.isInteger(n) || n < 1 || n > 5)
        return NextResponse.json({ error: "Rating must be a whole number between 1 and 5" }, { status: 400 });
      data.rating = n;
    }

    if (publishConsent !== undefined) {
      if (existing.type !== "feedback")
        return NextResponse.json({ error: "Only a review can be published" }, { status: 400 });
      data.publishConsent = publishConsent === true;
    }

    if (role !== undefined) data.role = String(role).trim() || null;
    if (affectedModule !== undefined) data.module = String(affectedModule).trim() || null;

    if (Object.keys(data).length === 0)
      return NextResponse.json({ error: "Nothing to change" }, { status: 400 });

    const updated = await db.feedback.update({
      where: { id: existing.id },
      data,
      select: {
        id: true, type: true, subject: true, message: true, status: true,
        priority: true, module: true, role: true, createdAt: true,
        rating: true, publishConsent: true, testimonialId: true,
      },
    });

    return NextResponse.json({ item: updated });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not save your changes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
