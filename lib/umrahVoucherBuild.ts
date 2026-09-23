// FILE: lib/umrahVoucherBuild.ts
//
// Building a pilgrim's voucher out of the booking and the departure.
//
// The two documents hold the same trip and were being typed twice: the booking
// knows who is going and what they are sharing, the departure knows the flights
// and the hotels, and the voucher is both of those said again by hand. Typed
// twice means wrong once — usually a hotel date, which is discovered at a
// check-in desk in Makkah.
//
// The dates are the part worth doing here rather than by hand. A departure
// declares its legs as "Madinah 6 nights, Makkah 15 nights", which is how an
// operator thinks about it and negotiates it. A voucher needs check-in and
// check-out dates for each of those, and the Saudi hotel reads them. Those are
// the same fact stated two ways, so one is derived from the other and they
// cannot drift.
//
// Nothing is posted and nothing is saved here. This produces a draft the
// operator reviews — room numbers are assigned on arrival, "or similar" gets
// resolved, and the transport note changes with the season.

import {
  emptyPilgrim,
  emptyStay,
  type UmrahVoucher,
  type VoucherHotelStay,
} from "@/lib/umrahVoucher";
import type { UmrahBooking } from "@/lib/umrahBooking";
import type { UmrahDeparture } from "@/lib/umrahPackage";

function addDays(iso: string, days: number): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Check-in and check-out for every leg, walked forward from the departure date.
 *
 * Leg one starts the day the group lands; each leg after it starts where the
 * previous one ended, because a pilgrim does not spend a night between hotels.
 * Legs with no nights are skipped rather than printed as a zero-night stay —
 * a departure often carries an empty third leg that was never filled in.
 */
export function datedStays(departure: UmrahDeparture, occupancy: number): VoucherHotelStay[] {
  let cursor = departure.departureDate;
  const out: VoucherHotelStay[] = [];

  for (const leg of departure.legs) {
    const nights = Number(leg.nights) || 0;
    if (nights <= 0 || !leg.hotelName.trim()) continue;
    const inDate = cursor;
    const outDate = addDays(cursor, nights);
    out.push({
      ...emptyStay(leg.city || "Makkah"),
      city: leg.city || "Makkah",
      hotelName: leg.hotelName,
      // The sharing the party bought, not the departure's default. It is what
      // the hotel is being asked to room them as.
      occupancy,
      inDate,
      outDate,
      rooms: 1,
      roomNo: "",
      orSimilar: true,
    });
    cursor = outDate;
  }
  return out;
}

/**
 * A voucher draft for one booking on one departure.
 *
 * `rooms` is left at one per stay. Working out how many rooms a party of five
 * needs at quad sharing is arithmetic the operator would immediately override —
 * families split by who travels with whom, not by the ceiling of a division.
 */
export function voucherFromBooking(opts: {
  booking: UmrahBooking;
  departure: UmrahDeparture;
  companyName?: string;
  /** Passport numbers found in the passport database, keyed by pilgrim name. */
  passportByName?: Map<string, string>;
  enteredBy?: string;
}): UmrahVoucher {
  const { booking, departure, companyName, passportByName, enteredBy } = opts;

  return {
    agentName: (companyName || "").toUpperCase(),
    subAgent: "",
    mainAgent: "",
    tripNumber: departure.tripNumber || booking.bookingNo || "",
    entryDate: new Date().toISOString().slice(0, 10),
    enteredBy: enteredBy || "",
    guestName: booking.partyName,
    careOf: booking.bookingNo || "",
    reference: booking.bookingNo || "",
    pnr: "",
    arrival: {
      flightNo: departure.arrivalFlight?.flightNo || "",
      date: departure.departureDate,
      sector: departure.arrivalFlight?.sector || "",
      terminal: departure.arrivalFlight?.terminal || "",
      time: departure.arrivalFlight?.time || "",
    },
    departure: {
      flightNo: departure.returnFlight?.flightNo || "",
      date: departure.returnDate,
      sector: departure.returnFlight?.sector || "",
      terminal: departure.returnFlight?.terminal || "",
      time: departure.returnFlight?.time || "",
    },
    stays: datedStays(departure, booking.occupancy),
    pilgrims: booking.pilgrims.map((p) => ({
      ...emptyPilgrim(departure.title || ""),
      groupName: departure.title || "",
      name: p.name,
      /* The booking's own number where it has one, otherwise whatever the
         passport database holds for that name. Two places were keeping the
         same fact and only one of them was ever filled in, which is how a
         voucher reached immigration with a blank passport column. */
      passportNo: p.passportNo || passportByName?.get(p.name.trim().toUpperCase()) || "",
      gender: p.gender,
      age: p.age,
    })),
    remarks: departure.transportNote || "",
    notice: "",
    makkahStaff: departure.makkahStaff || "",
    madinahStaff: departure.madinahStaff || "",
    makkahStaffName: departure.makkahStaffName || "",
    makkahStaffPhone: departure.makkahStaffPhone || "",
    madinahStaffName: departure.madinahStaffName || "",
    madinahStaffPhone: departure.madinahStaffPhone || "",
    qrUrl: "",
  };
}
