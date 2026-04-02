import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";

// GET: Fetch opportunities
export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) {
      return NextResponse.json({ error: "Company context required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("contactId");
    const stage = searchParams.get("stage");

    const opportunities = await prisma.opportunity.findMany({
      where: {
        contactId: contactId || undefined,
        stage: stage || undefined,
        contact: { companyId }, // Enforce company scoping
      },
      include: { 
        contact: { select: { name: true, companyName: true } },
        activities: { orderBy: { date: "desc" } },
      },
      orderBy: { expectedCloseDate: "asc" },
    });

    return NextResponse.json(opportunities);
  } catch (error) {
    console.error("Error fetching opportunities:", error);
    return NextResponse.json({ error: "Failed to fetch opportunities" }, { status: 500 });
  }
}

// POST: Create opportunity
export async function POST(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
  if (guard) return guard;

  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) {
      return NextResponse.json({ error: "Company context required" }, { status: 400 });
    }

    const body = await req.json();
    const { contactId, title, description, value, probability, stage, expectedCloseDate } = body;

    if (!contactId || !title || !value || !expectedCloseDate) {
      return NextResponse.json(
        { error: "contactId, title, value, and expectedCloseDate are required" },
        { status: 400 }
      );
    }

    // Verify contact belongs to the company
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, companyId }
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found in this company" }, { status: 404 });
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        contactId,
        title,
        description,
        value,
        probability: probability || 50,
        stage: stage || "LEAD",
        expectedCloseDate: new Date(expectedCloseDate),
      },
    });

    return NextResponse.json(opportunity, { status: 201 });
  } catch (error: any) {
    console.error("Error creating opportunity:", error);
    return NextResponse.json({ error: "Failed to create opportunity" }, { status: 500 });
  }
}

// PUT: Update opportunity
export async function PUT(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
  if (guard) return guard;

  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) {
      return NextResponse.json({ error: "Company context required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Verify opportunity belongs to the company via contact
    const existing = await prisma.opportunity.findFirst({
      where: { id, contact: { companyId } }
    });

    if (!existing) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const body = await req.json();
    // Don't allow changing contactId to a contact in another company (though body shouldn't have it)
    if (body.contactId) {
        const contact = await prisma.contact.findFirst({ where: { id: body.contactId, companyId }});
        if (!contact) return NextResponse.json({ error: "New contact not found in this company" }, { status: 400 });
    }

    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(opportunity);
  } catch (error: any) {
    console.error("Error updating opportunity:", error);
    return NextResponse.json({ error: "Failed to update opportunity" }, { status: 500 });
  }
}

// DELETE: Delete opportunity
export async function DELETE(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN"]);
  if (guard) return guard;

  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) {
      return NextResponse.json({ error: "Company context required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.opportunity.findFirst({
      where: { id, contact: { companyId } }
    });

    if (!existing) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    await prisma.opportunity.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting opportunity:", error);
    return NextResponse.json({ error: "Failed to delete opportunity" }, { status: 500 });
  }
}
