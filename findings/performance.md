# Performance / Core Web Vitals Findings — FinovaOS (www.finovaos.app)

Audited: 2026-10-29
Target: https://www.finovaos.app (public marketing homepage — the primary SEO/CWV-relevant surface; the app at usefinova.app sits behind auth and is not crawled/ranked)

## Method / data sources

- **CrUX field data / PSI API**: unavailable this run — the shared PSI API key hit `PSI rate limit exceeded (240 QPM / 25,000 QPD)` on every retry (4 attempts, spaced ~20s apart), and `crux_history.py` required a separate API key that isn't configured. Likely contention from other parallel audit subagents sharing the same key. **Action for orchestrator/user**: re-run `pagespeed_check.py` and `crux_history.py` once quota resets, or supply a dedicated `GOOGLE_API_KEY`, to get real 75th-percentile field data — lab data below is a single-run proxy only.
- **Lighthouse 13.6.0 CLI** (lab data, mobile + desktop, headless Chrome, simulated throttling), run directly against production since PSI was unavailable.

## Scores (Lighthouse lab, single run)

| | Mobile | Desktop |
|---|---|---|
| Performance score | **71/100** | **97/100** |
| LCP | 2.52s (score 0.89 — borderline, "Good" threshold ≤2.5s) | 0.6s (score 0.99) |
| CLS | 0.014 (score 1 — Good) | 0.052 (score 0.98 — Good) |
| TBT (INP lab proxy) | **950ms (score 0.29 — Poor)** | 10ms (score 1) |
| Speed Index | 3.5s | 1.6s |

