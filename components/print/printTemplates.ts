/**
 * The looks a printed document can be given.
 *
 * A company picks one in Admin → Print & Branding and every document it
 * prints wears it. The choice was already in the settings screen long before
 * it did anything — this is the file that makes the dropdown mean something.
 *
 * The structure of the page never changes between templates: same letterhead,
 * same particulars box, same ruled grid, same counted summary, same totals,
 * same signatures. Only the ink changes. That matters more than it sounds —
 * an operator who has learned where the PHR column sits does not have to
 * learn it again because the office changed its taste.
 *
 * Written mono-first. Most of these bills come out of a black-and-white laser
 * onto plain paper, where a solid fill is toner spent and a hairline is free;
 * `toner` says what each template costs so the settings screen can warn before
 * somebody puts a navy header on ten thousand invoices a year.
 */

export type PrintTemplateId = "classic" | "minimal" | "bold" | "modern";

export type PrintTheme = {
  id: PrintTemplateId;
  /** Body text, and everything not otherwise coloured. */
  ink: string;
  /** Labels, notes, the small print. */
  muted: string;
  /** Every rule and box on the page. */
  rule: string;
  /** Column headings. */
  headBg: string;
  headInk: string;
  /** Every other line item, when the template stripes them. */
  zebra: string | null;
  /** Letterhead treatment: a plain top, or a filled band across it. */
  band: "none" | "solid";
  bandBg: string;
  bandInk: string;
  /** The one figure the customer looks for. */
  netFill: string | null;
  netInk: string;
  /** Corner rounding on the boxes. 0 keeps the old square bill. */
  radius: number;
  /** Where the document's name sits. */
  titleAlign: "left" | "center";
  /** Row padding in the grid — tight bills fit more lines per sheet. */
  cellPad: string;
  /** "Powered by FinovaOS" as plain text, or set in a filled chip. */
  poweredChip: boolean;
};

const THEMES: Record<PrintTemplateId, PrintTheme> = {
  // What this trade already prints: black on white, ruled like a ledger,
  // nothing spent on decoration.
  classic: {
    id: "classic",
    ink: "#111111", muted: "#555555", rule: "#111111",
    headBg: "#f2f2f2", headInk: "#111111",
    zebra: null,
    band: "none", bandBg: "#111111", bandInk: "#ffffff",
    netFill: null, netInk: "#111111",
    radius: 0, titleAlign: "left", cellPad: "3px 5px", poweredChip: false,
  },

  // The same bill with the weight taken out of it: pale rules, air between
  // the lines, and one black bar where the money is.
  minimal: {
    id: "minimal",
    ink: "#111111", muted: "#6b6b6b", rule: "#c9c9c9",
    headBg: "#ffffff", headInk: "#111111",
    zebra: null,
    band: "none", bandBg: "#111111", bandInk: "#ffffff",
    netFill: "#111111", netInk: "#ffffff",
    radius: 6, titleAlign: "center", cellPad: "5px 6px", poweredChip: true,
  },

  // For a company that wants the bill to look like a statement: solid
  // letterhead, reversed column headings, the total in a black bar.
  bold: {
    id: "bold",
    ink: "#111111", muted: "#555555", rule: "#333333",
    headBg: "#111111", headInk: "#ffffff",
    zebra: null,
    band: "solid", bandBg: "#111111", bandInk: "#ffffff",
    netFill: "#111111", netInk: "#ffffff",
    radius: 2, titleAlign: "left", cellPad: "4px 6px", poweredChip: true,
  },

  // Colour, for the copy that is emailed or sent on WhatsApp rather than
  // printed. On a mono printer it comes out as greys — which is why the
  // settings screen says so.
  modern: {
    id: "modern",
    ink: "#16203f", muted: "#5a678c", rule: "#dbe1ee",
    headBg: "#1b2a63", headInk: "#ffffff",
    zebra: "#f5f7fc",
    band: "solid", bandBg: "#1b2a63", bandInk: "#ffffff",
    netFill: "#1b2a63", netInk: "#ffffff",
    radius: 10, titleAlign: "left", cellPad: "6px 7px", poweredChip: false,
  },
};

export const PRINT_TEMPLATES: Array<{
  id: PrintTemplateId;
  name: string;
  summary: string;
  /** What a sheet of it costs a black-and-white laser. */
  toner: "low" | "medium" | "colour";
}> = [
  { id: "classic", name: "Classic", summary: "Ruled ledger bill, black on white. Fits the most lines per page.", toner: "low" },
  { id: "minimal", name: "Minimal", summary: "Lighter rules, more air, the net figure in a black bar.", toner: "low" },
  { id: "bold",    name: "Bold",    summary: "Solid letterhead and reversed column headings.", toner: "medium" },
  { id: "modern",  name: "Modern (colour)", summary: "Navy and rounded — made for the emailed PDF. Prints grey on a mono printer.", toner: "colour" },
];

/** Anything unrecognised — including the older "compact" — lands somewhere sane. */
export function normalizePrintTemplate(value: unknown): PrintTemplateId {
  const id = String(value || "").trim().toLowerCase();
  if (id === "compact") return "minimal";
  return (id in THEMES ? id : "classic") as PrintTemplateId;
}

export function printTheme(id: unknown): PrintTheme {
  return THEMES[normalizePrintTemplate(id)];
}
