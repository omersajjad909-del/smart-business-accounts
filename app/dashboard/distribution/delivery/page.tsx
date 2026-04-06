import toast from "react-hot-toast";
"use client";

import { useEffect, useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  distributionBg,
  distributionBorder,
  distributionFont,
  findRouteById,
  mapDistributionRoutes,
  todayIso,
  type DeliveryStatus,
} from "../_shared";

type DeliveryForm = {
  sourceType: "manual" | "invoice" | "challan";
  sourceId: string;
  customer: string;
  address: string;
  routeId: string;
  driver: string;
  vehicle: string;
  items: string;
  invoiceRef: string;
  date: string;
};

type InvoiceOption = {
  id: string;
  invoiceNo: string;
  customerName: string;
  driverName?: string;
  vehicleNo?: string;
  items: Array<{ item?: { name?: string }; qty?: number }>;
};

type ChallanOption = {
  id: string;
  challanNo: string;
  customer?: { name?: string };
  driverName?: string;
  vehicleNo?: string;
  items: Array<{ item?: { name?: string }; qty?: number }>;
};

const STATUS_COLOR: Record<DeliveryStatus, string> = {
  pending: "#f59e0b",
  dispatched: "#3b82f6",
  delivered: "#34d399",
  failed: "#ef4444",
};

const emptyForm: DeliveryForm = {
  sourceType: "manual",
  sourceId: "",
  customer: "",
  address: "",
  routeId: "",
  driver: "",
  vehicle: "",
  items: "",
  invoiceRef: "",
  date: todayIso(),
};

