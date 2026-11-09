/**
 * Companies whose printed documents drop the "Powered by Finova OS" mark.
 *
 * Deliberately a code-side list, not an Admin Control switch: a company must
 * not be able to turn the mark off for itself. Names are compared with case,
 * spacing and punctuation ignored ("T.A Poly Bags" == "ta polybags").
 */
const WHITE_LABEL_COMPANIES = ["T.A Poly Bags"];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function isWhiteLabelCompany(name?: string | null): boolean {
  if (!name) return false;
  const n = norm(name);
  return WHITE_LABEL_COMPANIES.some((c) => norm(c) === n);
}
