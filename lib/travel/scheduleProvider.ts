// FILE: lib/travel/scheduleProvider.ts
//
// Getting a real timetable from somewhere that has one.
//
// The desk can type its schedules in by hand and for ten or twenty sectors
// that is genuinely the fastest thing. This is for the rest: ask a flight-data
// provider what actually flies a sector, show what came back, and let the
// operator save the rows they recognise.
//
// WHY IT IMPORTS RATHER THAN QUERIES LIVE
//
// The providers that will sell to a Pakistani company without an accreditation
// or a contract are metered in the hundreds of calls per month. Two agents
// searching for an afternoon would exhaust that. A timetable also barely
// changes — an airline's 08:30 departure is the 08:30 departure all season. So
// this is called once per sector, the rows land in Flight Schedules, and every
// search afterwards reads them locally and costs nothing.
//
// WHAT IS NOT VERIFIED
//
// The AeroDataBox response parsing below is written from their published API
// shape and has NOT been run against the real service — there is no key on
// this machine. The import route has a `probe` mode that returns the raw
// response untouched for exactly this reason: the first call with a real key
// will show what actually comes back, and the parser gets corrected against
// that rather than against a guess. Until then, treat anything here as
// provisional.

import { AIRLINES } from "@/lib/travel/flightSearch";

export type ProviderFlight = {
  airline: string;
  airlineIata: string;
  flightNo: string;
  from: string;
  to: string;
  /** Local clock at each end, "08:30". Empty where the provider did not say. */
  departAt: string;
  arriveAt: string;
  /** ISO weekday numbers, Monday = 1. Empty means the provider did not say. */
  days: number[];
  aircraft: string;
};

export type ProviderResult = {
  provider: string;
  flights: ProviderFlight[];
  /** Anything the operator should know before trusting these rows. */
  warnings: string[];
};

export class ProviderError extends Error {}

/** Which provider this deployment is configured for, if any. */
export function configuredProvider(): "aerodatabox" | null {
  if (process.env.AERODATABOX_RAPIDAPI_KEY) return "aerodatabox";
  return null;
}

/** "2026-10-03 08:30+05:00" or an ISO stamp — we want the "08:30". */
function clockFrom(value: unknown): string {
  const text = String(value || "");
  const match = text.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "";
}

function iataFrom(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const obj = node as Record<string, unknown>;
  const code = String(obj.iata || obj.iataCode || "").toUpperCase();
  return code.length === 3 ? code : "";
}

/**
 * Pull the pieces of a flight out of one departures-board row.
 *
 * Deliberately forgiving about where things sit. A board row names the far end
 * of the sector and the times, but providers disagree about whether that lives
 * under `movement`, `arrival` or `departure`, and a parser that insists on one
 * spelling returns nothing at all the day they change it. Anything genuinely
 * missing is left empty for the operator to fill rather than guessed.
 */
function readDepartureRow(raw: unknown, from: string): ProviderFlight | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const movement = (row.movement ?? row.arrival ?? {}) as Record<string, unknown>;
  const departure = (row.departure ?? {}) as Record<string, unknown>;

  const to = iataFrom(movement.airport) || iataFrom(row.arrivalAirport);
  if (!to || to === from) return null;

  const airlineNode = (row.airline ?? {}) as Record<string, unknown>;
  const aircraftNode = (row.aircraft ?? {}) as Record<string, unknown>;

  /* The provider's own name for a carrier is whatever is on its operating
     certificate — the first real import returned "M/S Fly Jinnah Services Pvt
     Ltd" and "Pakistan International". Nobody sells a seat under those. Where
     the IATA code is one we know, ours is the name that goes on the card. */
  const flightNo = String(row.number || row.flightNumber || "").trim().toUpperCase();
  if (!flightNo) return null;

  /* And the code itself is not always given. Fly Jinnah came back as
     `{"name":"M/S Fly Jinnah Services Pvt Ltd"}` with no iata at all — which
     matters far more than the name, because a schedule saved without a carrier
     code matches nothing when the search looks for it later. The flight number
     carries the code as its prefix, so that is where it is read from. */
  const iata =
    String(airlineNode.iata || "").toUpperCase() ||
    (flightNo.match(/^([A-Z0-9]{2})\s*\d/)?.[1] ?? "");
  const known = AIRLINES.find((a) => a.code === iata);

  const departAt =
    clockFrom((departure.scheduledTime as Record<string, unknown>)?.local) ||
    clockFrom(row.scheduledDepartureLocal) ||
    // On a departures board the row's own scheduled time is the departure.
    clockFrom((row.scheduledTime as Record<string, unknown>)?.local);

  const arriveAt =
    clockFrom((movement.scheduledTime as Record<string, unknown>)?.local) ||
    clockFrom(row.scheduledArrivalLocal);

  return {
    airline: known?.name || String(airlineNode.name || ""),
    airlineIata: iata,
    flightNo,
    from,
    to,
    departAt,
    // A departures board gives the departure reliably and the arrival only
    // sometimes. Left empty rather than computed — a made-up arrival time is
    // the thing this whole change was about removing.
    arriveAt,
    days: [],
    aircraft: String(aircraftNode.model || ""),
  };
}

