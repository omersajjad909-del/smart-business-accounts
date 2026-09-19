// FILE: lib/travelPassengers.ts
//
// The passengers on one booking.
//
// A ticket file used to hold a single `passenger` string, which is only true of
// a business traveller. A family of five going to Umrah is one PNR, one set of
// dates, one supplier and one invoice — and it was being entered as five
// unrelated records that agreed with each other only by accident. Change the
// date and you change it five times; refund the booking and you refund five
// things and hope you found them all.
//
// So the ticket is the PNR and the passengers live on it. Money is derived from
// them rather than typed alongside them: a total that is entered separately
// from the lines it is supposed to be the sum of will, sooner or later, stop
// being the sum of them.
//
// Nothing here talks to the database. The arithmetic is the part that has to be
// right, so it is kept where it can be read and tested on its own.

/** IATA's three, and every airline's fare sheet is written in them. */
export type PaxType = "ADT" | "CHD" | "INF";

export const PAX_TYPE_LABELS: Record<PaxType, string> = {
  ADT: "Adult",
  CHD: "Child",
  INF: "Infant",
};

/**
 * What each type usually pays, as a share of the adult fare.
 *
 * A starting point for a new line and nothing more — every one of these is
 * negotiable, a group fare ignores them entirely, and the operator types over
 * the suggestion whenever the airline says otherwise. They exist so that adding
 * a two-year-old does not mean reaching for a calculator.
 */
export const PAX_FARE_SHARE: Record<PaxType, number> = {
  ADT: 1,
  CHD: 0.75,
  INF: 0.1,
};

/** An infant travels on a lap and is not counted against the seat block. */
export const PAX_TAKES_SEAT: Record<PaxType, boolean> = {
  ADT: true,
  CHD: true,
  INF: false,
};

export type Passenger = {
  /** Stable within the booking, so a row can be edited without re-keying. */
  id: string;
  name: string;
  type: PaxType;
  passportNo?: string;
  /** The airline's own ticket number — each passenger gets one, even on one PNR. */
  ticketNo?: string;
  /** What this passenger is charged, before tax. */
  fare: number;
  /** Taxes and surcharges on this passenger's fare. */
  tax: number;
  /** What the airline or consolidator charges us for this passenger. */
  cost: number;

  /* What the airline needs to issue the ticket, and what the desk would
     otherwise keep on a photocopy of the passport.

     All optional, because the quick path — a name and a fare typed into the
     passenger dialog — must stay as quick as it was. The booking wizard asks
     for them properly, since a ticket issued against a name that does not
     match the passport is a ticket the passenger cannot fly on. */
  title?: string;
  firstName?: string;
  lastName?: string;
  /** ISO date. An airline prices a child off this, not off what we typed. */
  dob?: string;
  gender?: string;
  nationality?: string;
  /** ISO date. Most carriers refuse a passport expiring within six months. */
  passportExpiry?: string;
  frequentFlyer?: string;
};

