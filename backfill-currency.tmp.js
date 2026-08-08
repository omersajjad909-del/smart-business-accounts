/**
 * One-off backfill: set Company.baseCurrency for companies that have none,
 * deriving it from Company.country.
 *
 * The fallback `company.baseCurrency || currencyByCountry(company.country)` now
 * resolves full country names, but it only computes a value at read time — it
 * never persists one. This writes it once for existing rows.
 *
 * Dry-run unless --commit is passed.
 */
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const COMMIT = process.argv.includes("--commit");

// Read the same tables the app uses, so this cannot drift from lib/currency.ts.
function loadTables() {
  const src = fs.readFileSync("lib/currency.ts", "utf8");
  const start = src.indexOf("COUNTRY_TO_CURRENCY");
  const marker = src.indexOf("/** Full country name");
  const mapSrc = src.slice(start, marker);
  const COUNTRY_TO_CURRENCY = eval("(" + mapSrc.slice(mapSrc.indexOf("{"), mapSrc.lastIndexOf("}") + 1) + ")");

  const cs = fs.readFileSync("lib/countries.ts", "utf8");
  const COUNTRIES = eval("(" + cs.slice(cs.indexOf("["), cs.indexOf("];") + 1) + ")");
  const NAME_TO_CODE = Object.fromEntries(COUNTRIES.map(c => [c.name.toLowerCase(), c.code]));
  return { COUNTRY_TO_CURRENCY, NAME_TO_CODE };
}

const { COUNTRY_TO_CURRENCY, NAME_TO_CODE } = loadTables();

function currencyByCountry(country) {
  if (!country) return null;
  const raw = String(country).trim();
  if (!raw) return null;
  const direct = COUNTRY_TO_CURRENCY[raw.toUpperCase()];
  if (direct) return direct;
  const code = NAME_TO_CODE[raw.toLowerCase()];
  return code ? COUNTRY_TO_CURRENCY[code] ?? null : null;
}

(async () => {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, country: true, baseCurrency: true },
  });

  const willUpdate = [];
  const cannotResolve = [];
  let alreadySet = 0;

  for (const c of companies) {
    if (c.baseCurrency && String(c.baseCurrency).trim()) { alreadySet++; continue; }
    const currency = currencyByCountry(c.country);
    if (!currency) { cannotResolve.push({ id: c.id, name: c.name, country: c.country }); continue; }
    willUpdate.push({ id: c.id, name: c.name, country: c.country, baseCurrency: currency });
  }

  console.log(COMMIT ? "=== COMMITTING ===" : "=== DRY RUN (no writes) ===");
  console.log(`total companies: ${companies.length}`);
  console.log(`already have baseCurrency: ${alreadySet}`);
  console.log(`will set: ${willUpdate.length}`);
  console.log(JSON.stringify(willUpdate, null, 2));
  if (cannotResolve.length) {
    console.log(`\ncould NOT resolve (left untouched): ${cannotResolve.length}`);
    console.log(JSON.stringify(cannotResolve, null, 2));
  }

  if (COMMIT) {
    for (const u of willUpdate) {
      await prisma.company.update({ where: { id: u.id }, data: { baseCurrency: u.baseCurrency } });
      console.log("set:", u.name, "→", u.baseCurrency);
    }
  }

  await prisma.$disconnect();
})().catch(async (e) => { console.error(e.message); await prisma.$disconnect(); process.exit(1); });
