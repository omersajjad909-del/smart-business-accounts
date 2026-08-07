import { NextResponse } from "next/server";

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
  const code = (process.env.LEMONSQUEEZY_LAUNCH_DISCOUNT || "").trim();
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;

  if (!code || !apiKey || !storeId) {
    return NextResponse.json({ discount: null });
  }

  try {
    const res = await fetch(
      `https://api.lemonsqueezy.com/v1/discounts?filter[store_id]=${encodeURIComponent(storeId)}`,
      {
        headers: {
          Accept: "application/vnd.api+json",
          Authorization: `Bearer ${apiKey}`,
        },
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) return NextResponse.json({ discount: null });

    const json = await res.json();
    const match = (json?.data || []).find(
      (d: any) =>
        String(d?.attributes?.code || "").toUpperCase() === code.toUpperCase() &&
        String(d?.attributes?.status || "").toLowerCase() === "published",
    );
    if (!match) return NextResponse.json({ discount: null });

    // Lemon Squeezy reports percent as a whole number and fixed amounts in cents.
    const isPercent = String(match.attributes.amount_type).toLowerCase() === "percent";
    const rawAmount = Number(match.attributes.amount) || 0;

    return NextResponse.json({
      discount: {
        code: String(match.attributes.code).toUpperCase(),
        type: isPercent ? "percent" : "fixed",
        value: isPercent ? rawAmount : rawAmount / 100,
      },
    });
  } catch {
    return NextResponse.json({ discount: null });
  }
}
