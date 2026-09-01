"use client";

// Investor / Profit Sharing — shared domain logic.
//
// The person using these pages did not build the factory and never owns the
// goods. He put money in and holds a claim on what comes out: so many rupees
// per kg produced, or an agreed slice of the profit. Everything here serves
// that one relationship — capital in, output measured, share settled.
//
// Records live in BusinessRecord, the same store every other vertical uses,
// so this ships without a schema migration.

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const investorAccent = "#14b8a6";

export const CAT = {
  party: "investor_party",
  capital: "investor_capital",
  grade: "investor_grade",
  lot: "investor_lot",
  production: "investor_production",
  settlement: "investor_settlement",
} as const;

/**
 * Two ways a share is agreed, and the system has to hold both.
 *
 * `per_unit` pays a fixed rate on every unit produced — 2 rupees a kilogram of
 * low grade, 6 of high. `percentage` pays an agreed slice of whatever profit
 * the business made in the period. Most arrangements in this market are one or
 * the other, and a settlement engine written for only the first cannot be bent
 * into the second later without rewriting it.
 */
export type ProfitModel = "per_unit" | "percentage";

export type Party = {
  id: string;
  name: string;
  business: string;
  cycleDays: number;
  profitModel: ProfitModel;
  sharePercent: number;
  unit: string;
  status: string;
};

export type CapitalEntry = {
  id: string;
  partyId: string;
  date: string;
  kind: "invest" | "withdraw";
  amount: number;
  note: string;
};

export type RatePoint = { rate: number; from: string };

export type Grade = {
  id: string;
  partyId: string;
  name: string;
  rate: number;
  unit: string;
  sortOrder: number;
  history: RatePoint[];
  status: string;
};

/**
 * A batch of raw material the factory took in against this investor's money.
 *
 * The investor buys nothing and owns nothing, so this is not a stock ledger.
 * It is the other half of a sentence he could only half read: he already sees
 * that 9,400 kg came out and what his share of it was, but not that it came
 * out of 25,00,000 of material weighing 10,000 kg. Production lines point back
 * at a lot, and the two halves finally read as one.
 */
export type Lot = {
  id: string;
  partyId: string;
  date: string;
  lotNo: string;
  /** What was lifted — jersey, pillow waste, whatever the mill calls it. */
  material: string;
  /** What that material cost. */
  value: number;
  /** Weight taken in, in the party's unit. */
  qty: number;
  note: string;
  status: string;
};

export type ProductionLine = {
  id: string;
  partyId: string;
  date: string;
  gradeId: string;
  gradeName: string;
  qty: number;
  /** The rate as it stood on the day of production, frozen onto the line. */
  rate: number;
  /** Period profit of the business — only used by the percentage model. */
  baseProfit: number;
  amount: number;
  /**
   * The material batch this output came out of. Blank on every line entered
   * before lots existed, and blank stays legal — the share is still correct
   * without it, the line just cannot be traced back to a purchase.
   */
  lotId: string;
  settlementId: string;
};

export type Settlement = {
  id: string;
  partyId: string;
  cycleNo: number;
  fromDate: string;
  toDate: string;
  totalQty: number;
  profitDue: number;
  openingBalance: number;
  cashReceived: number;
  closingBalance: number;
  settledOn: string;
  status: string;
};

// ── mappers ──────────────────────────────────────────────────

const str = (v: unknown, fallback = "") => (v === null || v === undefined ? fallback : String(v));
const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const day = (v: unknown) => str(v).slice(0, 10);

export function mapParty(r: BusinessRecord): Party {
  const model = str(r.data?.profitModel, "per_unit");
  return {
    id: r.id,
    name: r.title,
    business: str(r.data?.business),
    cycleDays: num(r.data?.cycleDays, 10),
    profitModel: model === "percentage" ? "percentage" : "per_unit",
    sharePercent: num(r.data?.sharePercent),
    unit: str(r.data?.unit, "kg"),
    status: r.status || "active",
  };
}

export function mapCapital(r: BusinessRecord): CapitalEntry {
  return {
    id: r.id,
    partyId: str(r.refId),
    date: day(r.date),
    kind: str(r.data?.kind, "invest") === "withdraw" ? "withdraw" : "invest",
    amount: num(r.amount),
    note: r.title,
  };
}

