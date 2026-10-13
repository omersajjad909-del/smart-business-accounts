"use client";

/**
 * Book Hotel — a reservation from "who is staying where" to a file the
 * accounts can see.
 *
 * The Hotel & Package desk used to open on a thirteen-box form beside the list,
 * with the booking reference typed by hand, the nights counted in the head and
 * the margin found out afterwards. Here the reference is made for you, the
 * nights come from the two dates, and the margin shows while the prices are
 * being typed — which is when it can still be changed.
 *
 * It writes the same travel_hotel record as before, so invoicing, settlement
 * and the customer timeline go on working untouched.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useResponsive } from "@/hooks/useResponsive";
import { TRAVEL_SUPPLIER_KIND, partyKindHeading } from "@/lib/partyVocabulary";
import { alertToast } from "@/lib/toast-feedback";
import { Field, GhostButton, Money, PartyInput, PrimaryButton, T, ff, flightCss, inputStyle, readParties, type PartyChoice } from "../../_flight/ui";
import { authHeaders } from "../../_flight/useFlightSearch";

const MEAL_PLANS: [string, string][] = [
  ["room_only", "Room only"],
  ["with_breakfast", "Breakfast"],
  ["half_board", "Half board"],
  ["full_board", "Full board"],
  ["all_inclusive", "All inclusive"],
];

const ROOM_TYPES = ["Single", "Double", "Twin", "Triple", "Quad", "Family", "Suite"];

/** A reference the desk can say out loud, unique enough not to collide. */
function newRef(): string {
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `HTL-${stamp}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

const isoToday = () => new Date().toISOString().slice(0, 10);
const plusDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);

function Card({ title, icon, hint, children }: { title: string; icon: string; hint?: string; children: React.ReactNode }) {
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

export default function BookHotelPage() {
  const router = useRouter();
  const { isMobile, isTablet } = useResponsive();

  const [form, setForm] = useState({
    bookingRef: "",
    guestName: "",
    customerName: "",
    contactPhone: "",
    hotelName: "",
    destination: "",
    checkIn: isoToday(),
    checkOut: plusDays(isoToday(), 1),
    rooms: "1",
    guests: "2",
    roomType: "Double",
    mealPlan: "with_breakfast",
    supplier: "",
    supplierRef: "",
    sale: "",
    cost: "",
    paymentDue: "",
    status: "confirmed",
    notes: "",
  });
  const [suppliers, setSuppliers] = useState<PartyChoice[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ ref: string; settlement: string; warning: string } | null>(null);

  // Made after mount: a random reference built during render would differ
  // between the server's markup and the browser's.
  useEffect(() => {
    setForm((current) => (current.bookingRef ? current : { ...current, bookingRef: newRef() }));
    fetch("/api/accounts?partyType=SUPPLIER", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => { if (Array.isArray(rows)) setSuppliers(readParties(rows)); })
      .catch(() => {});
  }, []);

  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  const nights = useMemo(() => {
    const n = Math.round((Date.parse(form.checkOut) - Date.parse(form.checkIn)) / 86_400_000);
    return Number.isFinite(n) ? n : 0;
  }, [form.checkIn, form.checkOut]);
  const sale = Number(form.sale) || 0;
  const cost = Number(form.cost) || 0;
  const margin = sale - cost;

  function changeCheckIn(value: string) {
    // Keep the length of stay when the arrival moves, rather than leaving a
    // check-out that is now before it.
    const stay = Math.max(1, nights);
    set({ checkIn: value, checkOut: value ? plusDays(value, stay) : form.checkOut });
  }

  const problems = useMemo(() => {
    const out: string[] = [];
    if (!form.guestName.trim()) out.push("Enter the guest's name.");
    if (!form.hotelName.trim()) out.push("Enter the hotel.");
    if (nights < 1) out.push("Check-out must be after check-in.");
    if (sale <= 0) out.push("Enter the sale price.");
    if (margin < 0) out.push("This sells below what the hotel charges. Check the prices before saving.");
    return out;
  }, [form.guestName, form.hotelName, nights, sale, margin]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/travel/book-hotel", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ...form, sale, cost }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Could not save the booking");
      setDone({
        ref: form.bookingRef,
        settlement: String(body.settlement?.settlementRef || ""),
        warning: String(body.settlementWarning || ""),
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the booking");
    } finally {
      setSaving(false);
    }
  }

  const cell = { ...inputStyle, padding: "9px 11px", fontSize: 13 };
  const row2 = { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0,1fr))", gap: 12, alignItems: "start" } as const;
  const row3 = { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0,1fr))", gap: 12, alignItems: "start" } as const;

  if (done) {
    return (
      <div className="fl-form" style={{ fontFamily: ff, padding: isMobile ? "16px 14px 60px" : "24px 28px 60px", maxWidth: 640, margin: "0 auto" }}>
        <style>{flightCss}</style>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, margin: "0 auto 12px", display: "grid", placeItems: "center", background: "var(--accent-soft)", fontSize: 26 }}>✅</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.text }}>Hotel booked</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, color: T.muted }}>{done.ref} is on the Hotel &amp; Package desk.</p>
        </div>
        <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, display: "grid", gap: 11 }}>
          {([
            ["Booking reference", done.ref],
            ["Hotel", form.hotelName],
            ["Stay", `${form.checkIn} → ${form.checkOut} · ${nights} night${nights === 1 ? "" : "s"}`],
            ["Supplier payable", done.settlement ? `${done.settlement} raised` : done.warning ? `Not raised — ${done.warning}` : "None — quote only"],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 12.5, color: T.muted }}>{label}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text, textAlign: "right" }}>{value}</span>
            </div>
          ))}
        </section>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
          <PrimaryButton onClick={() => router.push("/dashboard/travel/hotel-packages")}>View bookings</PrimaryButton>
          <GhostButton onClick={() => { setDone(null); setForm((c) => ({ ...c, bookingRef: newRef(), guestName: "", customerName: "", sale: "", cost: "", supplierRef: "", notes: "" })); }}>
            Book another
          </GhostButton>
        </div>
      </div>
    );
  }

  return (
    <div className="fl-form" style={{ fontFamily: ff, padding: isMobile ? "16px 14px 60px" : "24px 28px 60px", maxWidth: 1180, margin: "0 auto" }}>
      <style>{flightCss}</style>

      <header style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "grid", placeItems: "center", background: "linear-gradient(135deg,var(--accent),var(--accent-strong))", fontSize: 19 }}>🏨</span>
        <div style={{ minWidth: 0, flex: "1 1 260px" }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 21 : 25, fontWeight: 800, color: T.text }}>Book Hotel</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: T.muted }}>Reserve a room for a guest and see the margin before you save.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard/travel/hotel-packages")}
          style={{ border: `1px solid ${T.border}`, background: T.panel, color: T.text, borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
        >
          ← Back to Bookings
        </button>
      </header>

      {error ? (
        <div style={{ marginBottom: 14, border: "1px solid rgba(248,113,113,.4)", background: "rgba(248,113,113,.1)", color: "var(--tx-f87171, #f87171)", borderRadius: 12, padding: "11px 14px", fontSize: 12.5 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: isTablet ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(300px,340px)", gap: 16, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
          <Card title="Guest" icon="👤" hint="Who is staying, and who pays if that is someone else">
            <div style={row3}>
              <Field label="Guest Name" required>
                <input value={form.guestName} onChange={(e) => set({ guestName: e.target.value })} placeholder="Ahmed Khan" style={cell} className="fl-in" />
              </Field>
              <Field label="Bill To" hint="Leave blank if the guest pays">
                <input value={form.customerName} onChange={(e) => set({ customerName: e.target.value })} placeholder={form.guestName || "Customer"} style={cell} className="fl-in" />
              </Field>
              <Field label="Phone">
                <input value={form.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} placeholder="0300 1234567" style={cell} className="fl-in" />
              </Field>
            </div>
          </Card>

          <Card title="Stay" icon="🛏️" hint="Nights are counted from the dates">
            <div style={row2}>
              <Field label="Hotel" required>
                <input value={form.hotelName} onChange={(e) => set({ hotelName: e.target.value })} placeholder="Pearl Continental Lahore" style={cell} className="fl-in" />
              </Field>
              <Field label="Destination">
                <input value={form.destination} onChange={(e) => set({ destination: e.target.value })} placeholder="Lahore / Dubai / Istanbul" style={cell} className="fl-in" />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, minmax(0,1fr)) auto", gap: 12, alignItems: "end" }}>
              <Field label="Check-in" required>
                <input type="date" value={form.checkIn} onChange={(e) => changeCheckIn(e.target.value)} style={cell} className="fl-in" />
              </Field>
              <Field label="Check-out" required>
                <input type="date" value={form.checkOut} min={form.checkIn} onChange={(e) => set({ checkOut: e.target.value })} style={cell} className="fl-in" />
              </Field>
              <div />
              <div style={{ border: `1px solid ${T.border}`, background: T.panel, borderRadius: 10, padding: "8px 14px", textAlign: "center", minWidth: 76 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: nights > 0 ? T.text : "var(--tx-f87171, #f87171)", lineHeight: 1.1 }}>{Math.max(0, nights)}</div>
                <div style={{ fontSize: 10, color: T.muted, letterSpacing: ".06em", textTransform: "uppercase" }}>night{nights === 1 ? "" : "s"}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0,1fr))", gap: 12, alignItems: "start" }}>
              <Field label="Rooms">
                <input type="number" min={1} value={form.rooms} onChange={(e) => set({ rooms: e.target.value })} style={cell} className="fl-in" />
              </Field>
              <Field label="Guests">
                <input type="number" min={1} value={form.guests} onChange={(e) => set({ guests: e.target.value })} style={cell} className="fl-in" />
              </Field>
              <Field label="Room Type">
                <select value={form.roomType} onChange={(e) => set({ roomType: e.target.value })} style={cell}>
                  {ROOM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </Field>
              <Field label="Meal Plan">
                <select value={form.mealPlan} onChange={(e) => set({ mealPlan: e.target.value })} style={cell}>
                  {MEAL_PLANS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
            </div>
          </Card>

          <Card title="Supplier & Payment" icon="🏦" hint="Who the hotel bill is owed to, and when">
            <div style={row2}>
              <Field label="Hotel / Supplier" hint="The account the payable lands in. Blank uses the hotel's name.">
                <PartyInput
                  compact
                  value={form.supplier}
                  options={suppliers}
                  kind={TRAVEL_SUPPLIER_KIND.HOTEL}
                  kindLabel={partyKindHeading(TRAVEL_SUPPLIER_KIND.HOTEL)}
                  placeholder={form.hotelName || "Pick or type"}
                  onChange={(name) => set({ supplier: name })}
                />
              </Field>
              <Field label="Supplier Confirmation No">
                <input value={form.supplierRef} onChange={(e) => set({ supplierRef: e.target.value })} placeholder="From the hotel or portal" style={cell} className="fl-in" />
              </Field>
              <Field label="Payment Due" hint="When the supplier must be paid">
                <input type="date" value={form.paymentDue} onChange={(e) => set({ paymentDue: e.target.value })} style={cell} className="fl-in" />
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(e) => set({ status: e.target.value })} style={cell}>
                  <option value="quoted">Quoted — nothing held yet</option>
                  <option value="confirmed">Confirmed — room held, supplier owed</option>
                </select>
              </Field>
            </div>
            <Field label="Notes">
              <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} placeholder="Late arrival, extra bed, anything the desk should know" style={{ ...cell, resize: "vertical" }} className="fl-in" />
            </Field>
          </Card>
        </div>

        <aside style={{ display: "grid", gap: 14, position: isTablet ? "static" : "sticky", top: 12, minWidth: 0 }}>
          <Card title="Pricing" icon="💰" hint="For the whole stay, all rooms">
            <Field label="Sale Price" required>
              <input type="number" min={0} value={form.sale} onChange={(e) => set({ sale: e.target.value })} placeholder="85000" style={cell} className="fl-in" />
            </Field>
            <Field label="Supplier Cost" required>
              <input type="number" min={0} value={form.cost} onChange={(e) => set({ cost: e.target.value })} placeholder="72000" style={cell} className="fl-in" />
            </Field>
            <div style={{ borderTop: `1px dashed ${T.border}`, paddingTop: 12, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 12.5, color: T.muted }}>Total price</span>
                <Money value={sale} size={18} weight={800} tone={T.accent} />
              </div>
              {nights > 0 && sale > 0 ? (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: T.muted }}>Per night</span>
                  <Money value={Math.round(sale / nights)} size={12.5} weight={700} tone={T.muted} />
                </div>
              ) : null}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: margin >= 0 ? "rgba(52,211,153,.12)" : "rgba(248,113,113,.12)", borderRadius: 10, padding: "9px 12px" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: margin >= 0 ? "#34d399" : "#f87171" }}>Your profit</span>
                <Money value={margin} size={14} weight={800} tone={margin >= 0 ? "#34d399" : "#f87171"} />
              </div>
            </div>
          </Card>

          <Card title="Booking" icon="🧾">
            <Field label="Booking Reference" required>
              <input value={form.bookingRef} onChange={(e) => set({ bookingRef: e.target.value })} style={cell} className="fl-in" />
            </Field>
            {error || problems.length ? (
              <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 4 }}>
                {problems.map((item) => <li key={item} style={{ fontSize: 12, color: "var(--tx-f87171, #f87171)", lineHeight: 1.4 }}>{item}</li>)}
              </ul>
            ) : null}
            <PrimaryButton wide disabled={saving || problems.length > 0 || !form.bookingRef.trim()} onClick={save}>
              {saving ? "Saving…" : form.status === "quoted" ? "Save quote" : "Confirm booking"}
            </PrimaryButton>
          </Card>
        </aside>
      </div>
    </div>
  );
}
