/**
 * /api/travel/travelers — the people who fly.
 *
 * Distinct from the customer who pays: a family books under the father's
 * account and four people travel. See the note on the Traveler model.
 *
 * A traveller is created once and reused, which is the whole point — so the
 * write path works hard at not making a second copy of somebody who is already
 * here. A passport number is the strongest thing to match on, and where one is
 * given it decides; a name and a date of birth together are the next best.
 */

import { NextRequest, NextResponse } from "next/server";

import { logAuditFromReq } from "@/lib/auditLogger";
import { prisma } from "@/lib/prisma";
import { resolveBranchIdOrDefault, resolveCompanyId } from "@/lib/tenant";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);

function clean(value: unknown, max = 120): string {
  return String(value ?? "").trim().slice(0, max);
}

function date(value: unknown): Date | null {
  const text = String(value ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const parsed = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readBody(body: Record<string, unknown>) {
  const firstName = clean(body.firstName, 80);
  const lastName = clean(body.lastName, 80);
  return {
    title: clean(body.title, 10) || null,
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(" "),
    dob: date(body.dob),
    gender: clean(body.gender, 20) || null,
    nationality: clean(body.nationality, 60) || null,
    cnic: clean(body.cnic, 20) || null,
    // Passports are printed in capitals and searched for in whatever the desk
    // happens to type, so they are stored one way.
    passportNo: clean(body.passportNo, 20).toUpperCase() || null,
    passportExpiry: date(body.passportExpiry),
    passportIssue: date(body.passportIssue),
    passportCountry: clean(body.passportCountry, 60) || null,
    email: clean(body.email, 120) || null,
    phone: clean(body.phone, 40) || null,
    altPhone: clean(body.altPhone, 40) || null,
    emergencyName: clean(body.emergencyName, 80) || null,
    emergencyPhone: clean(body.emergencyPhone, 40) || null,
    frequentFlyer: body.frequentFlyer && typeof body.frequentFlyer === "object" ? body.frequentFlyer : undefined,
    billToAccountId: clean(body.billToAccountId, 40) || null,
    notes: clean(body.notes, 2000) || null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const params = req.nextUrl.searchParams;
    const search = clean(params.get("q"), 80);
    const take = Math.min(100, Math.max(1, Number(params.get("limit")) || 50));

    /* Passports expiring inside this many days. Six months is the rule most
       carriers apply, so that is what the desk is warned about. */
    const expiringDays = Number(params.get("expiringWithinDays")) || 0;

    const where: Record<string, unknown> = { companyId };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { passportNo: { contains: search.toUpperCase() } },
        { phone: { contains: search } },
        { cnic: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (expiringDays > 0) {
      where.passportExpiry = {
        not: null,
        lte: new Date(Date.now() + expiringDays * 864e5),
      };
    }

    const travelers = await prisma.traveler.findMany({
      where: where as never,
      orderBy: expiringDays > 0 ? { passportExpiry: "asc" } : { updatedAt: "desc" },
      take,
    });

    return NextResponse.json({ travelers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load travellers" },
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
      return NextResponse.json({ error: "Your role cannot add travellers." }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "A traveller is required" }, { status: 400 });

    const data = readBody(body);
    if (!data.firstName || !data.lastName) {
      return NextResponse.json({ error: "A first name and a last name are required" }, { status: 400 });
    }

    /* Don't make a second copy of somebody already here.

       A traveller reused is the entire point of this table — their passport
       expiry, their history, their frequent flyer numbers all hang off one
       row. Two rows for one person and none of it works. A passport number is
       unambiguous and decides on its own; failing that, the same name and the
       same date of birth is as close as this can honestly get. */
    const duplicate = data.passportNo
      ? await prisma.traveler.findFirst({ where: { companyId, passportNo: data.passportNo } })
      : data.dob
        ? await prisma.traveler.findFirst({ where: { companyId, fullName: data.fullName, dob: data.dob } })
        : null;

    if (duplicate) {
      // Fill in the blanks on the row that already exists rather than refusing
      // — the desk that re-entered them usually knows something new.
      const merged: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined || value === "") continue;
        if ((duplicate as Record<string, unknown>)[key]) continue;
        merged[key] = value;
      }
      const traveler = Object.keys(merged).length
        ? await prisma.traveler.update({ where: { id: duplicate.id }, data: merged as never })
        : duplicate;
      return NextResponse.json({ traveler, reused: true });
    }

    const branchId = await resolveBranchIdOrDefault(req, companyId);
    const traveler = await prisma.traveler.create({
      data: { companyId, branchId: branchId || null, ...data } as never,
    });

    await logAuditFromReq(req, {
      companyId,
      entity: "Traveler",
      entityId: traveler.id,
      action: "CREATE",
      afterValues: traveler,
      description: `Added traveller ${traveler.fullName}`,
    });

    return NextResponse.json({ traveler }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save the traveller" },
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
      return NextResponse.json({ error: "Your role cannot edit travellers." }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const id = clean(body?.id, 40);
    if (!id) return NextResponse.json({ error: "A traveller id is required" }, { status: 400 });

    // Scoped by company as well as id, so an id from another tenant finds
    // nothing rather than editing somebody else's traveller.
    const existing = await prisma.traveler.findFirst({ where: { id, companyId } });
    if (!existing) return NextResponse.json({ error: "Traveller not found" }, { status: 404 });

    const data = readBody(body as Record<string, unknown>);
    if (!data.firstName || !data.lastName) {
      return NextResponse.json({ error: "A first name and a last name are required" }, { status: 400 });
    }

    const traveler = await prisma.traveler.update({ where: { id }, data: data as never });

    await logAuditFromReq(req, {
      companyId,
      entity: "Traveler",
      entityId: id,
      action: "UPDATE",
      beforeValues: existing,
      afterValues: traveler,
      description: `Updated traveller ${traveler.fullName}`,
    });

    return NextResponse.json({ traveler });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update the traveller" },
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
      return NextResponse.json({ error: "Your role cannot remove travellers." }, { status: 403 });
    }

    const id = clean(req.nextUrl.searchParams.get("id"), 40);
    if (!id) return NextResponse.json({ error: "A traveller id is required" }, { status: 400 });

    const existing = await prisma.traveler.findFirst({ where: { id, companyId } });
    if (!existing) return NextResponse.json({ error: "Traveller not found" }, { status: 404 });

    await prisma.traveler.delete({ where: { id } });

    await logAuditFromReq(req, {
      companyId,
      entity: "Traveler",
      entityId: id,
      action: "DELETE",
      beforeValues: existing,
      description: `Removed traveller ${existing.fullName}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not remove the traveller" },
      { status: 500 },
    );
  }
}