export type PassengerTotals = {
  count: number;
  /** Adults and children. Infants have no seat, so they are not in this. */
  seats: number;
  byType: Record<PaxType, number>;
  fare: number;
  tax: number;
  /** What the customer is invoiced — fare plus tax across everyone. */
  sale: number;
  cost: number;
  /** What the agency earns on the booking. */
  margin: number;
};

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function emptyPassenger(type: PaxType = "ADT"): Passenger {
  return {
    // Date-based rather than random: two rows added in the same millisecond
    // would collide, so the counter suffix is what actually keeps them apart.
    id: `pax-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    name: "",
    type,
    passportNo: "",
    ticketNo: "",
    fare: 0,
    tax: 0,
    cost: 0,
  };
}

/** Read a passenger list off a stored record, defensively. */
export function readPassengers(value: unknown): Passenger[] {
  if (!Array.isArray(value)) return [];
  const out: Passenger[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const type = String(row.type || "ADT").toUpperCase();
    const passenger: Passenger = {
      id: String(row.id || emptyPassenger().id),
      name: String(row.name || ""),
      type: (type === "CHD" || type === "INF" ? type : "ADT") as PaxType,
      passportNo: String(row.passportNo || ""),
      ticketNo: String(row.ticketNo || ""),
      fare: Number(row.fare) || 0,
      tax: Number(row.tax) || 0,
      cost: Number(row.cost) || 0,
    };

    /* The travel-document fields are copied only where they are actually set.
       Writing "" into every one of them would turn a booking taken at the
       counter with nothing but a name into a record that looks as though
       someone had filled the passport details in and left them blank. */
    const optional = ["title", "firstName", "lastName", "dob", "gender", "nationality", "passportExpiry", "frequentFlyer"] as const;
    for (const key of optional) {
      const value = String(row[key] || "").trim();
      if (value) passenger[key] = value;
    }

    out.push(passenger);
  }
  return out;
}

/**
 * What the booking comes to.
 *
 * The invoice total and the supplier cost both come from here, so the two can
 * never drift from the lines they are meant to summarise.
 */
export function totalPassengers(passengers: Passenger[]): PassengerTotals {
  const byType: Record<PaxType, number> = { ADT: 0, CHD: 0, INF: 0 };
  let fare = 0;
  let tax = 0;
  let cost = 0;
  let seats = 0;

  for (const p of passengers) {
    byType[p.type] += 1;
    if (PAX_TAKES_SEAT[p.type]) seats += 1;
    fare += Number(p.fare) || 0;
    tax += Number(p.tax) || 0;
    cost += Number(p.cost) || 0;
  }

  const sale = round2(fare + tax);
  const rounded = round2(cost);
  return {
    count: passengers.length,
    seats,
    byType,
    fare: round2(fare),
    tax: round2(tax),
    sale,
    cost: rounded,
    margin: round2(sale - rounded),
  };
}

/**
 * Fill a new line from the adult fare already on the booking.
 *
 * Only ever a suggestion, and only into an empty field — an operator who has
 * typed a negotiated child fare must not have it overwritten because they went
 * back and changed the adult's.
 */
export function suggestFare(type: PaxType, adultFare: number, adultTax: number) {
  const share = PAX_FARE_SHARE[type];
  return {
    fare: round2((Number(adultFare) || 0) * share),
    // Tax does not scale with the fare — it is levied per passenger, and an
    // infant pays little or none of it. Carried across whole for a child, left
    // to the operator for an infant, where airlines differ.
    tax: type === "ADT" || type === "CHD" ? round2(Number(adultTax) || 0) : 0,
  };
}

/** What stops a booking being saved, in the words the desk would use. */
export function validatePassengers(passengers: Passenger[]): string[] {
  const errors: string[] = [];
  if (!passengers.length) {
    errors.push("A booking needs at least one passenger.");
    return errors;
  }
  const unnamed = passengers.filter((p) => !p.name.trim()).length;
  if (unnamed) {
    errors.push(`${unnamed} passenger${unnamed > 1 ? "s have" : " has"} no name.`);
  }
  const adults = passengers.filter((p) => p.type === "ADT").length;
  const infants = passengers.filter((p) => p.type === "INF").length;
  // An infant travels on an adult's lap, so it cannot outnumber the laps. The
  // airline refuses this at check-in; better to hear it while the file is open.
  if (infants > adults) {
    errors.push(`${infants} infants need at least ${infants} adults — there ${adults === 1 ? "is" : "are"} ${adults}.`);
  }
  const noFare = passengers.filter((p) => !(Number(p.fare) > 0)).length;
  if (noFare) {
    errors.push(`${noFare} passenger${noFare > 1 ? "s have" : " has"} no fare.`);
  }
  return errors;
}

/** "3 adults, 1 child" — for a table cell, where the list will not fit. */
export function describeParty(totals: PassengerTotals): string {
  const parts: string[] = [];
  (Object.keys(PAX_TYPE_LABELS) as PaxType[]).forEach((type) => {
    const n = totals.byType[type];
    if (!n) return;
    const label = PAX_TYPE_LABELS[type].toLowerCase();
    parts.push(`${n} ${n === 1 ? label : `${label}${label === "child" ? "ren" : "s"}`}`);
  });
  return parts.join(", ") || "no passengers";
}