export function mapGrade(r: BusinessRecord): Grade {
  const raw = Array.isArray(r.data?.history) ? (r.data.history as unknown[]) : [];
  const history = raw
    .map((h) => {
      const row = (h ?? {}) as Record<string, unknown>;
      return { rate: num(row.rate), from: day(row.from) };
    })
    .filter((h) => h.from)
    .sort((a, b) => (a.from < b.from ? 1 : -1));
  return {
    id: r.id,
    partyId: str(r.refId),
    name: r.title,
    rate: num(r.amount),
    unit: str(r.data?.unit, "kg"),
    sortOrder: num(r.data?.sortOrder),
    history,
    status: r.status || "active",
  };
}

export function mapProduction(r: BusinessRecord): ProductionLine {
  return {
    id: r.id,
    partyId: str(r.refId),
    date: day(r.date),
    gradeId: str(r.data?.gradeId),
    gradeName: r.title,
    qty: num(r.data?.qty),
    rate: num(r.data?.rate),
    baseProfit: num(r.data?.baseProfit),
    amount: num(r.amount),
    settlementId: str(r.data?.settlementId),
  };
}

export function mapSettlement(r: BusinessRecord): Settlement {
  return {
    id: r.id,
    partyId: str(r.refId),
    cycleNo: num(r.data?.cycleNo),
    fromDate: day(r.data?.fromDate),
    toDate: day(r.data?.toDate),
    totalQty: num(r.data?.totalQty),
    profitDue: num(r.amount),
    openingBalance: num(r.data?.openingBalance),
    cashReceived: num(r.data?.cashReceived),
    closingBalance: num(r.data?.closingBalance),
    settledOn: day(r.date),
    status: r.status || "closed",
  };
}

// ── domain rules ─────────────────────────────────────────────

/**
 * The rate a grade carried on a given day.
 *
 * Rates move. When one does, every settlement already handed over has to keep
 * the number it was actually paid on, so the rate is looked up by date here and
 * then copied onto the production line — the line never reads the grade again.
 * Change a rate a year later and last March still reads as last March.
 */
export function rateOn(grade: Grade | undefined, dateISO: string): number {
  if (!grade) return 0;
  const on = dateISO.slice(0, 10);
  for (const point of grade.history) {
    if (point.from <= on) return point.rate;
  }
  // Production dated before the earliest rate the grade ever had. Falling back
  // to today's rate would quietly invent a number, so it stays zero and shows
  // up as an unpriced line the user has to look at.
  return grade.history.length ? 0 : grade.rate;
}

export function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

/** What a production line is worth to the investor under this party's terms. */
export function lineAmount(party: Party | undefined, qty: number, rate: number, baseProfit: number): number {
  if (party?.profitModel === "percentage") {
    return round2((baseProfit * (party.sharePercent || 0)) / 100);
  }
  return round2(qty * rate);
}

export function capitalTotals(entries: CapitalEntry[]) {
  let invested = 0;
  let withdrawn = 0;
  let firstDate = "";
  for (const e of entries) {
    if (e.kind === "withdraw") withdrawn += e.amount;
    else {
      invested += e.amount;
      if (!firstDate || (e.date && e.date < firstDate)) firstDate = e.date;
    }
  }
  return {
    invested: round2(invested),
    withdrawn: round2(withdrawn),
    net: round2(invested - withdrawn),
    firstDate,
  };
}

export function daysBetween(fromISO: string, toISO: string): number {
  if (!fromISO || !toISO) return 0;
  const a = new Date(fromISO + "T00:00:00Z").getTime();
  const b = new Date(toISO + "T00:00:00Z").getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

/**
 * Return on the money actually at risk.
 *
 * This is the number the whole module exists to produce: not what the factory
 * earned, but what the investor earned on his own capital, at a rate he can
 * hold against a bank deposit or a plot of land. Annualising is deliberately
 * the simple scaling rather than a compounded figure — over the months these
 * arrangements run, compounding would imply a precision the inputs do not have.
 */
export function returnSummary(net: number, profit: number, firstDate: string, asOf: string) {
  const days = daysBetween(firstDate, asOf);
  const returnPct = net > 0 ? round2((profit / net) * 100) : 0;
  const annualPct = net > 0 && days >= 1 ? round2(returnPct * (365 / days)) : 0;
  return { days, returnPct, annualPct };
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthKey(dateISO: string): string {
  return dateISO.slice(0, 7);
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const name = MONTH_NAMES[Number(m) - 1];
  return name ? name + " " + y : key;
}

export function fmtMoney(n: number): string {
  return round2(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtQty(n: number): string {
  return round2(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** DD-MM-YYYY, the only date format this project shows a user. */
export function fmtDate(iso: string): string {
  if (!iso || iso.length < 10) return "-";
  const parts = iso.slice(0, 10).split("-");
  const [y, m, d] = parts;
  return d && m && y ? d + "-" + m + "-" + y : "-";
}
