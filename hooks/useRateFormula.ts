"use client";

// Reads the company's rate-formula setup on a document page.
//
// Every document that can carry formula columns calls this on mount, so the
// result is cached in module scope for the life of the tab: a purchase invoice,
// a GRN and a sales invoice opened in one session share a single request. The
// settings page busts the cache after a save so the operator sees their change
// without a reload.

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import {
  DEFAULT_RATE_FORMULA,
  isRateFormulaActive,
  normalizeRateFormula,
  type RateFormulaDocKey,
  type RateFormulaSettings,
} from "@/lib/rateFormula";

let cached: RateFormulaSettings | null = null;
let inFlight: Promise<RateFormulaSettings> | null = null;

/** Called by the settings page after a save. */
export function clearRateFormulaCache() {
  cached = null;
  inFlight = null;
}

export async function fetchRateFormula(): Promise<RateFormulaSettings> {
  if (cached) return cached;
  if (inFlight) return inFlight;

  const user = getCurrentUser();
  inFlight = fetch("/api/company/rate-formula", {
    headers: {
      "x-user-role": user?.role || "",
      "x-user-id": user?.id || "",
      "x-company-id": user?.companyId || "",
    },
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      cached = normalizeRateFormula(d);
      return cached;
    })
    .catch(() => {
      // A failed lookup must not take the document page down with it. Falling
      // back to the default means "no formula", which is what every company
      // that has not set one up sees anyway.
      cached = DEFAULT_RATE_FORMULA;
      return cached;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export type UseRateFormula = {
  /** The company's setup, or the all-off default while loading. */
  settings: RateFormulaSettings;
  /** True only when this document should draw formula columns. */
  active: boolean;
  /** False until the first response lands — hold column rendering until then. */
  ready: boolean;
};

export function useRateFormula(doc: RateFormulaDocKey): UseRateFormula {
  const [settings, setSettings] = useState<RateFormulaSettings>(
    cached || DEFAULT_RATE_FORMULA
  );
  const [ready, setReady] = useState<boolean>(Boolean(cached));

  useEffect(() => {
    let alive = true;
    fetchRateFormula().then((s) => {
      if (!alive) return;
      setSettings(s);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { settings, active: ready && isRateFormulaActive(settings, doc), ready };
}
