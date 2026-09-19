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
 * is one it really charged on this sector before; "sample" is this system's own
 * estimate and is never a quote.
 */
export type OfferSource = "contract" | "history" | "sample";

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
  /** Per adult, before anything the agency adds. */
  baseFare: number;
  /** Per adult. Levied per passenger, so it does not scale with the fare. */
  taxes: number;
  /** Per adult, what the airline or consolidator charges the agency. */
  supplierCost: number;
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
export function priceOffer(offer: FlightOffer, pax: PaxCounts, markup = 0): OfferPricing {
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
    baseFare += offer.baseFare * share * row.n;
    // Tax is levied per passenger rather than as a share of the fare, except
    // for an infant, who is largely exempt.
    taxes += (row.type === "INF" ? 0 : offer.taxes) * row.n;
    supplierCost += offer.supplierCost * share * row.n;
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
        fare: round2(offer.baseFare * share),
        tax: type === "INF" ? 0 : round2(offer.taxes),
        cost: round2(offer.supplierCost * share),
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

export type Airport = { code: string; city: string; country: string; name: string; lat: number; lon: number };

/**
 * The airports a Pakistani agency actually sells, plus where its customers go.
 *
 * Not a world database — a list the desk can find its airport in without
 * scrolling, which is what a From box needs. Anything missing can still be
 * typed as a bare IATA code.
 */
export const AIRPORTS: Airport[] = [
  { code: "KHI", city: "Karachi", country: "Pakistan", name: "Jinnah International" , lat: 24.9065, lon: 67.1608 },
  { code: "LHE", city: "Lahore", country: "Pakistan", name: "Allama Iqbal International" , lat: 31.5216, lon: 74.4036 },
  { code: "ISB", city: "Islamabad", country: "Pakistan", name: "Islamabad International" , lat: 33.5607, lon: 72.8516 },
  { code: "PEW", city: "Peshawar", country: "Pakistan", name: "Bacha Khan International" , lat: 33.9939, lon: 71.5146 },
  { code: "UET", city: "Quetta", country: "Pakistan", name: "Quetta International" , lat: 30.2514, lon: 66.9378 },
  { code: "MUX", city: "Multan", country: "Pakistan", name: "Multan International" , lat: 30.2032, lon: 71.4191 },
  { code: "SKT", city: "Sialkot", country: "Pakistan", name: "Sialkot International" , lat: 32.5356, lon: 74.3639 },
  { code: "FSD", city: "Faisalabad", country: "Pakistan", name: "Faisalabad International" , lat: 31.365, lon: 72.9948 },
  { code: "JED", city: "Jeddah", country: "Saudi Arabia", name: "King Abdulaziz International" , lat: 21.6796, lon: 39.1565 },
  { code: "MED", city: "Madinah", country: "Saudi Arabia", name: "Prince Mohammad bin Abdulaziz" , lat: 24.5534, lon: 39.7051 },
  { code: "RUH", city: "Riyadh", country: "Saudi Arabia", name: "King Khalid International" , lat: 24.9576, lon: 46.6988 },
  { code: "DMM", city: "Dammam", country: "Saudi Arabia", name: "King Fahd International" , lat: 26.4712, lon: 49.7979 },
  { code: "DXB", city: "Dubai", country: "UAE", name: "Dubai International" , lat: 25.2532, lon: 55.3657 },
  { code: "SHJ", city: "Sharjah", country: "UAE", name: "Sharjah International" , lat: 25.3286, lon: 55.5172 },
  { code: "AUH", city: "Abu Dhabi", country: "UAE", name: "Zayed International" , lat: 24.433, lon: 54.6511 },
  { code: "DOH", city: "Doha", country: "Qatar", name: "Hamad International" , lat: 25.2731, lon: 51.6081 },
  { code: "MCT", city: "Muscat", country: "Oman", name: "Muscat International" , lat: 23.5933, lon: 58.2844 },
  { code: "BAH", city: "Manama", country: "Bahrain", name: "Bahrain International" , lat: 26.2708, lon: 50.6336 },
  { code: "KWI", city: "Kuwait City", country: "Kuwait", name: "Kuwait International" , lat: 29.2266, lon: 47.9689 },
  { code: "IST", city: "Istanbul", country: "Turkey", name: "Istanbul Airport" , lat: 41.2753, lon: 28.7519 },
  { code: "LHR", city: "London", country: "United Kingdom", name: "Heathrow" , lat: 51.47, lon: -0.4543 },
  { code: "MAN", city: "Manchester", country: "United Kingdom", name: "Manchester" , lat: 53.3537, lon: -2.275 },
  { code: "BHX", city: "Birmingham", country: "United Kingdom", name: "Birmingham" , lat: 52.4539, lon: -1.748 },
  { code: "CDG", city: "Paris", country: "France", name: "Charles de Gaulle" , lat: 49.0097, lon: 2.5479 },
  { code: "FRA", city: "Frankfurt", country: "Germany", name: "Frankfurt am Main" , lat: 50.0379, lon: 8.5622 },
  { code: "JFK", city: "New York", country: "United States", name: "John F. Kennedy" , lat: 40.6413, lon: -73.7781 },
  { code: "YYZ", city: "Toronto", country: "Canada", name: "Pearson International" , lat: 43.6777, lon: -79.6248 },
  { code: "KUL", city: "Kuala Lumpur", country: "Malaysia", name: "Kuala Lumpur International" , lat: 2.7456, lon: 101.7099 },
  { code: "BKK", city: "Bangkok", country: "Thailand", name: "Suvarnabhumi" , lat: 13.69, lon: 100.7501 },
  { code: "SIN", city: "Singapore", country: "Singapore", name: "Changi" , lat: 1.3644, lon: 103.9915 },
  { code: "CAN", city: "Guangzhou", country: "China", name: "Baiyun International" , lat: 23.3924, lon: 113.2988 },
  { code: "PEK", city: "Beijing", country: "China", name: "Capital International" , lat: 40.0799, lon: 116.6031 },
  { code: "DEL", city: "New Delhi", country: "India", name: "Indira Gandhi International" , lat: 28.5562, lon: 77.1 },
  { code: "CMB", city: "Colombo", country: "Sri Lanka", name: "Bandaranaike International" , lat: 7.1808, lon: 79.8841 },
  { code: "DAC", city: "Dhaka", country: "Bangladesh", name: "Hazrat Shahjalal International" , lat: 23.8433, lon: 90.3978 },
  { code: "KBL", city: "Kabul", country: "Afghanistan", name: "Hamid Karzai International" , lat: 34.5658, lon: 69.2123 },
  { code: "THR", city: "Tehran", country: "Iran", name: "Mehrabad" , lat: 35.6892, lon: 51.3134 },
  { code: "BGW", city: "Baghdad", country: "Iraq", name: "Baghdad International" , lat: 33.2625, lon: 44.2346 },
  { code: "NJF", city: "Najaf", country: "Iraq", name: "Al Najaf International" , lat: 31.9896, lon: 44.4044 },
  { code: "AMM", city: "Amman", country: "Jordan", name: "Queen Alia International" , lat: 31.7226, lon: 35.9932 },
];

const AIRPORT_BY_CODE = new Map(AIRPORTS.map((a) => [a.code, a]));

export function findAirport(code: string): Airport | undefined {
  return AIRPORT_BY_CODE.get(String(code || "").trim().toUpperCase());
}

/** Airports whose code, city or name the typed text matches. */
export function searchAirports(text: string, limit = 8): Airport[] {
  const needle = String(text || "").trim().toLowerCase();
  if (!needle) return AIRPORTS.slice(0, limit);
  const scored = AIRPORTS.map((airport) => {
    const code = airport.code.toLowerCase();
    const city = airport.city.toLowerCase();
    // An exact code is what the desk types when it knows what it wants, so it
    // has to come first — "DEL" must not be beaten by "New Delhi".
    if (code === needle) return { airport, score: 0 };
    if (city.startsWith(needle)) return { airport, score: 1 };
    if (code.startsWith(needle)) return { airport, score: 2 };
    if (city.includes(needle) || airport.name.toLowerCase().includes(needle) || airport.country.toLowerCase().includes(needle)) {
      return { airport, score: 3 };
    }
    return { airport, score: 99 };
  })
    .filter((row) => row.score < 99)
    .sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((row) => row.airport);
}

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
