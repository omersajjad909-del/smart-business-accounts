
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

function isAdmin(req: NextRequest) {
  const role = String(req.headers.get("x-user-role") || "").toUpperCase();
  if (role === "ADMIN") return true;
  try {
    const token = getTokenFromRequest(req as any);
    const p = token ? verifyJwt(token) : null;
    return String(p?.role || "").toUpperCase() === "ADMIN";
  } catch { return false; }
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    // Try SupportTicket model first, fallback to ActivityLog
    let tickets: any[] = [];
    try {
      tickets = await (prisma as any).supportTicket.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { user: { select: { email: true } }, company: { select: { name: true } } },
      });
      tickets = tickets.map((t: any) => ({
        id: t.id, subject: t.subject, message: t.message,
        status: t.status?.toLowerCase() || "open",
        userEmail: t.user?.email || t.email || "",
        companyName: t.company?.name || "",
        replies: t.replies || 0,
        createdAt: t.createdAt,
      }));
    } catch {
      // Fallback — check ActivityLog for SUPPORT_TICKET action
      const logs = await prisma.activityLog.findMany({
        where: { action: { in: ["SUPPORT_TICKET", "TICKET_CREATED"] } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      tickets = logs.map(l => {
        try { return { id: l.id, createdAt: l.createdAt, status: "open", ...JSON.parse(l.details || "{}") }; }
        catch { return { id: l.id, subject: "Ticket", status: "open", message: l.details, createdAt: l.createdAt }; }
      });
    }
    return NextResponse.json({ tickets });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { action, ticketId, message, status } = await req.json();
    if (action === "REPLY") {
      try {
        await (prisma as any).supportTicket.update({
          where: { id: ticketId },
          data: { status: "ANSWERED", adminReply: message, updatedAt: new Date() },
        });
      } catch {
        await prisma.activityLog.create({
          data: { action: "TICKET_REPLY", details: JSON.stringify({ ticketId, message }), userId: req.headers.get("x-user-id") || undefined },
        });
      }
    }
    if (action === "UPDATE_STATUS") {
      try {
        await (prisma as any).supportTicket.update({
          where: { id: ticketId },
          data: { status: status.toUpperCase() },
        });
      } catch {}
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}