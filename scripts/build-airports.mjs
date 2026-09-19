// Rebuilds lib/travel/airports.json from OurAirports.
//
// OurAirports releases its data into the public domain, which is why it is
// this source and not OpenFlights — the latter is share-alike, and a
// share-alike database inside a commercial product is a problem nobody wants
// to discover later.
//
//   node scripts/build-airports.mjs
//
// Kept to airports that carry an IATA code and have scheduled service: roughly
// four thousand, which is every place you can actually book a flight to, out
// of the eighty-six thousand airfields, heliports and seaplane bases in the
// full file.

import { writeFileSync } from "node:fs";

const BASE = "https://davidmegginson.github.io/ourairports-data";
const RANK = { large_airport: 0, medium_airport: 1, small_airport: 2 };

/** OurAirports ships real CSV — quoted fields containing commas and quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ",") { row.push(field); field = ""; continue; }
    if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    if (ch === "\r") continue;
    field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }

  const header = rows.shift();
  return rows
    .filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

async function load(name) {
  const response = await fetch(`${BASE}/${name}`);
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  return parseCsv(await response.text());
}

const [airports, countries] = await Promise.all([load("airports.csv"), load("countries.csv")]);
const countryName = new Map(countries.map((c) => [c.code, c.name]));

const out = [];
for (const a of airports) {
  const iata = (a.iata_code || "").trim().toUpperCase();
  if (iata.length !== 3 || !/^[A-Z]{3}$/.test(iata)) continue;
  if (a.scheduled_service !== "yes") continue;
  if (!(a.type in RANK)) continue;

  const lat = Number(a.latitude_deg);
  const lon = Number(a.longitude_deg);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

  const name = (a.name || "").trim();

  /* Alternate names, which is how "Tokyo" finds Narita — whose municipality is
     Narita, and whose name says nothing about Tokyo at all. Same for Newark
     under New York and Malpensa under Milan. Trimmed, because a few carry an
     essay. */
  const keywords = (a.keywords || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(",")
    .slice(0, 120);

  out.push([
    iata,
    (a.municipality || "").trim() || name,
    countryName.get(a.iso_country) || a.iso_country,
    name,
    Math.round(lat * 1e4) / 1e4,
    Math.round(lon * 1e4) / 1e4,
    RANK[a.type],
    keywords,
  ]);
}

// Bigger airports first, so an equal text match prefers the one a passenger is
// more likely to have meant.
out.sort((a, b) => a[6] - b[6] || a[0].localeCompare(b[0]));

const path = "lib/travel/airports.json";
writeFileSync(path, JSON.stringify(out));
console.log(`${out.length} airports -> ${path}`);
