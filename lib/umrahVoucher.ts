// FILE: lib/umrahVoucher.ts
//
// The Umrah / Hajj arrival-departure voucher.
//
// Modelled on the document a Pakistani Umrah operator actually hands a pilgrim,
// rather than on what a booking screen would naturally hold. The two are not the
// same shape, and the voucher is the one that has to be right — it is what the
// pilgrim carries, what the Saudi hotel reads at check-in and what the Makkah
// staff are called on.
//
// The parts that a general "hotel booking" model gets wrong:
//
//   Several hotel stays, in order. A trip is Madinah, then Makkah, then Madinah
//   again — three stays in two cities, and the middle one is the long one. One
//   check-in and one check-out cannot express it, and a repeated city is normal
//   rather than an error to guard against.
//
//   Room type is an occupancy, not a name. "Sharing (1 Pax)" says how many the
//   room is split between, because that is what sets the price per pilgrim.
//
//   Two agents above the trip. A sub-agent sells, a main agent holds the Saudi
//   contract, and the voucher names both — the pilgrim rings whichever answers.
//
//   Nights are not decorative. The hotel reads them, so they are derived from
//   the dates rather than typed beside them, and cannot disagree.

export type VoucherFlight = {
  /** "PK-747". */
  flightNo: string;
  /** ISO date; the printed voucher shows it day-first. */
  date: string;
  /** "LHE - Madina". */
  sector: string;
  terminal: string;
  /** Local time, "19:30". */
  time?: string;
};

export type VoucherHotelStay = {
  id: string;
  /** "Makkah" / "Madinah" — printed as the block heading. */
  city: string;
  hotelName: string;
  /**
   * How many the room is shared between. The price per pilgrim falls as this
   * rises, which is the whole of Umrah pricing.
   */
  occupancy: number;
  inDate: string;
  outDate: string;
  rooms: number;
  /** Assigned on arrival; blank until the hotel gives it. */
  roomNo?: string;
  /** "Or similar" is how these are sold, and the voucher says so. */
  orSimilar?: boolean;
};

export type VoucherPilgrim = {
  id: string;
  /** The operator's own group label, e.g. "SEP 12 DEC VIP 2 - DIAMOND HIJAZI". */
  groupName: string;
  name: string;
  passportNo: string;
  gender: "Male" | "Female";
  age: number | "";
};

