// FILE: lib/travel/flightSearch.ts
//
// What a flight offer is, and what it costs.
//
// This file holds no data of its own and talks to nothing. It is the shapes a
// search deals in and the arithmetic that turns an offer plus a party of
// passengers into the numbers that go on an invoice — kept in one place because
// those numbers are the part that has to be right, and because both the search
// page and the booking wizard have to agree on them exactly.
//
// Where the offers themselves come from is deliberately not decided here. The
// agency has no airline or GDS connection wired up, so the search route builds
// offers from the company's own past bookings and tops them up with clearly
// marked sample fares. Every fare is editable before it is booked, and nothing
// in this system presents an invented number as a live airline quote.

import { PAX_FARE_SHARE, PAX_TAKES_SEAT, emptyPassenger, type PaxType, type Passenger } from "@/lib/travelPassengers";

export type CabinClass = "economy" | "premium_economy" | "business" | "first";

export const CABIN_LABELS: Record<CabinClass, string> = {
  economy: "Economy",
  premium_economy: "Premium Economy",
  business: "Business",
  first: "First",
};

/** What each cabin costs relative to economy, as a starting point only. */
export const CABIN_MULTIPLIER: Record<CabinClass, number> = {
  economy: 1,
  premium_economy: 1.6,
  business: 2.9,
  first: 4.4,
};

export type TripType = "oneway" | "round" | "multi";

export type PaxCounts = { adults: number; children: number; infants: number };

export type SearchLeg = { from: string; to: string; date: string };

export type SearchQuery = {
  tripType: TripType;
  /** One entry for a one-way, two for a return, more for a multi-city. */
  legs: SearchLeg[];
  pax: PaxCounts;
  cabin: CabinClass;
};

export type FlightLeg = {
  from: string;
  to: string;
  /** ISO date of departure, "2026-10-15". */
  date: string;
  /**
   * Local clock times, "10:30" — an airline's timetable is written in them.
   *
   * Empty where no timetable has been recorded for this sector. They used to be
   * generated, which produced a departure time and a flight number that looked
   * exactly like a real one and were not: an agent reading "PA 163 departs
   * 00:45" off this screen would have been reading a random number. Nothing
   * fills these now except a schedule someone entered or a provider returned.
   */
  departAt: string;
  arriveAt: string;
  durationMinutes: number;
  /** True where the duration is worked out from the distance rather than from
      a real timetable, so the card can say "about" and mean it. */
  durationIsEstimate: boolean;
  /** Where it touches down on the way, by IATA code. Empty for a direct. */
  via: string[];
  /** Empty where unknown. Never invented. */
  flightNo: string;
  /** A red-eye arriving the next morning is not the same flight as one that
      lands the same evening, and a passenger who misses that misses the day. */
  arrivesNextDay: boolean;
};

/**
 * A timetable row the agency recorded, or a provider returned.
 *
 * This is the only thing that may put a clock time on a card.
 */
export type FlightSchedule = {
  id: string;
  airline: string;
  airlineCode: string;
  flightNo: string;
  from: string;
  to: string;
  departAt: string;
  arriveAt: string;
  /** Where it touches down on the way. Empty for a direct. */
  via: string[];
  /** ISO weekday numbers it operates on, Monday = 1. Empty means every day. */
  days: number[];
  validFrom: string;
  validTo: string;
};

/** Minutes between two clock times, rolling past midnight. */
export function minutesBetween(departAt: string, arriveAt: string): number {
  const parse = (value: string) => {
    const [h, m] = String(value || "").split(":").map((part) => Number(part));
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
  };
  const out = parse(departAt);
  const back = parse(arriveAt);
  if (!Number.isFinite(out) || !Number.isFinite(back)) return 0;
  // An arrival earlier on the clock than the departure landed the next day.
  return back >= out ? back - out : back + 1440 - out;
}

/**
 * Where a price came from, in descending order of how much it can be trusted.
 *
 * "contract" is a fare the agency actually negotiated and typed in; "history"
 * is one it really charged on this sector before; "none" means nobody has told
 * this system what the sector sells for, and it says so rather than guessing.
 *
 * There used to be a fourth, "sample", which was a fare worked out from the
 * distance. It read Rs 51,100 for Faisalabad to Jeddah against a real fare
 * north of Rs 150,000 — a third of the truth, printed to the rupee beside a
 * Select button. An estimate that wrong is not a starting point, it is a
 * booking taken at a loss, so it is gone.
 */