export default function DeliveryPage() {
  const deliveryRecords = useBusinessRecords("delivery");
  const routeRecords = useBusinessRecords("distribution_route");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DeliveryForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOption[]>([]);
  const [challanOptions, setChallanOptions] = useState<ChallanOption[]>([]);

  const routes = useMemo(() => mapDistributionRoutes(routeRecords.records).filter((route) => route.status === "active"), [routeRecords.records]);
  const deliveries = useMemo(() => deliveryRecords.records.map((record) => {
    const routeId = String(record.data?.routeId || "");
    const route = findRouteById(routes, routeId);

    return {
      id: record.id,
      customer: record.title,
      address: String(record.data?.address || ""),
      driver: String(record.data?.driver || route?.driver || ""),
      vehicle: String(record.data?.vehicle || route?.vehicle || ""),
      routeId,
      routeName: String(record.data?.routeName || route?.name || ""),
      items: String(record.data?.items || ""),
      invoiceRef: String(record.data?.invoiceRef || ""),
      date: record.date?.split("T")[0] || "",
      status: (record.status as DeliveryStatus) || "pending",
    };
  }), [deliveryRecords.records, routes]);

  useEffect(() => {
    fetch("/api/sales-invoice")
      .then((response) => response.json())
      .then((data) => setInvoiceOptions(Array.isArray(data?.invoices) ? data.invoices : []))
      .catch(() => setInvoiceOptions([]));

    fetch("/api/delivery-challan")
      .then((response) => response.json())
      .then((data) => setChallanOptions(Array.isArray(data) ? data : []))
      .catch(() => setChallanOptions([]));
  }, []);

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  }

  function syncRoute(routeId: string) {
    const route = findRouteById(routes, routeId);
    setForm((prev) => ({
      ...prev,
      routeId,
      driver: route?.driver || prev.driver,
      vehicle: route?.vehicle || prev.vehicle,
    }));
  }

  function editDelivery(delivery: (typeof deliveries)[number]) {
    if (delivery.status === "delivered") {
      toast("Delivered orders are locked. Create a new delivery or mark a separate exception record.");
      return;
    }
    setEditingId(delivery.id);
    setForm({
      sourceType: (delivery.invoiceRef || "").startsWith("DC-") ? "challan" : (delivery.invoiceRef || "").startsWith("SI-") ? "invoice" : "manual",
      sourceId: "",
      customer: delivery.customer,
      address: delivery.address,
      routeId: delivery.routeId,
      driver: delivery.driver,
      vehicle: delivery.vehicle,
      items: delivery.items,
      invoiceRef: delivery.invoiceRef,
      date: delivery.date || todayIso(),
    });
    setShowModal(true);
  }

  function syncSource(sourceType: DeliveryForm["sourceType"], sourceId: string) {
    if (sourceType === "invoice") {
      const invoice = invoiceOptions.find((entry) => entry.id === sourceId);
      const itemSummary = invoice?.items?.map((item) => `${item.item?.name || "Item"} x${item.qty || 0}`).join(", ") || "";
      setForm((prev) => ({
        ...prev,
        sourceType,
        sourceId,
        customer: invoice?.customerName || prev.customer,
        driver: invoice?.driverName || prev.driver,
        vehicle: invoice?.vehicleNo || prev.vehicle,
        invoiceRef: invoice?.invoiceNo || prev.invoiceRef,
        items: itemSummary || prev.items,
      }));
      return;
    }

    if (sourceType === "challan") {
      const challan = challanOptions.find((entry) => entry.id === sourceId);
      const itemSummary = challan?.items?.map((item) => `${item.item?.name || "Item"} x${item.qty || 0}`).join(", ") || "";
      setForm((prev) => ({
        ...prev,
        sourceType,
        sourceId,
        customer: challan?.customer?.name || prev.customer,
        driver: challan?.driverName || prev.driver,
        vehicle: challan?.vehicleNo || prev.vehicle,
        invoiceRef: challan?.challanNo || prev.invoiceRef,
        items: itemSummary || prev.items,
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      sourceType,
      sourceId: "",
    }));
  }

  async function save() {
    const customer = form.customer.trim();
    const route = findRouteById(routes, form.routeId);
    const currentDelivery = editingId ? deliveries.find((entry) => entry.id === editingId) : null;
    if (!customer) {
      setFormError("Customer is required.");
      return;
    }
    if (!form.routeId) {
      setFormError("Route selection is required.");
      return;
    }
    if (!form.date) {
      setFormError("Delivery date is required.");
      return;
    }
    if (!form.driver.trim() || !form.vehicle.trim()) {
      setFormError("Driver and vehicle are required before delivery dispatch.");
      return;
    }
    setFormError("");
    const payload = {
      title: customer,
      status: (currentDelivery?.status || "pending") as DeliveryStatus,
      date: form.date || todayIso(),
      data: {
        address: form.address.trim(),
        routeId: form.routeId,
        routeName: route?.name || "",
        driver: form.driver.trim(),
        vehicle: form.vehicle.trim(),
        items: form.items.trim(),
        invoiceRef: form.invoiceRef.trim(),
        sourceType: form.sourceType,
        sourceId: form.sourceId,
      },
    };

    if (editingId) {
      await deliveryRecords.update(editingId, payload);
    } else {
      await deliveryRecords.create(payload);
    }

    closeModal();
  }

  async function moveDeliveryStatus(delivery: (typeof deliveries)[number], nextStatus: DeliveryStatus) {
    if (nextStatus === "dispatched" && (!delivery.driver.trim() || !delivery.vehicle.trim() || !delivery.routeId)) {
      toast.success("Route, driver, and vehicle must be assigned before dispatch.");
      return;
    }
    if (nextStatus === "delivered" && delivery.status !== "dispatched") {
      toast.success("Only dispatched deliveries can be completed.");
      return;
    }
    if (nextStatus === "failed" && delivery.status === "delivered") {
      toast.error("Delivered orders cannot be marked failed.");
      return;
    }

    const confirmed = window.confirm(
      nextStatus === "delivered"
        ? `Mark ${delivery.customer} as delivered?`
        : nextStatus === "failed"
          ? `Mark ${delivery.customer} as failed delivery?`
          : `Dispatch ${delivery.customer} on route ${delivery.routeName || "selected route"}?`,
    );
    if (!confirmed) return;

    await deliveryRecords.update(delivery.id, { status: nextStatus });
  }

  async function removeDelivery(delivery: (typeof deliveries)[number]) {
    if (delivery.status === "delivered") {
      toast.success("Delivered records are locked and cannot be deleted.");
      return;
    }
    if (delivery.status === "dispatched") {
      toast.error("Mark the delivery failed before deleting a dispatched record.");
      return;
    }
    if (!window.confirm(`Delete delivery for ${delivery.customer}?`)) return;
    await deliveryRecords.remove(delivery.id);
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: distributionFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Delivery Tracking</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>
            Follow dispatches from planned route to delivered confirmation.
          </p>
        </div>
        <button onClick={() => { setShowModal(true); setFormError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + New Delivery
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total Orders", value: deliveries.length, color: "#f97316" },
          { label: "Pending", value: deliveries.filter((delivery) => delivery.status === "pending").length, color: "#f59e0b" },
          { label: "Dispatched", value: deliveries.filter((delivery) => delivery.status === "dispatched").length, color: "#3b82f6" },
          { label: "Delivered", value: deliveries.filter((delivery) => delivery.status === "delivered").length, color: "#34d399" },
        ].map((card) => (
          <div key={card.label} style={{ background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Customer", "Route", "Driver", "Vehicle", "Invoice Ref", "Date", "Status", "Actions"].map((header) => (
                <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${distributionBorder}`, fontWeight: 600 }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => (
              <tr key={delivery.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{delivery.customer}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{delivery.routeName || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{delivery.driver || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{delivery.vehicle || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{delivery.invoiceRef || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{delivery.date || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ display: "inline-block", background: `${STATUS_COLOR[delivery.status]}20`, color: STATUS_COLOR[delivery.status], borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>
                    {delivery.status}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", display: "flex", gap: 8 }}>
                  <button onClick={() => editDelivery(delivery)} style={{ padding: "6px 10px", background: "rgba(99,102,241,.16)", border: "1px solid rgba(99,102,241,.3)", color: "#a5b4fc", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                    Edit
                  </button>
                  {delivery.status === "pending" && (
                    <button onClick={() => void moveDeliveryStatus(delivery, "dispatched")} style={{ padding: "6px 10px", background: "rgba(59,130,246,.15)", border: "1px solid rgba(59,130,246,.3)", color: "#3b82f6", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                      Dispatch
                    </button>
                  )}
                  {delivery.status === "dispatched" && (
                    <button onClick={() => void moveDeliveryStatus(delivery, "delivered")} style={{ padding: "6px 10px", background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                      Deliver
                    </button>
                  )}
                  {(delivery.status === "pending" || delivery.status === "dispatched") && (
                    <button onClick={() => void moveDeliveryStatus(delivery, "failed")} style={{ padding: "6px 10px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                      Fail
                    </button>
                  )}
                  <button onClick={() => void removeDelivery(delivery)} style={{ padding: "6px 10px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!deliveryRecords.loading && deliveries.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>
                  No delivery orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${distributionBorder}`, borderRadius: 16, padding: 32, width: 560, fontFamily: distributionFont }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>{editingId ? "Edit Delivery" : "New Delivery"}</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                ["Customer", "customer", "text", "span 2"],
                ["Address", "address", "text", "span 2"],
                ["Invoice Ref", "invoiceRef", "text", ""],
                ["Items / Qty Summary", "items", "text", ""],
              ].map(([label, key, type, span]) => (
                <div key={key} style={{ gridColumn: span || undefined }}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{label}</label>
                  <input
                    type={type}
                    value={String((form as Record<string, unknown>)[key] ?? "")}
                    onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                    style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Source</label>
                <select value={form.sourceType} onChange={(event) => syncSource(event.target.value as DeliveryForm["sourceType"], "")} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }}>
                  <option value="manual">Manual Delivery</option>
                  <option value="invoice">From Sales Invoice</option>
                  <option value="challan">From Delivery Challan</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>
                  {form.sourceType === "invoice" ? "Sales Invoice" : form.sourceType === "challan" ? "Delivery Challan" : "Source Reference"}
                </label>
                {form.sourceType === "invoice" ? (
                  <select value={form.sourceId} onChange={(event) => syncSource("invoice", event.target.value)} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }}>
                    <option value="">Select invoice</option>
                    {invoiceOptions.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNo} - {invoice.customerName}
                      </option>
                    ))}
                  </select>
                ) : form.sourceType === "challan" ? (
                  <select value={form.sourceId} onChange={(event) => syncSource("challan", event.target.value)} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }}>
                    <option value="">Select challan</option>
                    {challanOptions.map((challan) => (
                      <option key={challan.id} value={challan.id}>
                        {challan.challanNo} - {challan.customer?.name || "Customer"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={form.sourceId} onChange={(event) => setForm((prev) => ({ ...prev, sourceId: event.target.value }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
                )}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Route</label>
                <select value={form.routeId} onChange={(event) => syncRoute(event.target.value)} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }}>
                  <option value="">Select route</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.name} - {route.area}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Delivery Date</label>
                <input type="date" value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Driver</label>
                <input type="text" value={form.driver} onChange={(event) => setForm((prev) => ({ ...prev, driver: event.target.value }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Vehicle</label>
                <input type="text" value={form.vehicle} onChange={(event) => setForm((prev) => ({ ...prev, vehicle: event.target.value }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {editingId ? "Update Delivery" : "Create Delivery"}
              </button>
              <button onClick={closeModal} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${distributionBorder}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