type FetchOptions = { from: string; to: string; date: string; probe?: boolean };

/**
 * AeroDataBox, through RapidAPI.
 *
 * Their departures board is queried per airport over a time window, so a
 * sector is "everything leaving SKT that day, keep the ones going to LHE".
 * The window caps at twelve hours, hence two calls for a full day — which is
 * two of the month's six hundred, and the reason this is an import and not a
 * live search.
 */
async function fetchAeroDataBox(options: FetchOptions): Promise<ProviderResult & { raw?: unknown }> {
  const key = process.env.AERODATABOX_RAPIDAPI_KEY;
  if (!key) throw new ProviderError("No AERODATABOX_RAPIDAPI_KEY is configured.");

  const host = process.env.AERODATABOX_RAPIDAPI_HOST || "aerodatabox.p.rapidapi.com";
  const windows: Array<[string, string]> = [
    [`${options.date}T00:00`, `${options.date}T12:00`],
    [`${options.date}T12:00`, `${options.date}T23:59`],
  ];

  const flights: ProviderFlight[] = [];
  const warnings: string[] = [];
  const raw: unknown[] = [];

  for (const [start, end] of windows) {
    const url =
      `https://${host}/flights/airports/iata/${encodeURIComponent(options.from)}/${start}/${end}` +
      `?withLeg=true&direction=Departure&withCancelled=false&withCodeshared=false&withCargo=false&withPrivate=false`;

    const response = await fetch(url, {
      headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": host },
      cache: "no-store",
    });

    if (response.status === 429) {
      throw new ProviderError("The provider's monthly quota is used up. Import again next month, or enter these flights by hand.");
    }
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new ProviderError(`The provider refused the request (${response.status}). ${body.slice(0, 200)}`);
    }

    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new ProviderError("The provider sent something that was not JSON.");
    raw.push(body);

    const rows = Array.isArray(body.departures) ? body.departures : [];
    if (!rows.length && !Array.isArray(body.departures)) {
      warnings.push("The response had no 'departures' list where one was expected — the parser may need correcting against this provider's current shape.");
    }

    for (const row of rows) {
      const flight = readDepartureRow(row, options.from);
      if (flight && flight.to === options.to) flights.push(flight);
    }
  }

  // Same flight number twice in a day is a genuine second rotation; the same
  // number twice at the same minute is the two windows overlapping.
  const seen = new Set<string>();
  const unique = flights.filter((flight) => {
    const key = `${flight.flightNo}|${flight.departAt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (!unique.length) {
    warnings.push(`Nothing came back for ${options.from} to ${options.to} on ${options.date}. The sector may not operate that day, or the provider may not cover it.`);
  } else {
    /* A departures board is one day, not a week.

       Everything here flew on the date asked for and nothing in the response
       says which other days it flies. Saved as-is these rows read as daily,
       so a thrice-weekly service would be offered to a customer on a Tuesday
       it does not operate. Said plainly rather than guessed at. */
    warnings.push(
      `These are the flights that operated on ${options.date} — the provider does not say which other days they run. ` +
      "Set the operating days below if any of them is not a daily service.",
    );
  }
  unique.forEach((flight) => {
    if (!flight.arriveAt) {
      warnings.push(`${flight.flightNo} came back without an arrival time — fill it in before saving.`);
    }
  });

  return {
    provider: "aerodatabox",
    flights: unique.sort((a, b) => a.departAt.localeCompare(b.departAt)),
    warnings,
    ...(options.probe ? { raw } : {}),
  };
}

export async function fetchSchedules(options: FetchOptions): Promise<ProviderResult & { raw?: unknown }> {
  const provider = configuredProvider();
  if (!provider) {
    throw new ProviderError(
      "No flight-data provider is configured. Add AERODATABOX_RAPIDAPI_KEY to the environment, or enter the schedule by hand.",
    );
  }
  return fetchAeroDataBox(options);
}
