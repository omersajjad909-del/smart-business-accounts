/**
 * The looks a travel agency's invoice can wear.
 *
 * The six general designs in ./printLayouts.ts are built for a trading bill —
 * Item, Qty, Rate — and a flight ticket does not read well on one: the sector
 * and the PNR, which are the first things a passenger checks, end up as small
 * print in a particulars box. These put the journey where the eye lands first.
 *
 * Seven, because an agency's invoice is also its brochure: the one a corporate
 * client forwards to accounts is not the one a family gets on WhatsApp.
 *
 * Structure is described the same way printLayouts does it — a few axes a single
 * renderer (./TravelInvoiceSheet.tsx) understands — so adding an eighth is a
 * record here, not a new component.
 */

export type TravelDesignId =
  | "travel_classic"
  | "travel_voyager"
  | "travel_boarding"
  | "travel_sunset"
  | "travel_skyline"
  | "travel_minimal"
  | "travel_emerald";

export type TravelHeader =
  /** Company left, document name right, ruled underneath. */
  | "split"
  /** Company centred between two rules. */
  | "centered"
  /** A filled band across the head carrying the company and the document name. */
  | "band"
  /** A tinted block with a rounded lower edge. */
  | "soft"
  /** The company in a narrow filled column down the left of the sheet. */
  | "side";

export type TravelRoute =
  /** The sector as a single line of particulars. */
  | "inline"
  /** Big airport codes with a flight path between them. */
  | "hero"
  /** A boarding-pass card: codes, a perforated edge and a stub. */
  | "ticket";

export type TravelGrid = "ruled" | "rows" | "zebra" | "open" | "pills";
export type TravelTotals = "plain" | "box" | "bar";

export type TravelDesign = {
  id: TravelDesignId;
  label: string;
  blurb: string;
  header: TravelHeader;
  route: TravelRoute;
  grid: TravelGrid;
  totals: TravelTotals;
  /** Main colour: bands, bars, table headings. */
  accent: string;
  /** Text on top of the accent. */
  onAccent: string;
  /** A pale wash of the accent: card backgrounds, zebra rows. */
  tint: string;
  ink: string;
  muted: string;
  rule: string;
  /** What a sheet of it costs a black-and-white laser. */
  toner: "low" | "medium" | "colour";
};

export const TRAVEL_DESIGNS: TravelDesign[] = [
  {
    id: "travel_classic",
    label: "Classic Agency",
    blurb: "Black on white, ruled grid, sector in the particulars. Cheapest to print.",
    header: "centered", route: "inline", grid: "ruled", totals: "box",
    accent: "#111111", onAccent: "#ffffff", tint: "#f4f4f4", ink: "#111111", muted: "#555555", rule: "#222222",
    toner: "low",
  },
  {
    id: "travel_voyager",
    label: "Voyager",
    blurb: "Teal band, big airport codes with a flight path, striped passenger list.",
    header: "band", route: "hero", grid: "zebra", totals: "bar",
    accent: "#0f766e", onAccent: "#ffffff", tint: "#ecf7f5", ink: "#13302d", muted: "#5b7a76", rule: "#cfe3df",
    toner: "colour",
  },
  {
    id: "travel_boarding",
    label: "Boarding Pass",
    blurb: "The journey as a boarding-pass card with a perforated stub, then the fares.",
    header: "split", route: "ticket", grid: "rows", totals: "box",
    accent: "#1e3a5f", onAccent: "#ffffff", tint: "#eef3f9", ink: "#14233a", muted: "#5f7088", rule: "#c9d5e4",
    toner: "colour",
  },
  {
    id: "travel_sunset",
    label: "Sunset",
    blurb: "Warm sand and terracotta, soft rounded header, rounded passenger rows.",
    header: "soft", route: "hero", grid: "pills", totals: "bar",
    accent: "#c2410c", onAccent: "#ffffff", tint: "#fdf1e7", ink: "#3a2314", muted: "#8a6a55", rule: "#ecd5c0",
    toner: "colour",
  },
  {
    id: "travel_skyline",
    label: "Skyline",
    blurb: "Dark sidebar for the company and booking details, wide clean table beside it.",
    header: "side", route: "hero", grid: "open", totals: "plain",
    accent: "#1f2933", onAccent: "#ffffff", tint: "#f3f5f7", ink: "#1f2933", muted: "#697586", rule: "#d5dbe2",
    toner: "medium",
  },
  {
    id: "travel_minimal",
    label: "Minimal Air",
    blurb: "Hairlines and white space. The sector set large, nothing else shouting.",
    header: "split", route: "hero", grid: "open", totals: "plain",
    accent: "#111111", onAccent: "#ffffff", tint: "#fafafa", ink: "#111111", muted: "#7a7a7a", rule: "#dddddd",
    toner: "low",
  },
  {
    id: "travel_emerald",
    label: "Emerald Statement",
    blurb: "Deep green letterhead, boxed route strip, ruled rows and a filled total.",
    header: "band", route: "inline", grid: "rows", totals: "bar",
    accent: "#14532d", onAccent: "#ffffff", tint: "#eef6f0", ink: "#12281a", muted: "#58705f", rule: "#c8dccd",
    toner: "colour",
  },
];

export const TRAVEL_DESIGN_IDS = new Set<string>(TRAVEL_DESIGNS.map((d) => d.id));

export function isTravelDesign(id: unknown): id is TravelDesignId {
  return typeof id === "string" && TRAVEL_DESIGN_IDS.has(id);
}

/**
 * A travel invoice asked for a design it does not have — the company's base is
 * "classic_ledger", say — gets Voyager rather than a trading bill. Nobody has
 * to pick a travel design for the invoice to look like a travel invoice.
 */
export function travelDesign(id: unknown): TravelDesign {
  return TRAVEL_DESIGNS.find((d) => d.id === id) ?? TRAVEL_DESIGNS[1];
}