export type OfferSource = "contract" | "history" | "none";

export type FlightOffer = {
  id: string;
  airline: string;
  airlineCode: string;
  cabin: CabinClass;
  legs: FlightLeg[];
  /* Null means nobody knows, and null is the honest default.

     These are fare rules. They are set by the fare the agency bought, they
     differ between two seats on the same aircraft, and nothing in this system
     can derive them. They used to be filled in anyway — baggage hard-coded at
     30 kg, meals by a list of carriers, and refundability by a coin flip
     (rand() > 0.45) — and then printed on the card as fact. An agent who
     quotes "refundable with fee" off a coin flip has told the customer
     something the agency may have to honour. */
  baggageKg: number | null;
  cabinBaggageKg: number | null;
  mealsIncluded: boolean | null;
  refundable: boolean | null;
  /* Null where nothing real says what this sector sells for. The card shows
     no price at all then, and the booking wizard asks for one. */
  /** Per adult, before anything the agency adds. */
  baseFare: number | null;
  /** Per adult. Levied per passenger, so it does not scale with the fare. */
  taxes: number | null;
  /** Per adult, what the airline or consolidator charges the agency. */
  supplierCost: number | null;
  /** The account the payable lands in — usually the airline, sometimes a
      consolidator the agency actually buys through. */
  supplier: string;
  source: OfferSource;
  /** Said plainly on the card, so nobody quotes a sample as though it were a
      live fare. */
  sourceNote: string;
};

export function paxTotal(pax: PaxCounts): number {
  return (Number(pax.adults) || 0) + (Number(pax.children) || 0) + (Number(pax.infants) || 0);
}

/** "2 Adults, 1 Child" — for the search bar, where the list will not fit. */
export function describePax(pax: PaxCounts): string {
  const parts: string[] = [];
  if (pax.adults) parts.push(`${pax.adults} Adult${pax.adults > 1 ? "s" : ""}`);
  if (pax.children) parts.push(`${pax.children} Child${pax.children > 1 ? "ren" : ""}`);
  if (pax.infants) parts.push(`${pax.infants} Infant${pax.infants > 1 ? "s" : ""}`);
  return parts.join(", ") || "No passengers";
}

/** "4h 50m" — how every airline prints a duration. */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

export function describeStops(leg: FlightLeg): string {
  if (!leg.via.length) return "Direct";
  return leg.via.length === 1 ? `1 stop (${leg.via[0]})` : `${leg.via.length} stops (${leg.via.join(", ")})`;
}

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export type OfferPricing = {
  /** Base fare across the whole party. */
  baseFare: number;
  taxes: number;
  /** What the agency owes the supplier for the whole party. */
  supplierCost: number;
  /** What the agency adds on top. Entered by the operator, not derived. */
  markup: number;
  /** What the customer pays. */
  total: number;
  /** What the agency keeps. Not the same as the markup where the agency buys
      below the published fare — this is the number that matters. */
  profit: number;
  seats: number;
  count: number;
};

/**
 * What an offer comes to for a given party.
 *
 * Children and infants are priced off the adult fare by the shares the rest of
 * the system already uses, so a fare quoted here and a fare typed into the
 * passenger dialog land on the same number.
 */
export function priceOffer(offer: FlightOffer, pax: PaxCounts, markup = 0): OfferPricing | null {
  // Nothing real to price from. The caller shows the sector and says so.
  if (offer.baseFare == null) return null;

  const rows: Array<{ type: PaxType; n: number }> = [
    { type: "ADT", n: Number(pax.adults) || 0 },
    { type: "CHD", n: Number(pax.children) || 0 },
    { type: "INF", n: Number(pax.infants) || 0 },
  ];

  let baseFare = 0;
  let taxes = 0;
  let supplierCost = 0;
  let seats = 0;
  let count = 0;

  for (const row of rows) {
    if (row.n <= 0) continue;
    const share = PAX_FARE_SHARE[row.type];
    baseFare += (offer.baseFare ?? 0) * share * row.n;
    // Tax is levied per passenger rather than as a share of the fare, except
    // for an infant, who is largely exempt.
    taxes += (row.type === "INF" ? 0 : (offer.taxes ?? 0)) * row.n;
    supplierCost += (offer.supplierCost ?? 0) * share * row.n;
    if (PAX_TAKES_SEAT[row.type]) seats += row.n;
    count += row.n;
  }

  const cleanMarkup = Math.max(0, Number(markup) || 0);
  const total = round2(baseFare + taxes + cleanMarkup);
  return {
    baseFare: round2(baseFare),
    taxes: round2(taxes),
    supplierCost: round2(supplierCost),
    markup: round2(cleanMarkup),
    total,
    profit: round2(total - supplierCost),
    seats,
    count,
  };
}

