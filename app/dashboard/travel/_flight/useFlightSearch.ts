"use client";

import { useCallback, useState } from "react";

import { getCurrentUser } from "@/lib/auth";
import type { FlightOffer, SearchQuery } from "@/lib/travel/flightSearch";
import { emptyQuery, queryForSearch } from "./SearchPanel";

/**
 * Who the browser says it is.
 *
 * The API decides for itself from the signed token; these only save it the
 * lookup. Sending them is not what grants the permission.
 */
export function authHeaders(): Record<string, string> {
  const user = getCurrentUser() as { id?: string; role?: string; companyId?: string } | null;
  return {
    "Content-Type": "application/json",
    ...(user?.id ? { "x-user-id": user.id } : {}),
    ...(user?.role ? { "x-user-role": user.role } : {}),
    ...(user?.companyId ? { "x-company-id": user.companyId } : {}),
  };
}

/** Where a selection is left for the booking wizard to pick up. */
const HANDOFF_KEY = "finova.travel.flightSelection";

export type FlightHandoff = { offer: FlightOffer; query: SearchQuery; markup: number };

export function stashSelection(handoff: FlightHandoff) {
  try {
    window.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(handoff));
  } catch {
    // A browser with storage blocked simply starts the wizard on a blank
    // search, which is a slower path rather than a broken one.
  }
}

export function takeSelection(): FlightHandoff | null {
  try {
    const raw = window.sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    // Read once. Coming back to the wizard later should not silently re-apply
    // a flight that was chosen for a different customer an hour ago.
    window.sessionStorage.removeItem(HANDOFF_KEY);
    const parsed = JSON.parse(raw) as FlightHandoff;
    return parsed?.offer && parsed?.query ? parsed : null;
  } catch {
    return null;
  }
}

export type SortKey = "recommended" | "price" | "duration" | "departure";

export function useFlightSearch() {
  const [query, setQuery] = useState<SearchQuery>(emptyQuery);
  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  /** The party the results are priced for — frozen at search time, so editing
      the form afterwards does not silently re-price the list on screen. */
  const [pricedFor, setPricedFor] = useState<SearchQuery | null>(null);

  const search = useCallback(async (override?: SearchQuery) => {
    const asked = queryForSearch(override ?? query);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/travel/flight-search", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(asked),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Flight search failed");
      setOffers(Array.isArray(body.offers) ? body.offers : []);
      setNotice(String(body.notice || ""));
      setPricedFor(asked);
      setSearched(true);
    } catch (searchError) {
      setOffers([]);
      setError(searchError instanceof Error ? searchError.message : "Flight search failed");
      setSearched(true);
    } finally {
      setBusy(false);
    }
  }, [query]);

  return { query, setQuery, offers, notice, busy, error, searched, pricedFor, search };
}

/** Rank the list the way the chosen sort says, without mutating it. */
export function sortOffers(offers: FlightOffer[], sort: SortKey): FlightOffer[] {
  const total = (offer: FlightOffer) => offer.baseFare + offer.taxes;
  const minutes = (offer: FlightOffer) => offer.legs.reduce((sum, leg) => sum + leg.durationMinutes, 0);
  const copy = [...offers];
  switch (sort) {
    case "price":
      return copy.sort((a, b) => total(a) - total(b));
    case "duration":
      return copy.sort((a, b) => minutes(a) - minutes(b));
    case "departure":
      return copy.sort((a, b) => (a.legs[0]?.departAt || "").localeCompare(b.legs[0]?.departAt || ""));
    default:
      /* "Recommended" is price and time together, leaning on price — the fare
         matters most, but nobody thanks you for saving two thousand rupees by
         putting a family through a fourteen-hour connection. A fare you have
         actually paid before edges ahead of one this system guessed at. */
      return copy.sort((a, b) => {
        const score = (offer: FlightOffer) =>
          total(offer) + minutes(offer) * 45 + (offer.source === "history" ? -4000 : 0);
        return score(a) - score(b);
      });
  }
}
