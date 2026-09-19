// FILE: lib/travel/airports.ts
//
// Every airport a scheduled flight actually goes to — 4,008 of them.
//
// This replaces a list of forty written from memory, which was fine until
// somebody opened the From box and saw seven Pakistani cities and concluded
// the product only sold domestic flights. It did not; the list just started
// there and nothing said so.
//
// SOURCE AND LICENCE
//
// Built from OurAirports (ourairports.com), filtered to airports that carry an
// IATA code and have scheduled service. OurAirports releases its data into the
// public domain, which is why it is this one and not OpenFlights — the latter
// is share-alike, and a share-alike database inside a commercial product is a
// problem nobody wants to discover later.
//
// Regenerate with scripts/build-airports.mjs when it needs refreshing.
//
// WHY IT IS NOT IMPORTED BY CLIENT CODE
//
// The JSON is 310KB. Importing it into a page would put all of it into the
// browser bundle to answer a box that shows seven rows at a time. The picker
// asks /api/travel/airports instead, and this module stays on the server.

import data from "./airports.json";

export type Airport = {
  code: string;
  city: string;
  country: string;
  name: string;
  lat: number;
  lon: number;
  /** 0 large, 1 medium, 2 small — a tiebreaker, not a filter. */
  size: number;
  /* Alternate names, comma separated.

     This is how "Tokyo" finds Narita, whose municipality is Narita and whose
     name mentions Tokyo nowhere; and "New York" finds Newark; and "Milan"
     finds Malpensa, which sits in a town called Ferno. Without it the picker
     is only as good as whatever the local council calls the place. */
  keywords: string;
};

type Row = [string, string, string, string, number, number, number, string];

/* Positional rather than keyed, because repeating six key names 4,008 times
   costs more than the data. */
const AIRPORTS: Airport[] = (data as Row[]).map((row) => ({
  code: row[0],
  city: row[1],
  country: row[2],
  name: row[3],
  lat: row[4],
  lon: row[5],
  size: row[6],
  keywords: row[7] || "",
}));

/**
 * Where the source calls a place something nobody else does.
 *
 * OurAirports records the municipality an airport physically sits in, which is
 * usually what people call it and occasionally is not: Islamabad
 * International is filed under Attock. A desk searching its own home airport
 * and being shown "Attock" has good reason to distrust the whole list.
 *
 * Deliberately short and hand-checked. Every entry is a case where the
 * airport's own name says the city and the municipality does not; it is not a
 * place to start renaming towns.
 */
const CITY_OVERRIDES: Record<string, string> = {
  ISB: "Islamabad",
  MXP: "Milan",
  LIN: "Milan",
  BGY: "Milan",
  NRT: "Tokyo",
  EWR: "New York",
  BVA: "Paris",
};

/* "Paris (Roissy-en-France, Val-d'Oise)" is the commune, in brackets, after
   the city. The city is the part before the bracket. */
function tidyCity(code: string, city: string): string {
  if (CITY_OVERRIDES[code]) return CITY_OVERRIDES[code];
  const trimmed = city.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return trimmed || city;
}

AIRPORTS.forEach((airport) => {
  airport.city = tidyCity(airport.code, airport.city);
});

const BY_CODE = new Map(AIRPORTS.map((airport) => [airport.code, airport]));

export const AIRPORT_COUNT = AIRPORTS.length;

export function findAirport(code: string): Airport | undefined {
  return BY_CODE.get(String(code || "").trim().toUpperCase());
}

/**
 * Airports matching what was typed, best first.
 *
 * An exact code wins outright: the desk that types "DEL" knows what it wants
 * and must not be handed "New Delhi" second. After that a city that starts
 * with the text beats one that merely contains it, and among equals the larger
 * airport comes first — "LON" should offer Heathrow before a Kansas airfield
 * whose name happens to contain the letters.
 */
/**
 * Airports this product's users actually fly, for ranking only.
 *
 * Four thousand airports with no notion of which matter means "kara" offers
 * Karaganda before Karachi — both are large airports and Karaganda sorts
 * first. OurAirports carries no traffic figures, so this stands in for them.
 * It is a tiebreaker between equal text matches and never excludes anything.
 */
