import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

async function ensureContactScopedUniqueIndexes() {
  await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Contact_email_key"`);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Contact_companyId_email_key"
    ON "Contact"("companyId", "email")
    WHERE "email" IS NOT NULL
  `);
}

// GET: Fetch all contacts
export async function GET(req: NextRequest) {
  try {
    await ensureContactScopedUniqueIndexes();
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const company = searchParams.get("company");
    const isActiveParam = searchParams.get("isActive");
    const isActive =
      isActiveParam === null
        ? true
        : isActiveParam === "true";

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
    await ensureContactScopedUniqueIndexes();
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const body = await req.json();
    const { name, email, phone, company, position, type } = body;
    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;

    if (!name || !phone || !company || !type) {
      return NextResponse.json(
        { error: "name, phone, company, and type are required" },
        { status: 400 }
      );
    }

    if (normalizedEmail) {
      const existing = await prisma.contact.findFirst({
        where: {
          companyId,
          email: normalizedEmail,
        },
        select: { id: true },
      });

      if (existing) {
        return NextResponse.json(
          { error: "This email already exists in this company." },
          { status: 400 }
        );
      }
    }

    const contact = await prisma.contact.create({
      data: {
        companyId,
        name,
        email: normalizedEmail,
        phone,
        companyName: company,
        position,
        type,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error: any) {
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
    await ensureContactScopedUniqueIndexes();
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const normalizedEmail = body.email ? String(body.email).trim().toLowerCase() : null;

    if (body.email !== undefined) {
      body.email = normalizedEmail;
    }

    if (normalizedEmail) {
      const duplicate = await prisma.contact.findFirst({
        where: {
          companyId,
          id: { not: id },
          email: normalizedEmail,
        },
        select: { id: true },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "This email already exists in this company." },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.contact.updateMany({
      where: { id, companyId },
      data: body,
    });

    if (!updated.count) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const contact = await prisma.contact.findUnique({ where: { id } });

    return NextResponse.json(contact);
  } catch (error: any) {
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
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.contact.deleteMany({
      where: { id, companyId },
    });

    return NextResponse.json({ message: "Contact deleted successfully" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    console.error("Error deleting contact:", error);
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }
}
