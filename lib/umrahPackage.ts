// FILE: lib/umrahPackage.ts
//
// A Hajj or Umrah departure, and what it costs per pilgrim.
//
// This is the object the whole group business turns on. An operator does not
// sell "an Umrah" — they sell a seat on a dated departure with a quota, and the
// price a pilgrim pays depends on how many people they are willing to share a
// room with. Same flight, same hotel, same dates, four different prices.
//
// The reason is one line of arithmetic, and it is the whole of the trade:
//
//     a room costs what it costs per night
//     the pilgrims in it split that
//
// So Makkah for 70 nights at SAR 400 is SAR 14,000 a head shared two ways and
// SAR 5,600 shared five ways. Everything else on the trip — the seat, the visa,
// the transport, the ziyarat — costs the same whoever you room with, which is
// why those are held apart from the hotel legs rather than mixed into one
// "package cost" that cannot then be split by sharing.
//
// Two ways of pricing, because operators use both and often on the same
// departure: a per-sharing rate card for the quote, and a flat figure for the
// deal that actually gets struck. Neither is the real one; the sale is.
//
// Money: hotels are contracted in Saudi riyals and everything else is in the
// operator's own currency. Held in the currency each is really in, converted
// once, at a rate stored on the departure — so a departure costed in March does
// not silently re-cost itself in June when the rate moves.

/**
 * What kind of group this is.
 *
 * "tour" is here because an agency that runs Hajj and Umrah also runs Dubai in
 * December and Turkey in summer, and a group departure is a group departure:
 * a quota of seats, hotel legs, a rate card by sharing, one aircraft. Nothing
 * in the costing cares which country it is — only the labels did.
 */
export type PackageKind = "umrah" | "hajj" | "tour";

/** One hotel leg of the trip: a city, a hotel, nights, and the ROOM rate. */
export type PackageLeg = {
  id: string;
  city: string;
  hotelName: string;
  nights: number;
  /**
   * Per ROOM per night, not per pilgrim. The division by occupancy happens in
   * the costing and nowhere else — a rate already divided is a rate that cannot
   * be re-divided when the sharing changes.
   */
  roomRatePerNight: number;
};

/** What a pilgrim costs regardless of who they share with. */
export type PackageFixedCosts = {
  /** The air seat, at whatever the consolidator charges. */
  air: number;
  visa: number;
  transport: number;
  ziyarat: number;
  meals: number;
  insurance: number;

  /* The Mashair — the days of Hajj itself, spent outside the hotels.

     These were landing in `misc` for want of anywhere else, which for a Hajj
     package hides the second largest cost after the hotels. An operator
     cannot argue a Maktab category or show a pilgrim what the tent costs if
     the whole of Mina, Arafat and Muzdalifah is one line called "Other".

     They are nothing to do with an Umrah, so an Umrah departure never shows
     them and they stay at zero. */
  minaTent?: number;
  arafatTent?: number;
  muzdalifah?: number;
  /** The Maktab / Mu'assasah category the group is booked under. */
  maktab?: number;

  misc: number;
};

export type PackageTier = {
  /** How many share the room. */
  occupancy: number;
  /** What a pilgrim in that room is charged. Blank until the operator prices it. */
  sellPrice: number;
};

export type UmrahDeparture = {
  kind: PackageKind;
  title: string;
  tripNumber: string;
  departureDate: string;
  returnDate: string;
  /** The quota. Seats the operator has actually bought. */
  seats: number;
  legs: PackageLeg[];
  fixed: PackageFixedCosts;
  /** Hotel legs are contracted in this; everything else is in base currency. */
  hotelCurrency: string;
  /** One unit of hotelCurrency in base currency. Stored, so costings are stable. */
  hotelRate: number;
  pricingMode: "sharing" | "flat";
  tiers: PackageTier[];
  /** Used when pricingMode is "flat" — one price whatever the room. */
  flatPrice: number;
  notes?: string;
  /**
   * The group's flights, held on the departure rather than on each booking.
   *
   * Everyone on a departure is on the same aircraft — that is what a group
   * departure is. Asking for the flight number again on every booking would be
   * asking forty families for the same answer, and getting thirty-nine of them
   * right.
   */
  arrivalFlight?: DepartureFlight;
  returnFlight?: DepartureFlight;
  /** Printed on every voucher for this departure. */
  makkahStaff?: string;
  madinahStaff?: string;
  transportNote?: string;
};

/**
 * One aircraft, from one airport to another.
 *
 * A group rarely flies straight there. Lahore to Madinah is often Lahore to
 * Jeddah on one aircraft and Jeddah to Madinah on another, with two hours in
 * between — and a pilgrim standing in Jeddah needs the second flight number,
 * not a note saying "LHE - Madina".
 */