export type UmrahVoucher = {
  agentName: string;
  subAgent: string;
  mainAgent: string;
  tripNumber: string;
  entryDate: string;
  enteredBy?: string;
  guestName: string;
  careOf?: string;
  reference?: string;
  pnr?: string;
  arrival: VoucherFlight;
  departure: VoucherFlight;
  stays: VoucherHotelStay[];
  pilgrims: VoucherPilgrim[];
  remarks?: string;
  /** "Transport will be provided by NAQA" and the like — printed in red. */
  notice?: string;
  /**
   * The agency's terms, printed at the foot of the voucher.
   *
   * Written once in Voucher Settings and copied onto each new voucher rather
   * than read live, because a voucher already in a pilgrim's hand must go on
   * saying what it said when it was issued — changing the wording next season
   * cannot retrospectively change what somebody agreed to.
   */
  terms?: string;
  makkahStaff?: string;
  madinahStaff?: string;
  makkahStaffName?: string;
  makkahStaffPhone?: string;
  madinahStaffName?: string;
  madinahStaffPhone?: string;
  /** Scanned by the Saudi office to pull the trip up. */
  qrUrl?: string;
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function emptyStay(city = "Makkah"): VoucherHotelStay {
  return {
    id: newId("stay"),
    city,
    hotelName: "",
    occupancy: 4,
    inDate: "",
    outDate: "",
    rooms: 1,
    roomNo: "",
    orSimilar: true,
  };
}

export function emptyPilgrim(groupName = ""): VoucherPilgrim {
  return {
    id: newId("hajji"),
    groupName,
    name: "",
    passportNo: "",
    gender: "Male",
    age: "",
  };
}

/**
 * Nights between two dates.
 *
 * Derived rather than stored beside the dates. A hotel reads the night count and
 * the dates off the same voucher; the moment those can disagree, one of them is
 * wrong at a check-in desk in another country.
 */
export function nightsBetween(inDate: string, outDate: string): number {
  if (!inDate || !outDate) return 0;
  const from = new Date(inDate);
  const to = new Date(outDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  const ms = to.getTime() - from.getTime();
  if (ms <= 0) return 0;
  return Math.round(ms / 86_400_000);
}

/** Total nights on the trip, across every stay. */
export function totalNights(stays: VoucherHotelStay[]): number {
  return stays.reduce((sum, s) => sum + nightsBetween(s.inDate, s.outDate), 0);
}

/**
 * What the voucher prints in the Room Type box: "Sharing ( 1 Pax )".
 *
 * "Sharing" whatever the number, including one, because that is the word on the
 * document the Saudi hotel reads. It looks wrong for a single room and is not —
 * the trade says a room is shared N ways, and a room shared one way is a room to
 * yourself. Naming it "Single" here would be correcting a customer's own
 * paperwork into something their hotel has never seen.
 *
 * `occupancyTier` below is the pricing vocabulary. The two are deliberately
 * separate: one is what the pilgrim is handed, the other is what the quote is
 * built from.
 */
export function roomTypeLabel(occupancy: number): string {
  const n = Math.max(1, Math.floor(Number(occupancy) || 1));
  return `Sharing ( ${n} Pax )`;
}

/**
 * The pricing tier for an occupancy — Double, Triple, Quad, Quint.
 *
 * This is the name a quote is built on, because the room rate divides by the
 * number sharing it and that is the whole of Umrah pricing: one package, four
 * prices, and the cheapest is the most crowded.
 */
export function occupancyTier(occupancy: number): string {
  const n = Math.max(1, Math.floor(Number(occupancy) || 1));
  const named: Record<number, string> = {
    1: "Single",
    2: "Double",
    3: "Triple",
    4: "Quad",
    5: "Quint",
  };
  return named[n] || `${n}-sharing`;
}

/**
 * The room cost each pilgrim in a stay carries.
 *
 * A room costs what it costs per night; the pilgrims in it split that. This one
 * line is why the same departure has four prices, and why the cheapest one puts
 * five people in a room.
 */
export function roomCostPerPilgrim(
  ratePerNight: number,
  nights: number,
  occupancy: number,
): number {
  const share = Math.max(1, Math.floor(Number(occupancy) || 1));
  const cost = ((Number(ratePerNight) || 0) * (Number(nights) || 0)) / share;
  return Math.round(cost * 100) / 100;
}

/** Day-first, the way every document in this trade is read. */
export function fmtVoucherDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

/**
 * What would send a pilgrim to Saudi Arabia with a voucher that does not work.
 *
 * Deliberately about the document rather than the sale: a missing passport
 * number is refused at immigration and a gap between two stays is a night with
 * no room, and neither shows up as a problem in any ledger.
 */
export function validateVoucher(v: UmrahVoucher): string[] {
  const errors: string[] = [];
  if (!v.guestName.trim()) errors.push("The voucher needs a guest name.");
  if (!v.tripNumber.trim()) errors.push("The voucher needs a trip number.");
  if (!v.stays.length) errors.push("A trip needs at least one hotel stay.");

  v.stays.forEach((s, i) => {
    const where = s.hotelName.trim() || `stay ${i + 1}`;
    if (!s.hotelName.trim()) errors.push(`Stay ${i + 1} has no hotel.`);
    if (!s.inDate || !s.outDate) errors.push(`${where} has no dates.`);
    else if (nightsBetween(s.inDate, s.outDate) <= 0) {
      errors.push(`${where} checks out on or before it checks in.`);
    }
  });

  /* A gap between one check-out and the next check-in is a night the pilgrim
     has nowhere to sleep. Sorted first, because the stays are entered in trip
     order but nothing forces that order. */
  const dated = v.stays
    .filter((s) => s.inDate && s.outDate)
    .slice()
    .sort((a, b) => a.inDate.localeCompare(b.inDate));
  for (let i = 1; i < dated.length; i++) {
    const prev = dated[i - 1];
    const next = dated[i];
    if (next.inDate > prev.outDate) {
      errors.push(
        `No room between ${fmtVoucherDate(prev.outDate)} and ${fmtVoucherDate(next.inDate)} — ` +
        `${prev.hotelName || "the previous hotel"} checks out before ${next.hotelName || "the next"} checks in.`,
      );
    }
  }

  if (!v.pilgrims.length) errors.push("The voucher lists no pilgrims.");
  v.pilgrims.forEach((p, i) => {
    if (!p.name.trim()) errors.push(`Pilgrim ${i + 1} has no name.`);
    // Immigration reads this one. A voucher without it is a voucher that fails
    // at the only place it matters.
    if (!p.passportNo.trim()) errors.push(`${p.name.trim() || `Pilgrim ${i + 1}`} has no passport number.`);
  });

  return errors;
}

/** Read a stored voucher back, defensively. */
export function readVoucher(data: unknown): UmrahVoucher {
  const d = (data ?? {}) as Record<string, any>;
  const flight = (raw: any): VoucherFlight => ({
    flightNo: String(raw?.flightNo || ""),
    date: String(raw?.date || ""),
    sector: String(raw?.sector || ""),
    terminal: String(raw?.terminal || ""),
    time: String(raw?.time || ""),
  });
  return {
    agentName: String(d.agentName || ""),
    subAgent: String(d.subAgent || ""),
    mainAgent: String(d.mainAgent || ""),
    tripNumber: String(d.tripNumber || ""),
    entryDate: String(d.entryDate || ""),
    enteredBy: String(d.enteredBy || ""),
    guestName: String(d.guestName || ""),
    careOf: String(d.careOf || ""),
    reference: String(d.reference || ""),
    pnr: String(d.pnr || ""),
    arrival: flight(d.arrival),
    departure: flight(d.departure),
    stays: Array.isArray(d.stays)
      ? d.stays.map((s: any) => ({
          ...emptyStay(),
          ...s,
          occupancy: Number(s?.occupancy) || 1,
          rooms: Number(s?.rooms) || 1,
        }))
      : [],
    pilgrims: Array.isArray(d.pilgrims)
      ? d.pilgrims.map((p: any) => ({
          ...emptyPilgrim(),
          ...p,
          age: p?.age === "" || p?.age == null ? "" : Number(p.age),
          gender: p?.gender === "Female" ? "Female" : "Male",
        }))
      : [],
    remarks: String(d.remarks || ""),
    terms: String(d.terms || ""),
    notice: String(d.notice || ""),
    makkahStaff: String(d.makkahStaff || ""),
    madinahStaff: String(d.madinahStaff || ""),
    makkahStaffName: String(d.makkahStaffName || ""),
    makkahStaffPhone: String(d.makkahStaffPhone || ""),
    madinahStaffName: String(d.madinahStaffName || ""),
    madinahStaffPhone: String(d.madinahStaffPhone || ""),
    qrUrl: String(d.qrUrl || ""),
  };
}
