/**
 * /api/public/signup-status
 *
 * Whether the buy buttons are open. Public on purpose — the answer is visible
 * to anyone who clicks a CTA, so there is nothing here worth hiding.
 *
 * Exists because the marketing CTAs are client components: they cannot read the
 * launch row directly, and the build-time NEXT_PUBLIC_ flag they used before
 * cannot change without a redeploy.
 */

import { NextResponse } from "next/server";

import { getSignupsOpen } from "@/lib/signupGate";

export async function GET() {
  return NextResponse.json(
    { open: await getSignupsOpen() },
    // Briefly cacheable: launch day tolerates a few seconds, ordinary days
    // should not re-ask on every page view.
    { headers: { "Cache-Control": "public, max-age=10" } },
  );
}