const PROMINENT_ORDER = [
  "KHI", "LHE", "ISB", "PEW", "UET", "MUX", "SKT", "LYP", "GWD", "SDT",
  "JED", "MED", "RUH", "DMM", "DXB", "SHJ", "AUH", "DOH", "MCT", "BAH",
  "KWI", "IST", "LHR", "LGW", "MAN", "BHX", "CDG", "FRA", "AMS", "MAD",
  "JFK", "EWR", "ORD", "LAX", "YYZ", "YVR", "KUL", "BKK", "SIN", "HKG",
  "NRT", "HND", "ICN", "PEK", "PVG", "CAN", "DEL", "BOM", "CMB", "DAC",
  "KTM", "KBL", "BGW", "NJF", "AMM", "BEY", "CAI", "JNB", "SYD", "MEL",
];

/* Listed order is the ranking, so Heathrow comes before Gatwick for "london"
   rather than whichever sorts first alphabetically. */
const PROMINENCE = new Map(PROMINENT_ORDER.map((code, index) => [code, index]));
const prominence = (code: string) => PROMINENCE.get(code) ?? Number.MAX_SAFE_INTEGER;

/**
 * What an empty box offers first.
 *
 * Home airports and the places they actually fly to, interleaved, so the first
 * six rows are not all one country. See the note in searchAirports.
 */
const OPENING_SUGGESTIONS = [
  "KHI", "DXB", "LHE", "JED", "ISB", "LHR", "DOH", "RUH",
  "PEW", "IST", "MED", "JFK", "UET", "KUL", "MUX", "YYZ",
];

export function searchAirports(text: string, limit = 8): Airport[] {
  const needle = String(text || "").trim().toLowerCase();

  if (!needle) {
    /* An empty box shows a starting point, not a catalogue.

       The order matters more than it looks. Listing the ten Pakistani airports
       first — which is what prominence order does — filled the visible rows
       with Karachi, Lahore, Islamabad, Peshawar, Quetta and Multan, and a
       desk opening the box saw exactly what it saw when the whole table was
       forty entries: a domestic-only product. So the opening suggestions
       deliberately alternate home and abroad. Typing still searches all of
       them; this is only the first impression. */
    const out: Airport[] = [];
    for (const code of OPENING_SUGGESTIONS) {
      const airport = BY_CODE.get(code);
      if (airport) out.push(airport);
      if (out.length >= limit) break;
    }
    return out;
  }

  const scored: Array<{ airport: Airport; score: number }> = [];

  for (const airport of AIRPORTS) {
    const code = airport.code.toLowerCase();
    const city = airport.city.toLowerCase();
    const name = airport.name.toLowerCase();
    const country = airport.country.toLowerCase();
    const keywords = airport.keywords.toLowerCase();

    let score = 99;
    if (code === needle) score = 0;
    else if (city === needle) score = 1;
    else if (city.startsWith(needle)) score = 2;
    else if (code.startsWith(needle)) score = 3;
    // An alternate name is a real name — "Tokyo" for Narita, "New York" for
    // Newark — so it ranks with the others rather than below everything.
    else if (keywords.split(",").some((k) => k === needle || k.startsWith(needle))) score = 3.5;
    else if (name.startsWith(needle)) score = 4;
    else if (city.includes(needle)) score = 5;
    else if (name.includes(needle)) score = 6;
    else if (keywords.includes(needle)) score = 6.5;
    else if (country.startsWith(needle)) score = 7;
    else if (country.includes(needle)) score = 8;

    if (score < 99) scored.push({ airport, score });
  }

  scored.sort((a, b) =>
    a.score - b.score ||
    prominence(a.airport.code) - prominence(b.airport.code) ||
    a.airport.size - b.airport.size ||
    a.airport.code.localeCompare(b.airport.code));
  return scored.slice(0, limit).map((row) => row.airport);
}
