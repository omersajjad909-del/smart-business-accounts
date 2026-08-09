/**
 * Region signal sent with the fetches that decide which currency to show.
 *
 * <ClientRegionSignal> also writes the same value as a cookie, which is what
 * carries the signal into checkout and every later request. This header exists
 * for the very first paint: the pricing page asks for its region inside an
 * effect, and on a cold visit that can race the effect that writes the cookie.
 * Sending it explicitly removes the race, so a Pakistani visitor never sees a
 * flash of USD pricing.
 */
export function clientRegionHeaders(): Record<string, string> {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz ? { "x-client-timezone": tz } : {};
  } catch {
    return {};
  }
}
