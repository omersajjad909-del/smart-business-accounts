import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "@/lib/requireRole";

const prisma = new PrismaClient();

// GET: Fetch interactions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("contactId");
    const type = searchParams.get("type");

    const interactions = await prisma.interaction.findMany({
      where: {
        contactId: contactId || undefined,
        type: type || undefined,
      },
      include: { contact: { select: { name: true } } },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(interactions);
  } catch (error) {
    console.error("Error fetching interactions:", error);
    return NextResponse.json({ error: "Failed to fetch interactions" }, { status: 500 });
  }
}

// POST: Create interaction
export async function POST(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
  if (guard) return guard;

  try {
    const body = await req.json();
    const { contactId, type, date, subject, description, outcome, nextFollowUp } = body;

    if (!contactId || !type || !date || !subject) {
      return NextResponse.json(
        { error: "contactId, type, date, and subject are required" },
        { status: 400 }
      );
    }

    const interaction = await prisma.interaction.create({
      data: {
        contactId,
        type,
        date: new Date(date),
        subject,
        description: description || "",
        outcome: outcome || "NEUTRAL",
        nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
      },
    });

    return NextResponse.json(interaction, { status: 201 });
  } catch (error: any) {
    console.error("Error creating interaction:", error);
    return NextResponse.json({ error: "Failed to create interaction" }, { status: 500 });
  }
}

// PUT: Update interaction
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
    
    // Parse dates if provided
    if (body.date) body.date = new Date(body.date);
    if (body.nextFollowUp) body.nextFollowUp = new Date(body.nextFollowUp);

    const interaction = await prisma.interaction.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(interaction);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Interaction not found" }, { status: 404 });
    }
    console.error("Error updating interaction:", error);
    return NextResponse.json({ error: "Failed to update interaction" }, { status: 500 });
  }
}

// DELETE: Delete interaction
export async function DELETE(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
  if (guard) return guard;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.interaction.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Interaction deleted successfully" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Interaction not found" }, { status: 404 });
    }
    console.error("Error deleting interaction:", error);
    return NextResponse.json({ error: "Failed to delete interaction" }, { status: 500 });
  }
}
