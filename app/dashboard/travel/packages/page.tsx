"use client";

/**
 * Packages — what a trip is made of, before anybody buys one.
 *
 * A package is a template: what a Dubai seven-night costs to put together and
 * what it sells for. A trip is one family actually going. They are kept apart
 * because the template changes when the hotel rate does, and a trip already
 * sold must not change with it — so building a trip copies the components onto
 * it and they belong to the trip from then on.
 *
 * One builder, whatever the destination: Dubai, Turkey, a honeymoon, a
 * corporate group. Hajj and Umrah have their own departure engine because they
 * are priced by occupancy and sold by the seat, which is a different shape.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { useResponsive } from "@/hooks/useResponsive";
import { useCurrency } from "@/lib/useCurrency";
import { confirmToast, alertToast } from "@/lib/toast-feedback";
import { useBusinessRecords, type BusinessRecord } from "@/lib/useBusinessRecords";
import { Field, GhostButton, PartyInput, PrimaryButton, T, ff, flightCss, inputStyle, readParties, type PartyChoice } from "../_flight/ui";
import { TRAVEL_SUPPLIER_KIND, partyKindHeading } from "@/lib/partyVocabulary";

type Component = {
  productType: string;
  title: string;
  supplierName: string;
  sale: number;
  cost: number;
  /** Per head, or once for the whole booking. A room is per booking; a visa
      is per person. Getting this wrong quadruples a hotel. */
  perPerson: boolean;
};

const PRODUCTS = [
  { value: "FLIGHT", label: "✈️ Flight", perPerson: true },
  { value: "HOTEL", label: "🏨 Hotel", perPerson: false },
  { value: "VISA", label: "🛂 Visa", perPerson: true },
  { value: "TRANSPORT", label: "🚐 Transport", perPerson: false },
  { value: "INSURANCE", label: "🛡 Insurance", perPerson: true },
  { value: "TOUR", label: "🗺 Activity / Tour", perPerson: true },
  { value: "FEE", label: "💼 Service Fee", perPerson: false },
];

const emptyComponent = (): Component => ({ productType: "FLIGHT", title: "", supplierName: "", sale: 0, cost: 0, perPerson: true });

function readComponents(value: unknown): Component[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    return {
      productType: String(row.productType || "FLIGHT"),
      title: String(row.title || ""),
      supplierName: String(row.supplierName || ""),
      sale: Number(row.sale) || 0,
      cost: Number(row.cost) || 0,
      perPerson: row.perPerson !== false,
    };
  });
}

