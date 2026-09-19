"use client";

/**
 * Customers — everything one person has ever bought, in order.
 *
 * "You booked me last year" is a sentence every travel desk hears, and
 * answering it used to mean opening six screens. Each desk knew its own part;
 * nothing put them in order.
 *
 * Built for somebody on the phone: what they owe first, then what happened,
 * newest at the top.
 */

import { useCallback, useEffect, useState } from "react";

import { useResponsive } from "@/hooks/useResponsive";
import { useCurrency } from "@/lib/useCurrency";
import { T, ff, flightCss, inputStyle } from "../_flight/ui";

type Event = {
  at: string;
  kind: string;
  icon: string;
  title: string;
  detail: string;
  amount: number | null;
  href: string | null;
  tone: "money" | "service" | "note";
};

type Timeline = {
  customer: { name: string; account: { id: string; phone: string | null; email: string | null } | null; contact: { phone: string | null; email: string | null } | null };
  totals: { trips: number; tripValue: number; margin: number; invoiced: number; paid: number; outstanding: number };
  followUp: string | null;
  events: Event[];
};

export default function TravelCustomersPage() {
  const { isMobile } = useResponsive();
  const symbol = useCurrency();
  const money = (n: number) => `${symbol}${Math.round(Number(n) || 0).toLocaleString()}`;

  const [names, setNames] = useState<string[]>([]);
  const [chosen, setChosen] = useState("");
  const [search, setSearch] = useState("");
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(false);

  /* The customers this desk has actually dealt with — the parties on the chart
     of accounts, which is what every invoice and receipt already points at. */
  useEffect(() => {
    fetch("/api/accounts?partyType=CUSTOMER", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        setNames(rows.map((a: { name?: unknown }) => String(a?.name || "")).filter(Boolean).sort());
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async (name: string) => {
    if (!name) { setTimeline(null); return; }
    setLoading(true);
    try {
      const body = await fetch(`/api/travel/customer-timeline?customer=${encodeURIComponent(name)}`).then((r) => (r.ok ? r.json() : null));
      setTimeline(body && !body.error ? body : null);
    } catch {
      setTimeline(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(chosen); }, [chosen, load]);

  const cell = { ...inputStyle, padding: "9px 11px", fontSize: 13 };
  const visible = names.filter((n) => !search || n.toLowerCase().includes(search.toLowerCase())).slice(0, 200);

  const toneColour = (tone: Event["tone"]) =>
    tone === "money" ? "#34d399" : tone === "note" ? "#a78bfa" : T.accent;

  return (
    <div style={{ padding: isMobile ? 16 : "24px 28px", fontFamily: ff, color: T.text, maxWidth: "100%", overflow: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: flightCss }} />

      <header style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap" }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "grid", placeItems: "center", background: "linear-gradient(135deg,var(--accent),var(--accent-strong))", fontSize: 19 }}>🗂</span>
        <div style={{ minWidth: 0, flex: "1 1 240px" }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 21 : 25, fontWeight: 800, color: T.text }}>Customers</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: T.muted }}>
            Everything one person has bought — trips, tickets, visas, invoices and payments — in one order.
          </p>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "minmax(240px,300px) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
        <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 14, display: "grid", gap: 10, minWidth: 0 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a customer" style={cell} className="fl-in" />
          <div style={{ display: "grid", gap: 4, maxHeight: 480, overflowY: "auto" }} className="fl-scroll">
            {!visible.length ? (
              <div style={{ fontSize: 12.5, color: T.muted, padding: "8px 4px", lineHeight: 1.6 }}>
                {names.length ? `Nobody matches “${search}”.` : "No customers yet. They appear here once a trip is invoiced or a receipt is taken."}
              </div>
            ) : visible.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setChosen(name)}
                style={{
                  textAlign: "left", border: `1px solid ${name === chosen ? "var(--accent)" : "transparent"}`,
                  background: name === chosen ? "var(--accent-soft)" : "transparent",
                  color: name === chosen ? T.accent : T.text,
                  borderRadius: 9, padding: "8px 10px", fontSize: 12.5, fontWeight: name === chosen ? 700 : 500,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </section>

        <section style={{ minWidth: 0, display: "grid", gap: 14 }}>
          {!chosen ? (
            <div style={{ border: `1px dashed ${T.border}`, borderRadius: 14, padding: "40px 20px", textAlign: "center", color: T.muted, fontSize: 13.5, lineHeight: 1.6, background: T.card }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🗂</div>
              Pick a customer to see everything they have bought, and what they still owe.
            </div>
          ) : loading ? (
            <div style={{ fontSize: 13, color: T.muted }}>Loading…</div>
          ) : !timeline ? (
            <div style={{ fontSize: 13, color: T.muted }}>Nothing on file for {chosen}.</div>
          ) : (
            <>
              {/* What they owe, first — it is the reason the desk looked. */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
                {[
                  { label: "Trips", value: String(timeline.totals.trips), tone: T.accent },
                  { label: "Invoiced", value: money(timeline.totals.invoiced), tone: "#60a5fa" },
                  { label: "Paid", value: money(timeline.totals.paid), tone: "#34d399" },
                  {
                    label: "Outstanding",
                    value: money(timeline.totals.outstanding),
                    tone: timeline.totals.outstanding > 0 ? "#f87171" : "#34d399",
                  },
                  { label: "Your Margin", value: money(timeline.totals.margin), tone: timeline.totals.margin >= 0 ? "#34d399" : "#f87171" },
                ].map((card) => (
                  <div key={card.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 16px", minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>{card.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: card.tone }}>{card.value}</div>
                  </div>
                ))}
              </div>

              {timeline.followUp ? (
                <div style={{ border: "1px solid rgba(167,139,250,.4)", background: "rgba(167,139,250,.1)", borderRadius: 12, padding: "10px 14px", fontSize: 12.5, color: "#a78bfa" }}>
                  💬 Follow-up due {String(timeline.followUp).slice(0, 10)}
                </div>
              ) : null}

              <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: isMobile ? 14 : 18 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: T.text, marginBottom: 14 }}>{chosen}</div>

                {!timeline.events.length ? (
                  <div style={{ fontSize: 13, color: T.muted }}>Nothing recorded against this customer yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 0 }}>
                    {timeline.events.map((event, index) => (
                      <div key={`${event.kind}-${index}`} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        {/* The spine of the timeline: a dot, and a line down to
                            the next thing that happened. */}
                        <div style={{ display: "grid", justifyItems: "center", width: 24, flexShrink: 0 }}>
                          <span style={{ fontSize: 13, lineHeight: "20px" }}>{event.icon}</span>
                          {index < timeline.events.length - 1 ? (
                            <span style={{ width: 1, flex: 1, minHeight: 26, background: T.border }} />
                          ) : null}
                        </div>
                        <div style={{ minWidth: 0, flex: 1, paddingBottom: index < timeline.events.length - 1 ? 16 : 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                              {event.href ? (
                                <a href={event.href} style={{ color: T.text, textDecoration: "none" }}>{event.title}</a>
                              ) : event.title}
                            </span>
                            <span style={{ fontSize: 11.5, color: T.muted, whiteSpace: "nowrap" }}>{event.at}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                            <span style={{ fontSize: 11.5, color: T.muted, minWidth: 0 }}>{event.detail}</span>
                            {event.amount != null ? (
                              <span style={{ fontSize: 12, fontWeight: 700, color: toneColour(event.tone), whiteSpace: "nowrap" }}>
                                {money(event.amount)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Said out loud, because it is a real limit of this screen. */}
                <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 14, paddingTop: 11, fontSize: 10.5, color: T.muted, lineHeight: 1.6 }}>
                  Invoices and payments are matched on the customer&rsquo;s account. Tickets, visas and the
                  other desk records are matched on the name they store, so two customers with the same
                  name would share a timeline until those desks record a traveller.
                </div>
              </section>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
