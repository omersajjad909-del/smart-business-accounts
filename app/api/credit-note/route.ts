import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role")?.toUpperCase();
    const companyId = req.headers.get("x-company-id");

    if (!companyId) {
      return NextResponse.json({ error: "Company ID required" }, { status: 400 });
    }

    const creditNotes = await prisma.creditNote.findMany({
      where: { companyId },
      include: {
        account: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(creditNotes);
  } catch (error) {
    console.error("Error fetching credit notes:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role")?.toUpperCase();
    const companyId = req.headers.get("x-company-id");

    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!companyId) {
      return NextResponse.json({ error: "Company ID required" }, { status: 400 });
    }

    const body = await req.json();
    const { date, accountId, amount, reason, description, reference } = body;

    // Generate Credit Note Number (Simple logic for now, can be improved)
    const count = await prisma.creditNote.count({ where: { companyId } });
    const creditNoteNumber = `CN-${String(count + 1).padStart(4, '0')}`;

    const creditNote = await prisma.creditNote.create({
      data: {
        companyId,
        creditNoteNumber,
        date: new Date(date),
        accountId,
        amount,
        reason,
        description,
        reference,
        status: "PENDING"
      }
    });

    return NextResponse.json(creditNote);
  } catch (error) {
    console.error("Error creating credit note:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role")?.toUpperCase();
    const companyId = req.headers.get("x-company-id");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!companyId || !id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await prisma.creditNote.delete({
      where: { id, companyId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting credit note:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
