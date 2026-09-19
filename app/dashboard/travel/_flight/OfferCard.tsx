"use client";

/**
 * One offer on the results list.
 *
 * A leg per row rather than a single line, because a return is two flights and
 * an agent who reads only the outbound sells a seat home on the wrong day. The
 * fare's provenance sits on the card itself — a price with no source on it is
 * the one that gets quoted by accident.
 */

import { useState } from "react";

import {
  CABIN_LABELS,
  describeStops,
  formatDuration,
  priceOffer,
  type FlightOffer,
  type PaxCounts,
  type TripType,
} from "@/lib/travel/flightSearch";
import { Money, T, inputStyle } from "./ui";

function LegRow({ leg, compact }: { leg: FlightOffer["legs"][number]; compact?: boolean }) {
  /* No recorded timetable means no clock on the card. The sector, the distance
     and roughly how long it takes are still real and still worth showing; the
     departure time is not ours to invent. */
  const timed = Boolean(leg.departAt);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 12 : 18, flexWrap: "wrap" }}>
      <div style={{ minWidth: 64 }}>
        <div style={{ fontSize: compact ? 15 : 17, fontWeight: 800, color: timed ? T.text : T.muted, lineHeight: 1.2 }}>
          {timed ? leg.departAt : "--:--"}
        </div>
        <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{leg.from}</div>
      </div>

      <div style={{ flex: "1 1 120px", minWidth: 110, textAlign: "center" }}>
        <div style={{ fontSize: 10.5, color: T.muted, marginBottom: 3 }}>
          {leg.durationIsEstimate ? "about " : ""}{formatDuration(leg.durationMinutes)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", border: `1.5px solid ${T.muted}`, flexShrink: 0 }} />
          <span style={{ flex: 1, height: 1, background: T.border }} />
          {leg.via.map((code) => (
            <span key={code} style={{ width: 5, height: 5, borderRadius: "50%", background: T.muted, flexShrink: 0 }} />
          ))}
          {leg.via.length ? <span style={{ flex: 1, height: 1, background: T.border }} /> : null}
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.muted, flexShrink: 0 }} />
        </div>
        <div style={{ fontSize: 10.5, color: leg.via.length || !timed ? T.muted : "#34d399", marginTop: 3, fontWeight: 600 }}>
          {timed ? describeStops(leg) : `Likely ${describeStops(leg).toLowerCase()}`}
        </div>
      </div>

      <div style={{ minWidth: 64 }}>
        <div style={{ fontSize: compact ? 15 : 17, fontWeight: 800, color: timed ? T.text : T.muted, lineHeight: 1.2 }}>
          {timed ? leg.arriveAt : "--:--"}
          {/* A red-eye that lands the next morning is not the same flight as
              one that lands the same evening. */}
          {leg.arrivesNextDay ? <span style={{ fontSize: 10, color: "#f4c25b", marginLeft: 3 }}>+1</span> : null}
        </div>
        <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{leg.to}</div>
      </div>
    </div>
  );
}

function Chip({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: T.muted, whiteSpace: "nowrap" }}>
      <span style={{ fontSize: 12 }}>{icon}</span>
      {children}
    </span>
  );
}

function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase",
        padding: "3px 8px", borderRadius: 999, color: tone,
        background: `${tone}1f`, border: `1px solid ${tone}55`, whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/**
 * Put the fare in from here, rather than going to another page to do it.
 *
 * The sector, the airline, the cabin and the trip type are all on the card
 * already — asking the operator to retype them on Contract Fares is asking
 * them not to bother, and a fare nobody records is a fare the next search
 * cannot show either. Three numbers and it is saved for good.
 */
