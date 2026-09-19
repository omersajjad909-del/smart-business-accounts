/**
 * /api/travel/bookings — one trip, however many services it is made of.
 *
 * The totals are summed from the items here and never read from the request.
 * A client that can post its own total can post one that is not the sum of its
 * lines, and the first time those disagree nobody can tell which was right —
 * the same rule the passenger route has always followed.
 */

import { NextRequest, NextResponse } from "next/server";

import { logAuditFromReq } from "@/lib/auditLogger";
import { prisma } from "@/lib/prisma";
import { resolveBranchIdOrDefault, resolveCompanyId } from "@/lib/tenant";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);

/** What a booking may be set to from outside. Cancelling and invoicing are
    done by the actions that cause them, not by typing the word. */
const ALLOWED_STATUS = new Set(["draft", "quoted", "confirmed", "ticketed", "travelling", "completed"]);

const PRODUCT_TYPES = new Set([
  "FLIGHT", "HOTEL", "VISA", "PASSPORT", "TRANSPORT", "INSURANCE", "TOUR", "HAJJ", "UMRAH", "FEE",
]);

function clean(value: unknown, max = 160): string {
  return String(value ?? "").trim().slice(0, max);
}

function date(value: unknown): Date | null {
  const text = String(value ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const parsed = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

type ItemInput = {
  productType: string;
  title: string;
  supplierName: string | null;
  supplierAccountId: string | null;
  sale: number;
  cost: number;
  qty: number;
  sourceCategory: string | null;
  sourceRecordId: string | null;
  data: unknown;
  status: string;
  serviceDate: Date | null;
};

function readItems(value: unknown): ItemInput[] {
  if (!Array.isArray(value)) return [];
  const out: ItemInput[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const productType = clean(row.productType, 20).toUpperCase();
    const title = clean(row.title, 160);
    // A line with no service and no name is not a service.
    if (!PRODUCT_TYPES.has(productType) || !title) continue;
    out.push({
      productType,
      title,
      supplierName: clean(row.supplierName, 120) || null,
      supplierAccountId: clean(row.supplierAccountId, 40) || null,
      sale: Math.max(0, Number(row.sale) || 0),
      cost: Math.max(0, Number(row.cost) || 0),
      qty: Math.max(0, Number(row.qty) || 1),
      sourceCategory: clean(row.sourceCategory, 40) || null,
      sourceRecordId: clean(row.sourceRecordId, 40) || null,
      data: row.data && typeof row.data === "object" ? row.data : undefined,
      status: clean(row.status, 30) || "pending",
      serviceDate: date(row.serviceDate),
    });
  }
  return out;
}

/** What the booking comes to. The only place these three numbers are worked out. */
function totals(items: ItemInput[]) {
  const round = (n: number) => Math.round(n * 100) / 100;
  const saleTotal = round(items.reduce((sum, item) => sum + item.sale * item.qty, 0));
  const costTotal = round(items.reduce((sum, item) => sum + item.cost * item.qty, 0));
  return { saleTotal, costTotal, marginTotal: round(saleTotal - costTotal) };
}

/** A reference the desk can say out loud. */
function newBookingNo(): string {
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `BK-${stamp}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const params = req.nextUrl.searchParams;
    const id = clean(params.get("id"), 40);

    if (id) {
      const booking = await prisma.booking.findFirst({
        where: { id, companyId },
        include: { items: { orderBy: { createdAt: "asc" } }, travelers: true },
      });
      if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

      // The travellers themselves, so the caller does not have to fetch each.
      const people = booking.travelers.length
        ? await prisma.traveler.findMany({ where: { id: { in: booking.travelers.map((t) => t.travelerId) } } })
        : [];
      return NextResponse.json({ booking, people });
    }

    const search = clean(params.get("q"), 80);
    const status = clean(params.get("status"), 30);
    const where: Record<string, unknown> = { companyId };
    if (status && status !== "all") where.status = status;
    if (search) {
      where.OR = [
        { bookingNo: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
      ];
    }

    const bookings = await prisma.booking.findMany({
      where: where as never,
      include: { items: true, travelers: true },
      orderBy: { createdAt: "desc" },
      take: Math.min(100, Math.max(1, Number(params.get("limit")) || 50)),
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load bookings" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (!WRITE_ROLES.has(role)) {
      return NextResponse.json({ error: "Your role cannot create bookings." }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "A booking is required" }, { status: 400 });

    const customerName = clean(body.customerName, 160);
    if (!customerName) {
      return NextResponse.json({ error: "A customer name is required — it is who the invoice goes to" }, { status: 400 });
    }

    const status = clean(body.status, 30) || "draft";
    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ error: `A booking cannot start as "${status}"` }, { status: 400 });
    }

    const items = readItems(body.items);
    if (!items.length) {
      return NextResponse.json({ error: "A booking needs at least one service on it" }, { status: 400 });
    }

    const bookingNo = clean(body.bookingNo, 40) || newBookingNo();
    const clash = await prisma.booking.findFirst({ where: { companyId, bookingNo }, select: { id: true } });
    if (clash) {
      return NextResponse.json(
        { error: `Booking ${bookingNo} already exists. Give this one its own reference.` },
        { status: 409 },
      );
    }

    const travelerIds = Array.isArray(body.travelerIds)
      ? Array.from(new Set(body.travelerIds.map((id) => clean(id, 40)).filter(Boolean)))
      : [];
    // Scoped by company, so an id from another tenant attaches nothing.
    const valid = travelerIds.length
      ? await prisma.traveler.findMany({ where: { companyId, id: { in: travelerIds } }, select: { id: true } })
      : [];

    const sums = totals(items);
    const leadId = clean(body.leadTravelerId, 40);

    const booking = await prisma.booking.create({
      data: {
        companyId,
        branchId: (await resolveBranchIdOrDefault(req, companyId)) || null,
        bookingNo,
        customerAccountId: clean(body.customerAccountId, 40) || null,
        customerName,
        status,
        source: clean(body.source, 60) || null,
        travelDate: date(body.travelDate),
        returnDate: date(body.returnDate),
        ...sums,
        notes: clean(body.notes, 2000) || null,
        items: { create: items as never },
        travelers: {
          create: valid.map((row) => ({
            travelerId: row.id,
            role: row.id === leadId ? "lead" : "adult",
          })),
        },
      },
      include: { items: true, travelers: true },
    });

    await logAuditFromReq(req, {
      companyId,
      entity: "Booking",
      entityId: booking.id,
      action: "CREATE",
      afterValues: booking,
      description:
        `Created booking ${bookingNo} for ${customerName} — ${items.length} service${items.length === 1 ? "" : "s"}, ` +
        `sale ${sums.saleTotal.toLocaleString()}, margin ${sums.marginTotal.toLocaleString()}`,
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save the booking" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (!WRITE_ROLES.has(role)) {
      return NextResponse.json({ error: "Your role cannot edit bookings." }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const id = clean(body?.id, 40);
    if (!body || !id) return NextResponse.json({ error: "A booking id is required" }, { status: 400 });

    const existing = await prisma.booking.findFirst({ where: { id, companyId }, include: { items: true } });
    if (!existing) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    /* Once invoiced the booking is fixed. Changing the services under a raised
       invoice would leave the ledger charging for a trip that no longer
       exists — the same reason the passenger route refuses it. */
    if (existing.invoiceId && body.items) {
      return NextResponse.json(
        {
          error:
            `This booking is already invoiced as ${existing.invoiceNo || "an invoice"}. ` +
            "Credit the invoice first — changing the services under it would leave the ledger " +
            "charging for a trip that no longer exists.",
        },
        { status: 409 },
      );
    }

    const changes: Record<string, unknown> = {};
    if (body.customerName !== undefined) changes.customerName = clean(body.customerName, 160);
    if (body.customerAccountId !== undefined) changes.customerAccountId = clean(body.customerAccountId, 40) || null;
    if (body.travelDate !== undefined) changes.travelDate = date(body.travelDate);
    if (body.returnDate !== undefined) changes.returnDate = date(body.returnDate);
    if (body.notes !== undefined) changes.notes = clean(body.notes, 2000) || null;

    if (body.status !== undefined) {
      const status = clean(body.status, 30);
      // "cancelled" is allowed here because cancelling is a status change; the
      // reversal of money is the invoice's job, not this route's.
      if (!ALLOWED_STATUS.has(status) && status !== "cancelled") {
        return NextResponse.json({ error: `"${status}" is not a booking status` }, { status: 400 });
      }
      changes.status = status;
    }

    if (body.items) {
      const items = readItems(body.items);
      if (!items.length) {
        return NextResponse.json({ error: "A booking needs at least one service on it" }, { status: 400 });
      }
      // Replaced wholesale, then re-summed — see the note at the top.
      await prisma.bookingItem.deleteMany({ where: { bookingId: id } });
      await prisma.bookingItem.createMany({ data: items.map((item) => ({ ...item, bookingId: id })) as never });
      Object.assign(changes, totals(items));
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: changes as never,
      include: { items: true, travelers: true },
    });

    await logAuditFromReq(req, {
      companyId,
      entity: "Booking",
      entityId: id,
      action: "UPDATE",
      beforeValues: existing,
      afterValues: booking,
      description: `Updated booking ${booking.bookingNo}`,
    });

    return NextResponse.json({ booking });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update the booking" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (!WRITE_ROLES.has(role)) {
      return NextResponse.json({ error: "Your role cannot remove bookings." }, { status: 403 });
    }

    const id = clean(req.nextUrl.searchParams.get("id"), 40);
    const existing = await prisma.booking.findFirst({ where: { id, companyId } });
    if (!existing) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    /* An invoiced booking is part of the ledger and is not deleted — it is
       cancelled, which leaves a trail. */
    if (existing.invoiceId) {
      return NextResponse.json(
        { error: `Booking ${existing.bookingNo} is invoiced. Cancel it instead — deleting it would leave the invoice pointing at nothing.` },
        { status: 409 },
      );
    }

    await prisma.booking.delete({ where: { id } });

    await logAuditFromReq(req, {
      companyId,
      entity: "Booking",
      entityId: id,
      action: "DELETE",
      beforeValues: existing,
      description: `Removed booking ${existing.bookingNo}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not remove the booking" },
      { status: 500 },
    );
  }
}
