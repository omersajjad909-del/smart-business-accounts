"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  courierOptions,
  ecommerceBg,
  ecommerceBorder,
  ecommerceFont,
  ecommerceMuted,
  ecommerceStatusColor,
  mapEcommerceOrders,
  mapEcommerceShipments,
  todayIso,
  toPkDate,
} from "../_shared";

type ShipmentForm = {
  orderId: string;
  customer: string;
  city: string;
  courier: string;
  weight: string;
  charges: string;
  expected: string;
};

const emptyForm: ShipmentForm = {
  orderId: "",
  customer: "",
  city: "",
  courier: "TCS",
  weight: "",
  charges: "",
  expected: todayIso(),
};

const nextShipmentStatus: Record<string, string> = {
  processing: "dispatched",
  dispatched: "in_transit",
  in_transit: "delivered",
};

export default function ShippingPage() {
  const { records, loading, create, update } = useBusinessRecords("ecommerce_shipment");
  const ordersHook = useBusinessRecords("ecommerce_order");
  const shipments = useMemo(() => mapEcommerceShipments(records), [records]);
  const orders = useMemo(() => mapEcommerceOrders(ordersHook.records), [ordersHook.records]);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ShipmentForm>(emptyForm);

  const filtered = filter === "all" ? shipments : shipments.filter((shipment) => shipment.status === filter);
  const processingCount = shipments.filter((shipment) => shipment.status === "processing" || shipment.status === "dispatched").length;
  const inTransitCount = shipments.filter((shipment) => shipment.status === "in_transit").length;
  const deliveredCount = shipments.filter((shipment) => shipment.status === "delivered").length;
  const deliveryRate = shipments.length ? Math.round((deliveredCount / shipments.length) * 100) : 0;

  const selectedOrder = orders.find((order) => order.orderId === form.orderId) || null;

  async function addShipment() {
    const orderId = form.orderId.trim();
    const customer = form.customer.trim();
    const city = form.city.trim();
    const expected = form.expected.trim();
    const weight = Number(form.weight);
    const charges = Number(form.charges);

    if (!orderId) return setError("Order select karein.");
    if (!selectedOrder) return setError("Valid order select karein.");
    if (!customer) return setError("Customer name zaroori hai.");
    if (!city) return setError("City zaroori hai.");
    if (!expected) return setError("Expected delivery date zaroori hai.");
    if (!Number.isFinite(weight) || weight <= 0) return setError("Weight zero se bari honi chahiye.");
    if (!Number.isFinite(charges) || charges < 0) return setError("Charges negative nahi ho sakte.");
    if (shipments.some((shipment) => shipment.orderId === orderId && shipment.status !== "failed")) {
      return setError("Is order ke liye active shipment already maujood hai.");
    }

    setSaving(true);
    setError("");
    try {
      const trackingNo = `${form.courier.replace(/\s+/g, "").slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}`;
      await create({
        title: customer,
        status: "processing",
        amount: charges,
        date: todayIso(),
        data: {
          trackingNo,
          orderId,
          city,
          courier: form.courier,
          weight,
          expected,
        },
      });
      const orderRecord = ordersHook.records.find((record) => String(record.data?.orderId || `ORD-${record.id.slice(-6).toUpperCase()}`) === orderId);
      if (orderRecord && !["shipped", "delivered"].includes(orderRecord.status || "")) {
        await ordersHook.update(orderRecord.id, { status: "shipped" });
      }
      setShowAdd(false);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Shipment create nahi ho saka.");
    } finally {
      setSaving(false);
    }
  }

  async function moveShipment(id: string, status: string) {
    try {
      setError("");
      const currentShipment = shipments.find((shipment) => shipment.id === id) || null;
      await update(id, { status });
      if (currentShipment) {
        const orderRecord = ordersHook.records.find((record) => String(record.data?.orderId || `ORD-${record.id.slice(-6).toUpperCase()}`) === currentShipment.orderId);
        if (orderRecord) {
          if (status === "in_transit" && !["delivered"].includes(orderRecord.status || "")) {
            await ordersHook.update(orderRecord.id, { status: "shipped" });
          }
          if (status === "delivered") {
            await ordersHook.update(orderRecord.id, { status: "delivered" });
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Shipment update nahi ho saka.");
    }
  }

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: ecommerceFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 6px" }}>Shipping Desk</h1>
          <p style={{ fontSize: 13, color: ecommerceMuted, margin: 0 }}>Courier dispatch, transit tracking, aur delivery closure ko yahan se monitor karein.</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={primaryButton}>+ Create Shipment</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Open Dispatch", value: processingCount, color: "#60a5fa" },
          { label: "In Transit", value: inTransitCount, color: "#f59e0b" },
          { label: "Delivered", value: deliveredCount, color: "#34d399" },
          { label: "Success Rate", value: `${deliveryRate}%`, color: "#a78bfa" },
        ].map((card) => (
          <div key={card.label} style={{ background: ecommerceBg, border: `1px solid ${ecommerceBorder}`, borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: ecommerceMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {["all", "processing", "dispatched", "in_transit", "delivered", "failed"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: filter === status ? "1px solid rgba(99,102,241,.4)" : "1px solid rgba(255,255,255,.08)",
              background: filter === status ? "rgba(99,102,241,.16)" : "rgba(255,255,255,.03)",
              color: filter === status ? "#c7d2fe" : "rgba(255,255,255,.65)",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "capitalize",
              cursor: "pointer",
            }}
          >
            {status.replace("_", " ")}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ marginBottom: 16, background: "rgba(248,113,113,.12)", border: "1px solid rgba(248,113,113,.28)", color: "#fca5a5", borderRadius: 12, padding: "12px 14px", fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 44, color: ecommerceMuted }}>Loading shipments...</div>
      ) : (
        <div style={{ background: ecommerceBg, border: `1px solid ${ecommerceBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Tracking", "Order", "Customer", "Courier", "City", "Charges", "Expected", "Status", "Action"].map((heading) => (
                  <th key={heading} style={thStyle}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((shipment) => (
                <tr key={shipment.id}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700 }}>{shipment.trackingNo}</div>
                    <div style={{ fontSize: 11, color: ecommerceMuted }}>{toPkDate(shipment.createdAt)}</div>
                  </td>
                  <td style={tdStyle}>{shipment.orderId}</td>
                  <td style={tdStyle}>{shipment.customer}</td>
                  <td style={tdStyle}>
                    <div>{shipment.courier}</div>
                    <div style={{ fontSize: 11, color: ecommerceMuted }}>{shipment.weight} kg</div>
                  </td>
                  <td style={tdStyle}>{shipment.city}</td>
                  <td style={{ ...tdStyle, color: "#34d399", fontWeight: 800 }}>Rs. {shipment.charges.toLocaleString()}</td>
                  <td style={tdStyle}>{shipment.expected}</td>
                  <td style={tdStyle}>
                    <span style={{ display: "inline-block", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: ecommerceStatusColor(shipment.status), background: `${ecommerceStatusColor(shipment.status)}20` }}>
                      {shipment.status.replace("_", " ")}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {nextShipmentStatus[shipment.status] && (
                        <button onClick={() => moveShipment(shipment.id, nextShipmentStatus[shipment.status])} style={{ ...actionButton, color: ecommerceStatusColor(nextShipmentStatus[shipment.status]), borderColor: `${ecommerceStatusColor(nextShipmentStatus[shipment.status])}55` }}>
                          {nextShipmentStatus[shipment.status].replace("_", " ")}
                        </button>
                      )}
                      {!["delivered", "failed"].includes(shipment.status) && (
                        <button onClick={() => moveShipment(shipment.id, "failed")} style={{ ...actionButton, color: "#f87171", borderColor: "rgba(248,113,113,.35)" }}>
                          failed
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={9} style={{ padding: 42, textAlign: "center", color: "rgba(255,255,255,.28)" }}>
                    Is filter me koi shipment nahi mila.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 800 }}>Create Shipment</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Order</label>
                <select
                  value={form.orderId}
                  onChange={(event) => {
                    const order = orders.find((item) => item.orderId === event.target.value) || null;
                    setForm((current) => ({
                      ...current,
                      orderId: event.target.value,
                      customer: order?.customer || current.customer,
                    }));
                  }}
                  style={inputStyle}
                >
                  <option value="">Select order</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.orderId}>
                      {order.orderId} - {order.customer} - {order.product}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Customer</label>
                <input value={form.customer} onChange={(event) => setForm((current) => ({ ...current, customer: event.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Courier</label>
                <select value={form.courier} onChange={(event) => setForm((current) => ({ ...current, courier: event.target.value }))} style={inputStyle}>
                  {courierOptions.map((courier) => <option key={courier}>{courier}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>City</label>
                <input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Expected Delivery</label>
                <input type="date" value={form.expected} onChange={(event) => setForm((current) => ({ ...current, expected: event.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Weight (kg)</label>
                <input type="number" value={form.weight} onChange={(event) => setForm((current) => ({ ...current, weight: event.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Charges (Rs.)</label>
                <input type="number" value={form.charges} onChange={(event) => setForm((current) => ({ ...current, charges: event.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={addShipment} disabled={saving} style={{ ...primaryButton, flex: 1, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : "Create Shipment"}
              </button>
              <button onClick={() => { setShowAdd(false); setError(""); }} style={secondaryButton}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const primaryButton: CSSProperties = {
  padding: "10px 20px",
  borderRadius: 12,
  border: "none",
  background: "#f59e0b",
  color: "#fff",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  fontSize: 12,
  color: ecommerceMuted,
  borderBottom: `1px solid ${ecommerceBorder}`,
  fontWeight: 700,
};

const tdStyle: CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid rgba(255,255,255,.04)",
  fontSize: 13,
  verticalAlign: "top",
};

const actionButton: CSSProperties = {
  padding: "5px 9px",
  background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  textTransform: "capitalize",
};

const secondaryButton: CSSProperties = {
  padding: "11px 24px",
  background: "transparent",
  border: `1px solid ${ecommerceBorder}`,
  borderRadius: 10,
  color: "rgba(255,255,255,.65)",
  fontSize: 14,
  cursor: "pointer",
};

const inputStyle: CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,.04)",
  border: `1px solid ${ecommerceBorder}`,
  borderRadius: 10,
  padding: "10px 12px",
  color: "#fff",
  fontSize: 14,
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  color: ecommerceMuted,
  marginBottom: 6,
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.72)",
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalStyle: CSSProperties = {
  background: "#161b27",
  border: `1px solid ${ecommerceBorder}`,
  borderRadius: 18,
  padding: 32,
  width: 540,
  fontFamily: ecommerceFont,
};
