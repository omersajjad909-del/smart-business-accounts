"use client";

/**
 * Trips — one file for a journey, however many services it is made of.
 *
 * "Me family ke saath Dubai jana hai" is a flight, a hotel, a visa, an airport
 * transfer and insurance. Each of those already has its own desk in this app
 * and will go on having one; what was missing was the thing that holds them
 * together — one customer, one set of travellers, one total, one margin.
 *
 * Nothing here replaces the vertical desks. A service on a trip can point back
 * at the ticket or visa record it came from.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { useResponsive } from "@/hooks/useResponsive";
import { useCurrency } from "@/lib/useCurrency";
import { confirmToast, alertToast } from "@/lib/toast-feedback";
import { Field, GhostButton, PrimaryButton, T, ff, flightCss, inputStyle } from "../_flight/ui";

type Item = {
  id?: string;
  productType: string;
  title: string;
  supplierName: string;
  sale: number;
  cost: number;
  qty: number;
};

type Traveler = { id: string; fullName: string; passportNo: string | null };

type Trip = {
  id: string;
  bookingNo: string;
  customerName: string;
  status: string;
  travelDate: string | null;
  saleTotal: number;
  costTotal: number;
  marginTotal: number;
  invoiceNo: string | null;
  items: Item[];
  travelers: { travelerId: string; role: string }[];
};

/* The services a travel agency actually sells. FEE is the agency's own charge —
   a service fee on a visa, a courier, a document attestation — which is pure
   margin and belongs on the trip like anything else. */
const PRODUCTS = [
  { value: "FLIGHT", label: "✈️ Flight" },
  { value: "HOTEL", label: "🏨 Hotel" },
  { value: "VISA", label: "🛂 Visa" },
  { value: "PASSPORT", label: "📕 Passport" },
  { value: "TRANSPORT", label: "🚐 Transport" },
  { value: "INSURANCE", label: "🛡 Insurance" },
  { value: "TOUR", label: "🗺 Tour" },
  { value: "HAJJ", label: "🕋 Hajj" },
  { value: "UMRAH", label: "🕋 Umrah" },
  { value: "FEE", label: "💼 Service Fee" },
];

const STATUSES = ["draft", "quoted", "confirmed", "ticketed", "travelling", "completed", "cancelled"];

function statusTone(status: string) {
  if (["completed", "ticketed"].includes(status)) return "#34d399";
  if (["draft", "quoted"].includes(status)) return "#fbbf24";
  if (status === "cancelled") return "#f87171";
  return "#60a5fa";
}

const emptyItem = (): Item => ({ productType: "FLIGHT", title: "", supplierName: "", sale: 0, cost: 0, qty: 1 });

