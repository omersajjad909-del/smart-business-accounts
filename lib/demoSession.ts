/**
 * How long a demo sandbox lives.
 *
 * Client-safe on purpose: `lib/demoSandbox.ts` pulls in prisma and bcrypt, so
 * the marketing page could not import from it and kept its own copy of the
 * number instead. The two then had to be changed together, and nothing said so
 * — the page would have gone on promising a 60-minute workspace while sessions
 * actually ran for two hours. One constant, imported by both.
 */

export const DEMO_SESSION_MINUTES = 120;

/** The same length written the way a visitor reads it: "2-hour", "45-minute". */
export const DEMO_SESSION_LABEL =
  DEMO_SESSION_MINUTES % 60 === 0
    ? `${DEMO_SESSION_MINUTES / 60}-hour`
    : `${DEMO_SESSION_MINUTES}-minute`;

/** For running text: "two hours are up", "45 minutes are up". */
export const DEMO_SESSION_DURATION_TEXT =
  DEMO_SESSION_MINUTES % 60 === 0
    ? `${DEMO_SESSION_MINUTES / 60} hour${DEMO_SESSION_MINUTES === 60 ? "" : "s"}`
    : `${DEMO_SESSION_MINUTES} minutes`;