export default function PackagesPage() {
  const { isMobile, isTablet } = useResponsive();
  const symbol = useCurrency();
  const money = (n: number) => `${symbol}${Math.round(Number(n) || 0).toLocaleString()}`;

  const { records, loading, create, remove, refetch } = useBusinessRecords("travel_package");

  const [building, setBuilding] = useState(false);
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [nights, setNights] = useState(7);
  const [components, setComponents] = useState<Component[]>([emptyComponent()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  /* Same list, same reason as the trip builder. */
  const [suppliers, setSuppliers] = useState<PartyChoice[]>([]);

  useEffect(() => {
    fetch("/api/accounts?partyType=SUPPLIER", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        setSuppliers(readParties(rows));
      })
      .catch(() => {});
  }, []);

  /* Turning a package into a trip: who it is for and how many are going. */
  const [selling, setSelling] = useState<BusinessRecord | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [pax, setPax] = useState(2);
  const [travelDate, setTravelDate] = useState("");
  const [busy, setBusy] = useState(false);

  const packages = useMemo(
    () =>
      records.map((record) => {
        const data = record.data ?? {};
        const rows = readComponents(data.components);
        return {
          record,
          name: record.title,
          destination: String(data.destination || ""),
          nights: Number(data.nights || 0),
          components: rows,
        };
      }),
    [records],
  );

  /* What one party costs, worked out the way the server will when the trip is
     built — per-person lines multiplied, per-booking lines not. */
  const priceFor = useCallback((rows: Component[], people: number) => {
    const sale = rows.reduce((sum, row) => sum + row.sale * (row.perPerson ? people : 1), 0);
    const cost = rows.reduce((sum, row) => sum + row.cost * (row.perPerson ? people : 1), 0);
    return { sale, cost, margin: sale - cost };
  }, []);

  const draft = useMemo(() => priceFor(components, pax || 1), [components, pax, priceFor]);

  async function savePackage() {
    setSaving(true);
    setError("");
    try {
      await create({
        title: name.trim(),
        status: "active",
        amount: priceFor(components, 1).sale,
        date: new Date().toISOString().slice(0, 10),
        data: {
          destination: destination.trim(),
          nights: Number(nights) || 0,
          components: components.filter((row) => row.title.trim()),
        },
      });
      alertToast(`${name.trim()} saved.`, "success", "Package Saved");
      setBuilding(false);
      setName("");
      setDestination("");
      setComponents([emptyComponent()]);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the package");
    } finally {
      setSaving(false);
    }
  }

  async function buildTrip() {
    if (!selling) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/travel/trip-from-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selling.id, customerName, pax, travelDate }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Could not build the trip");
      alertToast(
        `${body.booking.bookingNo} — ${money(body.booking.saleTotal)}, margin ${money(body.booking.marginTotal)}.`,
        "success",
        "Trip Created",
      );
      setSelling(null);
      setCustomerName("");
    } catch (buildError) {
      setError(buildError instanceof Error ? buildError.message : "Could not build the trip");
    } finally {
      setBusy(false);
    }
  }

  function patch(index: number, changes: Partial<Component>) {
    setComponents((prev) => prev.map((row, i) => (i === index ? { ...row, ...changes } : row)));
  }

  const cell = { ...inputStyle, padding: "8px 10px", fontSize: 12.5 };
  const ready = name.trim() && components.some((row) => row.title.trim());

  return (
    <div className="fl-form" style={{ padding: isMobile ? 16 : "24px 28px", fontFamily: ff, color: T.text, maxWidth: "100%", overflow: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: flightCss }} />

      <header style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap" }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "grid", placeItems: "center", background: "linear-gradient(135deg,var(--accent),var(--accent-strong))", fontSize: 19 }}>📦</span>
        <div style={{ minWidth: 0, flex: "1 1 240px" }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 21 : 25, fontWeight: 800, color: T.text }}>Packages</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: T.muted }}>
            What a trip is made of, priced once — then sold to a family in one click.
          </p>
        </div>
        <PrimaryButton onClick={() => setBuilding((b) => !b)}>{building ? "Close" : "+ New package"}</PrimaryButton>
      </header>

      {building ? (
        <section className="fl-form" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18, marginBottom: 18, display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${isMobile ? 150 : 190}px,1fr))`, gap: 12, alignItems: "start" }}>
            <Field label="Package Name" required>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dubai 7 Nights — Family" style={cell} className="fl-in" />
            </Field>
            <Field label="Destination">
              <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Dubai, UAE" style={cell} className="fl-in" />
            </Field>
            <Field label="Nights">
              <input type="number" min={0} value={nights} onChange={(e) => setNights(Number(e.target.value) || 0)} style={cell} className="fl-in" />
            </Field>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>What is in it</div>
            {components.map((row, index) => (
              <div
                key={index}
                style={{
                  display: "grid",
                  gridTemplateColumns: isTablet ? "minmax(0,1fr)" : "150px minmax(0,1fr) 140px 110px 110px 120px auto",
                  gap: 8, alignItems: "end",
                  border: `1px solid ${T.border}`, borderRadius: 11, padding: 10, background: "var(--panel-bg)",
                }}
              >
                <Field label="Service">
                  <select
                    value={row.productType}
                    onChange={(e) => {
                      const product = PRODUCTS.find((p) => p.value === e.target.value);
                      // The sensible default for that kind of service, still
                      // overridable on the next control.
                      patch(index, { productType: e.target.value, perPerson: product?.perPerson ?? true });
                    }}
                    style={cell}
                  >
                    {PRODUCTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </Field>
                <Field label="Description" required>
                  <input value={row.title} onChange={(e) => patch(index, { title: e.target.value })} placeholder="Return flight, economy" style={cell} className="fl-in" />
                </Field>
                <Field label="Supplier">
                  <PartyInput
                    compact
                    value={row.supplierName}
                    options={suppliers}
                    kind={TRAVEL_SUPPLIER_KIND[row.productType]}
                    kindLabel={TRAVEL_SUPPLIER_KIND[row.productType] ? partyKindHeading(TRAVEL_SUPPLIER_KIND[row.productType]) : undefined}
                    placeholder={suppliers.length ? "Pick or type" : "Who bills you"}
                    onChange={(name) => patch(index, { supplierName: name })}
                  />
                </Field>
                <Field label="Sell">
                  <input type="number" min={0} value={row.sale || ""} onChange={(e) => patch(index, { sale: Number(e.target.value) || 0 })} style={{ ...cell, textAlign: "right" }} className="fl-in" />
                </Field>
                <Field label="Cost">
                  <input type="number" min={0} value={row.cost || ""} onChange={(e) => patch(index, { cost: Number(e.target.value) || 0 })} style={{ ...cell, textAlign: "right" }} className="fl-in" />
                </Field>
                <Field label="Charged">
                  <select value={row.perPerson ? "per" : "once"} onChange={(e) => patch(index, { perPerson: e.target.value === "per" })} style={cell}>
                    <option value="per">Per person</option>
                    <option value="once">Per booking</option>
                  </select>
                </Field>
                <button
                  type="button"
                  onClick={() => setComponents((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))}
                  disabled={components.length <= 1}
                  style={{ height: 36, padding: "0 10px", borderRadius: 9, border: "none", background: "transparent", color: components.length <= 1 ? T.muted : "#f87171", fontSize: 12, fontWeight: 700, cursor: components.length <= 1 ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setComponents((prev) => [...prev, emptyComponent()])}
              style={{ justifySelf: "start", border: `1px dashed ${T.border}`, background: "transparent", color: T.accent, borderRadius: 10, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              + Add a component
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center", borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, alignItems: "center" }}>
              <span style={{ color: T.muted }}>For</span>
              <input type="number" min={1} value={pax} onChange={(e) => setPax(Number(e.target.value) || 1)} style={{ ...cell, width: 64, textAlign: "center" }} className="fl-in" />
              <span style={{ color: T.muted }}>people: <strong style={{ color: T.text }}>{money(draft.sale)}</strong></span>
              <span style={{ color: draft.margin >= 0 ? "#34d399" : "#f87171", fontWeight: 800 }}>margin {money(draft.margin)}</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <GhostButton onClick={() => setBuilding(false)}>Cancel</GhostButton>
              <PrimaryButton onClick={savePackage} disabled={!ready || saving}>{saving ? "Saving…" : "Save package"}</PrimaryButton>
            </div>
          </div>

          {error ? <div style={{ fontSize: 12.5, color: "#f87171" }}>{error}</div> : null}
        </section>
      ) : null}

      {selling ? (
        <section style={{ background: T.card, border: "1px solid var(--accent)", borderRadius: 16, padding: 18, marginBottom: 18, display: "grid", gap: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Sell “{selling.title}”</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${isMobile ? 150 : 180}px,1fr))`, gap: 12, alignItems: "start" }}>
            <Field label="Customer" required hint="Who the invoice goes to">
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Muhammad Ali" style={cell} className="fl-in" />
            </Field>
            <Field label="Passengers" required>
              <input type="number" min={1} value={pax} onChange={(e) => setPax(Number(e.target.value) || 1)} style={cell} className="fl-in" />
            </Field>
            <Field label="Travel Date">
              <input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} style={cell} className="fl-in" />
            </Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <GhostButton onClick={() => setSelling(null)}>Cancel</GhostButton>
            <PrimaryButton onClick={buildTrip} disabled={!customerName.trim() || busy}>
              {busy ? "Building…" : "Create the trip"}
            </PrimaryButton>
          </div>
          {error ? <div style={{ fontSize: 12.5, color: "#f87171" }}>{error}</div> : null}
        </section>
      ) : null}

      {loading ? (
        <div style={{ fontSize: 13, color: T.muted }}>Loading…</div>
      ) : !packages.length ? (
        <div style={{ border: `1px dashed ${T.border}`, borderRadius: 14, padding: "36px 20px", textAlign: "center", color: T.muted, fontSize: 13.5, lineHeight: 1.6, background: T.card }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
          No packages yet. Build the one you sell most — its flight, hotel, visa and transfers,
          priced once — and selling it to a family becomes three boxes instead of nine.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {packages.map((pack) => {
            const per2 = priceFor(pack.components, 2);
            return (
              <article key={pack.record.id} className="fl-card" style={{ border: `1px solid ${T.border}`, borderRadius: 14, background: T.card, padding: 16, display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{pack.name}</div>
                    <div style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>
                      {[pack.destination, pack.nights ? `${pack.nights} nights` : "", `${pack.components.length} component${pack.components.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{money(per2.sale)}</div>
                    <div style={{ fontSize: 10.5, color: T.muted }}>for 2 people</div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 5 }}>
                  {pack.components.map((row, index) => (
                    <div key={index} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12.5, flexWrap: "wrap" }}>
                      <span style={{ color: T.text }}>
                        {PRODUCTS.find((p) => p.value === row.productType)?.label ?? row.productType} {row.title}
                        <span style={{ color: T.muted }}> · {row.perPerson ? "per person" : "per booking"}</span>
                      </span>
                      <span style={{ color: T.muted, whiteSpace: "nowrap" }}>{money(row.sale)}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                  <span style={{ fontSize: 12.5, color: per2.margin >= 0 ? "#34d399" : "#f87171", fontWeight: 800 }}>
                    Margin {money(per2.margin)} on 2
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <PrimaryButton onClick={() => { setSelling(pack.record); setError(""); }}>Sell this</PrimaryButton>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!await confirmToast(`Remove ${pack.name}? Trips already built from it are untouched.`)) return;
                        await remove(pack.record.id);
                        await refetch();
                      }}
                      style={{ border: "none", background: "transparent", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
