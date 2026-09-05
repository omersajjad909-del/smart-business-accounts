/**
 * Turns "mujhe Karachi ki 500 trading companies chahiye" into a structured
 * brief the pipeline can execute.
 *
 * The model only ever fills in a fixed set of fields, and every field is
 * re-validated here afterwards — an LLM inventing a country code or asking for
 * 50,000 prospects must not reach the discovery stage.
 */

import { generateProspectingText } from "./ai";
import { ALL_BUSINESS_TYPES } from "@/lib/businessTypes";
import { ALLOWED_OUTREACH_COUNTRIES } from "./icp";
import type { CampaignBrief } from "./types";

const VALID_INDUSTRIES = new Set(ALL_BUSINESS_TYPES.map((t) => t.id));
const MAX_TARGET = 2000;

export const DEFAULT_BRIEF: CampaignBrief = {
  industries: ["trading"],
  countries: ["PK"],
  cities: [],
  employeeMin: null,
  employeeMax: null,
  targetCount: 100,
  language: "en",
  tone: "professional",
  valueAngle: null,
  excludeDomains: [],
};

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.round(n), min), max);
}

function strArray(value: unknown, limit = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

/** Re-validates whatever the model produced against our own vocabularies. */
export function sanitiseBrief(raw: Record<string, unknown>): CampaignBrief {
  const industries = strArray(raw.industries).filter((i) => VALID_INDUSTRIES.has(i));
  const countries = strArray(raw.countries)
    .map((c) => c.toUpperCase())
    .filter((c) => ALLOWED_OUTREACH_COUNTRIES.includes(c));

  const language = ["en", "ur", "roman_ur", "ar"].includes(String(raw.language))
    ? (raw.language as CampaignBrief["language"])
    : "en";

  const tone = ["professional", "friendly", "direct"].includes(String(raw.tone))
    ? (raw.tone as CampaignBrief["tone"])
    : "professional";

  const employeeMin = raw.employeeMin == null ? null : clampInt(raw.employeeMin, 1, 100000, 1);
  const employeeMaxRaw = raw.employeeMax == null ? null : clampInt(raw.employeeMax, 1, 100000, 100000);
  // A min above the max would silently match nothing at the discovery stage.
  const employeeMax =
    employeeMin != null && employeeMaxRaw != null && employeeMaxRaw < employeeMin
      ? employeeMin
      : employeeMaxRaw;

  return {
    industries: industries.length ? industries : DEFAULT_BRIEF.industries,
    countries: countries.length ? countries : DEFAULT_BRIEF.countries,
    cities: strArray(raw.cities, 12),
    employeeMin,
    employeeMax,
    targetCount: clampInt(raw.targetCount, 1, MAX_TARGET, DEFAULT_BRIEF.targetCount),
    language,
    tone,
    valueAngle: raw.valueAngle ? String(raw.valueAngle).slice(0, 240) : null,
    excludeDomains: strArray(raw.excludeDomains, 50).map((d) =>
      d.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, ""),
    ),
  };
}

/**
 * Best-effort parse without the model, so a missing API key degrades into a
 * usable campaign instead of an error page.
 */
export function parseBriefLocally(command: string): CampaignBrief {
  const lower = command.toLowerCase();
  const brief: CampaignBrief = { ...DEFAULT_BRIEF, cities: [], industries: [], countries: [] };

  for (const type of ALL_BUSINESS_TYPES) {
    const needle = type.label.toLowerCase().split(" / ")[0];
    if (lower.includes(type.id.replace(/_/g, " ")) || lower.includes(needle)) {
      brief.industries.push(type.id);
    }
  }

  const countryWords: Record<string, string> = {
    pakistan: "PK", karachi: "PK", lahore: "PK", islamabad: "PK", faisalabad: "PK",
    uae: "AE", dubai: "AE", "abu dhabi": "AE", sharjah: "AE",
    saudi: "SA", riyadh: "SA", jeddah: "SA", qatar: "QA", doha: "QA",
    oman: "OM", muscat: "OM", bahrain: "BH", kuwait: "KW",
    india: "IN", bangladesh: "BD", "sri lanka": "LK",
    usa: "US", "united states": "US", america: "US", canada: "CA",
    australia: "AU", malaysia: "MY", singapore: "SG",
  };
  const cityWords = [
    "karachi", "lahore", "islamabad", "faisalabad", "rawalpindi", "multan",
    "sialkot", "gujranwala", "peshawar", "quetta", "hyderabad", "dubai",
    "abu dhabi", "sharjah", "riyadh", "jeddah", "doha", "muscat",
  ];

  for (const [word, code] of Object.entries(countryWords)) {
    if (lower.includes(word) && !brief.countries.includes(code)) brief.countries.push(code);
  }
  for (const city of cityWords) {
    if (lower.includes(city)) brief.cities.push(city.replace(/\b\w/g, (c) => c.toUpperCase()));
  }

  const countMatch = lower.match(/(\d{2,5})\s*(?:-\s*\d{2,5})?\s*(?:companies|company|business|leads|prospects)?/);
  if (countMatch) brief.targetCount = clampInt(countMatch[1], 1, MAX_TARGET, 100);

  if (/\burdu\b/.test(lower)) brief.language = lower.includes("roman") ? "roman_ur" : "ur";
  if (/\barabic\b/.test(lower)) brief.language = "ar";
  if (/\bfriendly\b/.test(lower)) brief.tone = "friendly";
  if (/\bdirect\b|\bblunt\b/.test(lower)) brief.tone = "direct";

  return sanitiseBrief(brief as unknown as Record<string, unknown>);
}

export async function parseCommandToBrief(command: string): Promise<CampaignBrief> {
  const industryList = ALL_BUSINESS_TYPES.map((t) => `${t.id} (${t.label})`).join(", ");

  const prompt = `You convert a sales manager's free-text request into a JSON brief for a B2B prospecting run. The product being sold is FinovaOS, business accounting and operations software.

The request may be in English, Urdu, or Roman Urdu:
"""
${command}
"""

Allowed industry ids (pick only from this list, choose every one that fits):
${industryList}

Allowed country codes: ${ALLOWED_OUTREACH_COUNTRIES.join(", ")}

Return ONLY this JSON object, no prose, no markdown fence:
{
  "industries": ["ids from the list above"],
  "countries": ["ISO-2 codes from the allowed list"],
  "cities": ["city names mentioned, empty array if none"],
  "employeeMin": null or number,
  "employeeMax": null or number,
  "targetCount": number of companies requested (default 100),
  "language": "en" | "ur" | "roman_ur" | "ar",
  "tone": "professional" | "friendly" | "direct",
  "valueAngle": "one short phrase naming the benefit to lead with, or null",
  "excludeDomains": []
}

Rules: if a city is named, also include its country. If no country is named at all, use ["PK"]. If no industry is clearly named, infer the closest ones rather than returning an empty list.`;

  try {
    const raw = await generateProspectingText(prompt, 900);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return parseBriefLocally(command);
    return sanitiseBrief(JSON.parse(match[0]) as Record<string, unknown>);
  } catch {
    // No key, rate limit, or malformed JSON — the keyword parser still works.
    return parseBriefLocally(command);
  }
}

export function describeBrief(brief: CampaignBrief): string {
  const where = [brief.cities.join(", "), brief.countries.join(", ")].filter(Boolean).join(" · ");
  const size =
    brief.employeeMin || brief.employeeMax
      ? `${brief.employeeMin ?? 1}-${brief.employeeMax ?? "∞"} staff`
      : "any size";
  return `${brief.targetCount} × ${brief.industries.join(", ")} · ${where} · ${size}`;
}
