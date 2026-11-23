import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { bad, isResponse, schoolGuard, str } from "@/lib/schoolApi";

const MAX_BYTES = 4 * 1024 * 1024; // keeps the request inside the host's body limit and inside most mailboxes

/**
 * POST { to, subject?, message?, filename, pdfBase64 } — emails an ID card PDF (for example to the printing press).
 * The PDF is built in the browser from the live design; this only sends it. Staff who may manage students can send.
 */
export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true, "SCHOOL_STUDENTS_MANAGE");
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const to = str(b.to), filename = str(b.filename).replace(/[^\w.\- ]+/g, "") || "id-cards.pdf";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return bad("Enter a valid email address");
  const base64 = typeof b.pdfBase64 === "string" ? b.pdfBase64.replace(/^data:application\/pdf[^,]*,/, "") : "";
  if (!base64) return bad("The PDF is missing");
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length < 200 || buffer.subarray(0, 4).toString() !== "%PDF") return bad("That file is not a valid PDF");
  if (buffer.length > MAX_BYTES) return bad("The PDF is too large to email (over 4 MB). Download it and share the file, or print fewer cards at a time.", 413);

  const company = await prisma.company.findUnique({ where: { id: ctx.companyId }, select: { name: true } });
  const school = company?.name ?? "School";
  const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
  const note = str(b.message).slice(0, 1000);
  const result = await sendEmail({
    to, companyId: ctx.companyId,
    subject: str(b.subject).slice(0, 150) || `ID cards for printing — ${school}`,
    html: `<p>Please find the ID cards from <b>${esc(school)}</b> attached as a PDF, ready to print.</p>${note ? `<p>${esc(note).replace(/\n/g, "<br/>")}</p>` : ""}<p style="color:#666;font-size:12px">Sent from the school's FinovaOS account.</p>`,
    attachments: [{ filename, content: buffer }],
  });
  if (!result.success) return bad(result.error || "The email could not be sent", 502);
  return NextResponse.json({ ok: true });
}
