/**
 * Theme policy.
 *
 * Dark is the default for everyone, and it does not follow the operating
 * system. `enableSystem` used to be on, so a visitor whose OS was set to light
 * got the light palette on first load even though dark is the intended look —
 * which is why the app opened white for most people.
 *
 * Light mode itself still works and the header toggle still switches to it; it
 * is simply never the starting point. Once a user picks a theme, next-themes
 * remembers it.
 */

/**
 * The header toggle and the Appearance selector are available.
 *
 * Most of this app styles itself with inline `style={{…}}` objects written for
 * a dark page. scripts/theme-codemod.cjs moved those literal colours onto CSS
 * variables (see "Light theme repaint" in app/globals.css) that resolve to the
 * original colours in dark mode and to a white/black palette in light mode.
 * New screens should use the variables rather than literal colours, or they
 * will only look right in dark.
 */
export const ALLOW_LIGHT_THEME = true;

/** What a user sees before they have chosen anything. */
export const DEFAULT_THEME = "dark" as const;

/**
 * Whether the OS preference decides the starting theme.
 *
 * Off on purpose: DEFAULT_THEME should mean the same thing on every machine.
 */
export const FOLLOW_SYSTEM_THEME = false;
