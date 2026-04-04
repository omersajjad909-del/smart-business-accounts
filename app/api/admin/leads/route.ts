import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

function isAdmin(req: NextRequest) {
  const role = String(req.headers.get("x-user-role") || "").toUpperCase();
  if (role === "ADMIN") return true;

  try {
    const token = getTokenFromRequest(req as any);
    const payload = token ? verifyJwt(token) : null;
    return String(payload?.role || "").toUpperCase() === "ADMIN";
  } catch {
    return false;
  }
}

const db = prisma as any;

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const status = req.nextUrl.searchParams.get("status");
    const priority = req.nextUrl.searchParams.get("priority");
    const source = req.nextUrl.searchParams.get("source");
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const take = Number(req.nextUrl.searchParams.get("take") || 500);

    const where: any = {};
    if (status && status !== "all") where.status = status;
    if (priority && priority !== "all") where.priority = priority;
    if (source && source !== "all") where.source = source;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    const leads = await db.lead.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: Number.isFinite(take) ? Math.min(Math.max(take, 1), 1000) : 500,
    });

    const statuses = ["new", "contacted", "demo", "proposal", "converted", "lost"];
    const summary = {
      total: leads.length,
      byStatus: Object.fromEntries(
        statuses.map((leadStatus) => [
          leadStatus,
          leads.filter((lead: any) => lead.status === leadStatus).length,
        ]),
      ),
      highPriority: leads.filter((lead: any) => lead.priority === "high").length,
    };

    return NextResponse.json({ leads, summary });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      company,
      message,
      source,
      priority,
      notes,
      followUpAt,
      assignedTo,
      country,
      sessionId,
      status,
    } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "name and email required" }, { status: 400 });
    }

    const lead = await db.lead.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        phone: phone?.trim() || null,
        company: company?.trim() || null,
        message: message?.trim() || null,
        source: source?.trim() || "manual",
        priority: priority || "medium",
        notes: notes?.trim() || null,
        followUpAt: followUpAt ? new Date(followUpAt) : null,
        assignedTo: assignedTo?.trim() || null,
        country: country?.trim() || null,
        sessionId: sessionId?.trim() || null,
        status: status || "new",
      },
    });

    return NextResponse.json({ lead });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const {
      id,
      status,
      notes,
      priority,
      followUpAt,
      assignedTo,
      country,
      phone,
      company,
      message,
      source,
      name,
      email,
    } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes || null;
    if (priority !== undefined) data.priority = priority || "medium";
    if (followUpAt !== undefined) data.followUpAt = followUpAt ? new Date(followUpAt) : null;
    if (assignedTo !== undefined) data.assignedTo = assignedTo || null;
    if (country !== undefined) data.country = country || null;
    if (phone !== undefined) data.phone = phone || null;
    if (company !== undefined) data.company = company || null;
    if (message !== undefined) data.message = message || null;
    if (source !== undefined) data.source = source || null;
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email ? String(email).trim().toLowerCase() : null;

    const lead = await db.lead.update({ where: { id }, data });
    return NextResponse.json({ lead });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await db.lead.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