Note: Lighthouse does not measure INP directly (it's an interaction-based field metric); Total Blocking Time is the closest lab proxy. A TBT of 950ms on mobile is a strong signal that real mobile users will see **INP in the "Needs Improvement/Poor" range**, since this page loads 24 scripts (858KB) including 4 third-party trackers that compete for the main thread during/after load.

## Core Web Vitals status (lab proxy — confirm with field data when PSI quota resets)

| Metric | Mobile | Desktop |
|---|---|---|
| LCP | Borderline Good/Needs Improvement (2.52s, right at the 2.5s cutoff) | Pass |
| INP (proxy via TBT) | Likely Needs Improvement/Poor (950ms TBT) | Pass |
| CLS | Pass (0.014 / 0.052) | Pass |

## Bottlenecks identified (mobile, ordered by impact)

1. **LCP element-render-delay dominates LCP, not network/TTFB.** LCP breakdown: TTFB 632ms + **element render delay 1,892ms** = 2,524ms total. The LCP element is a hero paragraph of text (`div.hero-left > p.h3`, "FinovaOS is AI-powered cloud accounting software…"), not an image — so the delay is pure render-blocking/main-thread contention, not image loading.
   - Contributing cause: a render-blocking stylesheet (`/_next/static/css/e0efdf0bb9bf007d.css`, 21.7KB) delays first paint.
   - Contributing cause: heavy main-thread work before paint — `mainthread-work-breakdown` totals **7.5s** of CPU time during the trace (Other 2.55s, Style & Layout 1.88s, Script Evaluation 1.46s, Rendering 1.27s), plus a 155ms unattributed **forced reflow** (layout thrashing).

2. **Grossly oversized, unoptimized PNG logo.** `/finova-mark.png` is a 256×256 PNG (77KB) displayed at 36×36 in the nav — **76.1KB of its 77KB transfer is pure waste** (99%). Lighthouse flags both "wrong format" (WebP/AVIF would save ~65KB) and "wrong dimensions" (serve a 36/72px asset). Two other large PNGs load on the same page: `icon1-tight.png` (239KB) and `icon.png` (125KB) — together with the logo, ~440KB of the 1.5MB page weight is unoptimized icon/favicon PNGs.

3. **Third-party scripts fragment and block the main thread.** 24 script requests, 858KB total. Separate `gtag.js` loads for both a Google Ads tag (`AW-18478573284`, 170KB) and GA4 (`G-PY9D7NW061`, 182KB) instead of one consolidated GTM container; plus Microsoft Clarity (115KB), Facebook Pixel `fbevents.js` (115KB, cached only 20 minutes — should be proxied/cached longer or loaded lazily), and Cloudflare Insights. Lighthouse found **20 long tasks** and attributes real CPU time to each: GA4 gtag 180ms, Google Ads gtag 226ms, Clarity 115ms, plus a 1,198ms CPU chunk from an internal bundle (`77149-...js`, 782ms of which is script evaluation). This is the direct driver of the 950ms TBT / poor INP risk.

4. **Legacy JavaScript / polyfills shipped unnecessarily**: ~36KB wasted on polyfills for `Array.prototype.at/flat/flatMap`, `Object.fromEntries`, etc. in `77149-9d29082f64f3f394.js` — these are natively supported in all target browsers per current browserslist/baseline, so the build is shipping dead code that also costs parse/compile time.

5. **Non-composited (jank-prone) CSS animations** on 9 elements, animating `box-shadow`, `border-*-color`, `background-position-x`, `padding-*`, `font-size`, `letter-spacing` — none of these run on the compositor, so each triggers a layout/paint on every frame. This is the likely source of the forced-reflow entry above and a secondary INP/jank risk for anyone interacting near the hero or the "Trading/Wholesale" solution cards while these animations run.

6. **TTFB variance**: 632ms (mobile run) vs 1,080ms (desktop run, scored 0/failing on `server-response-time`) for the same root document. Worth watching for serverless cold-start behavior on Vercel (sin1 region, per `vercel.json`) if the audience is not primarily in/near Singapore — not currently the main LCP driver here, but adds risk if it spikes under load.

7. **DOM size**: 1,924 total elements — over the "excessive DOM" guidance threshold (>1,500) in this skill's reference, though Lighthouse's insight-based audit didn't dock the score this run. Not urgent but worth trimming on the hero/solutions page if more sections are added.

## Prioritized recommendations

**P0 — highest impact / cheapest fix**
- Resize + compress `finova-mark.png` to the actual rendered size (36×36, @2x = 72×72) and serve as WebP/AVIF with a PNG fallback, or switch to an inline SVG mark. Expected: removes ~76KB and one of the largest bytes-on-page items; also apply to `icon.png`/`icon1-tight.png` (use properly sized favicons, not multi-hundred-KB source art as the `<link rel="icon">`).
- Defer/lazy-load non-essential third-party tags: load Facebook Pixel, Microsoft Clarity, and Cloudflare Insights via `next/script` with `strategy="lazyOnload"` (or load after first user interaction / idle), and consolidate the two separate `gtag.js` loads (Ads + GA4) into one GTM container or one `gtag` call with both IDs. Expected: directly cuts the 950ms TBT, since these scripts account for several of the 20 long tasks.

**P1**
- Remove the render-blocking CSS (21.7KB) from the critical path: inline critical above-the-fold CSS and defer the rest, or split the stylesheet so the hero section isn't blocked on styles it doesn't need (e.g., below-the-fold "solutions" card styles).
- Fix the browserslist/target config for the build so `Array.prototype.at/flat/flatMap`/`Object.fromEntries` polyfills aren't shipped (saves ~36KB parse+transfer and removes unnecessary script-evaluation time in the largest JS chunk).
- Switch the 9 animated elements off `box-shadow`/`border-color`/`padding`/`font-size`/`background-position` animations onto compositor-friendly properties (`transform`, `opacity`) — e.g. the pulsing status dot, CTA hover/press states, and the gradient text animation in the H1. This removes the 155ms forced-reflow entry and reduces jank risk during interaction.

**P2**
- Investigate the 1,080ms desktop TTFB vs 632ms mobile TTFB variance (cache status, Vercel region vs audience geography, any uncached SSR work on the homepage).
- Re-run PSI/CrUX once API quota resets to replace this lab-only read with real 75th-percentile field data, since the LCP of 2.52s on mobile is right at the "Good" cutoff and field data (with real device/network variance) may show it slipping into "Needs Improvement" for a meaningful share of visits.

## Expected impact summary

| Fix | Primary metric improved | Rough expected gain |
|---|---|---|
| Resize/compress logo + icons | LCP, total byte weight | -70-440KB transfer, minor LCP/SI gain |
| Lazy-load/consolidate 3rd-party scripts | TBT / INP | Largest lever — could cut TBT by several hundred ms |
| Remove render-blocking CSS from critical path | LCP (element render delay) | Could meaningfully shrink the 1.89s render-delay portion of LCP |
| Drop unneeded JS polyfills | TBT, bundle size | -36KB, minor script-eval reduction |
| Move animations to transform/opacity | Forced reflow, INP/jank | Removes a distinct 155ms reflow cost; smoother interactions |
