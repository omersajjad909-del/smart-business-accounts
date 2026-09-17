// FILE: lib/umrahBooking.ts
//
// A party booked onto a departure, and what they have paid so far.
//
// Umrah is almost never paid in one go. A family books in June for October,
// puts down an advance, and clears the rest across two or three instalments
// before the visa is filed. So a booking is not a sale with a date on it — it
// is a balance that has to reach zero before the pilgrim can travel, and the
// operator's real daily question is "who owes what, and is anyone flying with
// money still outstanding".
//
// That question is the reason this file exists. The money is held as a list of
// instalments, each with its own due date, rather than as a "paid" figure that
// somebody types over: a single number cannot say that the second instalment
// was due three weeks ago.
//
// The price comes off the departure's rate card for the sharing the party
// chose, and is then editable — because it is negotiated, and a price that
// cannot be argued down is a price nobody in this trade would use.

export type BookingStatus = "enquiry" | "confirmed" | "travelled" | "cancelled";

export type Instalment = {
  id: string;
  dueDate: string;
  amount: number;
  /** Set when the money actually arrives. Blank means still owed. */
  paidDate?: string;
  /** The CRV or receipt it came in on, so the ledger can be found from here. */
  receiptNo?: string;
};

export type BookingPilgrim = {
  id: string;
  name: string;
  passportNo: string;
  gender: "Male" | "Female";
  age: number | "";
};

export type UmrahBooking = {
  bookingNo: string;
  departureId: string;
  departureTitle: string;
  partyName: string;
  phone: string;
  /** Which sharing option the party took. Drives the price off the rate card. */
  occupancy: number;
  /** Per pilgrim. Seeded from the departure, then negotiated. */
  pricePerPilgrim: number;
  pilgrims: BookingPilgrim[];
  instalments: Instalment[];
  status: BookingStatus;
  notes?: string;
};

export type BookingMoney = {
  pax: number;
  total: number;
  paid: number;
  balance: number;
  /** Instalments due before today with nothing against them. */
  overdue: number;
  overdueCount: number;
  /** The next one still owed, if any. */
  nextDue?: Instalment;
  /** Scheduled instalments that do not add up to the total. */
  unscheduled: number;
  percentPaid: number;
};

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function emptyPilgrim(): BookingPilgrim {
  return { id: newId("pax"), name: "", passportNo: "", gender: "Male", age: "" };
}

export function emptyInstalment(dueDate = "", amount = 0): Instalment {
  return { id: newId("inst"), dueDate, amount, paidDate: "", receiptNo: "" };
}

export function emptyBooking(): UmrahBooking {
  return {
    bookingNo: "",
    departureId: "",
    departureTitle: "",
    partyName: "",
    phone: "",
    occupancy: 4,
    pricePerPilgrim: 0,
    pilgrims: [emptyPilgrim()],
    instalments: [],
    status: "enquiry",
    notes: "",
  };
}

/**
 * What the booking is worth and what is still owed.
 *
 * `today` is passed in rather than read from the clock so the same booking
 * gives the same answer wherever it is asked from, and so "overdue" can be
 * tested without waiting for a date to pass.
 */
export function bookingMoney(b: UmrahBooking, today = new Date().toISOString().slice(0, 10)): BookingMoney {
  const pax = b.pilgrims.length;
  const total = round2(pax * (Number(b.pricePerPilgrim) || 0));

  let paid = 0;
  let scheduled = 0;
  let overdue = 0;
  let overdueCount = 0;
  let nextDue: Instalment | undefined;

  const byDate = b.instalments.slice().sort((a, c) => (a.dueDate || "").localeCompare(c.dueDate || ""));
  for (const inst of byDate) {
    const amount = Number(inst.amount) || 0;
    scheduled += amount;
    if (inst.paidDate) {
      paid += amount;
      continue;
    }
    if (!nextDue) nextDue = inst;
    // Due strictly before today. An instalment due today is due, not late —
    // chasing someone on the morning of is how a customer is lost.
    if (inst.dueDate && inst.dueDate < today) {
      overdue += amount;
      overdueCount += 1;
    }
  }

  return {
    pax,
    total,
    paid: round2(paid),
    balance: round2(total - paid),
    overdue: round2(overdue),
    overdueCount,
    nextDue,
    /* Money that belongs to the booking but has no instalment against it. It is
       not the same as a balance: a balance with a date on it will be chased,
       and this will not, because nothing is watching for it. */
    unscheduled: round2(total - scheduled),
    percentPaid: total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0,
  };
}

/**
 * Split a balance into equal instalments, last one carrying the rounding.
 *
 * Offered rather than imposed: most operators take a third down and the rest in
 * two, and every one of those dates is then argued over. The point is not to
 * decide the schedule but to stop it being typed out by hand every time.
 */
