/**
 * POST /api/travel/schedules/import — ask a provider what flies a sector, and
 * optionally keep the answer.
 *
 * Two steps on purpose. The first call returns what the provider said and
 * saves nothing; the operator looks at it, because provider data is wrong often
 * enough that a screen full of rows written straight into the schedule would
 * put times on quotes that nobody ever checked. The second call saves the rows
 * they kept.
 *
 * `probe` returns the provider's raw response instead. The parser in
 * lib/travel/scheduleProvider.ts was written against published documentation
 * and never run against the live service, so the first real call is expected
 * to correct it — this is how that is done without guessing twice.
 */

import { NextRequest, NextResponse } from "next/server";

import { logAuditFromReq } from "@/lib/auditLogger";
import { prisma } from "@/lib/prisma";
import { resolveBranchIdOrDefault, resolveCompanyId } from "@/lib/tenant";
import { ProviderError, configuredProvider, fetchSchedules, type ProviderFlight } from "@/lib/travel/scheduleProvider";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);

function readFlights(value: unknown): ProviderFlight[] {
  if (!Array.isArray(value)) return [];
  const out: ProviderFlight[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const flightNo = String(row.flightNo || "").trim().toUpperCase();
    const from = String(row.from || "").trim().toUpperCase();
    const to = String(row.to || "").trim().toUpperCase();
    const departAt = String(row.departAt || "").trim();
    // A row with no flight number, no sector or no departure time is not a
    // schedule — saving it would put a blank line in the timetable that the
    // search would then match against.
    if (!flightNo || from.length !== 3 || to.length !== 3 || !/^\d{2}:\d{2}$/.test(departAt)) continue;
    out.push({
      airline: String(row.airline || ""),
      airlineIata: String(row.airlineIata || "").toUpperCase(),
      flightNo,
      from,
      to,
      departAt,
      arriveAt: /^\d{2}:\d{2}$/.test(String(row.arriveAt || "")) ? String(row.arriveAt) : "",
      days: Array.isArray(row.days) ? row.days.map((d) => Number(d)).filter((d) => d >= 1 && d <= 7) : [],
      aircraft: String(row.aircraft || ""),
    });
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (!WRITE_ROLES.has(role)) {
      return NextResponse.json({ error: "Your role cannot import schedules." }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "A sector and a date are required" }, { status: 400 });

    const from = String(body.from || "").trim().toUpperCase();
    const to = String(body.to || "").trim().toUpperCase();
    const date = String(body.date || "").slice(0, 10);
    if (from.length !== 3 || to.length !== 3 || from === to || !date) {
      return NextResponse.json({ error: "A from, a to and a date are needed" }, { status: 400 });
    }

    /* Saving what the operator kept. No provider call — the rows came back on
       the preview and were edited on screen, so calling again would spend
       another of the month's requests to fetch something we already have. */
    if (body.save) {
      const flights = readFlights(body.flights);
      if (!flights.length) {
        return NextResponse.json({ error: "No usable flights were sent to save" }, { status: 400 });
      }

      const branchId = await resolveBranchIdOrDefault(req, companyId);
      const validFrom = String(body.validFrom || "").slice(0, 10) || date;
      const validTo = String(body.validTo || "").slice(0, 10) || null;

      /* A flight already in the timetable is left alone rather than added
         again. Two rows for PK 632 would put the same flight on the search
         twice and give the desk a choice that does not exist. */
      const existing = await prisma.businessRecord.findMany({
        where: { companyId, category: "travel_schedule" },
        select: { data: true },
      });
      const already = new Set(
        existing.map((row) => {
          const data = (row.data ?? {}) as Record<string, unknown>;
          return `${String(data.flightNo || "").toUpperCase()}|${String(data.from || "")}|${String(data.to || "")}`;
        }),
      );

      const created: string[] = [];
      const skipped: string[] = [];

      for (const flight of flights) {
        const key = `${flight.flightNo}|${flight.from}|${flight.to}`;
        if (already.has(key)) { skipped.push(flight.flightNo); continue; }
        already.add(key);

        await prisma.businessRecord.create({
          data: {
            companyId,
            branchId: branchId || null,
            category: "travel_schedule",
            title: `${flight.flightNo} · ${flight.from} → ${flight.to}`,
            status: "active",
            date: new Date(validFrom),
            data: {
              airline: flight.airline,
              airlineIata: flight.airlineIata,
              flightNo: flight.flightNo,
              from: flight.from,
              to: flight.to,
              departAt: flight.departAt,
              arriveAt: flight.arriveAt,
              via: "",
              days: flight.days.join(","),
              validTo,
              aircraft: flight.aircraft,
              // Kept with the row: months from now, the difference between a
              // time the desk checked and one a provider asserted is the whole
              // answer to "where did this come from".
              importedFrom: configuredProvider() || "provider",
              importedOn: new Date().toISOString().slice(0, 10),
            },
          },
        });
        created.push(flight.flightNo);
      }

      await logAuditFromReq(req, {
        companyId,
        entity: "TravelSchedule",
        entityId: `${from}-${to}`,
        action: "CREATE",
        afterValues: { created, skipped },
        description: `Imported ${created.length} flight${created.length === 1 ? "" : "s"} on ${from} → ${to}`,
      });

      return NextResponse.json({ success: true, created, skipped });
    }

    if (!configuredProvider()) {
      return NextResponse.json(
        {
          error:
            "No flight-data provider is connected yet. Add AERODATABOX_RAPIDAPI_KEY to the environment, " +
            "or add these flights by hand on this page — by hand is not the slower option for a sector or two.",
        },
        { status: 400 },
      );
    }

    const result = await fetchSchedules({ from, to, date, probe: Boolean(body.probe) });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof ProviderError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not import schedules" },
      { status: 500 },
    );
  }
}
