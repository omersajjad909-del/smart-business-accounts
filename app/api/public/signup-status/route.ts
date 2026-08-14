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

// This handler reads no request data, so Next would happily render it once at
// build time and serve that answer forever — freezing the site at "not
// launched" no matter what the admin presses. It must run per request.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    { open: await getSignupsOpen() },
    // No caching in front of the launch switch itself. The database is already
    // protected by the 15-second cache inside getSignupsOpen(); a CDN copy
    // here would just be one more place launch day could get stuck.
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
