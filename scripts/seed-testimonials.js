/**
 * DISABLED — this script used to publish nine invented customer reviews.
 *
 * It inserted people like "Thomas Miller — Miller Trading Co." and
 * "Alicia Stevens — Global Distribution Group" with status PUBLISHED, so they
 * came back from /api/public/testimonials indistinguishable from real ones.
 * It also ran `prisma.testimonial.deleteMany({})` first, meaning that running
 * it after launch would delete genuine customer reviews and replace them with
 * fabricated ones.
 *
 * Testimonials must only ever come from real customers submitting them.
 * If you need rows in a local database to check the layout, add them through
 * the admin UI on your dev database — never against production, and never
 * with status PUBLISHED on a public environment.
 */

console.error(
  [
    "seed-testimonials.js is disabled on purpose.",
    "",
    "It seeded fabricated customer reviews and wiped the testimonial table",
    "before doing so. Publishing invented reviews is deceptive advertising in",
    "several of the markets FinovaOS sells into, and it destroys the exact",
    "trust the reviews were meant to build.",
    "",
    "Real reviews only. Delete this file once you no longer need the record.",
  ].join("\n")
);

process.exit(1);
