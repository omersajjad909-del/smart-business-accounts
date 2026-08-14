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

// Stated rather than assumed. This handler reads nothing off the request, so
// it is exactly the shape a future build could decide to render once and reuse
// — and a cached copy of this particular answer means Launch Now visibly does
// nothing. The sibling public routes pin themselves the same way.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    { open: await getSignupsOpen() },
    // Nothing caches the launch switch itself. The database is already
    // protected by the 15-second cache inside getSignupsOpen(); a CDN copy in
    // front of it would only be one more place launch day could get stuck.
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
