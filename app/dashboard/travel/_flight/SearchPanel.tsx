"use client";

/**
 * The search bar: where from, where to, when, who and in what cabin.
 *
 * A return is two dates on one form rather than two searches, and a multi-city
 * is the same form with more rows — an itinerary priced as one journey is
 * cheaper than the legs bought separately, which is exactly the thing an agency
 * is paid to know.
 */

import { useMemo } from "react";

import type { CabinClass, PaxCounts, SearchLeg, SearchQuery, TripType } from "@/lib/travel/flightSearch";
import { AirportInput, CabinSelect, Field, PaxPicker, PrimaryButton, Segmented, T, inputStyle } from "./ui";

export function emptyQuery(): SearchQuery {
  const today = new Date();
  const soon = new Date(today.getTime() + 14 * 864e5);
  const later = new Date(today.getTime() + 21 * 864e5);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    tripType: "oneway",
    legs: [
      { from: "", to: "", date: iso(soon) },
      { from: "", to: "", date: iso(later) },
    ],
    pax: { adults: 1, children: 0, infants: 0 },
    cabin: "economy",
  };
}

/** What the server is actually asked, given the trip type on screen. */
export function queryForSearch(query: SearchQuery): SearchQuery {
  if (query.tripType === "oneway") return { ...query, legs: query.legs.slice(0, 1) };
  if (query.tripType === "round") {
    const [out] = query.legs;
    const back = query.legs[1];
    return {
      ...query,
      // The way back is the way out reversed. Asking the agent to type it again
      // is asking them to mistype it.
      legs: [out, { from: out.to, to: out.from, date: back?.date || out.date }],
    };
  }
  return { ...query, legs: query.legs.filter((leg) => leg.from && leg.to && leg.date) };
}

export function SearchPanel({
  query,
  onChange,
  onSearch,
  busy,
}: {
  query: SearchQuery;
  onChange: (next: SearchQuery) => void;
  onSearch: () => void;
  busy?: boolean;
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function setLeg(index: number, changes: Partial<SearchLeg>) {
    onChange({
      ...query,
      legs: query.legs.map((leg, i) => (i === index ? { ...leg, ...changes } : leg)),
    });
  }

  function swap(index: number) {
    const leg = query.legs[index];
    setLeg(index, { from: leg.to, to: leg.from });
  }

  const ready = query.tripType === "multi"
    ? query.legs.some((leg) => leg.from && leg.to && leg.date)
    : Boolean(query.legs[0]?.from && query.legs[0]?.to && query.legs[0]?.date);

  const swapButton = (index: number) => (
    <button
      type="button"
      className="fl-press"
      onClick={() => swap(index)}
      title="Swap"
      style={{
        position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", zIndex: 5,
        width: 30, height: 30, borderRadius: "50%", border: `1px solid ${T.border}`,
        background: T.card, color: T.accent, cursor: "pointer", fontSize: 13, fontFamily: "inherit",
      }}
    >
      ⇄
    </button>
  );

  return (
    <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Segmented<TripType>
          value={query.tripType}
          onChange={(tripType) => onChange({ ...query, tripType })}
          options={[
            { value: "oneway", label: "One Way" },
            { value: "round", label: "Round Trip" },
            { value: "multi", label: "Multi City" },
          ]}
        />
      </div>

      {query.tripType === "multi" ? (
        <div style={{ display: "grid", gap: 12 }}>
          {query.legs.map((leg, index) => (
            <div key={index} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) minmax(0,150px) auto", gap: 12, alignItems: "end" }}>
              <Field label={`Leg ${index + 1} — From`}>
                <AirportInput value={leg.from} onChange={(code) => setLeg(index, { from: code })} />
              </Field>
              <Field label="To">
                <AirportInput value={leg.to} onChange={(code) => setLeg(index, { to: code })} />
              </Field>
              <Field label="Date">
                <input
                  className="fl-in"
                  type="date"
                  min={today}
                  value={leg.date}
                  onChange={(event) => setLeg(index, { date: event.target.value })}
                  style={{ ...inputStyle, minHeight: 46 }}
                />
              </Field>
              <button
                type="button"
                onClick={() => onChange({ ...query, legs: query.legs.filter((_, i) => i !== index) })}
                disabled={query.legs.length <= 2}
                style={{
                  height: 46, padding: "0 12px", borderRadius: 10, border: `1px solid ${T.border}`,
                  background: T.panel, color: query.legs.length <= 2 ? T.muted : "#f87171",
                  cursor: query.legs.length <= 2 ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                }}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...query, legs: [...query.legs, { from: "", to: "", date: today }] })}
            style={{
              justifySelf: "start", border: `1px dashed ${T.border}`, background: "transparent",
              color: T.accent, borderRadius: 10, padding: "8px 14px", fontSize: 12.5, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            + Add another leg
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: query.tripType === "round"
              ? "minmax(0,1.1fr) minmax(0,1.1fr) minmax(0,.9fr) minmax(0,.9fr)"
              : "minmax(0,1.1fr) minmax(0,1.1fr) minmax(0,.9fr)",
            gap: 12,
          }}
        >
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 12 }}>
            <Field label="From" required>
              <AirportInput value={query.legs[0]?.from || ""} onChange={(code) => setLeg(0, { from: code })} placeholder="City or airport" />
            </Field>
          </div>

          <div style={{ position: "relative" }}>
            <Field label="To" required>
              <AirportInput value={query.legs[0]?.to || ""} onChange={(code) => setLeg(0, { to: code })} placeholder="City or airport" />
            </Field>
            <div style={{ position: "absolute", left: -6, top: 26, width: 12, height: 46 }}>{swapButton(0)}</div>
          </div>

          <Field label="Departure" required>
            <input
              className="fl-in"
              type="date"
              min={today}
              value={query.legs[0]?.date || ""}
              onChange={(event) => setLeg(0, { date: event.target.value })}
              style={{ ...inputStyle, minHeight: 46 }}
            />
          </Field>

          {query.tripType === "round" ? (
            <Field label="Return" required>
              <input
                className="fl-in"
                type="date"
                // A return before the outbound is not a trip. The box refuses it
                // rather than the search coming back empty with no reason given.
                min={query.legs[0]?.date || today}
                value={query.legs[1]?.date || ""}
                onChange={(event) => setLeg(1, { date: event.target.value })}
                style={{ ...inputStyle, minHeight: 46 }}
              />
            </Field>
          ) : null}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto", gap: 12, alignItems: "end" }}>
        <Field label="Passengers">
          <PaxPicker value={query.pax} onChange={(pax) => onChange({ ...query, pax })} />
        </Field>
        <Field label="Cabin class">
          <CabinSelect value={query.cabin} onChange={(cabin: CabinClass) => onChange({ ...query, cabin })} />
        </Field>
        <div style={{ paddingBottom: 0 }}>
          <PrimaryButton onClick={onSearch} disabled={!ready || busy}>
            {busy ? "Searching…" : "🔍 Search Flights"}
          </PrimaryButton>
        </div>
      </div>
    </section>
  );
}

export type { PaxCounts };
