import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

// GET: Fetch all contacts
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const company = searchParams.get("company");
    const isActive = searchParams.get("isActive") === "true";

    const contacts = await prisma.contact.findMany({
      where: {
        companyId,
        ...(type && { type }),
        ...(company && { companyName: { contains: company, mode: "insensitive" } }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        interactions: { orderBy: { date: "desc" }, take: 5 },
        opportunities: { orderBy: { createdAt: "desc" }, take: 3 },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}

// POST: Create new contact
export async function POST(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
  if (guard) return guard;

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json();
    const { name, email, phone, company, position, type } = body;

    if (!name || !phone || !company || !type) {
      return NextResponse.json(
        { error: "name, phone, company, and type are required" },
        { status: 400 }
      );
    }

    const contact = await prisma.contact.create({
      data: {
        companyId,
        name,
        email: email || null,
        phone,
        companyName: company,
        position,
        type,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error: Any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }
    console.error("Error creating contact:", error);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}

// PUT: Update contact
export async function PUT(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
  if (guard) return guard;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const contact = await prisma.contact.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(contact);
  } catch (error: Any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    console.error("Error updating contact:", error);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}

// DELETE: Delete contact
export async function DELETE(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN"]);
  if (guard) return guard;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.contact.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Contact deleted successfully" });
  } catch (error: Any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    console.error("Error deleting contact:", error);
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }
}