function QuickFare({
  offer,
  tripType,
  onSaved,
}: {
  offer: FlightOffer;
  tripType: TripType;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ sellFare: "", taxes: "", netCost: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const from = offer.legs[0]?.from || "";
  const to = offer.legs[0]?.to || "";
  const sell = Number(form.sellFare) || 0;
  const taxes = Number(form.taxes) || 0;
  const net = Number(form.netCost) || 0;
  const margin = sell + taxes - net;
  const ready = sell > 0 && net > 0;

  async function save() {
    setBusy(true);
    setError("");
    try {
      const today = new Date().toISOString().slice(0, 10);
      const response = await fetch("/api/business-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "travel_fare",
          title: `${from} → ${to} · ${offer.airline}`,
          status: "active",
          amount: sell,
          date: today,
          data: {
            from, to,
            airline: offer.airline,
            // Who bills you. The carrier by default; change it on Contract
            // Fares if you actually buy through a consolidator.
            supplier: offer.supplier || offer.airline,
            cabin: offer.cabin,
            tripType: tripType === "round" ? "round" : "oneway",
            sellFare: sell,
            taxes,
            netCost: net,
            baggageKg: 0,
            validTo: null,
          },
        }),
      });
      if (!response.ok) throw new Error(await response.text().catch(() => "Could not save"));
      onSaved?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the fare");
    } finally {
      setBusy(false);
    }
  }

  const cell: React.CSSProperties = { ...inputStyle, padding: "7px 9px", fontSize: 12.5, textAlign: "right" };

  if (!open) {
    return (
      <div style={{ textAlign: "right", maxWidth: 200 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.muted }}>No fare on file</div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            marginTop: 5, border: `1px solid ${T.accent}55`, background: "var(--accent-soft)",
            color: T.accent, borderRadius: 9, padding: "6px 12px", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
          }}
        >
          + Add your fare
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: 210, display: "grid", gap: 7, textAlign: "left" }}>
      <div style={{ fontSize: 11, color: T.muted }}>
        Per adult, {tripType === "round" ? "return" : "one way"} — {from} → {to}
      </div>
      {([
        ["sellFare", "You sell for"],
        ["taxes", "Taxes"],
        ["netCost", "You pay supplier"],
      ] as const).map(([key, label]) => (
        <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
          <span style={{ fontSize: 11.5, color: T.muted, whiteSpace: "nowrap" }}>{label}</span>
          <input
            className="fl-in"
            type="number"
            min={0}
            value={form[key]}
            onChange={(event) => setForm({ ...form, [key]: event.target.value })}
            style={{ ...cell, width: 96 }}
          />
        </label>
      ))}

      {ready ? (
        <div style={{ fontSize: 11.5, color: margin >= 0 ? "#34d399" : "#f87171", textAlign: "right", fontWeight: 700 }}>
          Margin {margin.toLocaleString()}
        </div>
      ) : null}
      {error ? <div style={{ fontSize: 11, color: "#f87171" }}>{error}</div> : null}

      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{ border: "none", background: "transparent", color: T.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!ready || busy}
          onClick={save}
          className="fl-press"
          style={{
            border: "none", borderRadius: 9, padding: "7px 14px", fontSize: 12, fontWeight: 800,
            background: ready ? "linear-gradient(135deg,var(--accent),var(--accent-strong))" : T.panel2,
            color: ready ? "#06121f" : T.muted, cursor: ready && !busy ? "pointer" : "not-allowed",
            fontFamily: "inherit",
          }}
        >
          {busy ? "Saving…" : "Save fare"}
        </button>
      </div>
    </div>
  );
}

