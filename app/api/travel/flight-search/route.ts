/**
 * POST /api/travel/flight-search — what the desk can offer on a route.
 *
 * THIS IS NOT A LIVE FARE FEED. No airline, GDS or consolidator API is
 * connected to this system. What comes back is a plausible timetable built from
 * the real geography of the route, priced from two things:
 *
 *   - a contract fare the agency negotiated and entered on the Contract Fares
 *     sheet, which is the agency's own real buying and selling price;
 *   - failing that, what this company itself last charged and paid on the same
 *     route, where it has flown it before, which is also a real number;
 *   - and where neither exists, no fare at all. It used to fall back to a
 *     figure worked out from the distance, which read Rs 51,100 for
 *     Faisalabad to Jeddah against a real fare north of Rs 150,000. A third
 *     of the truth, printed to the rupee next to a Select button, is not a
 *     starting point — it is a booking taken at a loss.
 *
 * Every offer says which of the two it is, the page repeats it, and every fare
 * is editable before the booking is saved. That is deliberate: an invented
 * number presented as an airline's price is how an agency sells a seat at a
 * loss, and no amount of convenient UI is worth that.
 *
 * When a real provider is wired up it replaces buildOffers() and nothing else:
 * the shape it must return is FlightOffer in lib/travel/flightSearch.ts.
 */

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveBranchIdOrDefault, resolveCompanyId } from "@/lib/tenant";
import {
  AIRLINES,
  CABIN_MULTIPLIER,
  FARE_NOTICE,
  airlineName,
  distanceKm,
  flightMinutes,
  scheduledLeg,
  schedulesFor,
  type Airport,
  type CabinClass,
  type FlightLeg,
  type FlightOffer,
  type FlightSchedule,
  type SearchLeg,
  type SearchQuery,
  type TripType,
} from "@/lib/travel/flightSearch";
// The full table — server-side only, see the header of that file.
import { findAirport } from "@/lib/travel/airports";
import { configuredProvider, fetchSchedules } from "@/lib/travel/scheduleProvider";

/** Where each carrier banks its connections. */
const HUBS: Record<string, string> = {
  EK: "DXB", FZ: "DXB", QR: "DOH", EY: "AUH", G9: "SHJ", WY: "MCT",
  GF: "BAH", KU: "KWI", J9: "KWI", TK: "IST", SV: "JED", MS: "CAI",
  PK: "KHI", PF: "KHI", ER: "ISB", PA: "KHI",
};

/**
 * Where each carrier is at home.
 *
 * A carrier flies direct when one end of the sector is in its own country and
 * banks it through its hub otherwise. That single rule is what separates
 * "Saudia, Lahore to Jeddah, direct" from "Emirates, Lahore to Jeddah, one stop
 * in Dubai" — and getting it wrong sends PIA from Lahore to Jeddah via Karachi,
 * which is not a flight anyone sells.
 */
const HOME_COUNTRY: Record<string, string> = {
  PK: "Pakistan", PF: "Pakistan", ER: "Pakistan", PA: "Pakistan",
  SV: "Saudi Arabia", EK: "UAE", FZ: "UAE", EY: "UAE", G9: "UAE",
  QR: "Qatar", WY: "Oman", GF: "Bahrain", KU: "Kuwait", J9: "Kuwait",
  TK: "Turkey", MS: "Egypt",
};

/** Roughly what each carrier charges relative to the middle of the market. */
const POSITIONING: Record<string, number> = {
  EK: 1.18, QR: 1.14, EY: 1.10, TK: 1.06, SV: 1.02, WY: 0.99, GF: 0.97,
  PK: 0.95, KU: 0.95, MS: 0.92, ER: 0.90, PF: 0.89, PA: 0.88, FZ: 0.86,
  J9: 0.84, G9: 0.80,
};

const PK_CARRIERS = new Set(["PK", "PF", "ER", "PA"]);