export default function TripsPage() {
  const { isMobile, isTablet } = useResponsive();
  const symbol = useCurrency();
  const money = (n: number) => `${symbol}${Math.round(Number(n) || 0).toLocaleString()}`;

  const [trips, setTrips] = useState<Trip[]>([]);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const [building, setBuilding] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tripRes, travRes] = await Promise.all([
        fetch(`/api/travel/bookings?q=${encodeURIComponent(search)}&status=${statusFilter}&limit=100`).then((r) => (r.ok ? r.json() : null)),
        fetch("/api/travel/travelers?limit=100").then((r) => (r.ok ? r.json() : null)),
      ]);
      setTrips(tripRes?.bookings ?? []);
      setTravelers(travRes?.travelers ?? []);
    } catch {
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  /* Worked out as you type, from the same lines the server will sum. The two
     agreeing is not a coincidence — the server recomputes and its answer wins. */
  const draftTotals = useMemo(() => {
    const sale = items.reduce((sum, item) => sum + (item.sale || 0) * (item.qty || 0), 0);
    const cost = items.reduce((sum, item) => sum + (item.cost || 0) * (item.qty || 0), 0);
    return { sale, cost, margin: sale - cost };
  }, [items]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/travel/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          travelDate,
          status: "draft",
          travelerIds: chosen,
          leadTravelerId: chosen[0],
          items: items.filter((item) => item.title.trim()),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Could not save");
      alertToast(
        `${body.booking.bookingNo} — ${money(body.booking.saleTotal)}, margin ${money(body.booking.marginTotal)}.`,
        "success",
        "Trip Created",
      );
      setBuilding(false);
      setCustomerName("");
      setTravelDate("");
      setChosen([]);
      setItems([emptyItem()]);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the trip");
    } finally {
      setSaving(false);
    }
  }

  async function remove(trip: Trip) {
    if (!await confirmToast(`Remove ${trip.bookingNo}?`)) return;
    const response = await fetch(`/api/travel/bookings?id=${encodeURIComponent(trip.id)}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body?.error || "Could not remove the trip");
      return;
    }
    await load();
  }

  /* One invoice for the whole trip: a line per service, the customer owing the
     total, each service's revenue account credited with its own share. */
  async function raiseInvoice(trip: Trip) {
    setError("");
    try {
      const response = await fetch("/api/travel/trip-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: trip.id }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Could not raise the invoice");
      alertToast(
        `Invoice ${body.invoiceNo} raised for ${trip.bookingNo} — ${money(body.total ?? trip.saleTotal)} across ${body.lines ?? trip.items.length} lines.`,
        "success",
        body.reused ? "Already Invoiced" : "Invoice Raised",
      );
      await load();
    } catch (invoiceError) {
      setError(invoiceError instanceof Error ? invoiceError.message : "Could not raise the invoice");
    }
  }

  async function setStatus(trip: Trip, status: string) {
    await fetch("/api/travel/bookings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: trip.id, status }),
    });
    await load();
  }

  function patchItem(index: number, changes: Partial<Item>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  }

  const cell = { ...inputStyle, padding: "8px 10px", fontSize: 12.5 };
  const ready = customerName.trim() && items.some((item) => item.title.trim());

  const stats = useMemo(() => {
    const sale = trips.reduce((sum, trip) => sum + trip.saleTotal, 0);
    const margin = trips.reduce((sum, trip) => sum + trip.marginTotal, 0);
    const open = trips.filter((trip) => !["completed", "cancelled"].includes(trip.status)).length;
    return [
      { label: "Trips", value: String(trips.length), color: "#38bdf8" },
      { label: "Open", value: String(open), color: open ? "#fbbf24" : "#34d399" },
      { label: "Sales", value: money(sale), color: "#60a5fa" },
      { label: "Margin", value: money(margin), color: margin >= 0 ? "#34d399" : "#f87171" },
    ];
  }, [trips, symbol]);

  return (
    <div style={{ padding: isMobile ? 16 : "24px 28px", fontFamily: ff, color: T.text, maxWidth: "100%", overflow: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: flightCss }} />

      <header style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap" }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "grid", placeItems: "center", background: "linear-gradient(135deg,var(--accent),var(--accent-strong))", fontSize: 19 }}>🧳</span>
        <div style={{ minWidth: 0, flex: "1 1 240px" }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 21 : 25, fontWeight: 800, color: T.text }}>Trips</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: T.muted }}>
            One file for a journey — flight, hotel, visa, transfer — with one customer, one total and one margin.
          </p>
        </div>
        <PrimaryButton onClick={() => setBuilding((b) => !b)}>
          {building ? "Close" : "+ New trip"}
        </PrimaryButton>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 18 }}>
        {stats.map((card) => (
          <div key={card.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", minWidth: 0 }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {building ? (
        <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18, marginBottom: 18, display: "grid", gap: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Build a trip</div>

          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${isMobile ? 160 : 200}px,1fr))`, gap: 12 }}>
            <Field label="Customer (who pays)" required hint="The invoice goes to this name">
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Muhammad Ali" style={cell} className="fl-in" />
            </Field>
            <Field label="Travel Date">
              <input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} style={cell} className="fl-in" />
            </Field>
          </div>

          {/* Who goes, as distinct from who pays. */}
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
              Travellers {chosen.length ? `(${chosen.length} selected)` : ""}
            </div>
            {travelers.length ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {travelers.map((person) => {
                  const on = chosen.includes(person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => setChosen((prev) => (on ? prev.filter((id) => id !== person.id) : [...prev, person.id]))}
                      style={{
                        border: `1px solid ${on ? "var(--accent)" : T.border}`,
                        background: on ? "var(--accent-soft)" : T.panel,
                        color: on ? T.accent : T.muted,
                        borderRadius: 999, padding: "6px 13px", fontSize: 12, fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      {person.fullName}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: T.muted }}>
                Nobody on file yet — add them on{" "}
                <a href="/dashboard/travel/travelers" style={{ color: T.accent, textDecoration: "none" }}>Travellers</a>{" "}
                and they can be put on trips from then on.
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 10, borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Services</div>

            {items.map((item, index) => (
              <div
                key={index}
                style={{
                  display: "grid",
                  gridTemplateColumns: isTablet ? "minmax(0,1fr)" : "150px minmax(0,1fr) 150px 110px 110px 70px auto",
                  gap: 8, alignItems: "end",
                  border: `1px solid ${T.border}`, borderRadius: 11, padding: 10, background: "var(--panel-bg)",
                }}
              >
                <Field label="Service">
                  <select value={item.productType} onChange={(e) => patchItem(index, { productType: e.target.value })} style={cell}>
                    {PRODUCTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </Field>
                <Field label="Description" required>
                  <input value={item.title} onChange={(e) => patchItem(index, { title: e.target.value })} placeholder="KHI → DXB, PK 213" style={cell} className="fl-in" />
                </Field>
                <Field label="Supplier">
                  <input value={item.supplierName} onChange={(e) => patchItem(index, { supplierName: e.target.value })} placeholder="Who bills you" style={cell} className="fl-in" />
                </Field>
                <Field label="Sell">
                  <input type="number" min={0} value={item.sale || ""} onChange={(e) => patchItem(index, { sale: Number(e.target.value) || 0 })} style={{ ...cell, textAlign: "right" }} className="fl-in" />
                </Field>
                <Field label="Cost">
                  <input type="number" min={0} value={item.cost || ""} onChange={(e) => patchItem(index, { cost: Number(e.target.value) || 0 })} style={{ ...cell, textAlign: "right" }} className="fl-in" />
                </Field>
                <Field label="Qty">
                  <input type="number" min={0} value={item.qty} onChange={(e) => patchItem(index, { qty: Number(e.target.value) || 0 })} style={{ ...cell, textAlign: "right" }} className="fl-in" />
                </Field>
                <button
                  type="button"
                  onClick={() => setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))}
                  disabled={items.length <= 1}
                  style={{
                    height: 36, padding: "0 10px", borderRadius: 9, border: "none", background: "transparent",
                    color: items.length <= 1 ? T.muted : "#f87171", fontSize: 12, fontWeight: 700,
                    cursor: items.length <= 1 ? "not-allowed" : "pointer", fontFamily: "inherit",
                  }}
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, emptyItem()])}
              style={{ justifySelf: "start", border: `1px dashed ${T.border}`, background: "transparent", color: T.accent, borderRadius: 10, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              + Add a service
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center", borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12.5 }}>
              <span style={{ color: T.muted }}>Sells for <strong style={{ color: T.text }}>{money(draftTotals.sale)}</strong></span>
              <span style={{ color: T.muted }}>Costs <strong style={{ color: T.text }}>{money(draftTotals.cost)}</strong></span>
              <span style={{ color: draftTotals.margin >= 0 ? "#34d399" : "#f87171", fontWeight: 800 }}>
                Margin {money(draftTotals.margin)}
              </span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <GhostButton onClick={() => setBuilding(false)}>Cancel</GhostButton>
              <PrimaryButton onClick={save} disabled={!ready || saving}>
                {saving ? "Saving…" : "Create trip"}
              </PrimaryButton>
            </div>
          </div>

          {error ? <div style={{ fontSize: 12.5, color: "#f87171" }}>{error}</div> : null}
        </section>
      ) : null}

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Booking number or customer" style={{ ...cell, flex: "1 1 240px" }} className="fl-in" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...cell, width: "auto", minWidth: 150 }}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: T.muted }}>Loading…</div>
      ) : !trips.length ? (
        <div style={{ border: `1px dashed ${T.border}`, borderRadius: 14, padding: "36px 20px", textAlign: "center", color: T.muted, fontSize: 13.5, lineHeight: 1.6, background: T.card }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🧳</div>
          No trips yet. A trip is one journey with all its services on it — the flight, the hotel,
          the visa, the transfer — so it has one total and one margin instead of five separate records.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {trips.map((trip) => (
            <article key={trip.id} className="fl-card" style={{ border: `1px solid ${T.border}`, borderRadius: 14, background: T.card, padding: 16, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{trip.bookingNo}</div>
                  <div style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>
                    {trip.customerName}
                    {trip.travelDate ? ` · ${String(trip.travelDate).slice(0, 10)}` : ""}
                    {trip.travelers.length ? ` · ${trip.travelers.length} traveller${trip.travelers.length === 1 ? "" : "s"}` : ""}
                    {trip.invoiceNo ? ` · invoice ${trip.invoiceNo}` : ""}
                  </div>
                </div>
                <select
                  value={trip.status}
                  onChange={(e) => setStatus(trip, e.target.value)}
                  style={{
                    borderRadius: 999, border: `1px solid ${statusTone(trip.status)}55`,
                    background: `${statusTone(trip.status)}1f`, color: statusTone(trip.status),
                    fontSize: 11.5, fontWeight: 700, padding: "6px 12px", cursor: "pointer",
                    fontFamily: "inherit", textTransform: "uppercase", letterSpacing: ".04em",
                  }}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                {trip.items.map((item, index) => (
                  <div key={item.id || index} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 12.5, borderTop: index ? `1px solid ${T.border}` : "none", paddingTop: index ? 6 : 0 }}>
                    <span style={{ color: T.text }}>
                      {PRODUCTS.find((p) => p.value === item.productType)?.label ?? item.productType} {item.title}
                      {item.supplierName ? <span style={{ color: T.muted }}> · {item.supplierName}</span> : null}
                      {item.qty !== 1 ? <span style={{ color: T.muted }}> × {item.qty}</span> : null}
                    </span>
                    <span style={{ color: T.muted, whiteSpace: "nowrap" }}>
                      {money(item.sale * item.qty)}
                      <span style={{ color: (item.sale - item.cost) >= 0 ? "#34d399" : "#f87171" }}>
                        {"  "}({money((item.sale - item.cost) * item.qty)})
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center", borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12.5 }}>
                  <span style={{ color: T.muted }}>Sale <strong style={{ color: T.text }}>{money(trip.saleTotal)}</strong></span>
                  <span style={{ color: T.muted }}>Cost <strong style={{ color: T.text }}>{money(trip.costTotal)}</strong></span>
                  <span style={{ color: trip.marginTotal >= 0 ? "#34d399" : "#f87171", fontWeight: 800 }}>
                    Margin {money(trip.marginTotal)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {trip.invoiceNo ? (
                    <a
                      href={`/dashboard/sales-invoice?id=${encodeURIComponent(trip.id)}`}
                      style={{
                        border: "1px solid rgba(52,211,153,.45)", background: "rgba(52,211,153,.14)",
                        color: "#34d399", borderRadius: 10, padding: "7px 13px", fontSize: 12,
                        fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
                      }}
                    >
                      Invoice {trip.invoiceNo}
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="fl-press"
                      onClick={() => raiseInvoice(trip)}
                      disabled={trip.status === "cancelled" || !trip.items.length}
                      style={{
                        border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 800,
                        background: trip.status === "cancelled" ? T.panel2 : "linear-gradient(135deg,var(--accent),var(--accent-strong))",
                        color: trip.status === "cancelled" ? T.muted : "#06121f",
                        cursor: trip.status === "cancelled" ? "not-allowed" : "pointer",
                        fontFamily: "inherit", whiteSpace: "nowrap",
                      }}
                    >
                      Raise invoice
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(trip)}
                    style={{ border: "none", background: "transparent", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
