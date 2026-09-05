/**
 * Stage 1 — finding real companies.
 *
 * This is the one stage an LLM must NOT do. Asked for "500 trading companies
 * in Karachi", a language model will happily produce 500 plausible names with
 * plausible emails, most of which do not exist. Sending to them bounces, and
 * bounce rate is what gets a sending domain blacklisted. So discovery only
 * ever comes from a real directory API.
 *
 * Providers are picked by which credentials are present. With no credentials
 * at all we fall back to the `sample` provider, which emits companies on the
 * reserved `.invalid` TLD (RFC 2606) so the whole pipeline can be demonstrated
 * end to end without any possibility of mail reaching a real inbox — the
 * sending stage refuses `.invalid` outright.
 */

import type { CampaignBrief, DiscoveredCompany } from "./types";
import { ALL_BUSINESS_TYPES } from "@/lib/businessTypes";

export type DiscoveryProvider = "sample" | "google-places" | "apollo" | "overpass";

/**
 * Overpass goes first: it is free (OpenStreetMap, no key, no per-call cost),
 * so a campaign is fully funded by real data before a paid provider is ever
 * touched. Places/Apollo only fill in what Overpass could not find.
 */
export function availableProviders(): DiscoveryProvider[] {
  const list: DiscoveryProvider[] = ["overpass"];
  if (process.env.GOOGLE_PLACES_API_KEY) list.push("google-places");
  if (process.env.APOLLO_API_KEY) list.push("apollo");
  list.push("sample");
  return list;
}

/** The first configured real provider, or "sample" when none are set up. */
export function activeProvider(): DiscoveryProvider {
  return availableProviders()[0];
}

export function normaliseDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = String(input)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "");
  return cleaned.includes(".") ? cleaned : null;
}

const COUNTRY_NAMES: Record<string, string> = {
  PK: "Pakistan", AE: "United Arab Emirates", SA: "Saudi Arabia", QA: "Qatar",
  OM: "Oman", BH: "Bahrain", KW: "Kuwait", IN: "India", BD: "Bangladesh",
  LK: "Sri Lanka", US: "United States", CA: "Canada", AU: "Australia",
  NZ: "New Zealand", ZA: "South Africa", NG: "Nigeria", KE: "Kenya",
  EG: "Egypt", MY: "Malaysia", SG: "Singapore",
};

const DEFAULT_CITIES: Record<string, string[]> = {
  PK: ["Karachi", "Lahore", "Faisalabad", "Sialkot", "Islamabad", "Gujranwala", "Multan"],
  AE: ["Dubai", "Sharjah", "Abu Dhabi", "Ajman"],
  SA: ["Riyadh", "Jeddah", "Dammam"],
  QA: ["Doha"], OM: ["Muscat"], BH: ["Manama"], KW: ["Kuwait City"],
  IN: ["Mumbai", "Delhi", "Ahmedabad", "Surat"],
  BD: ["Dhaka", "Chittagong"], LK: ["Colombo"],
  US: ["Houston", "Chicago", "Miami"], CA: ["Toronto"], AU: ["Sydney"],
  MY: ["Kuala Lumpur"], SG: ["Singapore"], ZA: ["Johannesburg"],
  NG: ["Lagos"], KE: ["Nairobi"], EG: ["Cairo"], NZ: ["Auckland"],
};

/** Centroid [lat, lng] for every city named in DEFAULT_CITIES above, so
 * Overpass (which needs a point + radius, not a city name) can run without a
 * geocoding API. Approximate on purpose — a 20km search radius absorbs it. */
const CITY_COORDS: Record<string, [number, number]> = {
  Karachi: [24.8607, 67.0011], Lahore: [31.5497, 74.3436], Faisalabad: [31.4504, 73.135],
  Sialkot: [32.4945, 74.5229], Islamabad: [33.6844, 73.0479], Gujranwala: [32.1877, 74.1945],
  Multan: [30.1575, 71.5249],
  Dubai: [25.2048, 55.2708], Sharjah: [25.3463, 55.4209], "Abu Dhabi": [24.4539, 54.3773], Ajman: [25.4052, 55.5136],
  Riyadh: [24.7136, 46.6753], Jeddah: [21.4858, 39.1925], Dammam: [26.4207, 50.0888],
  Doha: [25.2854, 51.531], Muscat: [23.5859, 58.4059], Manama: [26.2285, 50.586], "Kuwait City": [29.3759, 47.9774],
  Mumbai: [19.076, 72.8777], Delhi: [28.7041, 77.1025], Ahmedabad: [23.0225, 72.5714], Surat: [21.1702, 72.8311],
  Dhaka: [23.8103, 90.4125], Chittagong: [22.3569, 91.7832], Colombo: [6.9271, 79.8612],
  Houston: [29.7604, -95.3698], Chicago: [41.8781, -87.6298], Miami: [25.7617, -80.1918],
  Toronto: [43.6532, -79.3832], Sydney: [-33.8688, 151.2093], "Kuala Lumpur": [3.139, 101.6869],
  Singapore: [1.3521, 103.8198], Johannesburg: [-26.2041, 28.0473], Lagos: [6.5244, 3.3792],
  Nairobi: [-1.2921, 36.8219], Cairo: [30.0444, 31.2357], Auckland: [-36.8485, 174.7633],
};

