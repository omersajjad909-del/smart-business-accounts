/**
 * lib/ai/productBrief.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * What FinovaOS is, in the form a model needs before it writes anything.
 *
 * Six of the AI console pages produce customer-facing or public text — support
 * replies, SEO pages, case studies, objection answers, onboarding notes, report
 * explanations. Each of them needs the same product context, and without it the
 * model fills the gap with a generic SaaS invented on the spot: a free trial
 * that does not exist, a mobile app that is not shipped, an integration nobody
 * built.
 *
 * Two things here are load-bearing rather than descriptive:
 *
 *   FORBIDDEN is a list of claims that are false about this product. It exists
 *   because a model asked to write a landing section for accounting software
 *   will offer a free trial by default — every competitor has one — and that
 *   single sentence is a promise the business has decided not to make.
 *
 *   The pricing line refuses to state a number. Prices live in the database and
 *   differ by currency and region; a model that guesses one is quoting a price
 *   to a customer. Any page that genuinely needs a figure passes it in as data.
 */

/** The product, told plainly. */
export const PRODUCT_BRIEF = `
FinovaOS is a cloud accounting and ERP platform for small and medium businesses.

Who uses it: traders, distributors, manufacturers, retailers and service
businesses, mostly in Pakistan and the Gulf, plus some international customers.
The typical buyer is the owner or the accountant of a business with 3 to 50
staff, who is running the books in Excel or in an old desktop package.

What it does:
- Sales and purchase invoicing, quotations, delivery challans, sale returns
- Inventory: stock items, purchase orders, goods received notes, stock ledger
- Full double-entry accounting: chart of accounts, ledgers, trial balance,
  journal/payment/receipt vouchers, ageing
- Reports: profit and loss, balance sheet, cash flow, inventory, stock ledger
- Bank reconciliation, tax configuration, multi-currency, multi-branch
- CRM, HR and payroll on the higher plans
- Built-in AI assistant that answers questions about the business finances
- Works in English and Urdu, both Roman and script

How it is sold: paid plans only — Starter, Professional, Enterprise, plus a
Custom plan where the customer pays per module. Monthly or yearly billing.
Pakistan pays through a local gateway; everyone else through Lemon Squeezy.

How it is positioned: cheaper and far simpler than Xero, Zoho Books or
QuickBooks for a business in this region, and unlike those it speaks Urdu,
handles local tax formats, and is built around how trading businesses here
actually work rather than how a Western small business does.
`.trim();

/**
 * Claims that are false about FinovaOS. Any generated text containing one of
 * these is wrong, not merely off-tone.
 */
export const FORBIDDEN_CLAIMS = `
Never write, imply, or offer any of the following. Each one is untrue:
- A free trial, a free plan, a freemium tier, or "try it free". FinovaOS is paid
  only. The calls to action are "Get Started", "View Pricing", or "Book a Demo".
- A money-back guarantee, a discount, or a limited-time offer, unless the exact
  offer is given to you in the prompt as data.
- Specific prices, in any currency. Prices live in the database and vary by
  region. If a price is needed and was not given to you, write it as a
  placeholder the human will fill in.
- Customer counts, ratings, review scores, awards, certifications, or named
  customers — unless they appear in the data you were given. FinovaOS is early
  and has few customers; inventing social proof is the single worst thing you
  can do on this page.
- A mobile app, or any integration, bank feed, or third-party connection that
  is not named in the product brief above.
- Compliance claims (SOC 2, ISO, GDPR certification, FBR approval) not given to
  you as data.
`.trim();

/** House voice for anything a customer or the public will read. */
export const BRAND_VOICE = `
Voice:
- Plain, direct, unexcited. Short sentences. No marketing adjectives, no
  "revolutionary", "seamless", "empower", "unlock", "game-changing".
- Concrete over abstract: "raise an invoice in four clicks", not "streamline
  your billing workflow".
- Never use an exclamation mark. Never open with "In today's fast-paced world".
- When writing for Pakistani customers, Roman Urdu mixed with English is
  correct and normal — write the way a trader in Faisalabad actually messages,
  not translated formal Urdu.
- Respect the reader. They run a business; they are not a "user journey".
`.trim();

/** The three blocks together — what most generation prompts want. */
export function brandContext(): string {
  return [PRODUCT_BRIEF, "", BRAND_VOICE, "", FORBIDDEN_CLAIMS].join("\n");
}

/**
 * Catch the two forbidden claims that are worth catching mechanically.
 *
 * This is a backstop, not a filter. A prompt instruction is followed most of
 * the time, and "most of the time" is not good enough for a free-trial offer
 * that reaches a customer, so any page that publishes text runs the output past
 * this and shows the operator what it found. It looks for the offer, not the
 * words: "free" alone is fine ("free up your evening"), "free trial" is not.
 */
export function checkForbiddenClaims(text: string): string[] {
  const found: string[] = [];
  const t = text.toLowerCase();

  const patterns: Array<[RegExp, string]> = [
    [/\bfree\s+(trial|plan|tier|forever|for\s+\d+\s+days?)\b/, "Offers a free trial or free plan — FinovaOS is paid only"],
    [/\btry\s+(it\s+)?(for\s+)?free\b/, 'Says "try it free"'],
    [/\bno\s+credit\s+card\s+required\b/, 'Says "no credit card required" — implies a free trial'],
    [/\bmoney[-\s]?back\s+guarantee\b/, "Promises a money-back guarantee"],
    [/\b\d{1,3},?\d{0,3}\+?\s+(businesses|customers|companies|users)\s+(trust|use|rely)/, "States a customer count"],
    [/\b(soc\s?2|iso\s?27001|gdpr[-\s]certified)\b/, "Claims a compliance certification"],
  ];

  for (const [re, message] of patterns) {
    if (re.test(t)) found.push(message);
  }
  return found;
}
