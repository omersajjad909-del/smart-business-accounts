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
 * Off until the light palette is finished. Most of this app styles itself with
 * inline `style={{…}}` objects carrying literal dark colours — white text,
 * `rgba(255,255,255,.05)` panels, dark gradients — and those cannot respond to
 * a theme class. On a light background the result is unusable rather than
 * merely ugly: whole buttons render white-on-white and disappear.
 *
 * Turning this back on is a real piece of work, not a flag flip. Every screen
 * has to move from literal colours onto the CSS variables in globals.css. Until
 * that is done, dark is the only palette the product actually has.
 */
export const ALLOW_LIGHT_THEME = false;

/** What a user sees before they have chosen anything. */
export const DEFAULT_THEME = "dark" as const;

/**
 * Whether the OS preference decides the starting theme.
 *
 * Off on purpose: DEFAULT_THEME should mean the same thing on every machine.
 */
export const FOLLOW_SYSTEM_THEME = false;