/**
 * Carriers that fly narrow-body aircraft and nothing else.
 *
 * It matters because without it the estimator offered AirSial, Airblue and
 * SereneAir flying Lahore to Barcelona nonstop — six and a half thousand
 * kilometres on an A320. The range check only ran for carriers being routed
 * through a hub, so anyone at home at one end of the sector was offered it at
 * any distance at all.
 */
const NARROW_BODY = new Set(["PF", "ER", "PA", "9P", "G9", "FZ", "J9", "XY", "F3", "OV"]);

/** How far a carrier plausibly flies a sector without stopping. */
function rangeLimitKm(code: string): number {
  return NARROW_BODY.has(code) ? 4200 : 13000;
}

/** A number generator that gives the same route the same timetable twice. */
function seeded(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function readSchedules(
  rows: Array<{ id: string; title: string; status: string; date: Date | null; data: unknown }>,
): FlightSchedule[] {
  const out: FlightSchedule[] = [];
  for (const row of rows) {
    if (String(row.status || "").toLowerCase() !== "active") continue;
    const data = (row.data ?? {}) as Record<string, unknown>;
    const from = String(data.from || "").toUpperCase();
    const to = String(data.to || "").toUpperCase();
    const departAt = String(data.departAt || "");
    const arriveAt = String(data.arriveAt || "");
    if (!from || !to || !departAt || !arriveAt) continue;

    const airline = String(data.airline || "");
    const match = AIRLINES.find((a) => a.name.toLowerCase() === airline.toLowerCase());

    out.push({
      id: row.id,
      airline,
      airlineCode: match?.code || String(data.airlineCode || "").toUpperCase(),
      flightNo: String(data.flightNo || ""),
      from,
      to,
      departAt,
      arriveAt,
      via: String(data.via || "")
        .split(/[^A-Za-z]+/)
        .map((code) => code.toUpperCase())
        .filter((code) => code.length === 3),
      // Empty means every day, which is what most of these are.
      days: String(data.days || "")
        .split(/[^0-9]+/)
        .map((n) => Number(n))
        .filter((n) => n >= 1 && n <= 7),
      validFrom: row.date ? row.date.toISOString().slice(0, 10) : "",
      validTo: String(data.validTo || "").slice(0, 10),
    });
  }
  return out;
}

/**
 * A leg with no timetable behind it.
 *
 * No times and no flight number, because nothing here knows them. What it does
 * know is the distance, so it can say roughly how long the sector takes and
 * whether this carrier would likely bank it through its hub — both marked as
 * the estimates they are.
 */
function estimatedLeg(code: string, leg: SearchLeg, from: Airport, to: Airport): FlightLeg | null {
  const home = HOME_COUNTRY[code];
  const atHome = home === from.country || home === to.country;
  const hub = HUBS[code];
  const hubAirport = !atHome && hub && hub !== from.code && hub !== to.code ? findAirport(hub) : undefined;

  const direct = distanceKm(from, to);
  let via: string[] = [];
  let minutes = flightMinutes(direct);

  if (hubAirport) {
    const viaHub = distanceKm(from, hubAirport) + distanceKm(hubAirport, to);
    // Nobody flies Karachi to Lahore via Dubai.
    if (viaHub < direct * 1.85 && direct > 900) {
      via = [hubAirport.code];
      minutes = flightMinutes(distanceKm(from, hubAirport)) + flightMinutes(distanceKm(hubAirport, to)) + 90;
    }
  }

  /* A sector the aircraft cannot reach is not an offer, however it was routed.
     This check used to sit inside the hub branch, so a carrier at home at one
     end — which is every Pakistani carrier on every sector out of Pakistan —
     skipped it entirely. */
  const longest = via.length ? Math.max(distanceKm(from, findAirport(via[0])!), distanceKm(findAirport(via[0])!, to)) : direct;
  if (longest > rangeLimitKm(code)) return null;

  return {
    from: from.code,
    to: to.code,
    date: leg.date,
    departAt: "",
    arriveAt: "",
    durationMinutes: minutes,
    durationIsEstimate: true,
    via,
    flightNo: "",
    arrivesNextDay: false,
  };
}

/** A fare the agency negotiated, off the Contract Fares sheet. */
/** Which carriers plausibly fly this sector at all. */
function carriersFor(from: Airport, to: Airport): string[] {
  const domestic = from.country === "Pakistan" && to.country === "Pakistan";
  if (domestic) return ["PK", "PF", "ER", "PA"];

  const touchesPk = from.country === "Pakistan" || to.country === "Pakistan";
  const codes: string[] = [];

  for (const airline of AIRLINES) {
    const code = airline.code;
    const home = HOME_COUNTRY[code];
    const atHome = home === from.country || home === to.country;

    if (PK_CARRIERS.has(code)) {
      // A Pakistani carrier on a sector that never touches Pakistan is not a
      // flight anyone can sell.
      if (touchesPk) codes.push(code);
      continue;
    }

    // Anyone else either serves one end from home, or banks the sector through
    // a hub this system actually knows where to put on the map.
    if (atHome || findAirport(HUBS[code] || "")) codes.push(code);
  }
  return codes;
}

type ContractFare = {
  from: string;
  to: string;
  airline: string;
  supplier: string;
  cabin: string;
  tripType: string;
  sellFare: number;
  taxes: number;
  netCost: number;
  baggageKg: number;
  validFrom: string;
  validTo: string;
  title: string;
};

function readContracts(
  rows: Array<{ title: string; status: string; date: Date | null; data: unknown }>,
): ContractFare[] {
  const out: ContractFare[] = [];
  for (const row of rows) {
    if (String(row.status || "").toLowerCase() !== "active") continue;
    const data = (row.data ?? {}) as Record<string, unknown>;
    const from = String(data.from || "").toUpperCase();
    const to = String(data.to || "").toUpperCase();
    const sellFare = Number(data.sellFare) || 0;
    if (!from || !to || sellFare <= 0) continue;
    out.push({
      from,
      to,
      airline: String(data.airline || ""),
      supplier: String(data.supplier || data.airline || ""),
      cabin: String(data.cabin || "economy"),
      tripType: String(data.tripType || "oneway"),
      sellFare,
      taxes: Number(data.taxes) || 0,
      netCost: Number(data.netCost) || 0,
      baggageKg: Number(data.baggageKg) || 0,
      validFrom: row.date ? row.date.toISOString().slice(0, 10) : "",
      validTo: String(data.validTo || "").slice(0, 10),
      title: row.title,
    });
  }
  return out;
}

/**
 * The contract fare for this sector, carrier and cabin, if there is one.
 *
 * The trip type has to match exactly. A one-way contract applied to a return
 * would price a journey home at nothing, and the booking would be invoiced for
 * roughly half of what the supplier is about to bill — which is the specific
 * mistake this whole sheet exists to prevent.
 */
function contractFor(
  contracts: ContractFare[],
  from: string,
  to: string,
  airline: string,
  cabin: string,
  tripType: TripType,
  travelDate: string,
): ContractFare | null {
  const wanted = tripType === "round" ? "round" : "oneway";
  const on = travelDate || new Date().toISOString().slice(0, 10);

  for (const fare of contracts) {
    if (fare.from !== from || fare.to !== to) continue;
    if (fare.cabin !== cabin) continue;
    if (fare.tripType !== wanted) continue;
    if (fare.airline.toLowerCase() !== airline.toLowerCase()) continue;
    // A fare that has lapsed by the travel date cannot be sold for it.
    if (fare.validFrom && on < fare.validFrom) continue;
    if (fare.validTo && on > fare.validTo) continue;
    return fare;
  }
  return null;
}

/** What this company itself last charged and paid on the same sector. */
type HistoryFare = { baseFare: number; taxes: number; cost: number; label: string };

function historyFor(
  records: Array<{ title: string; amount: unknown; date: Date | null; data: unknown }>,
  from: string,
  to: string,
  airline: string,
): HistoryFare | null {
  for (const record of records) {
    const data = (record.data ?? {}) as Record<string, unknown>;
    const route = String(data.route || "").toUpperCase();
    const points = route.split(/[^A-Z]+/).filter(Boolean);
    if (points.length < 2) continue;
    /* A return is stored as "LHE -> JED -> LHE", so the destination sits in the
       middle of its own route. Requiring it at the end found one-ways only. */
    if (points[0] !== from || !points.slice(1).includes(to)) continue;

    const supplier = String(data.supplier || data.airline || "");
    if (supplier && airline && supplier.toLowerCase() !== airline.toLowerCase()) continue;

    const passengers = Array.isArray(data.passengers) ? data.passengers : [];
    const adult = passengers.find((p) => String((p as Record<string, unknown>)?.type || "ADT") === "ADT") as
      | Record<string, unknown>
      | undefined;

    if (adult && Number(adult.fare) > 0) {
      return {
        baseFare: Number(adult.fare) || 0,
        taxes: Number(adult.tax) || 0,
        cost: Number(adult.cost) || 0,
        label: `Your fare on ${record.title}`,
      };
    }

    // No passenger breakdown — fall back to the record's own totals, which is
    // the whole party, so divide by the seats it carried.
    const seats = Math.max(1, Number(data.paxSeats) || Number(data.paxCount) || 1);
    const sale = Number(record.amount) || 0;
    if (sale > 0) {
      return {
        baseFare: Math.round(sale / seats),
        taxes: 0,
        cost: Math.round((Number(data.cost) || 0) / seats),
        label: `Your fare on ${record.title}`,
      };
    }
  }
  return null;
}

function buildOffers(
  query: SearchQuery,
  history: Array<{ title: string; amount: unknown; date: Date | null; data: unknown }>,
  contracts: ContractFare[],
  schedules: FlightSchedule[],
): FlightOffer[] {
  /* The outbound sector is the market, not the first and last points of the
     itinerary. A return trip ends where it started, so reading the last leg's
     destination made every round trip look like a domestic hop and offered
     Lahore–Jeddah–Lahore as though only Pakistani carriers flew it. */
  const first = query.legs[0];
  const origin = findAirport(first?.from || "");
  const destination = findAirport(first?.to || "");
  if (!origin || !destination) return [];

  const offers: FlightOffer[] = [];

  /* A carrier the agency holds a contract with, or has recorded a flight for,
     is always offered — even where the routing rules would not have suggested
     it. A negotiated fare is a seat the desk can actually sell, and leaving it
     out of the list is the one way this search can cost the agency money. */
  const candidates = new Set(carriersFor(origin, destination));
  for (const fare of contracts) {
    if (fare.from !== origin.code || fare.to !== destination.code) continue;
    const match = AIRLINES.find((a) => a.name.toLowerCase() === fare.airline.toLowerCase());
    if (match) candidates.add(match.code);
  }
  for (const row of schedules) {
    if (row.from === origin.code && row.to === destination.code && row.airlineCode) {
      candidates.add(row.airlineCode);
    }
  }

  for (const code of candidates) {
    const carrier = airlineName(code);
    const contract = contractFor(contracts, origin.code, destination.code, carrier, query.cabin, query.tripType, first.date);
    const past = contract ? null : historyFor(history, origin.code, destination.code, carrier);

    /* One offer per recorded outbound flight, because a departure at 07:00 and
       one at 19:00 are two different things to sell. The later legs of an
       itinerary take the first flight recorded for them — choosing among the
       return options is the passenger's conversation, not this list's. */
    const outbound = schedulesFor(schedules, code, first.from, first.to, first.date);
    const departures: Array<FlightSchedule | null> = outbound.length ? outbound.slice(0, 6) : [null];

    for (const chosen of departures) {
      const legs: FlightLeg[] = [];
      let usable = true;

      query.legs.forEach((leg, index) => {
        if (!usable) return;
        const legFrom = findAirport(leg.from);
        const legTo = findAirport(leg.to);
        if (!legFrom || !legTo) { usable = false; return; }

        const recorded = index === 0
          ? chosen
          : schedulesFor(schedules, code, leg.from, leg.to, leg.date)[0] || null;

        if (recorded) {
          legs.push(scheduledLeg(recorded, leg.date));
          return;
        }
        const estimated = estimatedLeg(code, leg, legFrom, legTo);
        if (!estimated) { usable = false; return; }
        legs.push(estimated);
      });

      if (!usable || !legs.length) continue;

      /* A price only where something real says so. No contract fare and no
         history on the sector means this system does not know what it sells
         for, and the card says exactly that. */
      const baseFare = contract ? contract.sellFare : past ? past.baseFare : null;
      const taxes = contract ? contract.taxes : past ? past.taxes : null;
      const supplierCost = contract
        ? contract.netCost
        : past && past.cost > 0
          ? past.cost
          // History that knew the sale but not the cost: assume the agency
          // bought at what it charged, which is conservative — it never
          // flatters the margin.
          : past
            ? (past.baseFare + past.taxes)
            : null;

      const scheduled = legs.every((leg) => Boolean(leg.departAt));

      offers.push({
        id: `${code}-${legs.map((l) => l.flightNo.replace(/\s+/g, "") || `${l.from}${l.to}`).join("-")}-${chosen?.id || "est"}`,
        airline: carrier,
        airlineCode: code,
        cabin: query.cabin,
        legs,
        /* Only from a contract the agency actually holds, and only what it
           actually says. Anything else is left unknown rather than guessed —
           see the note on FlightOffer. */
        baggageKg: contract && contract.baggageKg > 0 ? contract.baggageKg : null,
        cabinBaggageKg: null,
        mealsIncluded: null,
        refundable: null,
        baseFare,
        taxes,
        supplierCost,
        // The account the payable lands in, which on a contract fare is whoever
        // the agency actually buys through rather than the carrier on the tail.
        supplier: contract ? contract.supplier || carrier : carrier,
        source: contract ? "contract" : past ? "history" : "none",
        /* Two separate claims, kept separate: where the price came from, and
           whether the times are a timetable or an absence of one. */
        sourceNote: [
          contract
            ? `Your contract fare — ${contract.title}${contract.validTo ? `, valid to ${contract.validTo}` : ""}`
            : past
              ? `${past.label} — your own booking, not a live quote`
              : "No fare recorded for this sector",
          scheduled ? "Times from your recorded schedule" : "No schedule recorded for this sector",
        ].join(" · "),
      });
    }
  }

  return offers;
}

/**
 * Fill in a sector's timetable from the provider, the first time it is searched.
 *
 * The import panel on Flight Schedules exists for the operator who wants to
 * look before saving. This is for everybody else: search a sector nobody has
 * recorded, and the real timetable is fetched, kept, and shown — rather than
 * the page saying "no schedule" and leaving the agent to go and do it by hand.
 *
 * WHAT KEEPS THIS FROM EATING THE QUOTA
 *
 * A provider that sells to a Pakistani company without an accreditation is
 * metered in the hundreds of calls a month, so this runs once per sector, ever.
 * A sector with rows already recorded is skipped, and a sector that came back
 * empty leaves a marker so the next search does not ask again. Two sectors per
 * search at most — an outbound and a return.
 *
 * It never fails a search. A provider that is down, out of quota or misbehaving
 * leaves the page exactly as it would have been without it.
 */
async function autoImportSchedules(
  companyId: string,
  branchId: string | null,
  query: SearchQuery,
  existing: FlightSchedule[],
): Promise<{ added: FlightSchedule[]; sectors: string[]; problem: string | null }> {
  const added: FlightSchedule[] = [];
  const sectors: string[] = [];
  let problem: string | null = null;

  /* Said out loud rather than swallowed. Without a key the page showed "no
     schedule" on every sector for ever and looked exactly like a provider
     that does not work — which is how somebody concludes the API is useless
     when in fact nobody had told the deployment about it. */
  if (!configuredProvider()) {
    return { added, sectors, problem: "no-provider" };
  }

  const wanted = query.legs.slice(0, 2).filter((leg) => {
    const already = existing.some((row) => row.from === leg.from && row.to === leg.to);
    return !already;
  });
  // Every sector already has a timetable, so there is nothing to ask for and
  // nothing to report.
  if (!wanted.length) return { added, sectors, problem };

  /* Sectors already asked about and found empty. Without this a route the
     provider does not cover would be asked again on every single search. */
  const probes = await prisma.businessRecord.findMany({
    where: { companyId, category: "travel_schedule_probe" },
    select: { title: true },
  });
  const probed = new Set(probes.map((row) => row.title));

  for (const leg of wanted) {
    const key = `${leg.from}-${leg.to}`;
    if (probed.has(key)) continue;

    try {
      const result = await fetchSchedules({ from: leg.from, to: leg.to, date: leg.date });

      // Asked and answered, whatever the answer. The marker goes down either
      // way so an empty sector is not re-asked on the next search.
      await prisma.businessRecord.create({
        data: {
          companyId,
          branchId: branchId || null,
          category: "travel_schedule_probe",
          title: key,
          status: result.flights.length ? "found" : "empty",
          date: new Date(),
          data: { from: leg.from, to: leg.to, found: result.flights.length, checkedOn: new Date().toISOString().slice(0, 10) },
        },
      });

      if (!result.flights.length) continue;
      sectors.push(key);

      for (const flight of result.flights) {
        const record = await prisma.businessRecord.create({
          data: {
            companyId,
            branchId: branchId || null,
            category: "travel_schedule",
            title: `${flight.flightNo} · ${flight.from} → ${flight.to}`,
            status: "active",
            date: new Date(leg.date),
            data: {
              airline: flight.airline,
              airlineIata: flight.airlineIata,
              flightNo: flight.flightNo,
              from: flight.from,
              to: flight.to,
              departAt: flight.departAt,
              arriveAt: flight.arriveAt,
              via: "",
              // The provider gives one day's board and says nothing about the
              // others, so this is recorded as daily and flagged for review.
              days: "",
              validTo: null,
              aircraft: flight.aircraft,
              importedFrom: configuredProvider() || "provider",
              importedOn: new Date().toISOString().slice(0, 10),
              importedAutomatically: true,
            },
          },
        });

        added.push({
          id: record.id,
          airline: flight.airline,
          airlineCode: flight.airlineIata,
          flightNo: flight.flightNo,
          from: flight.from,
          to: flight.to,
          departAt: flight.departAt,
          arriveAt: flight.arriveAt,
          via: [],
          days: [],
          validFrom: leg.date,
          validTo: "",
        });
      }
    } catch (providerError) {
      /* A provider that is down must not take the search with it — the sector
         stays unscheduled, exactly as it was a moment ago. But it must not be
         silent either: an exhausted quota, a rejected key and a route nobody
         covers all look identical from the outside, and the desk needs to know
         which one it is looking at. */
      problem = providerError instanceof Error ? providerError.message : "The flight-data provider could not be reached.";
    }
  }

  return { added, sectors, problem };
}

function readQuery(body: unknown): SearchQuery | null {
  const raw = (body ?? {}) as Record<string, unknown>;
  const tripType = String(raw.tripType || "oneway");
  const legsRaw = Array.isArray(raw.legs) ? raw.legs : [];
  const legs: SearchLeg[] = [];
  for (const entry of legsRaw) {
    const leg = (entry ?? {}) as Record<string, unknown>;
    const from = String(leg.from || "").trim().toUpperCase();
    const to = String(leg.to || "").trim().toUpperCase();
    const date = String(leg.date || "").slice(0, 10);
    if (!from || !to || !date || from === to) continue;
    legs.push({ from, to, date });
  }
  if (!legs.length) return null;

  const paxRaw = (raw.pax ?? {}) as Record<string, unknown>;
  const adults = Math.max(1, Math.min(9, Number(paxRaw.adults) || 1));
  const children = Math.max(0, Math.min(8, Number(paxRaw.children) || 0));
  const infants = Math.max(0, Math.min(adults, Number(paxRaw.infants) || 0));
  const cabin = String(raw.cabin || "economy") as CabinClass;

  return {
    tripType: tripType === "round" || tripType === "multi" ? tripType : "oneway",
    legs: tripType === "oneway" ? legs.slice(0, 1) : legs,
    pax: { adults, children, infants },
    cabin: CABIN_MULTIPLIER[cabin] ? cabin : "economy",
  };
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const query = readQuery(await req.json().catch(() => null));
    if (!query) {
      return NextResponse.json({ error: "A from, a to and a date are needed to search" }, { status: 400 });
    }

    /* The company's own recent ticketing, newest first, so a fare it really
       charged beats anything this file could invent. */
    const history = await prisma.businessRecord.findMany({
      where: { companyId, category: "travel_ticket" },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { title: true, amount: true, date: true, data: true },
    });

    /* The agency's own negotiated fares. Read first because they are the only
       numbers here that are neither an estimate nor a guess at what is still
       on offer. */
    const contractRows = await prisma.businessRecord.findMany({
      where: { companyId, category: "travel_fare", status: "active" },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { title: true, status: true, date: true, data: true },
    });
    const contracts = readContracts(contractRows as never);

    /* The timetable the agency recorded. The only thing in this system that
       may put a clock time on a card. */
    const scheduleRows = await prisma.businessRecord.findMany({
      where: { companyId, category: "travel_schedule", status: "active" },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: { id: true, title: true, status: true, date: true, data: true },
    });
    const schedules = readSchedules(scheduleRows as never);

    /* A sector nobody has recorded gets its timetable fetched now rather than
       showing "no schedule" and waiting for somebody to go and import it. */
    const branchId = await resolveBranchIdOrDefault(req, companyId);
    const auto = await autoImportSchedules(companyId, branchId, query, schedules);

    const offers = buildOffers(query, history as never, contracts, [...schedules, ...auto.added]);

    return NextResponse.json({
      offers,
      query,
      /* Said by the server as well as the page, so a caller that is not our own
         UI cannot mistake this for a fare feed either. */
      liveProvider: false,
      notice: FARE_NOTICE,
      fromContract: offers.filter((offer) => offer.source === "contract").length,
      unpriced: offers.filter((offer) => offer.baseFare == null).length,
      /* Sectors whose timetable was fetched on this search. The page tells the
         operator, because rows that appeared without anyone asking still need
         checking — a codeshare, a seasonal service, an operating-days column
         the provider does not fill in. */
      autoImported: auto.sectors,
      /* Why a sector came back with no times: no key configured, a quota that
         is used up, a provider that refused. Null when it simply had nothing
         for that route, which is a different thing and says so on its own. */
      providerProblem: auto.problem,
      providerConfigured: auto.problem !== "no-provider",
      scheduled: offers.filter((offer) => offer.legs.every((leg) => Boolean(leg.departAt))).length,
      fromHistory: offers.filter((offer) => offer.source === "history").length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Flight search failed" },
      { status: 500 },
    );
  }
}