/**
 * Name-search keywords per FinovaOS industry id, tuned toward what a small
 * manufacturer/trader actually puts in its OSM listing name. Falls back to
 * the plain industry label when nothing more specific is known.
 */
const OVERPASS_KEYWORDS: Record<string, string[]> = {
  manufacturing: ["plastic", "PVC", "polymer", "injection molding", "extrusion", "factory", "mills", "industries"],
  chemical: ["chemical", "plastic", "PVC", "resin", "polymer"],
  trading: ["trading", "traders", "general trading", "impex"],
  distribution: ["distributor", "distribution", "logistics"],
  wholesale: ["wholesale", "wholesaler", "traders"],
  import_company: ["import", "importers", "trading"],
  export_company: ["export", "exporters", "trading"],
  hardware: ["hardware", "building materials", "steel"],
  garments: ["garments", "textile", "apparel"],
  textile_mill: ["textile mill", "textile", "spinning", "weaving"],
  steel_mill: ["steel", "rolling mill", "metal works"],
  food_processing: ["food processing", "foods", "cannery"],
  cold_storage: ["cold storage", "cold store"],
  construction: ["construction", "builders", "contractors"],
  pharmacy: ["pharmacy", "chemist", "medical store"],
  supermarket: ["supermarket", "grocery", "mart"],
  retail: ["store", "shop", "retail"],
};

function overpassKeywordsFor(brief: CampaignBrief): string[] {
  const words = brief.industries.flatMap((id) => OVERPASS_KEYWORDS[id] || [labelFor(id)]);
  return [...new Set(words)];
}

