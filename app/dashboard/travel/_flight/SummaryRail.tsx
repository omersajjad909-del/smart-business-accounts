"use client";

/**
 * What the booking comes to, kept in view while it is being built.
 *
 * The markup lives here rather than on a settings page because it is decided
 * per booking, against this customer and this fare — and because an agent who
 * cannot see the profit while they are setting the price will, sooner or later,
 * sell a seat below cost.
 */

import {
  CABIN_LABELS,
  describePax,
  describeRoute,
  priceOffer,
  type FlightOffer,
  type OfferPricing,
  type PaxCounts,
} from "@/lib/travel/flightSearch";
import { Money, PrimaryButton, T, inputStyle } from "./ui";

function Line({
  label,
  children,
  strong,
  tone,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  strong?: boolean;
  tone?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
      <span style={{ fontSize: strong ? 13.5 : 12.5, color: strong ? T.text : T.muted, fontWeight: strong ? 700 : 500 }}>
        {label}
      </span>
      <span style={{ textAlign: "right", color: tone }}>{children}</span>
    </div>
  );
}

export function SummaryRail({
  offer,
  pax,
  markup,
  onMarkupChange,
  onChangeFlight,
  cta,
  footnotes,
  pricing: override,
  fareLabel,
}: {
  offer: FlightOffer | null;
  pax: PaxCounts;
  markup: number;
  onMarkupChange?: (next: number) => void;
  onChangeFlight?: () => void;
  cta?: { label: string; onClick: () => void; disabled?: boolean };
  footnotes?: string[];
  /* Once the passenger rows are being edited, they are the booking — a summary
     that goes on pricing the original offer would show a total the invoice is
     never going to match. The step that owns the rows passes their sums here. */
  pricing?: OfferPricing | null;
  fareLabel?: string;
}) {
  const pricing = override ?? (offer ? priceOffer(offer, pax, markup) : null);

  return (
    <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
      <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: T.text, display: "flex", alignItems: "center", gap: 7 }}>
            <span>🧾</span> Booking Summary
          </h2>
          {offer && onChangeFlight ? (
            <button
              type="button"
              onClick={onChangeFlight}
              style={{ background: "none", border: "none", padding: 0, color: T.accent, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              Change
            </button>
          ) : null}
        </div>

        {!offer ? (
          <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.55 }}>
            No flight selected yet. Search a route and pick a flight — the fare, the taxes and your margin will all be worked out here.
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span
                  style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: T.panel2,
                    border: `1px solid ${T.border}`, display: "grid", placeItems: "center",
                    fontSize: 11, fontWeight: 800, color: T.accent,
                  }}
                >
                  {offer.airlineCode}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>{offer.airline}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{CABIN_LABELS[offer.cabin]} · {describeRoute(offer.legs)}</div>
                </div>
              </div>

              {offer.legs.map((leg, index) => (
                <div
                  key={`${leg.flightNo}-${index}`}
                  style={{ borderTop: `1px solid ${T.border}`, paddingTop: 8, display: "grid", gap: 2 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>{leg.from} → {leg.to}</span>
                    <span style={{ fontSize: 11.5, color: T.muted }}>{leg.date}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: T.muted }}>
                    {leg.departAt
                      ? `${leg.departAt} – ${leg.arriveAt}${leg.arrivesNextDay ? " (+1)" : ""}${leg.flightNo ? ` · ${leg.flightNo}` : ""}`
                      : "Times to be confirmed with the airline"}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, display: "grid", gap: 7 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 2 }}>Passengers</div>
              <div style={{ fontSize: 12.5, color: T.muted }}>{describePax(pax)}</div>
            </div>

            {pricing ? (
              <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, display: "grid", gap: 9 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 2 }}>Price Details</div>
                <Line label={fareLabel ? `${fareLabel} (${pricing.count} pax)` : `Base fare (${pricing.count} pax)`}>
                  <Money value={pricing.baseFare} size={12.5} weight={600} />
                </Line>
                <Line label="Taxes & charges">
                  <Money value={pricing.taxes} size={12.5} weight={600} />
                </Line>

                {/* Hidden once the rows are the truth and nothing was added on
                    top: a "markup: 0" line under fares that already include it
                    reads as though the agency were working for nothing. */}
                {!onMarkupChange && !pricing.markup ? null : onMarkupChange ? (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 12.5, color: T.muted }}>Agency markup</span>
                    <input
                      className="fl-in"
                      type="number"
                      min={0}
                      value={markup || ""}
                      placeholder="0"
                      onChange={(event) => onMarkupChange(Math.max(0, Number(event.target.value) || 0))}
                      style={{ ...inputStyle, width: 116, padding: "7px 10px", fontSize: 12.5, textAlign: "right", fontWeight: 700 }}
                    />
                  </div>
                ) : (
                  <Line label="Agency markup">
                    <Money value={pricing.markup} size={12.5} weight={600} />
                  </Line>
                )}

                <div style={{ borderTop: `1px dashed ${T.border}`, paddingTop: 10 }}>
                  <Line label="Total price" strong>
                    <Money value={pricing.total} size={19} weight={800} tone={T.accent} />
                  </Line>
                </div>

                {/* Not the same number as the markup wherever the agency buys
                    below the published fare — this is the one that matters, so
                    this is the one that is shown. */}
                <div
                  style={{
                    marginTop: 4,
                    display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center",
                    background: pricing.profit >= 0 ? "rgba(52,211,153,.12)" : "rgba(248,113,113,.12)",
                    border: `1px solid ${pricing.profit >= 0 ? "rgba(52,211,153,.35)" : "rgba(248,113,113,.4)"}`,
                    borderRadius: 10, padding: "9px 12px",
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: pricing.profit >= 0 ? "#34d399" : "#f87171" }}>
                    {pricing.profit >= 0 ? "Your profit" : "Selling below cost"}
                  </span>
                  <Money value={pricing.profit} size={13.5} weight={800} tone={pricing.profit >= 0 ? "#34d399" : "#f87171"} />
                </div>

                <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>
                  Supplier cost <Money value={pricing.supplierCost} size={10.5} weight={700} tone={T.muted} /> — what {offer.supplier} bills you.
                </div>
              </div>
            ) : null}

            {cta ? (
              <PrimaryButton wide onClick={cta.onClick} disabled={cta.disabled}>
                {cta.label}
              </PrimaryButton>
            ) : null}
          </>
        )}
      </section>

      {footnotes?.length ? (
        <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: T.text, marginBottom: 9, display: "flex", alignItems: "center", gap: 7 }}>
            <span>ℹ️</span> Important information
          </div>
          <ul style={{ margin: 0, paddingLeft: 17, display: "grid", gap: 7 }}>
            {footnotes.map((note) => (
              <li key={note} style={{ fontSize: 11.5, color: T.muted, lineHeight: 1.5 }}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