export function suggestSchedule(
  balance: number,
  count: number,
  firstDue: string,
  departureDate: string,
): Instalment[] {
  const n = Math.max(1, Math.floor(count));
  const total = round2(balance);
  if (total <= 0) return [];

  const each = Math.floor((total / n) * 100) / 100;
  const dates = spreadDates(firstDue, departureDate, n);

  return dates.map((dueDate, i) => {
    // The last instalment absorbs the rounding, so the schedule adds to the
    // balance exactly. Spreading a stray paisa across every line is how a
    // booking ends up owing 0.01 for ever.
    const amount = i === n - 1 ? round2(total - each * (n - 1)) : each;
    return emptyInstalment(dueDate, amount);
  });
}

/** Evenly spaced dates from the first due date up to just before departure. */
function spreadDates(firstDue: string, departureDate: string, count: number): string[] {
  const start = new Date(firstDue || new Date().toISOString().slice(0, 10));
  const end = new Date(departureDate || firstDue);
  if (Number.isNaN(start.getTime())) return Array.from({ length: count }, () => firstDue);

  if (count === 1 || Number.isNaN(end.getTime()) || end <= start) {
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      return d.toISOString().slice(0, 10);
    });
  }

  /* The last instalment lands two weeks before departure, not on it. A visa is
     filed and a ticket issued well before the flight, and neither happens on an
     unpaid file. */
  const cutoff = new Date(end);
  cutoff.setDate(cutoff.getDate() - 14);
  if (cutoff <= start) return Array.from({ length: count }, () => start.toISOString().slice(0, 10));

  const span = cutoff.getTime() - start.getTime();
  return Array.from({ length: count }, (_, i) => {
    const at = new Date(start.getTime() + (span * i) / Math.max(1, count - 1));
    return at.toISOString().slice(0, 10);
  });
}

/** What would let a pilgrim travel on a file that is not straight. */
export function validateBooking(
  b: UmrahBooking,
  money: BookingMoney,
  departureDate?: string,
): string[] {
  const errors: string[] = [];
  if (!b.partyName.trim()) errors.push("The booking needs a name.");
  if (!b.departureId) errors.push("The booking is not against a departure.");
  if (!b.pilgrims.length) errors.push("The booking has no pilgrims.");
  if (!(Number(b.pricePerPilgrim) > 0)) errors.push("No price has been agreed.");

  b.pilgrims.forEach((p, i) => {
    if (!p.name.trim()) errors.push(`Pilgrim ${i + 1} has no name.`);
  });

  if (money.paid > money.total + 0.01) {
    errors.push(
      `Paid ${money.paid.toLocaleString()} against a total of ${money.total.toLocaleString()} — ` +
      "one of the two is wrong.",
    );
  }

  /* Travelling on an unpaid file is the expensive mistake in this trade: the
     operator has already paid the airline and the hotel, and the pilgrim is in
     another country. Refused rather than warned. */
  if (b.status === "travelled" && money.balance > 0.01) {
    errors.push(
      `${money.balance.toLocaleString()} is still owed — a booking cannot be marked travelled with a balance.`,
    );
  }

  if (b.status === "confirmed" && departureDate && money.balance > 0.01) {
    const cutoff = new Date(departureDate);
    cutoff.setDate(cutoff.getDate() - 14);
    const last = b.instalments
      .filter((i) => !i.paidDate && i.dueDate)
      .map((i) => i.dueDate)
      .sort()
      .at(-1);
    if (last && last > cutoff.toISOString().slice(0, 10)) {
      errors.push(
        `The last instalment falls after the visa cut-off — nothing is issued on an unpaid file.`,
      );
    }
  }

  return errors;
}

/** Read a stored booking back, defensively. */
export function readBooking(data: unknown): UmrahBooking {
  const d = (data ?? {}) as Record<string, any>;
  const base = emptyBooking();
  const status = String(d.status || "enquiry");
  return {
    ...base,
    ...d,
    occupancy: Number(d.occupancy) || 4,
    pricePerPilgrim: Number(d.pricePerPilgrim) || 0,
    status: (["enquiry", "confirmed", "travelled", "cancelled"].includes(status)
      ? status
      : "enquiry") as BookingStatus,
    pilgrims: Array.isArray(d.pilgrims) && d.pilgrims.length
      ? d.pilgrims.map((p: any) => ({
          ...emptyPilgrim(),
          ...p,
          age: p?.age === "" || p?.age == null ? "" : Number(p.age),
          gender: p?.gender === "Female" ? "Female" : "Male",
        }))
      : base.pilgrims,
    instalments: Array.isArray(d.instalments)
      ? d.instalments.map((i: any) => ({ ...emptyInstalment(), ...i, amount: Number(i?.amount) || 0 }))
      : [],
  };
}
