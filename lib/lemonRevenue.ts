/**
 * Revenue read straight from Lemon Squeezy.
 *
 * The admin revenue screens used to derive everything from our own
 * ActivityLog `PAYMENT_EVENT` rows, and that indirection kept producing wrong
 * numbers: the reader looked for a `status` field the writer never set, then
 * for `amount_paid` when the writer used `amount`, and the writer stored
 * `subtotal` (before discount) while logging the same payment twice — once for
 * `order_created` and again for `subscription_payment_success`. A $24.50 sale
 * showed up as $0, then as $98.
 *
 * Lemon Squeezy already knows exactly what it collected. Ask it.
 */

export type LemonOrder = {
  id: string;
  /** Charged amount in major units, after discounts, excluding refunds. */
  amount: number;
  currency: string;
  createdAt: Date;
  status: string;
  refunded: boolean;
};

export function hasLemonRevenueConfig() {
  return Boolean(process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID);
}

/**
 * Fetches recent paid orders. Follows pagination up to `maxPages` so a busy
 * month is not silently truncated to the first page.
 */
export async function fetchLemonOrders(maxPages = 5): Promise<LemonOrder[] | null> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!apiKey || !storeId) return null;

  const orders: LemonOrder[] = [];
  let url: string | null =
    `https://api.lemonsqueezy.com/v1/orders?filter[store_id]=${encodeURIComponent(storeId)}` +
    `&page[size]=100&sort=-createdAt`;

  try {
    for (let page = 0; page < maxPages && url; page++) {
      const res: Response = await fetch(url, {
        headers: {
          Accept: "application/vnd.api+json",
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
      });
      if (!res.ok) return orders.length ? orders : null;

      const json: any = await res.json();
      for (const row of json?.data || []) {
        const a = row?.attributes || {};
        const status = String(a.status || "").toLowerCase();
        const refunded = Boolean(a.refunded);
        // `total` is what the card was actually charged — `subtotal` ignores
        // the discount, which is what inflated the launch-offer sale.
        const minorUnits = Number(a.total ?? 0);
        if (!Number.isFinite(minorUnits) || minorUnits <= 0) continue;

        orders.push({
          id: String(row.id),
          amount: minorUnits / 100,
          currency: String(a.currency || "USD").toUpperCase(),
          createdAt: a.created_at ? new Date(a.created_at) : new Date(),
          status,
          refunded,
        });
      }
      url = json?.links?.next || null;
    }
    return orders;
  } catch {
    return orders.length ? orders : null;
  }
}

/** Paid, non-refunded orders only. */
export function billableOrders(orders: LemonOrder[]) {
  return orders.filter(o => !o.refunded && (o.status === "paid" || o.status === "active"));
}

export function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Total collected in the calendar month `d` falls in. */
export function revenueForMonth(orders: LemonOrder[], d = new Date()) {
  const key = ym(d);
  return round2(billableOrders(orders).filter(o => ym(o.createdAt) === key).reduce((s, o) => s + o.amount, 0));
}

/** Last `count` months as `{ label, value }`, oldest first. */
export function monthlySeries(orders: LemonOrder[], count = 6) {
  const now = new Date();
  const billable = billableOrders(orders);
  const out: Array<{ label: string; value: number }> = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = ym(d);
    out.push({
      label: key,
      value: round2(billable.filter(o => ym(o.createdAt) === key).reduce((s, o) => s + o.amount, 0)),
    });
  }
  return out;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