export type FlightLeg = {
  id: string;
  flightNo: string;
  /** IATA codes, so a sector can be read back rather than parsed. */
  from: string;
  to: string;
  depTime: string;
  arrTime: string;
  terminal: string;
};

/** The group's travel in one direction — one leg, or several with a change. */
export type DepartureFlight = {
  /* Kept in step with the legs rather than typed beside them. Everything that
     already reads a departure — the voucher, the invoice, the manifest — reads
     these, and none of it has to learn about connections to keep working. */
  flightNo: string;
  sector: string;
  terminal: string;
  time: string;
  legs?: FlightLeg[];
};

export function emptyLeg2(from = "", to = ""): FlightLeg {
  return { id: newId("fl"), flightNo: "", from, to, depTime: "", arrTime: "", terminal: "" };
}

/** "LHE → JED → MED", built from the legs so it can never disagree with them. */
export function sectorText(legs: FlightLeg[] | undefined): string {
  const chain = (legs ?? []).filter((leg) => leg.from.trim() || leg.to.trim());
  if (!chain.length) return "";
  const stops = [chain[0].from.trim().toUpperCase()];
  for (const leg of chain) stops.push(leg.to.trim().toUpperCase());
  return stops.filter(Boolean).join(" → ");
}

/**
 * The derived fields, recomputed from the legs.
 *
 * The first leg is the one the group checks in for, so its number and time are
 * the ones every existing screen wants; the terminal that matters on arrival
 * is the last leg's.
 */
export function syncFlight(flight: DepartureFlight): DepartureFlight {
  const legs = flight.legs ?? [];
  const first = legs[0];
  const last = legs[legs.length - 1];
  return {
    ...flight,
    legs,
    flightNo: legs.map((leg) => leg.flightNo.trim()).filter(Boolean).join(" / ") || flight.flightNo,
    sector: sectorText(legs) || flight.sector,
    time: first?.depTime || flight.time,
    terminal: last?.terminal || flight.terminal,
  };
}

/**
 * How long the group waits between two aircraft.
 *
 * Returned in minutes, or null where either time is missing — a connection
 * nobody has timed yet is not a zero-minute connection. Times are HH:MM on the
 * day; a wait that crosses midnight is read as the next day rather than as a
 * negative number.
 */
export function layoverMinutes(arrive: string, depart: string): number | null {
  const parse = (t: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || "").trim());
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const a = parse(arrive);
  const d = parse(depart);
  if (a === null || d === null) return null;
  return d >= a ? d - a : d + 1440 - a;
}

