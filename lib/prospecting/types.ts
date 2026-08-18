/**
 * Shared shapes for the AI prospecting pipeline.
 *
 * The pipeline is deliberately staged rather than one long AI call: each stage
 * writes its result to the database, so a failure at stage 5 never costs us
 * stages 1-4, and a human can inspect (and veto) the output of every stage.
 */

/** What the admin asked for, after the free-text command has been parsed. */
export type CampaignBrief = {
  /** FinovaOS business-type ids from lib/businessTypes.ts, e.g. ["trading"]. */
  industries: string[];
  /** ISO-2 codes, e.g. ["PK", "AE"]. */
  countries: string[];
  /** Free-text city names used as search seeds, e.g. ["Karachi", "Lahore"]. */
  cities: string[];
  employeeMin: number | null;
  employeeMax: number | null;
  targetCount: number;
  /** Language the outreach copy is written in. */
  language: "en" | "ur" | "roman_ur" | "ar";
  tone: "professional" | "friendly" | "direct";
  /** The angle to lead with, e.g. "multi-warehouse stock visibility". */
  valueAngle: string | null;
  /** Domains never to contact, on top of the suppression list. */
  excludeDomains: string[];
};

/** A company as a discovery provider hands it to us, before enrichment. */
export type DiscoveredCompany = {
  name: string;
  domain: string | null;
  website: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  source: string;
  sourceRef: string | null;
  /** Anything provider-specific worth keeping for the enrichment stage. */
  raw?: Record<string, unknown>;
};

/** Firmographics added on top of a discovered company. */
export type EnrichmentResult = {
  employeeCount: number | null;
  employeeBand: string | null;
  warehouseCount: number | null;
  locationCount: number | null;
  branches: Array<{ name: string; address: string | null; type: string }>;
  revenueBand: string | null;
  currentSoftware: string | null;
  contacts: Array<{
    name: string | null;
    title: string | null;
    email: string;
    phone: string | null;
    linkedin: string | null;
  }>;
  /** Free-text notes the scorer and the drafter both read. */
  notes: string | null;
  raw: Record<string, unknown>;
};

/** Deterministic sub-scores plus the AI's qualitative judgement. */
export type ScoreBreakdown = {
  /** 0-20 — does their business type match what FinovaOS actually does? */
  fit: number;
  /** 0-15 — are they big enough to pay, small enough to not need SAP? */
  size: number;
  /** 0-15 — multiple warehouses/branches is our sharpest wedge. */
  multiLocation: number;
  /** 0-10 — evidence they are on spreadsheets or nothing at all. */
  softwareGap: number;
  /** 0-10 — do we have a verified email for a decision maker? */
  reachability: number;
  /** 0-30 — the model's read of their actual pain, from their own website. */
  aiJudgement: number;
};

export type ScoreResult = {
  score: number;
  tier: "A" | "B" | "C" | "D";
  breakdown: ScoreBreakdown;
  reason: string;
};

export type DraftedEmail = {
  subject: string;
  bodyText: string;
  /** One concrete detail about *this* company, used to prove it isn't a blast. */
  personalisationHook: string;
};

export type PipelineStage =
  | "discovering"
  | "enriching"
  | "scoring"
  | "drafting"
  | "review"
  | "sending";

export type StageResult = {
  stage: PipelineStage;
  processed: number;
  failed: number;
  /** True when this stage has nothing left to do and the campaign can advance. */
  complete: boolean;
  message: string;
};

/** Score at or above which a prospect is worth a personalised email. */
export const TIER_THRESHOLDS = { A: 80, B: 60, C: 40 } as const;

export function tierFor(score: number): "A" | "B" | "C" | "D" {
  if (score >= TIER_THRESHOLDS.A) return "A";
  if (score >= TIER_THRESHOLDS.B) return "B";
  if (score >= TIER_THRESHOLDS.C) return "C";
  return "D";
}

export function bandForEmployees(count: number | null): string | null {
  if (count == null) return null;
  if (count <= 10) return "1-10";
  if (count <= 50) return "11-50";
  if (count <= 200) return "51-200";
  if (count <= 500) return "201-500";
  return "500+";
}
