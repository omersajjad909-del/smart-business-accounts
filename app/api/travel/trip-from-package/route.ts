/**
 * POST /api/travel/trip-from-package — turn a package into a real trip.
 *
 * A package is a template: what a Dubai seven-night costs to put together and
 * what it sells for. A trip is one family actually going. Keeping them apart
 * matters because the template changes when the hotel rate changes, and a trip
 * already sold must not change with it — so the components are copied onto the
 * trip at the moment it is created and belong to it from then on.
 *
 * Per-person components are multiplied by the party; per-booking ones are not.
 * A hotel room is not four times more because four people are going, and a
 * visa is.
 */

import { NextRequest, NextResponse } from "next/server";

import { logAuditFromReq } from "@/lib/auditLogger";
import { prisma } from "@/lib/prisma";
import { resolveBranchIdOrDefault, resolveCompanyId } from "@/lib/tenant";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);

const PRODUCT_TYPES = new Set([
  "FLIGHT", "HOTEL", "VISA", "PASSPORT", "TRANSPORT", "INSURANCE", "TOUR", "HAJJ", "UMRAH", "FEE",
]);

function newBookingNo(): string {
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `BK-${stamp}-${String(Math.floor(Math.random() * 900) + 100)}`;
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
    const packageId = String(body?.packageId || "").trim();
    const customerName = String(body?.customerName || "").trim().slice(0, 160);
    const pax = Math.max(1, Math.min(200, Number(body?.pax) || 1));

    if (!packageId) return NextResponse.json({ error: "A package is required" }, { status: 400 });
    if (!customerName) {
      return NextResponse.json({ error: "A customer name is required — it is who the invoice goes to" }, { status: 400 });
    }

    const pack = await prisma.businessRecord.findFirst({
      where: { id: packageId, companyId, category: "travel_package" },
    });
    if (!pack) return NextResponse.json({ error: "Package not found" }, { status: 404 });

    const data = (pack.data ?? {}) as Record<string, unknown>;
    const components = Array.isArray(data.components) ? data.components : [];
    if (!components.length) {
      return NextResponse.json({ error: "This package has nothing in it yet" }, { status: 400 });
    }

    const items = components
      .map((raw) => {
        const row = (raw ?? {}) as Record<string, unknown>;
        const productType = String(row.productType || "").toUpperCase();
        const title = String(row.title || "").trim().slice(0, 160);
        if (!PRODUCT_TYPES.has(productType) || !title) return null;

        /* The one piece of arithmetic that matters here. A room is priced per
           booking and a visa per head; getting it the wrong way round either
           quadruples a hotel or gives three people a free visa. */
        const perPerson = row.perPerson !== false;
        const qty = perPerson ? pax : 1;

        return {
          productType,
          title,
          supplierName: String(row.supplierName || "").trim().slice(0, 120) || null,
          sale: Math.max(0, Number(row.sale) || 0),
          cost: Math.max(0, Number(row.cost) || 0),
          qty,
          data: { fromPackage: pack.title, perPerson },
          status: "pending",
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    if (!items.length) {
      return NextResponse.json({ error: "Nothing in this package could be turned into a service" }, { status: 400 });
    }

    const round = (n: number) => Math.round(n * 100) / 100;
    const saleTotal = round(items.reduce((sum, item) => sum + Number(item.sale) * Number(item.qty), 0));
    const costTotal = round(items.reduce((sum, item) => sum + Number(item.cost) * Number(item.qty), 0));

    const travelDateText = String(body?.travelDate || "").slice(0, 10);
    const travelDate = /^\d{4}-\d{2}-\d{2}$/.test(travelDateText) ? new Date(`${travelDateText}T00:00:00.000Z`) : null;

    const booking = await prisma.booking.create({
      data: {
        companyId,
        branchId: (await resolveBranchIdOrDefault(req, companyId)) || null,
        bookingNo: newBookingNo(),
        customerName,
        status: "draft",
        source: `package:${pack.title}`,
        travelDate,
        saleTotal,
        costTotal,
        marginTotal: round(saleTotal - costTotal),
        notes: `From package ${pack.title} — ${pax} passenger${pax === 1 ? "" : "s"}`,
        items: { create: items as never },
      },
      include: { items: true },
    });

    await logAuditFromReq(req, {
      companyId,
      entity: "Booking",
      entityId: booking.id,
      action: "CREATE",
      afterValues: booking,
      description:
        `Created trip ${booking.bookingNo} from package ${pack.title} for ${customerName} — ` +
        `${pax} pax, sale ${saleTotal.toLocaleString()}, margin ${booking.marginTotal.toLocaleString()}`,
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not build the trip" },
      { status: 500 },
    );
  }
}
