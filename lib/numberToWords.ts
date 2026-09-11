/**
 * International-scale (thousand / million / billion) amount-in-words, for
 * the FBR-format sales tax invoice — "One million five hundred thirty-four
 * thousand Only." is the wording FBR's own gateway and this trade's clients
 * expect, distinct from the crore/lakh wording purchase-invoice already uses
 * for its own (Indian-subcontinent-style) print.
 */
export function amountToWordsInternational(n: number): string {
  const units = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

  function say(x: number): string {
    if (x === 0) return "";
    if (x < 20) return units[x];
    // Hyphenated, because that is how the printed invoice this matches reads:
    // "five hundred thirty-four thousand", not "thirty four".
    if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? "-" + units[x % 10] : "");
    return units[Math.floor(x / 100)] + " hundred" + (x % 100 ? " " + say(x % 100) : "");
  }

  // The trailing full stop belongs here rather than in the template: the line
  // reads "Amount: … Only." on the printed invoice this matches, and the
  // template renders the string as given.
  if (n <= 0) return "Zero Only.";
  const whole = Math.floor(n);
  const parts: string[] = [];
  const billion = Math.floor(whole / 1_000_000_000); if (billion) parts.push(say(billion) + " billion");
  const million = Math.floor((whole % 1_000_000_000) / 1_000_000); if (million) parts.push(say(million) + " million");
  const thousand = Math.floor((whole % 1_000_000) / 1000); if (thousand) parts.push(say(thousand) + " thousand");
  const remainder = whole % 1000; if (remainder) parts.push(say(remainder));

  const words = parts.join(" ") || "zero";
  return (words.charAt(0).toUpperCase() + words.slice(1)) + " Only.";
}
