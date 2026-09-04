"use client";

import toast from "react-hot-toast";

import { useEffect, useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapBomRecord, mapFinishedGoodsRecord, mapProductionOrderRecord, mapWorkOrderRecord,
  quoteProductionRun, type ProductionRunQuote,
} from "../_shared";
import { useResponsive } from "@/hooks/useResponsive";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";
const statusColor: Record<string, string> = { planned: "#818cf8", in_progress: "#f59e0b", running: "#f59e0b", completed: "#22c55e", cancelled: "#6b7280" };

type ProductionOrder = ReturnType<typeof mapProductionOrderRecord>;

type Labour = { id: string; name: string; code: string; ratePerUnit: number };
type LabourRow = { labourId: string; qty: string; rate: string };

export default function ProductionOrdersPage() {
  const { isMobile } = useResponsive();
  const orderStore = useBusinessRecords("production_order");
  const bomStore = useBusinessRecords("bom");
  const goodsStore = useBusinessRecords("finished_good_batch");
  const workStore = useBusinessRecords("work_order");
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  // Completion dialog — priced before anything is written.
  const [runOrder, setRunOrder] = useState<ProductionOrder | null>(null);
  const [runQty, setRunQty] = useState(1);
  const [runQuote, setRunQuote] = useState<ProductionRunQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [allowShort, setAllowShort] = useState(false);
  // Who actually made this run's pieces — posts to their own payable instead
  // of the flat "Factory Labour" line the BOM estimates with.
  const [labourList, setLabourList] = useState<Labour[]>([]);
  const [labourRows, setLabourRows] = useState<LabourRow[]>([]);
  // Which warehouse the run consumes from. A run pinned to MAIN while the
  // rolls were received into SHOP reported a shortage with the material in
  // the building, so it is now picked here and priced against that store.
  const [runLocation, setRunLocation] = useState("MAIN");
  const [form, setForm] = useState({
    product: "",
    bomId: "",
    quantity: 1,
    plannedDate: new Date().toISOString().slice(0, 10),
    assignedTo: "",
    notes: "",
    location: "MAIN",
  });

  const orders = useMemo(() => orderStore.records.map(mapProductionOrderRecord), [orderStore.records]);
  const boms = useMemo(() => bomStore.records.map(mapBomRecord), [bomStore.records]);
  const finishedGoods = useMemo(() => goodsStore.records.map(mapFinishedGoodsRecord), [goodsStore.records]);
  const workOrders = useMemo(() => workStore.records.map(mapWorkOrderRecord), [workStore.records]);

  useEffect(() => {
    fetch("/api/manufacturing/labour", { cache: "no-store" })
      .then((r) => r.json())
      .then((list) => setLabourList(Array.isArray(list) ? list : []))
      .catch(() => setLabourList([]));
  }, []);

  const labourTotal = useMemo(
    () => labourRows.reduce((sum, r) => sum + (Number(r.qty) || 0) * (Number(r.rate) || 0), 0),
    [labourRows],
  );

  /**
   * The dialog asks for two different quantities and they are easy to confuse:
   * "Units finished in this run" is what the order gets credited with, while a
   * worker row is only what that worker is paid for. Entering the day's output
   * against the worker and leaving the run at the order's full remainder books
   * the whole order as made while paying for part of it — the order closes and
   * the unmade pieces are never produced again.
   *
   * The busiest row is the one worth comparing: with several workers on one run
   * they are usually stages (cut, print, stitch) and each does all the pieces,
   * so the largest row is what the run actually made.
   */
  const labourPieces = useMemo(() => {
    const rows = labourRows.filter((r) => r.labourId && Number(r.qty) > 0);
    if (!rows.length) return null;
    const most = Math.max(...rows.map((r) => Number(r.qty)));
    const busiest = rows.find((r) => Number(r.qty) === most);
    return {
      most,
      name: labourList.find((l) => l.id === busiest?.labourId)?.name ?? "This worker",
      over: most > runQty,
      under: most < runQty,
    };
  }, [labourRows, labourList, runQty]);

  function addLabourRow() {
    setLabourRows((rows) => [...rows, { labourId: "", qty: "", rate: "" }]);
  }

  function setLabourRow(index: number, patch: Partial<LabourRow>) {
    setLabourRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeLabourRow(index: number) {
    setLabourRows((rows) => rows.filter((_, i) => i !== index));
  }

  async function save() {
    if (!form.product.trim()) {
      setFormError("Product name is required.");
      return;
    }
    if (!form.bomId) {
      setFormError("Linked BOM is required.");
      return;
    }
    if (form.quantity <= 0) {
      setFormError("Quantity must be greater than zero.");
      return;
    }
    if (!form.plannedDate) {
      setFormError("Planned date is required.");
      return;
    }
    setFormError("");
    const selectedBom = boms.find((item) => item.id === form.bomId) || boms.find((item) => item.product === form.product);
    await orderStore.create({
      title: form.product,
      status: "planned",
      date: form.plannedDate,
      data: {
        orderId: `PO-${String(orders.length + 1).padStart(4, "0")}`,
        quantity: form.quantity,
        completed: 0,
        assignedTo: form.assignedTo,
        notes: form.notes,
        bomId: selectedBom?.id || "",
        bomVersion: selectedBom?.version || "",
        location: form.location,
      },
    });
    setShowModal(false);
    setForm({
      product: "",
      bomId: "",
      quantity: 1,
      plannedDate: new Date().toISOString().slice(0, 10),
      assignedTo: "",
      notes: "",
      location: "MAIN",
    });
    setFormError("");
  }

  async function startOrder(orderId: string) {
    await orderStore.update(orderId, { status: "in_progress" });
  }

  /**
   * Completing an order used to just flip a status and write a finished-goods
   * row — no material left stock and nothing reached the ledger. Now it opens a
   * costed preview first; the server does the consuming and posting.
   */
  async function openCompleteDialog(order: ProductionOrder) {
    const linkedWorkOrders = workOrders.filter((item) => item.linkedProductionOrderId === order.orderId);
    if (linkedWorkOrders.some((item) => item.status !== "completed")) {
      toast("Complete linked work orders before finishing this production order.");
      return;
    }
    const remaining = Math.max(order.quantity - order.completed, 1);
    setRunOrder(order);
    setRunQty(remaining);
    setRunError("");
    setRunQuote(null);
    setLabourRows([]);
    setQuoting(true);
    // Let the server pick the warehouse first — it knows the one the order
    // was raised against, which is the one the operator meant.
    const quote = await quoteProductionRun(order.id, remaining);
    setQuoting(false);
    if (!quote) { setRunError("Could not reach the server."); return; }
    if (quote.error) { setRunError(quote.error); return; }
    setRunLocation(quote.location || "MAIN");
    setRunQuote(quote);
  }

  async function requote(qty: number, location = runLocation) {
    if (!runOrder || qty <= 0) return;
    setQuoting(true);
    const quote = await quoteProductionRun(runOrder.id, qty, location);
    setQuoting(false);
    if (quote && !quote.error) setRunQuote(quote);
  }

  async function confirmRun() {
    if (!runOrder) return;
    setRunning(true);
    setRunError("");
    try {
      const labourAssignments = labourRows
        .filter((r) => r.labourId && Number(r.qty) > 0 && Number(r.rate) >= 0)
        .map((r) => ({ labourId: r.labourId, qty: Number(r.qty), rate: Number(r.rate) }));
      const res = await fetch("/api/manufacturing/production-orders/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productionOrderId: runOrder.id,
          producedQty: runQty,
          allowNegativeStock: allowShort,
          location: runLocation,
          ...(labourAssignments.length ? { labourAssignments } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Could not complete the run.");
      toast.success(
        `${body.producedQty} units received · batch ${body.batchNo} · Rs. ${Math.round(body.totalCost).toLocaleString()} to Finished Goods`,
      );
      // The part-roll that survived is the whole point of the change — say so,
      // or the operator will still think it was thrown away.
      const kept = (body.remnantsCreated ?? []) as { itemName: string; qty: number; unit: string }[];
      if (kept.length) {
        toast(
          `Kept as open stock: ${kept.map((r) => `${Number(r.qty).toFixed(2)}${r.unit} ${r.itemName}`).join(", ")}`,
          { icon: "♻️" },
        );
      }
      setRunOrder(null);
      setRunQuote(null);
      await Promise.all([orderStore.refetch?.(), goodsStore.refetch?.()]);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Could not complete the run.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ padding: isMobile ? "15px 14px" : "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Production Orders</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", margin: 0 }}>Issue shop-floor production based on BOMs and push completed orders into finished goods.</p>
        </div>
        <button onClick={() => { setShowModal(true); setFormError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + New Order
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Orders", value: orders.length, color: "#f97316" },
          { label: "Planned", value: orders.filter((item) => item.status === "planned").length, color: "#818cf8" },
          { label: "In Progress", value: orders.filter((item) => item.status === "in_progress" || item.status === "running").length, color: "#f59e0b" },
          { label: "Completed To FG", value: orders.filter((item) => item.status === "completed").length, color: "#22c55e" },
        ].map((card) => (
          <div key={card.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "12px 10px" : "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.48)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {orders.map((order) => {
          const linkedBom = boms.find((item) => item.id === order.bomId) || boms.find((item) => item.product === order.product);
          const progress = order.quantity > 0 ? Math.round((order.completed / order.quantity) * 100) : 0;
          // What is still owed on the order. The bar alone is easy to misread at
          // a glance; the count says plainly that the order is not finished.
          const remaining = Math.max(order.quantity - order.completed, 0);
          const fgCreated = finishedGoods.some((item) => item.productionOrderId === order.orderId);
          const linkedWorkOrders = workOrders.filter((item) => item.linkedProductionOrderId === order.orderId);
          const incompleteWorkOrders = linkedWorkOrders.filter((item) => item.status !== "completed").length;
          return (
            <div key={order.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "12px 10px" : "18px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{order.product}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", marginTop: 4 }}>
                    {order.orderId} • BOM {linkedBom?.version || order.bomVersion || "Not linked"} • Qty {order.completed.toLocaleString()}/{order.quantity.toLocaleString()}
                    {remaining > 0 && order.status !== "cancelled" && (
                      <span style={{ color: "#fbbf24", fontWeight: 700 }}> • {remaining.toLocaleString()} left to make</span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: statusColor[order.status] || "#94a3b8" }}>{order.status.replace("_", " ").toUpperCase()}</div>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 10 }}>
                Due {order.plannedDate || "Not set"} • Assigned {order.assignedTo || "Unassigned"} • {fgCreated ? "Finished goods batch created" : "FG pending"} • Work orders open {incompleteWorkOrders}
              </div>
              <div style={{ background: "rgba(255,255,255,.08)", height: 6, borderRadius: 999, overflow: "hidden", marginBottom: 14 }}>
                <div style={{ width: `${progress}%`, height: "100%", background: statusColor[order.status] || "#94a3b8" }} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {order.status === "planned" && (
                  <button onClick={() => startOrder(order.id)} style={{ padding: "7px 14px", background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.3)", color: "#f59e0b", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Start
                  </button>
                )}
                {(order.status === "in_progress" || order.status === "running") && (
                  <button onClick={() => openCompleteDialog(order)} style={{ padding: "7px 14px", background: "rgba(34,197,94,.15)", border: "1px solid rgba(34,197,94,.3)", color: "#22c55e", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {order.completed > 0 && remaining > 0
                      ? `Run remaining ${remaining.toLocaleString()} →`
                      : "Record production →"}
                  </button>
                )}
                {order.status !== "completed" && order.status !== "cancelled" && (
                  <button onClick={() => orderStore.update(order.id, { status: "cancelled" })} style={{ padding: "7px 14px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#ef4444", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!orderStore.loading && orders.length === 0 && (
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 36, textAlign: "center", color: "rgba(255,255,255,.28)" }}>
            No production orders yet.
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 30, width: 540, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>New Production Order</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Product</label>
                <input list="manufacturing-boms" value={form.product} onChange={(e) => setForm((current) => ({ ...current, product: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
                <datalist id="manufacturing-boms">
                  {boms.map((item) => <option key={item.id} value={item.product} />)}
                </datalist>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Linked BOM</label>
                <select value={form.bomId} onChange={(e) => {
                  const selectedBom = boms.find((item) => item.id === e.target.value);
                  setForm((current) => ({ ...current, bomId: e.target.value, product: selectedBom?.product || current.product }));
                }} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff" }}>
                  <option value="">Select BOM</option>
                  {boms.map((item) => <option key={item.id} value={item.id}>{item.product} • {item.version}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Quantity</label>
                <input type="number" value={form.quantity} onChange={(e) => setForm((current) => ({ ...current, quantity: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Planned Date</label>
                <input type="date" value={form.plannedDate} onChange={(e) => setForm((current) => ({ ...current, plannedDate: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Consume from</label>
                <select value={form.location} onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff" }}>
                  <option value="MAIN">Main</option>
                  <option value="SHOP">Shop</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Assigned To</label>
                <input value={form.assignedTo} onChange={(e) => setForm((current) => ({ ...current, assignedTo: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} rows={4} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box", resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Create Order</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Record production ──
          Shows exactly what will leave stock, what it costs and where the money
          lands, before anything is written. */}
      {runOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 28, width: 620, maxHeight: "90vh", overflowY: "auto", fontFamily: ff }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Record production</h2>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.42)", marginBottom: 18 }}>
              {runOrder.orderId} · {runOrder.product} · {runOrder.completed}/{runOrder.quantity} done
            </div>

            {runError && (
              <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12, lineHeight: 1.6 }}>{runError}</div>
            )}

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Units finished in this run</label>
                <input
                  type="number" min={1} value={runQty}
                  onChange={(e) => setRunQty(Math.max(1, Number(e.target.value) || 1))}
                  onBlur={(e) => requote(Math.max(1, Number(e.target.value) || 1))}
                  style={{ width: 180, background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }}
                />
                {/* The box opens on the whole balance, which is right for a run
                    that finishes the order and wrong for a day that finishes
                    part of it. Say what happens to the rest so a short day is
                    not typed in as a full one. */}
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 6, width: 180, lineHeight: 1.6 }}>
                  {runOrder.completed > 0
                    ? `${runOrder.completed.toLocaleString()} done, ${Math.max(runOrder.quantity - runOrder.completed, 0).toLocaleString()} left of ${runOrder.quantity.toLocaleString()}.`
                    : `Order is for ${runOrder.quantity.toLocaleString()}.`}{" "}
                  Enter only what was finished — the rest stays open for the next run.
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Consume from</label>
                <select
                  value={runLocation}
                  onChange={(e) => { setRunLocation(e.target.value); requote(runQty, e.target.value); }}
                  style={{ width: 180, background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }}
                >
                  {[...new Set([runLocation, ...(runQuote?.availableLocations ?? [])])].map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            {quoting && <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", padding: "12px 0" }}>Costing this run…</div>}

            {runQuote && !quoting && (
              <>
                <div style={{ border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,.03)" }}>
                        {["Material", "Needs", "Open stock", "Off the rack", "Cost"].map((h, i) => (
                          <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".05em", textAlign: i === 0 ? "left" : "right" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {runQuote.lines.map((line) => {
                        const short = line.availableQty < line.requiredQty;
                        return (
                          <tr key={line.itemId} style={{ borderTop: `1px solid ${border}` }}>
                            <td style={{ padding: "10px 14px", fontSize: 12.5 }}>
                              {line.itemName}
                              {line.leftoverQty > 0 && (
                                <div style={{ fontSize: 11, color: "#34d399", marginTop: 3 }}>
                                  {line.leftoverQty.toFixed(2)}{line.unit} stays as open stock
                                </div>
                              )}
                            </td>
                            <td style={{ padding: "10px 14px", fontSize: 12.5, textAlign: "right", color: "rgba(255,255,255,.62)" }}>{line.exactQty.toFixed(2)}{line.unit}</td>
                            <td style={{ padding: "10px 14px", fontSize: 12.5, textAlign: "right", color: line.fromRemnantQty > 0 ? "#34d399" : "rgba(255,255,255,.25)" }}>
                              {line.fromRemnantQty > 0 ? `${line.fromRemnantQty.toFixed(2)}${line.unit}` : "—"}
                            </td>
                            <td style={{ padding: "10px 14px", fontSize: 12.5, textAlign: "right", fontWeight: 700 }}>
                              {line.requiredQty}{line.unit}
                              <div style={{ fontSize: 11, fontWeight: 400, color: short ? "#fca5a5" : "rgba(255,255,255,.35)", marginTop: 3 }}>
                                have {line.availableQty}{line.unit}
                              </div>
                            </td>
                            <td style={{ padding: "10px 14px", fontSize: 12.5, textAlign: "right", color: "rgba(255,255,255,.62)" }}>Rs. {Math.round(line.lineCost).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {runQuote.shortages.length > 0 && (
                  <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.26)" }}>
                    <div style={{ fontSize: 12.5, color: "#fca5a5", fontWeight: 700, marginBottom: 6 }}>Not enough material in {runLocation} for {runQuote.shortages.length} item(s)</div>
                    {runQuote.shortages.some((l) => (l.elsewhere?.length ?? 0) > 0) && (
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginBottom: 8, lineHeight: 1.7 }}>
                        {runQuote.shortages.filter((l) => (l.elsewhere?.length ?? 0) > 0).map((l) => (
                          <div key={l.itemId}>
                            {l.itemName} is in{" "}
                            {l.elsewhere!.map((e) => `${e.location} (${e.qty}${l.unit})`).join(", ")}
                            {" "}— switch “Consume from” instead of producing short.
                          </div>
                        ))}
                      </div>
                    )}
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,.55)", cursor: "pointer" }}>
                      <input type="checkbox" checked={allowShort} onChange={(e) => setAllowShort(e.target.checked)} />
                      Produce anyway — stock will go negative until the purchase is entered
                    </label>
                  </div>
                )}

                <div style={{ border: `1px solid ${border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Labour for this run</span>
                    {labourTotal > 0 && (
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "#22c55e" }}>Rs. {Math.round(labourTotal).toLocaleString()}</span>
                    )}
                  </div>
                  {!labourList.length && (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 8 }}>
                      No labour added yet — add one on the <a href="/dashboard/manufacturing/labour" style={{ color: "#fb923c", fontWeight: 700 }}>Labour</a> page.
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {labourRows.map((row, index) => (
                      <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 90px 100px 28px", gap: 8, alignItems: "center" }}>
                        <select
                          value={row.labourId}
                          onChange={(e) => {
                            const picked = labourList.find((l) => l.id === e.target.value);
                            setLabourRow(index, { labourId: e.target.value, rate: picked ? String(picked.ratePerUnit) : row.rate });
                          }}
                          style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 12.5 }}
                        >
                          <option value="">— Worker —</option>
                          {labourList.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <input type="number" min={0} step="any" placeholder="Pcs" value={row.qty} onChange={(e) => setLabourRow(index, { qty: e.target.value })} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 12.5 }} />
                        <input type="number" min={0} step="any" placeholder="Rate/pc" value={row.rate} onChange={(e) => setLabourRow(index, { rate: e.target.value })} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 12.5 }} />
                        <button onClick={() => removeLabourRow(index)} title="Remove" style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.45)", cursor: "pointer", padding: "7px 0" }}>×</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={addLabourRow} style={{ marginTop: 8, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,.05)", border: `1px solid ${border}`, color: "rgba(255,255,255,.65)", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
                    + Add worker
                  </button>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.32)", marginTop: 8 }}>
                    Assigning workers here charges what's actually owed to each of them instead of the BOM's flat labour estimate below.
                  </div>
                </div>

                {/* The two quantities disagree — say so before the order closes. */}
                {labourPieces?.under && (
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.3)", marginBottom: 14 }}>
                    <div style={{ fontSize: 12.5, color: "#fbbf24", fontWeight: 700, marginBottom: 5 }}>
                      This run finishes {runQty.toLocaleString()} pieces, but {labourPieces.name} is paid for {labourPieces.most.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.5)", lineHeight: 1.7 }}>
                      All {runQty.toLocaleString()} will be received into finished goods and charged to this order
                      {runOrder.quantity > 0 && runQty >= runOrder.quantity - runOrder.completed
                        ? ", which closes it — the balance can never be produced against it again."
                        : "."}
                      {" "}If only {labourPieces.most.toLocaleString()} were actually made, set the run to that.
                    </div>
                    <button
                      onClick={() => { setRunQty(labourPieces.most); requote(labourPieces.most); }}
                      style={{ marginTop: 9, padding: "6px 12px", borderRadius: 8, background: "rgba(251,191,36,.16)", border: "1px solid rgba(251,191,36,.4)", color: "#fcd34d", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
                    >
                      Set run to {labourPieces.most.toLocaleString()}
                    </button>
                  </div>
                )}
                {labourPieces?.over && (
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)", marginBottom: 14, fontSize: 12.5, color: "#fca5a5", lineHeight: 1.7 }}>
                    {labourPieces.name} is paid for {labourPieces.most.toLocaleString()} pieces but this run only
                    finishes {runQty.toLocaleString()}. Raise the run, or lower the worker&apos;s pieces.
                  </div>
                )}

                <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.22)", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)" }}>Total cost of this run</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#22c55e" }}>Rs. {Math.round(labourRows.length ? runQuote.totalCost - runQuote.labourCost + labourTotal : runQuote.totalCost).toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,.42)" }}>
                    <span>Material</span><span>Rs. {Math.round(runQuote.materialCost).toLocaleString()}</span>
                  </div>
                  {runQuote.labourCost > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,.42)" }}>
                      <span>Labour {labourRows.length ? "(assigned above)" : "(BOM estimate)"}</span>
                      <span>Rs. {Math.round(labourRows.length ? labourTotal : runQuote.labourCost).toLocaleString()}</span>
                    </div>
                  )}
                  {runQuote.overheadCost > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,.42)" }}>
                      <span>Overhead</span><span>Rs. {Math.round(runQuote.overheadCost).toLocaleString()}</span>
                    </div>
                  )}
                  {runQuote.remnantUsedCost > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#34d399" }}>
                      <span>…of which from open stock</span><span>Rs. {Math.round(runQuote.remnantUsedCost).toLocaleString()}</span>
                    </div>
                  )}
                  {runQuote.remnantCreatedCost > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#34d399" }}>
                      <span>Kept back as open stock</span><span>Rs. {Math.round(runQuote.remnantCreatedCost).toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,.55)", fontWeight: 700, marginTop: 6 }}>
                    <span>Per unit</span><span>Rs. {runQuote.unitCost.toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", lineHeight: 1.7, marginBottom: 16 }}>
                  Dr Work In Progress → Cr Stock/Inventory, then Dr Finished Goods → Cr Work In Progress.
                  Whole units leave {runLocation}; anything left of the last one moves to Material Remnants
                  instead of being charged to this batch. {runQty} × {runOrder.product} arrives at cost.
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={confirmRun}
                disabled={running || quoting || !runQuote || labourPieces?.over === true || (runQuote.shortages.length > 0 && !allowShort)}
                style={{
                  flex: 1, padding: "11px 0", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700,
                  background: running || !runQuote || labourPieces?.over === true || (runQuote.shortages.length > 0 && !allowShort) ? "rgba(34,197,94,.35)" : "#22c55e",
                  cursor: running || !runQuote ? "not-allowed" : "pointer",
                }}
              >
                {running ? "Recording…" : "Confirm production"}
              </button>
              <button onClick={() => { setRunOrder(null); setRunQuote(null); setAllowShort(false); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