export function OfferCard({
  offer,
  pax,
  selected,
  best,
  cheapest,
  onSelect,
  tripType = "oneway",
  onFareSaved,
}: {
  offer: FlightOffer;
  pax: PaxCounts;
  selected?: boolean;
  best?: boolean;
  cheapest?: boolean;
  onSelect: () => void;
  tripType?: TripType;
  onFareSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const pricing = priceOffer(offer, pax, 0);
  /* Null where nothing real says what this sector sells for. The card shows
     the flight and asks for a fare instead of printing one it made up. */
  const perAdult = offer.baseFare == null ? null : offer.baseFare + (offer.taxes ?? 0);
  const direct = offer.legs.every((leg) => !leg.via.length);

  return (
    <article
      className="fl-card"
      style={{
        border: `1px solid ${selected ? "var(--accent)" : T.border}`,
        boxShadow: selected ? "0 0 0 1px var(--accent)" : undefined,
        borderRadius: 14,
        background: T.card,
        padding: 16,
        display: "grid",
        gap: 12,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {best ? <Badge tone="#34d399">Best option</Badge> : null}
        {cheapest && !best ? <Badge tone="#34d399">Cheapest</Badge> : null}
        {direct ? <Badge tone="#60a5fa">Direct</Badge> : null}
        {/* Separate from the fare badge on purpose: a real contract fare on a
            sector with no recorded timetable is both at once. */}
        {offer.legs.every((leg) => leg.departAt) ? null : <Badge tone="#94a3b8">No schedule</Badge>}
        {/* Said on every card, because a price whose provenance is not on it is
            the one that gets quoted by accident. */}
        <Badge tone={offer.source === "contract" ? "#34d399" : offer.source === "history" ? "#a78bfa" : "#94a3b8"}>
          {offer.source === "contract" ? "Your contract fare" : offer.source === "history" ? "Your past fare" : "No fare on file"}
        </Badge>
        <span style={{ fontSize: 11, color: T.muted, marginLeft: "auto" }}>{CABIN_LABELS[offer.cabin]}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: T.panel2, border: `1px solid ${T.border}`,
                display: "grid", placeItems: "center",
                fontSize: 12, fontWeight: 800, color: T.accent,
              }}
            >
              {offer.airlineCode}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {offer.airline}
              </div>
              <div style={{ fontSize: 11, color: T.muted }}>
                {offer.legs.some((leg) => leg.flightNo)
                  ? offer.legs.map((leg) => leg.flightNo).filter(Boolean).join(" · ")
                  : "Flight number not recorded"}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {offer.legs.map((leg, index) => (
              <LegRow key={`${leg.flightNo}-${index}`} leg={leg} compact={offer.legs.length > 1} />
            ))}
          </div>

          {/* A fare rule is shown only where something actually told us what it
              is — today, only a contract fare the agency entered itself. The
              rest says so, because an empty row invites the agent to assume
              the usual and a guessed one invites them to quote it. */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {offer.baggageKg != null ? <Chip icon="🧳">{offer.baggageKg} kg checked</Chip> : null}
            {offer.cabinBaggageKg != null ? <Chip icon="🎒">{offer.cabinBaggageKg} kg cabin</Chip> : null}
            {offer.mealsIncluded != null ? <Chip icon="🍽">{offer.mealsIncluded ? "Meals included" : "No meals"}</Chip> : null}
            {offer.refundable != null ? (
              <Chip icon={offer.refundable ? "↩️" : "🚫"}>{offer.refundable ? "Refundable (with fee)" : "Non-refundable"}</Chip>
            ) : null}
            {offer.baggageKg == null && offer.refundable == null ? (
              <Chip icon="❔">Baggage and fare rules — confirm with the airline</Chip>
            ) : null}
          </div>
        </div>

        <div style={{ textAlign: "right", display: "grid", gap: 8, justifyItems: "end" }}>
          {perAdult != null ? (
            <>
              <div>
                <Money value={perAdult} size={19} weight={800} />
                <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>per adult</div>
              </div>
              {pricing && pricing.count > 1 ? (
                <div style={{ fontSize: 11, color: T.muted }}>
                  <Money value={pricing.total} size={12} weight={700} tone={T.muted} /> for {pricing.count}
                </div>
              ) : null}
            </>
          ) : (
            <QuickFare offer={offer} tripType={tripType} onSaved={onFareSaved} />
          )}
          <button
            type="button"
            className="fl-press"
            onClick={onSelect}
            style={{
              border: "none", borderRadius: 10, padding: "9px 18px",
              background: selected ? "#34d399" : "linear-gradient(135deg,var(--accent),var(--accent-strong))",
              color: "#06121f", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            {selected ? "Selected ✓" : "Select →"}
          </button>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{ background: "none", border: "none", padding: 0, color: T.accent, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
        >
          {open ? "Hide flight details ▲" : "View flight details ▼"}
        </button>
        <span style={{ fontSize: 10.5, color: T.muted, textAlign: "right" }}>{offer.sourceNote}</span>
      </div>

      {open ? (
        <div style={{ display: "grid", gap: 10, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 11, padding: 12 }}>
          {offer.legs.map((leg, index) => (
            <div key={`detail-${index}`} style={{ display: "grid", gap: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.accent, textTransform: "uppercase", letterSpacing: ".05em" }}>
                {offer.legs.length > 1 ? (index === 0 ? "Outbound" : index === 1 ? "Return" : `Leg ${index + 1}`) : "Flight"} · {leg.date}
              </div>
              <div style={{ fontSize: 12.5, color: T.text }}>
                {leg.departAt ? (
                  <>
                    {leg.flightNo ? `${leg.flightNo} — ` : ""}{leg.from} {leg.departAt} → {leg.to} {leg.arriveAt}
                    {leg.arrivesNextDay ? " (next day)" : ""} · {formatDuration(leg.durationMinutes)} · {describeStops(leg)}
                  </>
                ) : (
                  <>
                    {leg.from} → {leg.to} · about {formatDuration(leg.durationMinutes)} · likely {describeStops(leg).toLowerCase()}
                    <span style={{ color: T.muted }}>
                      {" "}— no timetable recorded for this sector, so no flight number or times.
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: T.muted, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
            {offer.baseFare != null ? (
              <>
                Fare per adult: base <Money value={offer.baseFare} size={11.5} weight={700} tone={T.muted} />
                {" + taxes "}<Money value={offer.taxes ?? 0} size={11.5} weight={700} tone={T.muted} />
                {" · supplier cost "}<Money value={offer.supplierCost ?? 0} size={11.5} weight={700} tone={T.muted} />
              </>
            ) : (
              <>
                No fare recorded for this sector, so none is shown. Add what you buy and sell it
                for on Contract Fares, or type the fares into the booking as you go.
              </>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}
