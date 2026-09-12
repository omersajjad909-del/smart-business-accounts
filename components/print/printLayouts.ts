/**
 * The designs a document can be printed in.
 *
 * The four templates that came before this changed the ink and nothing else —
 * same letterhead, same particulars box, same ruled grid, same signatures, in a
 * different colour. That was a deliberate choice at the time: an operator who
 * has learned where the PHR column sits should not have to learn it again
 * because the office changed its taste.
 *
 * It is still true of the *grid*. What it was wrong about is everything around
 * the grid. A purchase order that looks like a sales invoice with a different
 * grey is not a different document, and picking one from a dropdown of four
 * words told nobody anything. So a design now names a structure, and the
 * structure is what the settings screen previews.
 *
 * Five axes, chosen because they are what actually changes the shape of a
 * business document on A4 — and small enough that one component can render all
 * of them without becoming six components that drift:
 *
 *   header      where the letterhead and the document's name sit
 *   party       how the other side's details are presented
 *   grid        how the line items are ruled
 *   totals      how the closing figure is set
 *   signatures  how many lines, and where
 *
 * The ink still comes from ./printTemplates.ts, so a design is a structure plus
 * a palette rather than a fresh stylesheet each time.
 */

import type { PrintTemplateId } from "./printTemplates";

export type PrintDesignId =
  | "classic_ledger"
  | "formal_gst"
  | "modern_band"
  | "clean_minimal"
  | "compact_dense"
  | "bold_statement";

export type HeaderStyle =
  /** Company left, document name right, on one line. */
  | "split"
  /** A filled band across the top of the sheet. */
  | "band"
  /** Company centred, document name below it between two rules. */
  | "centered"
  /** Logo and company stacked left, document name large across the width. */
  | "stacked";

export type PartyStyle =
  /** One line inside the particulars box, as a labelled field. */
  | "inline"
  /** Two boxes side by side — the other side on the left, the document's own particulars on the right. */
  | "cards"
  /** Above the particulars, unboxed, the way a letter opens. */
  | "letter";

export type GridStyle =
  /** Every cell boxed. The ledger bill. */
  | "ruled"
  /** Horizontal rules only — no vertical lines between columns. */
  | "rows"
  /** Alternating row fills, no rules inside the body. */
  | "zebra"
  /** A rule under the headings and one above the totals. Nothing else. */
  | "open";

export type TotalsStyle =
  /** Right-aligned figures, the net ruled off. */
  | "right"
  /** The whole block inside a box. */
  | "boxed"
  /** The net figure in a filled bar across the totals column. */
  | "bar";

export type SignatureStyle =
  /** Three lines across the foot. */
  | "three"
  /** Two lines, right half only. */
  | "two_right"
  /** One line, right. */
  | "one_right";

export type PrintDesign = {
  id: PrintDesignId;
  label: string;
  /** One line, shown under the name in the picker. Says what is different. */
  blurb: string;
  header: HeaderStyle;
  party: PartyStyle;
  grid: GridStyle;
  totals: TotalsStyle;
  signatures: SignatureStyle;
  /** Palette, from ./printTemplates.ts. */
  ink: PrintTemplateId;
  /** Row padding override — a dense design fits more lines on the sheet. */
  density: "normal" | "tight";
  /**
   * Rough lines per A4 sheet at this density. Shown in the picker because for
   * a long order this is the whole decision, and it is otherwise invisible
   * until somebody prints a 60-line bill and gets three pages.
   */
  linesPerPage: number;
};

export const PRINT_DESIGNS: PrintDesign[] = [
  {
    id: "classic_ledger",
    label: "Classic Ledger",
    blurb: "Black on white, every cell ruled. What this trade already prints.",
    header: "split", party: "inline", grid: "ruled", totals: "right", signatures: "three",
    ink: "classic", density: "normal", linesPerPage: 24,
  },
  {
    id: "formal_gst",
    label: "Formal Tax Invoice",
    blurb: "Centred letterhead, both parties boxed side by side, totals in a box.",
    header: "centered", party: "cards", grid: "ruled", totals: "boxed", signatures: "three",
    ink: "classic", density: "normal", linesPerPage: 20,
  },
  {
    id: "modern_band",
    label: "Modern Band",
    blurb: "Colour band across the head, open rows, net figure in a filled bar.",
    header: "band", party: "cards", grid: "rows", totals: "bar", signatures: "two_right",
    ink: "modern", density: "normal", linesPerPage: 22,
  },
  {
    id: "clean_minimal",
    label: "Clean Minimal",
    blurb: "Hairlines only, party details as a letter opening, no signature block clutter.",
    header: "split", party: "letter", grid: "open", totals: "right", signatures: "one_right",
    ink: "minimal", density: "normal", linesPerPage: 26,
  },
  {
    id: "compact_dense",
    label: "Compact",
    blurb: "Tight rows for long orders — the most lines that fit on one sheet.",
    header: "split", party: "inline", grid: "rows", totals: "right", signatures: "two_right",
    ink: "minimal", density: "tight", linesPerPage: 34,
  },
  {
    id: "bold_statement",
    label: "Bold Statement",
    blurb: "Large document name across the head, striped rows, filled net bar.",
    header: "stacked", party: "cards", grid: "zebra", totals: "bar", signatures: "three",
    ink: "bold", density: "normal", linesPerPage: 21,
  },
];

const BY_ID = new Map(PRINT_DESIGNS.map((d) => [d.id, d]));

export function printDesign(id: string | undefined | null): PrintDesign {
  return BY_ID.get(String(id || "") as PrintDesignId) ?? PRINT_DESIGNS[0];
}
