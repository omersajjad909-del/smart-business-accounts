"use client";

/**
 * Flight Search — what can be sold on a route, at what price, at what margin.
 *
 * Read the header of app/api/travel/flight-search/route.ts before trusting a
 * number on this page: there is no live fare feed behind it. The notice at the
 * top says so to the agent, every card says where its own fare came from, and
 * both stay until a real provider is connected.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useResponsive } from "@/hooks/useResponsive";
import { describeRoute, findAirport, type FlightOffer } from "@/lib/travel/flightSearch";
import { OfferCard } from "../_flight/OfferCard";
import { SearchPanel } from "../_flight/SearchPanel";
import { SummaryRail } from "../_flight/SummaryRail";
import { FareNotice, T, ff, flightCss, inputStyle } from "../_flight/ui";
import { sortOffers, stashSelection, useFlightSearch, type SortKey } from "../_flight/useFlightSearch";

type StopFilter = "any" | "direct" | "one";

export default function FlightSearchPage() {
  const router = useRouter();
  const { isMobile, isTablet } = useResponsive();
  const { query, setQuery, offers, notice, busy, error, searched, pricedFor, search } = useFlightSearch();

  const [selectedId, setSelectedId] = useState("");
  const [markup, setMarkup] = useState(0);
  const [stops, setStops] = useState<StopFilter>("any");
  const [airline, setAirline] = useState("all");
  const [sort, setSort] = useState<SortKey>("recommended");

  const pax = pricedFor?.pax ?? query.pax;

  const airlines = useMemo(
    () => Array.from(new Set(offers.map((offer) => offer.airline))).sort(),
    [offers],
  );

  const visible = useMemo(() => {
    const filtered = offers.filter((offer) => {
      if (airline !== "all" && offer.airline !== airline) return false;
      const most = Math.max(0, ...offer.legs.map((leg) => leg.via.length));
      if (stops === "direct" && most > 0) return false;
      if (stops === "one" && most > 1) return false;
      return true;
    });
    return sortOffers(filtered, sort);
  }, [offers, airline, stops, sort]);

  const cheapestId = useMemo(() => {
    let best: FlightOffer | null = null;
    for (const offer of visible) {
      if (!best || offer.baseFare + offer.taxes < best.baseFare + best.taxes) best = offer;
    }
    return best?.id || "";
  }, [visible]);

  const selected = offers.find((offer) => offer.id === selectedId) || null;

  function continueToBooking() {
    if (!selected || !pricedFor) return;
    stashSelection({ offer: selected, query: pricedFor, markup });
    router.push("/dashboard/travel/book");
  }

  const routeLine = pricedFor
    ? `${describeRoute(
        pricedFor.legs.map((leg) => ({
          from: leg.from, to: leg.to, date: leg.date, departAt: "", arriveAt: "",
          durationMinutes: 0, durationIsEstimate: true, via: [], flightNo: "", arrivesNextDay: false,
        })),
      )} · ${pricedFor.legs.map((leg) => leg.date).join(" — ")}`
    : "";

  const filterSelect: React.CSSProperties = { ...inputStyle, width: "auto", minWidth: 132, padding: "8px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" };

  return (
    <div style={{ padding: isMobile ? 16 : "24px 28px", fontFamily: ff, color: T.text, maxWidth: "100%", overflow: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: flightCss }} />

      <header style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap" }}>
        <span
          style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "grid", placeItems: "center",
            background: "linear-gradient(135deg,var(--accent),var(--accent-strong))", fontSize: 19,
          }}
        >
          ✈️
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 21 : 25, fontWeight: 800, color: T.text }}>Flight Search</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: T.muted }}>
            Search, compare and book flights for your customers.
          </p>
        </div>
      </header>

      <div style={{ display: "grid", gap: 16 }}>
        <FareNotice note={notice || undefined} />

        <SearchPanel query={query} onChange={setQuery} onSearch={() => { setSelectedId(""); search(); }} busy={busy} />

        {error ? (
          <div style={{ border: "1px solid rgba(248,113,113,.4)", background: "rgba(248,113,113,.1)", color: "#f87171", borderRadius: 12, padding: "11px 14px", fontSize: 12.5 }}>
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isTablet ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(300px,340px)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
            {!searched ? (
              <div
                style={{
                  border: `1px dashed ${T.border}`, borderRadius: 14, padding: "40px 20px",
                  textAlign: "center", color: T.muted, fontSize: 13.5, lineHeight: 1.6, background: T.card,
                }}
              >
                <div style={{ fontSize: 30, marginBottom: 10 }}>🔎</div>
                Pick a route and a date, then search.
                <br />
                Where you have flown this route before, your own fare comes back with it.
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>
                      {visible.length} flight{visible.length === 1 ? "" : "s"} found
                    </div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{routeLine}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <select className="fl-in" value={stops} onChange={(e) => setStops(e.target.value as StopFilter)} style={filterSelect}>
                      <option value="any">All stops</option>
                      <option value="direct">Direct only</option>
                      <option value="one">Up to 1 stop</option>
                    </select>
                    <select className="fl-in" value={airline} onChange={(e) => setAirline(e.target.value)} style={filterSelect}>
                      <option value="all">All airlines</option>
                      {airlines.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <select className="fl-in" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={filterSelect}>
                      <option value="recommended">Sort: Recommended</option>
                      <option value="price">Sort: Lowest fare</option>
                      <option value="duration">Sort: Shortest</option>
                      <option value="departure">Sort: Departure time</option>
                    </select>
                  </div>
                </div>

                {visible.length ? (
                  visible.map((offer, index) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      pax={pax}
                      selected={offer.id === selectedId}
                      best={index === 0 && sort === "recommended"}
                      cheapest={offer.id === cheapestId}
                      onSelect={() => setSelectedId(offer.id)}
                    />
                  ))
                ) : (
                  <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, textAlign: "center", color: T.muted, fontSize: 13, background: T.card }}>
                    {offers.length
                      ? "No flight matches those filters. Widen the stops or the airline."
                      : findAirport(query.legs[0]?.from || "") && findAirport(query.legs[0]?.to || "")
                        ? "No carrier in the list flies this sector. Enter the booking by hand on the Airline Tickets desk."
                        : "Pick both airports from the list so the route can be read."}
                  </div>
                )}
              </>
            )}
          </div>

          <SummaryRail
            offer={selected}
            pax={pax}
            markup={markup}
            onMarkupChange={setMarkup}
            onChangeFlight={() => setSelectedId("")}
            cta={selected ? { label: "Continue to Passenger Details →", onClick: continueToBooking } : undefined}
            footnotes={[
              "Fares here are your own past fares or indicative figures — confirm with the airline before quoting.",
              "Prices are subject to change until the ticket is issued.",
              "Passenger names must match the passport exactly.",
              "Baggage allowance varies by fare type and route.",
            ]}
          />
        </div>
      </div>
    </div>
  );
}
