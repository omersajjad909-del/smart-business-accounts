"use client";

/**
 * Book Flight Ticket — the desk's path from "where do they want to go" to a
 * ticket file the accounts can see.
 *
 * Four steps, because that is the order the information actually arrives in:
 * the flight is chosen before the passports come out, the passports before the
 * money is agreed, and nothing is written to the ledger until all three are
 * settled. Steps one to three keep everything in the browser; only Confirm
 * writes, and it writes one record.
 *
 * That record is an ordinary travel_ticket — the same one the Airline Tickets
 * desk keeps. This is a better way in, not a second place where bookings live,
 * so invoicing, settlement and refunds all go on working untouched.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useResponsive } from "@/hooks/useResponsive";
import { alertToast } from "@/lib/toast-feedback";
import {
  PAX_TYPE_LABELS,
  emptyPassenger,
  suggestFare,
  totalPassengers,
  validatePassengers,
  type PaxType,
  type Passenger,
} from "@/lib/travelPassengers";
import {
  buildPassengers,
  describeRoute,
  type FlightOffer,
  type OfferPricing,
  type PaxCounts,
} from "@/lib/travel/flightSearch";
import { OfferCard } from "../_flight/OfferCard";
import { SearchPanel } from "../_flight/SearchPanel";
import { SummaryRail } from "../_flight/SummaryRail";
import { FareNotice, Field, GhostButton, Money, PrimaryButton, T, ff, flightCss, inputStyle } from "../_flight/ui";
import { authHeaders, sortOffers, takeSelection, useFlightSearch } from "../_flight/useFlightSearch";

const STEPS = ["Flight Details", "Passengers", "Review & Payment", "Confirmation"] as const;

const TITLES = ["Mr", "Mrs", "Ms", "Miss", "Mstr", "Dr"];

/** A reference the desk can say out loud, unique enough not to collide. */
function newBookingRef(): string {
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `TRV-${stamp}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

function paxFromPassengers(passengers: Passenger[]): PaxCounts {
  return {
    adults: passengers.filter((p) => p.type === "ADT").length,
    children: passengers.filter((p) => p.type === "CHD").length,
    infants: passengers.filter((p) => p.type === "INF").length,
  };
}

function Steps({ step, isMobile }: { step: number; isMobile: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, flexWrap: "wrap" }}>
      {STEPS.map((label, index) => {
        const n = index + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span
                style={{
                  width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center",
                  fontSize: 12, fontWeight: 800, flexShrink: 0,
                  background: done ? "#34d399" : active ? "var(--accent)" : T.panel2,
                  color: done || active ? "#06121f" : T.muted,
                  border: done || active ? "none" : `1px solid ${T.border}`,
                }}
              >
                {done ? "✓" : n}
              </span>
              {!isMobile || active ? (
                <span style={{ fontSize: 12, fontWeight: active ? 800 : 600, color: active ? T.text : T.muted, whiteSpace: "nowrap" }}>
                  {label}
                </span>
              ) : null}
            </div>
            {n < STEPS.length ? (
              <span style={{ width: isMobile ? 14 : 30, height: 2, background: done ? "#34d399" : T.border, borderRadius: 2 }} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Card({ title, icon, children, hint }: { title: string; icon: string; children: React.ReactNode; hint?: string }) {
  return (
    <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, display: "grid", gap: 14, minWidth: 0 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", background: "var(--accent-soft)", fontSize: 14, flexShrink: 0 }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{title}</div>
          {hint ? <div style={{ fontSize: 11.5, color: T.muted, marginTop: 1 }}>{hint}</div> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Problems({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div style={{ border: "1px solid rgba(248,113,113,.4)", background: "rgba(248,113,113,.1)", borderRadius: 11, padding: "11px 14px" }}>
      <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 5 }}>
        {items.map((item) => (
          <li key={item} style={{ fontSize: 12.5, color: "#f87171", lineHeight: 1.45 }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function BookFlightPage() {
  const router = useRouter();
  const { isMobile, isTablet } = useResponsive();
  const { query, setQuery, offers, notice, busy, error: searchError, searched, pricedFor, search } = useFlightSearch();

  const [step, setStep] = useState(1);
  const [offer, setOffer] = useState<FlightOffer | null>(null);
  const [markup, setMarkup] = useState(0);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [activePax, setActivePax] = useState(0);
  const [contact, setContact] = useState({ email: "", phone: "", altPhone: "" });
  const [booking, setBooking] = useState({
    bookingRef: "",
    pnr: "",
    supplier: "",
    status: "booked",
    paymentDue: "",
    customerName: "",
    notes: "",
  });
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ id: string; ref: string; sale: number; cost: number; margin: number } | null>(null);
  const [invoice, setInvoice] = useState<{ no: string; id: string } | null>(null);
  const [invoicing, setInvoicing] = useState(false);

  const pax = passengers.length ? paxFromPassengers(passengers) : pricedFor?.pax ?? query.pax;
  const totals = useMemo(() => totalPassengers(passengers), [passengers]);

  useEffect(() => {
    setBooking((current) => (current.bookingRef ? current : { ...current, bookingRef: newBookingRef() }));
  }, []);

  /* Airlines and consolidators this company already deals with. Re-typing them
     is how "Qatar Airways BSP" and "Qatar Airways Bsp" become two suppliers
     with half the payable each. */
  useEffect(() => {
    fetch("/api/accounts?partyType=SUPPLIER", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        setSuppliers(rows.map((a: { name?: unknown }) => String(a?.name || "")).filter(Boolean));
      })
      .catch(() => {});
  }, []);

  const chooseOffer = useCallback((next: FlightOffer, forPax: PaxCounts, withMarkup: number) => {
    setOffer(next);
    setPassengers(buildPassengers(next, forPax, withMarkup));
    setActivePax(0);
    setBooking((current) => ({ ...current, supplier: current.supplier || next.supplier }));
  }, []);

  /* A flight picked on the search page arrives here rather than being searched
     for a second time. */
  useEffect(() => {
    const handoff = takeSelection();
    if (!handoff) return;
    setMarkup(handoff.markup);
    chooseOffer(handoff.offer, handoff.query.pax, handoff.markup);
    setQuery(handoff.query);
    setStep(2);
  }, [chooseOffer, setQuery]);

  const visibleOffers = useMemo(() => sortOffers(offers, "recommended"), [offers]);

  function patchPassenger(index: number, changes: Partial<Passenger>) {
    setPassengers((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...changes };
        // The name on the ticket is the name on the passport, so it is written
        // from the two boxes that ask for it rather than typed a third time.
        if ("firstName" in changes || "lastName" in changes || "title" in changes) {
          next.name = [next.firstName, next.lastName].map((s) => (s || "").trim()).filter(Boolean).join(" ");
        }
        return next;
      }),
    );
  }

  function addPassenger(type: PaxType) {
    const adult = passengers.find((p) => p.type === "ADT" && p.fare > 0);
    const suggested = suggestFare(type, adult?.fare ?? 0, adult?.tax ?? 0);
    const cost = offer ? Math.round(offer.supplierCost * (type === "ADT" ? 1 : type === "CHD" ? 0.75 : 0.1)) : 0;
    setPassengers((prev) => [...prev, { ...emptyPassenger(type), ...suggested, cost }]);
    setActivePax(passengers.length);
  }

  function removePassenger(index: number) {
    setPassengers((prev) => prev.filter((_, i) => i !== index));
    setActivePax((current) => Math.max(0, Math.min(current, passengers.length - 2)));
  }

  /** What the summary shows once the rows, not the offer, are the booking. */
  const rowPricing: OfferPricing = useMemo(
    () => ({
      baseFare: totals.fare,
      taxes: totals.tax,
      supplierCost: totals.cost,
      markup: 0,
      total: totals.sale,
      profit: totals.margin,
      seats: totals.seats,
      count: totals.count,
    }),
    [totals],
  );

  const passengerProblems = useMemo(() => {
    const problems = validatePassengers(passengers);
    const missingDoc = passengers.filter((p) => !(p.passportNo || "").trim()).length;
    if (missingDoc && passengers.length) {
      problems.push(`${missingDoc} passenger${missingDoc > 1 ? "s have" : " has"} no passport number — the airline cannot issue without it.`);
    }
    if (!contact.phone.trim()) problems.push("A contact phone number is needed for booking updates.");
    return problems;
  }, [passengers, contact.phone]);

  const reviewProblems = useMemo(() => {
    const problems: string[] = [];
    if (!booking.bookingRef.trim()) problems.push("A booking reference is required.");
    if (!booking.supplier.trim()) problems.push("An airline or consolidator is required — it is the account the payable lands in.");
    // A seat that is actually held has a PNR. A quote does not yet.
    if (booking.status !== "quoted" && !booking.pnr.trim()) {
      problems.push(`A booking saved as "${booking.status}" needs its PNR.`);
    }
    if (totals.margin < 0) problems.push("This booking sells below what the supplier charges. Check the fares before saving.");
    return problems;
  }, [booking, totals.margin]);

  async function confirmBooking() {
    if (!offer) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/travel/book", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          bookingRef: booking.bookingRef.trim(),
          pnr: booking.pnr.trim(),
          supplier: booking.supplier.trim(),
          status: booking.status,
          paymentDue: booking.paymentDue,
          customerName: booking.customerName.trim(),
          notes: booking.notes.trim(),
          cabin: offer.cabin,
          legs: offer.legs,
          baggageKg: offer.baggageKg,
          markup,
          fareSource: offer.source,
          passengers,
          contact,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Could not save the booking");

      setDone({
        id: String(body.record?.id || ""),
        ref: booking.bookingRef.trim(),
        sale: Number(body.totals?.sale) || totals.sale,
        cost: Number(body.totals?.cost) || totals.cost,
        margin: Number(body.totals?.margin) || totals.margin,
      });
      setStep(4);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the booking");
    } finally {
      setSaving(false);
    }
  }

  async function raiseInvoice() {
    if (!done?.id) return;
    setInvoicing(true);
    setError("");
    try {
      const response = await fetch("/api/travel/create-invoice", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ recordId: done.id }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Failed to create invoice");
      setInvoice({ no: String(body.invoiceNo || ""), id: String(body.invoiceId || "") });
      alertToast(`Sales invoice ${body.invoiceNo} raised for ${done.ref}.`, "success", "Invoice Created");
    } catch (invoiceError) {
      setError(invoiceError instanceof Error ? invoiceError.message : "Failed to create invoice");
    } finally {
      setInvoicing(false);
    }
  }

  const railPricing = step === 1 ? null : rowPricing;
  const cell = { ...inputStyle, padding: "9px 11px", fontSize: 13 };

  return (
    <div style={{ padding: isMobile ? 16 : "24px 28px", fontFamily: ff, color: T.text, maxWidth: "100%", overflow: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: flightCss }} />

      <header style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap" }}>
        <span
          style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "grid", placeItems: "center",
            background: "linear-gradient(135deg,var(--accent),var(--accent-strong))", fontSize: 19,
          }}
        >
          ✈️
        </span>
        <div style={{ minWidth: 0, flex: "1 1 260px" }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 21 : 25, fontWeight: 800, color: T.text }}>Book Flight Ticket</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: T.muted }}>
            Search, select and book flights for your customers.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard/travel/tickets")}
          style={{
            border: `1px solid ${T.border}`, background: T.panel, color: T.text, borderRadius: 10,
            padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          ← Back to Tickets
        </button>
      </header>

      <div style={{ marginBottom: 18, overflowX: "auto" }} className="fl-scroll">
        <Steps step={step} isMobile={isMobile} />
      </div>

      {error ? (
        <div style={{ marginBottom: 14, border: "1px solid rgba(248,113,113,.4)", background: "rgba(248,113,113,.1)", color: "#f87171", borderRadius: 12, padding: "11px 14px", fontSize: 12.5 }}>
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isTablet || step === 4 ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(300px,340px)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
          {step === 1 ? (
            <>
              <FareNotice note={notice || undefined} />

              <Card title="Flight Information" icon="🛫" hint="Enter journey details to search available flights">
                <SearchPanel query={query} onChange={setQuery} onSearch={() => search()} busy={busy} />
              </Card>

              {searchError ? <Problems items={[searchError]} /> : null}

              {offer ? (
                <Card title="Selected Flight" icon="✅" hint="Change it by picking another from the list below">
                  <OfferCard offer={offer} pax={pax} selected onSelect={() => setOffer(null)} />
                </Card>
              ) : null}

              {searched ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>
                    {visibleOffers.length} flight{visibleOffers.length === 1 ? "" : "s"} found
                  </div>
                  {visibleOffers.map((row, index) => (
                    <OfferCard
                      key={row.id}
                      offer={row}
                      pax={pricedFor?.pax ?? query.pax}
                      selected={row.id === offer?.id}
                      best={index === 0}
                      onSelect={() => chooseOffer(row, pricedFor?.pax ?? query.pax, markup)}
                    />
                  ))}
                  {!visibleOffers.length ? (
                    <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, textAlign: "center", color: T.muted, fontSize: 13, background: T.card }}>
                      No carrier in the list flies this sector. Enter the booking by hand on the Airline Tickets desk.
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <PrimaryButton disabled={!offer} onClick={() => setStep(2)}>
                  Continue to Passenger Details →
                </PrimaryButton>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Card title="Passenger Details" icon="👥" hint="Enter passenger information exactly as it appears on the passport">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {passengers.map((row, index) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setActivePax(index)}
                      style={{
                        border: `1px solid ${index === activePax ? "var(--accent)" : T.border}`,
                        background: index === activePax ? "var(--accent-soft)" : T.panel,
                        color: index === activePax ? T.accent : T.muted,
                        borderRadius: 9, padding: "8px 13px", fontSize: 12.5, fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                      }}
                    >
                      {row.name.trim() || `Passenger ${index + 1}`} ({PAX_TYPE_LABELS[row.type]})
                    </button>
                  ))}
                  <select
                    value=""
                    onChange={(event) => { if (event.target.value) addPassenger(event.target.value as PaxType); }}
                    style={{
                      border: `1px dashed ${T.border}`, background: "transparent", color: T.accent,
                      borderRadius: 9, padding: "8px 13px", fontSize: 12.5, fontWeight: 700,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    <option value="">+ Add Passenger</option>
                    <option value="ADT">Adult</option>
                    <option value="CHD">Child (2–11)</option>
                    <option value="INF">Infant (under 2)</option>
                  </select>
                </div>

                {passengers[activePax] ? (
                  <div style={{ display: "grid", gap: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${isMobile ? 140 : 170}px,1fr))`, gap: 12 }}>
                      <Field label="Title" required>
                        <select value={passengers[activePax].title || "Mr"} onChange={(e) => patchPassenger(activePax, { title: e.target.value })} style={cell}>
                          {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </Field>
                      <Field label="First Name" required>
                        <input value={passengers[activePax].firstName || ""} onChange={(e) => patchPassenger(activePax, { firstName: e.target.value })} placeholder="Ali" style={cell} className="fl-in" />
                      </Field>
                      <Field label="Last Name" required>
                        <input value={passengers[activePax].lastName || ""} onChange={(e) => patchPassenger(activePax, { lastName: e.target.value })} placeholder="Raza" style={cell} className="fl-in" />
                      </Field>
                      <Field label="Date of Birth" required hint="An airline prices a child off this">
                        <input type="date" value={passengers[activePax].dob || ""} onChange={(e) => patchPassenger(activePax, { dob: e.target.value })} style={cell} className="fl-in" />
                      </Field>
                      <Field label="Gender">
                        <select value={passengers[activePax].gender || ""} onChange={(e) => patchPassenger(activePax, { gender: e.target.value })} style={cell}>
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </Field>
                      <Field label="Passenger Type">
                        <select value={passengers[activePax].type} onChange={(e) => patchPassenger(activePax, { type: e.target.value as PaxType })} style={cell}>
                          <option value="ADT">Adult</option>
                          <option value="CHD">Child</option>
                          <option value="INF">Infant</option>
                        </select>
                      </Field>
                      <Field label="Passport Number" required>
                        <input value={passengers[activePax].passportNo || ""} onChange={(e) => patchPassenger(activePax, { passportNo: e.target.value.toUpperCase() })} placeholder="AB1234567" style={cell} className="fl-in" />
                      </Field>
                      <Field label="Nationality">
                        <input value={passengers[activePax].nationality || ""} onChange={(e) => patchPassenger(activePax, { nationality: e.target.value })} placeholder="Pakistan" style={cell} className="fl-in" />
                      </Field>
                      <Field label="Passport Expiry" hint="Most carriers want six months left">
                        <input type="date" value={passengers[activePax].passportExpiry || ""} onChange={(e) => patchPassenger(activePax, { passportExpiry: e.target.value })} style={cell} className="fl-in" />
                      </Field>
                      <Field label="Frequent Flyer">
                        <input value={passengers[activePax].frequentFlyer || ""} onChange={(e) => patchPassenger(activePax, { frequentFlyer: e.target.value })} placeholder="Optional" style={cell} className="fl-in" />
                      </Field>
                    </div>

                    {/* The money on this passenger, alongside the passenger.

                        It is per head rather than per booking because that is
                        how airlines price it and how a refund of one traveller
                        out of five has to be worked out later. */}
                    <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 13, display: "grid", gap: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: T.text }}>Fare for this passenger</div>
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${isMobile ? 130 : 150}px,1fr))`, gap: 12 }}>
                        <Field label="Fare" required>
                          <input type="number" min={0} value={passengers[activePax].fare || ""} onChange={(e) => patchPassenger(activePax, { fare: Number(e.target.value) || 0 })} style={cell} className="fl-in" />
                        </Field>
                        <Field label="Taxes">
                          <input type="number" min={0} value={passengers[activePax].tax || ""} onChange={(e) => patchPassenger(activePax, { tax: Number(e.target.value) || 0 })} style={cell} className="fl-in" />
                        </Field>
                        <Field label="Supplier Cost" hint="What the airline bills you">
                          <input type="number" min={0} value={passengers[activePax].cost || ""} onChange={(e) => patchPassenger(activePax, { cost: Number(e.target.value) || 0 })} style={cell} className="fl-in" />
                        </Field>
                        <Field label="Ticket Number" hint="Once the airline issues it">
                          <input value={passengers[activePax].ticketNo || ""} onChange={(e) => patchPassenger(activePax, { ticketNo: e.target.value })} placeholder="Optional" style={cell} className="fl-in" />
                        </Field>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: T.muted }}>
                          This passenger:{" "}
                          <Money value={(passengers[activePax].fare || 0) + (passengers[activePax].tax || 0)} size={12.5} weight={700} />
                          {" · margin "}
                          <Money
                            value={(passengers[activePax].fare || 0) + (passengers[activePax].tax || 0) - (passengers[activePax].cost || 0)}
                            size={12.5}
                            weight={700}
                            tone={(passengers[activePax].fare || 0) + (passengers[activePax].tax || 0) - (passengers[activePax].cost || 0) >= 0 ? "#34d399" : "#f87171"}
                          />
                        </span>
                        {passengers.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removePassenger(activePax)}
                            style={{ border: "none", background: "transparent", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                          >
                            Remove this passenger
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </Card>

              <Card title="Contact Information" icon="📞" hint="Where booking updates and the e-ticket go">
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${isMobile ? 160 : 200}px,1fr))`, gap: 12 }}>
                  <Field label="Email">
                    <input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} placeholder="aliraza@example.com" style={cell} className="fl-in" />
                  </Field>
                  <Field label="Phone Number" required>
                    <input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} placeholder="+92 300 1234567" style={cell} className="fl-in" />
                  </Field>
                  <Field label="Alternate Number">
                    <input value={contact.altPhone} onChange={(e) => setContact({ ...contact, altPhone: e.target.value })} placeholder="Optional" style={cell} className="fl-in" />
                  </Field>
                </div>
              </Card>

              <Problems items={passengerProblems} />

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <GhostButton onClick={() => setStep(1)}>← Back to Flights</GhostButton>
                <PrimaryButton disabled={passengerProblems.length > 0} onClick={() => setStep(3)}>
                  Continue to Review →
                </PrimaryButton>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Card title="Booking & Supplier" icon="🧾" hint="What the ledger will carry this booking as">
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${isMobile ? 150 : 190}px,1fr))`, gap: 12 }}>
                  <Field label="Booking Reference" required>
                    <input value={booking.bookingRef} onChange={(e) => setBooking({ ...booking, bookingRef: e.target.value })} style={cell} className="fl-in" />
                  </Field>
                  <Field label="PNR" required={booking.status !== "quoted"}>
                    <input value={booking.pnr} onChange={(e) => setBooking({ ...booking, pnr: e.target.value.toUpperCase() })} placeholder="A1B2C3" style={cell} className="fl-in" />
                  </Field>
                  <Field label="Airline / Supplier" required hint="The account the payable lands in">
                    <input list="wizard-suppliers" value={booking.supplier} onChange={(e) => setBooking({ ...booking, supplier: e.target.value })} style={cell} className="fl-in" />
                    <datalist id="wizard-suppliers">
                      {suppliers.map((name) => <option key={name} value={name} />)}
                    </datalist>
                  </Field>
                  <Field label="Status">
                    <select value={booking.status} onChange={(e) => setBooking({ ...booking, status: e.target.value })} style={cell}>
                      <option value="quoted">Quoted — nothing held yet</option>
                      <option value="booked">Booked — seat held on a PNR</option>
                      <option value="issued">Issued — ticket number in hand</option>
                    </select>
                  </Field>
                  <Field label="Bill To" hint="Defaults to the lead passenger">
                    <input value={booking.customerName} onChange={(e) => setBooking({ ...booking, customerName: e.target.value })} placeholder={passengers[0]?.name || "Customer"} style={cell} className="fl-in" />
                  </Field>
                  <Field label="Settlement Due" hint="When the supplier must be paid">
                    <input type="date" value={booking.paymentDue} onChange={(e) => setBooking({ ...booking, paymentDue: e.target.value })} style={cell} className="fl-in" />
                  </Field>
                </div>
                <Field label="Notes">
                  <textarea
                    value={booking.notes}
                    onChange={(e) => setBooking({ ...booking, notes: e.target.value })}
                    rows={2}
                    placeholder="Anything the desk should know about this file"
                    style={{ ...cell, resize: "vertical" }}
                    className="fl-in"
                  />
                </Field>
              </Card>

              <Card title="Review" icon="🔍" hint="What will be written when you confirm">
                <div style={{ display: "grid", gap: 10 }}>
                  {offer ? (
                    <div style={{ fontSize: 13, color: T.text }}>
                      <strong>{offer.airline}</strong> · {describeRoute(offer.legs)} ·{" "}
                      {offer.legs.map((leg) => `${leg.date} ${leg.departAt}`).join(" / ")}
                    </div>
                  ) : null}
                  <div style={{ display: "grid", gap: 7 }}>
                    {passengers.map((row, index) => (
                      <div
                        key={row.id}
                        style={{
                          display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
                          borderTop: index ? `1px solid ${T.border}` : "none", paddingTop: index ? 7 : 0,
                        }}
                      >
                        <span style={{ fontSize: 12.5, color: T.text }}>
                          {row.title ? `${row.title} ` : ""}{row.name || "Unnamed"}{" "}
                          <span style={{ color: T.muted }}>({PAX_TYPE_LABELS[row.type]}{row.passportNo ? ` · ${row.passportNo}` : ""})</span>
                        </span>
                        <span style={{ fontSize: 12.5, color: T.muted }}>
                          <Money value={row.fare + row.tax} size={12.5} weight={700} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Problems items={reviewProblems} />

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <GhostButton onClick={() => setStep(2)}>← Back to Passengers</GhostButton>
                <PrimaryButton disabled={reviewProblems.length > 0 || saving} onClick={confirmBooking}>
                  {saving ? "Saving…" : "Confirm Booking"}
                </PrimaryButton>
              </div>
            </>
          ) : null}

          {step === 4 && done ? (
            <div style={{ display: "grid", gap: 14, maxWidth: 680, margin: "0 auto", width: "100%" }}>
              <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
                <div
                  style={{
                    width: 58, height: 58, borderRadius: "50%", margin: "0 auto 14px", display: "grid", placeItems: "center",
                    background: "rgba(52,211,153,.14)", border: "1px solid rgba(52,211,153,.4)", fontSize: 26,
                  }}
                >
                  ✓
                </div>
                <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: T.text }}>Booking saved</h2>
                <p style={{ margin: "6px 0 0", fontSize: 13.5, color: T.muted }}>
                  {done.ref} is on the Airline Tickets desk with {totals.count} passenger{totals.count === 1 ? "" : "s"}.
                </p>
              </div>

              <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, display: "grid", gap: 11 }}>
                {[
                  ["Booking reference", done.ref],
                  ["PNR", booking.pnr || "—"],
                  ["Airline / Supplier", booking.supplier],
                  ["Route", offer ? describeRoute(offer.legs) : "—"],
                  ["Status", booking.status],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: 12.5, color: T.muted }}>{label}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text, textAlign: "right" }}>{value}</span>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 11, display: "grid", gap: 9 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Invoice value</span>
                    <Money value={done.sale} size={16} weight={800} tone={T.accent} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: 12, color: T.muted }}>Supplier cost</span>
                    <Money value={done.cost} size={12.5} weight={700} tone={T.muted} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: 12, color: T.muted }}>Your margin</span>
                    <Money value={done.margin} size={13} weight={800} tone={done.margin >= 0 ? "#34d399" : "#f87171"} />
                  </div>
                </div>
              </section>

              {invoice ? (
                <div style={{ border: "1px solid rgba(52,211,153,.4)", background: "rgba(52,211,153,.1)", borderRadius: 12, padding: "12px 14px", fontSize: 12.5, color: "#34d399" }}>
                  Sales invoice <strong>{invoice.no}</strong> raised against this booking.
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                {!invoice ? (
                  <PrimaryButton onClick={raiseInvoice} disabled={invoicing}>
                    {invoicing ? "Raising…" : "Create Invoice"}
                  </PrimaryButton>
                ) : (
                  <PrimaryButton onClick={() => router.push(`/dashboard/sales-invoice?id=${encodeURIComponent(invoice.id)}`)}>
                    Open Invoice {invoice.no}
                  </PrimaryButton>
                )}
                <GhostButton onClick={() => router.push("/dashboard/travel/tickets")}>Go to Airline Tickets</GhostButton>
                <GhostButton
                  onClick={() => {
                    setDone(null);
                    setInvoice(null);
                    setOffer(null);
                    setPassengers([]);
                    setContact({ email: "", phone: "", altPhone: "" });
                    setBooking({ bookingRef: newBookingRef(), pnr: "", supplier: "", status: "booked", paymentDue: "", customerName: "", notes: "" });
                    setMarkup(0);
                    setStep(1);
                  }}
                >
                  Book another
                </GhostButton>
              </div>
            </div>
          ) : null}
        </div>

        {step !== 4 ? (
          <SummaryRail
            offer={offer}
            pax={pax}
            markup={markup}
            pricing={railPricing}
            fareLabel={step === 1 ? undefined : "Fare"}
            onMarkupChange={step === 1 ? (next) => {
              setMarkup(next);
              // The rows are rebuilt so the sum of the lines stays the price the
              // customer was quoted; anything already typed into them on step
              // two is past this point and is not touched.
              if (offer) setPassengers(buildPassengers(offer, pricedFor?.pax ?? query.pax, next));
            } : undefined}
            onChangeFlight={step === 1 ? () => setOffer(null) : undefined}
            footnotes={
              step === 1
                ? [
                    "Fares here are your own past fares or indicative figures — confirm with the airline before quoting.",
                    "Passenger names must match the passport exactly.",
                    "Prices are subject to change until the ticket is issued.",
                  ]
                : [
                    "The invoice total is the sum of the passenger rows, not a figure typed on top of them.",
                    "Nothing is written to the ledger until you confirm on the review step.",
                    "Visa and travel documents remain the passenger's responsibility.",
                  ]
            }
          />
        ) : null}
      </div>
    </div>
  );
}
