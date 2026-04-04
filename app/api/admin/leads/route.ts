// FILE: app/api/admin/leads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isAdmin(req: NextRequest) {
  const role = String(req.headers.get("x-user-role") || "").toUpperCase();
  return role === "ADMIN";
}

const db = prisma as any;

// GET - list all leads, optional ?status= filter
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const status = req.nextUrl.searchParams.get("status");
    const where = status ? { status } : {};
    const leads = await db.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ leads });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST - create new lead
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await req.json();
    const { name, email, phone, company, message, source, priority, notes, followUpAt, assignedTo, country, sessionId } = body;
    if (!name || !email) return NextResponse.json({ error: "name and email required" }, { status: 400 });
    const lead = await db.lead.create({
      data: { name, email, phone: phone||null, company: company||null, message: message||null, source: source||"manual", priority: priority||"medium", notes: notes||null, followUpAt: followUpAt ? new Date(followUpAt) : null, assignedTo: assignedTo||null, country: country||null, sessionId: sessionId||null, status: "new" },
    });
    return NextResponse.json({ lead });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH - update lead status or notes
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { id, status, notes } = await req.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (notes  !== undefined) data.notes  = notes;

    const lead = await db.lead.update({ where: { id }, data });
    return NextResponse.json({ lead });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE - delete lead by ?id=
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await db.lead.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
