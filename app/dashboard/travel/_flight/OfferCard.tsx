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
} from "@/lib/travel/flightSearch";
import { Money, T } from "./ui";

function LegRow({ leg, compact }: { leg: FlightOffer["legs"][number]; compact?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 12 : 18, flexWrap: "wrap" }}>
      <div style={{ minWidth: 64 }}>
        <div style={{ fontSize: compact ? 15 : 17, fontWeight: 800, color: T.text, lineHeight: 1.2 }}>{leg.departAt}</div>
        <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{leg.from}</div>
      </div>

      <div style={{ flex: "1 1 120px", minWidth: 110, textAlign: "center" }}>
        <div style={{ fontSize: 10.5, color: T.muted, marginBottom: 3 }}>{formatDuration(leg.durationMinutes)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", border: `1.5px solid ${T.muted}`, flexShrink: 0 }} />
          <span style={{ flex: 1, height: 1, background: T.border }} />
          {leg.via.map((code) => (
            <span key={code} style={{ width: 5, height: 5, borderRadius: "50%", background: T.muted, flexShrink: 0 }} />
          ))}
          {leg.via.length ? <span style={{ flex: 1, height: 1, background: T.border }} /> : null}
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.muted, flexShrink: 0 }} />
        </div>
        <div style={{ fontSize: 10.5, color: leg.via.length ? T.muted : "#34d399", marginTop: 3, fontWeight: 600 }}>
          {describeStops(leg)}
        </div>
      </div>

      <div style={{ minWidth: 64 }}>
        <div style={{ fontSize: compact ? 15 : 17, fontWeight: 800, color: T.text, lineHeight: 1.2 }}>
          {leg.arriveAt}
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

export function OfferCard({
  offer,
  pax,
  selected,
  best,
  cheapest,
  onSelect,
}: {
  offer: FlightOffer;
  pax: PaxCounts;
  selected?: boolean;
  best?: boolean;
  cheapest?: boolean;
  onSelect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const pricing = priceOffer(offer, pax, 0);
  const perAdult = offer.baseFare + offer.taxes;
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
        <Badge tone={offer.source === "history" ? "#a78bfa" : "#f4c25b"}>
          {offer.source === "history" ? "Your past fare" : "Indicative fare"}
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
                {offer.legs.map((leg) => leg.flightNo).join(" · ")}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {offer.legs.map((leg, index) => (
              <LegRow key={`${leg.flightNo}-${index}`} leg={leg} compact={offer.legs.length > 1} />
            ))}
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Chip icon="🧳">{offer.baggageKg} kg checked</Chip>
            <Chip icon="🎒">{offer.cabinBaggageKg} kg cabin</Chip>
            {offer.mealsIncluded ? <Chip icon="🍽">Meals included</Chip> : null}
            <Chip icon={offer.refundable ? "↩️" : "🚫"}>{offer.refundable ? "Refundable (with fee)" : "Non-refundable"}</Chip>
          </div>
        </div>

        <div style={{ textAlign: "right", display: "grid", gap: 8, justifyItems: "end" }}>
          <div>
            <Money value={perAdult} size={19} weight={800} />
            <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>per adult</div>
          </div>
          {pricing.count > 1 ? (
            <div style={{ fontSize: 11, color: T.muted }}>
              <Money value={pricing.total} size={12} weight={700} tone={T.muted} /> for {pricing.count}
            </div>
          ) : null}
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
                {leg.flightNo} — {leg.from} {leg.departAt} → {leg.to} {leg.arriveAt}
                {leg.arrivesNextDay ? " (next day)" : ""} · {formatDuration(leg.durationMinutes)} · {describeStops(leg)}
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: T.muted, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
            Fare per adult: base <Money value={offer.baseFare} size={11.5} weight={700} tone={T.muted} />
            {" + taxes "}<Money value={offer.taxes} size={11.5} weight={700} tone={T.muted} />
            {" · supplier cost "}<Money value={offer.supplierCost} size={11.5} weight={700} tone={T.muted} />
          </div>
        </div>
      ) : null}
    </article>
  );
}
