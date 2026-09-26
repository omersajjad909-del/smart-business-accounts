/**
 * Marketing pages that have a designed light theme.
 *
 * The marketing site was written for a dark page. A page joins this list once
 * its components go through scripts/theme-codemod.cjs and get a light-mode
 * pass by eye. Every other marketing page stays dark even when the visitor has
 * picked light (MarketingThemeScope wraps it in `.mk-force-dark`), and the
 * navbar hides the theme toggle there, since it would change nothing visible.
 */
const LIGHT_READY_PATHS = new Set(["/", "/landing"]);

export function isLightReadyPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return LIGHT_READY_PATHS.has(p);
}
