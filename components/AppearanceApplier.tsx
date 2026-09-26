"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { BRAND_PRESETS, type BrandKey } from "@/lib/brandPalette";
import { ALLOW_LIGHT_THEME } from "@/lib/themeConfig";

type PrefsResponse = {
  themeMode?: "light" | "dark" | "auto";
  density?:   "compact" | "comfortable";
  sidebarDefault?: "expanded" | "collapsed";
};

type CompanyResponse = {
  brandColor?: BrandKey;
  logoUrl?:    string | null;
  name?:       string;
};

/**
 * Silently applies the current user's personal preferences and the
 * active company's branding to the document as soon as the dashboard
 * mounts. Renders nothing.
 *
 * Non-blocking: any fetch failure just leaves the built-in defaults
 * in place, so this can never break the dashboard.
 */
export default function AppearanceApplier() {
  const { setTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;
    const root = document.documentElement;

    // The theme itself belongs to next-themes (the header toggle and the
    // Appearance page both go through it); this only carries a saved choice
    // across devices. "auto" is what the API returns for someone who never
    // chose, and it means "leave the default" — dark — not "follow the OS".
    const applyThemeMode = (mode: "light" | "dark" | "auto") => {
      if (!ALLOW_LIGHT_THEME) return;
      if (mode === "light" || mode === "dark") setTheme(mode);
    };

    (async () => {
      try {
        const [uRes, cRes] = await Promise.all([
          fetch("/api/preferences/user", { cache: "no-store" }),
          fetch("/api/preferences/company", { cache: "no-store" }),
        ]);

        if (!cancelled && uRes.ok) {
          const p: PrefsResponse = await uRes.json();
          if (p.themeMode) applyThemeMode(p.themeMode);
          if (p.density) root.setAttribute("data-density", p.density);
          if (p.sidebarDefault) root.setAttribute("data-sidebar-default", p.sidebarDefault);
        }

        if (!cancelled && cRes.ok) {
          const c: CompanyResponse = await cRes.json();
          const key = c.brandColor && BRAND_PRESETS[c.brandColor] ? c.brandColor : "teal";
          const p = BRAND_PRESETS[key];
          root.style.setProperty("--accent", p.accent);
          root.style.setProperty("--accent-strong", p.accentStrong);
          root.style.setProperty("--accent-soft", p.accentSoft);
          root.style.setProperty("--accent-rgb", p.accentRgb);
        }
      } catch {
        // silent — defaults remain
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setTheme]);

  return null;
}
