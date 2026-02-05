import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";

// GET: Fetch opportunities
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("contactId");
    const stage = searchParams.get("stage");

    const opportunities = await prisma.opportunity.findMany({
      where: {
        contactId: contactId || undefined,
        stage: stage || undefined,
      },
      include: { 
        contact: { select: { name: true, company: true } },
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
    const body = await req.json();
    const { contactId, title, description, value, probability, stage, expectedCloseDate } = body;

    if (!contactId || !title || !value || !expectedCloseDate) {
      return NextResponse.json(
        { error: "contactId, title, value, and expectedCloseDate are required" },
        { status: 400 }
      );
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
  } catch (error: Any) {
    console.error("Error creating opportunity:", error);
    return NextResponse.json({ error: "Failed to create opportunity" }, { status: 500 });
  }
}

// PUT: Update opportunity
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
    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(opportunity);
  } catch (error: Any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }
    console.error("Error updating opportunity:", error);
    return NextResponse.json({ error: "Failed to update opportunity" }, { status: 500 });
  }
}

// DELETE: Delete opportunity
export async function DELETE(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN"]);
  if (guard) return guard;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.opportunity.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Opportunity deleted successfully" });
  } catch (error: Any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }
    console.error("Error deleting opportunity:", error);
    return NextResponse.json({ error: "Failed to delete opportunity" }, { status: 500 });
  }
}
