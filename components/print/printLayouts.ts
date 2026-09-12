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
 * Six axes, chosen because they are what actually changes the shape of a
 * business document on A4 — and small enough that one component can render all
 * of them without becoming six components that drift:
 *
 *   header      where the letterhead and the document's name sit
 *   party       how the other side's details are presented
 *   grid        how the line items are ruled
 *   totals      how the closing figure is set
 *   signatures  how many lines, and where
 *   footer      how the sheet closes — amount in words, terms, note
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

/**
 * How the sheet closes — the amount in words, the terms, and the note.
 *
 * This was the one part of the page that looked identical in all six designs,
 * which made two otherwise very different documents read the same from the
 * bottom third down. It is also the busiest corner of a bill: the amount
 * spelled out, the terms, the note and the mark all land within a few
 * centimetres of each other, so how they are grouped changes the page as much
 * as the letterhead does.
 */
export type FooterStyle =
  /** Amount and terms as plain lines; note centred in italics. */
  | "centered"
  /** Amount and terms boxed together across the width; note centred under it. */
  | "boxed"
  /** Note reversed out of a filled strip at the very foot of the sheet. */
  | "band"
  /** Amount small and inline, note right-aligned; nothing else. */
  | "quiet"
  /** Note left, mark right, on one ruled line. */
  | "split";

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
  footer: FooterStyle;
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
    blurb: "Black on white, every cell ruled, note centred at the foot. What this trade already prints.",
    header: "split", party: "inline", grid: "ruled", totals: "right", signatures: "three", footer: "centered",
    ink: "classic", density: "normal", linesPerPage: 24,
  },
  {
    id: "formal_gst",
    label: "Formal Tax Invoice",
    blurb: "Centred letterhead, both parties boxed side by side, totals and terms each in a box.",
    header: "centered", party: "cards", grid: "ruled", totals: "boxed", signatures: "three", footer: "boxed",
    ink: "classic", density: "normal", linesPerPage: 20,
  },
  {
    id: "modern_band",
    label: "Modern Band",
    blurb: "Colour band at the head and the foot, open rows, net figure in a filled bar.",
    header: "band", party: "cards", grid: "rows", totals: "bar", signatures: "two_right", footer: "band",
    ink: "modern", density: "normal", linesPerPage: 22,
  },
  {
    id: "clean_minimal",
    label: "Clean Minimal",
    blurb: "Hairlines only, party details as a letter opening, one signature and a quiet foot.",
    header: "split", party: "letter", grid: "open", totals: "right", signatures: "one_right", footer: "quiet",
    ink: "minimal", density: "normal", linesPerPage: 26,
  },
  {
    id: "compact_dense",
    label: "Compact",
    blurb: "Tight rows for long orders — the most lines per sheet, note and mark on one ruled line.",
    header: "split", party: "inline", grid: "rows", totals: "right", signatures: "two_right", footer: "split",
    ink: "minimal", density: "tight", linesPerPage: 34,
  },
  {
    id: "bold_statement",
    label: "Bold Statement",
    blurb: "Large document name across the head, striped rows, filled net bar and closing strip.",
    header: "stacked", party: "cards", grid: "zebra", totals: "bar", signatures: "three", footer: "band",
    ink: "bold", density: "normal", linesPerPage: 21,
  },
];

const BY_ID = new Map(PRINT_DESIGNS.map((d) => [d.id, d]));

export function printDesign(id: string | undefined | null): PrintDesign {
  return BY_ID.get(String(id || "") as PrintDesignId) ?? PRINT_DESIGNS[0];
}
