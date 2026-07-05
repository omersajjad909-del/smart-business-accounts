// Preset brand palette. Only these keys are valid for Company.brandColor.
// Each key maps to the CSS variable values the layout applies at runtime.

export type BrandKey =
  | "teal"
  | "indigo"
  | "purple"
  | "blue"
  | "green"
  | "orange"
  | "rose"
  | "slate";

export type BrandPreset = {
  key: BrandKey;
  label: string;
  accent: string;         // main accent (buttons, active states)
  accentStrong: string;   // hover / pressed
  accentSoft: string;     // rgba tint for backgrounds
  accentRgb: string;      // raw "R, G, B" for use in rgba(var(--accent-rgb), alpha)
};

export const BRAND_PRESETS: Record<BrandKey, BrandPreset> = {
  teal: {
    key: "teal",
    label: "Teal (default)",
    accent: "#0d9488",
    accentStrong: "#0f766e",
    accentSoft: "rgba(13, 148, 136, 0.1)",
    accentRgb: "13, 148, 136",
  },
  indigo: {
    key: "indigo",
    label: "Indigo",
    accent: "#4f46e5",
    accentStrong: "#4338ca",
    accentSoft: "rgba(79, 70, 229, 0.1)",
    accentRgb: "79, 70, 229",
  },
  purple: {
    key: "purple",
    label: "Purple",
    accent: "#7c3aed",
    accentStrong: "#6d28d9",
    accentSoft: "rgba(124, 58, 237, 0.1)",
    accentRgb: "124, 58, 237",
  },
  blue: {
    key: "blue",
    label: "Blue",
    accent: "#2563eb",
    accentStrong: "#1d4ed8",
    accentSoft: "rgba(37, 99, 235, 0.1)",
    accentRgb: "37, 99, 235",
  },
  green: {
    key: "green",
    label: "Green",
    accent: "#16a34a",
    accentStrong: "#15803d",
    accentSoft: "rgba(22, 163, 74, 0.1)",
    accentRgb: "22, 163, 74",
  },
  orange: {
    key: "orange",
    label: "Orange",
    accent: "#ea580c",
    accentStrong: "#c2410c",
    accentSoft: "rgba(234, 88, 12, 0.1)",
    accentRgb: "234, 88, 12",
  },
  rose: {
    key: "rose",
    label: "Rose",
    accent: "#e11d48",
    accentStrong: "#be123c",
    accentSoft: "rgba(225, 29, 72, 0.1)",
    accentRgb: "225, 29, 72",
  },
  slate: {
    key: "slate",
    label: "Slate",
    accent: "#475569",
    accentStrong: "#334155",
    accentSoft: "rgba(71, 85, 105, 0.1)",
    accentRgb: "71, 85, 105",
  },
};

export const BRAND_ORDER: BrandKey[] = [
  "teal", "indigo", "purple", "blue", "green", "orange", "rose", "slate",
];

export function getBrandPreset(key?: string | null): BrandPreset {
  if (!key) return BRAND_PRESETS.teal;
  const k = key as BrandKey;
  return BRAND_PRESETS[k] || BRAND_PRESETS.teal;
}

export function isValidBrandKey(key: unknown): key is BrandKey {
  return typeof key === "string" && key in BRAND_PRESETS;
}
