/**
 * What a travel invoice says, as against what a trading invoice says.
 *
 * A sales invoice raised out of the travel desks was printing the shape every
 * other trade uses — Item, Qty, Rate, Amount — because that is what a
 * SalesInvoice is underneath. On a ticket that reads "Air Ticket Revenue ×1",
 * which tells the passenger nothing and the agency's customer even less. The
 * facts a travel customer checks an invoice against are the passenger's name
 * as printed on the passport, the sector, the PNR and the date they fly.
 *
 * So the invoice is re-expressed, not re-engineered: the same PrintDocA4 that
 * prints every other document, handed travel columns and travel meta. Three
 * shapes, because an agency sells three different things:
 *
 *   ticket   one flight, one or more passengers on one PNR
 *   trip     one journey, several services, one total
 *   package  a seat on a dated departure, priced by who you share a room with
 *
 * Everything here is a pure function of what was already stored. Nothing is
 * invented: a field with nothing behind it is left off the invoice rather than
 * printed empty or guessed at.
 */

export type PrintColumnSpec = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  width?: string | number;
};

export type TravelInvoiceDoc = {
  docTitle: string;
  metaFields: { label: string; value: string }[];
  columns: PrintColumnSpec[];
  rows: Record<string, unknown>[];
  summaryFields: { label: string; value: string }[];
  notes?: string;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

/** A field is only shown when something is actually behind it. */
function meta(label: string, value: unknown): { label: string; value: string }[] {
  const text = clean(value);
  return text ? [{ label, value: text }] : [];
}

function fmtDate(value: unknown): string {
  const text = clean(value);
  if (!text) return "";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toISOString().slice(0, 10);
}

/* ────────────────────────────────────────────────────────────────────────
   1. A ticket
   ──────────────────────────────────────────────────────────────────────── */

export type TicketSource = {
  bookingRef: string;
  passengers: { name: string; passport?: string; type?: string; ticketNo?: string }[];
  passenger?: string;
  route: string;
  pnr: string;
  airline: string;
  travelDate?: string;
  cabin?: string;
  baggageKg?: number | null;
  flightNo?: string;
  amount: number;
  paxCount?: number;
};

export function buildTicketInvoice(source: TicketSource): TravelInvoiceDoc {
  /* One line per passenger, because that is how a ticket is sold and how a
     customer checks it. A party of four on one PNR paying 185,000 each is four
     lines of 185,000, not one line of 740,000 that nobody can tie to a name. */
  const named = source.passengers?.filter((p) => clean(p.name)) ?? [];
  const people = named.length
    ? named
    : clean(source.passenger)
      ? [{ name: clean(source.passenger) }]
      : [];

  const count = people.length || Math.max(1, Number(source.paxCount) || 1);
  // The stored amount is the whole ticket; the per-passenger fare is what the
  // line shows, and the two have to still add up.
  const perHead = count ? Number(source.amount || 0) / count : Number(source.amount || 0);

  const rows = (people.length ? people : Array.from({ length: count }, () => ({ name: "" }))).map(
    (person, index) => ({
      no: index + 1,
      passenger: clean((person as { name?: string }).name) || `Passenger ${index + 1}`,
      passport: clean((person as { passport?: string }).passport),
      ticketNo: clean((person as { ticketNo?: string }).ticketNo),
      paxType: clean((person as { type?: string }).type) || "Adult",
      fare: perHead,
    }),
  );

  return {
    docTitle: "AIR TICKET INVOICE",
    metaFields: [
      ...meta("Booking Ref", source.bookingRef),
      ...meta("PNR", source.pnr),
      ...meta("Sector", source.route),
      ...meta("Airline", source.airline),
      ...meta("Flight", source.flightNo),
      ...meta("Travel Date", fmtDate(source.travelDate)),
      ...meta("Class", source.cabin ? clean(source.cabin).replace(/^\w/, (c) => c.toUpperCase()) : ""),
      ...meta("Baggage", source.baggageKg ? `${source.baggageKg} kg` : ""),
    ],
    columns: [
      { key: "no", label: "#", align: "center", width: 26 },
      { key: "passenger", label: "Passenger Name", align: "left" },
      { key: "paxType", label: "Type", align: "center", width: 54 },
      { key: "passport", label: "Passport", align: "left", width: 90 },
      { key: "ticketNo", label: "Ticket No", align: "left", width: 110 },
      { key: "fare", label: "Fare", align: "right", width: 90 },
    ],
    rows,
    summaryFields: [],
    notes: "Passenger names are as given to the airline and must match the passport exactly.",
  };
}

/* ────────────────────────────────────────────────────────────────────────
   2. A trip — several services on one journey
   ──────────────────────────────────────────────────────────────────────── */

export type TripSource = {
  bookingNo: string;
  customerName: string;
  travelDate?: string | null;
  returnDate?: string | null;
  travellers: string[];
  items: {
    productType: string;
    title: string;
    supplierName?: string | null;
    sale: number;
    qty: number;
    data?: Record<string, unknown> | null;
  }[];
};

const SERVICE_LABEL: Record<string, string> = {
  FLIGHT: "Air Ticket",
  HOTEL: "Hotel",
  VISA: "Visa",
  PASSPORT: "Passport",
  TRANSPORT: "Transport",
  INSURANCE: "Insurance",
  TOUR: "Tour",
  HAJJ: "Hajj",
  UMRAH: "Umrah",
  FEE: "Service Fee",
};

export function buildTripInvoice(source: TripSource): TravelInvoiceDoc {
  const rows = source.items.map((item, index) => {
    const data = (item.data ?? {}) as Record<string, unknown>;
    /* The detail that makes the line checkable. A flight carries its PNR, a
       room the nights and who shares it — the things a customer queries. */
    const detail =
      item.productType === "FLIGHT"
        ? [clean(data.pnr) && `PNR ${clean(data.pnr)}`, clean(item.supplierName)].filter(Boolean).join(" · ")
        : item.productType === "HOTEL"
          ? [clean(item.supplierName), clean(data.roomType)].filter(Boolean).join(" · ")
          : clean(item.supplierName);

    return {
      no: index + 1,
      service: SERVICE_LABEL[item.productType] || item.productType,
      description: clean(item.title),
      detail,
      qty: Number(item.qty) || 1,
      rate: Number(item.sale) || 0,
      amount: (Number(item.sale) || 0) * (Number(item.qty) || 1),
    };
  });

  return {
    docTitle: "TRAVEL INVOICE",
    metaFields: [
      ...meta("Trip No", source.bookingNo),
      ...meta("Departure", fmtDate(source.travelDate)),
      ...meta("Return", fmtDate(source.returnDate)),
      ...meta("Travellers", source.travellers.length ? String(source.travellers.length) : ""),
    ],
    columns: [
      { key: "no", label: "#", align: "center", width: 26 },
      { key: "service", label: "Service", align: "left", width: 90 },
      { key: "description", label: "Description", align: "left" },
      { key: "detail", label: "Supplier / Ref", align: "left" },
      { key: "qty", label: "Qty", align: "center", width: 42 },
      { key: "rate", label: "Rate", align: "right", width: 84 },
      { key: "amount", label: "Amount", align: "right", width: 92 },
    ],
    rows,
    // Named on the invoice, because a family argues about who is on it.
    summaryFields: source.travellers.length
      ? [{ label: "Travelling", value: source.travellers.join(", ") }]
      : [],
  };
}

/* ────────────────────────────────────────────────────────────────────────
   3. A package — a seat on a dated departure
   ──────────────────────────────────────────────────────────────────────── */

export type PackageSource = {
  bookingRef: string;
  departureTitle: string;
  tripNumber?: string;
  kind: string;
  departureDate?: string;
  returnDate?: string;
  legs: { city: string; hotelName: string; nights: number }[];
  pilgrims: { name: string; passportNo?: string; roomType?: string; sellPrice?: number }[];
  instalments?: { date?: string; amount: number; note?: string }[];
  arrivalFlight?: { flightNo?: string; sector?: string };
  returnFlight?: { flightNo?: string; sector?: string };
};

export function buildPackageInvoice(source: PackageSource): TravelInvoiceDoc {
  const rows = source.pilgrims.map((person, index) => ({
    no: index + 1,
    pilgrim: clean(person.name) || `Pilgrim ${index + 1}`,
    passport: clean(person.passportNo),
    room: clean(person.roomType) || "—",
    amount: Number(person.sellPrice) || 0,
  }));

  /* The hotels, said once at the top rather than repeated on every pilgrim's
     line — everyone on a departure stays in the same hotels, which is what a
     departure is. */
  const stay = source.legs
    .filter((leg) => clean(leg.city) || clean(leg.hotelName))
    .map((leg) => `${clean(leg.city)}${clean(leg.hotelName) ? ` — ${clean(leg.hotelName)}` : ""}${leg.nights ? ` (${leg.nights} nights)` : ""}`);

  const kindWord = source.kind === "hajj" ? "HAJJ" : source.kind === "umrah" ? "UMRAH" : "GROUP TOUR";

  return {
    docTitle: `${kindWord} PACKAGE INVOICE`,
    metaFields: [
      ...meta("Booking Ref", source.bookingRef),
      ...meta("Departure", source.departureTitle),
      ...meta("Trip No", source.tripNumber),
      ...meta("Departs", fmtDate(source.departureDate)),
      ...meta("Returns", fmtDate(source.returnDate)),
      ...meta("Outbound", [source.arrivalFlight?.flightNo, source.arrivalFlight?.sector].filter(Boolean).join(" ")),
      ...meta("Inbound", [source.returnFlight?.flightNo, source.returnFlight?.sector].filter(Boolean).join(" ")),
    ],
    columns: [
      { key: "no", label: "#", align: "center", width: 26 },
      { key: "pilgrim", label: "Pilgrim Name", align: "left" },
      { key: "passport", label: "Passport", align: "left", width: 100 },
      { key: "room", label: "Room", align: "center", width: 70 },
      { key: "amount", label: "Package", align: "right", width: 100 },
    ],
    rows,
    summaryFields: [
      ...(stay.length ? [{ label: "Accommodation", value: stay.join("  ·  ") }] : []),
      ...(source.instalments?.length
        ? [{
            label: "Received",
            value: source.instalments
              .map((i) => `${fmtDate(i.date) || "—"}: ${Number(i.amount || 0).toLocaleString()}`)
              .join("   "),
          }]
        : []),
    ],
    notes: "The package covers what is listed above. Anything not listed is not included.",
  };
}
