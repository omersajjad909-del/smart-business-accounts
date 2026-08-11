/**
 * Single switch for light mode.
 *
 * The app ships dark-only while the light palette is unfinished — several
 * dashboard surfaces still hardcode light-on-dark colours, so anything that
 * removed the `dark` class produced an unreadable page. Rather than deleting
 * the light code paths, every place that could turn light off reads this flag,
 * so bringing it back is a one-line change plus whatever palette work is left.
 *
 * Flipping this to `true` re-enables:
 *   • the moon/sun button in the dashboard header  (components/mode-toggle.tsx)
 *   • the Theme selector on Settings → Appearance  (app/dashboard/settings/appearance/page.tsx)
 *   • the saved-preference applier                 (components/AppearanceApplier.tsx)
 *
 * It does NOT undo `forcedTheme="dark"` on the ThemeProvider in app/layout.tsx —
 * that one is deliberately a separate, visible edit, because it is the thing
 * that actually pins the theme.
 */
export const ALLOW_LIGHT_THEME = false;

/** The only theme in use while ALLOW_LIGHT_THEME is false. */
export const FORCED_THEME = "dark" as const;