/**
 * The passenger rows a booking starts from.
 *
 * The ticket's value and cost are the sums of these rows — see
 * lib/travelPassengers — so the wizard builds them here rather than posting a
 * total of its own. The markup is spread across the fare-paying passengers so
 * that the sum of the lines is the price the customer was quoted.
 */
export function buildPassengers(offer: FlightOffer, pax: PaxCounts, markup = 0): Passenger[] {
  const out: Passenger[] = [];
  const spec: Array<[PaxType, number]> = [
    ["ADT", Number(pax.adults) || 0],
    ["CHD", Number(pax.children) || 0],
    ["INF", Number(pax.infants) || 0],
  ];

  for (const [type, n] of spec) {
    for (let i = 0; i < n; i += 1) {
      const share = PAX_FARE_SHARE[type];
      out.push({
        ...emptyPassenger(type),
        // Zero where the sector has no recorded fare, which the wizard's
        // passenger step then requires the operator to fill in.
        fare: round2((offer.baseFare ?? 0) * share),
        tax: type === "INF" ? 0 : round2(offer.taxes ?? 0),
        cost: round2((offer.supplierCost ?? 0) * share),
      });
    }
  }

  // Spread across everyone who is paying a fare, and give the remainder to the
  // first of them so the lines add up to the quoted total to the last rupee.
  const cleanMarkup = Math.max(0, Number(markup) || 0);
  const payers = out.filter((row) => row.fare > 0);
  if (cleanMarkup > 0 && payers.length) {
    const each = Math.floor((cleanMarkup / payers.length) * 100) / 100;
    payers.forEach((row) => {
      row.fare = round2(row.fare + each);
    });
    const placed = round2(each * payers.length);
    if (placed !== cleanMarkup) {
      payers[0].fare = round2(payers[0].fare + (cleanMarkup - placed));
    }
  }

  return out;
}

/** "KHI -> DOH -> LHR", which is how the ticket record already writes a route. */
export function describeRoute(legs: FlightLeg[]): string {
  if (!legs.length) return "";
  const points: string[] = [legs[0].from];
  for (const leg of legs) {
    points.push(...leg.via, leg.to);
  }
  // A return lands back where it started; saying so twice reads as a mistake.
  return points.filter((code, index) => index === 0 || code !== points[index - 1]).join(" -> ");
}

/* The airport table moved to lib/travel/airports.ts, which carries all 4,008
   airports a scheduled flight actually goes to.

   It is not re-exported here on purpose: that file is 310KB and this one is
   imported by client components, so pulling it through would put the whole
   world's airports into the browser bundle to answer a box showing seven rows
   at a time. Server code imports it directly; the picker asks
   /api/travel/airports. Only the type comes through, and a type costs nothing
   at runtime. */
export type { Airport } from "./airports";
// Needed in scope here too, for distanceKm below. Type-only, so nothing of
// that 310KB file reaches a bundle.
import type { Airport } from "./airports";

/**
 * A handful of codes, for the plain text boxes that offer a datalist hint.
 *
 * Not a limit on anything — every one of those boxes takes any IATA code that
 * is typed into it, and the search resolves it against the full table. These
 * are the ones a Pakistani desk reaches for most, so they are one keystroke
 * away instead of being buried four thousand rows deep.
 */
/**
 * What this search is and is not, in one place.
 *
 * It used to be written twice — once in the API response and once as the
 * banner's fallback — and the two drifted the moment invented timetables were
 * removed: the server stopped claiming schedules were "built from the route"
 * and the banner went on saying it for another week. A sentence that tells an
 * operator what they may quote is not a sentence to keep two copies of.
 */
export const FARE_NOTICE =
  "No airline or GDS connection is configured. This page shows only what you have told it: " +
  "times come from your Flight Schedules and prices from your Contract Fares or from what you " +
  "charged on the sector before. Where a sector has neither, it shows the carriers and no " +
  "numbers — it does not estimate a fare.";

