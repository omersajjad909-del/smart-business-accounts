export type LaunchDiscount = {
  code: string;
  type: "percent" | "fixed";
  /** Whole-number percent, or a fixed amount in the store currency (not cents). */
  value: number;
  /** How many billing months the discount repeats for; null = once/forever. */
  durationMonths: number | null;
};

/**
 * The store-wide launch discount (`LEMONSQUEEZY_LAUNCH_DISCOUNT`), read from
 * Lemon Squeezy so there is one source of truth for its size and duration.
 *
 * Lemon Squeezy applies it to its own checkouts and repeats it on renewals by
 * itself. Safepay has no discount or subscription concept — every month is a
 * fresh one-off charge — so the Safepay checkout reads this and applies it by
 * hand for the first `durationMonths` monthly charges.
 *
 * Returns null when none is configured, the code does not exist in the store,
 * or the lookup fails.
 */
export async function getLaunchDiscount(): Promise<LaunchDiscount | null> {
  const code = (process.env.LEMONSQUEEZY_LAUNCH_DISCOUNT || "").trim();
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!code || !apiKey || !storeId) return null;

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
    if (!res.ok) return null;

    const json = await res.json();
    const match = (json?.data || []).find(
      (d: any) =>
        String(d?.attributes?.code || "").toUpperCase() === code.toUpperCase() &&
        String(d?.attributes?.status || "").toLowerCase() === "published",
    );
    if (!match) return null;

    // Lemon Squeezy reports percent as a whole number and fixed amounts in cents.
    const a = match.attributes;
    const isPercent = String(a.amount_type).toLowerCase() === "percent";
    const rawAmount = Number(a.amount) || 0;
    const months = Number(a.duration_in_months) || 0;

    return {
      code: String(a.code).toUpperCase(),
      type: isPercent ? "percent" : "fixed",
      value: isPercent ? rawAmount : rawAmount / 100,
      durationMonths: String(a.duration).toLowerCase() === "repeating" && months > 0 ? months : null,
    };
  } catch {
    return null;
  }
}
