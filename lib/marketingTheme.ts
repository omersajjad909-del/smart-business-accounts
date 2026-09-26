/**
 * Marketing pages that stay dark even when the visitor has picked light.
 *
 * The marketing site was written for a dark page; scripts/theme-codemod.cjs
 * moved its colours onto theme variables and every page now has a light pass.
 * A page that turns out not to work in light can be listed here as a stopgap:
 * MarketingThemeScope wraps it in `.mk-force-dark`, which puts every theme
 * variable back to its dark value, and the navbar hides the theme toggle there.
 * Entries match the path and everything under it.
 */
const DARK_ONLY_PATHS: string[] = [];

export function isLightReadyPath(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return !DARK_ONLY_PATHS.some((d) => p === d || p.startsWith(d + "/"));
}
