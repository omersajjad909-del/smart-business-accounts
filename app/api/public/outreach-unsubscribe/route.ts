import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addSuppression } from "@/lib/prospecting/sending";

export const runtime = "nodejs";

const db = prisma as any;

function page(title: string, message: string): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1020;color:#e2e8f0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:460px;padding:34px;border-radius:20px;border:1px solid rgba(255,255,255,.09);background:rgba(19,27,46,.95);text-align:center">
<h1 style="margin:0 0 12px;font-size:22px;font-weight:700">${title}</h1>
<p style="margin:0;color:rgba(203,213,225,.75);font-size:15px;line-height:1.6">${message}</p>
</div></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

/**
 * One-click unsubscribe. Must work without a login, without a confirmation
 * step, and on the first request — that is the whole point of the requirement.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return page("Invalid link", "This unsubscribe link is missing its token.");

  try {
    const email = await db.outreachEmail.findUnique({
      where: { unsubToken: token },
      select: { id: true, toEmail: true, campaignId: true, prospectId: true },
    });

    if (!email) return page("Link not recognised", "This unsubscribe link is no longer valid. Reply to the email and we will remove you by hand.");

    await addSuppression(email.toEmail, "unsubscribed", `Unsubscribed via campaign ${email.campaignId}`);

    // Cancel anything still queued for this address, across every campaign.
    await db.outreachEmail.updateMany({
      where: { toEmail: email.toEmail, status: { in: ["draft", "pending_review", "approved", "queued"] } },
      data: { status: "unsubscribed", failReason: "Recipient unsubscribed" },
    });

    await db.prospectCompany.update({
      where: { id: email.prospectId },
      data: { status: "rejected", rejectReason: "Unsubscribed" },
    }).catch(() => {});

    await db.outreachEvent.create({ data: { emailId: email.id, type: "unsubscribe" } }).catch(() => {});

    return page(
      "You are unsubscribed",
      `We have removed <strong>${email.toEmail}</strong> and will not contact you again. Sorry for the interruption.`,
    );
  } catch {
    return page("Something went wrong", "We could not process that just now. Reply to the email and we will remove you manually.");
  }
}

/** RFC 8058 one-click POST — what Gmail and Outlook actually call. */
export async function POST(req: NextRequest) {
  return GET(req);
}