export const COMMON_AIRPORT_CODES = [
  "KHI", "LHE", "ISB", "PEW", "UET", "MUX", "SKT", "LYP", "GWD", "SDT",
  "JED", "MED", "RUH", "DMM", "DXB", "SHJ", "AUH", "DOH", "MCT", "BAH",
  "KWI", "IST", "LHR", "MAN", "BHX", "CDG", "FRA", "JFK", "YYZ", "KUL",
  "BKK", "SIN", "CAN", "PEK", "DEL", "CMB", "DAC", "KBL", "BGW", "NJF",
];

export const AIRLINES: Array<{ code: string; name: string }> = [
  { code: "PK", name: "Pakistan International Airlines" },
  { code: "PF", name: "AirSial" },
  { code: "ER", name: "SereneAir" },
  { code: "PA", name: "Airblue" },
  { code: "SV", name: "Saudia" },
  { code: "EK", name: "Emirates" },
  { code: "QR", name: "Qatar Airways" },
  { code: "EY", name: "Etihad Airways" },
  { code: "FZ", name: "flydubai" },
  { code: "G9", name: "Air Arabia" },
  { code: "WY", name: "Oman Air" },
  { code: "GF", name: "Gulf Air" },
  { code: "TK", name: "Turkish Airlines" },
  { code: "KU", name: "Kuwait Airways" },
  { code: "MS", name: "EgyptAir" },
  { code: "J9", name: "Jazeera Airways" },
  /* Turned up by the first real schedule import off Karachi and missing from
     the list written from memory — which is what a list written from memory
     is for. Without them a Fly Jinnah flight reads as "9P" on the card. */
  { code: "9P", name: "Fly Jinnah" },
  { code: "F3", name: "flyadeal" },
  { code: "XY", name: "flynas" },
  { code: "OV", name: "SalamAir" },
  { code: "UL", name: "SriLankan Airlines" },
  { code: "6E", name: "IndiGo" },
  { code: "AI", name: "Air India" },
  { code: "TG", name: "Thai Airways" },
  { code: "MH", name: "Malaysia Airlines" },
  { code: "SQ", name: "Singapore Airlines" },
  { code: "CZ", name: "China Southern" },
  { code: "BA", name: "British Airways" },
  { code: "VS", name: "Virgin Atlantic" },
];

export function airlineName(code: string): string {
  return AIRLINES.find((a) => a.code === String(code || "").toUpperCase())?.name || String(code || "");
}

/** Great-circle kilometres between two airports. */
export function distanceKm(a: Airport, b: Airport): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/**
 * Roughly how long that distance takes in the air.
 *
 * Cruise plus the twenty-odd minutes every sector loses to taxiing, climb and
 * the approach. Close enough that a schedule reads as a schedule; never close
 * enough to print on a ticket, which is why nothing here does.
 */
export function flightMinutes(km: number): number {
  return Math.round(35 + (km / 820) * 60);
}

/** ISO weekday of a date, Monday = 1 through Sunday = 7. */
export function isoWeekday(date: string): number {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return 0;
  const day = parsed.getUTCDay();
  return day === 0 ? 7 : day;
}

/** The recorded flights a carrier operates on this sector, on this date. */
export function schedulesFor(
  schedules: FlightSchedule[],
  code: string,
  from: string,
  to: string,
  date: string,
): FlightSchedule[] {
  const weekday = isoWeekday(date);
  return schedules
    .filter((row) => {
      if (row.airlineCode !== code) return false;
      if (row.from !== from || row.to !== to) return false;
      if (row.validFrom && date && date < row.validFrom) return false;
      if (row.validTo && date && date > row.validTo) return false;
      // A flight that does not operate on the day asked for is not an option.
      if (row.days.length && weekday && !row.days.includes(weekday)) return false;
      return true;
    })
    .sort((a, b) => a.departAt.localeCompare(b.departAt));
}

/** A leg built from a timetable someone actually recorded. */
export function scheduledLeg(schedule: FlightSchedule, date: string): FlightLeg {
  const duration = minutesBetween(schedule.departAt, schedule.arriveAt);
  return {
    from: schedule.from,
    to: schedule.to,
    date,
    departAt: schedule.departAt,
    arriveAt: schedule.arriveAt,
    durationMinutes: duration,
    durationIsEstimate: false,
    via: schedule.via,
    flightNo: schedule.flightNo,
    arrivesNextDay: schedule.arriveAt < schedule.departAt,
  };
}
