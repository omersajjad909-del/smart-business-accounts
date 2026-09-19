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
 *   - failing that, an indicative fare derived from distance and cabin, which
 *     is labelled as indicative and is not a quote.
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
import { resolveCompanyId } from "@/lib/tenant";
import {
  AIRLINES,
  CABIN_MULTIPLIER,
  airlineName,
  distanceKm,
  findAirport,
  flightMinutes,
  type Airport,
  type CabinClass,
  type FlightLeg,
  type FlightOffer,
  type SearchLeg,
  type SearchQuery,
  type TripType,
} from "@/lib/travel/flightSearch";

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

function minutesToClock(total: number): { clock: string; dayOffset: number } {
  const wrapped = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return {
    clock: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    dayOffset: Math.floor(total / 1440),
  };
}

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

function buildLeg(
  code: string,
  leg: SearchLeg,
  from: Airport,
  to: Airport,
  rand: () => number,
): FlightLeg | null {
  const home = HOME_COUNTRY[code];
  const atHome = home === from.country || home === to.country;
  const hub = HUBS[code];
  /* No hub stop where the carrier is already at home on this sector: PIA flies
     Lahore to Jeddah, it does not tour Karachi on the way. */
  const hubAirport = !atHome && hub && hub !== from.code && hub !== to.code ? findAirport(hub) : undefined;

  const direct = distanceKm(from, to);
  let via: string[] = [];
  let airborne = flightMinutes(direct);
  let ground = 0;

  if (hubAirport) {
    const viaHub = distanceKm(from, hubAirport) + distanceKm(hubAirport, to);
    // Only route through the hub where the detour is not absurd — nobody flies
    // Karachi to Lahore via Dubai.
    if (viaHub < direct * 1.85 && direct > 900) {
      via = [hubAirport.code];
      airborne = flightMinutes(distanceKm(from, hubAirport)) + flightMinutes(distanceKm(hubAirport, to));
      ground = 70 + Math.floor(rand() * 180);
    } else if (direct > 4200) {
      // Too far for this carrier to fly nonstop off its own network.
      return null;
    }
  }

  const departMinutes = Math.floor(rand() * 20) * 60 + Math.floor(rand() * 4) * 15;
  const total = airborne + ground;
  const arrival = minutesToClock(departMinutes + total);
  const departure = minutesToClock(departMinutes);

  return {
    from: from.code,
    to: to.code,
    date: leg.date,
    departAt: departure.clock,
    arriveAt: arrival.clock,
    durationMinutes: total,
    via,
    flightNo: `${code} ${100 + Math.floor(rand() * 899)}`,
    arrivesNextDay: arrival.dayOffset > 0,
  };
}

/** A fare the agency negotiated, off the Contract Fares sheet. */
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

function indicativeFare(km: number, cabin: CabinClass, code: string, rand: () => number) {
  // A per-kilometre rate that eases off over distance, the way published fares
  // do — a four-hour sector is not twice the price of a two-hour one.
  const perKm = 48 * Math.pow(km || 1, -0.18);
  const raw = km * perKm * CABIN_MULTIPLIER[cabin] * (POSITIONING[code] ?? 1) * (0.94 + rand() * 0.14);
  const baseFare = Math.max(9000, Math.round(raw / 500) * 500);
  const taxes = Math.max(2500, Math.round((3200 + km * 4.1) / 100) * 100);
  return { baseFare, taxes };
}

function buildOffers(
  query: SearchQuery,
  history: Array<{ title: string; amount: unknown; date: Date | null; data: unknown }>,
  contracts: ContractFare[],
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

  /* A carrier the agency holds a contract with is always offered, even where
     the route rules would not have suggested it — a negotiated fare is a seat
     the desk can actually sell, and leaving it out of the list is the one way
     this search can cost the agency money. */
  const candidates = new Set(carriersFor(origin, destination));
  for (const fare of contracts) {
    if (fare.from !== origin.code || fare.to !== destination.code) continue;
    const match = AIRLINES.find((a) => a.name.toLowerCase() === fare.airline.toLowerCase());
    if (match) candidates.add(match.code);
  }

  for (const code of candidates) {
    const rand = seeded(`${code}|${query.legs.map((l) => `${l.from}${l.to}${l.date}`).join("|")}|${query.cabin}`);

    const legs: FlightLeg[] = [];
    let usable = true;
    for (const leg of query.legs) {
      const legFrom = findAirport(leg.from);
      const legTo = findAirport(leg.to);
      if (!legFrom || !legTo) { usable = false; break; }
      const built = buildLeg(code, leg, legFrom, legTo, rand);
      if (!built) { usable = false; break; }
      legs.push(built);
    }
    if (!usable || !legs.length) continue;

    // Priced per adult across the whole itinerary, which is how a return fare
    // is quoted — not as two one-ways added together.
    const km = legs.reduce((sum, leg) => {
      const a = findAirport(leg.from);
      const b = findAirport(leg.to);
      return sum + (a && b ? distanceKm(a, b) : 0);
    }, 0);

    const carrier = airlineName(code);
    const contract = contractFor(contracts, origin.code, destination.code, carrier, query.cabin, query.tripType, first.date);
    const past = contract ? null : historyFor(history, origin.code, destination.code, carrier);
    const indicative = indicativeFare(km, query.cabin, code, rand);

    const baseFare = contract ? contract.sellFare : past ? past.baseFare : indicative.baseFare;
    const taxes = contract ? contract.taxes : past ? past.taxes : indicative.taxes;
    // Where a contract or history knows the real cost, use it. Otherwise assume
    // the agency buys at the published fare and earns on the markup alone,
    // which is the conservative assumption — it never flatters the margin.
    const supplierCost = contract
      ? contract.netCost
      : past && past.cost > 0
        ? past.cost
        : baseFare + taxes;

    offers.push({
      id: `${code}-${legs.map((l) => l.flightNo.replace(/\s+/g, "")).join("-")}`,
      airline: carrier,
      airlineCode: code,
      cabin: query.cabin,
      legs,
      /* Only from a contract the agency actually holds, and only what it
         actually says. Anything else is left unknown rather than guessed — see
         the note on FlightOffer. */
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
      source: contract ? "contract" : past ? "history" : "sample",
      sourceNote: contract
        ? `Your contract fare — ${contract.title}${contract.validTo ? `, valid to ${contract.validTo}` : ""}`
        : past
          ? `${past.label} — your own booking, not a live quote`
          : "Indicative fare — confirm with the airline before quoting",
    });
  }

  return offers;
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

    const offers = buildOffers(query, history as never, contracts);

    return NextResponse.json({
      offers,
      query,
      /* Said by the server as well as the page, so a caller that is not our own
         UI cannot mistake this for a fare feed either. */
      liveProvider: false,
      notice:
        "No airline or GDS connection is configured. Schedules below are built from the route. " +
        "Fares marked as your contract fare or your past fare are your own real numbers; " +
        "anything marked indicative is this system's estimate — confirm it before you quote it.",
      fromContract: offers.filter((offer) => offer.source === "contract").length,
      fromHistory: offers.filter((offer) => offer.source === "history").length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Flight search failed" },
      { status: 500 },
    );
  }
}
