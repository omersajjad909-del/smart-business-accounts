/**
 * What a line on a trip reads as.
 *
 * These live away from the page because a title is a rule, not a rendering: a
 * flight sold as one return ticket reads differently from the same two legs
 * bought separately, and a room reads by its nights and its beds. Getting that
 * wrong bills a customer for a journey they are not taking, so it is worth
 * being able to test it without a browser.
 */

/** How long a stay is quoted. Nights for a hotel, days for most tour desks. */
export const STAY_UNITS = ["Nights", "Days"];

/**
 * How a room is shared, which is how an Umrah package is priced: four to a
 * room is a different product from two, at a different rate.
 */
export const ROOM_TYPES = ["Single", "Double", "Triple", "Quad", "Quint", "Sharing"];

/** "FSD → JED" for one leg, "FSD → JED → FSD" for a return on one ticket. */
export function sectorTitle(from?: string, to?: string, roundTrip?: boolean): string {
  if (!from || !to) return "";
  return roundTrip ? `${from} → ${to} → ${from}` : `${from} → ${to}`;
}

/**
 * Whether a flight line still carries the whole journey.
 *
 * It does until the return is split onto its own line — at which point calling
 * the outbound "LYP → JED → LYP" would describe the way home twice, on two
 * lines, each with its own price.
 */
export function isRoundTrip(leg: string | undefined, returnDate: string): boolean {
  return Boolean(returnDate) && !leg;
}

/** "4 nights · Triple" — how a room reads on the invoice. */
export function stayTitle(nights?: number, unit?: string, roomType?: string): string {
  const count = Number(nights) || 0;
  const word = (unit || STAY_UNITS[0]).toLowerCase();
  // One night is a night, not one nights.
  const stay = count ? `${count} ${count === 1 ? word.replace(/s$/, "") : word}` : "";
  return [stay, roomType].filter(Boolean).join(" · ");
}
