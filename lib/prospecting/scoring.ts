/**
 * Stage 3 — deciding who is worth an email.
 *
 * 70 of the 100 points are deterministic: the same facts always produce the
 * same number, so "score 74" means one thing today and the same thing next
 * month. Only the last 30 come from the model, and only as a judgement on
 * evidence we already collected. A model outage costs 30 points of nuance, not
 * the whole stage.
 */

import { generateProspectingText } from "./ai";
import { icpFitScore, FINOVA_PITCH, ENTRENCHED_SOFTWARE, SOFTWARE_GAP_SIGNALS } from "./icp";
import { tierFor } from "./types";
import type { EnrichmentResult, ScoreBreakdown, ScoreResult } from "./types";

export type ScorableProspect = {
  name: string;
  industry: string | null;
  country: string | null;
  city: string | null;
  domain: string | null;
  employeeCount: number | null;
  warehouseCount: number | null;
  locationCount: number | null;
  currentSoftware: string | null;
  contacts: Array<{ email: string; title?: string | null; verifyStatus?: string | null }>;
  notes: string | null;
};

/** 0-15. Big enough to pay $49/month, small enough that SAP has not got there. */
function sizeScore(employees: number | null): number {
  if (employees == null) return 5; // unknown is not the same as bad
  if (employees < 3) return 1;
  if (employees < 10) return 7;
  if (employees <= 50) return 15; // the sweet spot
  if (employees <= 200) return 13;
  if (employees <= 500) return 9;
  return 4; // enterprise: long cycle, procurement, custom demands
}

/** 0-15. Multiple stock locations is the single strongest buying signal. */
function multiLocationScore(warehouses: number | null, locations: number | null): number {
  const w = warehouses ?? 0;
  const l = locations ?? 0;
  if (w >= 3 || l >= 5) return 15;
  if (w === 2 || l >= 3) return 12;
  if (w === 1 || l === 2) return 8;
  if (w === 0 && l <= 1 && (warehouses != null || locations != null)) return 3;
  return 5; // nothing known either way
}

/** 0-10. Spreadsheets are an easy win; an incumbent ERP is a long fight. */
function softwareGapScore(current: string | null): number {
  if (!current) return 6; // no signal — most SMEs here are on Excel anyway
  const lower = current.toLowerCase();
  if (ENTRENCHED_SOFTWARE.some((s) => lower.includes(s))) return 1;
  if (SOFTWARE_GAP_SIGNALS.some((s) => lower.includes(s))) return 10;
  return 5;
}

/** 0-10. An unverified address is worth far less than a verified decision maker. */
function reachabilityScore(contacts: ScorableProspect["contacts"]): number {
  if (!contacts.length) return 0;
  const verified = contacts.filter((c) => c.verifyStatus === "valid");
  const decisionMaker = contacts.find((c) =>
    /owner|ceo|founder|director|partner|proprietor|manager|head|cfo|coo/i.test(c.title || ""),
  );

  let score = 0;
  if (verified.length) score += 6;
  else score += 2; // we have something, we just cannot vouch for it yet
  if (decisionMaker) score += 4;
  else if (contacts.some((c) => !/^(info|sales|contact|support|admin)@/.test(c.email))) score += 2;
  return Math.min(score, 10);
}

/** The 70 points that never move unless the underlying facts move. */
export function deterministicScore(prospect: ScorableProspect): Omit<ScoreBreakdown, "aiJudgement"> {
  return {
    fit: icpFitScore(prospect.industry),
    size: sizeScore(prospect.employeeCount),
    multiLocation: multiLocationScore(prospect.warehouseCount, prospect.locationCount),
    softwareGap: softwareGapScore(prospect.currentSoftware),
    reachability: reachabilityScore(prospect.contacts),
  };
}

/**
 * The remaining 30 points: does this company, in its own words, sound like it
 * has the problem FinovaOS solves?
 */
async function aiJudgement(
  prospect: ScorableProspect,
  base: Omit<ScoreBreakdown, "aiJudgement">,
): Promise<{ points: number; reason: string }> {
  const prompt = `You are qualifying a B2B prospect for FinovaOS.

${FINOVA_PITCH}

PROSPECT
Name: ${prospect.name}
Industry: ${prospect.industry || "unknown"}
Location: ${[prospect.city, prospect.country].filter(Boolean).join(", ") || "unknown"}
Employees: ${prospect.employeeCount ?? "unknown"}
Warehouses: ${prospect.warehouseCount ?? "unknown"}
Other locations: ${prospect.locationCount ?? "unknown"}
Software in use: ${prospect.currentSoftware || "none detected"}
What their website says: ${prospect.notes || "no website text available"}

A deterministic rubric already gave them ${Object.values(base).reduce((a, b) => a + b, 0)}/70 on industry fit, size, multi-location, software gap and reachability. Do not re-score those.

Judge only this: how strong is the evidence that this specific company feels the pain FinovaOS removes, and would take a demo call? Reward concrete operational complexity in their own words. Penalise: too small to pay, already running a full ERP, a business model that does not need inventory or ledgers, or no evidence at all.

Return ONLY this JSON, no prose, no markdown fence:
{ "points": 0-30, "reason": "one sentence, max 25 words, naming the specific evidence" }`;

  try {
    const raw = await generateProspectingText(prompt, 300);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { points: 12, reason: "AI judgement unavailable — deterministic score only." };
    const parsed = JSON.parse(match[0]) as { points?: unknown; reason?: unknown };
    const points = Math.min(Math.max(Math.round(Number(parsed.points) || 0), 0), 30);
    return {
      points,
      reason: parsed.reason ? String(parsed.reason).slice(0, 300) : "No reason given.",
    };
  } catch {
    // A neutral 12 keeps a good deterministic prospect in tier B rather than
    // silently dropping them because the model was rate-limited.
    return { points: 12, reason: "AI judgement unavailable — deterministic score only." };
  }
}

export async function scoreProspect(
  prospect: ScorableProspect,
  options: { useAI?: boolean } = {},
): Promise<ScoreResult> {
  const base = deterministicScore(prospect);
  const useAI = options.useAI !== false;

  const ai = useAI
    ? await aiJudgement(prospect, base)
    : { points: 12, reason: "AI judgement skipped." };

  const breakdown: ScoreBreakdown = { ...base, aiJudgement: ai.points };
  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return { score, tier: tierFor(score), breakdown, reason: ai.reason };
}

/** Builds the scorer's input from the stored prospect row plus its enrichment. */
export function toScorable(
  row: {
    name: string;
    industry: string | null;
    country: string | null;
    city: string | null;
    domain: string | null;
    employeeCount: number | null;
    warehouseCount: number | null;
    locationCount: number | null;
    currentSoftware: string | null;
    contacts?: Array<{ email: string; title?: string | null; verifyStatus?: string | null }>;
  },
  enrichment?: EnrichmentResult | null,
): ScorableProspect {
  return {
    name: row.name,
    industry: row.industry,
    country: row.country,
    city: row.city,
    domain: row.domain,
    employeeCount: row.employeeCount,
    warehouseCount: row.warehouseCount,
    locationCount: row.locationCount,
    currentSoftware: row.currentSoftware,
    contacts: row.contacts || [],
    notes: enrichment?.notes ?? null,
  };
}