function escapeOverpassRegex(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

/**
 * OpenStreetMap Overpass — free, no key, real currently-mapped businesses.
 * Coverage in South Asia/Gulf is patchier than Google Places (OSM is
 * volunteer-mapped), so this is tried first because it costs nothing, not
 * because it is more complete; Places/Apollo pick up whatever it misses.
 */
async function discoverViaOverpass(
  brief: CampaignBrief,
  limit: number,
): Promise<DiscoveredCompany[]> {
  const out: DiscoveredCompany[] = [];
  const seen = new Set<string>();
  const keywords = overpassKeywordsFor(brief);
  const regex = keywords.map(escapeOverpassRegex).join("|");
  if (!regex) return out;

  for (const { city, country } of citiesFor(brief)) {
    if (out.length >= limit) break;
    const coords = CITY_COORDS[city];
    if (!coords) continue;
    const [lat, lon] = coords;

    const query = `[out:json][timeout:25];
(
  nwr["name"~"${regex}",i](around:20000,${lat},${lon});
);
out center ${Math.min(limit - out.length, 100)};`;

    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: query,
      });
      if (!res.ok) {
        console.error(`[prospecting/discovery] Overpass query failed (HTTP ${res.status}) for ${city}`);
        continue;
      }
      const data = (await res.json()) as { elements?: OverpassElement[] };

      for (const el of data.elements || []) {
        if (out.length >= limit) break;
        const tags = el.tags || {};
        const name = tags.name?.trim();
        if (!name) continue;

        const website = tags.website || tags["contact:website"] || null;
        const domain = normaliseDomain(website);
        const dedupeKey = domain || `${name.toLowerCase()}|${city.toLowerCase()}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const address =
          [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"] || city]
            .filter(Boolean)
            .join(", ") || null;

        out.push({
          name,
          domain,
          website,
          industry: brief.industries[0] || null,
          country,
          city,
          address,
          lat: el.lat ?? el.center?.lat ?? null,
          lng: el.lon ?? el.center?.lon ?? null,
          phone: tags.phone || tags["contact:phone"] || null,
          source: "overpass",
          sourceRef: `${el.type}/${el.id}`,
          raw: tags as Record<string, unknown>,
        });
      }
    } catch (error) {
      console.error(`[prospecting/discovery] Overpass request errored for ${city}:`, error);
    }
  }

  return out;
}

function citiesFor(brief: CampaignBrief): Array<{ city: string; country: string }> {
  const out: Array<{ city: string; country: string }> = [];
  for (const country of brief.countries) {
    const cities = brief.cities.length ? brief.cities : DEFAULT_CITIES[country] || [country];
    for (const city of cities) out.push({ city, country });
  }
  return out.length ? out : [{ city: "Karachi", country: "PK" }];
}

function labelFor(industryId: string): string {
  return ALL_BUSINESS_TYPES.find((t) => t.id === industryId)?.label || industryId;
}

// ─── Google Places ────────────────────────────────────────────────────────────
// Text Search returns real, currently-operating businesses with an address and
// often a website — the best source there is for South Asian and Gulf SMEs,
// which are largely absent from the US-centric B2B databases.

type PlacesResult = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  location?: { latitude?: number; longitude?: number };
  businessStatus?: string;
};

async function discoverViaPlaces(
  brief: CampaignBrief,
  limit: number,
): Promise<DiscoveredCompany[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return [];

  const out: DiscoveredCompany[] = [];
  const seen = new Set<string>();

  for (const { city, country } of citiesFor(brief)) {
    for (const industry of brief.industries) {
      if (out.length >= limit) break;

      // Places caps a text search at 20 results per page, 60 with paging.
      let pageToken: string | undefined;
      for (let page = 0; page < 3 && out.length < limit; page++) {
        const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.location,places.businessStatus,nextPageToken",
          },
          body: JSON.stringify({
            textQuery: `${labelFor(industry)} company in ${city}, ${COUNTRY_NAMES[country] || country}`,
            maxResultCount: 20,
            ...(pageToken ? { pageToken } : {}),
          }),
        });

        // A rejected key, the legacy "Places API" enabled instead of "Places
        // API (New)", or an HTTP-referrer restriction on a server-side call all
        // fail here. Swallowing that produced an empty result set and the
        // caller's generic "no results for this brief" warning, which sends you
        // looking at the brief instead of at the key. Say what actually broke.
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          console.error(
            `[prospecting/discovery] Places searchText failed (HTTP ${res.status}): ${body.slice(0, 500)}`,
          );
          break;
        }
        const data = (await res.json()) as { places?: PlacesResult[]; nextPageToken?: string };

        for (const place of data.places || []) {
          if (out.length >= limit) break;
          if (place.businessStatus && place.businessStatus !== "OPERATIONAL") continue;

          const name = place.displayName?.text?.trim();
          if (!name) continue;
          const domain = normaliseDomain(place.websiteUri);
          const dedupeKey = domain || `${name.toLowerCase()}|${city.toLowerCase()}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);

          out.push({
            name,
            domain,
            website: place.websiteUri || null,
            industry,
            country,
            city,
            address: place.formattedAddress || null,
            lat: place.location?.latitude ?? null,
            lng: place.location?.longitude ?? null,
            phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
            source: "google-places",
            sourceRef: place.id || null,
            raw: place as unknown as Record<string, unknown>,
          });
        }

        pageToken = data.nextPageToken;
        if (!pageToken) break;
      }
    }
  }

  return out;
}

// ─── Apollo ───────────────────────────────────────────────────────────────────
// Weaker coverage of Pakistani SMEs than Places, but it is the only one of the
// two that returns employee counts and named decision makers, so it is worth
// running as a second pass over the same brief.

type ApolloOrg = {
  id?: string;
  name?: string;
  website_url?: string;
  primary_domain?: string;
  industry?: string;
  country?: string;
  city?: string;
  raw_address?: string;
  phone?: string;
  estimated_num_employees?: number;
};

async function discoverViaApollo(
  brief: CampaignBrief,
  limit: number,
): Promise<DiscoveredCompany[]> {
  const key = process.env.APOLLO_API_KEY;
  if (!key) return [];

  const out: DiscoveredCompany[] = [];
  const perPage = 100;
  const pages = Math.min(Math.ceil(limit / perPage), 10);

  for (let page = 1; page <= pages && out.length < limit; page++) {
    const res = await fetch("https://api.apollo.io/api/v1/mixed_companies/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify({
        page,
        per_page: perPage,
        organization_locations: citiesFor(brief).map(
          (c) => `${c.city}, ${COUNTRY_NAMES[c.country] || c.country}`,
        ),
        q_organization_keyword_tags: brief.industries.map(labelFor),
        ...(brief.employeeMin || brief.employeeMax
          ? {
              organization_num_employees_ranges: [
                `${brief.employeeMin ?? 1},${brief.employeeMax ?? 10000}`,
              ],
            }
          : {}),
      }),
    });

    if (!res.ok) break;
    const data = (await res.json()) as { organizations?: ApolloOrg[]; accounts?: ApolloOrg[] };
    const orgs = [...(data.organizations || []), ...(data.accounts || [])];
    if (!orgs.length) break;

    for (const org of orgs) {
      if (out.length >= limit) break;
      if (!org.name) continue;
      out.push({
        name: org.name,
        domain: normaliseDomain(org.primary_domain || org.website_url),
        website: org.website_url || null,
        industry: brief.industries[0] || null,
        country: (org.country && countryCode(org.country)) || brief.countries[0] || null,
        city: org.city || null,
        address: org.raw_address || null,
        lat: null,
        lng: null,
        phone: org.phone || null,
        source: "apollo",
        sourceRef: org.id || null,
        raw: { ...org } as Record<string, unknown>,
      });
    }
  }

  return out;
}

