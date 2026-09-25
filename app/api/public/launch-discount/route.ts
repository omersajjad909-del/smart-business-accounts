import { NextResponse } from "next/server";
import { getLaunchDiscount } from "@/lib/launchDiscount";

export const runtime = "nodejs";
export const revalidate = 300;

/**
 * GET /api/public/launch-discount
 *
 * `LEMONSQUEEZY_LAUNCH_DISCOUNT` is auto-applied to every checkout server-side,
 * but the UI had no idea it existed — so the payment page advertised the full
 * $49 while Lemon Squeezy actually charged $24.50. Same class of bug as the
 * currency mismatch: the page must show the price that will be charged.
 *
 * Returns the live discount as the coupon shape the payment page already
 * understands, or `{ discount: null }` when none is configured or the code does
 * not exist in the store (which is also why checkout no longer hard-fails on
 * a bad code — see createLemonCheckout).
 */
export async function GET() {
  const d = await getLaunchDiscount();
  if (!d) return NextResponse.json({ discount: null });
  return NextResponse.json({
    discount: { code: d.code, type: d.type, value: d.value },
  });
}