/** "2h 15m", or "45m". */
export function layoverLabel(minutes: number | null): string {
  if (minutes === null) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

export type TierCosting = {
  occupancy: number;
  tierName: string;
  /** Hotel cost per pilgrim, in base currency. */
  roomCost: number;
  /** Everything that does not depend on sharing. */
  fixedCost: number;
  costPerPilgrim: number;
  sellPerPilgrim: number;
  marginPerPilgrim: number;
  /** As a share of the sale — the number an owner actually reads. */
  marginPercent: number;
};

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export const OCCUPANCY_NAMES: Record<number, string> = {
  1: "Single",
  2: "Double",
  3: "Triple",
  4: "Quad",
  5: "Quint",
};

export function occupancyName(n: number): string {
  const k = Math.max(1, Math.floor(Number(n) || 1));
  return OCCUPANCY_NAMES[k] || `${k}-sharing`;
}

/**
 * Where a pilgrimage sleeps, in the order it sleeps there.
 *
 * Makkah first, then Madinah. Aziziah is the Hajj days themselves — the
 * district a group is housed in around the Mashair — so it comes last and only
 * a Hajj is offered it by default.
 *
 * A tour goes wherever it goes and types its own.
 */
export const PILGRIMAGE_CITIES = ["Makkah", "Madinah", "Aziziah"];

export function emptyLeg(city = "Makkah"): PackageLeg {
  return { id: newId("leg"), city, hotelName: "", nights: 0, roomRatePerNight: 0 };
}

export function emptyDeparture(kind: PackageKind = "umrah"): UmrahDeparture {
  return {
    kind,
    title: "",
    tripNumber: "",
    departureDate: "",
    returnDate: "",
    seats: 0,
    // Madinah, Makkah, Madinah — the ordinary shape of a trip, so a new
    // departure opens on it rather than on nothing.
    /* The shape each kind of trip actually takes, so a new departure opens on
       something worth editing rather than on three blank rows. A Hajj sleeps
       in Aziziah for the days of the pilgrimage; an Umrah does not go there
       at all, and a tour has no cities until somebody names them. */
    legs:
      kind === "hajj"
        ? [emptyLeg("Makkah"), emptyLeg("Madinah"), emptyLeg("Aziziah")]
        : kind === "umrah"
          ? [emptyLeg("Makkah"), emptyLeg("Madinah")]
          : [emptyLeg("")],
    fixed: { air: 0, visa: 0, transport: 0, ziyarat: 0, meals: 0, insurance: 0, minaTent: 0, arafatTent: 0, muzdalifah: 0, maktab: 0, misc: 0 },
    hotelCurrency: "SAR",
    hotelRate: 0,
    pricingMode: "sharing",
    arrivalFlight: { flightNo: "", sector: "", terminal: "", time: "", legs: [emptyLeg2()] },
    returnFlight: { flightNo: "", sector: "", terminal: "", time: "", legs: [emptyLeg2()] },
    makkahStaff: "",
    madinahStaff: "",
    transportNote: "",
    // The four an operator actually sells. Single is left out of the default
    // card because almost nobody buys it, and it is one click to add.
    tiers: [2, 3, 4, 5].map((occupancy) => ({ occupancy, sellPrice: 0 })),
    flatPrice: 0,
    notes: "",
  };
}

/** Everything that does not move with the sharing, added up. */
export function totalFixed(fixed: PackageFixedCosts): number {
  return round2(
    (Number(fixed.air) || 0) +
    (Number(fixed.visa) || 0) +
    (Number(fixed.transport) || 0) +
    (Number(fixed.ziyarat) || 0) +
    (Number(fixed.meals) || 0) +
    (Number(fixed.insurance) || 0) +
    // Zero on an Umrah, where they are never asked for.
    (Number(fixed.minaTent) || 0) +
    (Number(fixed.arafatTent) || 0) +
    (Number(fixed.muzdalifah) || 0) +
    (Number(fixed.maktab) || 0) +
    (Number(fixed.misc) || 0),
  );
}

/** The Mashair lines, which only a Hajj departure asks for. */
export const MASHAIR_KEYS = ["minaTent", "arafatTent", "muzdalifah", "maktab"] as const;

/** Room cost for the whole trip, per room, in the hotel's own currency. */
export function roomCostPerRoom(legs: PackageLeg[]): number {
  return round2(
    legs.reduce((sum, l) => sum + (Number(l.nights) || 0) * (Number(l.roomRatePerNight) || 0), 0),
  );
}

export function totalNights(legs: PackageLeg[]): number {
  return legs.reduce((sum, l) => sum + (Number(l.nights) || 0), 0);
}

/**
 * The rate card: what each sharing option costs and earns, per pilgrim.
 *
 * The one place the division by occupancy happens. Everything upstream keeps
 * room rates per room, so changing the sharing re-prices the trip correctly
 * instead of dividing an already-divided number.
 */
export function costDeparture(d: UmrahDeparture): TierCosting[] {
  const fixedCost = totalFixed(d.fixed);
  const perRoom = roomCostPerRoom(d.legs);
  const rate = Number(d.hotelRate) || 0;

  const tiers = d.pricingMode === "flat"
    // A flat price still has to be costed against a real room, otherwise the
    // margin is a guess. Quad is the honest default: it is what most flat deals
    // are actually built on.
    ? (d.tiers.length ? d.tiers : [{ occupancy: 4, sellPrice: 0 }])
    : d.tiers;

  return tiers.map((tier) => {
    const occupancy = Math.max(1, Math.floor(Number(tier.occupancy) || 1));
    const roomCost = round2((perRoom / occupancy) * rate);
    const costPerPilgrim = round2(fixedCost + roomCost);
    const sellPerPilgrim = round2(
      d.pricingMode === "flat" ? Number(d.flatPrice) || 0 : Number(tier.sellPrice) || 0,
    );
    const marginPerPilgrim = round2(sellPerPilgrim - costPerPilgrim);
    return {
      occupancy,
      tierName: occupancyName(occupancy),
      roomCost,
      fixedCost,
      costPerPilgrim,
      sellPerPilgrim,
      marginPerPilgrim,
      // Margin on the sale, not on the cost. An owner reads "we keep 12% of what
      // the pilgrim pays"; a mark-up on cost answers a different question and
      // is the larger, flattering number.
      marginPercent: sellPerPilgrim > 0 ? Math.round((marginPerPilgrim / sellPerPilgrim) * 1000) / 10 : 0,
    };
  });
}

/** Seats sold against the quota, and what is left to sell. */
export function seatPosition(seats: number, sold: number) {
  const quota = Math.max(0, Math.floor(Number(seats) || 0));
  const taken = Math.max(0, Math.floor(Number(sold) || 0));
  return {
    quota,
    sold: taken,
    left: Math.max(quota - taken, 0),
    /* Over the quota is not impossible — an operator oversells and buys more
       seats, or the consolidator releases extra. Reported rather than clamped,
       because a silent clamp is how a departure carries more pilgrims than it
       has seats and nobody finds out until the airport. */
    over: Math.max(taken - quota, 0),
    percent: quota > 0 ? Math.min(100, Math.round((taken / quota) * 100)) : 0,
  };
}

/** What would make a departure impossible to sell or cost honestly. */
export function validateDeparture(d: UmrahDeparture): string[] {
  const errors: string[] = [];
  if (!d.title.trim()) errors.push("The departure needs a name.");
  if (!d.departureDate) errors.push("The departure needs a date.");
  if (d.returnDate && d.departureDate && d.returnDate <= d.departureDate) {
    errors.push("The return is on or before the departure.");
  }
  if (!(Number(d.seats) > 0)) errors.push("The departure needs a seat quota.");

  const withNights = d.legs.filter((l) => Number(l.nights) > 0);
  if (!withNights.length) errors.push("No hotel nights — the room cost would be zero.");
  withNights.forEach((l) => {
    if (!l.hotelName.trim()) errors.push(`The ${l.city || "hotel"} leg has no hotel named.`);
    if (!(Number(l.roomRatePerNight) > 0)) {
      errors.push(`${l.hotelName.trim() || l.city || "A leg"} has no room rate.`);
    }
  });

  // Hotel rates are contracted in riyals. Without a conversion rate the room
  // cost silently comes out as zero and every tier looks wildly profitable.
  if (roomCostPerRoom(d.legs) > 0 && !(Number(d.hotelRate) > 0)) {
    errors.push(`No rate for ${d.hotelCurrency || "the hotel currency"} — the room cost would come out as zero.`);
  }

  if (d.pricingMode === "flat") {
    if (!(Number(d.flatPrice) > 0)) errors.push("Flat pricing needs a price.");
  } else if (!d.tiers.some((t) => Number(t.sellPrice) > 0)) {
    errors.push("No sharing option has been priced.");
  }

  return errors;
}

/** Read a stored departure back, defensively. */
/**
 * A saved flight, brought up to the legged shape.
 *
 * Departures saved before connections existed carry a free-text sector like
 * "LHE - Madina" and no legs. Splitting that on its dash recovers the two
 * airports where it was written that way and leaves the text alone where it
 * was not — the old sector is still shown either way, so nothing a desk typed
 * is lost to a format change.
 */
function readFlight(raw: unknown, fallback: DepartureFlight): DepartureFlight {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const flight: DepartureFlight = { ...fallback, ...d };

  if (Array.isArray(d.legs) && d.legs.length) {
    flight.legs = d.legs.map((leg: any) => ({
      id: String(leg?.id || newId("fl")),
      flightNo: String(leg?.flightNo || ""),
      from: String(leg?.from || "").toUpperCase(),
      to: String(leg?.to || "").toUpperCase(),
      depTime: String(leg?.depTime || ""),
      arrTime: String(leg?.arrTime || ""),
      terminal: String(leg?.terminal || ""),
    }));
    return flight;
  }

  const parts = String(flight.sector || "")
    .split(/[-–—>→]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  flight.legs = [{
    id: newId("fl"),
    flightNo: String(flight.flightNo || ""),
    // Only a three-letter code is a code. "Madina" is a city somebody typed,
    // and guessing an airport from it would be inventing data.
    from: parts.length >= 2 && /^[A-Za-z]{3}$/.test(parts[0]) ? parts[0].toUpperCase() : "",
    to: parts.length >= 2 && /^[A-Za-z]{3}$/.test(parts[1]) ? parts[1].toUpperCase() : "",
    depTime: String(flight.time || ""),
    arrTime: "",
    terminal: String(flight.terminal || ""),
  }];
  return flight;
}

export function readDeparture(data: unknown): UmrahDeparture {
  const d = (data ?? {}) as Record<string, any>;
  const base = emptyDeparture();
  return {
    ...base,
    ...d,
    kind: d.kind === "hajj" ? "hajj" : "umrah",
    seats: Number(d.seats) || 0,
    hotelRate: Number(d.hotelRate) || 0,
    flatPrice: Number(d.flatPrice) || 0,
    pricingMode: d.pricingMode === "flat" ? "flat" : "sharing",
    legs: Array.isArray(d.legs) && d.legs.length
      ? d.legs.map((l: any) => ({
          ...emptyLeg(),
          ...l,
          nights: Number(l?.nights) || 0,
          roomRatePerNight: Number(l?.roomRatePerNight) || 0,
        }))
      : base.legs,
    fixed: { ...base.fixed, ...(d.fixed || {}) },
    arrivalFlight: readFlight(d.arrivalFlight, base.arrivalFlight!),
    returnFlight: readFlight(d.returnFlight, base.returnFlight!),
    tiers: Array.isArray(d.tiers) && d.tiers.length
      ? d.tiers.map((t: any) => ({
          occupancy: Number(t?.occupancy) || 4,
          sellPrice: Number(t?.sellPrice) || 0,
        }))
      : base.tiers,
  };
}
