// FILE: lib/partyVocabulary.ts
//
// What a trade calls the people on either side of its ledger.
//
// Every business has parties who owe it money and parties it owes money to, and
// accounting has exactly two words for them: customer and supplier. A travel
// agency has neither. It has pilgrims, sub-agents, airlines, consolidators,
// embassies and Saudi hotels — and being asked to file an embassy as a
// "supplier" is the moment the software stops sounding like it was built for
// this trade.
//
// So the words change and the accounting does not. Every entry here resolves to
// CUSTOMER or SUPPLIER, which is what the ledger, the ageing report and every
// statement already run on. Nothing downstream learns a new party type; the
// operator simply stops being asked a question in somebody else's vocabulary.
//
// A trade with no entry falls back to Customer and Supplier, which is right for
// most of them — a trading company really does have customers.

export type PartySide = "CUSTOMER" | "SUPPLIER";

export type PartyOption = {
  /** What the operator picks. */
  label: string;
  /** What it is stored as. Only ever one of two. */
  side: PartySide;
  /** Which chart head it belongs under, where the trade seeds one. */
  hint?: string;
};

const DEFAULT_PARTIES: PartyOption[] = [
  { label: "Customer", side: "CUSTOMER" },
  { label: "Supplier", side: "SUPPLIER" },
];

const BY_BUSINESS: Record<string, PartyOption[]> = {
  travel: [
    { label: "Pilgrim / Passenger", side: "CUSTOMER", hint: "Pilgrims & Passengers" },
    { label: "Sub-Agent", side: "CUSTOMER", hint: "Sub-Agents" },
    { label: "Corporate Client", side: "CUSTOMER", hint: "Customer Receivables" },
    { label: "Airline / Consolidator", side: "SUPPLIER", hint: "Airlines & Consolidators" },
    /* "Hotel", not "Saudi Hotel". The same agency that runs Hajj also books
       Dubai in December and Istanbul in summer, and a payable to a hotel is a
       payable to a hotel — naming the head after one country meant every hotel
       outside it landed somewhere it did not belong. */
    { label: "Hotel", side: "SUPPLIER", hint: "Hotels" },
    { label: "Visa Agent / Embassy", side: "SUPPLIER", hint: "Visa Agents & Embassies" },
    { label: "Ground Transport", side: "SUPPLIER", hint: "Ground Transport" },
  ],
};

/** The party words this trade uses, or the plain two. */
export function partyOptions(businessType: string): PartyOption[] {
  return BY_BUSINESS[String(businessType || "").trim()] || DEFAULT_PARTIES;
}

/**
 * Whether this trade renames its parties at all.
 *
 * Used to decide between showing one "Customer / Supplier" pair and showing the
 * trade's own list — there is no point replacing "Customer" with "Customer".
 */
export function hasPartyVocabulary(businessType: string): boolean {
  return Boolean(BY_BUSINESS[String(businessType || "").trim()]);
}

/**
 * The side a chosen label stores as.
 *
 * Falls back to CUSTOMER for an unknown label rather than throwing: a stale tab
 * posting an option that has since been renamed should file the account
 * somewhere sane, not fail at the point of saving it.
 */
export function partySideFor(businessType: string, label: string): PartySide {
  const found = partyOptions(businessType).find((p) => p.label === label);
  return found?.side ?? "CUSTOMER";
}