function countryCode(name: string): string | null {
  const hit = Object.entries(COUNTRY_NAMES).find(
    ([, full]) => full.toLowerCase() === name.trim().toLowerCase(),
  );
  return hit ? hit[0] : null;
}

// ─── Sample ───────────────────────────────────────────────────────────────────
// Deterministic placeholder rows so the review queue, scoring and drafting can
// be exercised before a single rupee is spent on a data provider. Every domain
// ends in `.invalid`, which can never resolve and is rejected by the sender.

const SAMPLE_PREFIXES = [
  "Al-Madina", "Crescent", "Indus", "Ravi", "Shalimar", "Gulberg", "Meezan",
  "Falcon", "Orient", "Prime", "Unity", "Skyline", "Everest", "Sapphire",
  "Northline", "Silk Route", "Harbour", "Summit", "Zenith", "Delta",
];
const SAMPLE_SUFFIXES = [
  "Traders", "Enterprises", "Corporation", "Industries", "and Sons",
  "International", "Group", "Impex", "Agencies", "Brothers",
];

function discoverSample(brief: CampaignBrief, limit: number): DiscoveredCompany[] {
  const out: DiscoveredCompany[] = [];
  const places = citiesFor(brief);
  let i = 0;

  while (out.length < limit) {
    const prefix = SAMPLE_PREFIXES[i % SAMPLE_PREFIXES.length];
    const suffix = SAMPLE_SUFFIXES[Math.floor(i / SAMPLE_PREFIXES.length) % SAMPLE_SUFFIXES.length];
    const place = places[i % places.length];
    const industry = brief.industries[i % brief.industries.length];
    const slug = `${prefix}-${suffix}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const domain = `${slug}-${i}.example.invalid`;

    out.push({
      name: `${prefix} ${suffix}`,
      domain,
      website: `https://${domain}`,
      industry,
      country: place.country,
      city: place.city,
      address: `Plot ${100 + i}, ${place.city}, ${COUNTRY_NAMES[place.country] || place.country}`,
      lat: null,
      lng: null,
      phone: null,
      source: "sample",
      sourceRef: `sample-${i}`,
      raw: { sample: true, seed: i },
    });
    i++;
    if (i > limit * 4) break; // guard against an unsatisfiable brief
  }

  return out;
}

/**
 * Runs every configured provider until the brief's target is met.
 *
 * @param brief  Parsed campaign brief.
 * @param limit  How many companies to return at most.
 * @param force  Pin a specific provider instead of auto-selecting.
 */
export async function discoverCompanies(
  brief: CampaignBrief,
  limit: number,
  force?: DiscoveryProvider,
): Promise<{ companies: DiscoveredCompany[]; provider: DiscoveryProvider; warnings: string[] }> {
  const warnings: string[] = [];
  const order: DiscoveryProvider[] = force ? [force] : availableProviders();
  const collected: DiscoveredCompany[] = [];
  const seen = new Set<string>();
  let used: DiscoveryProvider = order[0];

  for (const provider of order) {
    if (collected.length >= limit) break;
    const remaining = limit - collected.length;

    try {
      const batch =
        provider === "google-places"
          ? await discoverViaPlaces(brief, remaining)
          : provider === "apollo"
            ? await discoverViaApollo(brief, remaining)
            : provider === "overpass"
              ? await discoverViaOverpass(brief, remaining)
              : discoverSample(brief, remaining);

      for (const company of batch) {
        const key = company.domain || `${company.name.toLowerCase()}|${company.city || ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push(company);
      }
      if (batch.length) used = provider;
      if (!batch.length && provider !== "sample") {
        warnings.push(`${provider} returned no results for this brief.`);
      }
    } catch (error) {
      warnings.push(`${provider} failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  if (used === "sample") {
    warnings.push(
      "No discovery API is configured, so these are placeholder companies on .invalid domains. They can be scored and drafted, but the sender will refuse to mail them. Set GOOGLE_PLACES_API_KEY or APOLLO_API_KEY for real prospects.",
    );
  }

  return { companies: collected.slice(0, limit), provider: used, warnings };
}
